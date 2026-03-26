/**
 * Add a minter address to NXT Token
 * The minter (backend hot wallet) can mint tokens when users convert SC/HC/RC → NXT
 *
 * Usage:
 *   MINTER_ADDRESS=0x... npx hardhat run scripts/addMinter.js --network bscTestnet
 */

const hre = require("hardhat");

async function main() {
  const contractAddress = process.env.NXT_CONTRACT_ADDRESS;
  if (!contractAddress) {
    throw new Error("Set NXT_CONTRACT_ADDRESS in .env");
  }

  const minterAddress = process.env.MINTER_ADDRESS;
  if (!minterAddress) {
    throw new Error("Set MINTER_ADDRESS env var (the backend hot wallet)");
  }

  const [deployer] = await hre.ethers.getSigners();
  console.log(`Owner:    ${deployer.address}`);
  console.log(`Contract: ${contractAddress}`);
  console.log(`Minter:   ${minterAddress}`);

  const NXTToken = await hre.ethers.getContractFactory("NXTToken");
  const token = NXTToken.attach(contractAddress);

  const tx = await token.addMinter(minterAddress);
  await tx.wait();

  console.log(`\n✅ Minter added: ${minterAddress}`);
  console.log(`   TX: ${tx.hash}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Failed:", error);
    process.exit(1);
  });
