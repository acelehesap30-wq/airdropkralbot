import { toNano } from "@ton/core";
import { compile, NetworkProvider } from "@ton/blueprint";
import {
  JettonMinter,
  buildJettonOnchainMetadata,
} from "../wrappers/JettonMinter";

/**
 * Deploy NXT Jetton Minter to TON
 *
 * Usage:
 *   npx blueprint run deployJettonMinter --testnet
 *   npx blueprint run deployJettonMinter --mainnet --tonconnect
 */
export async function run(provider: NetworkProvider) {
  // ── Compile contracts ──
  const minterCode = await compile("JettonMinter");
  const walletCode = await compile("JettonWallet");

  // ── Metadata URI ──
  // Host this JSON at a public URL (GitHub raw, IPFS, etc.)
  const metadataUri =
    "https://raw.githubusercontent.com/acelehesap30-wq/airdropkralbot/main/packages/contracts-ton/metadata/nxt-jetton.json";

  const content = buildJettonOnchainMetadata(metadataUri);

  // ── Create minter ──
  const minter = provider.open(
    JettonMinter.createFromConfig(
      {
        admin: provider.sender().address!,
        content,
        walletCode,
      },
      minterCode
    )
  );

  // ── Deploy ──
  console.log("");
  console.log("═══════════════════════════════════════════════════");
  console.log("  NXT Jetton Minter — TON Deployment");
  console.log("═══════════════════════════════════════════════════");
  console.log(`  Admin:    ${provider.sender().address}`);
  console.log(`  Minter:   ${minter.address}`);
  console.log(`  Metadata: ${metadataUri}`);
  console.log("═══════════════════════════════════════════════════");
  console.log("");

  await minter.sendDeploy(provider.sender(), toNano("0.25"));

  await provider.waitForDeploy(minter.address);

  // ── Verify deployment ──
  const data = await minter.getJettonData();
  console.log("");
  console.log("✅ NXT Jetton Minter Deployed Successfully!");
  console.log("═══════════════════════════════════════════════════");
  console.log(`  Contract:     ${minter.address}`);
  console.log(`  Total Supply: ${data.totalSupply} (nano)`);
  console.log(`  Mintable:     ${data.mintable}`);
  console.log(`  Admin:        ${data.adminAddress}`);
  console.log("═══════════════════════════════════════════════════");
  console.log("");
  console.log("📋 Next steps:");
  console.log(`  1. Mint initial supply: npx blueprint run mint`);
  console.log(`  2. Add to .env: NXT_JETTON_MINTER=${minter.address}`);
  console.log(`  3. View on explorer:`);
  console.log(
    `     https://tonviewer.com/${minter.address}`
  );
}
