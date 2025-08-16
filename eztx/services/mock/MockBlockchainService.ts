import { BlockchainError } from '../../types/errors';

export interface TransactionResponse {
  hash: string;
  status: 'pending' | 'confirmed' | 'failed';
  blockNumber?: number;
  gasUsed?: number;
  gasPrice?: number;
  confirmations?: number;
}

export interface GasEstimate {
  gasLimit: number;
  gasPrice: number; // in gwei
  maxFeePerGas?: number; // in gwei (EIP-1559)
  maxPriorityFeePerGas?: number; // in gwei (EIP-1559)
  estimatedCost: number; // in ETH
}

export interface BlockchainClient {
  sendPYUSD(to: string, amount: number): Promise<TransactionResponse>;
  getTransactionStatus(hash: string): Promise<TransactionResponse>;
  estimateGas(to: string, amount: number): Promise<GasEstimate>;
  getBalance(address: string): Promise<number>;
  validateAddress(address: string): boolean;
}

export class MockBlockchainService implements BlockchainClient {
  private transactions = new Map<string, TransactionResponse>();
  private balances = new Map<string, number>();

  constructor() {
    // Initialize some mock balances for testing
    this.balances.set('0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6', 1000);
    this.balances.set('0x8ba1f109551bD432803012645aac136c22C177ec', 500);
    this.balances.set('0x1234567890123456789012345678901234567890', 2000);
  }

  private generateTxHash(): string {
    return '0x' + Array.from({length: 64}, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private simulateNetworkDelay(): Promise<void> {
    // Simulate blockchain network delays (1-3 seconds)
    const delay = Math.random() * 2000 + 1000;
    return this.delay(delay);
  }

  private shouldSimulateError(): boolean {
    // 3% chance of simulating a blockchain error
    return Math.random() < 0.03;
  }

  private generateRandomGasPrice(): number {
    // Simulate gas prices between 20-100 gwei
    return Math.floor(Math.random() * 80) + 20;
  }

  private generateRandomBlockNumber(): number {
    // Simulate current block number around 18M
    return Math.floor(Math.random() * 1000) + 18000000;
  }

  validateAddress(address: string): boolean {
    // Basic Ethereum address validation
    const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    return ethAddressRegex.test(address);
  }

  async sendPYUSD(to: string, amount: number): Promise<TransactionResponse> {
    await this.simulateNetworkDelay();

    if (this.shouldSimulateError()) {
      throw new BlockchainError('Network congestion - transaction failed', 'NETWORK_ERROR');
    }

    if (!this.validateAddress(to)) {
      throw new BlockchainError(`Invalid recipient address: ${to}`, 'INVALID_ADDRESS');
    }

    if (amount <= 0) {
      throw new BlockchainError('Transfer amount must be greater than 0', 'INVALID_AMOUNT');
    }

    if (amount > 10000) {
      throw new BlockchainError('Transfer amount exceeds maximum limit', 'AMOUNT_TOO_HIGH');
    }

    const hash = this.generateTxHash();
    const gasPrice = this.generateRandomGasPrice();
    const gasUsed = Math.floor(Math.random() * 50000) + 21000; // 21k-71k gas

    const response: TransactionResponse = {
      hash,
      status: 'pending',
      gasPrice,
      gasUsed,
      confirmations: 0
    };

    this.transactions.set(hash, response);

    // Simulate transaction confirmation process
    setTimeout(() => {
      const tx = this.transactions.get(hash);
      if (tx) {
        tx.status = 'confirmed';
        tx.blockNumber = this.generateRandomBlockNumber();
        tx.confirmations = 1;
        this.transactions.set(hash, tx);
      }
    }, 15000); // 15 seconds for first confirmation

    // Simulate additional confirmations
    setTimeout(() => {
      const tx = this.transactions.get(hash);
      if (tx && tx.status === 'confirmed') {
        tx.confirmations = 3;
        this.transactions.set(hash, tx);
      }
    }, 45000); // 45 seconds for 3 confirmations

    setTimeout(() => {
      const tx = this.transactions.get(hash);
      if (tx && tx.status === 'confirmed') {
        tx.confirmations = 6;
        this.transactions.set(hash, tx);
      }
    }, 90000); // 90 seconds for 6 confirmations

    return response;
  }

  async getTransactionStatus(hash: string): Promise<TransactionResponse> {
    await this.simulateNetworkDelay();

    const transaction = this.transactions.get(hash);
    if (!transaction) {
      throw new BlockchainError(`Transaction not found: ${hash}`, 'TRANSACTION_NOT_FOUND');
    }

    return transaction;
  }

  async estimateGas(to: string, amount: number): Promise<GasEstimate> {
    await this.simulateNetworkDelay();

    if (!this.validateAddress(to)) {
      throw new BlockchainError(`Invalid recipient address: ${to}`, 'INVALID_ADDRESS');
    }

    if (amount <= 0) {
      throw new BlockchainError('Transfer amount must be greater than 0', 'INVALID_AMOUNT');
    }

    // Simulate network congestion affecting gas prices
    const baseGasPrice = this.generateRandomGasPrice();
    const gasLimit = 65000; // Typical for ERC-20 transfers
    
    // EIP-1559 style gas pricing
    const maxPriorityFeePerGas = Math.floor(baseGasPrice * 0.1); // 10% tip
    const maxFeePerGas = baseGasPrice + maxPriorityFeePerGas;
    
    // Calculate estimated cost in ETH (assuming 1 ETH = 2000 USD for conversion)
    const estimatedCostWei = gasLimit * maxFeePerGas * 1e9; // Convert gwei to wei
    const estimatedCost = estimatedCostWei / 1e18; // Convert wei to ETH

    return {
      gasLimit,
      gasPrice: baseGasPrice,
      maxFeePerGas,
      maxPriorityFeePerGas,
      estimatedCost
    };
  }

  async getBalance(address: string): Promise<number> {
    await this.simulateNetworkDelay();

    if (!this.validateAddress(address)) {
      throw new BlockchainError(`Invalid address: ${address}`, 'INVALID_ADDRESS');
    }

    // Return mock balance or 0 if address not found
    return this.balances.get(address) || 0;
  }

  // Utility methods for testing

  setMockBalance(address: string, balance: number): void {
    if (!this.validateAddress(address)) {
      throw new BlockchainError(`Invalid address: ${address}`, 'INVALID_ADDRESS');
    }
    this.balances.set(address, balance);
  }

  simulateTransactionFailure(hash: string): void {
    const transaction = this.transactions.get(hash);
    if (transaction) {
      transaction.status = 'failed';
      this.transactions.set(hash, transaction);
    }
  }

  clearMockData(): void {
    this.transactions.clear();
    // Keep some default balances for testing
    this.balances.clear();
    this.balances.set('0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6', 1000);
    this.balances.set('0x8ba1f109551bD432803012645aac136c22C177ec', 500);
    this.balances.set('0x1234567890123456789012345678901234567890', 2000);
  }

  getMockData() {
    return {
      transactions: Array.from(this.transactions.entries()),
      balances: Array.from(this.balances.entries())
    };
  }

  // Simulate different network conditions for testing
  simulateNetworkCongestion(): void {
    // This could be used to increase gas prices and delays
    console.log('Simulating network congestion - gas prices will be higher');
  }

  simulateNetworkStability(): void {
    // This could be used to normalize gas prices and delays
    console.log('Network conditions normalized');
  }
}