export interface UserFriendlyError {
  message: string;
  recoveryAction?: string;
  retryable: boolean;
}

export class FernError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'FernError';
  }
}

export class BlockchainError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'BlockchainError';
  }
}

export class ENSError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'ENSError';
  }
}