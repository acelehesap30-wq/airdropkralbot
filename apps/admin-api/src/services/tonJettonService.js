"use strict";

/**
 * TON Jetton Service — NXT Token On-Chain Operations
 *
 * Provides:
 *   - mintNXT(toAddress, amount)  — mint NXT to a TON wallet
 *   - balanceNXT(ownerAddress)    — check NXT balance
 *   - transferNXT(to, amount)     — transfer from treasury
 *   - getJettonData()             — contract metadata + total supply
 *
 * Requires environment:
 *   NXT_JETTON_MINTER    — deployed Jetton Minter contract address
 *   TON_ADMIN_MNEMONIC   — 24-word mnemonic of the admin wallet
 *   TONCENTER_API_KEY     — API key for toncenter.com
 *   TON_NETWORK           — "mainnet" | "testnet" (default: testnet)
 */

let TonClient, WalletContractV4, internal, Address, Cell, beginCell, toNano, mnemonicToPrivateKey;
let _initialized = false;

async function ensureImports() {
  if (_initialized) return;
  // Dynamic import for ESM modules
  const tonCore = await import("@ton/core");
  const tonTon = await import("@ton/ton");
  const tonCrypto = await import("@ton/crypto");

  Address = tonCore.Address;
  Cell = tonCore.Cell;
  beginCell = tonCore.beginCell;
  toNano = tonCore.toNano;
  internal = tonCore.internal;

  TonClient = tonTon.TonClient;
  WalletContractV4 = tonTon.WalletContractV4;

  mnemonicToPrivateKey = tonCrypto.mnemonicToPrivateKey;
  _initialized = true;
}

/**
 * Create and return a configured TON Jetton service instance.
 */
