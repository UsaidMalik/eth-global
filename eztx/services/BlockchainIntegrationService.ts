import {
  BlockchainClientInterface,
  PaymentRequest,
  Transaction,
  TransactionStatus,
  FeeEstimate,
  PaymentContractStatus,
  BlockchainError,
} from '../types';
import { formatPYUSD, parsePYUSD, formatETH, estimateTransactionTime } from '../utils/blockchain';

/**
 * Service that integrates blockchain operations with the payment flow
 */
export class BlockchainIntegrationService {
  private blockchainClient: BlockchainClientInterface;
  private eventListeners: Map<string, () => void> = new Map();

  constructor(blockchainClient: BlockchainClientInterface) {
    this.blockchainClient = blockchainClient;
    this.setupEventListeners();
  }

  /**
   * Initialize the blockchain connection
   */
  async initialize(): Promise<void> {
    if (!this.blockchainClient.isConnected()) {
      await this.blockchainClient.connect();
    }
  }

  /**
   * Check if user has sufficient PYUSD balance for payment
   */
  async checkBalance(paymentRequest: PaymentRequest): Promise<{
    hasBalance: boolean;
    currentBalance: string;
    requiredAmount: string;
    platformFee: string;
  }> {
    const requiredAmount = parsePYUSD(paymentRequest.amount.toString());
    const platformFee = await this.blockchainClient.calculatePlatformFee(requiredAmount);
    const totalRequired = requiredAmount + platformFee;
    
    const currentBalance = await this.blockchainClient.getPYUSDBalance();
    
    return {
      hasBalance: currentBalance >= totalRequired,
      currentBalance: formatPYUSD(currentBalance),
      requiredAmount: formatPYUSD(totalRequired),
      platformFee: formatPYUSD(platformFee),
    };
  }

  /**
   * Check and approve PYUSD spending if needed
   */
  async ensureAllowance(amount: bigint): Promise<string | null> {
    const account = this.blockchainClient.getAccount();
    if (!account) {
      throw new BlockchainError('No connected account');
    }

    // Get payment contract address (this would come from config)
    const paymentContractAddress = process.env.NEXT_PUBLIC_PAYMENT_CONTRACT_ADDRESS || '';
    
    const currentAllowance = await this.blockchainClient.getPYUSDAllowance(
      account,
      paymentContractAddress
    );

    if (currentAllowance < amount) {
      // Approve maximum amount for convenience
      const maxAmount = BigInt('115792089237316195423570985008687907853269984665640564039457584007913129639935');
      return await this.blockchainClient.approvePYUSD(paymentContractAddress, maxAmount);
    }

    return null; // No approval needed
  }

  /**
   * Estimate gas costs for the payment
   */
  async estimatePaymentCosts(paymentRequest: PaymentRequest): Promise<FeeEstimate> {
    const amount = parsePYUSD(paymentRequest.amount.toString());
    
    // Get platform fee
    const platformFee = await this.blockchainClient.calculatePlatformFee(amount);
    
    // Estimate gas costs
    const gasEstimate = await this.blockchainClient.estimateGas({
      to: process.env.NEXT_PUBLIC_PAYMENT_CONTRACT_ADDRESS,
      data: '0x' // Placeholder data
    });

    // Convert gas cost to USD (simplified - in reality you'd use a price oracle)
    const ethPrice = 2000; // Placeholder ETH price in USD
    const gasCostETH = Number(formatETH(gasEstimate.totalCost));
    const gasCostUSD = gasCostETH * ethPrice;

    const estimatedTime = estimateTransactionTime(gasEstimate.gasPrice);

    return {
      onRampFee: 0, // No on-ramp fee for direct blockchain payments
      blockchainFee: gasCostUSD,
      offRampFee: 0, // No off-ramp fee for direct blockchain payments
      totalFee: gasCostUSD + Number(formatPYUSD(platformFee)),
      estimatedTime,
    };
  }

  /**
   * Execute a payment on the blockchain
   */
  async executePayment(paymentRequest: PaymentRequest): Promise<{
    transactionHash: string;
    paymentId: string;
  }> {
    const amount = parsePYUSD(paymentRequest.amount.toString());
    
    // Ensure sufficient allowance
    const approvalTx = await this.ensureAllowance(amount);
    if (approvalTx) {
      // Wait for approval transaction to be mined
      await this.blockchainClient.waitForTransaction(approvalTx);
    }

    // Set up event listener to capture payment ID
    let capturedPaymentId: string | null = null;
    
    const paymentInitiatedHandler = (event: any) => {
      capturedPaymentId = event.paymentId;
    };
    
    this.blockchainClient.onPaymentInitiated(paymentInitiatedHandler);

    // Execute the payment
    const transactionHash = await this.blockchainClient.initiatePayment(
      paymentRequest.recipientAddress,
      amount,
      JSON.stringify({
        currency: paymentRequest.currency,
        recipientENS: paymentRequest.recipientENS,
        timestamp: Date.now(),
      })
    );

    // Wait a bit for the event to be captured
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Use captured payment ID or fall back to transaction hash
    const paymentId = capturedPaymentId || transactionHash;

    return {
      transactionHash,
      paymentId,
    };
  }

