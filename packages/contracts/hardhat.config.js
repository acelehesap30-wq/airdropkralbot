/**
 * NXT Token — Hardhat deployment configuration
 * Targets: BSC Testnet (free) and BSC Mainnet (low gas)
 *
 * Setup:
 *   1. cd packages/contracts
 *   2. npm install hardhat @nomicfoundation/hardhat-toolbox dotenv
 *   3. Create .env with DEPLOYER_PRIVATE_KEY and BSCSCAN_API_KEY
 *   4. npx hardhat compile
 *   5. npx hardhat run scripts/deploy.js --network bscTestnet
 */

require("dotenv").config();

const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY || "0x" + "0".repeat(64);
const BSCSCAN_API_KEY = process.env.BSCSCAN_API_KEY || "";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    // BSC Testnet — free BNB from faucet.bnbchain.org
    bscTestnet: {
      url: "https://data-seed-prebsc-1-s1.bnbchain.org:8545",
      chainId: 97,
      accounts: [DEPLOYER_KEY],
      gasPrice: 10000000000 // 10 gwei
    },
    // BSC Mainnet — ~$0.05 per deploy
    bscMainnet: {
      url: "https://bsc-dataseed1.bnbchain.org",
      chainId: 56,
      accounts: [DEPLOYER_KEY],
      gasPrice: 3000000000 // 3 gwei
    }
  },
  etherscan: {
    apiKey: {
      bscTestnet: BSCSCAN_API_KEY,
      bsc: BSCSCAN_API_KEY
    }
  },
  paths: {
    sources: "./src",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};
