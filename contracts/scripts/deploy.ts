import { ethers } from "hardhat";

async function main() {
  console.log("Starting PaymentContract deployment...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

  // PYUSD token addresses for different networks
  const PYUSD_ADDRESSES = {
    // Ethereum Mainnet
    1: "0x6c3ea9036406852006290770BEdFcAbA0e23A0e8",
    // Ethereum Sepolia (testnet) - using a mock address for testing
    11155111: "0x0000000000000000000000000000000000000000", // Will be replaced with mock token
    // Local hardhat network - will deploy mock token
    31337: "0x0000000000000000000000000000000000000000"
  };

  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  console.log("Network:", network.name);
  console.log("Chain ID:", chainId);

  let pyusdTokenAddress = PYUSD_ADDRESSES[chainId as keyof typeof PYUSD_ADDRESSES];
  
  // Deploy mock PYUSD token for local/testnet development
  if (chainId === 31337 || chainId === 11155111) {
    console.log("Deploying mock PYUSD token for development...");
    
    const MockPYUSD = await ethers.getContractFactory("MockPYUSD");
    const mockPyusd = await MockPYUSD.deploy();
    await mockPyusd.waitForDeployment();
    
    pyusdTokenAddress = await mockPyusd.getAddress();
    console.log("Mock PYUSD deployed to:", pyusdTokenAddress);
    
    // Mint some tokens to deployer for testing
    const mintAmount = ethers.parseUnits("1000000", 6); // 1M PYUSD (6 decimals)
    await mockPyusd.mint(deployer.address, mintAmount);
    console.log("Minted", ethers.formatUnits(mintAmount, 6), "PYUSD to deployer");
  }

  if (!pyusdTokenAddress || pyusdTokenAddress === "0x0000000000000000000000000000000000000000") {
    throw new Error(`PYUSD token address not configured for chain ID ${chainId}`);
  }

  // Set fee recipient (deployer for now, should be updated in production)
  const feeRecipient = deployer.address;

  // Deploy PaymentContract
  console.log("Deploying PaymentContract...");
  const PaymentContract = await ethers.getContractFactory("PaymentContract");
  const paymentContract = await PaymentContract.deploy(pyusdTokenAddress, feeRecipient);
  
  await paymentContract.waitForDeployment();
  const paymentContractAddress = await paymentContract.getAddress();
  
  console.log("PaymentContract deployed to:", paymentContractAddress);
  console.log("PYUSD Token address:", pyusdTokenAddress);
  console.log("Fee recipient:", feeRecipient);

  // Verify deployment
  console.log("\nVerifying deployment...");
  const contractStats = await paymentContract.getContractStats();
  console.log("Total payments:", contractStats[0].toString());
  console.log("Total volume:", ethers.formatUnits(contractStats[1], 6), "PYUSD");
  console.log("Contract balance:", ethers.formatUnits(contractStats[2], 6), "PYUSD");

  // Save deployment info
  const deploymentInfo = {
    network: network.name,
    chainId: chainId,
    paymentContract: paymentContractAddress,
    pyusdToken: pyusdTokenAddress,
    feeRecipient: feeRecipient,
    deployer: deployer.address,
    deploymentTime: new Date().toISOString(),
    blockNumber: await ethers.provider.getBlockNumber()
  };

  console.log("\nDeployment completed successfully!");
  console.log("Deployment info:", JSON.stringify(deploymentInfo, null, 2));

  return deploymentInfo;
}

// Handle errors
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });