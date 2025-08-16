import { TransactionStatus, Transaction, StoredTransaction } from '../types';

export interface StateTransition {
  from: TransactionStatus;
  to: TransactionStatus;
  timestamp: Date;
  reason?: string;
  error?: string;
}

export interface TransactionState {
  id: string;
  currentStatus: TransactionStatus;
  previousStatus?: TransactionStatus;
  transitions: StateTransition[];
  retryCount: number;
  maxRetries: number;
  lastError?: string;
  metadata: Record<string, any>;
}

export interface RetryConfig {
  maxRetries: number;
  retryableStatuses: TransactionStatus[];
  retryDelayMs: number;
  backoffMultiplier: number;
}

export interface StatusUpdateCallback {
  (transactionId: string, oldStatus: TransactionStatus, newStatus: TransactionStatus): void;
}

export class TransactionManager {
  private states = new Map<string, TransactionState>();
  private statusCallbacks: StatusUpdateCallback[] = [];
  private retryConfig: RetryConfig;
  private storageKey = 'eztx_transaction_states';

  constructor(retryConfig?: Partial<RetryConfig>) {
    this.retryConfig = {
      maxRetries: 3,
      retryableStatuses: [
        TransactionStatus.FAILED,
        TransactionStatus.PENDING
      ],
      retryDelayMs: 5000, // 5 seconds
      backoffMultiplier: 2,
      ...retryConfig
    };

    // Load existing states from localStorage
    this.loadStatesFromStorage();
  }

  /**
   * Initialize a new transaction state
   */
  initializeTransaction(transactionId: string, initialStatus: TransactionStatus = TransactionStatus.INITIATED): TransactionState {
    const state: TransactionState = {
      id: transactionId,
      currentStatus: initialStatus,
      transitions: [{
        from: TransactionStatus.INITIATED,
        to: initialStatus,
        timestamp: new Date(),
        reason: 'Transaction initialized'
      }],
      retryCount: 0,
      maxRetries: this.retryConfig.maxRetries,
      metadata: {}
    };

    this.states.set(transactionId, state);
    this.saveStatesToStorage();
    return state;
  }

  /**
   * Transition transaction to a new status
   */
  transitionTo(transactionId: string, newStatus: TransactionStatus, reason?: string): boolean {
    const state = this.states.get(transactionId);
    if (!state) {
      throw new Error(`Transaction state not found: ${transactionId}`);
    }

    // Validate transition
    if (!this.isValidTransition(state.currentStatus, newStatus)) {
      console.warn(`Invalid transition from ${state.currentStatus} to ${newStatus} for transaction ${transactionId}`);
      return false;
    }

    const oldStatus = state.currentStatus;
    
    // Update state
    state.previousStatus = state.currentStatus;
    state.currentStatus = newStatus;
    
    // Record transition
    const transition: StateTransition = {
      from: oldStatus,
      to: newStatus,
      timestamp: new Date(),
      reason
    };
    state.transitions.push(transition);

    // Save to storage
    this.saveStatesToStorage();

    // Notify callbacks
    this.notifyStatusChange(transactionId, oldStatus, newStatus);

    return true;
  }

  /**
   * Mark transaction as failed with error details
   */
  markAsFailed(transactionId: string, error: string, reason?: string): void {
    const state = this.states.get(transactionId);
    if (!state) {
      throw new Error(`Transaction state not found: ${transactionId}`);
    }

    state.lastError = error;
    
    const transition: StateTransition = {
      from: state.currentStatus,
      to: TransactionStatus.FAILED,
      timestamp: new Date(),
      reason: reason || 'Transaction failed',
      error
    };

    state.previousStatus = state.currentStatus;
    state.currentStatus = TransactionStatus.FAILED;
    state.transitions.push(transition);

    this.saveStatesToStorage();
    this.notifyStatusChange(transactionId, state.previousStatus!, TransactionStatus.FAILED);
  }

  /**
   * Get current transaction state
   */
  getTransactionState(transactionId: string): TransactionState | null {
    return this.states.get(transactionId) || null;
  }

