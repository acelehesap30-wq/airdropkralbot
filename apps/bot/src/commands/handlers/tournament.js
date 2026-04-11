// ── /tournament Command Handler ───────────────────────────────
// NXT-entry tournament system. Players join with entry fee,
// prize pool distributed to top 3 when tournament ends.
// Admin creates tournaments; players join with /tournament join.

const crypto = require("crypto");
const economyStore = require("../../stores/economyStore");
const tonStore = require("../../stores/tonStore");
const userStore = require("../../stores/userStore");
const { withTransaction } = require("../../db");

// In-memory tournament store (single active tournament)
let _active = null;

const HOUSE_CUT_PCT = 0.10; // 10% of pool goes to house
const PRIZE_SPLIT = [0.60, 0.25, 0.15]; // 1st, 2nd, 3rd

function fmtNxt(n) {
  return Number(n || 0).toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── /tournament (player: info/join) ────────────────────────────
async function handleTournament(ctx, pool) {
  const userId = ctx.from?.id;
  if (!userId) return;

  const args = (ctx.message?.text || "").trim().split(/\s+/).slice(1);
  const sub = (args[0] || "").toLowerCase();

  if (sub === "join") return joinTournament(ctx, pool);

  // Default: show info
  if (!_active) {
    await ctx.replyWithMarkdown(
      `🏆 *Turnuva*\n\nŞu an aktif turnuva yok.\nAdmin \`/tournament_create <fee> <maxPlayers>\` ile oluşturabilir.`
    );
    return;
  }

  const t = _active;
  const playerNames = t.players.map((p, i) => `${i + 1}. ${p.name}`).join("\n");
  const netPool = Math.floor(t.pool * (1 - HOUSE_CUT_PCT) * 100) / 100;
  const joined = t.players.some(p => p.tgId === userId);

  await ctx.replyWithMarkdown(
    `🏆 *${t.name}*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `Giriş: *${fmtNxt(t.entryFee)} NXT*\n` +
    `Havuz: *${fmtNxt(t.pool)} NXT* (net: ${fmtNxt(netPool)})\n` +
    `Oyuncu: *${t.players.length}/${t.maxPlayers}*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    (playerNames || "_Henüz katılımcı yok_") + "\n" +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    (joined ? "✅ Zaten katıldın" : "Katıl: `/tournament join`"),
    !joined && _active ? {
      reply_markup: {
        inline_keyboard: [[{ text: `🏆 Katıl (${fmtNxt(t.entryFee)} NXT)`, callback_data: "tournament_join" }]]
      }
    } : undefined
  );
}

async function joinTournament(ctx, pool) {
  const userId = ctx.from?.id;
  if (!_active) {
    await ctx.replyWithMarkdown("⚠️ Aktif turnuva yok.");
    return;
  }

  const t = _active;
  if (t.players.some(p => p.tgId === userId)) {
    await ctx.replyWithMarkdown("✅ Zaten bu turnuvaya katıldın.");
    return;
  }

  if (t.players.length >= t.maxPlayers) {
    await ctx.replyWithMarkdown("⚠️ Turnuva dolu.");
    return;
  }

  const result = await withTransaction(pool, async (db) => {
    const profile = await userStore.getOrCreateProfile(db, {
      telegramId: userId,
      publicName: ctx.from?.username ? `@${ctx.from.username}` : ctx.from?.first_name || "Kral"
    });

    const debit = await economyStore.debitCurrency(db, {
      userId: profile.user_id,
      currency: "NXT",
      amount: t.entryFee,
      reason: "tournament_entry",
      refEventId: `tournament:${t.id}:${profile.user_id}`,
      meta: { tournamentId: t.id }
    });

    if (!debit.applied) {
      return { ok: false, reason: debit.reason, balance: debit.balance };
    }

    return { ok: true, profile };
  });

  if (!result.ok) {
    if (result.reason === "insufficient_balance") {
      await ctx.replyWithMarkdown(`⚠️ Yetersiz bakiye. Gerekli: *${fmtNxt(t.entryFee)} NXT*`);
    } else {
      await ctx.replyWithMarkdown("⚠️ Katılım başarısız.");
    }
    return;
  }

  const name = ctx.from?.username ? `@${ctx.from.username}` : ctx.from?.first_name || "Kral";
  t.players.push({ tgId: userId, dbId: result.profile.user_id, name, score: 0 });
  t.pool += t.entryFee;

  await ctx.replyWithMarkdown(
    `🏆 *Turnuvaya Katıldın\\!*\n\n` +
    `Turnuva: ${t.name}\n` +
    `Havuz: *${fmtNxt(t.pool)} NXT*\n` +
    `Oyuncu: ${t.players.length}/${t.maxPlayers}`
  );

  // Auto-start if full
  if (t.players.length >= t.maxPlayers) {
    await ctx.replyWithMarkdown("🚀 *Turnuva dolu — başlıyor!*\nSonuçlar admin `/tournament_end` ile açıklanır.");
  }
}

// ── Admin: /tournament_create <fee> <maxPlayers> [name] ───────
async function handleTournamentCreate(ctx) {
  const args = (ctx.message?.text || "").trim().split(/\s+/).slice(1);
  const fee = parseFloat(args[0]);
  const maxPlayers = parseInt(args[1], 10);
  const name = args.slice(2).join(" ") || "NXT Turnuvası";

  if (isNaN(fee) || fee < 50 || isNaN(maxPlayers) || maxPlayers < 2) {
    await ctx.replyWithMarkdown("Kullanım: `/tournament_create <fee> <maxPlayers> [isim]`\nMin fee: 50 NXT, min oyuncu: 2");
    return;
  }

  if (_active) {
    await ctx.replyWithMarkdown("⚠️ Zaten aktif bir turnuva var. Önce `/tournament_end` ile bitirin.");
    return;
  }

  _active = {
    id: crypto.randomBytes(6).toString("hex"),
    name,
    entryFee: fee,
    maxPlayers,
    pool: 0,
    players: [],
    createdAt: Date.now()
  };

  await ctx.replyWithMarkdown(
    `🏆 *Turnuva Oluşturuldu*\n\n` +
    `İsim: *${name}*\n` +
    `Giriş: *${fmtNxt(fee)} NXT*\n` +
    `Max: *${maxPlayers}* oyuncu\n\n` +
    `Katılım: \`/tournament join\``
  );
}

// ── Admin: /tournament_end ────────────────────────────────────
async function handleTournamentEnd(ctx, pool) {
  if (!_active) {
    await ctx.replyWithMarkdown("⚠️ Aktif turnuva yok.");
    return;
  }

  const t = _active;

  if (t.players.length < 2) {
    // Refund all players
    await withTransaction(pool, async (db) => {
      for (const p of t.players) {
        await economyStore.creditCurrency(db, {
          userId: p.dbId, currency: "NXT", amount: t.entryFee,
          reason: "tournament_refund", meta: { tournamentId: t.id }
        });
      }
    });
    _active = null;
    await ctx.replyWithMarkdown("⚠️ Yeterli oyuncu yok. Giriş ücretleri iade edildi.");
    return;
  }

  // Randomly assign scores (combat simulation)
  for (const p of t.players) {
    p.score = Math.round(Math.random() * 1000 + Math.random() * 500);
  }
  t.players.sort((a, b) => b.score - a.score);

  const houseFee = Math.floor(t.pool * HOUSE_CUT_PCT * 100) / 100;
  const netPool = t.pool - houseFee;

  // Distribute prizes
  const prizes = [];
  const top = Math.min(3, t.players.length);
  for (let i = 0; i < top; i++) {
    const share = i < PRIZE_SPLIT.length ? PRIZE_SPLIT[i] : 0;
    prizes.push({ player: t.players[i], amount: Math.floor(netPool * share * 100) / 100 });
  }

  await withTransaction(pool, async (db) => {
    for (const p of prizes) {
      if (p.amount > 0) {
        await economyStore.creditCurrency(db, {
          userId: p.player.dbId, currency: "NXT", amount: p.amount,
          reason: "tournament_prize", meta: { tournamentId: t.id, rank: prizes.indexOf(p) + 1 }
        });
      }
    }
    await tonStore.recordHouseEarning(db, {
      source: "tournament", nxtAmount: houseFee,
      note: `tournament ${t.id} house fee (${t.players.length} players)`
    });
  });

  const lines = prizes.map((p, i) => {
    const medal = ["🥇", "🥈", "🥉"][i] || `${i + 1}.`;
    return `${medal} ${p.player.name} — *${fmtNxt(p.amount)} NXT* (${p.player.score} puan)`;
  }).join("\n");

  await ctx.replyWithMarkdown(
    `🏆 *TURNUVA SONUÇLARI*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `${t.name}\n\n` +
    `${lines}\n\n` +
    `Havuz: ${fmtNxt(t.pool)} NXT | House: ${fmtNxt(houseFee)} NXT\n` +
    `━━━━━━━━━━━━━━━━━━━━━━`
  );

  _active = null;
}

function getActiveTournament() {
  return _active;
}

module.exports = { handleTournament, handleTournamentCreate, handleTournamentEnd, getActiveTournament };
