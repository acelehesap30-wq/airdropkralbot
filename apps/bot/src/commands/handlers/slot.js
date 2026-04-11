// ── /slot Command Handler ─────────────────────────────────────
// Telegram slot machine: /slot <bet_amount>
// 3 reels, 5 symbols. House edge ~12%.
// Min bet: 10 NXT, Max bet: 10000 NXT.

const economyStore = require("../../stores/economyStore");
const tonStore = require("../../stores/tonStore");
const userStore = require("../../stores/userStore");
const achievementStore = require("../../stores/achievementStore");
const rateLimiter = require("../../services/rateLimiter");
const { withTransaction } = require("../../db");

const SYMBOLS = ["💎", "⚡", "🔥", "🎯", "⬡"];
const WEIGHTS = [8, 15, 22, 28, 27]; // rarer = higher multiplier
const WEIGHT_TOTAL = WEIGHTS.reduce((a, b) => a + b, 0);

// Payout table: [3-match multiplier, 2-match multiplier]
const PAYOUTS = {
  "💎": [25, 3],   // jackpot
  "⚡": [10, 2],
  "🔥": [5, 1.5],
  "🎯": [3, 1],
  "⬡":  [2, 0.8]
};

const MIN_BET = 10;
const MAX_BET = 10000;
const HOUSE_FEE_PCT = 0.08;

function spin() {
  const reels = [];
  for (let i = 0; i < 3; i++) {
    let r = Math.random() * WEIGHT_TOTAL;
    for (let j = 0; j < SYMBOLS.length; j++) {
      r -= WEIGHTS[j];
      if (r <= 0) { reels.push(SYMBOLS[j]); break; }
    }
    if (reels.length <= i) reels.push(SYMBOLS[SYMBOLS.length - 1]);
  }
  return reels;
}

function calcPayout(reels, bet) {
  const counts = {};
  for (const s of reels) counts[s] = (counts[s] || 0) + 1;

  // 3 of a kind
  for (const [sym, cnt] of Object.entries(counts)) {
    if (cnt === 3) return { multiplier: PAYOUTS[sym][0], symbol: sym, type: "jackpot" };
  }
  // 2 of a kind (first found)
  for (const [sym, cnt] of Object.entries(counts)) {
    if (cnt === 2) return { multiplier: PAYOUTS[sym][1], symbol: sym, type: "pair" };
  }
  return { multiplier: 0, symbol: null, type: "miss" };
}

function escMd(str) {
  return String(str || "").replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}

