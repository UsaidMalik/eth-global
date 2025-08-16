import { ENSError } from '../../types/errors';

export interface ENSResolver {
  resolveENS(ensName: string): Promise<string | null>;
  reverseResolve(address: string): Promise<string | null>;
  validateENSName(ensName: string): boolean;
}

export class MockENSResolver implements ENSResolver {
  private ensRegistry = new Map<string, string>();
  private reverseRegistry = new Map<string, string>();

  constructor() {
    // Initialize with some mock ENS names for testing
    this.setupMockENSNames();
  }

  private setupMockENSNames(): void {
    const mockEntries = [
      { ens: 'alice.eth', address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6' },
      { ens: 'bob.eth', address: '0x8ba1f109551bD432803012645Hac136c22C177ec' },
      { ens: 'charlie.eth', address: '0x1234567890123456789012345678901234567890' },
      { ens: 'merchant.eth', address: '0xabcdef1234567890abcdef1234567890abcdef12' },
      { ens: 'shop.eth', address: '0x9876543210987654321098765432109876543210' },
      { ens: 'payment.eth', address: '0x5555666677778888999900001111222233334444' },
      { ens: 'test.eth', address: '0x1111222233334444555566667777888899990000' },
      { ens: 'demo.eth', address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' },
      { ens: 'example.eth', address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' },
      { ens: 'wallet.eth', address: '0xcccccccccccccccccccccccccccccccccccccccc' }
    ];

    mockEntries.forEach(({ ens, address }) => {
      this.ensRegistry.set(ens.toLowerCase(), address.toLowerCase());
      this.reverseRegistry.set(address.toLowerCase(), ens);
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private simulateNetworkDelay(): Promise<void> {
    // Simulate ENS resolution delays (200ms to 1s)
    const delay = Math.random() * 800 + 200;
    return this.delay(delay);
  }

  private shouldSimulateError(): boolean {
    // 2% chance of simulating an ENS resolution error
    return Math.random() < 0.02;
  }

  validateENSName(ensName: string): boolean {
    // Basic ENS name validation
    const ensRegex = /^[a-zA-Z0-9-]+\.eth$/;
    
    if (!ensRegex.test(ensName)) {
      return false;
    }

    // Additional validation rules
    if (ensName.length < 7) { // minimum "a.eth" = 5 chars, but let's be more restrictive
      return false;
    }

    if (ensName.length > 255) {
      return false;
    }

    // Check for invalid characters or patterns
    const name = ensName.replace('.eth', '');
    if (name.startsWith('-') || name.endsWith('-')) {
      return false;
    }

    if (name.includes('--')) {
      return false;
    }

    return true;
  }

  private validateEthereumAddress(address: string): boolean {
    const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    return ethAddressRegex.test(address);
  }

  async resolveENS(ensName: string): Promise<string | null> {
    await this.simulateNetworkDelay();

    if (this.shouldSimulateError()) {
      throw new ENSError('ENS resolver temporarily unavailable', 'RESOLVER_UNAVAILABLE');
    }

    if (!ensName) {
      throw new ENSError('ENS name cannot be empty', 'INVALID_ENS_NAME');
    }

    const normalizedName = ensName.toLowerCase().trim();

    if (!this.validateENSName(normalizedName)) {
      throw new ENSError(`Invalid ENS name format: ${ensName}`, 'INVALID_ENS_NAME');
    }

    // Check if ENS name exists in our mock registry
    const address = this.ensRegistry.get(normalizedName);
    
    if (!address) {
      // Return null for non-existent names (not an error, just not found)
      return null;
    }

    return address;
  }

  async reverseResolve(address: string): Promise<string | null> {
    await this.simulateNetworkDelay();

    if (this.shouldSimulateError()) {
      throw new ENSError('ENS reverse resolver temporarily unavailable', 'RESOLVER_UNAVAILABLE');
    }

    if (!address) {
      throw new ENSError('Address cannot be empty', 'INVALID_ADDRESS');
    }

    const normalizedAddress = address.toLowerCase().trim();

    if (!this.validateEthereumAddress(normalizedAddress)) {
      throw new ENSError(`Invalid Ethereum address format: ${address}`, 'INVALID_ADDRESS');
    }

    // Check if address has a reverse ENS record
    const ensName = this.reverseRegistry.get(normalizedAddress);
    
    if (!ensName) {
      // Return null for addresses without reverse records
      return null;
    }

    return ensName;
  }

  // Utility methods for testing

  addMockENSRecord(ensName: string, address: string): void {
    if (!this.validateENSName(ensName)) {
      throw new ENSError(`Invalid ENS name format: ${ensName}`, 'INVALID_ENS_NAME');
    }

    if (!this.validateEthereumAddress(address)) {
      throw new ENSError(`Invalid Ethereum address format: ${address}`, 'INVALID_ADDRESS');
    }

    const normalizedName = ensName.toLowerCase();
    const normalizedAddress = address.toLowerCase();

    this.ensRegistry.set(normalizedName, normalizedAddress);
    this.reverseRegistry.set(normalizedAddress, ensName);
  }

  removeMockENSRecord(ensName: string): void {
    const normalizedName = ensName.toLowerCase();
    const address = this.ensRegistry.get(normalizedName);
    
    if (address) {
      this.ensRegistry.delete(normalizedName);
      this.reverseRegistry.delete(address);
    }
  }

  clearMockData(): void {
    this.ensRegistry.clear();
    this.reverseRegistry.clear();
    // Reinitialize with default mock data
    this.setupMockENSNames();
  }

  getMockData() {
    return {
      ensRegistry: Array.from(this.ensRegistry.entries()),
      reverseRegistry: Array.from(this.reverseRegistry.entries())
    };
  }

  // Simulate different ENS network conditions
  simulateENSOutage(): void {
    console.log('Simulating ENS network outage - all resolutions will fail');
    // This could be used to force all resolutions to throw errors
  }

  simulateSlowENS(): void {
    console.log('Simulating slow ENS responses - increased delays');
    // This could be used to increase resolution delays
  }

  // Get all available mock ENS names for testing
  getAvailableMockNames(): string[] {
    return Array.from(this.ensRegistry.keys());
  }

  // Check if an ENS name exists in the mock registry
  hasENSRecord(ensName: string): boolean {
    return this.ensRegistry.has(ensName.toLowerCase());
  }

  // Get address for ENS name without network simulation (for testing)
  getAddressSync(ensName: string): string | null {
    return this.ensRegistry.get(ensName.toLowerCase()) || null;
  }

  // Get ENS name for address without network simulation (for testing)
  getENSNameSync(address: string): string | null {
    return this.reverseRegistry.get(address.toLowerCase()) || null;
  }
}