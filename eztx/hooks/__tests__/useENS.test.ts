import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useENS, useENSValidation } from '../useENS';

// Mock the ENS service factory
vi.mock('../../services/ENSServiceFactory', () => ({
  createENSServiceFactory: () => ({
    getENSResolver: () => ({
      resolveENS: vi.fn().mockImplementation(async (ensName: string) => {
        if (ensName === 'test.eth') {
          return '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
        }
        if (ensName === 'invalid.eth') {
          throw new Error('ENS name not found');
        }
        return null;
      }),
      reverseResolve: vi.fn().mockImplementation(async (address: string) => {
        if (address === '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6') {
          return 'test.eth';
        }
        return null;
      }),
      validateENSName: vi.fn().mockImplementation((ensName: string) => {
        return /^[a-zA-Z0-9-]+\.eth$/.test(ensName) && ensName.length >= 7;
      })
    })
  })
}));

describe('useENS', () => {
  it('should resolve ENS name successfully', async () => {
    const { result } = renderHook(() => useENS());
    
    expect(result.current.resolvedAddress).toBeNull();
    expect(result.current.isResolving).toBe(false);
    
    await act(async () => {
      await result.current.resolveENS('test.eth');
    });
    
    expect(result.current.resolvedAddress).toBe('0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6');
    expect(result.current.resolvedENS).toBe('test.eth');
    expect(result.current.error).toBeNull();
  });

  it('should handle ENS resolution errors', async () => {
    const { result } = renderHook(() => useENS());
    
    await act(async () => {
      await result.current.resolveENS('invalid.eth');
    });
    
    expect(result.current.resolvedAddress).toBeNull();
    expect(result.current.resolvedENS).toBeNull();
    expect(result.current.error).toBe('Failed to resolve ENS name');
  });

  it('should reverse resolve address successfully', async () => {
    const { result } = renderHook(() => useENS());
    
    await act(async () => {
      await result.current.reverseResolve('0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6');
    });
    
    expect(result.current.resolvedENS).toBe('test.eth');
    expect(result.current.resolvedAddress).toBe('0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6');
    expect(result.current.error).toBeNull();
  });

  it('should clear results', async () => {
    const { result } = renderHook(() => useENS());
    
    await act(async () => {
      await result.current.resolveENS('test.eth');
    });
    
    expect(result.current.resolvedAddress).toBe('0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6');
    
    act(() => {
      result.current.clearResults();
    });
    
    expect(result.current.resolvedAddress).toBeNull();
    expect(result.current.resolvedENS).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should handle empty input', async () => {
    const { result } = renderHook(() => useENS());
    
    await act(async () => {
      await result.current.resolveENS('');
    });
    
    expect(result.current.resolvedAddress).toBeNull();
    expect(result.current.resolvedENS).toBeNull();
    expect(result.current.error).toBeNull();
  });
});

describe('useENSValidation', () => {
  it('should validate ENS names correctly', () => {
    const { result } = renderHook(() => useENSValidation());
    
    expect(result.current.validateENSName('test.eth')).toBe(true);
    expect(result.current.validateENSName('invalid')).toBe(false);
    expect(result.current.validateENSName('a.eth')).toBe(false); // Too short
    expect(result.current.validateENSName('valid-name.eth')).toBe(true);
  });
});