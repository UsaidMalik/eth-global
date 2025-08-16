import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BlockchainIntegrationService } from '../BlockchainIntegrationService';
import { MockBlockchainClient } from '../mock/MockBlockchainClient';
import { PaymentRequest, TransactionStatus } from '../../types';

describe('BlockchainIntegrationService', () => {
  let service: BlockchainIntegrationService;
  let mockClient: MockBlockchainClient;

  beforeEach(async () => {
    mockClient = new MockBlockchainClient();
    await mockClient.connect();
    service = new BlockchainIntegrationService(mockClient);
    await service.initialize();
  });

  afterEach(() => {
    service.dispose();
    mockClient.disconnect();
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      const newClient = new MockBlockchainClient();
      const newService = new BlockchainIntegrationService(newClient);
      
      expect(newClient.isConnected()).toBe(false);
      await newService.initialize();
      expect(newClient.isConnected()).toBe(true);
      
      newService.dispose();
      newClient.disconnect();
    });
  });

  describe('Balance Checking', () => {
    it('should check balance correctly for sufficient funds', async () => {
      const paymentRequest: PaymentRequest = {
        amount: 100, // 100 PYUSD
        currency: 'USD',
        recipientAddress: '0x8ba1f109551bD432803012645Hac136c22C177ec',
      };

      const balanceCheck = await service.checkBalance(paymentRequest);
      
      expect(balanceCheck.hasBalance).toBe(true);
      expect(parseFloat(balanceCheck.currentBalance)).toBeGreaterThan(0);
      expect(parseFloat(balanceCheck.requiredAmount)).toBeGreaterThan(100);
      expect(parseFloat(balanceCheck.platformFee)).toBeGreaterThan(0);
    });

    it('should check balance correctly for insufficient funds', async () => {
      // Set a low balance
      mockClient.setMockPYUSDBalance(BigInt('50000000')); // 50 PYUSD

      const paymentRequest: PaymentRequest = {
        amount: 100, // 100 PYUSD
        currency: 'USD',
        recipientAddress: '0x8ba1f109551bD432803012645Hac136c22C177ec',
      };

      const balanceCheck = await service.checkBalance(paymentRequest);
      
      expect(balanceCheck.hasBalance).toBe(false);
      expect(parseFloat(balanceCheck.currentBalance)).toBe(50);
    });
  });

  describe('Allowance Management', () => {
    it('should return null when allowance is sufficient', async () => {
      const amount = BigInt('100000000'); // 100 PYUSD
      
      const approvalTx = await service.ensureAllowance(amount);
      expect(approvalTx).toBeNull();
    });

    it('should return transaction hash when approval is needed', async () => {
      // Mock insufficient allowance by creating a new client
      const newClient = new MockBlockchainClient();
      await newClient.connect();
      
      // Override the allowance method to return 0
      vi.spyOn(newClient, 'getPYUSDAllowance').mockResolvedValue(BigInt(0));
      
      const newService = new BlockchainIntegrationService(newClient);
      await newService.initialize();
      
      const amount = BigInt('100000000');
      const approvalTx = await newService.ensureAllowance(amount);
      
      expect(approvalTx).toBeTruthy();
      expect(approvalTx).toMatch(/^0x[a-fA-F0-9]{64}$/);
      
      newService.dispose();
      newClient.disconnect();
    });
  });

  describe('Cost Estimation', () => {
    it('should estimate payment costs correctly', async () => {
      const paymentRequest: PaymentRequest = {
        amount: 100,
        currency: 'USD',
        recipientAddress: '0x8ba1f109551bD432803012645Hac136c22C177ec',
      };

      const feeEstimate = await service.estimatePaymentCosts(paymentRequest);
      
      expect(feeEstimate.onRampFee).toBe(0);
      expect(feeEstimate.offRampFee).toBe(0);
      expect(feeEstimate.blockchainFee).toBeGreaterThan(0);
      expect(feeEstimate.totalFee).toBeGreaterThan(0);
      expect(feeEstimate.estimatedTime).toBeGreaterThan(0);
    });
  });

  describe('Payment Execution', () => {
    it('should execute payment successfully', async () => {
      const paymentRequest: PaymentRequest = {
        amount: 100,
        currency: 'USD',
        recipientAddress: '0x8ba1f109551bD432803012645Hac136c22C177ec',
        recipientENS: 'test.eth',
      };

      const result = await service.executePayment(paymentRequest);
      
      expect(result.transactionHash).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(result.paymentId).toBeTruthy();
    });
  });

  describe('Payment Status Tracking', () => {
    it('should get payment status correctly', async () => {
      const paymentRequest: PaymentRequest = {
        amount: 100,
        currency: 'USD',
        recipientAddress: '0x8ba1f109551bD432803012645Hac136c22C177ec',
      };

      const { paymentId } = await service.executePayment(paymentRequest);
      
      // Initially should be initiated
      const initialStatus = await service.getPaymentStatus(paymentId);
      expect(initialStatus).toBe(TransactionStatus.INITIATED);
      
      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 3500));
      
      const finalStatus = await service.getPaymentStatus(paymentId);
      expect(finalStatus).toBe(TransactionStatus.COMPLETED);
    }, 10000);

    it('should get payment details correctly', async () => {
      const paymentRequest: PaymentRequest = {
        amount: 100,
        currency: 'USD',
        recipientAddress: '0x8ba1f109551bD432803012645Hac136c22C177ec',
      };

      const { paymentId } = await service.executePayment(paymentRequest);
      
      const details = await service.getPaymentDetails(paymentId);
      
      expect(details.id).toBe(paymentId);
      expect(details.amount).toBe(100);
      expect(details.recipient).toBe(paymentRequest.recipientAddress);
      expect(details.status).toBeTruthy();
      expect(details.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('Payment History', () => {
    it('should get user payment history', async () => {
      const initialHistory = await service.getUserPaymentHistory();
      const initialCount = initialHistory.length;

      const paymentRequest: PaymentRequest = {
        amount: 100,
        currency: 'USD',
        recipientAddress: '0x8ba1f109551bD432803012645Hac136c22C177ec',
      };

      await service.executePayment(paymentRequest);
      
      const updatedHistory = await service.getUserPaymentHistory();
      expect(updatedHistory.length).toBe(initialCount + 1);
    });
  });

  describe('Network Status', () => {
    it('should get network status correctly', async () => {
      const networkStatus = await service.getNetworkStatus();
      
      expect(networkStatus.gasPrice).toBeTruthy();
      expect(networkStatus.estimatedTime).toBeGreaterThan(0);
      expect(['low', 'medium', 'high']).toContain(networkStatus.networkCongestion);
    });
  });

  describe('Error Handling', () => {
    it('should handle payment status errors gracefully', async () => {
      const fakePaymentId = '0x0000000000000000000000000000000000000000000000000000000000000000';
      
      const status = await service.getPaymentStatus(fakePaymentId);
      expect(status).toBe(TransactionStatus.FAILED);
    });

    it('should handle payment details errors gracefully', async () => {
      const fakePaymentId = '0x0000000000000000000000000000000000000000000000000000000000000000';
      
      const details = await service.getPaymentDetails(fakePaymentId);
      expect(details).toEqual({});
    });

    it('should handle network status errors gracefully', async () => {
      // Disconnect client to simulate error
      mockClient.disconnect();
      
      const networkStatus = await service.getNetworkStatus();
      
      expect(networkStatus.gasPrice).toBe('Unknown');
      expect(networkStatus.estimatedTime).toBe(5);
      expect(networkStatus.networkCongestion).toBe('medium');
    });
  });

  describe('Resource Cleanup', () => {
    it('should dispose resources correctly', () => {
      // This test mainly ensures no errors are thrown during disposal
      expect(() => service.dispose()).not.toThrow();
    });
  });
});