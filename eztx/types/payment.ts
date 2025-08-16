export interface PaymentRequest {
  amount: number;
  currency: string;
  recipientAddress: string;
  recipientENS?: string;
}

export interface FeeEstimate {
  onRampFee: number;
  blockchainFee: number;
  offRampFee: number;
  totalFee: number;
  estimatedTime: number; // in minutes
}

export enum TransactionStatus {
  INITIATED = 'initiated',
  PENDING = 'pending',
  ON_RAMPING = 'on_ramping',
  CONVERTING = 'converting',
  TRANSFERRING = 'transferring',
  OFF_RAMPING = 'off_ramping',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export interface Transaction {
  id: string;
  timestamp: Date;
  amount: number;
  currency: string;
  recipient: string;
  status: TransactionStatus;
  fees: FeeEstimate;
  txHash?: string;
}

export interface StoredTransaction {
  id: string;
  createdAt: string;
  updatedAt: string;
  amount: number;
  currency: string;
  recipient: string;
  recipientENS?: string;
  status: TransactionStatus;
  fees: FeeEstimate;
  txHash?: string;
  fernOnRampId?: string;
  fernOffRampId?: string;
  paymentContractId?: string;
}