// ── Admin Sweep Handler ─────────────────────────────────────
// Manual trigger for cold wallet sweep.
// Usage: /sweep (admin only, wired via admin handler)

const coldWalletSweep = require("../../services/coldWalletSweep");
const tonService = require("../../services/tonService");
const tonStore = require("../../stores/tonStore");

async function handleAdminSweep(ctx, pool) {
  if (!tonService.isReady()) {
    await ctx.replyWithMarkdown("⚠️ TON servisi hazır değil. `TON_HOT_WALLET_MNEMONIC` kontrol edin.");
    return;
  }

  const coldWallet = process.env.COLD_WALLET_ADDRESS;
  if (!coldWallet) {
    await ctx.replyWithMarkdown("⚠️ `COLD_WALLET_ADDRESS` ayarlanmamış.");
    return;
  }

  await ctx.replyWithMarkdown("🔄 Sweep başlatılıyor...");

  const result = await coldWalletSweep.executeSweep("admin");

  if (result.success) {
    const { withTransaction } = require("../../db");
    const totalSwept = await withTransaction(pool, async (db) => {
      return await tonStore.getTotalSwept(db);
    });

    await ctx.replyWithMarkdown(
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `✅ *Sweep Tamamlandı*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `⟡  ${result.tonAmount.toFixed(4)} TON gönderildi\n` +
      `📍 ${coldWallet.slice(0, 8)}…${coldWallet.slice(-6)}\n` +
      `💰 Toplam sweep: ${totalSwept.toFixed(4)} TON\n` +
      `━━━━━━━━━━━━━━━━━━━━━━`
    );
  } else {
    await ctx.replyWithMarkdown(
      `⚠️ *Sweep Başarısız*\n` +
      `Sebep: \`${result.reason}\`\n` +
      (result.balance !== undefined ? `Hot wallet bakiye: ${result.balance.toFixed(4)} TON` : "") +
      (result.error ? `\nHata: \`${result.error}\`` : "")
    );
  }
}

async function handleAdminTonStatus(ctx, pool) {
  const balance = await tonService.getTonBalanceNum().catch(() => 0);
  const hotAddr = tonService.getHotAddress() || "yapılandırılmadı";
  const coldAddr = process.env.COLD_WALLET_ADDRESS || "yapılandırılmadı";
  const ready = tonService.isReady();

  const { withTransaction } = require("../../db");
  let stats = { total_ton: 0, total_nxt: 0, total_entries: 0 };
  let totalSwept = 0;
  try {
    stats = await withTransaction(pool, async (db) => tonStore.getHouseStats(db, 24));
    totalSwept = await withTransaction(pool, async (db) => tonStore.getTotalSwept(db));
  } catch { /* ignore */ }

  await ctx.replyWithMarkdown(
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `⬡ *TON System Status*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `SDK: ${ready ? "✅ Hazır" : "❌ Bağlı değil"}\n` +
    `Hot: \`${hotAddr.slice(0, 12)}…\`\n` +
    `Cold: \`${coldAddr.slice(0, 12)}…\`\n` +
    `Hot Bakiye: ${balance.toFixed(4)} TON\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `*24s Aktivite*\n` +
    `Oyun: ${Number(stats.total_entries || 0)}\n` +
    `House NXT: ${Number(stats.total_nxt || 0).toFixed(2)}\n` +
    `Toplam Sweep: ${totalSwept.toFixed(4)} TON\n` +
    `━━━━━━━━━━━━━━━━━━━━━━`
  );
}

module.exports = { handleAdminSweep, handleAdminTonStatus };
