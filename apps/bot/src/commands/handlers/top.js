// ── /top Leaderboard Handler ──────────────────────────────────
// Shows top 10 players by NXT balance, PvP rating, and streak.

function escMd(str) {
  return String(str || "").replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}

const RANK_EMOJI = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

async function sendTop(ctx, pool) {
  const userId = ctx.from?.id;
  if (!userId) return;

  const { withTransaction } = require("../../db");
  const userStore = require("../../stores/userStore");

  const data = await withTransaction(pool, async (db) => {
    const profile = await userStore.getOrCreateProfile(db, {
      telegramId: userId,
      publicName: ctx.from?.username ? `@${ctx.from.username}` : ctx.from?.first_name || "Kral"
    });

    // Top 10 by NXT balance
    const nxtTop = await db.query(
      `SELECT u.public_name, b.amount
       FROM user_balances b
       JOIN users u ON u.id = b.user_id
       WHERE b.currency = 'NXT' AND b.amount > 0
       ORDER BY b.amount DESC
       LIMIT 10`
    ).catch(() => ({ rows: [] }));

    // Top 10 by PvP rating
    const pvpTop = await db.query(
      `SELECT u.public_name, a.rating, a.wins, a.losses
       FROM arena_state a
       JOIN users u ON u.id = a.user_id
       WHERE a.games_played > 0
       ORDER BY a.rating DESC
       LIMIT 10`
    ).catch(() => ({ rows: [] }));

    // Player's own rank
    const myRank = await db.query(
      `SELECT COUNT(*) + 1 AS rank FROM user_balances
       WHERE currency = 'NXT' AND amount > (
         SELECT COALESCE(amount, 0) FROM user_balances WHERE user_id = $1 AND currency = 'NXT'
       )`,
      [profile.user_id]
    ).catch(() => ({ rows: [{ rank: "?" }] }));

    return { profile, nxtTop: nxtTop.rows, pvpTop: pvpTop.rows, myRank: myRank.rows[0]?.rank || "?" };
  });

  const nxtLines = data.nxtTop.map((row, i) => {
    const emoji = RANK_EMOJI[i] || `${i + 1}.`;
    const name = escMd(String(row.public_name || "Oyuncu").slice(0, 15));
    const amt = Number(row.amount || 0).toFixed(2);
    return `${emoji} ${name}  *${amt}* NXT`;
  });

  const pvpLines = data.pvpTop.slice(0, 5).map((row, i) => {
    const emoji = RANK_EMOJI[i] || `${i + 1}.`;
    const name = escMd(String(row.public_name || "Oyuncu").slice(0, 15));
    const wr = Number(row.wins || 0) + Number(row.losses || 0) > 0
      ? Math.round((Number(row.wins) / (Number(row.wins) + Number(row.losses))) * 100)
      : 0;
    return `${emoji} ${name}  *${Number(row.rating || 1000)}* ELO \\(${wr}%\\)`;
  });

  const text =
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `⬡ *Sıralama*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `💎 *NXT Lider Tablosu*\n` +
    (nxtLines.length > 0 ? nxtLines.join("\n") : "Henüz veri yok") +
    `\n\n⚔️ *PvP Rating*\n` +
    (pvpLines.length > 0 ? pvpLines.join("\n") : "Henüz maç yok") +
    `\n\n━━━━━━━━━━━━━━━━━━━━━━\n` +
    `📊 Senin sıran: *#${data.myRank}*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━`;

  await ctx.replyWithMarkdownV2(text);
}

module.exports = { sendTop };
