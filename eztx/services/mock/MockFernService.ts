import { FernError } from '../../types/errors';

export interface OnRampResponse {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  estimatedCompletion: number; // timestamp
  amount: number;
  currency: string;
  pyusdAmount?: number;
}

export interface OffRampResponse {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  estimatedCompletion: number; // timestamp
  pyusdAmount: number;
  targetAmount: number;
  targetCurrency: string;
}

export interface KYCResponse {
  id: string;
  status: 'pending' | 'approved' | 'rejected' | 'requires_documents';
  message?: string;
}

export interface FernAPIClient {
  initiateOnRamp(amount: number, currency: string): Promise<OnRampResponse>;
  initiateOffRamp(pyusdAmount: number, targetCurrency: string, recipientAddress: string): Promise<OffRampResponse>;
  getOnRampStatus(id: string): Promise<OnRampResponse>;
  getOffRampStatus(id: string): Promise<OffRampResponse>;
  performKYC(userInfo: any): Promise<KYCResponse>;
  getKYCStatus(id: string): Promise<KYCResponse>;
}

export class MockFernService implements FernAPIClient {
  private onRampTransactions = new Map<string, OnRampResponse>();
  private offRampTransactions = new Map<string, OffRampResponse>();
  private kycRecords = new Map<string, KYCResponse>();

