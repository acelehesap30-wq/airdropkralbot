// ── Notification Service — centralized push notifications ─────
// Sends formatted Telegram messages for game events.

let _bot = null;

function init(bot) {
  _bot = bot;
}

function escMd(str) {
  return String(str || "").replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}

async function send(telegramId, text) {
  if (!_bot || !telegramId) return false;
  try {
    await _bot.telegram.sendMessage(telegramId, text, { parse_mode: "Markdown" });
    return true;
  } catch {
    return false; // blocked or invalid
  }
}

async function notifyAchievement(telegramId, achievementTitle, rewardNxt) {
  return send(telegramId,
    `🏆 *Başarım Açıldı!*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `${achievementTitle}\n` +
    (rewardNxt > 0 ? `💎 +${rewardNxt} NXT ödül\n` : "") +
    `━━━━━━━━━━━━━━━━━━━━━━`
  );
}

async function notifyLevelUp(telegramId, oldLevel, newLevel) {
  return send(telegramId,
    `⬆️ *Seviye Atladın!*\n` +
    `Seviye ${oldLevel} → *Seviye ${newLevel}*`
  );
}

async function notifyStreakWarning(telegramId, currentStreak) {
  return send(telegramId,
    `🔥 *Streak Uyarısı!*\n` +
    `${currentStreak} günlük streak'in yarın kırılacak!\n` +
    `Hemen \`/checkin\` yap.`
  );
}

async function notifyDuelResult(telegramId, won, opponentName, nxtAmount) {
  const icon = won ? "⚔️ ✅" : "⚔️ ❌";
  const text = won
    ? `${icon} *Düello Kazandın!*\nvs ${opponentName} — +${nxtAmount} NXT`
    : `${icon} *Düello Kaybettin*\nvs ${opponentName} — -${nxtAmount} NXT`;
  return send(telegramId, text);
}

async function notifyPredictionResult(telegramId, won, direction, betNxt, payoutNxt) {
  const icon = won ? "📈 ✅" : "📉 ❌";
  const text = won
    ? `${icon} *Tahmin Doğru!*\nYön: ${direction} — +${payoutNxt} NXT`
    : `${icon} *Tahmin Yanlış*\nYön: ${direction} — -${betNxt} NXT`;
  return send(telegramId, text);
}

module.exports = {
  init,
  send,
  notifyAchievement,
  notifyLevelUp,
  notifyStreakWarning,
  notifyDuelResult,
  notifyPredictionResult
};
