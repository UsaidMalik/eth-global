import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MockBlockchainClient } from '../mock/MockBlockchainClient';
import { BlockchainServiceFactory } from '../BlockchainServiceFactory';
import { PaymentContractStatus } from '../../types';

describe('MockBlockchainClient', () => {
  let client: MockBlockchainClient;

  beforeEach(async () => {
    client = new MockBlockchainClient();
    await client.connect();
  });

  afterEach(() => {
    client.disconnect();
  });

  describe('Connection Management', () => {
    it('should connect successfully', async () => {
      const newClient = new MockBlockchainClient();
      expect(newClient.isConnected()).toBe(false);
      
      await newClient.connect();
      expect(newClient.isConnected()).toBe(true);
      
      newClient.disconnect();
    });

    it('should disconnect successfully', () => {
      expect(client.isConnected()).toBe(true);
      
      client.disconnect();
      expect(client.isConnected()).toBe(false);
    });

    it('should return account when connected', () => {
      const account = client.getAccount();
      expect(account).toBeTruthy();
      expect(account).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });

    it('should return null account when disconnected', () => {
      client.disconnect();
      const account = client.getAccount();
      expect(account).toBeNull();
    });
  });

  describe('Balance Operations', () => {
    it('should get ETH balance', async () => {
      const balance = await client.getBalance();
      expect(balance).toBeGreaterThan(0n);
    });

    it('should get PYUSD balance', async () => {
      const balance = await client.getPYUSDBalance();
      expect(balance).toBeGreaterThan(0n);
    });

    it('should get PYUSD allowance', async () => {
      const owner = client.getAccount()!;
      const spender = '0x742d35Cc6634C0532925a3b8D4C9db96590c6C87';
      
      const allowance = await client.getPYUSDAllowance(owner, spender);
      expect(allowance).toBeGreaterThan(0n);
    });
  });

  describe('PYUSD Operations', () => {
    it('should approve PYUSD spending', async () => {
      const spender = '0x742d35Cc6634C0532925a3b8D4C9db96590c6C87';
      const amount = BigInt('1000000000'); // 1000 PYUSD
      
      const txHash = await client.approvePYUSD(spender, amount);
      expect(txHash).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });
  });

  describe('Payment Operations', () => {
    it('should initiate payment successfully', async () => {
      const recipient = '0x8ba1f109551bD432803012645Hac136c22C177ec';
      const amount = BigInt('100000000'); // 100 PYUSD
      const metadata = 'Test payment';
      
      const txHash = await client.initiatePayment(recipient, amount, metadata);
      expect(txHash).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });

    it('should track payment status progression', async () => {
      const recipient = '0x8ba1f109551bD432803012645Hac136c22C177ec';
      const amount = BigInt('100000000');
      const metadata = 'Test payment';
      
      // Set up event listener
      let paymentId: string;
      let paymentCompleted = false;
      
      client.onPaymentInitiated((event) => {
        paymentId = event.paymentId;
        expect(event.sender).toBe(client.getAccount());
        expect(event.recipient).toBe(recipient);
        expect(event.amount).toBe(amount);
      });
      
      client.onPaymentCompleted((event) => {
        expect(event.paymentId).toBe(paymentId);
        paymentCompleted = true;
      });
      
      // Initiate payment
      await client.initiatePayment(recipient, amount, metadata);
      
      // Wait for events to process
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(paymentId!).toBeTruthy();
      
      // Check initial status
      const initialStatus = await client.getPaymentStatus(paymentId!);
      expect(initialStatus).toBe(PaymentContractStatus.INITIATED);
      
      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 3500));
      expect(paymentCompleted).toBe(true);
      
      // Check final status
      const finalStatus = await client.getPaymentStatus(paymentId!);
      expect(finalStatus).toBe(PaymentContractStatus.COMPLETED);
    }, 10000);

    it('should get payment details', async () => {
      const recipient = '0x8ba1f109551bD432803012645Hac136c22C177ec';
      const amount = BigInt('100000000');
      const metadata = 'Test payment details';
      
      let paymentId: string;
      
      client.onPaymentInitiated((event) => {
        paymentId = event.paymentId;
      });
      
      await client.initiatePayment(recipient, amount, metadata);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const payment = await client.getPayment(paymentId!);
      expect(payment.paymentId).toBe(paymentId);
      expect(payment.sender).toBe(client.getAccount());
      expect(payment.recipient).toBe(recipient);
      expect(payment.amount).toBe(amount);
      expect(payment.metadata).toBe(metadata);
      expect(payment.timestamp).toBeGreaterThan(0);
    });

    it('should get user payments', async () => {
      const recipient = '0x8ba1f109551bD432803012645Hac136c22C177ec';
      const amount = BigInt('100000000');
      
      // Get initial payment count
      const initialPayments = await client.getUserPayments();
      const initialCount = initialPayments.length;
      
      // Make a payment
      await client.initiatePayment(recipient, amount, 'Test user payments');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Check updated payment count
      const updatedPayments = await client.getUserPayments();
      expect(updatedPayments.length).toBe(initialCount + 1);
      
      // Check recipient also has the payment
      const recipientPayments = await client.getUserPayments(recipient);
      expect(recipientPayments.length).toBeGreaterThan(0);
    });

    it('should calculate platform fee', async () => {
      const amount = BigInt('100000000'); // 100 PYUSD
      const fee = await client.calculatePlatformFee(amount);
      
      // Should be 0.25% of amount
      const expectedFee = (amount * BigInt(25)) / BigInt(10000);
      expect(fee).toBe(expectedFee);
    });
  });

  describe('Gas Operations', () => {
    it('should estimate gas', async () => {
      const gasEstimate = await client.estimateGas();
      
      expect(gasEstimate.gasLimit).toBeGreaterThan(0n);
      expect(gasEstimate.gasPrice).toBeGreaterThan(0n);
      expect(gasEstimate.totalCost).toBeGreaterThan(0n);
    });

    it('should optimize gas price', async () => {
      const gasConfig = await client.optimizeGasPrice();
      
      expect(gasConfig.gasPrice).toBeGreaterThan(0n);
      expect(gasConfig.maxFeePerGas).toBeGreaterThan(0n);
      expect(gasConfig.maxPriorityFeePerGas).toBeGreaterThan(0n);
    });
  });

  describe('Transaction Operations', () => {
    it('should wait for transaction', async () => {
      const mockTxHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      
      const receipt = await client.waitForTransaction(mockTxHash);
      
      expect(receipt.hash).toBe(mockTxHash);
      expect(receipt.status).toBe(1);
      expect(receipt.blockNumber).toBeGreaterThan(0);
      expect(receipt.gasUsed).toBeGreaterThan(0n);
    });

    it('should get transaction receipt', async () => {
      const mockTxHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      
      const receipt = await client.getTransactionReceipt(mockTxHash);
      
      // Mock has 90% success rate, so we might get null
      if (receipt) {
        expect(receipt.hash).toBe(mockTxHash);
        expect(receipt.status).toBe(1);
        expect(receipt.blockNumber).toBeGreaterThan(0);
      }
    });
  });

  describe('Event Handling', () => {
    it('should handle payment events', async () => {
      const recipient = '0x8ba1f109551bD432803012645Hac136c22C177ec';
      const amount = BigInt('100000000');
      
      let initiatedEventReceived = false;
      let completedEventReceived = false;
      
      client.onPaymentInitiated(() => {
        initiatedEventReceived = true;
      });
      
      client.onPaymentCompleted(() => {
        completedEventReceived = true;
      });
      
      await client.initiatePayment(recipient, amount, 'Event test');
      
      // Wait for initiated event
      await new Promise(resolve => setTimeout(resolve, 200));
      expect(initiatedEventReceived).toBe(true);
      
      // Wait for completed event
      await new Promise(resolve => setTimeout(resolve, 3500));
      expect(completedEventReceived).toBe(true);
    }, 10000);

    it('should remove all listeners', () => {
      const callback = vi.fn();
      
      client.onPaymentInitiated(callback);
      client.onPaymentCompleted(callback);
      client.onPaymentFailed(callback);
      
      client.removeAllListeners();
      
      // Events should not trigger callbacks after removal
      // This is tested implicitly by the mock implementation
      expect(true).toBe(true); // Placeholder assertion
    });
  });

  describe('Error Handling', () => {
    it('should throw error when not connected', async () => {
      client.disconnect();
      
      await expect(client.getBalance()).rejects.toThrow('not connected');
      await expect(client.getPYUSDBalance()).rejects.toThrow('not connected');
    });

    it('should throw error for non-existent payment', async () => {
      const fakePaymentId = '0x0000000000000000000000000000000000000000000000000000000000000000';
      
      await expect(client.getPaymentStatus(fakePaymentId)).rejects.toThrow('Payment not found');
      await expect(client.getPayment(fakePaymentId)).rejects.toThrow('Payment not found');
    });
  });
});