  /**
   * Get payment status from blockchain
   */
  async getPaymentStatus(paymentId: string): Promise<TransactionStatus> {
    try {
      const status = await this.blockchainClient.getPaymentStatus(paymentId);
      return this.mapContractStatusToTransactionStatus(status);
    } catch (error) {
      console.error('Error getting payment status:', error);
      return TransactionStatus.FAILED;
    }
  }

  /**
   * Get detailed payment information from blockchain
   */
  async getPaymentDetails(paymentId: string): Promise<Partial<Transaction>> {
    try {
      const payment = await this.blockchainClient.getPayment(paymentId);
      
      return {
        id: payment.paymentId,
        amount: Number(formatPYUSD(payment.amount)),
        recipient: payment.recipient,
        status: this.mapContractStatusToTransactionStatus(payment.status),
        timestamp: new Date(payment.timestamp * 1000),
        txHash: paymentId, // Simplified - in reality you'd track the actual tx hash
      };
    } catch (error) {
      console.error('Error getting payment details:', error);
      return {};
    }
  }

  /**
   * Get user's payment history from blockchain
   */
  async getUserPaymentHistory(address?: string): Promise<string[]> {
    try {
      return await this.blockchainClient.getUserPayments(address);
    } catch (error) {
      console.error('Error getting user payment history:', error);
      return [];
    }
  }

  /**
   * Get current gas prices and network status
   */
  async getNetworkStatus(): Promise<{
    gasPrice: string;
    estimatedTime: number;
    networkCongestion: 'low' | 'medium' | 'high';
  }> {
    try {
      const gasConfig = await this.blockchainClient.optimizeGasPrice();
      const estimatedTime = estimateTransactionTime(gasConfig.gasPrice);
      
      // Determine network congestion based on gas price (simplified)
      const gasPriceGwei = Number(gasConfig.gasPrice) / 1e9;
      let networkCongestion: 'low' | 'medium' | 'high' = 'low';
      
      if (gasPriceGwei > 50) networkCongestion = 'high';
      else if (gasPriceGwei > 20) networkCongestion = 'medium';

      return {
        gasPrice: `${gasPriceGwei.toFixed(1)} gwei`,
        estimatedTime,
        networkCongestion,
      };
    } catch (error) {
      console.error('Error getting network status:', error);
      return {
        gasPrice: 'Unknown',
        estimatedTime: 5,
        networkCongestion: 'medium',
      };
    }
  }

  /**
   * Setup event listeners for payment events
   */
  private setupEventListeners(): void {
    this.blockchainClient.onPaymentInitiated((event) => {
      console.log('Payment initiated:', event);
      // Emit custom events or update state as needed
    });

    this.blockchainClient.onPaymentCompleted((event) => {
      console.log('Payment completed:', event);
      // Emit custom events or update state as needed
    });

    this.blockchainClient.onPaymentFailed((event) => {
      console.log('Payment failed:', event);
      // Emit custom events or update state as needed
    });
  }

  /**
   * Map contract payment status to transaction status
   */
  private mapContractStatusToTransactionStatus(status: PaymentContractStatus): TransactionStatus {
    switch (status) {
      case PaymentContractStatus.INITIATED:
        return TransactionStatus.INITIATED;
      case PaymentContractStatus.PROCESSING:
        return TransactionStatus.TRANSFERRING;
      case PaymentContractStatus.COMPLETED:
        return TransactionStatus.COMPLETED;
      case PaymentContractStatus.FAILED:
        return TransactionStatus.FAILED;
      case PaymentContractStatus.REFUNDED:
        return TransactionStatus.FAILED; // Treat refunded as failed for UI purposes
      default:
        return TransactionStatus.FAILED;
    }
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.blockchainClient.removeAllListeners();
    this.eventListeners.clear();
  }
}

/**
 * Factory function to create blockchain integration service
 */
export function createBlockchainIntegrationService(
  blockchainClient: BlockchainClientInterface
): BlockchainIntegrationService {
  return new BlockchainIntegrationService(blockchainClient);
}