  /**
   * Get current status of a transaction
   */
  getCurrentStatus(transactionId: string): TransactionStatus | null {
    const state = this.states.get(transactionId);
    return state ? state.currentStatus : null;
  }

  /**
   * Get transaction history/transitions
   */
  getTransactionHistory(transactionId: string): StateTransition[] {
    const state = this.states.get(transactionId);
    return state ? [...state.transitions] : [];
  }

  /**
   * Check if transaction can be retried
   */
  canRetry(transactionId: string): boolean {
    const state = this.states.get(transactionId);
    if (!state) return false;

    return (
      this.retryConfig.retryableStatuses.includes(state.currentStatus) &&
      state.retryCount < state.maxRetries
    );
  }

  /**
   * Attempt to retry a failed transaction
   */
  async retryTransaction(transactionId: string, retryReason?: string): Promise<boolean> {
    const state = this.states.get(transactionId);
    if (!state) {
      throw new Error(`Transaction state not found: ${transactionId}`);
    }

    if (!this.canRetry(transactionId)) {
      return false;
    }

    // Increment retry count
    state.retryCount++;

    // Calculate retry delay with exponential backoff
    const delay = this.retryConfig.retryDelayMs * Math.pow(this.retryConfig.backoffMultiplier, state.retryCount - 1);

    // Wait for retry delay
    await this.delay(delay);

    // Reset to pending status for retry
    const success = this.transitionTo(
      transactionId, 
      TransactionStatus.PENDING, 
      retryReason || `Retry attempt ${state.retryCount}`
    );

    return success;
  }

  /**
   * Set metadata for a transaction
   */
  setMetadata(transactionId: string, key: string, value: any): void {
    const state = this.states.get(transactionId);
    if (!state) {
      throw new Error(`Transaction state not found: ${transactionId}`);
    }

    state.metadata[key] = value;
    this.saveStatesToStorage();
  }

  /**
   * Get metadata for a transaction
   */
  getMetadata(transactionId: string, key?: string): any {
    const state = this.states.get(transactionId);
    if (!state) return null;

    return key ? state.metadata[key] : { ...state.metadata };
  }

  /**
   * Register callback for status updates
   */
  onStatusChange(callback: StatusUpdateCallback): void {
    this.statusCallbacks.push(callback);
  }

  /**
   * Remove status change callback
   */
  removeStatusChangeCallback(callback: StatusUpdateCallback): void {
    const index = this.statusCallbacks.indexOf(callback);
    if (index > -1) {
      this.statusCallbacks.splice(index, 1);
    }
  }

  /**
   * Get all transactions in a specific status
   */
  getTransactionsByStatus(status: TransactionStatus): TransactionState[] {
    return Array.from(this.states.values()).filter(state => state.currentStatus === status);
  }

  /**
   * Get transactions that need attention (failed, stuck, etc.)
   */
  getProblematicTransactions(): TransactionState[] {
    const now = Date.now();
    const stuckThreshold = 30 * 60 * 1000; // 30 minutes

    return Array.from(this.states.values()).filter(state => {
      // Failed transactions
      if (state.currentStatus === TransactionStatus.FAILED) {
        return true;
      }

      // Stuck transactions (in processing state for too long)
      const lastTransition = state.transitions[state.transitions.length - 1];
      const timeSinceLastTransition = now - lastTransition.timestamp.getTime();
      
      const processingStatuses = [
        TransactionStatus.PENDING,
        TransactionStatus.ON_RAMPING,
        TransactionStatus.CONVERTING,
        TransactionStatus.TRANSFERRING,
        TransactionStatus.OFF_RAMPING
      ];

      return processingStatuses.includes(state.currentStatus) && timeSinceLastTransition > stuckThreshold;
    });
  }

