/**
 * Example usage of MockBlockchainService
 * This demonstrates how to use the mock blockchain service for PYUSD transfers
 */

import { MockBlockchainService } from '../MockBlockchainService';

async function demonstrateBlockchainService() {
  const blockchainService = new MockBlockchainService();
  
  console.log('🚀 MockBlockchainService Demo');
  console.log('================================');
  
  try {
    // 1. Check balance
    console.log('\n1. Checking balance...');
    const balance = await blockchainService.getBalance('0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6');
    console.log(`Balance: ${balance} PYUSD`);
    
    // 2. Estimate gas fees
    console.log('\n2. Estimating gas fees...');
    const gasEstimate = await blockchainService.estimateGas(
      '0x8ba1f109551bD432803012645aac136c22C177ec', 
      100
    );
    console.log(`Gas Limit: ${gasEstimate.gasLimit}`);
    console.log(`Gas Price: ${gasEstimate.gasPrice} gwei`);
    console.log(`Max Fee Per Gas: ${gasEstimate.maxFeePerGas} gwei`);
    console.log(`Estimated Cost: ${gasEstimate.estimatedCost} ETH`);
    
    // 3. Send PYUSD
    console.log('\n3. Sending PYUSD...');
    const transaction = await blockchainService.sendPYUSD(
      '0x8ba1f109551bD432803012645aac136c22C177ec',
      100
    );
    console.log(`Transaction Hash: ${transaction.hash}`);
    console.log(`Status: ${transaction.status}`);
    console.log(`Gas Used: ${transaction.gasUsed}`);
    console.log(`Gas Price: ${transaction.gasPrice} gwei`);
    
    // 4. Check transaction status
    console.log('\n4. Checking transaction status...');
    const status = await blockchainService.getTransactionStatus(transaction.hash);
    console.log(`Current Status: ${status.status}`);
    console.log(`Confirmations: ${status.confirmations || 0}`);
    
    // 5. Wait for confirmation (simulate)
    console.log('\n5. Waiting for confirmation...');
    console.log('In a real scenario, the transaction will be confirmed after ~15 seconds');
    console.log('The service automatically updates transaction status with realistic timing');
    
    // 6. Demonstrate error handling
    console.log('\n6. Testing error handling...');
    try {
      await blockchainService.sendPYUSD('invalid-address', 100);
    } catch (error) {
      console.log(`Expected error caught: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // 7. Show mock data
    console.log('\n7. Mock data summary:');
    const mockData = blockchainService.getMockData();
    console.log(`Transactions stored: ${mockData.transactions.length}`);
    console.log(`Addresses with balances: ${mockData.balances.length}`);
    
    console.log('\n✅ Demo completed successfully!');
    
  } catch (error) {
    console.error('❌ Demo failed:', error);
  }
}

// Export for use in other files
export { demonstrateBlockchainService };

// Run demo if this file is executed directly
if (require.main === module) {
  demonstrateBlockchainService();
}