// ── P2P Marketplace — /sell, /buy, /orders ────────────────────
// Users list NXT for sale at a price, others buy.
// Seller's NXT is escrowed. Buyer pays from balance.
// House fee: 3% from buyer side.

const economyStore = require("../../stores/economyStore");
const tonStore = require("../../stores/tonStore");
const userStore = require("../../stores/userStore");
const rateLimiter = require("../../services/rateLimiter");
const { withTransaction } = require("../../db");

const HOUSE_FEE_PCT = 0.03;
const MIN_SELL = 50;
const MAX_SELL = 100000;
const MAX_OPEN_ORDERS = 5;

function fmtNxt(n) {
  return Number(n || 0).toLocaleString("en", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

// ── /sell <amount> <price> ────────────────────────────────────
async function handleSell(ctx, pool) {
  const userId = ctx.from?.id;
  if (!userId) return;

  const args = (ctx.message?.text || "").trim().split(/\s+/).slice(1);

  if (args.length < 2) {
    await ctx.replyWithMarkdown(
      `🏪 *NXT Satış Emri*\n\n` +
      `Kullanım: \`/sell <miktar> <fiyat_nxt>\`\n` +
      `Örnek: \`/sell 1000 1200\`\n` +
      `(1000 NXT'yi 1200 NXT karşılığı sat)\n\n` +
      `Min: ${MIN_SELL} NXT | House fee: %${HOUSE_FEE_PCT * 100} (alıcıdan)\n` +
      `Max açık emir: ${MAX_OPEN_ORDERS}`
    );
    return;
  }

  const rl = rateLimiter.check(userId, "lootbox"); // 5s cooldown
  if (!rl.allowed) {
    await ctx.replyWithMarkdown(`⏳ ${rl.remainSec}s bekle.`);
    return;
  }

  const amount = parseFloat(args[0]);
  const price = parseFloat(args[1]);

  if (isNaN(amount) || amount < MIN_SELL) {
    await ctx.replyWithMarkdown(`⚠️ Minimum satış: *${MIN_SELL} NXT*`);
    return;
  }
  if (amount > MAX_SELL) {
    await ctx.replyWithMarkdown(`⚠️ Maksimum satış: *${fmtNxt(MAX_SELL)} NXT*`);
    return;
  }
  if (isNaN(price) || price <= 0) {
    await ctx.replyWithMarkdown("⚠️ Geçerli bir fiyat girin.");
    return;
  }
  if (price <= amount * 0.5 || price >= amount * 5) {
    await ctx.replyWithMarkdown("⚠️ Fiyat makul aralıkta olmalı (0.5x - 5x miktar).");
    return;
  }

  const result = await withTransaction(pool, async (db) => {
    const profile = await userStore.getOrCreateProfile(db, {
      telegramId: userId,
      publicName: ctx.from?.username ? `@${ctx.from.username}` : ctx.from?.first_name || "Kral"
    });

    // Check open order count
    const openCount = await db.query(
      `SELECT COUNT(*) AS cnt FROM market_orders WHERE seller_id = $1 AND status = 'open';`,
      [profile.user_id]
    );
    if (Number(openCount.rows[0]?.cnt || 0) >= MAX_OPEN_ORDERS) {
      return { ok: false, reason: "max_orders" };
    }

    // Escrow NXT from seller
    const debit = await economyStore.debitCurrency(db, {
      userId: profile.user_id, currency: "NXT", amount,
      reason: "market_escrow", meta: { price }
    });
    if (!debit.applied) return { ok: false, reason: debit.reason, balance: debit.balance };

    // Create order
    const order = await db.query(
      `INSERT INTO market_orders (seller_id, nxt_amount, nxt_price)
       VALUES ($1, $2, $3) RETURNING id;`,
      [profile.user_id, amount, price]
    );

    return { ok: true, orderId: order.rows[0].id, amount, price };
  });

  if (!result.ok) {
    const msgs = {
      max_orders: `⚠️ Maksimum ${MAX_OPEN_ORDERS} açık emir. Birini iptal et: \`/orders\``,
      insufficient_balance: `⚠️ Yetersiz bakiye. Mevcut: *${fmtNxt(result.balance)} NXT*`
    };
    await ctx.replyWithMarkdown(msgs[result.reason] || "⚠️ İşlem başarısız.");
    return;
  }

  await ctx.replyWithMarkdown(
    `🏪 *Satış Emri Oluşturuldu*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `Emir #${result.orderId}\n` +
    `💎 Satılık: *${fmtNxt(result.amount)} NXT*\n` +
    `💰 Fiyat: *${fmtNxt(result.price)} NXT*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `_NXT'n escrow'da. Alıcı bulunursa otomatik transfer._`
  );
}

// ── /buy [order_id] ───────────────────────────────────────────
async function handleBuy(ctx, pool) {
  const userId = ctx.from?.id;
  if (!userId) return;

  const args = (ctx.message?.text || "").trim().split(/\s+/).slice(1);
  const orderId = parseInt(args[0], 10);

  if (!orderId || isNaN(orderId)) {
    // Show open orders
    const orders = await withTransaction(pool, async (db) => {
      return (await db.query(
        `SELECT mo.id, mo.nxt_amount, mo.nxt_price, mo.created_at,
                i.public_name AS seller_name
         FROM market_orders mo
         JOIN identities i ON i.user_id = mo.seller_id
         WHERE mo.status = 'open'
         ORDER BY mo.created_at DESC LIMIT 10;`
      )).rows;
    });

    if (orders.length === 0) {
      await ctx.replyWithMarkdown(
        `🏪 *P2P Pazar*\n\nAçık emir yok.\nSat: \`/sell <miktar> <fiyat>\``
      );
      return;
    }

    const lines = orders.map((o) => {
      const ratio = (Number(o.nxt_price) / Number(o.nxt_amount)).toFixed(2);
      return `#${o.id} — *${fmtNxt(o.nxt_amount)} NXT* → ${fmtNxt(o.nxt_price)} NXT (x${ratio}) by ${o.seller_name || "?"}`;
    }).join("\n");

    await ctx.replyWithMarkdown(
      `🏪 *Açık Emirler*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `${lines}\n\n` +
      `Satın al: \`/buy <emir_id>\`\n` +
      `━━━━━━━━━━━━━━━━━━━━━━`
    );
    return;
  }

  const rl = rateLimiter.check(userId, "lootbox");
  if (!rl.allowed) {
    await ctx.replyWithMarkdown(`⏳ ${rl.remainSec}s bekle.`);
    return;
  }

  const result = await withTransaction(pool, async (db) => {
    const profile = await userStore.getOrCreateProfile(db, {
      telegramId: userId,
      publicName: ctx.from?.username ? `@${ctx.from.username}` : ctx.from?.first_name || "Kral"
    });

    // Lock order
    const orderRow = await db.query(
      `SELECT id, seller_id, nxt_amount, nxt_price, status
       FROM market_orders WHERE id = $1 FOR UPDATE;`,
      [orderId]
    );
    const order = orderRow.rows[0];
    if (!order) return { ok: false, reason: "not_found" };
    if (order.status !== "open") return { ok: false, reason: "already_filled" };
    if (order.seller_id === profile.user_id) return { ok: false, reason: "own_order" };

    const nxtPrice = Number(order.nxt_price);
    const houseFee = Math.floor(nxtPrice * HOUSE_FEE_PCT * 100) / 100;
    const totalCost = nxtPrice + houseFee;

    // Debit buyer
    const debit = await economyStore.debitCurrency(db, {
      userId: profile.user_id, currency: "NXT", amount: totalCost,
      reason: "market_buy", meta: { orderId, price: nxtPrice, fee: houseFee }
    });
    if (!debit.applied) return { ok: false, reason: debit.reason, balance: debit.balance };

    // Credit seller (price amount)
    await economyStore.creditCurrency(db, {
      userId: order.seller_id, currency: "NXT", amount: nxtPrice,
      reason: "market_sold", meta: { orderId, buyer: profile.user_id }
    });

    // Credit buyer (the NXT they bought — from escrow)
    await economyStore.creditCurrency(db, {
      userId: profile.user_id, currency: "NXT", amount: Number(order.nxt_amount),
      reason: "market_received", meta: { orderId }
    });

    // House earning
    await tonStore.recordHouseEarning(db, {
      source: "marketplace", nxtAmount: houseFee,
      note: `order #${orderId} fee`
    });

    // Update order
    await db.query(
      `UPDATE market_orders SET status = 'filled', buyer_id = $2, house_fee = $3, filled_at = now()
       WHERE id = $1;`,
      [orderId, profile.user_id, houseFee]
    );

    return { ok: true, nxtAmount: Number(order.nxt_amount), nxtPrice, houseFee, orderId };
  });

  if (!result.ok) {
    const msgs = {
      not_found: "⚠️ Emir bulunamadı.",
      already_filled: "⚠️ Bu emir zaten doldurulmuş.",
      own_order: "⚠️ Kendi emrini satın alamazsın.",
      insufficient_balance: `⚠️ Yetersiz bakiye. Mevcut: *${fmtNxt(result.balance)} NXT*`
    };
    await ctx.replyWithMarkdown(msgs[result.reason] || "⚠️ İşlem başarısız.");
    return;
  }

  await ctx.replyWithMarkdown(
    `✅ *Satın Alındı!*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `Emir #${result.orderId}\n` +
    `💎 Aldın: *${fmtNxt(result.nxtAmount)} NXT*\n` +
    `💰 Ödeme: *${fmtNxt(result.nxtPrice)} NXT* + ${fmtNxt(result.houseFee)} fee\n` +
    `━━━━━━━━━━━━━━━━━━━━━━`
  );
}

