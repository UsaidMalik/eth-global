import { 
  PaymentRequest, 
  Transaction, 
  TransactionStatus, 
  StoredTransaction,
  FeeEstimate 
} from '../types';
import { FeeCalculator } from './FeeCalculator';
import { MockFernService, FernAPIClient, OnRampResponse, OffRampResponse } from './mock/MockFernService';
import { MockBlockchainService, BlockchainClient, TransactionResponse } from './mock/MockBlockchainService';

export interface PaymentServiceConfig {
  useMockServices: boolean;
  fernApiClient?: FernAPIClient;
  blockchainClient?: BlockchainClient;
}

export interface PaymentProgress {
  currentStep: TransactionStatus;
  completedSteps: TransactionStatus[];
  estimatedTimeRemaining: number; // in minutes
  message: string;
}

export class PaymentService {
  private feeCalculator: FeeCalculator;
  private fernClient: FernAPIClient;
  private blockchainClient: BlockchainClient;
  private storageKey = 'eztx_transactions';

  constructor(config: PaymentServiceConfig) {
    this.feeCalculator = new FeeCalculator();
    
    // Use provided clients or default to mock services
    this.fernClient = config.fernApiClient || new MockFernService();
    this.blockchainClient = config.blockchainClient || new MockBlockchainService();
  }

  /**
   * Initiate a new payment and return the transaction
   */
  async initiatePayment(request: PaymentRequest): Promise<Transaction> {
    // Validate the payment request
    this.validatePaymentRequest(request);

    // Calculate fees
    const fees = await this.feeCalculator.calculateFees(request.amount, request.currency);

    // Create initial transaction record
    const transaction: Transaction = {
      id: this.generateTransactionId(),
      timestamp: new Date(),
      amount: request.amount,
      currency: request.currency,
      recipient: request.recipientAddress,
      status: TransactionStatus.INITIATED,
      fees
    };

    // Store transaction
    this.storeTransaction(transaction);

    // Start the payment process asynchronously
    this.processPayment(transaction, request).catch(error => {
      console.error('Payment processing failed:', error);
      this.updateTransactionStatus(transaction.id, TransactionStatus.FAILED);
    });

    return transaction;
  }

  /**
   * Get the current status of a transaction
   */
  async getTransactionStatus(id: string): Promise<TransactionStatus> {
    const transaction = this.getStoredTransaction(id);
    if (!transaction) {
      throw new Error(`Transaction not found: ${id}`);
    }
    return transaction.status;
  }

  /**
   * Get transaction history from localStorage
   */
  async getTransactionHistory(): Promise<Transaction[]> {
    const stored = this.getStoredTransactions();
    return stored.map(this.convertStoredToTransaction);
  }

  /**
   * Get detailed transaction information
   */
  async getTransaction(id: string): Promise<Transaction | null> {
    const stored = this.getStoredTransaction(id);
    return stored ? this.convertStoredToTransaction(stored) : null;
  }

  /**
   * Get real-time payment progress information
   */
  async getPaymentProgress(id: string): Promise<PaymentProgress> {
    const transaction = this.getStoredTransaction(id);
    if (!transaction) {
      throw new Error(`Transaction not found: ${id}`);
    }

    const completedSteps = this.getCompletedSteps(transaction.status);
    const estimatedTimeRemaining = await this.calculateRemainingTime(transaction.status);

    return {
      currentStep: transaction.status,
      completedSteps,
      estimatedTimeRemaining,
      message: this.getStatusMessage(transaction.status)
    };
  }

  /**
   * Cancel a payment (if possible)
   */
  async cancelPayment(id: string): Promise<boolean> {
    const transaction = this.getStoredTransaction(id);
    if (!transaction) {
      throw new Error(`Transaction not found: ${id}`);
    }

    // Can only cancel if not yet processing on blockchain
    if ([TransactionStatus.INITIATED, TransactionStatus.PENDING, TransactionStatus.ON_RAMPING].includes(transaction.status)) {
      this.updateTransactionStatus(id, TransactionStatus.FAILED);
      return true;
    }

    return false;
  }

  /**
   * Retry a failed payment
   */
  async retryPayment(id: string): Promise<Transaction> {
    const stored = this.getStoredTransaction(id);
    if (!stored) {
      throw new Error(`Transaction not found: ${id}`);
    }

    if (stored.status !== TransactionStatus.FAILED) {
      throw new Error('Can only retry failed transactions');
    }

    // Create new payment request from stored transaction
    const request: PaymentRequest = {
      amount: stored.amount,
      currency: stored.currency,
      recipientAddress: stored.recipient,
      recipientENS: stored.recipientENS
    };

    return this.initiatePayment(request);
  }

