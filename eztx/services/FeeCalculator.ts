import { FeeEstimate } from '../types';

export interface NetworkConditions {
  congestion: 'low' | 'medium' | 'high';
  gasPrice: number; // in gwei
  fernProcessingTime: number; // in minutes
}

export interface FeeCalculatorConfig {
  onRampFeePercentage: number; // e.g., 0.015 for 1.5%
  offRampFeePercentage: number; // e.g., 0.02 for 2%
  baseFeeUSD: number; // base fee in USD
  gasPriceMultiplier: number; // multiplier for gas price calculation
}

export class FeeCalculator {
  private config: FeeCalculatorConfig;
  private networkConditions: NetworkConditions;

  constructor(config?: Partial<FeeCalculatorConfig>) {
    this.config = {
      onRampFeePercentage: 0.015, // 1.5%
      offRampFeePercentage: 0.02, // 2%
      baseFeeUSD: 1.00, // Lower base fee so percentage takes precedence for normal amounts
      gasPriceMultiplier: 1.2,
      ...config
    };

    // Initialize with default network conditions
    this.networkConditions = {
      congestion: 'medium',
      gasPrice: 20, // 20 gwei
      fernProcessingTime: 5 // 5 minutes
    };
  }

  /**
   * Calculate comprehensive fee estimate for a payment
   */
  async calculateFees(amount: number, currency: string = 'USD'): Promise<FeeEstimate> {
    // Update network conditions before calculation
    await this.updateNetworkConditions();

    const onRampFee = this.calculateOnRampFee(amount);
    const blockchainFee = this.calculateBlockchainFee();
    const offRampFee = this.calculateOffRampFee(amount);
    const totalFee = onRampFee + blockchainFee + offRampFee;
    const estimatedTime = this.calculateEstimatedTime();

    return {
      onRampFee,
      blockchainFee,
      offRampFee,
      totalFee,
      estimatedTime
    };
  }

  /**
   * Get current estimated transfer time
   */
  async getEstimatedTime(): Promise<number> {
    await this.updateNetworkConditions();
    return this.calculateEstimatedTime();
  }

  /**
   * Calculate on-ramp fee (Fern fee for converting fiat to PYUSD)
   */
  private calculateOnRampFee(amount: number): number {
    const percentageFee = amount * this.config.onRampFeePercentage;
    // Only apply minimum fee for very small amounts
    return amount > 0 ? Math.max(percentageFee, this.config.baseFeeUSD) : this.config.baseFeeUSD;
  }

  /**
   * Calculate blockchain transaction fee
   */
  private calculateBlockchainFee(): number {
    const { gasPrice, congestion } = this.networkConditions;
    
    // Base gas limit for PYUSD transfer (estimated)
    const baseGasLimit = 21000;
    
    // Adjust gas limit based on congestion
    const congestionMultiplier = {
      low: 1.0,
      medium: 1.2,
      high: 1.5
    }[congestion];

    const adjustedGasLimit = baseGasLimit * congestionMultiplier;
    const gasCostGwei = adjustedGasLimit * gasPrice * this.config.gasPriceMultiplier;
    
    // Convert gwei to USD (approximate conversion rate)
    const ethToUsdRate = 2500; // Approximate ETH price in USD
    const gweiToEth = 1e-9;
    const gasCostUSD = gasCostGwei * gweiToEth * ethToUsdRate;

    return Math.round(gasCostUSD * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Calculate off-ramp fee (Fern fee for converting PYUSD to fiat)
   */
  private calculateOffRampFee(amount: number): number {
    const percentageFee = amount * this.config.offRampFeePercentage;
    // Only apply minimum fee for very small amounts
    return amount > 0 ? Math.max(percentageFee, this.config.baseFeeUSD) : this.config.baseFeeUSD;
  }

  /**
   * Calculate total estimated time for the complete payment flow
   */
  private calculateEstimatedTime(): number {
    const { congestion, fernProcessingTime } = this.networkConditions;
    
    // Base times for each step (in minutes)
    const onRampTime = fernProcessingTime;
    const blockchainTime = {
      low: 2,
      medium: 5,
      high: 15
    }[congestion];
    const offRampTime = fernProcessingTime;

    return onRampTime + blockchainTime + offRampTime;
  }

  /**
   * Simulate real-time network condition updates
   */
  private async updateNetworkConditions(): Promise<void> {
    // Simulate network condition changes with some randomness
    const congestionLevels: NetworkConditions['congestion'][] = ['low', 'medium', 'high'];
    const randomCongestion = congestionLevels[Math.floor(Math.random() * congestionLevels.length)];
    
    // Simulate gas price fluctuations
    const baseGasPrice = 20;
    const gasPriceVariation = (Math.random() - 0.5) * 20; // ±10 gwei variation
    const newGasPrice = Math.max(5, baseGasPrice + gasPriceVariation);

    // Simulate Fern processing time variations
    const baseFernTime = 5;
    const fernTimeVariation = (Math.random() - 0.5) * 4; // ±2 minutes variation
    const newFernTime = Math.max(2, baseFernTime + fernTimeVariation);

    this.networkConditions = {
      congestion: randomCongestion,
      gasPrice: Math.round(newGasPrice),
      fernProcessingTime: Math.round(newFernTime)
    };

    // Add small delay to simulate network call
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Get current network conditions (for debugging/monitoring)
   */
  getNetworkConditions(): NetworkConditions {
    return { ...this.networkConditions };
  }

  /**
   * Update fee calculator configuration
   */
  updateConfig(newConfig: Partial<FeeCalculatorConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}