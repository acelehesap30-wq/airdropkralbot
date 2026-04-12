// ── /stake & /unstake Command Handler ─────────────────────────
// NXT staking: lock NXT for 7+ days, earn 0.5% daily interest.
// /stake <amount> [days] — default 7 days
// /unstake — claim completed stakes or early exit (50% penalty)

const economyStore = require("../../stores/economyStore");
const userStore = require("../../stores/userStore");
const achievementStore = require("../../stores/achievementStore");
const { withTransaction } = require("../../db");

const MIN_STAKE = 100;
const MAX_STAKE = 100000;
const MIN_DAYS = 7;
const MAX_DAYS = 90;
const DAILY_RATE = 0.005; // 0.5% per day
const EARLY_EXIT_PENALTY = 0.50; // lose 50% of accrued interest

function fmtNxt(n) {
  return Number(n || 0).toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function handleStake(ctx, pool) {
  const userId = ctx.from?.id;
  if (!userId) return;

  const args = (ctx.message?.text || "").trim().split(/\s+/).slice(1);

  if (args.length === 0) {
    // Show stake info + active stakes
    const info = await withTransaction(pool, async (db) => {
      const profile = await userStore.getOrCreateProfile(db, {
        telegramId: userId,
        publicName: ctx.from?.username ? `@${ctx.from.username}` : ctx.from?.first_name || "Kral"
      });
      const stakes = await db.query(
        `SELECT id, amount, daily_rate, locked_until, accrued_interest, status, created_at
         FROM nxt_stakes WHERE user_id = $1 AND status = 'active'
         ORDER BY created_at DESC LIMIT 5;`,
        [profile.user_id]
      );
      return { stakes: stakes.rows };
    });

    let stakeLines = "_Aktif stake yok_";
    if (info.stakes.length > 0) {
      stakeLines = info.stakes.map((s, i) => {
        const daysLeft = Math.max(0, Math.ceil((new Date(s.locked_until) - new Date()) / 86400000));
        return `${i + 1}. *${fmtNxt(s.amount)} NXT* — ${daysLeft}g kaldı | Faiz: +${fmtNxt(s.accrued_interest)} NXT`;
      }).join("\n");
    }

    await ctx.replyWithMarkdown(
      `🔒 *NXT Staking*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Günlük faiz: *%${(DAILY_RATE * 100).toFixed(1)}*\n` +
      `Min: ${MIN_STAKE} NXT | Min süre: ${MIN_DAYS} gün\n\n` +
      `Kullanım: \`/stake <miktar> [gün]\`\n` +
      `Çözme: \`/unstake\`\n\n` +
      `*Aktif Stakelerim:*\n${stakeLines}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━`
    );
    return;
  }

  const amount = parseFloat(args[0]);
  const days = Math.min(MAX_DAYS, Math.max(MIN_DAYS, parseInt(args[1], 10) || MIN_DAYS));

  if (isNaN(amount) || amount < MIN_STAKE) {
    await ctx.replyWithMarkdown(`⚠️ Minimum stake: *${MIN_STAKE} NXT*`);
    return;
  }
  if (amount > MAX_STAKE) {
    await ctx.replyWithMarkdown(`⚠️ Maksimum stake: *${fmtNxt(MAX_STAKE)} NXT*`);
    return;
  }

  const result = await withTransaction(pool, async (db) => {
    const profile = await userStore.getOrCreateProfile(db, {
      telegramId: userId,
      publicName: ctx.from?.username ? `@${ctx.from.username}` : ctx.from?.first_name || "Kral"
    });

    // Check active stake count (max 3)
    const activeCount = await db.query(
      `SELECT COUNT(*) AS cnt FROM nxt_stakes WHERE user_id = $1 AND status = 'active';`,
      [profile.user_id]
    );
    if (Number(activeCount.rows[0]?.cnt || 0) >= 3) {
      return { ok: false, reason: "max_stakes" };
    }

    const debit = await economyStore.debitCurrency(db, {
      userId: profile.user_id, currency: "NXT", amount,
      reason: "stake_lock", meta: { days, dailyRate: DAILY_RATE }
    });
    if (!debit.applied) return { ok: false, reason: debit.reason, balance: debit.balance };

    const lockedUntil = new Date();
    lockedUntil.setUTCDate(lockedUntil.getUTCDate() + days);

    await db.query(
      `INSERT INTO nxt_stakes (user_id, amount, daily_rate, locked_until)
       VALUES ($1, $2, $3, $4);`,
      [profile.user_id, amount, DAILY_RATE, lockedUntil.toISOString().slice(0, 10)]
    );

    const expectedInterest = Math.floor(amount * DAILY_RATE * days * 100) / 100;

    return { ok: true, amount, days, expectedInterest, lockedUntil: lockedUntil.toISOString().slice(0, 10) };
  });

  if (!result.ok) {
    if (result.reason === "insufficient_balance") {
      await ctx.replyWithMarkdown(`⚠️ Yetersiz bakiye. Mevcut: *${fmtNxt(result.balance)} NXT*`);
    } else if (result.reason === "max_stakes") {
      await ctx.replyWithMarkdown("⚠️ Maksimum 3 aktif stake. Önce birini çöz: `/unstake`");
    }
    return;
  }

  await ctx.replyWithMarkdown(
    `🔒 *Stake Oluşturuldu!*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `💎 *${fmtNxt(result.amount)} NXT* kilitlendi\n` +
    `📅 Süre: *${result.days} gün* (${result.lockedUntil})\n` +
    `💰 Tahmini faiz: *+${fmtNxt(result.expectedInterest)} NXT*\n` +
    `📈 Günlük: *%${(DAILY_RATE * 100).toFixed(1)}*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `_Erken çıkış: %50 faiz cezası_`
  );
}

async function handleUnstake(ctx, pool) {
  const userId = ctx.from?.id;
  if (!userId) return;

  const result = await withTransaction(pool, async (db) => {
    const profile = await userStore.getOrCreateProfile(db, {
      telegramId: userId,
      publicName: ctx.from?.username ? `@${ctx.from.username}` : ctx.from?.first_name || "Kral"
    });

    const stakes = await db.query(
      `SELECT id, amount, daily_rate, locked_until, accrued_interest, created_at
       FROM nxt_stakes WHERE user_id = $1 AND status = 'active'
       ORDER BY created_at ASC LIMIT 1;`,
      [profile.user_id]
    );

    if (stakes.rows.length === 0) {
      return { ok: false, reason: "no_stakes" };
    }

    const stake = stakes.rows[0];
    const now = new Date();
    const lockedUntil = new Date(stake.locked_until);
    const isEarly = now < lockedUntil;

    // Calculate interest: days elapsed * daily_rate * amount
    const daysElapsed = Math.max(1, Math.floor((now - new Date(stake.created_at)) / 86400000));
    const rawInterest = Number(stake.amount) * Number(stake.daily_rate) * daysElapsed;
    const interest = isEarly
      ? Math.floor(rawInterest * (1 - EARLY_EXIT_PENALTY) * 100) / 100
      : Math.floor(rawInterest * 100) / 100;

    const totalReturn = Number(stake.amount) + interest;

    // Credit back principal + interest
    const credit = await economyStore.creditCurrency(db, {
      userId: profile.user_id, currency: "NXT", amount: totalReturn,
      reason: isEarly ? "stake_early_exit" : "stake_complete",
      meta: { stakeId: stake.id, principal: Number(stake.amount), interest, daysElapsed, isEarly }
    });

    // Mark completed
    await db.query(
      `UPDATE nxt_stakes SET status = $2, completed_at = now(), accrued_interest = $3
       WHERE id = $1;`,
      [stake.id, isEarly ? "early_exit" : "completed", interest]
    );

    // XP: 20 for completing stake
    await achievementStore.addXp(db, profile.user_id, 20);

    return {
      ok: true,
      principal: Number(stake.amount),
      interest,
      totalReturn,
      daysElapsed,
      isEarly,
      newBalance: credit.balance
    };
  });

  if (!result.ok) {
    if (result.reason === "no_stakes") {
      await ctx.replyWithMarkdown("⚠️ Aktif stake yok. `/stake <miktar>` ile başla.");
    }
    return;
  }

  const statusEmoji = result.isEarly ? "⚠️" : "✅";
  const penaltyLine = result.isEarly ? `\n_Erken çıkış: %50 faiz cezası uygulandı_` : "";

  await ctx.replyWithMarkdown(
    `${statusEmoji} *Stake Çözüldü!*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `💎 Anapara: *${fmtNxt(result.principal)} NXT*\n` +
    `💰 Faiz (${result.daysElapsed}g): *+${fmtNxt(result.interest)} NXT*\n` +
    `📊 Toplam: *${fmtNxt(result.totalReturn)} NXT*\n` +
    `Bakiye: *${fmtNxt(result.newBalance)} NXT*${penaltyLine}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━`
  );
}

module.exports = { handleStake, handleUnstake };
