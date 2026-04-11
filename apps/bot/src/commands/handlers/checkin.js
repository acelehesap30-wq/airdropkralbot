// ── /checkin Command Handler ──────────────────────────────────
// Daily NXT login bonus with streak multipliers.
// Day 1: 50 NXT  | Day 7: 150 NXT | Day 30: 300 NXT
// Once per calendar day (UTC). Streak breaks if >1 day skipped.

const economyStore = require("../../stores/economyStore");
const userStore = require("../../stores/userStore");
const { withTransaction } = require("../../db");

const BASE_REWARD_NXT = 50;
const MAX_REWARD_NXT = 300;

// Streak → reward mapping (milestone days)
const STREAK_MILESTONES = [
  { day: 30, multiplier: 6.0, label: "👑 30 GÜN" },
  { day: 14, multiplier: 3.5, label: "🔥 14 GÜN" },
  { day: 7,  multiplier: 3.0, label: "⚡ 7 GÜN" },
  { day: 3,  multiplier: 1.5, label: "✨ 3 GÜN" },
  { day: 1,  multiplier: 1.0, label: "🌟 Yeni" }
];

function getStreakReward(streak) {
  const ms = STREAK_MILESTONES.find((m) => streak >= m.day);
  const multiplier = ms?.multiplier ?? 1.0;
  return {
    nxt: Math.min(MAX_REWARD_NXT, Math.round(BASE_REWARD_NXT * multiplier)),
    label: ms?.label ?? "🌟 Başlangıç",
    multiplier
  };
}

function escMd(str) {
  return String(str || "").replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}

async function handleCheckin(ctx, pool) {
  const userId = ctx.from?.id;
  if (!userId) return;

  const result = await withTransaction(pool, async (db) => {
    const profile = await userStore.getOrCreateProfile(db, {
      telegramId: userId,
      publicName: ctx.from?.username ? `@${ctx.from.username}` : ctx.from?.first_name || "Kral"
    });

    // Check today's claim
    const todayRow = await db.query(
      `SELECT user_id, checkin_date, day_of_streak, reward_nxt
       FROM daily_checkins
       WHERE user_id = $1 AND checkin_date = CURRENT_DATE;`,
      [profile.user_id]
    );

    if (todayRow.rows.length > 0) {
      const r = todayRow.rows[0];
      return {
        ok: false,
        reason: "already_claimed",
        rewardNxt: Number(r.reward_nxt || 0),
        streak: Number(r.day_of_streak || 1)
      };
    }

    // Calculate streak: was yesterday claimed?
    const yesterdayRow = await db.query(
      `SELECT day_of_streak
       FROM daily_checkins
       WHERE user_id = $1 AND checkin_date = CURRENT_DATE - 1;`,
      [profile.user_id]
    );

    const prevStreak = yesterdayRow.rows[0] ? Number(yesterdayRow.rows[0].day_of_streak || 1) : 0;
    const newStreak = prevStreak + 1;

    const { nxt, label, multiplier } = getStreakReward(newStreak);

    // Insert claim record
    await db.query(
      `INSERT INTO daily_checkins (user_id, checkin_date, day_of_streak, reward_nxt)
       VALUES ($1, CURRENT_DATE, $2, $3)
       ON CONFLICT (user_id, checkin_date) DO NOTHING;`,
      [profile.user_id, newStreak, nxt]
    );

    // Credit NXT
    const credit = await economyStore.creditCurrency(db, {
      userId: profile.user_id,
      currency: "NXT",
      amount: nxt,
      reason: "daily_checkin",
      meta: { streak: newStreak, multiplier, label }
    });

    const newBalance = credit.balance || 0;

    return {
      ok: true,
      streak: newStreak,
      nxt,
      label,
      multiplier,
      newBalance,
      userId: profile.user_id
    };
  });

  if (!result.ok) {
    if (result.reason === "already_claimed") {
      // Show when they can claim again (tomorrow UTC)
      const tomorrowMs = new Date();
      tomorrowMs.setUTCHours(24, 0, 0, 0);
      const hoursLeft = Math.ceil((tomorrowMs - Date.now()) / 3600000);

      await ctx.reply(
        `⬡ *Günlük Bonus*\n\n` +
        `✅ Bugün zaten claim yaptın\\!\n\n` +
        `Streak: *${escMd(String(result.streak))}. gün*\n` +
        `Alınan: *${escMd(String(result.rewardNxt))} NXT*\n\n` +
        `⏰ Tekrar: *${escMd(String(hoursLeft))} saat* sonra`,
        { parse_mode: "MarkdownV2" }
      );
      return;
    }

    await ctx.reply("❌ Bir hata oluştu\\. Tekrar deneyin\\.", { parse_mode: "MarkdownV2" });
    return;
  }

  // Next milestone info
  const nextMs = STREAK_MILESTONES.slice().reverse().find((m) => m.day > result.streak);
  const nextLine = nextMs
    ? `\nSonraki bonus: *${escMd(String(nextMs.day - result.streak))} gün* sonra ${escMd(nextMs.label)}`
    : "";

  await ctx.reply(
    `🎁 *Günlük Bonus Alındı\\!*\n\n` +
    `${escMd(result.label)} streak — *${escMd(String(result.streak))}\\. gün*\n` +
    `Kazanılan: *\\+${escMd(String(result.nxt))} NXT*\n` +
    `Çarpan: *x${escMd(result.multiplier.toFixed(1))}*\n` +
    `Bakiye: *${escMd(Number(result.newBalance).toFixed(2))} NXT*` +
    nextLine,
    { parse_mode: "MarkdownV2" }
  );
}

module.exports = { handleCheckin };
