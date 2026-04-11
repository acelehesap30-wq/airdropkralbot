// ── /duel Command Handler ────────────────────────────────────
// 1v1 NXT duels using the existing arena engine for combat math.
// Flow: challenge → accept → escrow → compute → payout + house fee.

const crypto = require("crypto");
const arenaEngine = require("../../services/arenaEngine");
const economyStore = require("../../stores/economyStore");
const arenaStore = require("../../stores/arenaStore");
const tonStore = require("../../stores/tonStore");
const { HOUSE_FEE_PCT } = require("../../../../../packages/shared/src/tonConstants");

// Active duel challenges (in-memory, short-lived)
const PENDING_DUELS = new Map();
const DUEL_TIMEOUT_MS = 120_000; // 2 minutes to accept

function escMd(str) {
  return String(str || "").replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}

function formatNxt(amount) {
  return Number(amount || 0).toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function sendDuel(ctx, pool, appConfig) {
  const userId = ctx.from?.id;
  const args = String(ctx.message?.text || "").split(/\s+/).slice(1);

  // No args → show open duel lobby
  if (args.length === 0) {
    return sendDuelLobby(ctx, pool);
  }

  // Quick duel: /duel <amount>
  const amount = parseFloat(args[0]);
  if (isNaN(amount) || amount <= 0) {
    await ctx.replyWithMarkdown("⚠️ Geçerli bir NXT miktarı girin.\nÖrnek: `/duel 100`");
    return;
  }

  if (amount < 10) {
    await ctx.replyWithMarkdown("⚠️ Minimum düello bahsi: *10 NXT*");
    return;
  }

  if (amount > 50000) {
    await ctx.replyWithMarkdown("⚠️ Maksimum düello bahsi: *50,000 NXT*");
    return;
  }

  const { withTransaction } = require("../../db");
  const userStore = require("../../stores/userStore");

  // Check balance
  const check = await withTransaction(pool, async (db) => {
    const profile = await userStore.getOrCreateProfile(db, {
      telegramId: userId,
      publicName: ctx.from?.username ? `@${ctx.from.username}` : ctx.from?.first_name || "Kral"
    });
    const balances = await economyStore.getBalances(db, profile.user_id);
    const nxt = Number(balances?.NXT || 0);
    return { profile, nxt, hasBalance: nxt >= amount };
  });

  if (!check.hasBalance) {
    await ctx.replyWithMarkdown(
      `⚠️ Yetersiz bakiye.\nMevcut: *${formatNxt(check.nxt)} NXT*\nGerekli: *${formatNxt(amount)} NXT*`
    );
    return;
  }

  // Create duel challenge
  const duelId = crypto.randomBytes(6).toString("hex");
  const challenge = {
    id: duelId,
    challengerTgId: userId,
    challengerDbId: check.profile.user_id,
    challengerName: ctx.from?.username ? `@${ctx.from.username}` : ctx.from?.first_name || "Kral",
    amount,
    createdAt: Date.now()
  };

  PENDING_DUELS.set(duelId, challenge);

  // Cleanup after timeout
  setTimeout(() => {
    if (PENDING_DUELS.has(duelId)) {
      PENDING_DUELS.delete(duelId);
    }
  }, DUEL_TIMEOUT_MS);

  const pool_total = amount * 2;
  const winnerGets = Math.floor(pool_total * (1 - HOUSE_FEE_PCT) * 100) / 100;
  const houseFee = Math.floor(pool_total * HOUSE_FEE_PCT * 100) / 100;

  const text =
    `⚔️ *DÜELLO AÇILDI*\n` +
    `▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔\n` +
    `🎯 ${escMd(challenge.challengerName)}\n` +
    `💎 Bahis: *${formatNxt(amount)} NXT*\n` +
    `🏆 Kazanan alır: *${formatNxt(winnerGets)} NXT*\n` +
    `🏛 House: *${formatNxt(houseFee)} NXT* (%${Math.round(HOUSE_FEE_PCT * 100)})\n` +
    `▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔\n` +
    `⏱ 2 dakika içinde kabul edilmeli`;

  await ctx.replyWithMarkdown(text, {
    reply_markup: {
      inline_keyboard: [
        [{ text: `⚔️ Düelloya Katıl (${formatNxt(amount)} NXT)`, callback_data: `duel_accept:${duelId}` }],
        [{ text: "❌ İptal", callback_data: `duel_cancel:${duelId}` }]
      ]
    }
  });
}

async function handleDuelAccept(ctx, pool, duelId) {
  const acceptorTgId = ctx.from?.id;
  const challenge = PENDING_DUELS.get(duelId);

  if (!challenge) {
    await ctx.answerCbQuery("Bu düello süresi dolmuş veya iptal edilmiş.", { show_alert: true });
    return;
  }

  if (challenge.challengerTgId === acceptorTgId) {
    await ctx.answerCbQuery("Kendi düellonuza katılamazsınız!", { show_alert: true });
    return;
  }

  // Remove from pending
  PENDING_DUELS.delete(duelId);

  const { withTransaction } = require("../../db");
  const userStore = require("../../stores/userStore");
  const configService = require("../../services/configService");

  const result = await withTransaction(pool, async (db) => {
    const acceptorProfile = await userStore.getOrCreateProfile(db, {
      telegramId: acceptorTgId,
      publicName: ctx.from?.username ? `@${ctx.from.username}` : ctx.from?.first_name || "Kral"
    });

    // Check both players have balance
    const challengerBal = await economyStore.getBalances(db, challenge.challengerDbId);
    const acceptorBal = await economyStore.getBalances(db, acceptorProfile.user_id);

    if (Number(challengerBal?.NXT || 0) < challenge.amount) {
      return { error: "challenger_insufficient", challengerName: challenge.challengerName };
    }
    if (Number(acceptorBal?.NXT || 0) < challenge.amount) {
      return { error: "acceptor_insufficient" };
    }

    // Escrow both players
    const gameRef = `duel:${duelId}`;
    const debit1 = await economyStore.debitCurrency(db, {
      userId: challenge.challengerDbId,
      currency: "NXT",
      amount: challenge.amount,
      reason: "duel_escrow",
      refEventId: `duel_escrow:${duelId}:challenger`
    });
    if (!debit1.applied) {
      return { error: "challenger_debit_failed" };
    }

    const debit2 = await economyStore.debitCurrency(db, {
      userId: acceptorProfile.user_id,
      currency: "NXT",
      amount: challenge.amount,
      reason: "duel_escrow",
      refEventId: `duel_escrow:${duelId}:acceptor`
    });
    if (!debit2.applied) {
      // Refund challenger
      await economyStore.creditCurrency(db, {
        userId: challenge.challengerDbId,
        currency: "NXT",
        amount: challenge.amount,
        reason: "duel_escrow_refund"
      });
      return { error: "acceptor_debit_failed" };
    }

    // Record escrows
    await tonStore.lockEscrow(db, { userId: challenge.challengerDbId, gameType: "duel", gameRef, nxtAmount: challenge.amount });
    await tonStore.lockEscrow(db, { userId: acceptorProfile.user_id, gameType: "duel", gameRef, nxtAmount: challenge.amount });

    // Get arena states for combat calculation
    const runtimeConfig = configService.getRuntimeConfig();
    const config = runtimeConfig?.config || {};

    let challengerArena = null;
    let acceptorArena = null;
    try {
      const hasPvp = await arenaStore.hasPvpSessionTables(db);
      if (hasPvp || await arenaStore.hasArenaTables(db)) {
        challengerArena = await arenaStore.getArenaState(db, challenge.challengerDbId);
        acceptorArena = await arenaStore.getArenaState(db, acceptorProfile.user_id);
      }
    } catch { /* arena tables may not exist */ }

    // Compute fight using arena engine
    const challengerPower = arenaEngine.computePlayerPower({
      kingdomTier: 1,
      streak: 0,
      reputation: 0,
      rating: challengerArena?.rating || 1000,
      risk: 0
    });
    const acceptorPower = arenaEngine.computePlayerPower({
      kingdomTier: 1,
      streak: 0,
      reputation: 0,
      rating: acceptorArena?.rating || 1000,
      risk: 0
    });

    const challengerWinProb = arenaEngine.computeWinProbability(challengerPower, acceptorPower, 0);
    const roll = Math.random();
    const challengerWins = roll < challengerWinProb;

    const winnerId = challengerWins ? challenge.challengerDbId : acceptorProfile.user_id;
    const loserId = challengerWins ? acceptorProfile.user_id : challenge.challengerDbId;
    const winnerName = challengerWins ? challenge.challengerName : (ctx.from?.username ? `@${ctx.from.username}` : ctx.from?.first_name || "Kral");
    const loserName = challengerWins ? (ctx.from?.username ? `@${ctx.from.username}` : ctx.from?.first_name || "Kral") : challenge.challengerName;

    const totalPool = challenge.amount * 2;
    const houseFee = Math.floor(totalPool * HOUSE_FEE_PCT * 100) / 100;
    const winnerPayout = Math.floor((totalPool - houseFee) * 100) / 100;

    // Pay winner
    await economyStore.creditCurrency(db, {
      userId: winnerId,
      currency: "NXT",
      amount: winnerPayout,
      reason: "duel_win",
      refEventId: `duel_win:${duelId}`
    });

    // Referral commission: 10% of house fee per referred player
    const REFERRAL_COMMISSION_PCT = 0.10;
    let referralPaid = 0;
    for (const playerId of [challenge.challengerDbId, acceptorProfile.user_id]) {
      const refRow = await db.query(
        `SELECT referred_by FROM users WHERE id = $1;`,
        [playerId]
      );
      const referrerId = refRow.rows[0]?.referred_by;
      if (referrerId && referrerId !== playerId) {
        const commission = Math.floor(houseFee * REFERRAL_COMMISSION_PCT * 100) / 100;
        if (commission > 0) {
          await economyStore.creditCurrency(db, {
            userId: referrerId,
            currency: "NXT",
            amount: commission,
            reason: "referral_commission",
            meta: { gameRef, sourcePlayer: playerId, duelId }
          });
          await tonStore.recordHouseEarning(db, {
            source: "referral",
            gameRef: String(referrerId),
            nxtAmount: commission,
            note: `referral commission duel ${duelId} from player ${playerId}`
          });
          referralPaid += commission;
        }
      }
    }

    // Record net house fee (after referral payouts)
    await tonStore.recordHouseEarning(db, {
      source: "duel",
      gameRef,
      nxtAmount: houseFee - referralPaid,
      note: `duel ${duelId} house fee (referral deducted: ${referralPaid})`
    });

    // Release escrows
    const escrows = await tonStore.getLockedEscrows(db, gameRef);
    for (const esc of escrows) {
      await tonStore.releaseEscrow(db, esc.id);
    }

    return {
      success: true,
      winnerName,
      loserName,
      winnerId,
      loserId,
      challengerWinProb,
      totalPool,
      houseFee,
      winnerPayout,
      challengerWins,
      roll
    };
  });

  if (result.error) {
    const errorMessages = {
      challenger_insufficient: `⚠️ ${challenge.challengerName} bakiyesi yetersiz.`,
      acceptor_insufficient: "⚠️ Bakiyeniz yetersiz.",
      challenger_debit_failed: "⚠️ İşlem başarısız.",
      acceptor_debit_failed: "⚠️ İşlem başarısız."
    };
    await ctx.editMessageText(errorMessages[result.error] || "⚠️ Hata oluştu.", { parse_mode: "Markdown" });
    return;
  }

  const pctChallenger = Math.round(result.challengerWinProb * 100);
  const pctAcceptor = 100 - pctChallenger;
  const barFull = 8;
  const challengerBar = Math.round(result.challengerWinProb * barFull);
  const acceptorBar = barFull - challengerBar;
  const acceptorName = ctx.from?.username ? `@${ctx.from.username}` : ctx.from?.first_name || "Kral";

  const text =
    `⚔️ *DÜELLO SONUCU*\n` +
    `▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔\n` +
    `${challenge.challengerName}  ${'█'.repeat(challengerBar)}${'░'.repeat(barFull - challengerBar)}  %${pctChallenger}\n` +
    `${acceptorName}  ${'█'.repeat(acceptorBar)}${'░'.repeat(barFull - acceptorBar)}  %${pctAcceptor}\n` +
    `▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔\n` +
    `🏆 *${result.winnerName}* kazandı!\n` +
    `💎 +${formatNxt(result.winnerPayout)} NXT\n` +
    `🏛 House: ${formatNxt(result.houseFee)} NXT\n` +
    `▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔`;

  await ctx.editMessageText(text, { parse_mode: "Markdown" });
}

async function handleDuelCancel(ctx, duelId) {
  const userId = ctx.from?.id;
  const challenge = PENDING_DUELS.get(duelId);

  if (!challenge) {
    await ctx.answerCbQuery("Bu düello zaten sona ermiş.", { show_alert: true });
    return;
  }

  if (challenge.challengerTgId !== userId) {
    await ctx.answerCbQuery("Sadece düelloyu açan iptal edebilir.", { show_alert: true });
    return;
  }

  PENDING_DUELS.delete(duelId);
  await ctx.editMessageText("❌ Düello iptal edildi.", { parse_mode: "Markdown" });
}

async function sendDuelLobby(ctx, pool) {
  const activeDuels = [];
  const now = Date.now();
  for (const [id, duel] of PENDING_DUELS.entries()) {
    if (now - duel.createdAt < DUEL_TIMEOUT_MS && duel.challengerTgId !== ctx.from?.id) {
      activeDuels.push(duel);
    }
  }

  if (activeDuels.length === 0) {
    await ctx.replyWithMarkdown(
      `⚔️ *Düello Lobisi*\n\n` +
      `Aktif düello yok.\n\n` +
      `Yeni düello aç: \`/duel <NXT miktarı>\`\n` +
      `Örnek: \`/duel 100\``
    );
    return;
  }

  const lines = activeDuels.slice(0, 5).map((d, i) =>
    `${i + 1}. ${d.challengerName} — *${formatNxt(d.amount)} NXT*`
  ).join("\n");

  const buttons = activeDuels.slice(0, 5).map(d => [
    { text: `⚔️ ${d.challengerName} — ${formatNxt(d.amount)} NXT`, callback_data: `duel_accept:${d.id}` }
  ]);

  await ctx.replyWithMarkdown(
    `⚔️ *Düello Lobisi*\n\n${lines}\n\nBirine katıl veya yeni düello aç: \`/duel <miktar>\``,
    { reply_markup: { inline_keyboard: buttons } }
  );
}

module.exports = { sendDuel, handleDuelAccept, handleDuelCancel, PENDING_DUELS };
