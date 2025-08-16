import { ethers } from 'ethers';
import {
  BlockchainClientInterface,
  BlockchainConfig,
  GasEstimate,
  TransactionReceipt,
  PaymentContractTransaction,
  PaymentContractStatus,
  PaymentInitiatedEvent,
  PaymentCompletedEvent,
  PaymentFailedEvent,
  PYUSD_DECIMALS,
  DEFAULT_GAS_LIMIT_MULTIPLIER,
  DEFAULT_CONFIRMATION_BLOCKS,
  MAX_RETRY_ATTEMPTS,
  RETRY_DELAY_MS,
  BlockchainError,
} from '../types';

// Contract ABIs
const PAYMENT_CONTRACT_ABI = [
  "function initiatePayment(address recipient, uint256 amount, string calldata metadata) external returns (bytes32 paymentId)",
  "function getPaymentStatus(bytes32 paymentId) external view returns (uint8 status)",
  "function getPayment(bytes32 paymentId) external view returns (tuple(bytes32 id, address sender, address recipient, uint256 amount, uint8 status, uint256 timestamp, uint256 completedAt, string metadata))",
  "function getUserPayments(address user) external view returns (bytes32[] memory paymentIds)",
  "function calculatePlatformFee(uint256 amount) external view returns (uint256 fee)",
  "function getContractStats() external view returns (uint256 totalPayments, uint256 totalVolume, uint256 contractBalance)",
  "function platformFeeRate() external view returns (uint256)",
  "function feeRecipient() external view returns (address)",
  "event PaymentInitiated(bytes32 indexed paymentId, address indexed sender, address indexed recipient, uint256 amount, uint256 timestamp)",
  "event PaymentCompleted(bytes32 indexed paymentId, uint256 completedAt)",
  "event PaymentFailed(bytes32 indexed paymentId, string reason)"
];

const PYUSD_TOKEN_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) external returns (bool)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
  "function name() external view returns (string)",
  // Mock PYUSD specific functions for testing
  "function mint(address to, uint256 amount) external",
  "function faucet(uint256 amount) external"
];

export class BlockchainClient implements BlockchainClientInterface {
  private provider: ethers.Provider | null = null;
  private signer: ethers.Signer | null = null;
  private paymentContract: ethers.Contract | null = null;
  private pyusdContract: ethers.Contract | null = null;
  private config: BlockchainConfig;
  private connected = false;

