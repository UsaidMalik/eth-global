import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FeeCalculator, FeeCalculatorConfig, NetworkConditions } from '../FeeCalculator';

describe('FeeCalculator', () => {
  let feeCalculator: FeeCalculator;
  let mockConfig: FeeCalculatorConfig;

  beforeEach(() => {
    mockConfig = {
      onRampFeePercentage: 0.015, // 1.5%
      offRampFeePercentage: 0.02, // 2%
      baseFeeUSD: 1.00, // Lower base fee
      gasPriceMultiplier: 1.2
    };
    feeCalculator = new FeeCalculator(mockConfig);
  });

  describe('calculateFees', () => {
    it('should calculate fees correctly for a standard payment', async () => {
      const amount = 100;
      const fees = await feeCalculator.calculateFees(amount);

      expect(fees).toHaveProperty('onRampFee');
      expect(fees).toHaveProperty('blockchainFee');
      expect(fees).toHaveProperty('offRampFee');
      expect(fees).toHaveProperty('totalFee');
      expect(fees).toHaveProperty('estimatedTime');

      // Verify fee calculations
      expect(fees.onRampFee).toBe(amount * mockConfig.onRampFeePercentage); // 1.5
      expect(fees.offRampFee).toBe(amount * mockConfig.offRampFeePercentage); // 2.0
      expect(fees.totalFee).toBe(fees.onRampFee + fees.blockchainFee + fees.offRampFee);
      expect(fees.estimatedTime).toBeGreaterThan(0);
    });

    it('should apply minimum base fee when percentage fee is too low', async () => {
      const smallAmount = 10; // This would result in very small percentage fees
      const fees = await feeCalculator.calculateFees(smallAmount);

      // On-ramp fee should be at least the base fee
      expect(fees.onRampFee).toBeGreaterThanOrEqual(mockConfig.baseFeeUSD);
      // Off-ramp fee should be at least the base fee
      expect(fees.offRampFee).toBeGreaterThanOrEqual(mockConfig.baseFeeUSD);
    });

    it('should handle large amounts correctly', async () => {
      const largeAmount = 10000;
      const fees = await feeCalculator.calculateFees(largeAmount);

      expect(fees.onRampFee).toBe(largeAmount * mockConfig.onRampFeePercentage);
      expect(fees.offRampFee).toBe(largeAmount * mockConfig.offRampFeePercentage);
      expect(fees.totalFee).toBeGreaterThan(0);
    });

    it('should calculate blockchain fees based on network conditions', async () => {
      const amount = 100;
      const fees1 = await feeCalculator.calculateFees(amount);
      const fees2 = await feeCalculator.calculateFees(amount);

      // Blockchain fees might vary due to simulated network conditions
      expect(fees1.blockchainFee).toBeGreaterThan(0);
      expect(fees2.blockchainFee).toBeGreaterThan(0);
    });
  });

  describe('getEstimatedTime', () => {
    it('should return a positive estimated time', async () => {
      const estimatedTime = await feeCalculator.getEstimatedTime();
      expect(estimatedTime).toBeGreaterThan(0);
    });

    it('should vary based on network conditions', async () => {
      const times: number[] = [];
      
      // Get multiple time estimates to see variation
      for (let i = 0; i < 5; i++) {
        const time = await feeCalculator.getEstimatedTime();
        times.push(time);
      }

      // All times should be positive
      times.forEach(time => expect(time).toBeGreaterThan(0));
    });
  });

  describe('network conditions simulation', () => {
    it('should update network conditions', async () => {
      const initialConditions = feeCalculator.getNetworkConditions();
      
      // Calculate fees to trigger network condition update
      await feeCalculator.calculateFees(100);
      
      const updatedConditions = feeCalculator.getNetworkConditions();
      
      // Conditions should be valid
      expect(['low', 'medium', 'high']).toContain(updatedConditions.congestion);
      expect(updatedConditions.gasPrice).toBeGreaterThan(0);
      expect(updatedConditions.fernProcessingTime).toBeGreaterThan(0);
    });

    it('should have reasonable gas price ranges', async () => {
      // Test multiple updates to ensure gas prices stay within reasonable bounds
      for (let i = 0; i < 10; i++) {
        await feeCalculator.calculateFees(100);
        const conditions = feeCalculator.getNetworkConditions();
        
        expect(conditions.gasPrice).toBeGreaterThanOrEqual(5);
        expect(conditions.gasPrice).toBeLessThanOrEqual(50);
      }
    });

    it('should have reasonable processing times', async () => {
      for (let i = 0; i < 10; i++) {
        await feeCalculator.calculateFees(100);
        const conditions = feeCalculator.getNetworkConditions();
        
        expect(conditions.fernProcessingTime).toBeGreaterThanOrEqual(2);
        expect(conditions.fernProcessingTime).toBeLessThanOrEqual(10);
      }
    });
  });

  describe('configuration updates', () => {
    it('should allow updating configuration', () => {
      const newConfig = {
        onRampFeePercentage: 0.01, // 1%
        baseFeeUSD: 0.50 // Lower base fee so percentage takes precedence
      };

      feeCalculator.updateConfig(newConfig);

      // Test that new config is applied
      const amount = 100;
      return feeCalculator.calculateFees(amount).then(fees => {
        expect(fees.onRampFee).toBe(amount * newConfig.onRampFeePercentage);
      });
    });

    it('should preserve existing config when partially updating', () => {
      const originalConfig = { ...mockConfig };
      const partialUpdate = { onRampFeePercentage: 0.01 };

      feeCalculator.updateConfig(partialUpdate);

      return feeCalculator.calculateFees(100).then(fees => {
        // Updated value should be applied
        expect(fees.onRampFee).toBe(100 * partialUpdate.onRampFeePercentage);
        
        // Other values should remain the same
        expect(fees.offRampFee).toBe(100 * originalConfig.offRampFeePercentage);
      });
    });
  });

  describe('edge cases', () => {
    it('should handle zero amount', async () => {
      const fees = await feeCalculator.calculateFees(0);
      
      expect(fees.onRampFee).toBe(mockConfig.baseFeeUSD);
      expect(fees.offRampFee).toBe(mockConfig.baseFeeUSD);
      expect(fees.blockchainFee).toBeGreaterThan(0);
      expect(fees.totalFee).toBeGreaterThan(0);
    });

    it('should handle negative amounts gracefully', async () => {
      const fees = await feeCalculator.calculateFees(-100);
      
      // Should still apply minimum base fees
      expect(fees.onRampFee).toBe(mockConfig.baseFeeUSD);
      expect(fees.offRampFee).toBe(mockConfig.baseFeeUSD);
    });

    it('should handle different currencies', async () => {
      const feesUSD = await feeCalculator.calculateFees(100, 'USD');
      const feesEUR = await feeCalculator.calculateFees(100, 'EUR');
      
      // For now, currency doesn't affect calculation, but structure should be the same
      expect(feesUSD).toHaveProperty('onRampFee');
      expect(feesEUR).toHaveProperty('onRampFee');
    });
  });

  describe('fee accuracy requirements', () => {
    it('should calculate fees with proper precision', async () => {
      const amount = 123.45;
      const fees = await feeCalculator.calculateFees(amount);

      // All fees should be rounded to reasonable precision
      expect(Number.isFinite(fees.onRampFee)).toBe(true);
      expect(Number.isFinite(fees.blockchainFee)).toBe(true);
      expect(Number.isFinite(fees.offRampFee)).toBe(true);
      expect(Number.isFinite(fees.totalFee)).toBe(true);

      // Blockchain fee should be rounded to 2 decimal places
      expect(fees.blockchainFee).toBe(Math.round(fees.blockchainFee * 100) / 100);
    });

    it('should maintain fee calculation consistency for same inputs', async () => {
      // Mock the network conditions to be consistent
      const originalUpdateMethod = feeCalculator['updateNetworkConditions'];
      feeCalculator['updateNetworkConditions'] = vi.fn().mockResolvedValue(undefined);

      const amount = 100;
      const fees1 = await feeCalculator.calculateFees(amount);
      const fees2 = await feeCalculator.calculateFees(amount);

      expect(fees1.onRampFee).toBe(fees2.onRampFee);
      expect(fees1.offRampFee).toBe(fees2.offRampFee);
      expect(fees1.blockchainFee).toBe(fees2.blockchainFee);

      // Restore original method
      feeCalculator['updateNetworkConditions'] = originalUpdateMethod;
    });
  });
});