  /**
   * Clean up old completed transactions
   */
  cleanupOldTransactions(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): number { // 7 days default
    const now = Date.now();
    let cleanedCount = 0;

    for (const [id, state] of this.states.entries()) {
      if (state.currentStatus === TransactionStatus.COMPLETED) {
        const lastTransition = state.transitions[state.transitions.length - 1];
        const age = now - lastTransition.timestamp.getTime();
        
        if (age > maxAgeMs) {
          this.states.delete(id);
          cleanedCount++;
        }
      }
    }

    if (cleanedCount > 0) {
      this.saveStatesToStorage();
    }

    return cleanedCount;
  }

  /**
   * Validate if a status transition is allowed
   */
  private isValidTransition(from: TransactionStatus, to: TransactionStatus): boolean {
    // Define valid transitions
    const validTransitions: Record<TransactionStatus, TransactionStatus[]> = {
      [TransactionStatus.INITIATED]: [
        TransactionStatus.PENDING,
        TransactionStatus.FAILED
      ],
      [TransactionStatus.PENDING]: [
        TransactionStatus.ON_RAMPING,
        TransactionStatus.FAILED
      ],
      [TransactionStatus.ON_RAMPING]: [
        TransactionStatus.CONVERTING,
        TransactionStatus.FAILED
      ],
      [TransactionStatus.CONVERTING]: [
        TransactionStatus.TRANSFERRING,
        TransactionStatus.FAILED
      ],
      [TransactionStatus.TRANSFERRING]: [
        TransactionStatus.OFF_RAMPING,
        TransactionStatus.FAILED
      ],
      [TransactionStatus.OFF_RAMPING]: [
        TransactionStatus.COMPLETED,
        TransactionStatus.FAILED
      ],
      [TransactionStatus.COMPLETED]: [], // Terminal state
      [TransactionStatus.FAILED]: [
        TransactionStatus.PENDING // Allow retry
      ]
    };

    const allowedTransitions = validTransitions[from] || [];
    return allowedTransitions.includes(to);
  }

  /**
   * Notify all registered callbacks of status change
   */
  private notifyStatusChange(transactionId: string, oldStatus: TransactionStatus, newStatus: TransactionStatus): void {
    this.statusCallbacks.forEach(callback => {
      try {
        callback(transactionId, oldStatus, newStatus);
      } catch (error) {
        console.error('Error in status change callback:', error);
      }
    });
  }

  /**
   * Save states to localStorage
   */
  private saveStatesToStorage(): void {
    try {
      const serializedStates = Array.from(this.states.entries()).map(([, state]) => ({
        ...state,
        transitions: state.transitions.map(t => ({
          ...t,
          timestamp: t.timestamp.toISOString()
        }))
      }));

      localStorage.setItem(this.storageKey, JSON.stringify(serializedStates));
    } catch (error) {
      console.error('Error saving transaction states to localStorage:', error);
    }
  }

  /**
   * Load states from localStorage
   */
  private loadStatesFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) return;

      const serializedStates = JSON.parse(stored);
      
      for (const serializedState of serializedStates) {
        const state: TransactionState = {
          ...serializedState,
          transitions: serializedState.transitions.map((t: any) => ({
            ...t,
            timestamp: new Date(t.timestamp)
          }))
        };
        
        this.states.set(state.id, state);
      }
    } catch (error) {
      console.error('Error loading transaction states from localStorage:', error);
    }
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clear all transaction states (for testing)
   */
  clearAllStates(): void {
    this.states.clear();
    localStorage.removeItem(this.storageKey);
  }

  /**
   * Get statistics about transaction states
   */
  getStatistics(): Record<string, number> {
    const stats: Record<string, number> = {};
    
    // Initialize all status counts to 0
    Object.values(TransactionStatus).forEach(status => {
      stats[status] = 0;
    });

    // Count transactions by status
    for (const state of this.states.values()) {
      stats[state.currentStatus]++;
    }

    // Add additional metrics
    stats.total = this.states.size;
    stats.problematic = this.getProblematicTransactions().length;
    stats.retryable = Array.from(this.states.values()).filter(s => this.canRetry(s.id)).length;

    return stats;
  }
}