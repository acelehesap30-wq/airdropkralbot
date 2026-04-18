// ── /stats Command Handler ────────────────────────────────────
// Shows comprehensive player statistics: level, XP, game counts,
// win/loss ratios, NXT earned, achievements unlocked, clan info.

const achievementStore = require("../../stores/achievementStore");
const userStore = require("../../stores/userStore");
const clanStore = require("../../stores/clanStore");
const { withTransaction } = require("../../db");

function fmtNxt(n) {
  return Number(n || 0).toLocaleString("en", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function progressBar(cur, max, len = 12) {
  const filled = Math.min(len, Math.floor((cur / Math.max(1, max)) * len));
  return "█".repeat(filled) + "░".repeat(len - filled);
}

async function handleStats(ctx, pool) {
  const userId = ctx.from?.id;
  if (!userId) return;

  const data = await withTransaction(pool, async (db) => {
    const profile = await userStore.getOrCreateProfile(db, {
      telegramId: userId,
      publicName: ctx.from?.username ? `@${ctx.from.username}` : ctx.from?.first_name || "Kral"
    });

    // XP & Level
    const idRow = await db.query(
      `SELECT COALESCE(xp, 0) AS xp, COALESCE(level, 1) AS level FROM identities WHERE user_id = $1;`,
      [profile.user_id]
    );
    const xp = Number(idRow.rows[0]?.xp || 0);
    const level = Number(idRow.rows[0]?.level || 1);
    const nextXp = achievementStore.xpForNextLevel(level);

    // NXT Balance
    const balRow = await db.query(
      `SELECT COALESCE(balance, 0) AS bal FROM currency_balances WHERE user_id = $1 AND currency = 'NXT';`,
      [profile.user_id]
    );
    const nxtBalance = Number(balRow.rows[0]?.bal || 0);

    // Game stats from currency_ledger
    const gameStats = await db.query(
      `SELECT reason, COUNT(*) AS cnt, COALESCE(SUM(CASE WHEN delta > 0 THEN delta ELSE 0 END), 0) AS won,
              COALESCE(SUM(CASE WHEN delta < 0 THEN ABS(delta) ELSE 0 END), 0) AS lost
       FROM currency_ledger
       WHERE user_id = $1 AND currency = 'NXT'
       AND reason IN ('slot_bet','slot_win','duel_win','duel_escrow','flip_bet','flip_win',
                       'crash_bet','crash_win','predict_bet','predict_win','lootbox_buy','lootbox_reward')
       GROUP BY reason;`,
      [profile.user_id]
    );

    const stats = {};
    for (const r of gameStats.rows) {
      stats[r.reason] = { cnt: Number(r.cnt || 0), won: Number(r.won || 0), lost: Number(r.lost || 0) };
    }

    // Count specific games
    const slotGames = stats.slot_bet?.cnt || 0;
    const slotWins = stats.slot_win?.cnt || 0;
    const duelGames = stats.duel_escrow?.cnt || 0;
    const duelWins = stats.duel_win?.cnt || 0;
    const flipGames = stats.flip_bet?.cnt || 0;
    const flipWins = stats.flip_win?.cnt || 0;
    const crashGames = stats.crash_bet?.cnt || 0;
    const crashWins = stats.crash_win?.cnt || 0;
    const predictGames = stats.predict_bet?.cnt || 0;
    const predictWins = stats.predict_win?.cnt || 0;

    // Achievements
    const unlocked = await achievementStore.getUserAchievements(db, profile.user_id);
    const allAch = await achievementStore.getAllAchievements(db);

    // Clan
    const clan = await clanStore.getUserClan(db, profile.user_id).catch(() => null);

    // Streak
    const streakRow = await db.query(
      `SELECT day_of_streak FROM daily_checkins WHERE user_id = $1 ORDER BY checkin_date DESC LIMIT 1;`,
      [profile.user_id]
    ).catch(() => ({ rows: [] }));
    const streak = Number(streakRow.rows[0]?.day_of_streak || 0);

    // Total NXT earned (all credits)
    const totalEarned = await db.query(
      `SELECT COALESCE(SUM(delta), 0) AS total FROM currency_ledger
       WHERE user_id = $1 AND currency = 'NXT' AND delta > 0;`,
      [profile.user_id]
    );

    return {
      profile, xp, level, nextXp, nxtBalance, streak,
      slotGames, slotWins, duelGames, duelWins,
      flipGames, flipWins, crashGames, crashWins,
      predictGames, predictWins,
      unlockedCount: unlocked.length, totalAch: allAch.length,
      clan,
      totalEarned: Number(totalEarned.rows[0]?.total || 0)
    };
  });

  const d = data;
  const xpBar = progressBar(d.xp % d.nextXp, d.nextXp);
  const xpPct = Math.min(100, Math.round(((d.xp % d.nextXp) / Math.max(1, d.nextXp)) * 100));
  const name = d.profile.public_name || ctx.from?.first_name || "Kral";

  let msg =
    `👤 *${name}*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `📊 *Seviye ${d.level}* | XP: ${fmtNxt(d.xp)}\n` +
    `${xpBar} ${xpPct}%\n\n` +
    `💎 Bakiye: *${fmtNxt(d.nxtBalance)} NXT*\n` +
    `💰 Toplam kazanç: *${fmtNxt(d.totalEarned)} NXT*\n` +
    `🔥 Streak: *${d.streak} gün*\n` +
    `🏆 Başarım: *${d.unlockedCount}/${d.totalAch}*\n`;

  if (d.clan) {
    msg += `🏰 Clan: *${d.clan.name}* [${d.clan.tag}]\n`;
  }

  msg += `\n━━━━━━━━━━━━━━━━━━━━━━\n*Oyun İstatistikleri:*\n`;

  const games = [
    { name: "🎰 Slot", played: d.slotGames, won: d.slotWins },
    { name: "⚔️ Duel", played: d.duelGames, won: d.duelWins },
    { name: "🪙 Flip", played: d.flipGames, won: d.flipWins },
    { name: "💥 Crash", played: d.crashGames, won: d.crashWins },
    { name: "📈 Predict", played: d.predictGames, won: d.predictWins }
  ].filter(g => g.played > 0);

  if (games.length === 0) {
    msg += `_Henüz oyun oynamadın_\n`;
  } else {
    for (const g of games) {
      const winRate = g.played > 0 ? Math.round((g.won / g.played) * 100) : 0;
      msg += `${g.name}: ${g.played} oyun, ${g.won} galibiyet (${winRate}%)\n`;
    }
  }

  msg += `━━━━━━━━━━━━━━━━━━━━━━`;

  await ctx.replyWithMarkdown(msg);
}

module.exports = { handleStats };
