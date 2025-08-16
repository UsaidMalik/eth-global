import { ethers } from 'ethers';
import { PYUSD_DECIMALS } from '../types';

/**
 * Utility functions for blockchain operations
 */

/**
 * Format PYUSD amount from wei to human readable format
 */
export function formatPYUSD(amount: bigint, decimals = 2): string {
  const formatted = ethers.formatUnits(amount, PYUSD_DECIMALS);
  return parseFloat(formatted).toFixed(decimals);
}

/**
 * Parse PYUSD amount from human readable format to wei
 */
export function parsePYUSD(amount: string): bigint {
  return ethers.parseUnits(amount, PYUSD_DECIMALS);
}

/**
 * Format ETH amount from wei to human readable format
 */
export function formatETH(amount: bigint, decimals = 4): string {
  const formatted = ethers.formatEther(amount);
  return parseFloat(formatted).toFixed(decimals);
}

/**
 * Parse ETH amount from human readable format to wei
 */
export function parseETH(amount: string): bigint {
  return ethers.parseEther(amount);
}

/**
 * Format gas price from wei to gwei
 */
export function formatGwei(gasPrice: bigint, decimals = 2): string {
  const gwei = ethers.formatUnits(gasPrice, 'gwei');
  return parseFloat(gwei).toFixed(decimals);
}

/**
 * Parse gas price from gwei to wei
 */
export function parseGwei(gasPrice: string): bigint {
  return ethers.parseUnits(gasPrice, 'gwei');
}

/**
 * Validate Ethereum address format
 */
export function isValidAddress(address: string): boolean {
  try {
    return ethers.isAddress(address);
  } catch {
    return false;
  }
}

/**
 * Normalize Ethereum address to checksum format
 */
export function normalizeAddress(address: string): string {
  if (!isValidAddress(address)) {
    throw new Error('Invalid Ethereum address');
  }
  return ethers.getAddress(address);
}

/**
 * Shorten address for display (0x1234...5678)
 */
export function shortenAddress(address: string, startLength = 6, endLength = 4): string {
  if (!isValidAddress(address)) {
    return address;
  }
  
  if (address.length <= startLength + endLength) {
    return address;
  }
  
  return `${address.slice(0, startLength)}...${address.slice(-endLength)}`;
}

/**
 * Calculate percentage of amount
 */
export function calculatePercentage(amount: bigint, percentage: number): bigint {
  return (amount * BigInt(Math.floor(percentage * 100))) / BigInt(10000);
}

/**
 * Convert basis points to percentage
 */
export function basisPointsToPercentage(basisPoints: number): number {
  return basisPoints / 100;
}

/**
 * Convert percentage to basis points
 */
export function percentageToBasisPoints(percentage: number): number {
  return Math.floor(percentage * 100);
}

/**
 * Format transaction hash for display
 */
export function formatTxHash(hash: string, length = 10): string {
  if (hash.length <= length) {
    return hash;
  }
  return `${hash.slice(0, length)}...`;
}

/**
 * Get block explorer URL for transaction
 */
export function getBlockExplorerUrl(chainId: number, txHash: string): string {
  const explorers: Record<number, string> = {
    1: 'https://etherscan.io/tx/',
    11155111: 'https://sepolia.etherscan.io/tx/',
    31337: '', // Local network has no explorer
  };
  
  const baseUrl = explorers[chainId];
  return baseUrl ? `${baseUrl}${txHash}` : '';
}

/**
 * Get block explorer URL for address
 */
export function getAddressExplorerUrl(chainId: number, address: string): string {
  const explorers: Record<number, string> = {
    1: 'https://etherscan.io/address/',
    11155111: 'https://sepolia.etherscan.io/address/',
    31337: '', // Local network has no explorer
  };
  
  const baseUrl = explorers[chainId];
  return baseUrl ? `${baseUrl}${address}` : '';
}

/**
 * Estimate transaction time based on gas price
 */
export function estimateTransactionTime(gasPrice: bigint): number {
  // Convert to gwei for comparison
  const gasPriceGwei = Number(ethers.formatUnits(gasPrice, 'gwei'));
  
  // Rough estimates based on gas price (in minutes)
  if (gasPriceGwei >= 50) return 1; // Fast
  if (gasPriceGwei >= 20) return 3; // Standard
  if (gasPriceGwei >= 10) return 5; // Slow
  return 10; // Very slow
}

/**
 * Check if transaction is likely to be mined quickly
 */
export function isHighPriorityGasPrice(gasPrice: bigint, networkGasPrice: bigint): boolean {
  // Consider high priority if 20% above network average
  const threshold = (networkGasPrice * BigInt(120)) / BigInt(100);
  return gasPrice >= threshold;
}

/**
 * Format time duration in human readable format
 */
export function formatDuration(minutes: number): string {
  if (minutes < 1) return 'Less than 1 minute';
  if (minutes === 1) return '1 minute';
  if (minutes < 60) return `${Math.round(minutes)} minutes`;
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);
  
  if (hours === 1 && remainingMinutes === 0) return '1 hour';
  if (remainingMinutes === 0) return `${hours} hours`;
  if (hours === 1) return `1 hour ${remainingMinutes} minutes`;
  
  return `${hours} hours ${remainingMinutes} minutes`;
}

/**
 * Convert timestamp to human readable date
 */
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleString();
}

/**
 * Get relative time (e.g., "2 minutes ago")
 */
export function getRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - (timestamp * 1000);
  const minutes = Math.floor(diff / 60000);
  
  if (minutes < 1) return 'Just now';
  if (minutes === 1) return '1 minute ago';
  if (minutes < 60) return `${minutes} minutes ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours === 1) return '1 hour ago';
  if (hours < 24) return `${hours} hours ago`;
  
  const days = Math.floor(hours / 24);
  if (days === 1) return '1 day ago';
  if (days < 7) return `${days} days ago`;
  
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return '1 week ago';
  if (weeks < 4) return `${weeks} weeks ago`;
  
  const months = Math.floor(days / 30);
  if (months === 1) return '1 month ago';
  
  return `${months} months ago`;
}

/**
 * Retry async operation with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

/**
 * Debounce function for rate limiting
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function for rate limiting
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}