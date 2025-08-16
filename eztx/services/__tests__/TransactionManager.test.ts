import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TransactionManager, RetryConfig, StatusUpdateCallback } from '../TransactionManager';
import { TransactionStatus } from '../../types';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('TransactionManager', () => {
  let transactionManager: TransactionManager;

  beforeEach(() => {
    // Reset localStorage mock
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();

    transactionManager = new TransactionManager();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initializeTransaction', () => {
    it('should create a new transaction state with default status', () => {
      const txId = 'test-tx-1';
      const state = transactionManager.initializeTransaction(txId);

      expect(state.id).toBe(txId);
      expect(state.currentStatus).toBe(TransactionStatus.INITIATED);
      expect(state.transitions).toHaveLength(1);
      expect(state.retryCount).toBe(0);
      expect(state.metadata).toEqual({});
    });

    it('should create a new transaction state with custom initial status', () => {
      const txId = 'test-tx-2';
      const state = transactionManager.initializeTransaction(txId, TransactionStatus.PENDING);

      expect(state.currentStatus).toBe(TransactionStatus.PENDING);
      expect(state.transitions[0].to).toBe(TransactionStatus.PENDING);
    });

    it('should save state to localStorage', () => {
      const txId = 'test-tx-3';
      transactionManager.initializeTransaction(txId);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'eztx_transaction_states',
        expect.stringContaining(txId)
      );
    });
  });

  describe('transitionTo', () => {
    it('should successfully transition to valid next status', () => {
      const txId = 'test-tx-1';
      transactionManager.initializeTransaction(txId);

      const success = transactionManager.transitionTo(txId, TransactionStatus.PENDING, 'Starting payment');

      expect(success).toBe(true);
      expect(transactionManager.getCurrentStatus(txId)).toBe(TransactionStatus.PENDING);
    });

    it('should reject invalid transitions', () => {
      const txId = 'test-tx-1';
      transactionManager.initializeTransaction(txId);

      // Try to go directly from INITIATED to COMPLETED (invalid)
      const success = transactionManager.transitionTo(txId, TransactionStatus.COMPLETED);

      expect(success).toBe(false);
      expect(transactionManager.getCurrentStatus(txId)).toBe(TransactionStatus.INITIATED);
    });

    it('should throw error for non-existent transaction', () => {
      expect(() => {
        transactionManager.transitionTo('non-existent', TransactionStatus.PENDING);
      }).toThrow('Transaction state not found: non-existent');
    });

    it('should record transition history', () => {
      const txId = 'test-tx-1';
      transactionManager.initializeTransaction(txId);
      transactionManager.transitionTo(txId, TransactionStatus.PENDING);
      transactionManager.transitionTo(txId, TransactionStatus.ON_RAMPING);

      const history = transactionManager.getTransactionHistory(txId);
      expect(history).toHaveLength(3); // Initial + 2 transitions
      expect(history[1].from).toBe(TransactionStatus.INITIATED);
      expect(history[1].to).toBe(TransactionStatus.PENDING);
      expect(history[2].from).toBe(TransactionStatus.PENDING);
      expect(history[2].to).toBe(TransactionStatus.ON_RAMPING);
    });

    it('should update previous status correctly', () => {
      const txId = 'test-tx-1';
      transactionManager.initializeTransaction(txId);
      transactionManager.transitionTo(txId, TransactionStatus.PENDING);

      const state = transactionManager.getTransactionState(txId);
      expect(state?.previousStatus).toBe(TransactionStatus.INITIATED);
      expect(state?.currentStatus).toBe(TransactionStatus.PENDING);
    });
  });

  describe('markAsFailed', () => {
    it('should mark transaction as failed with error details', () => {
      const txId = 'test-tx-1';
      transactionManager.initializeTransaction(txId);
      transactionManager.transitionTo(txId, TransactionStatus.PENDING);

      const errorMessage = 'Network timeout';
      transactionManager.markAsFailed(txId, errorMessage, 'Connection lost');

      const state = transactionManager.getTransactionState(txId);
      expect(state?.currentStatus).toBe(TransactionStatus.FAILED);
      expect(state?.lastError).toBe(errorMessage);
      
      const history = transactionManager.getTransactionHistory(txId);
      const lastTransition = history[history.length - 1];
      expect(lastTransition.to).toBe(TransactionStatus.FAILED);
      expect(lastTransition.error).toBe(errorMessage);
      expect(lastTransition.reason).toBe('Connection lost');
    });

    it('should throw error for non-existent transaction', () => {
      expect(() => {
        transactionManager.markAsFailed('non-existent', 'Some error');
      }).toThrow('Transaction state not found: non-existent');
    });
  });

  describe('getTransactionState', () => {
    it('should return transaction state for existing transaction', () => {
      const txId = 'test-tx-1';
      const initialState = transactionManager.initializeTransaction(txId);

      const retrievedState = transactionManager.getTransactionState(txId);
      expect(retrievedState).toEqual(initialState);
    });

    it('should return null for non-existent transaction', () => {
      const state = transactionManager.getTransactionState('non-existent');
      expect(state).toBeNull();
    });
  });

  describe('getCurrentStatus', () => {
    it('should return current status for existing transaction', () => {
      const txId = 'test-tx-1';
      transactionManager.initializeTransaction(txId);
      transactionManager.transitionTo(txId, TransactionStatus.PENDING);

      const status = transactionManager.getCurrentStatus(txId);
      expect(status).toBe(TransactionStatus.PENDING);
    });

    it('should return null for non-existent transaction', () => {
      const status = transactionManager.getCurrentStatus('non-existent');
      expect(status).toBeNull();
    });
  });

  describe('retry functionality', () => {
    it('should allow retry for failed transactions within retry limit', () => {
      const txId = 'test-tx-1';
      transactionManager.initializeTransaction(txId);
      transactionManager.markAsFailed(txId, 'Network error');

      expect(transactionManager.canRetry(txId)).toBe(true);
    });

    it('should not allow retry when retry limit exceeded', () => {
      const txId = 'test-tx-1';
      const config: Partial<RetryConfig> = { maxRetries: 1 };
      const manager = new TransactionManager(config);
      
      manager.initializeTransaction(txId);
      manager.markAsFailed(txId, 'Error 1');
      
      // First retry should be allowed
      expect(manager.canRetry(txId)).toBe(true);
      
      // Simulate retry
      const state = manager.getTransactionState(txId)!;
      state.retryCount = 1;
      
      // Second retry should not be allowed
      expect(manager.canRetry(txId)).toBe(false);
    });

    it('should not allow retry for non-retryable statuses', () => {
      const txId = 'test-tx-1';
      transactionManager.initializeTransaction(txId);
      // Follow proper state machine flow to COMPLETED
      transactionManager.transitionTo(txId, TransactionStatus.PENDING);
      transactionManager.transitionTo(txId, TransactionStatus.ON_RAMPING);
      transactionManager.transitionTo(txId, TransactionStatus.CONVERTING);
      transactionManager.transitionTo(txId, TransactionStatus.TRANSFERRING);
      transactionManager.transitionTo(txId, TransactionStatus.OFF_RAMPING);
      transactionManager.transitionTo(txId, TransactionStatus.COMPLETED);

      expect(transactionManager.canRetry(txId)).toBe(false);
    });

    it('should successfully retry a failed transaction', async () => {
      const txId = 'test-tx-1';
      const config: Partial<RetryConfig> = { retryDelayMs: 10 }; // Short delay for testing
      const manager = new TransactionManager(config);
      
      manager.initializeTransaction(txId);
      manager.markAsFailed(txId, 'Network error');

      const success = await manager.retryTransaction(txId, 'Retrying after network recovery');

      expect(success).toBe(true);
      expect(manager.getCurrentStatus(txId)).toBe(TransactionStatus.PENDING);
      
      const state = manager.getTransactionState(txId);
      expect(state?.retryCount).toBe(1);
    });

    it('should not retry when not allowed', async () => {
      const txId = 'test-tx-1';
      transactionManager.initializeTransaction(txId);
      // Follow proper state machine flow to COMPLETED
      transactionManager.transitionTo(txId, TransactionStatus.PENDING);
      transactionManager.transitionTo(txId, TransactionStatus.ON_RAMPING);
      transactionManager.transitionTo(txId, TransactionStatus.CONVERTING);
      transactionManager.transitionTo(txId, TransactionStatus.TRANSFERRING);
      transactionManager.transitionTo(txId, TransactionStatus.OFF_RAMPING);
      transactionManager.transitionTo(txId, TransactionStatus.COMPLETED);

      const success = await transactionManager.retryTransaction(txId);
      expect(success).toBe(false);
    });
  });

  describe('metadata management', () => {
    it('should set and get metadata', () => {
      const txId = 'test-tx-1';
      transactionManager.initializeTransaction(txId);

      transactionManager.setMetadata(txId, 'fernOnRampId', 'fern-123');
      transactionManager.setMetadata(txId, 'amount', 100);

      expect(transactionManager.getMetadata(txId, 'fernOnRampId')).toBe('fern-123');
      expect(transactionManager.getMetadata(txId, 'amount')).toBe(100);
      
      const allMetadata = transactionManager.getMetadata(txId);
      expect(allMetadata).toEqual({
        fernOnRampId: 'fern-123',
        amount: 100
      });
    });

    it('should throw error when setting metadata for non-existent transaction', () => {
      expect(() => {
        transactionManager.setMetadata('non-existent', 'key', 'value');
      }).toThrow('Transaction state not found: non-existent');
    });

    it('should return null for metadata of non-existent transaction', () => {
      const metadata = transactionManager.getMetadata('non-existent');
      expect(metadata).toBeNull();
    });
  });

  describe('status change callbacks', () => {
    it('should notify callbacks on status change', () => {
      const callback = vi.fn();
      transactionManager.onStatusChange(callback);

      const txId = 'test-tx-1';
      transactionManager.initializeTransaction(txId);
      transactionManager.transitionTo(txId, TransactionStatus.PENDING);

      expect(callback).toHaveBeenCalledWith(
        txId,
        TransactionStatus.INITIATED,
        TransactionStatus.PENDING
      );
    });

    it('should handle callback errors gracefully', () => {
      const errorCallback = vi.fn().mockImplementation(() => {
        throw new Error('Callback error');
      });
      const goodCallback = vi.fn();

      transactionManager.onStatusChange(errorCallback);
      transactionManager.onStatusChange(goodCallback);

      const txId = 'test-tx-1';
      transactionManager.initializeTransaction(txId);
      
      // Should not throw despite callback error
      expect(() => {
        transactionManager.transitionTo(txId, TransactionStatus.PENDING);
      }).not.toThrow();

      expect(goodCallback).toHaveBeenCalled();
    });

    it('should remove callbacks', () => {
      const callback = vi.fn();
      transactionManager.onStatusChange(callback);
      transactionManager.removeStatusChangeCallback(callback);

      const txId = 'test-tx-1';
      transactionManager.initializeTransaction(txId);
      transactionManager.transitionTo(txId, TransactionStatus.PENDING);

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('getTransactionsByStatus', () => {
    it('should return transactions with specific status', () => {
      const tx1 = 'test-tx-1';
      const tx2 = 'test-tx-2';
      const tx3 = 'test-tx-3';

      transactionManager.initializeTransaction(tx1);
      transactionManager.initializeTransaction(tx2);
      transactionManager.initializeTransaction(tx3);

      transactionManager.transitionTo(tx1, TransactionStatus.PENDING);
      transactionManager.transitionTo(tx2, TransactionStatus.PENDING);
      transactionManager.markAsFailed(tx3, 'Error');

      const pendingTransactions = transactionManager.getTransactionsByStatus(TransactionStatus.PENDING);
      const failedTransactions = transactionManager.getTransactionsByStatus(TransactionStatus.FAILED);

      expect(pendingTransactions).toHaveLength(2);
      expect(failedTransactions).toHaveLength(1);
      expect(pendingTransactions.map(t => t.id)).toContain(tx1);
      expect(pendingTransactions.map(t => t.id)).toContain(tx2);
      expect(failedTransactions[0].id).toBe(tx3);
    });
  });

  describe('getProblematicTransactions', () => {
    it('should identify failed transactions as problematic', () => {
      const txId = 'test-tx-1';
      transactionManager.initializeTransaction(txId);
      transactionManager.markAsFailed(txId, 'Network error');

      const problematic = transactionManager.getProblematicTransactions();
      expect(problematic).toHaveLength(1);
      expect(problematic[0].id).toBe(txId);
    });

    it('should identify stuck transactions as problematic', () => {
      const txId = 'test-tx-1';
      transactionManager.initializeTransaction(txId);
      transactionManager.transitionTo(txId, TransactionStatus.PENDING);

      // Mock old timestamp to simulate stuck transaction
      const state = transactionManager.getTransactionState(txId)!;
      const oldTimestamp = new Date(Date.now() - 35 * 60 * 1000); // 35 minutes ago
      state.transitions[state.transitions.length - 1].timestamp = oldTimestamp;

      const problematic = transactionManager.getProblematicTransactions();
      expect(problematic).toHaveLength(1);
      expect(problematic[0].id).toBe(txId);
    });
  });

  describe('cleanupOldTransactions', () => {
    it('should remove old completed transactions', () => {
      const txId = 'test-tx-1';
      transactionManager.initializeTransaction(txId);
      transactionManager.transitionTo(txId, TransactionStatus.PENDING);
      transactionManager.transitionTo(txId, TransactionStatus.ON_RAMPING);
      transactionManager.transitionTo(txId, TransactionStatus.CONVERTING);
      transactionManager.transitionTo(txId, TransactionStatus.TRANSFERRING);
      transactionManager.transitionTo(txId, TransactionStatus.OFF_RAMPING);
      transactionManager.transitionTo(txId, TransactionStatus.COMPLETED);

      // Mock old timestamp
      const state = transactionManager.getTransactionState(txId)!;
      const oldTimestamp = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000); // 8 days ago
      state.transitions[state.transitions.length - 1].timestamp = oldTimestamp;

      const cleanedCount = transactionManager.cleanupOldTransactions();
      expect(cleanedCount).toBe(1);
      expect(transactionManager.getTransactionState(txId)).toBeNull();
    });

    it('should not remove recent completed transactions', () => {
      const txId = 'test-tx-1';
      transactionManager.initializeTransaction(txId);
      // Follow proper state machine flow to COMPLETED
      transactionManager.transitionTo(txId, TransactionStatus.PENDING);
      transactionManager.transitionTo(txId, TransactionStatus.ON_RAMPING);
      transactionManager.transitionTo(txId, TransactionStatus.CONVERTING);
      transactionManager.transitionTo(txId, TransactionStatus.TRANSFERRING);
      transactionManager.transitionTo(txId, TransactionStatus.OFF_RAMPING);
      transactionManager.transitionTo(txId, TransactionStatus.COMPLETED);

      const cleanedCount = transactionManager.cleanupOldTransactions();
      expect(cleanedCount).toBe(0);
      expect(transactionManager.getTransactionState(txId)).not.toBeNull();
    });

    it('should not remove non-completed transactions regardless of age', () => {
      const txId = 'test-tx-1';
      transactionManager.initializeTransaction(txId);
      transactionManager.markAsFailed(txId, 'Error');

      // Mock old timestamp
      const state = transactionManager.getTransactionState(txId)!;
      const oldTimestamp = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000); // 8 days ago
      state.transitions[state.transitions.length - 1].timestamp = oldTimestamp;

      const cleanedCount = transactionManager.cleanupOldTransactions();
      expect(cleanedCount).toBe(0);
      expect(transactionManager.getTransactionState(txId)).not.toBeNull();
    });
  });

  describe('getStatistics', () => {
    it('should return correct statistics', () => {
      const tx1 = 'test-tx-1';
      const tx2 = 'test-tx-2';
      const tx3 = 'test-tx-3';

      transactionManager.initializeTransaction(tx1);
      transactionManager.initializeTransaction(tx2);
      transactionManager.initializeTransaction(tx3);

      // Follow proper state machine flow to COMPLETED
      transactionManager.transitionTo(tx1, TransactionStatus.PENDING);
      transactionManager.transitionTo(tx1, TransactionStatus.ON_RAMPING);
      transactionManager.transitionTo(tx1, TransactionStatus.CONVERTING);
      transactionManager.transitionTo(tx1, TransactionStatus.TRANSFERRING);
      transactionManager.transitionTo(tx1, TransactionStatus.OFF_RAMPING);
      transactionManager.transitionTo(tx1, TransactionStatus.COMPLETED);
      transactionManager.markAsFailed(tx2, 'Error');
      // tx3 stays in INITIATED

      const stats = transactionManager.getStatistics();

      expect(stats.total).toBe(3);
      expect(stats[TransactionStatus.INITIATED]).toBe(1);
      expect(stats[TransactionStatus.COMPLETED]).toBe(1);
      expect(stats[TransactionStatus.FAILED]).toBe(1);
      expect(stats.problematic).toBe(1); // Only failed transaction
      expect(stats.retryable).toBe(1); // Only failed transaction can be retried
    });
  });

  describe('localStorage integration', () => {
    it('should load states from localStorage on initialization', () => {
      const mockStates = [{
        id: 'existing-tx',
        currentStatus: TransactionStatus.PENDING,
        transitions: [{
          from: TransactionStatus.INITIATED,
          to: TransactionStatus.PENDING,
          timestamp: new Date().toISOString(),
          reason: 'Loaded from storage'
        }],
        retryCount: 0,
        maxRetries: 3,
        metadata: { test: 'value' }
      }];

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockStates));

      const manager = new TransactionManager();
      const state = manager.getTransactionState('existing-tx');

      expect(state).not.toBeNull();
      expect(state?.currentStatus).toBe(TransactionStatus.PENDING);
      expect(state?.metadata.test).toBe('value');
    });

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });

      // Should not throw
      expect(() => new TransactionManager()).not.toThrow();
    });
  });

  describe('clearAllStates', () => {
    it('should clear all states and localStorage', () => {
      const txId = 'test-tx-1';
      transactionManager.initializeTransaction(txId);

      expect(transactionManager.getTransactionState(txId)).not.toBeNull();

      transactionManager.clearAllStates();

      expect(transactionManager.getTransactionState(txId)).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('eztx_transaction_states');
    });
  });
});