// ── /withdraw Command Handler ─────────────────────────────────
// Transfers NXT from in-game balance to user's real TON wallet.
// Usage: /withdraw <amount> <ton_address>
// Min: 100 NXT  Fee: 5 NXT flat (gas coverage)

const tonService = require("../../services/tonService");
const tonStore = require("../../stores/tonStore");
const economyStore = require("../../stores/economyStore");
const rateLimiter = require("../../services/rateLimiter");
const configStore = require("../../stores/configStore");
const { withTransaction } = require("../../db");
const { NXT_DECIMALS } = require("../../../../../packages/shared/src/tonConstants");

// Defaults — overridden by game_configs table
const WD_DEFAULTS = { min_nxt: 100, fee_nxt: 5, daily_limit: 5 };
let _wdCfg = WD_DEFAULTS;

function escMd(str) {
  return String(str || "").replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}

function isValidTonAddress(addr) {
  if (!addr) return false;
  const s = addr.trim();
  // Standard bounceable/non-bounceable base64url (EQ / UQ prefix)
  if (/^[EU]Q[A-Za-z0-9_-]{46}$/.test(s)) return true;
  // Raw hex format: 0:hex64
  if (/^0:[0-9a-fA-F]{64}$/.test(s)) return true;
  return false;
}

async function handleWithdraw(ctx, pool) {
  const userId = ctx.from?.id;
  if (!userId) return;

  // Load config
  try {
    const dbCfg = await withTransaction(pool, (db) => configStore.getGameConfig(db, "withdraw"));
    _wdCfg = { ...WD_DEFAULTS, ...dbCfg };
  } catch { /* defaults */ }
  const MIN_WITHDRAW_NXT = _wdCfg.min_nxt;
  const FEE_NXT = _wdCfg.fee_nxt;
  const DAILY_WITHDRAW_LIMIT = _wdCfg.daily_limit;

  // Rate limit
  const rl = rateLimiter.check(userId, "withdraw");
  if (!rl.allowed) {
    await ctx.reply(`⏳ ${rl.remainSec}s bekle\\.`, { parse_mode: "MarkdownV2" });
    return;
  }

  // Parse args from text: /withdraw <amount> <address>
  const text = ctx.message?.text || "";
  const parts = text.trim().split(/\s+/).slice(1);

  if (parts.length < 2) {
    await ctx.reply(
      "⬡ *NXT Çekim*\n\n" +
      "Kullanım: `/withdraw <miktar> <ton_adresi>`\n\n" +
      "Örnek:\n`/withdraw 500 EQD...`\n\n" +
      "• Min\\. 100 NXT\n" +
      "• Gas ücreti: 5 NXT\n" +
      "• İşlem süresi: ~1 dakika",
      { parse_mode: "MarkdownV2" }
    );
    return;
  }

  const amount = parseFloat(parts[0]);
  const toAddress = parts[1].trim();

  if (isNaN(amount) || amount < MIN_WITHDRAW_NXT) {
    await ctx.reply(
      `❌ Minimum çekim miktarı *${MIN_WITHDRAW_NXT} NXT*\\.`,
      { parse_mode: "MarkdownV2" }
    );
    return;
  }

  if (!isValidTonAddress(toAddress)) {
    await ctx.reply(
      "❌ Geçersiz TON adresi\\.\n" +
      "EQ veya UQ ile başlayan 48 karakterli adres girin\\.",
      { parse_mode: "MarkdownV2" }
    );
    return;
  }

  if (!tonService.isReady()) {
    await ctx.reply(
      "⚠️ Çekim servisi şu an aktif değil\\.\nLütfen daha sonra tekrar deneyin\\.",
      { parse_mode: "MarkdownV2" }
    );
    return;
  }

  const totalDeduction = amount;           // amount user pays (includes fee)
  const netSend = Math.max(0, amount - FEE_NXT); // amount actually sent on-chain

  if (netSend <= 0) {
    await ctx.reply("❌ Miktar gas ücretini karşılamıyor\\.", { parse_mode: "MarkdownV2" });
    return;
  }

  // ── Atomic: deduct balance + create pending record ────────────
  let transferRecord;
  try {
    const result = await withTransaction(pool, async (db) => {
      // Daily withdrawal limit
      const dailyCount = await db.query(
        `SELECT COUNT(*) AS cnt FROM nxt_transfers
         WHERE user_id = $1 AND created_at > CURRENT_DATE
         AND type = 'withdraw' AND status != 'failed';`,
        [userId]
      );
      if (Number(dailyCount.rows[0]?.cnt || 0) >= DAILY_WITHDRAW_LIMIT) {
        return { ok: false, reason: "daily_limit" };
      }

      const debit = await economyStore.debitCurrency(db, {
        userId,
        currency: "NXT",
        amount: totalDeduction,
        reason: "withdraw",
        meta: { toAddress, requestedAmount: amount, fee: FEE_NXT }
      });

      if (!debit.applied) {
        return { ok: false, reason: debit.reason, balance: debit.balance };
      }

      const nanoAmount = BigInt(Math.floor(netSend * Math.pow(10, NXT_DECIMALS)));
      const record = await tonStore.recordNxtTransfer(db, {
        userId,
        toAddress,
        nanoAmount: nanoAmount.toString(),
        txHash: null,
        type: "withdraw"
      });

      return { ok: true, record };
    });

    if (!result.ok) {
      if (result.reason === "daily_limit") {
        await ctx.reply(
          `❌ Günlük çekim limitine ulaştın \\(max ${DAILY_WITHDRAW_LIMIT}/gün\\)\\.\nYarın tekrar dene\\.`,
          { parse_mode: "MarkdownV2" }
        );
      } else if (result.reason === "insufficient_balance") {
        await ctx.reply(
          `❌ Yetersiz bakiye\\.\nMevcut: *${escMd(Number(result.balance || 0).toFixed(2))} NXT*\nGerekli: *${escMd(totalDeduction.toFixed(2))} NXT*`,
          { parse_mode: "MarkdownV2" }
        );
      } else {
        await ctx.reply(
          "❌ İşlem başlatılamadı\\. Lütfen tekrar deneyin\\.",
          { parse_mode: "MarkdownV2" }
        );
      }
      return;
    }

    transferRecord = result.record;
  } catch (err) {
    console.error("[withdraw] DB error:", err);
    await ctx.reply("❌ Sunucu hatası\\. Tekrar deneyin\\.", { parse_mode: "MarkdownV2" });
    return;
  }

  // ── Pending notice ────────────────────────────────────────────
  await ctx.reply(
    `⏳ *NXT Çekimi Başlatıldı*\n\n` +
    `Miktar: *${escMd(netSend.toFixed(2))} NXT*\n` +
    `Gas: *${escMd(String(FEE_NXT))} NXT*\n` +
    `Adres: \`${escMd(toAddress)}\`\n\n` +
    `İşlem ~1 dakikada tamamlanır\\.`,
    { parse_mode: "MarkdownV2" }
  );

  // ── Execute on-chain jetton transfer ─────────────────────────
  try {
    const txResult = await tonService.sendNxt(toAddress, netSend);

    await withTransaction(pool, async (db) => {
      await tonStore.confirmNxtTransfer(db, transferRecord.id, `seqno_${txResult.seqno}`);
    });

    await ctx.reply(
      `✅ *Çekim Tamamlandı\\!*\n\n` +
      `${escMd(netSend.toFixed(2))} NXT gönderildi\\.\n` +
      `Adres: \`${escMd(toAddress)}\`\n` +
      `Seq\\# ${escMd(String(txResult.seqno))}`,
      { parse_mode: "MarkdownV2" }
    );
  } catch (err) {
    console.error("[withdraw] sendNxt failed:", err.message);

    // Rollback: refund user and mark transfer failed
    try {
      await withTransaction(pool, async (db) => {
        await tonStore.failNxtTransfer(db, transferRecord.id, err.message);
        await economyStore.creditCurrency(db, {
          userId,
          currency: "NXT",
          amount: totalDeduction,
          reason: "withdraw_refund",
          meta: { originalTransferId: transferRecord.id, error: String(err.message).slice(0, 200) }
        });
      });
    } catch (refundErr) {
      console.error("[withdraw] CRITICAL: refund failed:", refundErr);
    }

    await ctx.reply(
      `❌ *Çekim Başarısız*\n\nBakiyeniz iade edildi\\.\nHata: ${escMd(String(err.message).slice(0, 100))}`,
      { parse_mode: "MarkdownV2" }
    );
  }
}

module.exports = { handleWithdraw };
