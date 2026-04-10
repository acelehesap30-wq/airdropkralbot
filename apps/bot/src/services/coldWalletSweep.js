// ── Cold Wallet Sweep ───────────────────────────────────────
// Periodically transfers house TON profits to owner's cold wallet.
// Default: daily at 02:00 UTC. Can be triggered manually via /admin sweep.

const tonService = require("./tonService");
const tonStore = require("../stores/tonStore");
const { SWEEP_DEFAULT_PCT, SWEEP_DEFAULT_THRESHOLD_TON } = require("../../../../packages/shared/src/tonConstants");

const SWEEP_CHECK_INTERVAL_MS = 60 * 60 * 1000; // Check every hour
let _timer = null;
let _db = null;
let _bot = null;
let _lastSweepDate = null;

function start(db, bot) {
  if (_timer) return;
  _db = db;
  _bot = bot;

  console.log("[coldWalletSweep] Starting — checking hourly, sweeps at 02:00 UTC");
  _timer = setInterval(() => autoCheck().catch(err => {
    console.error("[coldWalletSweep] autoCheck error:", err.message);
  }), SWEEP_CHECK_INTERVAL_MS);
}

function stop() {
  if (_timer) {
    clearInterval(_timer);
    _timer = null;
  }
}

async function autoCheck() {
  const now = new Date();
  const hour = now.getUTCHours();
  const dateKey = now.toISOString().slice(0, 10); // "2026-04-10"

  // Only sweep once per day, at 02:00 UTC
  if (hour !== 2) return;
  if (_lastSweepDate === dateKey) return;

  console.log("[coldWalletSweep] Auto sweep triggered");
  const result = await executeSweep("auto");
  if (result.success) {
    _lastSweepDate = dateKey;
  }
  return result;
}

async function executeSweep(triggeredBy = "auto") {
  const coldWallet = process.env.COLD_WALLET_ADDRESS;
  if (!coldWallet) {
    return { success: false, reason: "no_cold_wallet_configured" };
  }

  if (!tonService.isReady()) {
    return { success: false, reason: "ton_service_not_ready" };
  }

  // Calculate sweep amount
  const calc = await tonService.calculateSweepAmount();
  if (!calc.canSweep) {
    console.log(`[coldWalletSweep] Skip — ${calc.reason} (balance: ${calc.balance} TON)`);
    return { success: false, reason: calc.reason, balance: calc.balance };
  }

  // Record the sweep intent
  const sweep = await tonStore.recordSweep(_db, {
    tonAmount: calc.sweepAmount,
    toAddress: coldWallet,
    triggeredBy
  });

  try {
    // Execute the TON transfer
    const txResult = await tonService.sendTon(coldWallet, calc.sweepAmount);

    // Confirm the sweep
    await tonStore.confirmSweep(_db, sweep.id, `seqno:${txResult.seqno}`);

    console.log(`[coldWalletSweep] ✓ Swept ${calc.sweepAmount} TON → ${coldWallet}`);

    // Notify admin
    if (_bot) {
      notifyAdmin(calc.sweepAmount, coldWallet, triggeredBy);
    }

    return {
      success: true,
      tonAmount: calc.sweepAmount,
      toAddress: coldWallet,
      sweepId: sweep.id,
      triggeredBy
    };
  } catch (err) {
    // Mark sweep as failed
    await tonStore.failSweep(_db, sweep.id, err.message);
    console.error(`[coldWalletSweep] ✗ Sweep failed:`, err.message);

    if (_bot) {
      notifyAdminError(err.message);
    }

    return { success: false, reason: "tx_failed", error: err.message };
  }
}

function notifyAdmin(amount, address, triggeredBy) {
  const adminChatId = process.env.ADMIN_CHAT_ID;
  if (!adminChatId || !_bot) return;

  const msg =
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `⬡ *House Sweep Tamamlandı*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `⟡  ${amount.toFixed(4)} TON\n` +
    `📍 ${address.slice(0, 8)}…${address.slice(-6)}\n` +
    `🔧 ${triggeredBy}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━`;

  _bot.telegram.sendMessage(adminChatId, msg, { parse_mode: "Markdown" }).catch(() => {});
}

function notifyAdminError(errorMsg) {
  const adminChatId = process.env.ADMIN_CHAT_ID;
  if (!adminChatId || !_bot) return;

  _bot.telegram.sendMessage(
    adminChatId,
    `⚠️ *Sweep Başarısız*\n\`${String(errorMsg).slice(0, 200)}\``,
    { parse_mode: "Markdown" }
  ).catch(() => {});
}

module.exports = { start, stop, executeSweep, autoCheck };
