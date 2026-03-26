/**
 * Deploy NXT Token to BSC
 *
 * Usage:
 *   npx hardhat run scripts/deploy.js --network bscTestnet
 *   npx hardhat run scripts/deploy.js --network bscMainnet
 *
 * After deploy:
 *   1. Copy the contract address to .env (NXT_CONTRACT_ADDRESS)
 *   2. Add minter address: npx hardhat run scripts/addMinter.js --network bscTestnet
 *   3. Verify on BscScan: npx hardhat verify --network bscTestnet <address> <treasuryAddress>
 */

const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const balance = await hre.ethers.provider.getBalance(deployer.address);

  console.log("═══════════════════════════════════════");
  console.log("  NXT Token Deployment — AirdropKral");
  console.log("═══════════════════════════════════════");
  console.log(`Network:  ${hre.network.name}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance:  ${hre.ethers.formatEther(balance)} BNB`);
  console.log("");

  // Treasury = deployer initially (transfer later if needed)
  const treasuryAddress = process.env.TREASURY_ADDRESS || deployer.address;
  console.log(`Treasury: ${treasuryAddress}`);

  // Deploy
  console.log("\nDeploying NXTToken...");
  const NXTToken = await hre.ethers.getContractFactory("NXTToken");
  const token = await NXTToken.deploy(treasuryAddress);
  await token.waitForDeployment();

  const contractAddress = await token.getAddress();
  const totalSupply = await token.totalSupply();
  const treasuryBalance = await token.balanceOf(treasuryAddress);

  console.log("\n✅ NXT Token Deployed!");
  console.log("═══════════════════════════════════════");
  console.log(`Contract:        ${contractAddress}`);
  console.log(`Name:            ${await token.name()}`);
  console.log(`Symbol:          ${await token.symbol()}`);
  console.log(`Decimals:        ${await token.decimals()}`);
  console.log(`Total Supply:    ${hre.ethers.formatEther(totalSupply)} NXT`);
  console.log(`Treasury Balance:${hre.ethers.formatEther(treasuryBalance)} NXT`);
  console.log(`Max Supply:      1,000,000,000 NXT`);
  console.log("═══════════════════════════════════════");

  // Output env-ready config
  console.log("\n📋 Add to your .env file:");
  console.log(`NXT_CONTRACT_ADDRESS=${contractAddress}`);
  console.log(`NXT_CONTRACT_NETWORK=${hre.network.name}`);
  console.log(`NXT_CONTRACT_CHAIN_ID=${hre.network.config.chainId}`);
  console.log(`NXT_TREASURY_ADDRESS=${treasuryAddress}`);

  // Output for tokenEngine integration
  console.log("\n📋 Add to runtime_config.token.onchain:");
  console.log(JSON.stringify({
    contract_address: contractAddress,
    chain: "BSC",
    chain_id: hre.network.config.chainId,
    explorer: hre.network.name === "bscMainnet"
      ? `https://bscscan.com/token/${contractAddress}`
      : `https://testnet.bscscan.com/token/${contractAddress}`,
    treasury: treasuryAddress,
    decimals: 18,
    initial_supply: "10000000"
  }, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deploy failed:", error);
    process.exit(1);
  });
