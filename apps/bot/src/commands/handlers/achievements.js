// ── /achievements Command Handler ─────────────────────────────
// Shows user's achievement gallery with progress, XP bar, and level.

const achievementStore = require("../../stores/achievementStore");
const userStore = require("../../stores/userStore");
const { withTransaction } = require("../../db");

function fmtNxt(n) {
  return Number(n || 0).toLocaleString("en", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function progressBar(current, max, len = 10) {
  const filled = Math.min(len, Math.round((current / Math.max(1, max)) * len));
  return "█".repeat(filled) + "░".repeat(len - filled);
}

async function sendAchievements(ctx, pool) {
  const userId = ctx.from?.id;
  if (!userId) return;

  const data = await withTransaction(pool, async (db) => {
    const profile = await userStore.getOrCreateProfile(db, {
      telegramId: userId,
      publicName: ctx.from?.username ? `@${ctx.from.username}` : ctx.from?.first_name || "Kral"
    });

    const all = await achievementStore.getAllAchievements(db);
    const unlocked = await achievementStore.getUserAchievements(db, profile.user_id);
    const unlockedKeys = new Set(unlocked.map((u) => u.key));

    // Get XP/level from identities
    const idRow = await db.query(
      `SELECT COALESCE(xp, 0) AS xp, COALESCE(level, 1) AS level FROM identities WHERE user_id = $1;`,
      [profile.user_id]
    );
    const xp = Number(idRow.rows[0]?.xp || 0);
    const level = Number(idRow.rows[0]?.level || 1);
    const nextXp = achievementStore.xpForNextLevel(level);

    return { all, unlockedKeys, unlocked, xp, level, nextXp, profile };
  });

  const unlockedCount = data.unlockedKeys.size;
  const totalCount = data.all.length;

  const lines = data.all.map((a) => {
    const done = data.unlockedKeys.has(a.key);
    const icon = done ? "✅" : "🔒";
    const reward = Number(a.reward_nxt || 0) > 0 ? ` (+${fmtNxt(a.reward_nxt)} NXT)` : "";
    return `${icon} *${a.title_tr}*${reward}\n    _${a.description_tr}_`;
  }).join("\n");

  const xpBar = progressBar(data.xp, data.nextXp);
  const xpPct = Math.min(100, Math.round((data.xp / Math.max(1, data.nextXp)) * 100));

  const msg =
    `🏆 *Başarımlar* (${unlockedCount}/${totalCount})\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `${lines}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `📊 *Seviye ${data.level}* | XP: ${fmtNxt(data.xp)}/${fmtNxt(data.nextXp)}\n` +
    `${xpBar} ${xpPct}%\n` +
    `━━━━━━━━━━━━━━━━━━━━━━`;

  await ctx.replyWithMarkdown(msg);
}

module.exports = { sendAchievements };
