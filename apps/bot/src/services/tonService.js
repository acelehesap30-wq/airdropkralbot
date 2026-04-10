// ── TON Service — Hot Wallet & NXT Jetton Operations ────────
// Uses @ton/ton SDK for all on-chain interactions.

const { TonClient, WalletContractV4, internal, toNano, fromNano, Address } = require("@ton/ton");
const { mnemonicToPrivateKey } = require("@ton/crypto");
const {
  NXT_JETTON_MASTER,
  NXT_NANO_MULTIPLIER,
  NXT_DECIMALS,
  TON_NANO_MULTIPLIER,
  TONAPI_BASE,
  JETTON_FORWARD_TON,
  HOT_WALLET_GAS_RESERVE_TON,
  buildDepositMemo,
  parseDepositMemo,
  MIN_DEPOSIT_TON
} = require("../../../../packages/shared/src/tonConstants");

let _client = null;
let _wallet = null;
let _keyPair = null;
let _hotAddress = null;
let _initialized = false;

// ── Init ──────────────────────────────────────────────────────
async function init() {
  if (_initialized) return;

  const mnemonic = process.env.TON_HOT_WALLET_MNEMONIC;
  if (!mnemonic) {
    console.warn("[tonService] TON_HOT_WALLET_MNEMONIC not set — running in read-only mode");
    _initialized = true;
    return;
  }

  const endpoint = process.env.TON_RPC_URL || "https://toncenter.com/api/v2/jsonRPC";
  const apiKey = process.env.TONCENTER_API_KEY || "";

  _client = new TonClient({ endpoint, apiKey: apiKey || undefined });
  _keyPair = await mnemonicToPrivateKey(mnemonic.trim().split(/\s+/));
  _wallet = WalletContractV4.create({ publicKey: _keyPair.publicKey, workchain: 0 });
  _hotAddress = _wallet.address.toString({ bounceable: false });

  console.log(`[tonService] Hot wallet initialized: ${_hotAddress}`);
  _initialized = true;
}

function getHotAddress() {
  return _hotAddress || process.env.TON_HOT_WALLET_ADDRESS || "";
}

function isReady() {
  return _initialized && _client !== null && _wallet !== null;
}

// ── Balance Queries ───────────────────────────────────────────
async function getTonBalance() {
  if (!_client || !_wallet) return 0n;
  const contract = _client.open(_wallet);
  return await contract.getBalance();
}

async function getTonBalanceNum() {
  const raw = await getTonBalance();
  return Number(raw) / TON_NANO_MULTIPLIER;
}

async function getAddressTonBalance(address) {
  if (!_client) return 0n;
  return await _client.getBalance(Address.parse(address));
}

// ── TON Transfers ─────────────────────────────────────────────
async function sendTon(toAddress, tonAmount) {
  if (!isReady()) throw new Error("tonService not initialized with wallet");

  const contract = _client.open(_wallet);
  const seqno = await contract.getSeqno();
  const nanoAmount = toNano(String(tonAmount));

  await contract.sendTransfer({
    secretKey: _keyPair.secretKey,
    seqno,
    messages: [
      internal({
        to: Address.parse(toAddress),
        value: nanoAmount,
        bounce: false,
        body: "AirdropKral house sweep"
      })
    ]
  });

  // Wait for transaction to be processed
  let attempts = 0;
  while (attempts < 30) {
    await sleep(2000);
    const currentSeqno = await contract.getSeqno();
    if (currentSeqno > seqno) break;
    attempts++;
  }

  return { success: true, seqno, amount: tonAmount };
}

// ── NXT Jetton Transfers ──────────────────────────────────────
async function sendNxt(toAddress, nxtAmount) {
  if (!isReady()) throw new Error("tonService not initialized with wallet");

  const contract = _client.open(_wallet);
  const seqno = await contract.getSeqno();

  // Build jetton transfer payload
  const jettonMaster = Address.parse(NXT_JETTON_MASTER);
  const destination = Address.parse(toAddress);
  const nanoNxt = BigInt(Math.floor(nxtAmount * NXT_NANO_MULTIPLIER));

  // Get our jetton wallet address
  const jettonWalletAddress = await getJettonWalletAddress(_hotAddress);
  if (!jettonWalletAddress) throw new Error("Could not resolve hot wallet jetton address");

  // Jetton transfer message (op::transfer = 0xf8a7ea5)
  const { beginCell } = require("@ton/core");
  const transferBody = beginCell()
    .storeUint(0xf8a7ea5, 32)   // op: transfer
    .storeUint(0, 64)            // query_id
    .storeCoins(nanoNxt)         // amount (jetton)
    .storeAddress(destination)   // destination
    .storeAddress(_wallet.address) // response_destination
    .storeBit(false)             // no custom payload
    .storeCoins(toNano("0.01")) // forward_ton_amount
    .storeBit(false)             // no forward payload
    .endCell();

  await contract.sendTransfer({
    secretKey: _keyPair.secretKey,
    seqno,
    messages: [
      internal({
        to: Address.parse(jettonWalletAddress),
        value: toNano(String(JETTON_FORWARD_TON)),
        bounce: true,
        body: transferBody
      })
    ]
  });

  let attempts = 0;
  while (attempts < 30) {
    await sleep(2000);
    const currentSeqno = await contract.getSeqno();
    if (currentSeqno > seqno) break;
    attempts++;
  }

  return { success: true, seqno, nxtAmount, toAddress };
}

