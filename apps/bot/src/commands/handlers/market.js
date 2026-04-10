// ── /market Command Handler ──────────────────────────────────
// Shows NXT/TON price, 24h change, volume stats.

const tokenEngine = require("../../services/tokenEngine");
const configService = require("../../services/configService");
const tonService = require("../../services/tonService");
const tonStore = require("../../stores/tonStore");
const { NXT_SYMBOL, TONSCAN_JETTON_URL } = require("../../../../../packages/shared/src/tonConstants");

function escMd(str) {
  return String(str || "").replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}

async function sendMarket(ctx, pool, appConfig) {
  const runtimeConfig = configService.getRuntimeConfig();
  const tokenConfig = tokenEngine.normalizeTokenConfig(runtimeConfig);
  const tonUsd = Number(process.env.TON_USD_PRICE || 3);
  const nxtUsd = tokenConfig.usd_price || 0.001;
  const nxtPerTon = tonUsd / nxtUsd;

  // Get 24h stats
  const { withTransaction } = require("../../db");
  let stats24h = { total_ton: 0, total_nxt: 0, total_entries: 0 };
  try {
    stats24h = await withTransaction(pool, async (db) => {
      return await tonStore.getHouseStats(db, 24);
    });
  } catch { /* ignore */ }

  const vol24h = Number(stats24h.total_nxt || 0);
  const games24h = Number(stats24h.total_entries || 0);
  const houseTon24h = Number(stats24h.total_ton || 0);

  const text =
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `⬡ *${NXT_SYMBOL} Piyasa*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `💎 1 NXT = *$${nxtUsd.toFixed(6)}*\n` +
    `⟡  1 TON = *${nxtPerTon.toFixed(2)} NXT*\n` +
    `💵 1 TON = *$${tonUsd.toFixed(2)}*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `*24s İstatistikler*\n` +
    `🎮 Oyun: ${games24h}\n` +
    `💰 Hacim: ${Number(vol24h).toLocaleString("en", { maximumFractionDigits: 0 })} NXT\n` +
    `🏛 House: ${houseTon24h.toFixed(4)} TON\n` +
    `━━━━━━━━━━━━━━━━━━━━━━`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: "💰 NXT Al", callback_data: "wallet_deposit" },
        { text: "📊 Tonscan", url: TONSCAN_JETTON_URL }
      ],
      [
        { text: "⚔️ Düello Aç", callback_data: "market_duel" }
      ]
    ]
  };

  await ctx.replyWithMarkdown(text, { reply_markup: keyboard });
}

module.exports = { sendMarket };