// ── /orders — show user's orders + cancel ─────────────────────
async function handleOrders(ctx, pool) {
  const userId = ctx.from?.id;
  if (!userId) return;

  const args = (ctx.message?.text || "").trim().split(/\s+/).slice(1);

  // /orders cancel <id>
  if (args[0] === "cancel" && args[1]) {
    return cancelOrder(ctx, pool, parseInt(args[1], 10));
  }

  const orders = await withTransaction(pool, async (db) => {
    const profile = await userStore.getOrCreateProfile(db, {
      telegramId: userId,
      publicName: ctx.from?.username ? `@${ctx.from.username}` : ctx.from?.first_name || "Kral"
    });
    return (await db.query(
      `SELECT id, nxt_amount, nxt_price, status, created_at
       FROM market_orders WHERE seller_id = $1
       ORDER BY created_at DESC LIMIT 10;`,
      [profile.user_id]
    )).rows;
  });

  if (orders.length === 0) {
    await ctx.replyWithMarkdown("🏪 Henüz emrin yok. Sat: `/sell <miktar> <fiyat>`");
    return;
  }

  const lines = orders.map((o) => {
    const icon = o.status === "open" ? "🟢" : (o.status === "filled" ? "✅" : "❌");
    return `${icon} #${o.id} — ${fmtNxt(o.nxt_amount)} NXT → ${fmtNxt(o.nxt_price)} NXT [${o.status}]`;
  }).join("\n");

  await ctx.replyWithMarkdown(
    `🏪 *Emirlerim*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `${lines}\n\n` +
    `İptal: \`/orders cancel <id>\`\n` +
    `━━━━━━━━━━━━━━━━━━━━━━`
  );
}

