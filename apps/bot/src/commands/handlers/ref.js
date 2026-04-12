// ── /ref Command Handler ──────────────────────────────────
// Referral system — unique invite link, track invites, earn NXT commission.

function escMd(str) {
  return String(str || "").replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}

async function sendRef(ctx, pool, appConfig) {
  const userId = ctx.from?.id;
  if (!userId) return;

  const { withTransaction } = require("../../db");
  const userStore = require("../../stores/userStore");

  const data = await withTransaction(pool, async (db) => {
    const profile = await userStore.getOrCreateProfile(db, {
      telegramId: userId,
      publicName: ctx.from?.username ? `@${ctx.from.username}` : ctx.from?.first_name || "Kral"
    });

    // Count referrals
    const refResult = await db.query(
      `SELECT COUNT(*) AS cnt FROM users WHERE referred_by = $1`,
      [profile.user_id]
    ).catch(() => ({ rows: [{ cnt: 0 }] }));

    // Total NXT earned from referrals
    const earnResult = await db.query(
      `SELECT COALESCE(SUM(nxt_amount), 0) AS total FROM house_ledger WHERE source = 'referral' AND game_ref = $1`,
      [String(profile.user_id)]
    ).catch(() => ({ rows: [{ total: 0 }] }));

    const referralCount = Number(refResult.rows[0]?.cnt || 0);

    // Achievement: referral_boss (10+ referrals)
    if (referralCount >= 10) {
      try {
        const achievementStore = require("../../stores/achievementStore");
        const economyStore = require("../../stores/economyStore");
        const ach = await achievementStore.unlockAchievement(db, profile.user_id, "referral_boss");
        if (ach && ach.reward_nxt > 0) {
          await economyStore.creditCurrency(db, {
            userId: profile.user_id, currency: "NXT", amount: ach.reward_nxt,
            reason: "achievement_reward", meta: { achievement: "referral_boss" }
          });
        }
      } catch { /* non-critical */ }
    }

    return {
      profile,
      referralCount,
      nxtEarned: Number(earnResult.rows[0]?.total || 0)
    };
  });

  const botUsername = ctx.botInfo?.username || appConfig?.botUsername || "AirdropKralBot";
  const refLink = `https://t.me/${botUsername}?start=ref_${userId}`;

  const text =
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `⬡ *Referral*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `Arkadaşını davet et, oynadıkça\n` +
    `house fee'nin *%5'i* sana NXT olarak döner\\.\n\n` +
    `👥 Davet: *${data.referralCount}* kişi\n` +
    `💎 Kazanç: *${data.nxtEarned.toFixed(2)}* NXT\n\n` +
    `📎 *Linkin:*\n` +
    `\`${escMd(refLink)}\`\n` +
    `━━━━━━━━━━━━━━━━━━━━━━`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: "📋 Linki Kopyala", callback_data: "ref_copy" },
        { text: "📤 Paylaş", switch_inline_query: `🎮 AirdropKral Nexus'a katıl! ${refLink}` }
      ]
    ]
  };

  await ctx.replyWithMarkdownV2(text, { reply_markup: keyboard });
}

module.exports = { sendRef };
