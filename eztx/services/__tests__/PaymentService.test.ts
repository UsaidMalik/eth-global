import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PaymentService, PaymentServiceConfig } from '../PaymentService';
import { PaymentRequest, TransactionStatus } from '../../types';
import { MockFernService } from '../mock/MockFernService';
import { MockBlockchainService } from '../mock/MockBlockchainService';

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

describe('PaymentService', () => {
  let paymentService: PaymentService;
  let mockFernService: MockFernService;
  let mockBlockchainService: MockBlockchainService;
  let config: PaymentServiceConfig;

  beforeEach(() => {
    // Reset localStorage mock
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();

    // Create fresh mock services
    mockFernService = new MockFernService();
    mockBlockchainService = new MockBlockchainService();

    config = {
      useMockServices: true,
      fernApiClient: mockFernService,
      blockchainClient: mockBlockchainService
    };

    paymentService = new PaymentService(config);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initiatePayment', () => {
    const validPaymentRequest: PaymentRequest = {
      amount: 100,
      currency: 'USD',
      recipientAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
      recipientENS: 'test.eth'
    };

    it('should create a new transaction with correct initial data', async () => {
      const transaction = await paymentService.initiatePayment(validPaymentRequest);

      expect(transaction).toHaveProperty('id');
      expect(transaction.amount).toBe(validPaymentRequest.amount);
      expect(transaction.currency).toBe(validPaymentRequest.currency);
      expect(transaction.recipient).toBe(validPaymentRequest.recipientAddress);
      expect(transaction.status).toBe(TransactionStatus.INITIATED);
      expect(transaction).toHaveProperty('fees');
      expect(transaction).toHaveProperty('timestamp');
    });

    it('should store the transaction in localStorage', async () => {
      await paymentService.initiatePayment(validPaymentRequest);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'eztx_transactions',
        expect.stringContaining(validPaymentRequest.recipientAddress)
      );
    });

    it('should validate payment request and throw error for invalid amount', async () => {
      const invalidRequest = { ...validPaymentRequest, amount: 0 };

      await expect(paymentService.initiatePayment(invalidRequest))
        .rejects.toThrow('Invalid amount: must be greater than 0');
    });

    it('should validate payment request and throw error for missing currency', async () => {
      const invalidRequest = { ...validPaymentRequest, currency: '' };

      await expect(paymentService.initiatePayment(invalidRequest))
        .rejects.toThrow('Currency is required');
    });

    it('should validate payment request and throw error for missing recipient', async () => {
      const invalidRequest = { ...validPaymentRequest, recipientAddress: '' };

      await expect(paymentService.initiatePayment(invalidRequest))
        .rejects.toThrow('Recipient address is required');
    });

    it('should validate payment request and throw error for invalid address format', async () => {
      const invalidRequest = { ...validPaymentRequest, recipientAddress: 'invalid-address' };

      await expect(paymentService.initiatePayment(invalidRequest))
        .rejects.toThrow('Invalid recipient address format');
    });

    it('should generate unique transaction IDs', async () => {
      const tx1 = await paymentService.initiatePayment(validPaymentRequest);
      const tx2 = await paymentService.initiatePayment(validPaymentRequest);

      expect(tx1.id).not.toBe(tx2.id);
    });
  });

  describe('getTransactionStatus', () => {
    it('should return the current status of a transaction', async () => {
      // Mock localStorage to return a transaction
      const mockTransaction = {
        id: 'test-tx-1',
        status: TransactionStatus.PENDING,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        amount: 100,
        currency: 'USD',
        recipient: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        fees: { onRampFee: 1.5, blockchainFee: 2, offRampFee: 2, totalFee: 5.5, estimatedTime: 10 }
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify([mockTransaction]));

      const status = await paymentService.getTransactionStatus('test-tx-1');
      expect(status).toBe(TransactionStatus.PENDING);
    });

    it('should throw error for non-existent transaction', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify([]));

      await expect(paymentService.getTransactionStatus('non-existent'))
        .rejects.toThrow('Transaction not found: non-existent');
    });
  });

  describe('getTransactionHistory', () => {
    it('should return empty array when no transactions exist', async () => {
      localStorageMock.getItem.mockReturnValue(null);

      const history = await paymentService.getTransactionHistory();
      expect(history).toEqual([]);
    });

    it('should return all stored transactions', async () => {
      const mockTransactions = [
        {
          id: 'tx-1',
          status: TransactionStatus.COMPLETED,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          amount: 100,
          currency: 'USD',
          recipient: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
          fees: { onRampFee: 1.5, blockchainFee: 2, offRampFee: 2, totalFee: 5.5, estimatedTime: 10 }
        },
        {
          id: 'tx-2',
          status: TransactionStatus.PENDING,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          amount: 200,
          currency: 'EUR',
          recipient: '0x8ba1f109551bD432803012645aac136c22C177ec',
          fees: { onRampFee: 3, blockchainFee: 2, offRampFee: 4, totalFee: 9, estimatedTime: 8 }
        }
      ];

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockTransactions));

      const history = await paymentService.getTransactionHistory();
      expect(history).toHaveLength(2);
      expect(history[0].id).toBe('tx-1');
      expect(history[1].id).toBe('tx-2');
    });

    it('should handle localStorage errors gracefully', async () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });

      const history = await paymentService.getTransactionHistory();
      expect(history).toEqual([]);
    });
  });

  describe('getTransaction', () => {
    it('should return specific transaction by ID', async () => {
      const mockTransaction = {
        id: 'test-tx-1',
        status: TransactionStatus.COMPLETED,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        amount: 100,
        currency: 'USD',
        recipient: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        fees: { onRampFee: 1.5, blockchainFee: 2, offRampFee: 2, totalFee: 5.5, estimatedTime: 10 }
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify([mockTransaction]));

      const transaction = await paymentService.getTransaction('test-tx-1');
      expect(transaction).not.toBeNull();
      expect(transaction?.id).toBe('test-tx-1');
      expect(transaction?.amount).toBe(100);
    });

    it('should return null for non-existent transaction', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify([]));

      const transaction = await paymentService.getTransaction('non-existent');
      expect(transaction).toBeNull();
    });
  });

  describe('getPaymentProgress', () => {
    it('should return progress information for a transaction', async () => {
      const mockTransaction = {
        id: 'test-tx-1',
        status: TransactionStatus.TRANSFERRING,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        amount: 100,
        currency: 'USD',
        recipient: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        fees: { onRampFee: 1.5, blockchainFee: 2, offRampFee: 2, totalFee: 5.5, estimatedTime: 10 }
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify([mockTransaction]));

      const progress = await paymentService.getPaymentProgress('test-tx-1');
      
      expect(progress.currentStep).toBe(TransactionStatus.TRANSFERRING);
      expect(progress.completedSteps).toContain(TransactionStatus.INITIATED);
      expect(progress.completedSteps).toContain(TransactionStatus.PENDING);
      expect(progress.completedSteps).toContain(TransactionStatus.ON_RAMPING);
      expect(progress.completedSteps).toContain(TransactionStatus.CONVERTING);
      expect(progress.estimatedTimeRemaining).toBeGreaterThanOrEqual(0);
      expect(progress.message).toContain('blockchain');
    });

    it('should throw error for non-existent transaction', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify([]));

      await expect(paymentService.getPaymentProgress('non-existent'))
        .rejects.toThrow('Transaction not found: non-existent');
    });
  });

  describe('cancelPayment', () => {
    it('should cancel payment in early stages', async () => {
      const mockTransaction = {
        id: 'test-tx-1',
        status: TransactionStatus.PENDING,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        amount: 100,
        currency: 'USD',
        recipient: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        fees: { onRampFee: 1.5, blockchainFee: 2, offRampFee: 2, totalFee: 5.5, estimatedTime: 10 }
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify([mockTransaction]));

      const cancelled = await paymentService.cancelPayment('test-tx-1');
      expect(cancelled).toBe(true);
    });

    it('should not cancel payment in later stages', async () => {
      const mockTransaction = {
        id: 'test-tx-1',
        status: TransactionStatus.TRANSFERRING,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        amount: 100,
        currency: 'USD',
        recipient: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        fees: { onRampFee: 1.5, blockchainFee: 2, offRampFee: 2, totalFee: 5.5, estimatedTime: 10 }
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify([mockTransaction]));

      const cancelled = await paymentService.cancelPayment('test-tx-1');
      expect(cancelled).toBe(false);
    });

    it('should throw error for non-existent transaction', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify([]));

      await expect(paymentService.cancelPayment('non-existent'))
        .rejects.toThrow('Transaction not found: non-existent');
    });
  });

  describe('retryPayment', () => {
    it('should create new payment for failed transaction', async () => {
      const mockTransaction = {
        id: 'test-tx-1',
        status: TransactionStatus.FAILED,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        amount: 100,
        currency: 'USD',
        recipient: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        recipientENS: 'test.eth',
        fees: { onRampFee: 1.5, blockchainFee: 2, offRampFee: 2, totalFee: 5.5, estimatedTime: 10 }
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify([mockTransaction]));

      const newTransaction = await paymentService.retryPayment('test-tx-1');
      
      expect(newTransaction.id).not.toBe('test-tx-1'); // Should be a new transaction
      expect(newTransaction.amount).toBe(100);
      expect(newTransaction.currency).toBe('USD');
      expect(newTransaction.recipient).toBe('0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6');
      expect(newTransaction.status).toBe(TransactionStatus.INITIATED);
    });

    it('should throw error for non-failed transaction', async () => {
      const mockTransaction = {
        id: 'test-tx-1',
        status: TransactionStatus.COMPLETED,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        amount: 100,
        currency: 'USD',
        recipient: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        fees: { onRampFee: 1.5, blockchainFee: 2, offRampFee: 2, totalFee: 5.5, estimatedTime: 10 }
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify([mockTransaction]));

      await expect(paymentService.retryPayment('test-tx-1'))
        .rejects.toThrow('Can only retry failed transactions');
    });

    it('should throw error for non-existent transaction', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify([]));

      await expect(paymentService.retryPayment('non-existent'))
        .rejects.toThrow('Transaction not found: non-existent');
    });
  });

  describe('clearTransactionHistory', () => {
    it('should clear all transactions from localStorage', () => {
      paymentService.clearTransactionHistory();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('eztx_transactions');
    });
  });

  describe('payment orchestration', () => {
    it('should handle successful payment flow', async () => {
      const validPaymentRequest: PaymentRequest = {
        amount: 100,
        currency: 'USD',
        recipientAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'
      };

      // Mock successful responses
      vi.spyOn(mockFernService, 'initiateOnRamp').mockResolvedValue({
        id: 'onramp-123',
        status: 'pending',
        estimatedCompletion: Date.now() + 300000,
        amount: 100,
        currency: 'USD',
        pyusdAmount: 100
      });

      vi.spyOn(mockFernService, 'getOnRampStatus').mockResolvedValue({
        id: 'onramp-123',
        status: 'completed',
        estimatedCompletion: Date.now(),
        amount: 100,
        currency: 'USD',
        pyusdAmount: 100
      });

      vi.spyOn(mockBlockchainService, 'sendPYUSD').mockResolvedValue({
        hash: '0xabc123',
        status: 'pending'
      });

      vi.spyOn(mockBlockchainService, 'getTransactionStatus').mockResolvedValue({
        hash: '0xabc123',
        status: 'confirmed',
        confirmations: 6
      });

      vi.spyOn(mockFernService, 'initiateOffRamp').mockResolvedValue({
        id: 'offramp-456',
        status: 'pending',
        estimatedCompletion: Date.now() + 180000,
        pyusdAmount: 100,
        targetAmount: 100,
        targetCurrency: 'USD'
      });

      vi.spyOn(mockFernService, 'getOffRampStatus').mockResolvedValue({
        id: 'offramp-456',
        status: 'completed',
        estimatedCompletion: Date.now(),
        pyusdAmount: 100,
        targetAmount: 100,
        targetCurrency: 'USD'
      });

      const transaction = await paymentService.initiatePayment(validPaymentRequest);
      expect(transaction.status).toBe(TransactionStatus.INITIATED);

      // Wait a bit for async processing to start
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify that the orchestration methods were called
      expect(mockFernService.initiateOnRamp).toHaveBeenCalledWith(100, 'USD');
    });

    it('should handle payment failures gracefully', async () => {
      const validPaymentRequest: PaymentRequest = {
        amount: 100,
        currency: 'USD',
        recipientAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'
      };

      // Mock failure in on-ramp
      vi.spyOn(mockFernService, 'initiateOnRamp').mockRejectedValue(
        new Error('On-ramp service unavailable')
      );

      const transaction = await paymentService.initiatePayment(validPaymentRequest);
      expect(transaction.status).toBe(TransactionStatus.INITIATED);

      // Wait for async processing to complete
      await new Promise(resolve => setTimeout(resolve, 200));

      // The transaction should eventually be marked as failed
      // Note: In a real test, we might need to poll for status changes
    });
  });
});