async function cancelOrder(ctx, pool, orderId) {
  const userId = ctx.from?.id;

  const result = await withTransaction(pool, async (db) => {
    const profile = await userStore.getOrCreateProfile(db, {
      telegramId: userId,
      publicName: ctx.from?.username ? `@${ctx.from.username}` : ctx.from?.first_name || "Kral"
    });

    const orderRow = await db.query(
      `SELECT id, seller_id, nxt_amount, status FROM market_orders WHERE id = $1 FOR UPDATE;`,
      [orderId]
    );
    const order = orderRow.rows[0];
    if (!order) return { ok: false, reason: "not_found" };
    if (order.seller_id !== profile.user_id) return { ok: false, reason: "not_owner" };
    if (order.status !== "open") return { ok: false, reason: "not_open" };

    // Refund escrowed NXT
    await economyStore.creditCurrency(db, {
      userId: profile.user_id, currency: "NXT", amount: Number(order.nxt_amount),
      reason: "market_cancel_refund", meta: { orderId }
    });

    await db.query(
      `UPDATE market_orders SET status = 'cancelled', cancelled_at = now() WHERE id = $1;`,
      [orderId]
    );

    return { ok: true, amount: Number(order.nxt_amount) };
  });

  if (!result.ok) {
    const msgs = {
      not_found: "⚠️ Emir bulunamadı.",
      not_owner: "⚠️ Bu emir sana ait değil.",
      not_open: "⚠️ Bu emir zaten kapalı."
    };
    await ctx.replyWithMarkdown(msgs[result.reason] || "⚠️ İşlem başarısız.");
    return;
  }

  await ctx.replyWithMarkdown(`✅ Emir #${orderId} iptal edildi. *${fmtNxt(result.amount)} NXT* iade edildi.`);
}

module.exports = { handleSell, handleBuy, handleOrders };
