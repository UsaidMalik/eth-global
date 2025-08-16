import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ENSServiceFactory } from '../ENSServiceFactory';
import { SepoliaENSResolver } from '../SepoliaENSResolver';
import { MockENSResolver } from '../mock/MockENSResolver';

describe('ENSServiceFactory', () => {
  afterEach(() => {
    // Reset singleton instance
    (ENSServiceFactory as any).instance = null;
  });

  it('should create mock ENS resolver when configured', () => {
    const factory = ENSServiceFactory.initialize({
      useMockServices: true
    });
    
    const resolver = factory.getENSResolver();
    expect(resolver).toBeInstanceOf(MockENSResolver);
    expect(factory.isUsingMockServices()).toBe(true);
  });

  it('should create real ENS resolver when configured', () => {
    const factory = ENSServiceFactory.initialize({
      useMockServices: false,
      rpcUrl: 'https://sepolia.infura.io/v3/test-key'
    });
    
    const resolver = factory.getENSResolver();
    expect(resolver).toBeInstanceOf(SepoliaENSResolver);
    expect(factory.isUsingMockServices()).toBe(false);
  });

  it('should update configuration', () => {
    const factory = ENSServiceFactory.initialize({
      useMockServices: true
    });
    
    expect(factory.isUsingMockServices()).toBe(true);
    
    factory.updateConfig({
      useMockServices: false,
      rpcUrl: 'https://sepolia.infura.io/v3/test-key'
    });
    
    expect(factory.isUsingMockServices()).toBe(false);
  });

  it('should throw error when not initialized', () => {
    expect(() => {
      ENSServiceFactory.getInstance();
    }).toThrow('ENSServiceFactory must be initialized with config');
  });

  it('should return same instance when called multiple times', () => {
    const factory1 = ENSServiceFactory.initialize({
      useMockServices: true
    });
    
    const factory2 = ENSServiceFactory.getInstance();
    
    expect(factory1).toBe(factory2);
  });
});