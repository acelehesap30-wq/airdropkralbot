// ── /flip Command Handler ─────────────────────────────────────
// Simple coin flip: /flip heads 100 or /flip tails 100
// Win: x1.96 (house edge ~2%). Min 10, Max 10000 NXT.

const economyStore = require("../../stores/economyStore");
const tonStore = require("../../stores/tonStore");
const userStore = require("../../stores/userStore");
const achievementStore = require("../../stores/achievementStore");
const rateLimiter = require("../../services/rateLimiter");
const { withTransaction } = require("../../db");

const MIN_BET = 10;
const MAX_BET = 10000;
const WIN_MULTIPLIER = 1.96; // house edge ~2%

function fmtNxt(n) {
  return Number(n || 0).toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function handleFlip(ctx, pool) {
  const userId = ctx.from?.id;
  if (!userId) return;

  const args = (ctx.message?.text || "").trim().split(/\s+/).slice(1);

  if (args.length < 2) {
    await ctx.replyWithMarkdown(
      `🪙 *Yazı Tura*\n\n` +
      `Kullanım: \`/flip <heads|tails> <bahis>\`\n` +
      `Örnek: \`/flip heads 100\`\n\n` +
      `Kazanç: x${WIN_MULTIPLIER} | Min: ${MIN_BET} | Max: ${fmtNxt(MAX_BET)} NXT`
    );
    return;
  }

  const rl = rateLimiter.check(userId, "slot"); // shares slot cooldown (3s)
  if (!rl.allowed) {
    await ctx.replyWithMarkdown(`⏳ ${rl.remainSec}s bekle.`);
    return;
  }

  const side = args[0].toLowerCase();
  if (side !== "heads" && side !== "tails" && side !== "yazi" && side !== "tura") {
    await ctx.replyWithMarkdown("⚠️ `heads` (yazı) veya `tails` (tura) seç.");
    return;
  }

  const bet = parseFloat(args[1]);
  if (isNaN(bet) || bet < MIN_BET) {
    await ctx.replyWithMarkdown(`⚠️ Minimum bahis: *${MIN_BET} NXT*`);
    return;
  }
  if (bet > MAX_BET) {
    await ctx.replyWithMarkdown(`⚠️ Maksimum bahis: *${fmtNxt(MAX_BET)} NXT*`);
    return;
  }

  const playerChoice = (side === "heads" || side === "yazi") ? "heads" : "tails";
  const coinResult = Math.random() < 0.5 ? "heads" : "tails";
  const won = playerChoice === coinResult;
  const payout = won ? Math.floor(bet * WIN_MULTIPLIER * 100) / 100 : 0;
  const profit = payout - bet;

  const result = await withTransaction(pool, async (db) => {
    const profile = await userStore.getOrCreateProfile(db, {
      telegramId: userId,
      publicName: ctx.from?.username ? `@${ctx.from.username}` : ctx.from?.first_name || "Kral"
    });

    const debit = await economyStore.debitCurrency(db, {
      userId: profile.user_id,
      currency: "NXT",
      amount: bet,
      reason: "flip_bet",
      meta: { choice: playerChoice, result: coinResult }
    });

    if (!debit.applied) {
      return { ok: false, reason: debit.reason, balance: debit.balance };
    }

    let newBalance = (debit.balance || 0) - bet;

    if (won) {
      const credit = await economyStore.creditCurrency(db, {
        userId: profile.user_id,
        currency: "NXT",
        amount: payout,
        reason: "flip_win",
        meta: { choice: playerChoice, result: coinResult, multiplier: WIN_MULTIPLIER }
      });
      newBalance = credit.balance;
    }

    // House earning
    const houseGain = won ? bet - (payout - bet) : bet; // simplified: bet - net_payout
    const actualHouse = won ? Math.max(0, bet * (1 - (WIN_MULTIPLIER - 1))) : bet;
    await tonStore.recordHouseEarning(db, {
      source: "flip",
      nxtAmount: actualHouse,
      note: `flip ${playerChoice} vs ${coinResult} bet=${bet} ${won ? "win" : "loss"}`
    });

    // Referral commission
    const refRow = await db.query(`SELECT referred_by FROM users WHERE id = $1;`, [profile.user_id]);
    const referrerId = refRow.rows[0]?.referred_by;
    if (referrerId && referrerId !== profile.user_id) {
      const commission = Math.floor(actualHouse * 0.10 * 100) / 100;
      if (commission > 0) {
        await economyStore.creditCurrency(db, {
          userId: referrerId, currency: "NXT", amount: commission,
          reason: "referral_commission", meta: { source: "flip", player: profile.user_id }
        });
        await tonStore.recordHouseEarning(db, {
          source: "referral", gameRef: String(referrerId), nxtAmount: commission,
          note: `referral commission flip from ${profile.user_id}`
        });
      }
    }

    // XP: 3 per flip
    await achievementStore.addXp(db, profile.user_id, 3);

    return { ok: true, newBalance };
  });

  if (!result.ok) {
    if (result.reason === "insufficient_balance") {
      await ctx.replyWithMarkdown(`⚠️ Yetersiz bakiye. Mevcut: *${fmtNxt(result.balance)} NXT*`);
    }
    return;
  }

  const coinEmoji = coinResult === "heads" ? "🟡" : "🔵";
  const choiceLabel = playerChoice === "heads" ? "Yazı" : "Tura";
  const resultLabel = coinResult === "heads" ? "Yazı" : "Tura";

  if (won) {
    await ctx.replyWithMarkdown(
      `🪙 ${coinEmoji} *${resultLabel}!*\n\n` +
      `✅ Seçimin: *${choiceLabel}* — Kazandın!\n` +
      `💎 +${fmtNxt(payout)} NXT (x${WIN_MULTIPLIER})\n` +
      `Bakiye: *${fmtNxt(result.newBalance)} NXT*`
    );
  } else {
    await ctx.replyWithMarkdown(
      `🪙 ${coinEmoji} *${resultLabel}!*\n\n` +
      `❌ Seçimin: *${choiceLabel}* — Kaybettin\n` +
      `💸 -${fmtNxt(bet)} NXT\n` +
      `Bakiye: *${fmtNxt(result.newBalance)} NXT*`
    );
  }
}

module.exports = { handleFlip };
