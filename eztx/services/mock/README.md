# Mock Services

This directory contains mock implementations of external services used for development and testing.

## MockBlockchainService

The `MockBlockchainService` provides a complete simulation of blockchain interactions for PYUSD transfers.

### Features

- **PYUSD Transfer Simulation**: Mock blockchain transactions with realistic timing
- **Transaction Hash Generation**: Creates valid-looking 64-character hex transaction hashes
- **Status Updates**: Simulates transaction progression from pending to confirmed
- **Gas Fee Estimation**: Realistic gas calculations with EIP-1559 support
- **Network Delays**: Simulates real blockchain network delays (1-3 seconds)
- **Error Simulation**: 3% chance of transaction failures for testing error handling
- **Address Validation**: Validates Ethereum address format
- **Balance Management**: Mock PYUSD balances for testing scenarios

### Usage

```typescript
import { MockBlockchainService } from './services/mock';

const blockchainService = new MockBlockchainService();

// Send PYUSD
const transaction = await blockchainService.sendPYUSD(
  '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
  100
);

// Check transaction status
const status = await blockchainService.getTransactionStatus(transaction.hash);

// Estimate gas fees
const gasEstimate = await blockchainService.estimateGas(
  '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
  100
);

// Check balance
const balance = await blockchainService.getBalance('0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6');
```

### Transaction Lifecycle

1. **Pending**: Transaction is submitted and waiting for confirmation
2. **Confirmed**: Transaction is confirmed after ~15 seconds
3. **Multiple Confirmations**: Additional confirmations at 45s (3 confirmations) and 90s (6 confirmations)

### Error Handling

The service throws `BlockchainError` for various scenarios:
- Invalid recipient addresses
- Invalid transfer amounts (≤0 or >10,000)
- Network congestion (3% random failure rate)
- Transaction not found

### Testing Utilities

- `setMockBalance(address, balance)`: Set custom balances for testing
- `simulateTransactionFailure(hash)`: Force a transaction to fail
- `clearMockData()`: Reset all mock data
- `getMockData()`: Retrieve current mock state
- `simulateNetworkCongestion()`: Simulate high gas prices
- `simulateNetworkStability()`: Normalize network conditions

### Requirements Satisfied

- **7.1**: PYUSD transfer simulation with realistic blockchain behavior
- **7.2**: Gas fee calculations and network interaction simulation  
- **8.1**: Smart contract interaction simulation for secure transfers
- **9.2**: Mock service implementation for development and testing

See `examples/blockchain-service-example.ts` for a complete usage demonstration.