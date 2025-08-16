import {
  BlockchainClientInterface,
  GasEstimate,
  TransactionReceipt,
  PaymentContractTransaction,
  PaymentContractStatus,
  PaymentInitiatedEvent,
  PaymentCompletedEvent,
  PaymentFailedEvent,
  PYUSD_DECIMALS,
} from '../../types';

export class MockBlockchainClient implements BlockchainClientInterface {
  private connected = false;
  private mockAccount = '0x742d35Cc6634C0532925a3b8D4C9db96590c6C87';
  private mockBalance = BigInt('1000000000000000000'); // 1 ETH
  private mockPYUSDBalance = BigInt('10000000000'); // 10,000 PYUSD (6 decimals)
  private mockPayments = new Map<string, PaymentContractTransaction>();
  private mockUserPayments = new Map<string, string[]>();
  private paymentCounter = 0;

  // Event callbacks
  private paymentInitiatedCallbacks: ((event: PaymentInitiatedEvent) => void)[] = [];
  private paymentCompletedCallbacks: ((event: PaymentCompletedEvent) => void)[] = [];
  private paymentFailedCallbacks: ((event: PaymentFailedEvent) => void)[] = [];

  async connect(): Promise<void> {
    // Simulate connection delay
    await this.delay(500);
    this.connected = true;
    console.log('Mock blockchain client connected');
  }

  disconnect(): void {
    this.connected = false;
    this.removeAllListeners();
  }

  isConnected(): boolean {
    return this.connected;
  }

  getAccount(): string | null {
    return this.connected ? this.mockAccount : null;
  }

  async getBalance(address?: string): Promise<bigint> {
    this.ensureConnected();
    await this.delay(200);
    return this.mockBalance;
  }

  async getPYUSDBalance(address?: string): Promise<bigint> {
    this.ensureConnected();
    await this.delay(200);
    return this.mockPYUSDBalance;
  }

  async approvePYUSD(spender: string, amount: bigint): Promise<string> {
    this.ensureConnected();
    await this.delay(1000);
    
    const txHash = this.generateMockTxHash();
    
    // Simulate approval success
    setTimeout(() => {
      console.log(`Mock PYUSD approval completed: ${txHash}`);
    }, 2000);
    
    return txHash;
  }

  async getPYUSDAllowance(owner: string, spender: string): Promise<bigint> {
    this.ensureConnected();
    await this.delay(200);
    
    // Return max allowance for mock
    return BigInt('115792089237316195423570985008687907853269984665640564039457584007913129639935');
  }

