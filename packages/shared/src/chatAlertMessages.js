"use strict";

const { normalizeChatAlertKey } = require("./chatAlertCatalog");
const { escapeMarkdown, normalizeTrustMessageLanguage } = require("./chatTrustMessages");

function formatRelativeMinutes(minutes, lang) {
  const safeMinutes = Math.max(1, Math.ceil(Number(minutes || 0)));
  if (lang === "en") {
    return safeMinutes === 1 ? "1 minute" : `${safeMinutes} minutes`;
  }
  return safeMinutes === 1 ? "1 dakika" : `${safeMinutes} dakika`;
}

function formatRelativeDays(days, lang) {
  const safeDays = Math.max(1, Math.ceil(Number(days || 0)));
  if (lang === "en") {
    return safeDays === 1 ? "1 day" : `${safeDays} days`;
  }
  return safeDays === 1 ? "1 gun" : `${safeDays} gun`;
}

function formatChestReadyAlert(payload = {}, options = {}) {
  const lang = normalizeTrustMessageLanguage(options.lang);
  const taskType = escapeMarkdown(String(payload.taskType || payload.task_type || "mission"));
  const difficulty = escapeMarkdown(String(payload.difficulty || "standard"));
  if (lang === "en") {
    return (
      `*Reward Lane Ready*\n` +
      `Mission: *${taskType}*\n` +
      `Tier: *${difficulty}*\n\n` +
      `A resolved run is waiting for reveal. Open Rewards Vault to finish it safely.`
    );
  }
  return (
    `*Odul Hatti Hazir*\n` +
    `Gorev: *${taskType}*\n` +
    `Zorluk: *${difficulty}*\n\n` +
    `Sonuclanmis kosu reveal bekliyor. Guvenli tamamlamak icin Odul Kasasi'ni ac.`
  );
}

function formatStreakRiskAlert(payload = {}, options = {}) {
  const lang = normalizeTrustMessageLanguage(options.lang);
  const streak = Math.max(0, Number(payload.currentStreak || payload.current_streak || 0));
  const minutesLeft = Math.max(1, Number(payload.minutesLeft || payload.minutes_left || 0));
  const windowLabel = formatRelativeMinutes(minutesLeft, lang);
  if (lang === "en") {
    return (
      `*Streak Window Tightening*\n` +
      `Current streak: *${streak}*\n` +
      `Grace window: *${escapeMarkdown(windowLabel)}*\n\n` +
      `Open Mission Quarter for one safe action before the window closes.`
    );
  }
  return (
    `*Seri Penceresi Daraliyor*\n` +
    `Mevcut seri: *${streak}*\n` +
    `Grace penceresi: *${escapeMarkdown(windowLabel)}*\n\n` +
    `Pencere kapanmadan once tek guvenli aksiyon icin Gorev Mahallesi'ni ac.`
  );
}

function formatEventCountdownAlert(payload = {}, options = {}) {
  const lang = normalizeTrustMessageLanguage(options.lang);
  const seasonId = Math.max(1, Number(payload.seasonId || payload.season_id || 1));
  const daysLeft = Math.max(0, Number(payload.daysLeft || payload.days_left || 0));
  const daysLabel = formatRelativeDays(daysLeft, lang);
  if (lang === "en") {
    return (
      `*Event Countdown*\n` +
      `Season: *S${seasonId}*\n` +
      `Time left: *${escapeMarkdown(daysLabel)}*\n\n` +
      `Open Event Hall to check the live objective window and ranking pressure.`
    );
  }
  return (
    `*Etkinlik Geri Sayimi*\n` +
    `Sezon: *S${seasonId}*\n` +
    `Kalan sure: *${escapeMarkdown(daysLabel)}*\n\n` +
    `Canli hedef penceresini ve sira baskisini gormek icin Etkinlikler Salonu'nu ac.`
  );
}

function formatComebackOfferAlert(payload = {}, options = {}) {
  const lang = normalizeTrustMessageLanguage(options.lang);
  const daysAway = Math.max(1, Number(payload.daysAway || payload.days_away || 0));
  const daysLabel = formatRelativeDays(daysAway, lang);
  if (lang === "en") {
    return (
      `*World Resume Ready*\n` +
      `Away time: *${escapeMarkdown(daysLabel)}*\n\n` +
      `Open the world to check refreshed missions, reward lanes and your current live status.`
    );
  }
  return (
    `*Dunyaya Donus Hazir*\n` +
    `Uzak kalinan sure: *${escapeMarkdown(daysLabel)}*\n\n` +
    `Yenilenmis gorevleri, odul hatlarini ve guncel durumu gormek icin dunyayi ac.`
  );
}

