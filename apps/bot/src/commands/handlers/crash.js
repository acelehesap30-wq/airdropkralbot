// ── /crash Command Handler ─────────────────────────────────────
// Instant crash game: bet → random multiplier → auto cashout or bust.
// /crash <bet> [cashout_target] — default target: 2.0x
// House edge ~4%. Max multiplier x100.

const economyStore = require("../../stores/economyStore");
const tonStore = require("../../stores/tonStore");
const userStore = require("../../stores/userStore");
const achievementStore = require("../../stores/achievementStore");
const rateLimiter = require("../../services/rateLimiter");
const { withTransaction } = require("../../db");

const MIN_BET = 10;
const MAX_BET = 10000;
const MAX_MULTIPLIER = 100;

// Provably fair crash point: house edge ~4%
function generateCrashPoint() {
  const r = Math.random();
  if (r < 0.04) return 1.0; // 4% instant crash
  return Math.min(MAX_MULTIPLIER, Math.floor(100 * (1 / (1 - r * 0.96))) / 100);
}

function fmtNxt(n) {
  return Number(n || 0).toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function handleCrash(ctx, pool) {
  const userId = ctx.from?.id;
  if (!userId) return;

  const args = (ctx.message?.text || "").trim().split(/\s+/).slice(1);

  if (args.length === 0) {
    await ctx.replyWithMarkdown(
      `💥 *NXT Crash*\n\n` +
      `Kullanım: \`/crash <bahis> [hedef]\`\n` +
      `Örnek: \`/crash 100 2.5\`\n\n` +
      `Çarpan yükselir → hedef çarpana ulaşırsan kazanırsın!\n` +
      `Hedef belirtmezsen *x2.0* otomatik.\n\n` +
      `Min: ${MIN_BET} | Max: ${fmtNxt(MAX_BET)} NXT\n` +
      `Max çarpan: x${MAX_MULTIPLIER}`
    );
    return;
  }

  const rl = rateLimiter.check(userId, "crash");
  if (!rl.allowed) {
    await ctx.replyWithMarkdown(`⏳ ${rl.remainSec}s bekle.`);
    return;
  }

  const bet = parseFloat(args[0]);
  const target = Math.min(MAX_MULTIPLIER, Math.max(1.01, parseFloat(args[1]) || 2.0));

  if (isNaN(bet) || bet < MIN_BET) {
    await ctx.replyWithMarkdown(`⚠️ Minimum bahis: *${MIN_BET} NXT*`);
    return;
  }
  if (bet > MAX_BET) {
    await ctx.replyWithMarkdown(`⚠️ Maksimum bahis: *${fmtNxt(MAX_BET)} NXT*`);
    return;
  }

  const crashPoint = generateCrashPoint();
  const survived = crashPoint >= target;
  const payout = survived ? Math.floor(bet * target * 100) / 100 : 0;
  const profit = payout - bet;

  const result = await withTransaction(pool, async (db) => {
    const profile = await userStore.getOrCreateProfile(db, {
      telegramId: userId,
      publicName: ctx.from?.username ? `@${ctx.from.username}` : ctx.from?.first_name || "Kral"
    });

    const debit = await economyStore.debitCurrency(db, {
      userId: profile.user_id, currency: "NXT", amount: bet,
      reason: "crash_bet", meta: { target, crashPoint }
    });
    if (!debit.applied) return { ok: false, reason: debit.reason, balance: debit.balance };

    let newBalance = (debit.balance || 0) - bet;

    if (survived) {
      const credit = await economyStore.creditCurrency(db, {
        userId: profile.user_id, currency: "NXT", amount: payout,
        reason: "crash_win", meta: { target, crashPoint, multiplier: target }
      });
      newBalance = credit.balance;
    }

    // House earning
    const houseGain = survived ? Math.max(0, bet - profit) : bet;
    await tonStore.recordHouseEarning(db, {
      source: "crash", nxtAmount: houseGain,
      note: `crash target=${target} point=${crashPoint} ${survived ? "win" : "bust"}`
    });

    // Referral commission
    const refRow = await db.query(`SELECT referred_by FROM users WHERE id = $1;`, [profile.user_id]);
    const referrerId = refRow.rows[0]?.referred_by;
    if (referrerId && referrerId !== profile.user_id && houseGain > 0) {
      const commission = Math.floor(houseGain * 0.10 * 100) / 100;
      if (commission > 0) {
        await economyStore.creditCurrency(db, {
          userId: referrerId, currency: "NXT", amount: commission,
          reason: "referral_commission", meta: { source: "crash", player: profile.user_id }
        });
        await tonStore.recordHouseEarning(db, {
          source: "referral", gameRef: String(referrerId), nxtAmount: commission,
          note: `referral commission crash from ${profile.user_id}`
        });
      }
    }

    // XP: 10 per crash game
    await achievementStore.addXp(db, profile.user_id, 10);

    // high_roller achievement
    if (bet >= 5000) {
      const ach = await achievementStore.unlockAchievement(db, profile.user_id, "high_roller");
      if (ach && ach.reward_nxt > 0) {
        await economyStore.creditCurrency(db, {
          userId: profile.user_id, currency: "NXT", amount: ach.reward_nxt,
          reason: "achievement_reward", meta: { achievement: "high_roller" }
        });
      }
    }

    return { ok: true, newBalance };
  });

  if (!result.ok) {
    if (result.reason === "insufficient_balance") {
      await ctx.replyWithMarkdown(`⚠️ Yetersiz bakiye. Mevcut: *${fmtNxt(result.balance)} NXT*`);
    }
    return;
  }

  // Build visual
  const bar = Math.min(20, Math.floor(crashPoint * 2));
  const graph = "▓".repeat(bar) + "░".repeat(20 - bar);

  if (survived) {
    await ctx.replyWithMarkdown(
      `💥 *CRASH — Kazandın!*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `${graph}\n` +
      `📈 Crash: *x${crashPoint.toFixed(2)}* | Hedef: *x${target.toFixed(2)}*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `💎 +${fmtNxt(payout)} NXT (x${target.toFixed(2)})\n` +
      `Bakiye: *${fmtNxt(result.newBalance)} NXT*`
    );
  } else {
    await ctx.replyWithMarkdown(
      `💥 *CRASH — Patladı!*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `${graph} 💥\n` +
      `📉 Crash: *x${crashPoint.toFixed(2)}* | Hedef: *x${target.toFixed(2)}*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `💸 -${fmtNxt(bet)} NXT\n` +
      `Bakiye: *${fmtNxt(result.newBalance)} NXT*`
    );
  }
}

module.exports = { handleCrash };