function fmtNxt(n) {
  return Number(n || 0).toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function handleSlot(ctx, pool) {
  const userId = ctx.from?.id;
  if (!userId) return;

  const text = ctx.message?.text || "";
  const args = text.trim().split(/\s+/).slice(1);

  if (args.length > 0) {
    const rl = rateLimiter.check(userId, "slot");
    if (!rl.allowed) {
      await ctx.replyWithMarkdown(`⏳ ${rl.remainSec}s bekle.`);
      return;
    }
  }

  if (args.length === 0) {
    await ctx.replyWithMarkdown(
      `🎰 *NXT Slot Makinesi*\n\n` +
      `Kullanım: \`/slot <bahis>\`\nÖrnek: \`/slot 100\`\n\n` +
      `Min: ${MIN_BET} NXT | Max: ${fmtNxt(MAX_BET)} NXT\n\n` +
      `*Ödeme Tablosu (3x)*\n` +
      `💎💎💎 → x25\n⚡⚡⚡ → x10\n🔥🔥🔥 → x5\n🎯🎯🎯 → x3\n⬡⬡⬡ → x2`
    );
    return;
  }

  const bet = parseFloat(args[0]);
  if (isNaN(bet) || bet < MIN_BET) {
    await ctx.replyWithMarkdown(`⚠️ Minimum bahis: *${MIN_BET} NXT*`);
    return;
  }
  if (bet > MAX_BET) {
    await ctx.replyWithMarkdown(`⚠️ Maksimum bahis: *${fmtNxt(MAX_BET)} NXT*`);
    return;
  }

  const reels = spin();
  const result = calcPayout(reels, bet);
  const grossWin = Math.floor(bet * result.multiplier * 100) / 100;
  const houseFee = result.multiplier > 0 ? Math.floor(grossWin * HOUSE_FEE_PCT * 100) / 100 : 0;
  const netWin = grossWin - houseFee;
  const profit = netWin - bet; // negative if loss

  const txResult = await withTransaction(pool, async (db) => {
    const profile = await userStore.getOrCreateProfile(db, {
      telegramId: userId,
      publicName: ctx.from?.username ? `@${ctx.from.username}` : ctx.from?.first_name || "Kral"
    });

    // Debit bet
    const debit = await economyStore.debitCurrency(db, {
      userId: profile.user_id,
      currency: "NXT",
      amount: bet,
      reason: "slot_bet",
      meta: { reels, multiplier: result.multiplier }
    });

    if (!debit.applied) {
      return { ok: false, reason: debit.reason, balance: debit.balance };
    }

    // Credit winnings (if any)
    let newBalance = debit.balance - bet; // post-debit approx
    if (netWin > 0) {
      const credit = await economyStore.creditCurrency(db, {
        userId: profile.user_id,
        currency: "NXT",
        amount: netWin,
        reason: "slot_win",
        meta: { reels, multiplier: result.multiplier, grossWin, houseFee }
      });
      newBalance = credit.balance;
    }

    // Record house fee
    if (houseFee > 0) {
      await tonStore.recordHouseEarning(db, {
        source: "slot",
        nxtAmount: houseFee,
        note: `slot ${result.type} ${reels.join("")} x${result.multiplier}`
      });
    }

    // House keeps the bet on a miss
    if (result.multiplier === 0) {
      await tonStore.recordHouseEarning(db, {
        source: "slot",
        nxtAmount: bet,
        note: `slot miss ${reels.join("")}`
      });
    }

    // Referral commission on house earnings
    const houseNxt = result.multiplier === 0 ? bet : houseFee;
    if (houseNxt > 0) {
      const refRow = await db.query(`SELECT referred_by FROM users WHERE id = $1;`, [profile.user_id]);
      const referrerId = refRow.rows[0]?.referred_by;
      if (referrerId && referrerId !== profile.user_id) {
        const commission = Math.floor(houseNxt * 0.10 * 100) / 100;
        if (commission > 0) {
          await economyStore.creditCurrency(db, {
            userId: referrerId, currency: "NXT", amount: commission,
            reason: "referral_commission", meta: { source: "slot", player: profile.user_id }
          });
          await tonStore.recordHouseEarning(db, {
            source: "referral", gameRef: String(referrerId), nxtAmount: commission,
            note: `referral commission slot from ${profile.user_id}`
          });
        }
      }
    }

    // XP: 5 per spin
    const xpResult = await achievementStore.addXp(db, profile.user_id, 5);

    // Achievements
    if (bet >= 5000) {
      const ach = await achievementStore.unlockAchievement(db, profile.user_id, "high_roller");
      if (ach && ach.reward_nxt > 0) {
        await economyStore.creditCurrency(db, {
          userId: profile.user_id, currency: "NXT", amount: ach.reward_nxt,
          reason: "achievement_reward", meta: { achievement: "high_roller" }
        });
      }
    }

    return { ok: true, newBalance, profileId: profile.user_id, xpResult };
  });

  if (!txResult.ok) {
    if (txResult.reason === "insufficient_balance") {
      await ctx.replyWithMarkdown(`⚠️ Yetersiz bakiye. Mevcut: *${fmtNxt(txResult.balance)} NXT*`);
    } else {
      await ctx.replyWithMarkdown("⚠️ İşlem başarısız. Tekrar deneyin.");
    }
    return;
  }

  // Build result message
  const reelLine = `  ${reels[0]}  ${reels[1]}  ${reels[2]}  `;
  let resultText;

  if (result.type === "jackpot") {
    resultText =
      `🎰 *JACKPOT\\!* 🎰\n` +
      `▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔\n` +
      `┃ ${escMd(reelLine)} ┃\n` +
      `▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔\n` +
      `💎 x${result.multiplier} — *\\+${escMd(fmtNxt(netWin))} NXT*\n` +
      `Bakiye: *${escMd(fmtNxt(txResult.newBalance))} NXT*`;
  } else if (result.type === "pair") {
    resultText =
      `🎰 *Kazandın\\!*\n` +
      `▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔\n` +
      `┃ ${escMd(reelLine)} ┃\n` +
      `▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔\n` +
      `${escMd(result.symbol)} x${result.multiplier} — *\\+${escMd(fmtNxt(netWin))} NXT*\n` +
      `Bakiye: *${escMd(fmtNxt(txResult.newBalance))} NXT*`;
  } else {
    resultText =
      `🎰 *Kaybettin*\n` +
      `▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔\n` +
      `┃ ${escMd(reelLine)} ┃\n` +
      `▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔\n` +
      `\\-${escMd(fmtNxt(bet))} NXT\n` +
      `Bakiye: *${escMd(fmtNxt(txResult.newBalance))} NXT*`;
  }

  await ctx.reply(resultText, { parse_mode: "MarkdownV2" });
}

module.exports = { handleSlot };
