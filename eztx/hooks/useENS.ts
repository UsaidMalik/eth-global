import { useState, useEffect, useCallback } from 'react';
import { ENSResolver } from '../services/SepoliaENSResolver';
import { createENSServiceFactory } from '../services/ENSServiceFactory';
import { ENSError } from '../types/errors';

interface UseENSResult {
  resolvedAddress: string | null;
  resolvedENS: string | null;
  isResolving: boolean;
  error: string | null;
  resolveENS: (ensName: string) => Promise<void>;
  reverseResolve: (address: string) => Promise<void>;
  clearResults: () => void;
}

export function useENS(): UseENSResult {
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [resolvedENS, setResolvedENS] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ensResolver] = useState<ENSResolver>(() => {
    const factory = createENSServiceFactory();
    return factory.getENSResolver();
  });

  const clearResults = useCallback(() => {
    setResolvedAddress(null);
    setResolvedENS(null);
    setError(null);
  }, []);

  const resolveENS = useCallback(async (ensName: string) => {
    if (!ensName.trim()) {
      clearResults();
      return;
    }

    setIsResolving(true);
    setError(null);

    try {
      const address = await ensResolver.resolveENS(ensName);
      setResolvedAddress(address);
      setResolvedENS(address ? ensName : null);
    } catch (err) {
      if (err instanceof ENSError) {
        setError(err.message);
      } else {
        setError('Failed to resolve ENS name');
      }
      setResolvedAddress(null);
      setResolvedENS(null);
    } finally {
      setIsResolving(false);
    }
  }, [ensResolver, clearResults]);

  const reverseResolve = useCallback(async (address: string) => {
    if (!address.trim()) {
      clearResults();
      return;
    }

    setIsResolving(true);
    setError(null);

    try {
      const ensName = await ensResolver.reverseResolve(address);
      setResolvedENS(ensName);
      setResolvedAddress(address);
    } catch (err) {
      if (err instanceof ENSError) {
        setError(err.message);
      } else {
        setError('Failed to reverse resolve address');
      }
      setResolvedENS(null);
      setResolvedAddress(null);
    } finally {
      setIsResolving(false);
    }
  }, [ensResolver, clearResults]);

  return {
    resolvedAddress,
    resolvedENS,
    isResolving,
    error,
    resolveENS,
    reverseResolve,
    clearResults,
  };
}

// Hook for validating ENS names
export function useENSValidation() {
  const [ensResolver] = useState<ENSResolver>(() => {
    const factory = createENSServiceFactory();
    return factory.getENSResolver();
  });

  const validateENSName = useCallback((ensName: string): boolean => {
    return ensResolver.validateENSName(ensName);
  }, [ensResolver]);

  return { validateENSName };
}