// Application constants

export const APP_NAME = 'EzTx';
export const APP_VERSION = '1.0.0';

// Transaction status display names
export const TRANSACTION_STATUS_LABELS = {
  pending: 'Pending',
  on_ramping: 'Converting to PYUSD',
  converting: 'Processing',
  transferring: 'Sending Payment',
  off_ramping: 'Converting to Fiat',
  completed: 'Completed',
  failed: 'Failed',
} as const;

// Fee types
export const FEE_TYPES = {
  ON_RAMP: 'on_ramp',
  BLOCKCHAIN: 'blockchain',
  OFF_RAMP: 'off_ramp',
} as const;

// Animation durations (in milliseconds)
export const ANIMATION_DURATIONS = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
} as const;

// API endpoints (for mock services)
export const API_ENDPOINTS = {
  FERN_ON_RAMP: '/api/fern/on-ramp',
  FERN_OFF_RAMP: '/api/fern/off-ramp',
  ENS_RESOLVE: '/api/ens/resolve',
  TRANSACTION_STATUS: '/api/transaction/status',
} as const;

// Local storage keys
export const STORAGE_KEYS = {
  TRANSACTIONS: 'eztx_transactions',
  USER_PREFERENCES: 'eztx_preferences',
  CACHED_ENS: 'eztx_cached_ens',
} as const;

// Default values
export const DEFAULTS = {
  CURRENCY: 'USD',
  MIN_PAYMENT_AMOUNT: 1,
  MAX_PAYMENT_AMOUNT: 10000,
  DEFAULT_GAS_LIMIT: 21000,
  DEFAULT_GAS_PRICE_GWEI: 20,
} as const;