// ── /admin_event Command Handler ──────────────────────────────
// Trigger bonus events: double_nxt, double_xp, reduced_fee
// Usage: /admin_event <type> [duration_hours]
//        /admin_event list
//        /admin_event stop <id>

const nexusEventEngine = require("../../services/nexusEventEngineV2");

const EVENT_TYPES = {
  double_nxt:  { label: "2x NXT Ödül",     multiplier: 2.0 },
  triple_nxt:  { label: "3x NXT Ödül",     multiplier: 3.0 },
  double_xp:   { label: "2x XP Bonus",     multiplier: 2.0 },
  reduced_fee: { label: "Yarım House Fee", multiplier: 0.5 }
};

function fmtMin(ms) {
  const min = Math.ceil(ms / 60000);
  return min >= 60 ? `${Math.floor(min / 60)}s ${min % 60}dk` : `${min}dk`;
}

async function handleAdminEvent(ctx) {
  const args = (ctx.message?.text || "").trim().split(/\s+/).slice(1);
  const sub = (args[0] || "").toLowerCase();

  if (sub === "list" || !sub) {
    const events = nexusEventEngine.getActiveEvents();
    const anomaly = nexusEventEngine.resolveDailyAnomaly();

    let msg =
      `⚡ *Event Durumu*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📅 Günlük Anomali: *${anomaly.label}* (x${anomaly.rewardMul})\n`;

    if (events.length === 0) {
      msg += `\n_Aktif admin event yok_\n`;
    } else {
      msg += `\n*Aktif Eventler:*\n`;
      for (const e of events) {
        msg += `• *${e.label}* (x${e.multiplier}) — ${fmtMin(e.remainingMs)} kaldı | \`${e.id}\`\n`;
      }
    }

    msg += `\n━━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `Kullanım: \`/admin_event <type> [saat]\`\n`;
    msg += `Tipler: \`${Object.keys(EVENT_TYPES).join("`, `")}\`\n`;
    msg += `Durdur: \`/admin_event stop <id>\``;

    await ctx.replyWithMarkdown(msg);
    return;
  }

  if (sub === "stop") {
    const eventId = args[1];
    if (!eventId) {
      await ctx.replyWithMarkdown("⚠️ Kullanım: `/admin_event stop <event_id>`");
      return;
    }
    const removed = nexusEventEngine.removeEvent(eventId);
    await ctx.replyWithMarkdown(removed ? `✅ Event \`${eventId}\` durduruldu.` : "⚠️ Event bulunamadı.");
    return;
  }

  // Create event
  const type = sub;
  if (!EVENT_TYPES[type]) {
    await ctx.replyWithMarkdown(`⚠️ Geçersiz tip. Tipler: \`${Object.keys(EVENT_TYPES).join("`, `")}\``);
    return;
  }

  const hours = Math.min(24, Math.max(0.5, parseFloat(args[1]) || 1));
  const durationMs = Math.round(hours * 3600000);
  const config = EVENT_TYPES[type];

  const evt = nexusEventEngine.addEvent({
    type,
    multiplier: config.multiplier,
    durationMs,
    label: config.label
  });

  await ctx.replyWithMarkdown(
    `⚡ *Event Başlatıldı!*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `*${config.label}* (x${config.multiplier})\n` +
    `Süre: *${hours}h*\n` +
    `ID: \`${evt.id}\`\n` +
    `━━━━━━━━━━━━━━━━━━━━━━`
  );
}

module.exports = { handleAdminEvent };