function formatMissionRefreshAlert(payload = {}, options = {}) {
  const lang = normalizeTrustMessageLanguage(options.lang);
  const activeOffers = Math.max(1, Number(payload.activeOffers || payload.active_offer_count || 1));
  if (lang === "en") {
    return (
      `*Mission Board Refreshed*\n` +
      `Live contracts: *${activeOffers}*\n\n` +
      `Fresh mission slots are waiting. Open Mission Quarter for the safest next run.`
    );
  }
  return (
    `*Gorev Panosu Yenilendi*\n` +
    `Canli kontrat: *${activeOffers}*\n\n` +
    `Yeni gorev slotlari hazir. En guvenli sonraki kosu icin Gorev Mahallesi'ni ac.`
  );
}

function formatRareDropAlert(payload = {}, options = {}) {
  const lang = normalizeTrustMessageLanguage(options.lang);
  const lootTier = escapeMarkdown(String(payload.lootTier || payload.loot_tier || "rare").toUpperCase());
  if (lang === "en") {
    return (
      `*Rare Drop Logged*\n` +
      `Tier: *${lootTier}*\n\n` +
      `A high-value reveal landed on your lane. Open Rewards Vault for the live result and payout lane.`
    );
  }
  return (
    `*Nadir Drop Kaydedildi*\n` +
    `Tier: *${lootTier}*\n\n` +
    `Yuksek degerli bir reveal geldi. Canli sonucu ve payout hattini gormek icin Odul Kasasi'ni ac.`
  );
}

function formatSeasonDeadlineAlert(payload = {}, options = {}) {
  const lang = normalizeTrustMessageLanguage(options.lang);
  const seasonId = Math.max(1, Number(payload.seasonId || payload.season_id || 1));
  const daysLeft = Math.max(0, Number(payload.daysLeft || payload.days_left || 0));
  const daysLabel = formatRelativeDays(daysLeft, lang);
  if (lang === "en") {
    return (
      `*Season Window Closing*\n` +
      `Season: *S${seasonId}*\n` +
      `Remaining: *${escapeMarkdown(daysLabel)}*\n\n` +
      `Open Season Hall now to lock rank, ladder pressure and kingdom standing.`
    );
  }
  return (
    `*Sezon Penceresi Kapaniyor*\n` +
    `Sezon: *S${seasonId}*\n` +
    `Kalan: *${escapeMarkdown(daysLabel)}*\n\n` +
    `Rank, ladder baskisi ve kingdom durumunu kilitlemek icin simdi Sezon Salonu'nu ac.`
  );
}

function formatChatAlertMessage(alertKey, payload = {}, options = {}) {
  const normalizedKey = normalizeChatAlertKey(alertKey);
  switch (normalizedKey) {
    case "chest_ready":
      return formatChestReadyAlert(payload, options);
    case "mission_refresh":
      return formatMissionRefreshAlert(payload, options);
    case "rare_drop":
      return formatRareDropAlert(payload, options);
    case "streak_risk":
      return formatStreakRiskAlert(payload, options);
    case "event_countdown":
      return formatEventCountdownAlert(payload, options);
    case "season_deadline":
      return formatSeasonDeadlineAlert(payload, options);
    case "comeback_offer":
      return formatComebackOfferAlert(payload, options);
    default: {
      const lang = normalizeTrustMessageLanguage(options.lang);
      return lang === "en"
        ? "*Activity Update*\n\nOpen the Mini App to review the current live state."
        : "*Aktivite Guncellemesi*\n\nGuncel canli durumu gormek icin Mini App'i ac.";
    }
  }
}

module.exports = {
  formatChatAlertMessage,
  formatChestReadyAlert,
  formatMissionRefreshAlert,
  formatRareDropAlert,
  formatStreakRiskAlert,
  formatEventCountdownAlert,
  formatSeasonDeadlineAlert,
  formatComebackOfferAlert
};