  /**
   * Main payment processing orchestration
   */
  private async processPayment(transaction: Transaction, request: PaymentRequest): Promise<void> {
    try {
      // Step 1: Update to pending
      this.updateTransactionStatus(transaction.id, TransactionStatus.PENDING);

      // Step 2: On-ramp (convert fiat to PYUSD)
      this.updateTransactionStatus(transaction.id, TransactionStatus.ON_RAMPING);
      const onRampResponse = await this.fernClient.initiateOnRamp(request.amount, request.currency);
      this.updateTransactionField(transaction.id, 'fernOnRampId', onRampResponse.id);

      // Wait for on-ramp completion
      await this.waitForOnRampCompletion(onRampResponse.id);

      // Step 3: Converting (preparing for blockchain transfer)
      this.updateTransactionStatus(transaction.id, TransactionStatus.CONVERTING);
      await this.delay(2000); // Simulate conversion time

      // Step 4: Blockchain transfer
      this.updateTransactionStatus(transaction.id, TransactionStatus.TRANSFERRING);
      const txResponse = await this.blockchainClient.sendPYUSD(
        request.recipientAddress, 
        onRampResponse.pyusdAmount || request.amount
      );
      this.updateTransactionField(transaction.id, 'txHash', txResponse.hash);

      // Wait for blockchain confirmation
      await this.waitForBlockchainConfirmation(txResponse.hash);

      // Step 5: Off-ramp (convert PYUSD to recipient's fiat)
      this.updateTransactionStatus(transaction.id, TransactionStatus.OFF_RAMPING);
      const offRampResponse = await this.fernClient.initiateOffRamp(
        onRampResponse.pyusdAmount || request.amount,
        request.currency,
        request.recipientAddress
      );
      this.updateTransactionField(transaction.id, 'fernOffRampId', offRampResponse.id);

      // Wait for off-ramp completion
      await this.waitForOffRampCompletion(offRampResponse.id);

      // Step 6: Complete
      this.updateTransactionStatus(transaction.id, TransactionStatus.COMPLETED);

    } catch (error) {
      console.error('Payment processing error:', error);
      this.updateTransactionStatus(transaction.id, TransactionStatus.FAILED);
      throw error;
    }
  }

  /**
   * Wait for on-ramp completion with polling
   */
  private async waitForOnRampCompletion(onRampId: string): Promise<void> {
    const maxAttempts = 30; // 5 minutes with 10-second intervals
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const status = await this.fernClient.getOnRampStatus(onRampId);
        if (status.status === 'completed') {
          return;
        }
        if (status.status === 'failed') {
          throw new Error('On-ramp failed');
        }
      } catch (error) {
        console.error('Error checking on-ramp status:', error);
      }

