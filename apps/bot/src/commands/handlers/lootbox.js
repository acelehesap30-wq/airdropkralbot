// ── /lootbox Command Handler ──────────────────────────────────
// NXT loot boxes: Bronze (50), Silver (200), Gold (1000)
// House edge ~12-15% via weighted RNG.

const economyStore = require("../../stores/economyStore");
const tonStore = require("../../stores/tonStore");
const userStore = require("../../stores/userStore");
const achievementStore = require("../../stores/achievementStore");
const rateLimiter = require("../../services/rateLimiter");
const { withTransaction } = require("../../db");

const BOXES = {
  bronze: { price: 50,   emoji: "🥉", label: "Bronze",  min: 20,   max: 120,  weights: [40, 30, 20, 10] },
  silver: { price: 200,  emoji: "🥈", label: "Silver",  min: 80,   max: 500,  weights: [35, 30, 20, 15] },
  gold:   { price: 1000, emoji: "🥇", label: "Gold",    min: 400,  max: 5000, weights: [30, 30, 25, 15] }
};

// Weighted quartile rewards: [low, mid-low, mid-high, high]
function rollReward(box) {
  const quartiles = [
    box.min + (box.max - box.min) * 0.15,
    box.min + (box.max - box.min) * 0.35,
    box.min + (box.max - box.min) * 0.65,
    box.min + (box.max - box.min) * 1.0
  ];
  let r = Math.random() * box.weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < box.weights.length; i++) {
    r -= box.weights[i];
    if (r <= 0) {
      const lo = i === 0 ? box.min : quartiles[i - 1];
      const hi = quartiles[i];
      return Math.round(lo + Math.random() * (hi - lo));
    }
  }
  return box.min;
}

function fmtNxt(n) {
  return Number(n || 0).toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function handleLootbox(ctx, pool) {
  const userId = ctx.from?.id;
  if (!userId) return;

  const args = (ctx.message?.text || "").trim().split(/\s+/).slice(1);
  const tier = (args[0] || "").toLowerCase();

  if (!BOXES[tier]) {
    await ctx.replyWithMarkdown(
      `🎁 *NXT Loot Box*\n\n` +
      `Kullanım: \`/lootbox <tier>\`\n\n` +
      `🥉 Bronze — *50 NXT* (20-120 NXT)\n` +
      `🥈 Silver — *200 NXT* (80-500 NXT)\n` +
      `🥇 Gold — *1000 NXT* (400-5000 NXT)\n\n` +
      `Örnek: \`/lootbox gold\``
    );
    return;
  }

  const rl = rateLimiter.check(userId, "lootbox");
  if (!rl.allowed) {
    await ctx.replyWithMarkdown(`⏳ ${rl.remainSec}s bekle.`);
    return;
  }

  const box = BOXES[tier];
  const reward = rollReward(box);
  const profit = reward - box.price;
  const isWin = profit > 0;

  const result = await withTransaction(pool, async (db) => {
    const profile = await userStore.getOrCreateProfile(db, {
      telegramId: userId,
      publicName: ctx.from?.username ? `@${ctx.from.username}` : ctx.from?.first_name || "Kral"
    });

    const debit = await economyStore.debitCurrency(db, {
      userId: profile.user_id,
      currency: "NXT",
      amount: box.price,
      reason: "lootbox_buy",
      meta: { tier, boxPrice: box.price }
    });

    if (!debit.applied) {
      return { ok: false, reason: debit.reason, balance: debit.balance };
    }

    // Credit reward
    const credit = await economyStore.creditCurrency(db, {
      userId: profile.user_id,
      currency: "NXT",
      amount: reward,
      reason: "lootbox_reward",
      meta: { tier, reward, profit }
    });

    // House earning = price - reward (if positive)
    const houseGain = Math.max(0, box.price - reward);
    if (houseGain > 0) {
      await tonStore.recordHouseEarning(db, {
        source: "lootbox",
        nxtAmount: houseGain,
        note: `lootbox ${tier} price=${box.price} reward=${reward}`
      });
    }

    // XP: 15 per lootbox
    const xpResult = await achievementStore.addXp(db, profile.user_id, 15);

    return { ok: true, newBalance: credit.balance, xpResult, profileId: profile.user_id };
  });

  if (!result.ok) {
    if (result.reason === "insufficient_balance") {
      await ctx.replyWithMarkdown(`⚠️ Yetersiz bakiye. Gerekli: *${fmtNxt(box.price)} NXT*`);
    }
    return;
  }

  const lvlUp = result.xpResult?.leveledUp ? `\n⬆️ *Seviye ${result.xpResult.newLevel}!*` : "";

  if (reward >= box.max * 0.8) {
    // Jackpot tier
    await ctx.replyWithMarkdown(
      `🎁 ${box.emoji} *JACKPOT KUTU!*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `💎 *+${fmtNxt(reward)} NXT*\n` +
      `📈 Kâr: *+${fmtNxt(profit)} NXT*\n` +
      `Bakiye: *${fmtNxt(result.newBalance)} NXT*${lvlUp}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━`
    );
  } else if (isWin) {
    await ctx.replyWithMarkdown(
      `🎁 ${box.emoji} *${box.label} Kutu Açıldı*\n\n` +
      `💎 *+${fmtNxt(reward)} NXT*\n` +
      `📈 Kâr: +${fmtNxt(profit)} NXT\n` +
      `Bakiye: *${fmtNxt(result.newBalance)} NXT*${lvlUp}`
    );
  } else {
    await ctx.replyWithMarkdown(
      `🎁 ${box.emoji} *${box.label} Kutu Açıldı*\n\n` +
      `💎 ${fmtNxt(reward)} NXT\n` +
      `📉 ${fmtNxt(profit)} NXT\n` +
      `Bakiye: *${fmtNxt(result.newBalance)} NXT*${lvlUp}`
    );
  }
}

module.exports = { handleLootbox, BOXES };