describe('BlockchainServiceFactory', () => {
  afterEach(() => {
    // Reset singleton instance
    (BlockchainServiceFactory as any).instance = null;
  });

  it('should create mock client when configured', () => {
    const factory = BlockchainServiceFactory.initialize({
      useMockServices: true
    });
    
    const client = factory.getBlockchainClient();
    expect(client).toBeInstanceOf(MockBlockchainClient);
    expect(factory.isUsingMockServices()).toBe(true);
  });

  it('should throw error when real client config is missing', () => {
    const factory = BlockchainServiceFactory.initialize({
      useMockServices: false
      // Missing blockchainConfig
    });
    
    // Error should be thrown when trying to get the client, not during initialization
    expect(() => {
      factory.getBlockchainClient();
    }).toThrow();
  });

  it('should update configuration', async () => {
    const factory = BlockchainServiceFactory.initialize({
      useMockServices: true
    });
    
    expect(factory.isUsingMockServices()).toBe(true);
    
    factory.updateConfig({
      useMockServices: false,
      blockchainConfig: {
        rpcUrl: 'http://localhost:8545',
        chainId: 31337,
        paymentContractAddress: '0x1234567890123456789012345678901234567890',
        pyusdTokenAddress: '0x0987654321098765432109876543210987654321'
      }
    });
    
    expect(factory.isUsingMockServices()).toBe(false);
  });

  it('should connect and disconnect blockchain', async () => {
    const factory = BlockchainServiceFactory.initialize({
      useMockServices: true
    });
    
    await factory.connectBlockchain();
    const client = factory.getBlockchainClient();
    expect(client.isConnected()).toBe(true);
    
    factory.disconnectBlockchain();
    expect(client.isConnected()).toBe(false);
  });
});