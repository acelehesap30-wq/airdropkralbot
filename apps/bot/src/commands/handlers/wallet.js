// ── /wallet Command Handler ──────────────────────────────────
// Shows NXT + TON balances, deposit address, recent transactions.

const tonService = require("../../services/tonService");
const tonStore = require("../../stores/tonStore");
const economyStore = require("../../stores/economyStore");
const { buildDepositMemo, NXT_DECIMALS, TONSCAN_ADDRESS_URL } = require("../../../../../packages/shared/src/tonConstants");

function escMd(str) {
  return String(str || "").replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}

function formatNxt(amount) {
  return Number(amount || 0).toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatTon(amount) {
  return Number(amount || 0).toFixed(4);
}

async function sendWallet(ctx, pool, appConfig) {
  const userId = ctx.from?.id;
  if (!userId) return;

  const { withTransaction } = require("../../db");
  const userStore = require("../../stores/userStore");

  const data = await withTransaction(pool, async (db) => {
    const profile = await userStore.getOrCreateProfile(db, {
      telegramId: userId,
      publicName: ctx.from?.username ? `@${ctx.from.username}` : ctx.from?.first_name || "Kral"
    });
    const balances = await economyStore.getBalances(db, profile.user_id);
    const deposits = await tonStore.getUserDeposits(db, profile.user_id, 3);
    const transfers = await tonStore.getUserNxtTransfers(db, profile.user_id, 3);
    return { profile, balances, deposits, transfers };
  });

  const nxt = Number(data.balances?.NXT || 0);
  const hotAddress = tonService.getHotAddress();
  const memo = buildDepositMemo(userId);

  // Recent activity
  let recentLines = "";
  if (data.deposits.length > 0) {
    const last = data.deposits[0];
    const ago = timeAgo(last.confirmed_at);
    recentLines = `Son Yatırım  \\+${escMd(formatNxt(last.nxt_credited))} NXT · ${escMd(ago)}`;
  } else if (data.transfers.length > 0) {
    const last = data.transfers[0];
    const nxtAmt = Number(last.nano_amount || 0) / (10 ** NXT_DECIMALS);
    recentLines = `Son Çekim  \\-${escMd(formatNxt(nxtAmt))} NXT · ${escMd(last.status)}`;
  } else {
    recentLines = "Henüz işlem yok";
  }

  const text =
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `⬡ *AirdropKral Cüzdan*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `💎 NXT   \`${escMd(formatNxt(nxt))}\`\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `*Yatırım*\n` +
    `Adres  \`${escMd(hotAddress || "yapılandırılmadı")}\`\n` +
    `Memo   \`${escMd(memo)}\`\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `${recentLines}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: "💰 TON Yatır", callback_data: "wallet_deposit" },
        { text: "💸 NXT Çek", callback_data: "wallet_withdraw" }
      ],
      [
        { text: "📊 Piyasa", callback_data: "wallet_market" },
        { text: "📜 İşlem Geçmişi", callback_data: "wallet_history" }
      ]
    ]
  };

  await ctx.replyWithMarkdownV2(text, { reply_markup: keyboard });
}

async function handleWalletDeposit(ctx, pool) {
  const userId = ctx.from?.id;
  const hotAddress = tonService.getHotAddress();
  const memo = buildDepositMemo(userId);

  if (!hotAddress) {
    await ctx.editMessageText(
      "⚠️ Yatırım adresi henüz yapılandırılmadı. Admin'e bildir.",
      { parse_mode: "Markdown" }
    );
    return;
  }

  const text =
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `⬡ *TON Yatırma*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `Aşağıdaki adrese TON gönderin\\.\n` +
    `Memo alanına mutlaka kodu yazın\\.\n\n` +
    `*Adres:*\n\`${escMd(hotAddress)}\`\n\n` +
    `*Memo:*\n\`${escMd(memo)}\`\n\n` +
    `⚠️ Memo olmadan gönderim tanınmaz\\!\n` +
    `⚠️ Min\\. 0\\.1 TON\n` +
    `━━━━━━━━━━━━━━━━━━━━━━`;

  await ctx.editMessageText(text, {
    parse_mode: "MarkdownV2",
    reply_markup: {
      inline_keyboard: [
        [{ text: "◀ Geri", callback_data: "wallet_back" }]
      ]
    }
  });
}

async function handleWalletWithdraw(ctx, pool) {
  const text =
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `⬡ *NXT Çekim*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `NXT tokenleri TON cüzdanınıza çekin\\.\n\n` +
    `Komut: \`/withdraw <miktar> <adres>\`\n\n` +
    `Min\\. çekim: 100 NXT\n` +
    `İşlem süresi: ~1 dakika\n` +
    `━━━━━━━━━━━━━━━━━━━━━━`;

  await ctx.editMessageText(text, {
    parse_mode: "MarkdownV2",
    reply_markup: {
      inline_keyboard: [
        [{ text: "◀ Geri", callback_data: "wallet_back" }]
      ]
    }
  });
}

function timeAgo(date) {
  if (!date) return "";
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "az önce";
  if (mins < 60) return `${mins}dk önce`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}s önce`;
  const days = Math.floor(hours / 24);
  return `${days}g önce`;
}

module.exports = { sendWallet, handleWalletDeposit, handleWalletWithdraw };
