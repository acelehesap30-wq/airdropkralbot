// ── Deposit Poller ──────────────────────────────────────────
// Polls TON hot wallet for incoming transfers every 30s.
// Matches deposits to users via memo (NK-{userId}).
// Credits NXT to user's in-game balance.

const tonService = require("./tonService");
const tonStore = require("../stores/tonStore");
const economyStore = require("../stores/economyStore");
const tokenEngine = require("./tokenEngine");
const { NXT_DECIMALS, MIN_DEPOSIT_TON } = require("../../../../packages/shared/src/tonConstants");

const POLL_INTERVAL_MS = 30_000;
let _timer = null;
let _running = false;
let _db = null;
let _bot = null;
let _runtimeConfig = null;

function start(db, bot, runtimeConfig) {
  if (_timer) return;
  _db = db;
  _bot = bot;
  _runtimeConfig = runtimeConfig;

  console.log("[depositPoller] Starting — polling every 30s");
  _timer = setInterval(() => tick().catch(err => {
    console.error("[depositPoller] tick error:", err.message);
  }), POLL_INTERVAL_MS);

  // Initial tick after 5s
  setTimeout(() => tick().catch(err => {
    console.error("[depositPoller] initial tick error:", err.message);
  }), 5000);
}

function stop() {
  if (_timer) {
    clearInterval(_timer);
    _timer = null;
  }
  console.log("[depositPoller] Stopped");
}

function updateConfig(runtimeConfig) {
  _runtimeConfig = runtimeConfig;
}

async function tick() {
  if (_running) return;
  _running = true;

  try {
    const transactions = await tonService.getRecentTransactions(30);
    if (!transactions || transactions.length === 0) {
      _running = false;
      return;
    }

    let credited = 0;
    for (const tx of transactions) {
      try {
        const result = await processDeposit(tx);
        if (result) credited++;
      } catch (err) {
        console.error(`[depositPoller] processDeposit failed for ${tx.txHash}:`, err.message);
      }
    }

    if (credited > 0) {
      console.log(`[depositPoller] Credited ${credited} new deposit(s)`);
    }
  } finally {
    _running = false;
  }
}

async function processDeposit(tx) {
  // Must have a user ID in memo
  if (!tx.userId) return null;

  // Check if already processed
  const existing = await tonStore.getDepositByTxHash(_db, tx.txHash);
  if (existing) return null; // Already processed

  // Calculate NXT credit amount
  const tokenConfig = tokenEngine.normalizeTokenConfig(_runtimeConfig);
  const nxtRate = getNxtPerTon(tokenConfig);
  const nxtAmount = roundTo(tx.tonAmount * nxtRate, NXT_DECIMALS);

  if (nxtAmount <= 0) return null;

  // Record deposit
  const deposit = await tonStore.recordDeposit(_db, {
    userId: tx.userId,
    txHash: tx.txHash,
    fromAddress: tx.fromAddress,
    tonAmount: tx.tonAmount,
    nxtCredited: nxtAmount,
    nxtRate,
    memo: tx.memo
  });

  if (!deposit) return null; // Duplicate (race condition)

  // Credit NXT to user's in-game balance
  try {
    await economyStore.creditCurrency(_db, {
      userId: tx.userId,
      currency: "NXT",
      amount: nxtAmount,
      reason: "ton_deposit",
      meta: { txHash: tx.txHash, tonAmount: tx.tonAmount, nxtRate },
      refEventId: `deposit:${tx.txHash}`
    });
  } catch (err) {
    console.error(`[depositPoller] creditCurrency failed for user ${tx.userId}:`, err.message);
    // Deposit is recorded but credit failed — admin can reconcile
    return null;
  }

  // Notify user via bot
  if (_bot) {
    try {
      const tonFormatted = tx.tonAmount.toFixed(4);
      const nxtFormatted = nxtAmount.toLocaleString("en", { maximumFractionDigits: 2 });
      const msg =
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `⬡ *Yatırım Onaylandı*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `💎 \\+${escMd(nxtFormatted)} NXT\n` +
        `⟡  ${escMd(tonFormatted)} TON → NXT\n` +
        `━━━━━━━━━━━━━━━━━━━━━━`;

      await _bot.telegram.sendMessage(tx.userId, msg, { parse_mode: "MarkdownV2" });
    } catch {
      // User may have blocked bot — ignore
    }
  }

  return deposit;
}

function getNxtPerTon(tokenConfig) {
  // Use curve price if available, otherwise fallback
  const usdPrice = Math.max(0.00001, tokenConfig?.usd_price || 0.001);
  // Assume 1 TON ≈ $3 (will be replaced with oracle)
  const tonUsd = Number(process.env.TON_USD_PRICE || 3);
  return roundTo(tonUsd / usdPrice, NXT_DECIMALS);
}

function roundTo(value, decimals = 9) {
  const m = 10 ** Math.max(0, decimals);
  return Math.round(value * m) / m;
}

function escMd(str) {
  return String(str || "").replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}

module.exports = { start, stop, updateConfig, tick, processDeposit };
