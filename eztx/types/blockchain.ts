import { ethers } from 'ethers';

// Blockchain-specific types
export interface BlockchainConfig {
  rpcUrl: string;
  chainId: number;
  paymentContractAddress: string;
  pyusdTokenAddress: string;
  gasLimitMultiplier?: number;
  maxGasPrice?: bigint;
}

export interface GasEstimate {
  gasLimit: bigint;
  gasPrice: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  totalCost: bigint;
}

export interface TransactionReceipt {
  hash: string;
  blockNumber: number;
  blockHash: string;
  gasUsed: bigint;
  effectiveGasPrice: bigint;
  status: number;
  confirmations: number;
}

export interface PaymentContractTransaction {
  paymentId: string;
  sender: string;
  recipient: string;
  amount: bigint;
  status: PaymentContractStatus;
  timestamp: number;
  completedAt?: number;
  metadata: string;
}

export enum PaymentContractStatus {
  INITIATED = 0,
  PROCESSING = 1,
  COMPLETED = 2,
  FAILED = 3,
  REFUNDED = 4,
}

export interface BlockchainClientInterface {
  // Connection management
  connect(): Promise<void>;
  disconnect(): void;
  isConnected(): boolean;
  
  // Account management
  getAccount(): string | null;
  getBalance(address?: string): Promise<bigint>;
  
  // PYUSD token operations
  getPYUSDBalance(address?: string): Promise<bigint>;
  approvePYUSD(spender: string, amount: bigint): Promise<string>;
  getPYUSDAllowance(owner: string, spender: string): Promise<bigint>;
  
  // Payment contract operations
  initiatePayment(recipient: string, amount: bigint, metadata: string): Promise<string>;
  getPaymentStatus(paymentId: string): Promise<PaymentContractStatus>;
  getPayment(paymentId: string): Promise<PaymentContractTransaction>;
  getUserPayments(address?: string): Promise<string[]>;
  calculatePlatformFee(amount: bigint): Promise<bigint>;
  
  // Gas estimation and optimization
  estimateGas(transaction: ethers.TransactionRequest): Promise<GasEstimate>;
  optimizeGasPrice(): Promise<{ gasPrice: bigint; maxFeePerGas?: bigint; maxPriorityFeePerGas?: bigint }>;
  
  // Transaction management
  waitForTransaction(hash: string, confirmations?: number): Promise<TransactionReceipt>;
  getTransactionReceipt(hash: string): Promise<TransactionReceipt | null>;
  
  // Event listening
  onPaymentInitiated(callback: (event: PaymentInitiatedEvent) => void): void;
  onPaymentCompleted(callback: (event: PaymentCompletedEvent) => void): void;
  onPaymentFailed(callback: (event: PaymentFailedEvent) => void): void;
  removeAllListeners(): void;
}

// Event types
export interface PaymentInitiatedEvent {
  paymentId: string;
  sender: string;
  recipient: string;
  amount: bigint;
  timestamp: number;
  transactionHash: string;
}

export interface PaymentCompletedEvent {
  paymentId: string;
  completedAt: number;
  transactionHash: string;
}

export interface PaymentFailedEvent {
  paymentId: string;
  reason: string;
  transactionHash: string;
}

// Network configuration
export interface NetworkInfo {
  chainId: number;
  name: string;
  rpcUrl: string;
  blockExplorer?: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

// Constants
export const PYUSD_DECIMALS = 6;
export const DEFAULT_GAS_LIMIT_MULTIPLIER = 1.2;
export const DEFAULT_CONFIRMATION_BLOCKS = 1;
export const MAX_RETRY_ATTEMPTS = 3;
export const RETRY_DELAY_MS = 2000;