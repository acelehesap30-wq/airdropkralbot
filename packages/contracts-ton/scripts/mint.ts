import { Address, toNano } from "@ton/core";
import { NetworkProvider } from "@ton/blueprint";
import { JettonMinter } from "../wrappers/JettonMinter";

/**
 * Mint NXT tokens to a recipient
 *
 * Usage:
 *   npx blueprint run mint --testnet
 *   npx blueprint run mint --mainnet --tonconnect
 *
 * Environment:
 *   NXT_JETTON_MINTER - minter contract address (from deploy step)
 */
// Deployed mainnet minter — 2026-04-04
const MAINNET_MINTER = "EQCb-sIWT2PmHdcuenhplHqEWWDecvPN_8ONoZ2J9A0WLkC_";

export async function run(provider: NetworkProvider) {
  const minterAddress = (process.env.NXT_JETTON_MINTER || MAINNET_MINTER).trim();
  if (!minterAddress) {
    console.error("❌ No minter address found");
    process.exit(1);
  }

  const minter = provider.open(
    JettonMinter.createFromAddress(Address.parse(minterAddress))
  );

  // ── Mint parameters ──
  // Initial supply: 10,000,000 NXT (matching BSC ERC-20 initial mint)
  // NXT has 9 decimals on TON (standard TON Jetton decimals)
  const DECIMALS = 9;
  const INITIAL_SUPPLY = 10_000_000n; // 10M NXT
  const jettonAmount = INITIAL_SUPPLY * (10n ** BigInt(DECIMALS));

  const adminAddress = provider.sender().address!;

  console.log("");
  console.log("═══════════════════════════════════════════════════");
  console.log("  NXT Jetton Mint — Initial Supply");
  console.log("═══════════════════════════════════════════════════");
  console.log(`  Minter:    ${minterAddress}`);
  console.log(`  Recipient: ${adminAddress} (admin/treasury)`);
  console.log(`  Amount:    ${INITIAL_SUPPLY.toLocaleString()} NXT`);
  console.log(`  Raw:       ${jettonAmount} (nano)`);
  console.log("═══════════════════════════════════════════════════");
  console.log("");

  await minter.sendMint(provider.sender(), {
    toAddress: adminAddress,
    jettonAmount,
    forwardTonAmount: toNano("0.05"),
    totalTonAmount: toNano("0.15"),
  });

  console.log("⏳ Waiting for confirmation...");

  // Wait a bit then check
  await new Promise((resolve) => setTimeout(resolve, 15_000));

  const data = await minter.getJettonData();
  const supplyHuman = Number(data.totalSupply) / (10 ** DECIMALS);

  console.log("");
  console.log("✅ Mint Complete!");
  console.log(`  Total Supply: ${supplyHuman.toLocaleString()} NXT`);
  console.log(`  Admin:        ${data.adminAddress}`);
  console.log("");
  console.log("📋 Token is now live! Add to runtime config:");
  console.log(
    JSON.stringify(
      {
        jetton_minter: minterAddress,
        chain: "TON",
        decimals: DECIMALS,
        symbol: "NXT",
        name: "AirdropKral Nexus",
        initial_supply: INITIAL_SUPPLY.toString(),
      },
      null,
      2
    )
  );
}