  private generateId(): string {
    return 'fern_' + Math.random().toString(36).substr(2, 9);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private simulateNetworkDelay(): Promise<void> {
    // Simulate realistic API response times (500ms to 2s)
    const delay = Math.random() * 1500 + 500;
    return this.delay(delay);
  }

  private shouldSimulateError(): boolean {
    // 5% chance of simulating an error for testing
    return Math.random() < 0.05;
  }

  async initiateOnRamp(amount: number, currency: string): Promise<OnRampResponse> {
    await this.simulateNetworkDelay();

    if (this.shouldSimulateError()) {
      throw new FernError('On-ramp service temporarily unavailable', 'SERVICE_UNAVAILABLE');
    }

    if (amount <= 0) {
      throw new FernError('Invalid amount: must be greater than 0', 'INVALID_AMOUNT');
    }

    if (!['USD', 'EUR', 'GBP', 'CAD'].includes(currency)) {
      throw new FernError(`Unsupported currency: ${currency}`, 'UNSUPPORTED_CURRENCY');
    }

    const id = this.generateId();
    const estimatedCompletion = Date.now() + (5 * 60 * 1000); // 5 minutes from now
    
    // Simulate PYUSD conversion rate (approximately 1:1 with USD, with small variations for other currencies)
    const conversionRates: Record<string, number> = {
      USD: 1.0,
      EUR: 1.08,
      GBP: 1.25,
      CAD: 0.74
    };
    
    const pyusdAmount = amount * conversionRates[currency];

    const response: OnRampResponse = {
      id,
      status: 'pending',
      estimatedCompletion,
      amount,
      currency,
      pyusdAmount
    };

    this.onRampTransactions.set(id, response);

    // Simulate status progression
    setTimeout(() => {
      const transaction = this.onRampTransactions.get(id);
      if (transaction) {
        transaction.status = 'processing';
        this.onRampTransactions.set(id, transaction);
      }
    }, 2000);

    setTimeout(() => {
      const transaction = this.onRampTransactions.get(id);
      if (transaction) {
        transaction.status = 'completed';
        this.onRampTransactions.set(id, transaction);
      }
    }, 4000);

    return response;
  }

  async initiateOffRamp(pyusdAmount: number, targetCurrency: string, recipientAddress: string): Promise<OffRampResponse> {
    await this.simulateNetworkDelay();

    if (this.shouldSimulateError()) {
      throw new FernError('Off-ramp service temporarily unavailable', 'SERVICE_UNAVAILABLE');
    }

    if (pyusdAmount <= 0) {
      throw new FernError('Invalid PYUSD amount: must be greater than 0', 'INVALID_AMOUNT');
    }

    if (!['USD', 'EUR', 'GBP', 'CAD'].includes(targetCurrency)) {
      throw new FernError(`Unsupported target currency: ${targetCurrency}`, 'UNSUPPORTED_CURRENCY');
    }

    const id = this.generateId();
    const estimatedCompletion = Date.now() + (3 * 60 * 1000); // 3 minutes from now
    
    // Simulate conversion rates (inverse of on-ramp rates with small fees)
    const conversionRates: Record<string, number> = {
      USD: 0.998, // Small fee
      EUR: 0.92,
      GBP: 0.79,
      CAD: 1.34
    };
    
    const targetAmount = pyusdAmount * conversionRates[targetCurrency];

    const response: OffRampResponse = {
      id,
      status: 'pending',
      estimatedCompletion,
      pyusdAmount,
      targetAmount,
      targetCurrency
    };

    this.offRampTransactions.set(id, response);

    // Simulate status progression
    setTimeout(() => {
      const transaction = this.offRampTransactions.get(id);
      if (transaction) {
        transaction.status = 'processing';
        this.offRampTransactions.set(id, transaction);
      }
    }, 1500);

    setTimeout(() => {
      const transaction = this.offRampTransactions.get(id);
      if (transaction) {
        transaction.status = 'completed';
        this.offRampTransactions.set(id, transaction);
      }
    }, 3000);

    return response;
  }

  async getOnRampStatus(id: string): Promise<OnRampResponse> {
    await this.simulateNetworkDelay();

    const transaction = this.onRampTransactions.get(id);
    if (!transaction) {
      throw new FernError(`On-ramp transaction not found: ${id}`, 'TRANSACTION_NOT_FOUND');
    }

    return transaction;
  }

  async getOffRampStatus(id: string): Promise<OffRampResponse> {
    await this.simulateNetworkDelay();

    const transaction = this.offRampTransactions.get(id);
    if (!transaction) {
      throw new FernError(`Off-ramp transaction not found: ${id}`, 'TRANSACTION_NOT_FOUND');
    }

    return transaction;
  }

  async performKYC(userInfo: any): Promise<KYCResponse> {
    await this.simulateNetworkDelay();

    if (this.shouldSimulateError()) {
      throw new FernError('KYC service temporarily unavailable', 'SERVICE_UNAVAILABLE');
    }

    const id = this.generateId();
    
    // Simulate different KYC outcomes based on user info
    let status: KYCResponse['status'] = 'pending';
    let message: string | undefined;

    if (!userInfo.name || !userInfo.email) {
      status = 'requires_documents';
      message = 'Please provide valid name and email address';
    } else if (userInfo.name.toLowerCase().includes('test')) {
      // For testing purposes, reject users with 'test' in their name
      status = 'rejected';
      message = 'Unable to verify identity';
    } else {
      // Most users start as pending and get approved after a delay
      status = 'pending';
    }

    const response: KYCResponse = {
      id,
      status,
      message
    };

    this.kycRecords.set(id, response);

    // Simulate KYC processing time for pending status
    if (status === 'pending') {
      setTimeout(() => {
        const record = this.kycRecords.get(id);
        if (record) {
          record.status = 'approved';
          this.kycRecords.set(id, record);
        }
      }, 10000); // 10 seconds for demo purposes
    }

    return response;
  }

  async getKYCStatus(id: string): Promise<KYCResponse> {
    await this.simulateNetworkDelay();

    const record = this.kycRecords.get(id);
    if (!record) {
      throw new FernError(`KYC record not found: ${id}`, 'RECORD_NOT_FOUND');
    }

    return record;
  }

  // Utility method for testing - clear all mock data
  clearMockData(): void {
    this.onRampTransactions.clear();
    this.offRampTransactions.clear();
    this.kycRecords.clear();
  }

  // Utility method for testing - get all transactions
  getMockData() {
    return {
      onRampTransactions: Array.from(this.onRampTransactions.entries()),
      offRampTransactions: Array.from(this.offRampTransactions.entries()),
      kycRecords: Array.from(this.kycRecords.entries())
    };
  }
}