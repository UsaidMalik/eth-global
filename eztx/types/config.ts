export interface AppConfig {
  mode: 'development' | 'production';
  useMockServices: boolean;
  fernApiUrl: string;
  blockchainRpcUrl: string;
}

export interface OnRampResponse {
  id: string;
  status: string;
  estimatedCompletion: number;
}

export interface TransactionResponse {
  hash: string;
  status: string;
}