// ── Jetton Wallet Resolution ──────────────────────────────────
async function getJettonWalletAddress(ownerAddress) {
  try {
    const apiKey = process.env.TONAPI_KEY || "";
    const url = `${TONAPI_BASE}/accounts/${encodeURIComponent(ownerAddress)}/jettons/${encodeURIComponent(NXT_JETTON_MASTER)}`;
    const headers = apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const data = await res.json();
    return data.wallet_address?.address || null;
  } catch {
    return null;
  }
}

async function getJettonBalance(ownerAddress) {
  try {
    const apiKey = process.env.TONAPI_KEY || "";
    const url = `${TONAPI_BASE}/accounts/${encodeURIComponent(ownerAddress)}/jettons/${encodeURIComponent(NXT_JETTON_MASTER)}`;
    const headers = apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(10000) });
    if (!res.ok) return 0;
    const data = await res.json();
    const raw = BigInt(data.balance || "0");
    return Number(raw) / NXT_NANO_MULTIPLIER;
  } catch {
    return 0;
  }
}

// ── Deposit Polling (via TonAPI) ──────────────────────────────
async function getRecentTransactions(limit = 50) {
  if (!_hotAddress && !process.env.TON_HOT_WALLET_ADDRESS) return [];
  const address = _hotAddress || process.env.TON_HOT_WALLET_ADDRESS;

  try {
    const apiKey = process.env.TONAPI_KEY || "";
    const url = `${TONAPI_BASE}/accounts/${encodeURIComponent(address)}/events?limit=${limit}`;
    const headers = apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.events || []).map(parseEvent).filter(Boolean);
  } catch (err) {
    console.error("[tonService] getRecentTransactions failed:", err.message);
    return [];
  }
}

function parseEvent(event) {
  try {
    const actions = event.actions || [];
    for (const action of actions) {
      if (action.type === "TonTransfer" && action.TonTransfer) {
        const tx = action.TonTransfer;
        const toAddr = tx.recipient?.address;
        const hotAddr = _hotAddress || process.env.TON_HOT_WALLET_ADDRESS || "";

        // Only incoming transfers to our hot wallet
        if (!toAddr || !hotAddr) continue;
        if (!addressesMatch(toAddr, hotAddr)) continue;

        const tonAmount = Number(tx.amount || 0) / TON_NANO_MULTIPLIER;
        if (tonAmount < MIN_DEPOSIT_TON) continue;

        const comment = tx.comment || "";
        const userId = parseDepositMemo(comment);

        return {
          eventId: event.event_id,
          txHash: event.event_id, // TonAPI uses event_id as unique ref
          fromAddress: tx.sender?.address || "",
          tonAmount,
          memo: comment,
          userId,
          timestamp: event.timestamp ? new Date(event.timestamp * 1000) : new Date()
        };
      }

      // Also check jetton transfers (NXT incoming)
      if (action.type === "JettonTransfer" && action.JettonTransfer) {
        const jt = action.JettonTransfer;
        if (jt.jetton?.address !== NXT_JETTON_MASTER) continue;
        // Handle jetton deposits if needed in future
      }
    }
    return null;
  } catch {
    return null;
  }
}

function addressesMatch(a, b) {
  try {
    const addrA = Address.parse(a).toRawString();
    const addrB = Address.parse(b).toRawString();
    return addrA === addrB;
  } catch {
    return String(a).toLowerCase() === String(b).toLowerCase();
  }
}

// ── Sweep Calculation ─────────────────────────────────────────
async function calculateSweepAmount() {
  const balance = await getTonBalanceNum();
  const reserve = HOT_WALLET_GAS_RESERVE_TON;
  const sweepPct = Number(process.env.SWEEP_PERCENT || 95) / 100;
  const threshold = Number(process.env.SWEEP_THRESHOLD_TON || 1.0);

  const available = Math.max(0, balance - reserve);
  if (available < threshold) return { canSweep: false, balance, available, reason: "below_threshold" };

  const sweepAmount = Math.floor(available * sweepPct * 1e9) / 1e9; // Round to 9 decimals
  return { canSweep: true, balance, available, sweepAmount };
}

// ── Utils ─────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

module.exports = {
  init,
  isReady,
  getHotAddress,
  getTonBalance,
  getTonBalanceNum,
  getAddressTonBalance,
  sendTon,
  sendNxt,
  getJettonWalletAddress,
  getJettonBalance,
  getRecentTransactions,
  calculateSweepAmount,
  addressesMatch
};
