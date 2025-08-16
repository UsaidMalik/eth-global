import { SepoliaENSResolver, ENSResolver } from './SepoliaENSResolver';
import { MockENSResolver } from './mock/MockENSResolver';

export interface ENSServiceConfig {
  useMockServices: boolean;
  rpcUrl?: string;
}

export class ENSServiceFactory {
  private static instance: ENSServiceFactory;
  private config: ENSServiceConfig;
  private ensResolver: ENSResolver | null = null;

  private constructor(config: ENSServiceConfig) {
    this.config = config;
  }

  static getInstance(config?: ENSServiceConfig): ENSServiceFactory {
    if (!ENSServiceFactory.instance) {
      if (!config) {
        throw new Error('ENSServiceFactory must be initialized with config');
      }
      ENSServiceFactory.instance = new ENSServiceFactory(config);
    }
    return ENSServiceFactory.instance;
  }

  static initialize(config: ENSServiceConfig): ENSServiceFactory {
    ENSServiceFactory.instance = new ENSServiceFactory(config);
    return ENSServiceFactory.instance;
  }

  getENSResolver(): ENSResolver {
    if (!this.ensResolver) {
      this.ensResolver = this.createENSResolver();
    }
    return this.ensResolver;
  }

  private createENSResolver(): ENSResolver {
    if (this.config.useMockServices) {
      console.log('Creating mock ENS resolver');
      return new MockENSResolver();
    }

    console.log('Creating real ENS resolver');
    return new SepoliaENSResolver(this.config.rpcUrl);
  }

  updateConfig(config: Partial<ENSServiceConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Reset resolver to force recreation with new config
    this.ensResolver = null;
  }

  isUsingMockServices(): boolean {
    return this.config.useMockServices;
  }
}

// Utility function to create ENS service factory with environment-based config
export const createENSServiceFactory = (): ENSServiceFactory => {
  const useMockServices = process.env.NEXT_PUBLIC_USE_MOCK_SERVICES === 'true';
  const rpcUrl = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || 
                 `https://sepolia.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_API_KEY}`;

  const config: ENSServiceConfig = {
    useMockServices,
    rpcUrl: useMockServices ? undefined : rpcUrl,
  };

  return ENSServiceFactory.initialize(config);
};