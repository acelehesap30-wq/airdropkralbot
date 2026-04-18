// ── /predict Command Handler + Resolver ───────────────────────
// TON price prediction: /predict up 100 or /predict down 100
// Resolves after 5 minutes using nxtPriceOracle.
// Correct: x1.8 payout (house ~10%). Wrong: lose bet.

const economyStore = require("../../stores/economyStore");
const tonStore = require("../../stores/tonStore");
const userStore = require("../../stores/userStore");
const achievementStore = require("../../stores/achievementStore");
const nxtPriceOracle = require("../../services/nxtPriceOracle");
const rateLimiter = require("../../services/rateLimiter");
const { withTransaction } = require("../../db");

const MIN_BET = 10;
const MAX_BET = 5000;
const WIN_MULTIPLIER = 1.8; // house edge ~10%
const RESOLVE_MINUTES = 5;

let _resolverTimer = null;
let _pool = null;
let _bot = null;

function fmtNxt(n) {
  return Number(n || 0).toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function handlePredict(ctx, pool) {
  const userId = ctx.from?.id;
  if (!userId) return;

  // Store pool reference for resolver
  if (!_pool) _pool = pool;
  if (!_bot && ctx.telegram) _bot = { telegram: ctx.telegram };

  const args = (ctx.message?.text || "").trim().split(/\s+/).slice(1);

  if (args.length < 2) {
    const cached = nxtPriceOracle.getCachedPrice();
    const tonPrice = cached.tonUsd > 0 ? `$${cached.tonUsd.toFixed(2)}` : "bilinmiyor";
    await ctx.replyWithMarkdown(
      `📈 *TON Fiyat Tahmini*\n\n` +
      `Kullanım: \`/predict <up|down> <bahis>\`\n` +
      `Örnek: \`/predict up 100\`\n\n` +
      `Mevcut TON: *${tonPrice}*\n` +
      `5 dakika sonra fiyat yükselir mi düşer mi?\n\n` +
      `Doğru: *x${WIN_MULTIPLIER}* | Yanlış: kayıp\n` +
      `Min: ${MIN_BET} | Max: ${fmtNxt(MAX_BET)} NXT`
    );
    return;
  }

  const rl = rateLimiter.check(userId, "crash"); // shares crash 3s cooldown
  if (!rl.allowed) {
    await ctx.replyWithMarkdown(`⏳ ${rl.remainSec}s bekle.`);
    return;
  }

  const direction = args[0].toLowerCase();
  if (direction !== "up" && direction !== "down") {
    await ctx.replyWithMarkdown("⚠️ `up` veya `down` seç.");
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

  const cached = nxtPriceOracle.getCachedPrice();
  if (!cached.tonUsd || cached.tonUsd <= 0) {
    await ctx.replyWithMarkdown("⚠️ Fiyat oracle'ı aktif değil. Daha sonra dene.");
    return;
  }

  const startPrice = cached.tonUsd;
  const resolvesAt = new Date(Date.now() + RESOLVE_MINUTES * 60000);

  const result = await withTransaction(pool, async (db) => {
    const profile = await userStore.getOrCreateProfile(db, {
      telegramId: userId,
      publicName: ctx.from?.username ? `@${ctx.from.username}` : ctx.from?.first_name || "Kral"
    });

    // Max 3 active predictions
    const activeCount = await db.query(
      `SELECT COUNT(*) AS cnt FROM predictions WHERE user_id = $1 AND result = 'pending';`,
      [profile.user_id]
    );
    if (Number(activeCount.rows[0]?.cnt || 0) >= 3) {
      return { ok: false, reason: "max_active" };
    }

    const debit = await economyStore.debitCurrency(db, {
      userId: profile.user_id, currency: "NXT", amount: bet,
      reason: "predict_bet", meta: { direction, startPrice }
    });
    if (!debit.applied) return { ok: false, reason: debit.reason, balance: debit.balance };

    await db.query(
      `INSERT INTO predictions (user_id, direction, bet_nxt, start_price, resolves_at)
       VALUES ($1, $2, $3, $4, $5);`,
      [profile.user_id, direction, bet, startPrice, resolvesAt.toISOString()]
    );

    // XP: 5 per prediction
    await achievementStore.addXp(db, profile.user_id, 5);

    return { ok: true };
  });

  if (!result.ok) {
    const msgs = {
      max_active: "⚠️ Maksimum 3 aktif tahmin. Bekle.",
      insufficient_balance: `⚠️ Yetersiz bakiye. Mevcut: *${fmtNxt(result.balance)} NXT*`
    };
    await ctx.replyWithMarkdown(msgs[result.reason] || "⚠️ İşlem başarısız.");
    return;
  }

  const icon = direction === "up" ? "📈" : "📉";
  await ctx.replyWithMarkdown(
    `${icon} *Tahmin Kaydedildi!*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `Yön: *${direction === "up" ? "YUKARI" : "AŞAĞI"}*\n` +
    `Bahis: *${fmtNxt(bet)} NXT*\n` +
    `TON şu an: *$${startPrice.toFixed(4)}*\n` +
    `Çözüm: *${RESOLVE_MINUTES} dakika* sonra\n` +
    `Kazanç: *x${WIN_MULTIPLIER}*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━`
  );

  // Ensure resolver is running
  startResolver();
}

// ── Prediction Resolver (runs every 60s) ─────────────────────
function startResolver() {
  if (_resolverTimer) return;
  _resolverTimer = setInterval(() => {
    resolvePending().catch((err) => {
      console.error("[predict] resolver error:", err.message);
    });
  }, 60000);
  // Initial run after 30s
  setTimeout(() => resolvePending().catch(() => {}), 30000);
}

async function resolvePending() {
  if (!_pool) return;

  await withTransaction(_pool, async (db) => {
    const pending = await db.query(
      `SELECT id, user_id, direction, bet_nxt, start_price, resolves_at
       FROM predictions
       WHERE result = 'pending' AND resolves_at <= now()
       LIMIT 20;`
    );

    if (pending.rows.length === 0) return;

    const cached = nxtPriceOracle.getCachedPrice();
    if (!cached.tonUsd || cached.tonUsd <= 0) return; // no price data

    const endPrice = cached.tonUsd;

    for (const p of pending.rows) {
      const startP = Number(p.start_price);
      const priceWentUp = endPrice > startP;
      const won = (p.direction === "up" && priceWentUp) || (p.direction === "down" && !priceWentUp);
      const payout = won ? Math.floor(Number(p.bet_nxt) * WIN_MULTIPLIER * 100) / 100 : 0;

      // Update prediction
      await db.query(
        `UPDATE predictions SET result = $2, end_price = $3, payout_nxt = $4, resolved_at = now()
         WHERE id = $1;`,
        [p.id, won ? "won" : "lost", endPrice, payout]
      );

      if (won) {
        await economyStore.creditCurrency(db, {
          userId: p.user_id, currency: "NXT", amount: payout,
          reason: "predict_win", meta: { predictionId: p.id, direction: p.direction, startPrice: startP, endPrice }
        });
      }

      // House earning
      const houseGain = won ? Math.max(0, Number(p.bet_nxt) - (payout - Number(p.bet_nxt))) : Number(p.bet_nxt);
      await tonStore.recordHouseEarning(db, {
        source: "predict", nxtAmount: houseGain,
        note: `predict ${p.direction} start=$${startP.toFixed(4)} end=$${endPrice.toFixed(4)} ${won ? "won" : "lost"}`
      });

      // Notify user
      if (_bot) {
        try {
          const userRow = await db.query(`SELECT telegram_id FROM users WHERE id = $1;`, [p.user_id]);
          const tgId = userRow.rows[0]?.telegram_id;
          if (tgId) {
            const icon = won ? "✅" : "❌";
            const msg = won
              ? `${icon} *Tahmin Doğru!* +${fmtNxt(payout)} NXT\nTON: $${startP.toFixed(4)} → $${endPrice.toFixed(4)}`
              : `${icon} *Tahmin Yanlış.* -${fmtNxt(p.bet_nxt)} NXT\nTON: $${startP.toFixed(4)} → $${endPrice.toFixed(4)}`;
            await _bot.telegram.sendMessage(tgId, msg, { parse_mode: "Markdown" });
          }
        } catch { /* user may have blocked bot */ }
      }
    }
  });
}

function stopResolver() {
  if (_resolverTimer) { clearInterval(_resolverTimer); _resolverTimer = null; }
}

module.exports = { handlePredict, startResolver, stopResolver };