  async initiatePayment(recipient: string, amount: bigint, metadata: string): Promise<string> {
    this.ensureConnected();
    await this.delay(1500);

    const paymentId = this.generateMockPaymentId();
    const txHash = this.generateMockTxHash();
    const timestamp = Math.floor(Date.now() / 1000);

    // Create mock payment
    const payment: PaymentContractTransaction = {
      paymentId,
      sender: this.mockAccount,
      recipient,
      amount,
      status: PaymentContractStatus.INITIATED,
      timestamp,
      metadata
    };

    this.mockPayments.set(paymentId, payment);

    // Add to user payments
    if (!this.mockUserPayments.has(this.mockAccount)) {
      this.mockUserPayments.set(this.mockAccount, []);
    }
    if (!this.mockUserPayments.has(recipient)) {
      this.mockUserPayments.set(recipient, []);
    }
    
    this.mockUserPayments.get(this.mockAccount)!.push(paymentId);
    this.mockUserPayments.get(recipient)!.push(paymentId);

    // Emit payment initiated event
    const initiatedEvent: PaymentInitiatedEvent = {
      paymentId,
      sender: this.mockAccount,
      recipient,
      amount,
      timestamp,
      transactionHash: txHash
    };

    this.paymentInitiatedCallbacks.forEach(callback => {
      setTimeout(() => callback(initiatedEvent), 100);
    });

    // Simulate payment processing and completion
    setTimeout(() => {
      this.completePayment(paymentId, txHash);
    }, 3000);

    return txHash;
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentContractStatus> {
    this.ensureConnected();
    await this.delay(200);

    const payment = this.mockPayments.get(paymentId);
    if (!payment) {
      throw new Error('Payment not found');
    }

    return payment.status;
  }

  async getPayment(paymentId: string): Promise<PaymentContractTransaction> {
    this.ensureConnected();
    await this.delay(200);

    const payment = this.mockPayments.get(paymentId);
    if (!payment) {
      throw new Error('Payment not found');
    }

    return { ...payment };
  }

  async getUserPayments(address?: string): Promise<string[]> {
    this.ensureConnected();
    await this.delay(200);

    const targetAddress = address || this.mockAccount;
    return this.mockUserPayments.get(targetAddress) || [];
  }

  async calculatePlatformFee(amount: bigint): Promise<bigint> {
    this.ensureConnected();
    await this.delay(100);

    // Mock 0.25% fee (25 basis points)
    return (amount * BigInt(25)) / BigInt(10000);
  }

  async estimateGas(): Promise<GasEstimate> {
    this.ensureConnected();
    await this.delay(300);

    return {
      gasLimit: BigInt(150000),
      gasPrice: BigInt('20000000000'), // 20 gwei
      maxFeePerGas: BigInt('30000000000'), // 30 gwei
      maxPriorityFeePerGas: BigInt('2000000000'), // 2 gwei
      totalCost: BigInt('3000000000000000') // 0.003 ETH
    };
  }

  async optimizeGasPrice(): Promise<{ gasPrice: bigint; maxFeePerGas?: bigint; maxPriorityFeePerGas?: bigint }> {
    this.ensureConnected();
    await this.delay(200);

    return {
      gasPrice: BigInt('20000000000'), // 20 gwei
      maxFeePerGas: BigInt('25000000000'), // 25 gwei
      maxPriorityFeePerGas: BigInt('2000000000') // 2 gwei
    };
  }

  async waitForTransaction(hash: string, confirmations = 1): Promise<TransactionReceipt> {
    this.ensureConnected();
    
    // Simulate waiting for confirmations
    await this.delay(2000 * confirmations);

    return {
      hash,
      blockNumber: Math.floor(Math.random() * 1000000) + 18000000,
      blockHash: this.generateMockBlockHash(),
      gasUsed: BigInt(120000),
      effectiveGasPrice: BigInt('20000000000'),
      status: 1,
      confirmations
    };
  }

  async getTransactionReceipt(hash: string): Promise<TransactionReceipt | null> {
    this.ensureConnected();
    await this.delay(200);

    // Simulate 90% success rate for finding receipts
    if (Math.random() < 0.9) {
      return {
        hash,
        blockNumber: Math.floor(Math.random() * 1000000) + 18000000,
        blockHash: this.generateMockBlockHash(),
        gasUsed: BigInt(120000),
        effectiveGasPrice: BigInt('20000000000'),
        status: 1,
        confirmations: 3
      };
    }

    return null;
  }

  onPaymentInitiated(callback: (event: PaymentInitiatedEvent) => void): void {
    this.paymentInitiatedCallbacks.push(callback);
  }

  onPaymentCompleted(callback: (event: PaymentCompletedEvent) => void): void {
    this.paymentCompletedCallbacks.push(callback);
  }

  onPaymentFailed(callback: (event: PaymentFailedEvent) => void): void {
    this.paymentFailedCallbacks.push(callback);
  }

  removeAllListeners(): void {
    this.paymentInitiatedCallbacks = [];
    this.paymentCompletedCallbacks = [];
    this.paymentFailedCallbacks = [];
  }

  // Mock-specific methods
  private completePayment(paymentId: string, txHash: string): void {
    const payment = this.mockPayments.get(paymentId);
    if (!payment) return;

    // Update payment status
    payment.status = PaymentContractStatus.COMPLETED;
    payment.completedAt = Math.floor(Date.now() / 1000);

    // Deduct PYUSD balance (simulate transfer)
    const fee = (payment.amount * BigInt(25)) / BigInt(10000);
    this.mockPYUSDBalance -= payment.amount;

    // Emit completion event
    const completedEvent: PaymentCompletedEvent = {
      paymentId,
      completedAt: payment.completedAt,
      transactionHash: txHash
    };

    this.paymentCompletedCallbacks.forEach(callback => {
      callback(completedEvent);
    });

    console.log(`Mock payment completed: ${paymentId}`);
  }

  private generateMockPaymentId(): string {
    this.paymentCounter++;
    return `0x${this.paymentCounter.toString(16).padStart(64, '0')}`;
  }

  private generateMockTxHash(): string {
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    return '0x' + Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private generateMockBlockHash(): string {
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    return '0x' + Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private ensureConnected(): void {
    if (!this.connected) {
      throw new Error('Mock blockchain client not connected');
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Utility methods for testing
  setMockBalance(balance: bigint): void {
    this.mockBalance = balance;
  }

  setMockPYUSDBalance(balance: bigint): void {
    this.mockPYUSDBalance = balance;
  }

  getMockPayments(): Map<string, PaymentContractTransaction> {
    return new Map(this.mockPayments);
  }

  simulatePaymentFailure(paymentId: string, reason: string): void {
    const payment = this.mockPayments.get(paymentId);
    if (!payment) return;

    payment.status = PaymentContractStatus.FAILED;

    const failedEvent: PaymentFailedEvent = {
      paymentId,
      reason,
      transactionHash: this.generateMockTxHash()
    };

    this.paymentFailedCallbacks.forEach(callback => {
      callback(failedEvent);
    });
  }
}