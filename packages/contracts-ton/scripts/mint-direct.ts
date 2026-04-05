/**
 * Direct NXT Mint — bypasses Blueprint CLI cache issues
 *
 * Usage:
 *   cd packages/contracts-ton
 *   npx ts-node scripts/mint-direct.ts
 */
import { TonClient, WalletContractV4 } from "@ton/ton";
import { Address, toNano, beginCell, internal } from "@ton/core";
import { mnemonicToPrivateKey } from "@ton/crypto";
import * as readline from "readline";

const MINTER = "EQCb-sIwT2PmHdcuenhplHqEWWDecvPN_8ONoZ2J9A0WLkC_";
const DECIMALS = 9;
const INITIAL_SUPPLY = 10_000_000n;
const JETTON_AMOUNT = INITIAL_SUPPLY * (10n ** BigInt(DECIMALS));

function ask(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans.trim()); }));
}

async function main() {
  console.log("");
  console.log("═══════════════════════════════════════════════════");
  console.log("  NXT Jetton Mint — Direct (no Blueprint)");
  console.log("═══════════════════════════════════════════════════");
  console.log(`  Minter:  ${MINTER}`);
  console.log(`  Amount:  ${INITIAL_SUPPLY.toLocaleString()} NXT`);
  console.log("═══════════════════════════════════════════════════");
  console.log("");

  // Verify address first
  const minterAddr = Address.parse(MINTER);
  console.log("✅ Minter address valid:", minterAddr.toString());

  const mnemonic = await ask("Enter admin wallet mnemonic (24 words): ");
  const words = mnemonic.split(/\s+/).filter(Boolean);
  if (words.length !== 24) {
    console.error("❌ Need exactly 24 words");
    process.exit(1);
  }

  const keypair = await mnemonicToPrivateKey(words);
  const wallet = WalletContractV4.create({ publicKey: keypair.publicKey, workchain: 0 });

  const client = new TonClient({
    endpoint: "https://toncenter.com/api/v2/jsonRPC",
  });

  const contract = client.open(wallet);
  const adminAddr = wallet.address;
  console.log(`  Admin:   ${adminAddr.toString()}`);

  const balance = await client.getBalance(adminAddr);
  console.log(`  Balance: ${Number(balance) / 1e9} TON`);

  if (balance < toNano("0.2")) {
    console.error("❌ Need at least 0.2 TON for gas");
    process.exit(1);
  }

  const confirm = await ask("\nMint 10M NXT to admin wallet? (y/n): ");
  if (confirm.toLowerCase() !== "y") {
    console.log("Cancelled.");
    process.exit(0);
  }

  const seqno = await contract.getSeqno();
  console.log(`  Seqno:   ${seqno}`);

  const mintBody = beginCell()
    .storeUint(21, 32)       // op::mint
    .storeUint(0, 64)        // query_id
    .storeAddress(adminAddr) // to_address
    .storeCoins(JETTON_AMOUNT) // jetton_amount
    .storeCoins(toNano("0.05")) // forward_ton_amount
    .endCell();

  await contract.sendTransfer({
    secretKey: keypair.secretKey,
    seqno,
    messages: [
      internal({
        to: minterAddr,
        value: toNano("0.15"),
        body: mintBody,
      }),
    ],
  });

  console.log("\n⏳ Transaction sent! Waiting 15s for confirmation...");
  await new Promise(r => setTimeout(r, 15_000));

  // Check result
  try {
    const result = await client.runMethod(minterAddr, "get_jetton_data", []);
    const totalSupply = result.stack.readBigNumber();
    const supplyHuman = Number(totalSupply) / (10 ** DECIMALS);
    console.log(`\n✅ Mint Complete! Total Supply: ${supplyHuman.toLocaleString()} NXT`);
  } catch (e) {
    console.log("\n⚠ Could not verify — check on tonviewer.com");
  }

  console.log(`\n📋 View: https://tonviewer.com/${MINTER}`);
}

main().catch(e => { console.error(e); process.exit(1); });
