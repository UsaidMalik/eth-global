import { BlockchainClient } from './BlockchainClient';
import { MockBlockchainClient } from './mock/MockBlockchainClient';
import { BlockchainClientInterface, BlockchainConfig } from '../types';

export interface BlockchainServiceConfig {
  useMockServices: boolean;
  blockchainConfig?: BlockchainConfig;
}

export class BlockchainServiceFactory {
  private static instance: BlockchainServiceFactory;
  private config: BlockchainServiceConfig;
  private blockchainClient: BlockchainClientInterface | null = null;

  private constructor(config: BlockchainServiceConfig) {
    this.config = config;
  }

  static getInstance(config?: BlockchainServiceConfig): BlockchainServiceFactory {
    if (!BlockchainServiceFactory.instance) {
      if (!config) {
        throw new Error('BlockchainServiceFactory must be initialized with config');
      }
      BlockchainServiceFactory.instance = new BlockchainServiceFactory(config);
    }
    return BlockchainServiceFactory.instance;
  }

  static initialize(config: BlockchainServiceConfig): BlockchainServiceFactory {
    BlockchainServiceFactory.instance = new BlockchainServiceFactory(config);
    return BlockchainServiceFactory.instance;
  }

  getBlockchainClient(): BlockchainClientInterface {
    if (!this.blockchainClient) {
      this.blockchainClient = this.createBlockchainClient();
    }
    return this.blockchainClient;
  }

  private createBlockchainClient(): BlockchainClientInterface {
    if (this.config.useMockServices) {
      console.log('Creating mock blockchain client');
      return new MockBlockchainClient();
    }

    if (!this.config.blockchainConfig) {
      throw new Error('Blockchain config is required for real blockchain client');
    }

    console.log('Creating real blockchain client');
    return new BlockchainClient(this.config.blockchainConfig);
  }

  updateConfig(config: Partial<BlockchainServiceConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Reset client to force recreation with new config
    if (this.blockchainClient) {
      this.blockchainClient.disconnect();
      this.blockchainClient = null;
    }
  }

  async connectBlockchain(): Promise<void> {
    const client = this.getBlockchainClient();
    if (!client.isConnected()) {
      await client.connect();
    }
  }

  disconnectBlockchain(): void {
    if (this.blockchainClient) {
      this.blockchainClient.disconnect();
    }
  }

  isUsingMockServices(): boolean {
    return this.config.useMockServices;
  }
}

// Default configurations for different networks
export const getDefaultBlockchainConfig = (chainId: number): BlockchainConfig => {
  const configs: Record<number, BlockchainConfig> = {
    // Hardhat local network
    31337: {
      rpcUrl: 'http://127.0.0.1:8545',
      chainId: 31337,
      paymentContractAddress: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
      pyusdTokenAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
      gasLimitMultiplier: 1.2,
    },
    // Ethereum Sepolia testnet
    11155111: {
      rpcUrl: process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || 'https://sepolia.infura.io/v3/YOUR_KEY',
      chainId: 11155111,
      paymentContractAddress: process.env.NEXT_PUBLIC_PAYMENT_CONTRACT_ADDRESS_11155111 || '',
      pyusdTokenAddress: process.env.NEXT_PUBLIC_PYUSD_TOKEN_ADDRESS_11155111 || '',
      gasLimitMultiplier: 1.3,
      maxGasPrice: BigInt('50000000000'), // 50 gwei max
    },
    // Ethereum Mainnet
    1: {
      rpcUrl: process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL || 'https://mainnet.infura.io/v3/YOUR_KEY',
      chainId: 1,
      paymentContractAddress: process.env.NEXT_PUBLIC_PAYMENT_CONTRACT_ADDRESS_1 || '',
      pyusdTokenAddress: '0x6c3ea9036406852006290770BEdFcAbA0e23A0e8', // Real PYUSD address
      gasLimitMultiplier: 1.2,
      maxGasPrice: BigInt('100000000000'), // 100 gwei max
    },
  };

  const config = configs[chainId];
  if (!config) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }

  return config;
};

// Utility function to create service factory with environment-based config
export const createBlockchainServiceFactory = (): BlockchainServiceFactory => {
  const useMockServices = process.env.NEXT_PUBLIC_USE_MOCK_SERVICES === 'true';
  const defaultChainId = parseInt(process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID || '31337');

  const config: BlockchainServiceConfig = {
    useMockServices,
    blockchainConfig: useMockServices ? undefined : getDefaultBlockchainConfig(defaultChainId),
  };

  return BlockchainServiceFactory.initialize(config);
};