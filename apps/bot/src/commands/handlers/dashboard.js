// ── /dashboard Admin Command ─────────────────────────────────
// Comprehensive admin dashboard: revenue, volume, users, system health.
// Admin-only — call with ensureAdminCtx guard.

const tonService = require("../../services/tonService");
const tonStore = require("../../stores/tonStore");
const economyStore = require("../../stores/economyStore");
const nxtPriceOracle = require("../../services/nxtPriceOracle");
const { withTransaction } = require("../../db");

function fmtNum(n, dec = 2) {
  return Number(n || 0).toLocaleString("en", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

async function handleDashboard(ctx, pool) {
  const now = new Date();
  const utcStr = now.toISOString().slice(0, 16).replace("T", " ") + " UTC";

  const data = await withTransaction(pool, async (db) => {
    // ── 24h house earnings ──────────────────────
    const houseStats = await tonStore.getHouseStats(db, 24);

    // ── Total sweep ─────────────────────────────
    const totalSwept = await tonStore.getTotalSwept(db);

    // ── 24h deposit volume ──────────────────────
    const depositStats = await db.query(
      `SELECT COUNT(*) AS cnt, COALESCE(SUM(ton_amount), 0) AS ton_vol, COALESCE(SUM(nxt_credited), 0) AS nxt_vol
       FROM ton_deposits
       WHERE created_at > now() - interval '24 hours';`
    );
    const dep = depositStats.rows[0] || {};

    // ── 24h withdrawal volume ───────────────────
    const withdrawStats = await db.query(
      `SELECT COUNT(*) AS cnt,
              COALESCE(SUM(CASE WHEN status = 'confirmed' THEN nano_amount ELSE 0 END), 0) AS confirmed_vol,
              COALESCE(SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END), 0) AS failed_cnt
       FROM nxt_transfers
       WHERE created_at > now() - interval '24 hours';`
    );
    const wd = withdrawStats.rows[0] || {};

    // ── Active users (24h) ──────────────────────
    const activeResult = await db.query(
      `SELECT COUNT(DISTINCT user_id) AS cnt
       FROM daily_counters
       WHERE day_date >= CURRENT_DATE - 1;`
    );

    // ── Total users ─────────────────────────────
    const totalUsersResult = await db.query(
      `SELECT COUNT(*) AS cnt FROM users;`
    );

    // ── NXT supply in circulation ───────────────
    const supplyResult = await db.query(
      `SELECT COALESCE(SUM(balance), 0) AS total FROM currency_balances WHERE currency = 'NXT';`
    );

    // ── Referral stats (24h) ────────────────────
    const refStats = await db.query(
      `SELECT COUNT(*) AS cnt, COALESCE(SUM(nxt_amount), 0) AS total_nxt
       FROM house_ledger
       WHERE source = 'referral' AND created_at > now() - interval '24 hours';`
    );
    const ref = refStats.rows[0] || {};

    // ── Duel stats (24h) ────────────────────────
    const duelStats = await db.query(
      `SELECT COUNT(*) AS cnt, COALESCE(SUM(nxt_amount), 0) AS total_nxt
       FROM house_ledger
       WHERE source = 'duel' AND created_at > now() - interval '24 hours';`
    );
    const duel = duelStats.rows[0] || {};

    // ── Daily checkins today ────────────────────
    const checkinStats = await db.query(
      `SELECT COUNT(*) AS cnt, COALESCE(SUM(reward_nxt), 0) AS total_nxt
       FROM daily_checkins
       WHERE checkin_date = CURRENT_DATE;`
    ).catch(() => ({ rows: [{ cnt: 0, total_nxt: 0 }] }));
    const ck = checkinStats.rows[0] || {};

    return {
      houseStats,
      totalSwept,
      dep,
      wd,
      activeUsers: Number(activeResult.rows[0]?.cnt || 0),
      totalUsers: Number(totalUsersResult.rows[0]?.cnt || 0),
      nxtCirculation: Number(supplyResult.rows[0]?.total || 0),
      ref,
      duel,
      ck
    };
  });

  // Hot wallet balance
  const hotBal = await tonService.getTonBalanceNum().catch(() => 0);
  const ready = tonService.isReady();

  // Oracle price
  let priceInfo = { tonUsd: 0, nxtUsd: 0 };
  try {
    priceInfo = nxtPriceOracle.getCachedPrice();
  } catch { /* oracle may not be started */ }

  const msg =
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `⬡ *ADMIN DASHBOARD*\n` +
    `${utcStr}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n\n` +

    `📊 *24h Gelir*\n` +
    `├ House NXT: *${fmtNum(data.houseStats.total_nxt)}*\n` +
    `├ Düello: *${fmtNum(data.duel.total_nxt)}* (${data.duel.cnt} maç)\n` +
    `├ Referral: *${fmtNum(data.ref.total_nxt)}* (${data.ref.cnt} ödeme)\n` +
    `└ Toplam: *${fmtNum(data.houseStats.total_nxt)}* NXT\n\n` +

    `💰 *Deposit / Withdraw (24h)*\n` +
    `├ Deposit: *${data.dep.cnt}* tx → ${fmtNum(data.dep.ton_vol, 4)} TON (${fmtNum(data.dep.nxt_vol)} NXT)\n` +
    `├ Withdraw: *${data.wd.cnt}* tx, ${Number(data.wd.failed_cnt || 0)} fail\n` +
    `└ Checkin: *${data.ck.cnt}* claim → ${fmtNum(data.ck.total_nxt)} NXT\n\n` +

    `👥 *Kullanıcı*\n` +
    `├ Aktif (2g): *${data.activeUsers}*\n` +
    `├ Toplam: *${data.totalUsers}*\n` +
    `└ NXT Sirkülasyon: *${fmtNum(data.nxtCirculation)}*\n\n` +

    `🔧 *Sistem*\n` +
    `├ SDK: ${ready ? "✅" : "❌"} | Hot: ${fmtNum(hotBal, 4)} TON\n` +
    `├ Sweep: ${fmtNum(data.totalSwept, 4)} TON (toplam)\n` +
    `├ TON/USD: $${fmtNum(priceInfo.tonUsd)} | NXT: $${fmtNum(priceInfo.nxtUsd, 6)}\n` +
    `└ Oracle: ${priceInfo.tonUsd > 0 ? "✅ Aktif" : "⚠️ Kapalı"}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━`;

  await ctx.replyWithMarkdown(msg);
}

module.exports = { handleDashboard };