async function createTonJettonService(config = {}) {
  await ensureImports();

  const minterAddress = config.minterAddress || process.env.NXT_JETTON_MINTER || "";
  const adminMnemonic = config.adminMnemonic || process.env.TON_ADMIN_MNEMONIC || "";
  const apiKey = config.apiKey || process.env.TONCENTER_API_KEY || "";
  const network = config.network || process.env.TON_NETWORK || "testnet";

  if (!minterAddress) {
    console.warn("[tonJettonService] NXT_JETTON_MINTER not set — service disabled");
    return createDisabledService("NXT_JETTON_MINTER not configured");
  }

  const endpoint = network === "mainnet"
    ? "https://toncenter.com/api/v2/jsonRPC"
    : "https://testnet.toncenter.com/api/v2/jsonRPC";

  const client = new TonClient({ endpoint, apiKey });
  const minter = Address.parse(minterAddress);

  // NXT uses 9 decimals (TON Jetton standard)
  const DECIMALS = 9;
  const NANO_MULTIPLIER = BigInt(10 ** DECIMALS);

  /**
   * Get admin wallet keypair + contract
   */
  async function getAdminWallet() {
    if (!adminMnemonic) {
      throw new Error("TON_ADMIN_MNEMONIC not configured");
    }
    const mnemonicArray = adminMnemonic.split(" ").filter(Boolean);
    if (mnemonicArray.length !== 24) {
      throw new Error("TON_ADMIN_MNEMONIC must be 24 words");
    }
    const keypair = await mnemonicToPrivateKey(mnemonicArray);
    const wallet = WalletContractV4.create({
      publicKey: keypair.publicKey,
      workchain: 0,
    });
    return { wallet, keypair, contract: client.open(wallet) };
  }

  /**
   * Build a mint message body (op::mint = 21)
   */
  function buildMintBody(toAddr, jettonAmount, forwardTonAmount = toNano("0.05"), queryId = 0n) {
    return beginCell()
      .storeUint(21, 32)           // op::mint
      .storeUint(queryId, 64)
      .storeAddress(toAddr)
      .storeCoins(jettonAmount)
      .storeCoins(forwardTonAmount)
      .endCell();
  }

  /**
   * Mint NXT to a recipient TON address.
   * @param {string} toAddressStr — recipient wallet address (EQ.../UQ...)
   * @param {number} amount — human-readable NXT amount (e.g. 100 = 100 NXT)
   * @returns {{ success: boolean, seqno?: number, jettonAmount?: string, error?: string }}
   */
  async function mintNXT(toAddressStr, amount) {
    try {
      const toAddr = Address.parse(String(toAddressStr).trim());
      const jettonAmount = BigInt(Math.floor(amount * (10 ** DECIMALS)));
      if (jettonAmount <= 0n) {
        return { success: false, error: "amount_must_be_positive" };
      }

      const { contract, keypair } = await getAdminWallet();
      const seqno = await contract.getSeqno();

      await contract.sendTransfer({
        secretKey: keypair.secretKey,
        seqno,
        messages: [
          {
            to: minter,
            value: toNano("0.15"),
            body: buildMintBody(toAddr, jettonAmount),
          },
        ],
      });

      return {
        success: true,
        seqno,
        jettonAmount: jettonAmount.toString(),
        humanAmount: amount,
        recipient: toAddressStr,
        chain: "TON",
        minter: minterAddress,
      };
    } catch (err) {
      console.error("[tonJettonService] mintNXT error:", err);
      return { success: false, error: err.message || "mint_failed" };
    }
  }

  /**
   * Check NXT balance for a TON address.
   * Uses TEP-89 get_wallet_address to find the user's jetton wallet.
   */
  async function balanceNXT(ownerAddressStr) {
    try {
      const ownerAddr = Address.parse(String(ownerAddressStr).trim());

      // Call get_wallet_address on the minter
      const result = await client.runMethod(minter, "get_wallet_address", [
        {
          type: "slice",
          cell: beginCell().storeAddress(ownerAddr).endCell(),
        },
      ]);
      const walletAddress = result.stack.readAddress();

      // Read wallet data
      try {
        const walletResult = await client.runMethod(walletAddress, "get_wallet_data", []);
        const data = walletResult.stack.readCell().beginParse();
        const balance = data.loadCoins();
        const humanBalance = Number(balance) / (10 ** DECIMALS);
        return {
          success: true,
          balance: balance.toString(),
          humanBalance,
          walletAddress: walletAddress.toString(),
          owner: ownerAddressStr,
        };
      } catch {
        // Wallet doesn't exist yet (no tokens received)
        return {
          success: true,
          balance: "0",
          humanBalance: 0,
          walletAddress: walletAddress.toString(),
          owner: ownerAddressStr,
        };
      }
    } catch (err) {
      console.error("[tonJettonService] balanceNXT error:", err);
      return { success: false, error: err.message || "balance_check_failed" };
    }
  }

  /**
   * Get Jetton contract data (total supply, admin, etc.)
   */
  async function getJettonData() {
    try {
      const result = await client.runMethod(minter, "get_jetton_data", []);
      const totalSupply = result.stack.readBigNumber();
      const mintable = result.stack.readBoolean();
      const adminAddress = result.stack.readAddress();
      const humanSupply = Number(totalSupply) / (10 ** DECIMALS);

      return {
        success: true,
        totalSupply: totalSupply.toString(),
        humanTotalSupply: humanSupply,
        mintable,
        adminAddress: adminAddress.toString(),
        minterAddress,
        chain: "TON",
        decimals: DECIMALS,
        symbol: "NXT",
        name: "AirdropKral Nexus",
        network,
      };
    } catch (err) {
      console.error("[tonJettonService] getJettonData error:", err);
      return { success: false, error: err.message || "jetton_data_failed" };
    }
  }

  return {
    mintNXT,
    balanceNXT,
    getJettonData,
    minterAddress,
    network,
    decimals: DECIMALS,
    enabled: true,
  };
}

/**
 * Disabled service stub (when config is missing)
 */
function createDisabledService(reason) {
  const disabled = () => ({ success: false, error: reason, enabled: false });
  return {
    mintNXT: async () => disabled(),
    balanceNXT: async () => disabled(),
    getJettonData: async () => disabled(),
    minterAddress: "",
    network: "disabled",
    decimals: 9,
    enabled: false,
  };
}

module.exports = { createTonJettonService };