      await this.delay(10000); // Wait 10 seconds
      attempts++;
    }

    throw new Error('On-ramp timeout');
  }

  /**
   * Wait for blockchain confirmation with polling
   */
  private async waitForBlockchainConfirmation(txHash: string): Promise<void> {
    const maxAttempts = 60; // 10 minutes with 10-second intervals
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const status = await this.blockchainClient.getTransactionStatus(txHash);
        if (status.status === 'confirmed' && (status.confirmations || 0) >= 3) {
          return;
        }
        if (status.status === 'failed') {
          throw new Error('Blockchain transaction failed');
        }
      } catch (error) {
        console.error('Error checking transaction status:', error);
      }

      await this.delay(10000); // Wait 10 seconds
      attempts++;
    }

    throw new Error('Blockchain confirmation timeout');
  }

  /**
   * Wait for off-ramp completion with polling
   */
  private async waitForOffRampCompletion(offRampId: string): Promise<void> {
    const maxAttempts = 20; // 3.3 minutes with 10-second intervals
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const status = await this.fernClient.getOffRampStatus(offRampId);
        if (status.status === 'completed') {
          return;
        }
        if (status.status === 'failed') {
          throw new Error('Off-ramp failed');
        }
      } catch (error) {
        console.error('Error checking off-ramp status:', error);
      }

      await this.delay(10000); // Wait 10 seconds
      attempts++;
    }

    throw new Error('Off-ramp timeout');
  }

  /**
   * Validate payment request
   */
  private validatePaymentRequest(request: PaymentRequest): void {
    if (!request.amount || request.amount <= 0) {
      throw new Error('Invalid amount: must be greater than 0');
    }

    if (!request.currency) {
      throw new Error('Currency is required');
    }

    if (!request.recipientAddress) {
      throw new Error('Recipient address is required');
    }

    // Basic address validation
    if (!this.blockchainClient.validateAddress(request.recipientAddress)) {
      throw new Error('Invalid recipient address format');
    }
  }

  /**
   * Generate unique transaction ID
   */
  private generateTransactionId(): string {
    return 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Store transaction in localStorage
   */
  private storeTransaction(transaction: Transaction): void {
    const stored: StoredTransaction = {
      id: transaction.id,
      createdAt: transaction.timestamp.toISOString(),
      updatedAt: new Date().toISOString(),
      amount: transaction.amount,
      currency: transaction.currency,
      recipient: transaction.recipient,
      status: transaction.status,
      fees: transaction.fees,
      txHash: transaction.txHash
    };

    const transactions = this.getStoredTransactions();
    const existingIndex = transactions.findIndex(t => t.id === transaction.id);
    
    if (existingIndex >= 0) {
      transactions[existingIndex] = stored;
    } else {
      transactions.push(stored);
    }

    localStorage.setItem(this.storageKey, JSON.stringify(transactions));
  }

  /**
   * Update transaction status
   */
  private updateTransactionStatus(id: string, status: TransactionStatus): void {
    const transactions = this.getStoredTransactions();
    const transaction = transactions.find(t => t.id === id);
    
    if (transaction) {
      transaction.status = status;
      transaction.updatedAt = new Date().toISOString();
      localStorage.setItem(this.storageKey, JSON.stringify(transactions));
    }
  }

  /**
   * Update specific transaction field
   */
  private updateTransactionField(id: string, field: keyof StoredTransaction, value: any): void {
    const transactions = this.getStoredTransactions();
    const transaction = transactions.find(t => t.id === id);
    
    if (transaction) {
      (transaction as any)[field] = value;
      transaction.updatedAt = new Date().toISOString();
      localStorage.setItem(this.storageKey, JSON.stringify(transactions));
    }
  }

  /**
   * Get all stored transactions
   */
  private getStoredTransactions(): StoredTransaction[] {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error reading transactions from localStorage:', error);
      return [];
    }
  }

  /**
   * Get specific stored transaction
   */
  private getStoredTransaction(id: string): StoredTransaction | null {
    const transactions = this.getStoredTransactions();
    return transactions.find(t => t.id === id) || null;
  }

  /**
   * Convert stored transaction to transaction object
   */
  private convertStoredToTransaction(stored: StoredTransaction): Transaction {
    return {
      id: stored.id,
      timestamp: new Date(stored.createdAt),
      amount: stored.amount,
      currency: stored.currency,
      recipient: stored.recipient,
      status: stored.status,
      fees: stored.fees,
      txHash: stored.txHash
    };
  }

  /**
   * Get completed steps for a given status
   */
  private getCompletedSteps(status: TransactionStatus): TransactionStatus[] {
    const allSteps = [
      TransactionStatus.INITIATED,
      TransactionStatus.PENDING,
      TransactionStatus.ON_RAMPING,
      TransactionStatus.CONVERTING,
      TransactionStatus.TRANSFERRING,
      TransactionStatus.OFF_RAMPING,
      TransactionStatus.COMPLETED
    ];

    const currentIndex = allSteps.indexOf(status);
    return currentIndex >= 0 ? allSteps.slice(0, currentIndex) : [];
  }

  /**
   * Calculate estimated remaining time
   */
  private async calculateRemainingTime(status: TransactionStatus): Promise<number> {
    const timeEstimates = {
      [TransactionStatus.INITIATED]: 15,
      [TransactionStatus.PENDING]: 12,
      [TransactionStatus.ON_RAMPING]: 8,
      [TransactionStatus.CONVERTING]: 5,
      [TransactionStatus.TRANSFERRING]: 3,
      [TransactionStatus.OFF_RAMPING]: 2,
      [TransactionStatus.COMPLETED]: 0,
      [TransactionStatus.FAILED]: 0
    };

    return timeEstimates[status] || 0;
  }

  /**
   * Get user-friendly status message
   */
  private getStatusMessage(status: TransactionStatus): string {
    const messages = {
      [TransactionStatus.INITIATED]: 'Payment initiated, preparing to process...',
      [TransactionStatus.PENDING]: 'Payment is being prepared...',
      [TransactionStatus.ON_RAMPING]: 'Converting your money to digital currency...',
      [TransactionStatus.CONVERTING]: 'Preparing for blockchain transfer...',
      [TransactionStatus.TRANSFERRING]: 'Sending payment on the blockchain...',
      [TransactionStatus.OFF_RAMPING]: 'Converting to recipient\'s local currency...',
      [TransactionStatus.COMPLETED]: 'Payment completed successfully!',
      [TransactionStatus.FAILED]: 'Payment failed. Please try again.'
    };

    return messages[status] || 'Processing payment...';
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clear all transaction history (for testing)
   */
  clearTransactionHistory(): void {
    localStorage.removeItem(this.storageKey);
  }
}