  constructor(config: BlockchainConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    try {
      // Initialize provider
      this.provider = new ethers.JsonRpcProvider(this.config.rpcUrl);
      
      // Check if we're in a browser environment with MetaMask
      if (typeof window !== 'undefined' && window.ethereum) {
        // Use MetaMask provider
        const browserProvider = new ethers.BrowserProvider(window.ethereum);
        await browserProvider.send("eth_requestAccounts", []);
        this.signer = await browserProvider.getSigner();
        this.provider = browserProvider;
      } else {
        // For server-side or testing, use the JSON RPC provider
        // Note: In production, you'd need to handle private keys securely
        console.warn('No browser wallet detected. Using read-only provider.');
      }

      // Verify network
      const network = await this.provider.getNetwork();
      if (Number(network.chainId) !== this.config.chainId) {
        throw new BlockchainError(
          `Network mismatch. Expected ${this.config.chainId}, got ${network.chainId}`
        );
      }

      // Initialize contracts
      this.paymentContract = new ethers.Contract(
        this.config.paymentContractAddress,
        PAYMENT_CONTRACT_ABI,
        this.signer || this.provider
      );

      this.pyusdContract = new ethers.Contract(
        this.config.pyusdTokenAddress,
        PYUSD_TOKEN_ABI,
        this.signer || this.provider
      );

      this.connected = true;
      console.log('Blockchain client connected successfully');
    } catch (error) {
      this.connected = false;
      throw new BlockchainError(
        `Failed to connect to blockchain: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  disconnect(): void {
    this.provider = null;
    this.signer = null;
    this.paymentContract = null;
    this.pyusdContract = null;
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected && this.provider !== null;
  }

  getAccount(): string | null {
    if (!this.signer) return null;
    // In ethers v6, address might not be immediately available
    return (this.signer as any).address || null;
  }

  async getBalance(address?: string): Promise<bigint> {
    if (!this.provider) throw new BlockchainError('Not connected to blockchain');
    
    const targetAddress = address || this.getAccount();
    if (!targetAddress) throw new BlockchainError('No address provided and no connected account');

    try {
      return await this.provider.getBalance(targetAddress);
    } catch (error) {
      throw new BlockchainError(
        `Failed to get balance: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async getPYUSDBalance(address?: string): Promise<bigint> {
    if (!this.pyusdContract) throw new BlockchainError('PYUSD contract not initialized');
    
    const targetAddress = address || this.getAccount();
    if (!targetAddress) throw new BlockchainError('No address provided and no connected account');

    try {
      return await this.pyusdContract.balanceOf(targetAddress);
    } catch (error) {
      throw new BlockchainError(
        `Failed to get PYUSD balance: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async approvePYUSD(spender: string, amount: bigint): Promise<string> {
    if (!this.pyusdContract || !this.signer) {
      throw new BlockchainError('Contract not initialized or no signer available');
    }

    try {
      const tx = await this.pyusdContract.approve(spender, amount);
      return tx.hash;
    } catch (error) {
      throw new BlockchainError(
        `Failed to approve PYUSD: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async getPYUSDAllowance(owner: string, spender: string): Promise<bigint> {
    if (!this.pyusdContract) throw new BlockchainError('PYUSD contract not initialized');

    try {
      return await this.pyusdContract.allowance(owner, spender);
    } catch (error) {
      throw new BlockchainError(
        `Failed to get PYUSD allowance: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async initiatePayment(recipient: string, amount: bigint, metadata: string): Promise<string> {
    if (!this.paymentContract || !this.signer) {
      throw new BlockchainError('Contract not initialized or no signer available');
    }

    try {
      // Estimate gas first
      const gasEstimate = await this.estimateGas({
        to: this.config.paymentContractAddress,
        data: this.paymentContract.interface.encodeFunctionData('initiatePayment', [
          recipient,
          amount,
          metadata
        ])
      });

      // Get optimized gas price
      const gasConfig = await this.optimizeGasPrice();

      // Execute transaction with optimized gas settings
      const tx = await this.paymentContract.initiatePayment(recipient, amount, metadata, {
        gasLimit: gasEstimate.gasLimit,
        ...gasConfig
      });

      return tx.hash;
    } catch (error) {
      throw new BlockchainError(
        `Failed to initiate payment: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentContractStatus> {
    if (!this.paymentContract) throw new BlockchainError('Payment contract not initialized');

    try {
      const status = await this.paymentContract.getPaymentStatus(paymentId);
      return Number(status) as PaymentContractStatus;
    } catch (error) {
      throw new BlockchainError(
        `Failed to get payment status: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async getPayment(paymentId: string): Promise<PaymentContractTransaction> {
    if (!this.paymentContract) throw new BlockchainError('Payment contract not initialized');

    try {
      const payment = await this.paymentContract.getPayment(paymentId);
      return {
        paymentId: payment.id,
        sender: payment.sender,
        recipient: payment.recipient,
        amount: payment.amount,
        status: Number(payment.status) as PaymentContractStatus,
        timestamp: Number(payment.timestamp),
        completedAt: payment.completedAt > 0 ? Number(payment.completedAt) : undefined,
        metadata: payment.metadata
      };
    } catch (error) {
      throw new BlockchainError(
        `Failed to get payment: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async getUserPayments(address?: string): Promise<string[]> {
    if (!this.paymentContract) throw new BlockchainError('Payment contract not initialized');
    
    const targetAddress = address || this.getAccount();
    if (!targetAddress) throw new BlockchainError('No address provided and no connected account');

    try {
      return await this.paymentContract.getUserPayments(targetAddress);
    } catch (error) {
      throw new BlockchainError(
        `Failed to get user payments: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async calculatePlatformFee(amount: bigint): Promise<bigint> {
    if (!this.paymentContract) throw new BlockchainError('Payment contract not initialized');

    try {
      return await this.paymentContract.calculatePlatformFee(amount);
    } catch (error) {
      throw new BlockchainError(
        `Failed to calculate platform fee: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async estimateGas(transaction: ethers.TransactionRequest): Promise<GasEstimate> {
    if (!this.provider) throw new BlockchainError('Not connected to blockchain');

    try {
      const gasLimit = await this.provider.estimateGas(transaction);
      const adjustedGasLimit = BigInt(
        Math.ceil(Number(gasLimit) * (this.config.gasLimitMultiplier || DEFAULT_GAS_LIMIT_MULTIPLIER))
      );

      const feeData = await this.provider.getFeeData();
      const gasPrice = feeData.gasPrice || BigInt(0);
      const maxFeePerGas = feeData.maxFeePerGas;
      const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;

      // Apply max gas price limit if configured
      const finalGasPrice = this.config.maxGasPrice && gasPrice > this.config.maxGasPrice
        ? this.config.maxGasPrice
        : gasPrice;

      return {
        gasLimit: adjustedGasLimit,
        gasPrice: finalGasPrice,
        maxFeePerGas: maxFeePerGas || undefined,
        maxPriorityFeePerGas: maxPriorityFeePerGas || undefined,
        totalCost: adjustedGasLimit * finalGasPrice
      };
    } catch (error) {
      throw new BlockchainError(
        `Failed to estimate gas: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async optimizeGasPrice(): Promise<{ gasPrice: bigint; maxFeePerGas?: bigint; maxPriorityFeePerGas?: bigint }> {
    if (!this.provider) throw new BlockchainError('Not connected to blockchain');

    try {
      const feeData = await this.provider.getFeeData();
      
      // For EIP-1559 networks
      if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
        return {
          gasPrice: feeData.gasPrice || BigInt(0),
          maxFeePerGas: feeData.maxFeePerGas,
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas
        };
      }

      // For legacy networks
      const gasPrice = feeData.gasPrice || BigInt(0);
      const finalGasPrice = this.config.maxGasPrice && gasPrice > this.config.maxGasPrice
        ? this.config.maxGasPrice
        : gasPrice;

      return { gasPrice: finalGasPrice };
    } catch (error) {
      throw new BlockchainError(
        `Failed to optimize gas price: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async waitForTransaction(hash: string, confirmations = DEFAULT_CONFIRMATION_BLOCKS): Promise<TransactionReceipt> {
    if (!this.provider) throw new BlockchainError('Not connected to blockchain');

    try {
      const receipt = await this.provider.waitForTransaction(hash, confirmations);
      if (!receipt) {
        throw new BlockchainError('Transaction receipt not found');
      }

      return {
        hash: receipt.hash,
        blockNumber: receipt.blockNumber,
        blockHash: receipt.blockHash,
        gasUsed: receipt.gasUsed,
        effectiveGasPrice: receipt.gasPrice,
        status: receipt.status || 0,
        confirmations: await receipt.confirmations()
      };
    } catch (error) {
      throw new BlockchainError(
        `Failed to wait for transaction: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async getTransactionReceipt(hash: string): Promise<TransactionReceipt | null> {
    if (!this.provider) throw new BlockchainError('Not connected to blockchain');

    try {
      const receipt = await this.provider.getTransactionReceipt(hash);
      if (!receipt) return null;

      return {
        hash: receipt.hash,
        blockNumber: receipt.blockNumber,
        blockHash: receipt.blockHash,
        gasUsed: receipt.gasUsed,
        effectiveGasPrice: receipt.gasPrice,
        status: receipt.status || 0,
        confirmations: await receipt.confirmations()
      };
    } catch (error) {
      throw new BlockchainError(
        `Failed to get transaction receipt: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  onPaymentInitiated(callback: (event: PaymentInitiatedEvent) => void): void {
    if (!this.paymentContract) throw new BlockchainError('Payment contract not initialized');

    this.paymentContract.on('PaymentInitiated', (paymentId, sender, recipient, amount, timestamp, event) => {
      callback({
        paymentId,
        sender,
        recipient,
        amount,
        timestamp: Number(timestamp),
        transactionHash: event.log.transactionHash
      });
    });
  }

  onPaymentCompleted(callback: (event: PaymentCompletedEvent) => void): void {
    if (!this.paymentContract) throw new BlockchainError('Payment contract not initialized');

    this.paymentContract.on('PaymentCompleted', (paymentId, completedAt, event) => {
      callback({
        paymentId,
        completedAt: Number(completedAt),
        transactionHash: event.log.transactionHash
      });
    });
  }

  onPaymentFailed(callback: (event: PaymentFailedEvent) => void): void {
    if (!this.paymentContract) throw new BlockchainError('Payment contract not initialized');

    this.paymentContract.on('PaymentFailed', (paymentId, reason, event) => {
      callback({
        paymentId,
        reason,
        transactionHash: event.log.transactionHash
      });
    });
  }

  removeAllListeners(): void {
    if (this.paymentContract) {
      this.paymentContract.removeAllListeners();
    }
  }

  // Utility methods for error handling and retries
  private async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries = MAX_RETRY_ATTEMPTS,
    delay = RETRY_DELAY_MS
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt === maxRetries) {
          throw new BlockchainError(`Operation failed after ${maxRetries} attempts: ${lastError.message}`);
        }

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }

    throw lastError!;
  }

  // Helper method to format amounts
  static formatPYUSD(amount: bigint): string {
    return ethers.formatUnits(amount, PYUSD_DECIMALS);
  }

  static parsePYUSD(amount: string): bigint {
    return ethers.parseUnits(amount, PYUSD_DECIMALS);
  }
}