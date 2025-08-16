import { AppConfig } from '../types';

export const appConfig: AppConfig = {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  useMockServices: process.env.USE_MOCK_SERVICES === 'true' || process.env.NODE_ENV === 'development',
  fernApiUrl: process.env.FERN_API_URL || 'https://api.fern.com',
  blockchainRpcUrl: process.env.BLOCKCHAIN_RPC_URL || 'https://mainnet.infura.io/v3/your-project-id',
};

export const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD'] as const;
export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];

export const NETWORK_CONFIG = {
  chainId: 1, // Ethereum Mainnet
  chainName: 'Ethereum',
  nativeCurrency: {
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: [appConfig.blockchainRpcUrl],
  blockExplorerUrls: ['https://etherscan.io'],
};

export const PYUSD_CONTRACT_ADDRESS = '0x6c3ea9036406852006290770BEdFcAbA0e23A0e8'; // PYUSD on Ethereum

export const DEFAULT_GAS_LIMIT = 21000;
export const DEFAULT_GAS_PRICE_GWEI = 20;