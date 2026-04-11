// ── Deposit Poller ──────────────────────────────────────────
// Polls TON hot wallet for incoming transfers every 30s.
// Matches deposits to users via memo (NK-{userId}).
// Credits NXT to user's in-game balance.

const tonService = require("./tonService");
const tonStore = require("../stores/tonStore");
const economyStore = require("../stores/economyStore");
const tokenEngine = require("./tokenEngine");
const { NXT_DECIMALS, MIN_DEPOSIT_TON } = require("../../../../packages/shared/src/tonConstants");

const BASE_INTERVAL_MS = 30_000;   // 30s when active
const MAX_INTERVAL_MS = 300_000;   // 5min when idle
const BACKOFF_FACTOR = 1.5;        // multiply each idle tick
let _currentInterval = BASE_INTERVAL_MS;
let _idleTicks = 0;
let _timer = null;
let _running = false;
let _db = null;
let _bot = null;
let _runtimeConfig = null;

function _scheduleNext() {
  if (_timer) clearTimeout(_timer);
  _timer = setTimeout(() => {
    tick().catch(err => {
      console.error("[depositPoller] tick error:", err.message);
    }).finally(() => _scheduleNext());
  }, _currentInterval);
}

function start(db, bot, runtimeConfig) {
  if (_timer) return;
  _db = db;
  _bot = bot;
  _runtimeConfig = runtimeConfig;

  console.log(`[depositPoller] Starting — base interval ${BASE_INTERVAL_MS / 1000}s, backoff up to ${MAX_INTERVAL_MS / 1000}s`);
  _scheduleNext();

  // Initial tick after 5s
  setTimeout(() => tick().catch(err => {
    console.error("[depositPoller] initial tick error:", err.message);
  }), 5000);
}

function stop() {
  if (_timer) {
    clearTimeout(_timer);
    _timer = null;
  }
  _currentInterval = BASE_INTERVAL_MS;
  _idleTicks = 0;
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
      // Activity detected → reset to fast polling
      _idleTicks = 0;
      _currentInterval = BASE_INTERVAL_MS;
      console.log(`[depositPoller] Credited ${credited} new deposit(s) — interval reset to ${BASE_INTERVAL_MS / 1000}s`);
    } else {
      // No new deposits → backoff
      _idleTicks++;
      _currentInterval = Math.min(MAX_INTERVAL_MS, Math.round(BASE_INTERVAL_MS * Math.pow(BACKOFF_FACTOR, _idleTicks)));
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
