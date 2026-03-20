"use strict";

const ALERT_FAMILIES = Object.freeze([
  // operational families
  "payout_status",
  "quest_complete",
  "pvp_result",
  "season_milestone",
  "chest_rare_drop",
  "admin_action",
  "system_maintenance",
  "daily_reminder",
  "referral_bonus",
  "token_price_alert",
  // blueprint canonical families
  "chest_ready",
  "mission_refresh",
  "event_countdown",
  "kingdom_war",
  "streak_risk",
  "comeback_offer"
]);

const DEFAULT_FREQUENCY_CAP = Object.freeze({
  payout_status: { max_per_hour: 10, cooldown_sec: 60 },
  quest_complete: { max_per_hour: 20, cooldown_sec: 30 },
  pvp_result: { max_per_hour: 30, cooldown_sec: 10 },
  season_milestone: { max_per_hour: 5, cooldown_sec: 300 },
  chest_rare_drop: { max_per_hour: 15, cooldown_sec: 60 },
  admin_action: { max_per_hour: 50, cooldown_sec: 0 },
  system_maintenance: { max_per_hour: 5, cooldown_sec: 600 },
  daily_reminder: { max_per_hour: 2, cooldown_sec: 1800 },
  referral_bonus: { max_per_hour: 10, cooldown_sec: 120 },
  token_price_alert: { max_per_hour: 6, cooldown_sec: 300 },
  // blueprint canonical families
  chest_ready: { max_per_hour: 10, cooldown_sec: 120 },
  mission_refresh: { max_per_hour: 8, cooldown_sec: 300 },
  event_countdown: { max_per_hour: 4, cooldown_sec: 600 },
  kingdom_war: { max_per_hour: 12, cooldown_sec: 60 },
  streak_risk: { max_per_hour: 3, cooldown_sec: 1800 },
  comeback_offer: { max_per_hour: 2, cooldown_sec: 3600 }
});

function normalizeAlertFamily(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function isValidAlertFamily(value) {
  return ALERT_FAMILIES.includes(normalizeAlertFamily(value));
}

function buildDefaultPreferences() {
  const prefs = {};
  for (const family of ALERT_FAMILIES) {
    prefs[family] = { enabled: true, muted_until: null };
  }
  return prefs;
}

function mergePreferences(existing, updates) {
  const base = existing && typeof existing === "object" ? { ...existing } : buildDefaultPreferences();
  if (!updates || typeof updates !== "object") return base;

  for (const [key, value] of Object.entries(updates)) {
    const family = normalizeAlertFamily(key);
    if (!isValidAlertFamily(family)) continue;
    if (!base[family]) base[family] = { enabled: true, muted_until: null };

    if (typeof value === "boolean") {
      base[family].enabled = value;
    } else if (value && typeof value === "object") {
      if (typeof value.enabled === "boolean") base[family].enabled = value.enabled;
      if (value.muted_until !== undefined) {
        base[family].muted_until = value.muted_until ? String(value.muted_until) : null;
      }
    }
  }
  return base;
}

function evaluateNotificationPermission(options = {}) {
  const family = normalizeAlertFamily(options.family || options.alert_family);
  if (!isValidAlertFamily(family)) {
    return { ok: false, error: "notification_family_invalid", family, allowed: false };
  }

  const prefs = options.preferences && typeof options.preferences === "object"
    ? options.preferences
    : buildDefaultPreferences();

  const familyPref = prefs[family] || { enabled: true, muted_until: null };

  if (!familyPref.enabled) {
    return { ok: true, error: "", family, allowed: false, reason: "opted_out" };
  }

  if (familyPref.muted_until) {
    const muteExpiry = new Date(familyPref.muted_until).getTime();
    if (!Number.isNaN(muteExpiry) && Date.now() < muteExpiry) {
      return {
        ok: true,
        error: "",
        family,
        allowed: false,
        reason: "muted",
        muted_until: familyPref.muted_until
      };
    }
  }

  const cap = DEFAULT_FREQUENCY_CAP[family] || { max_per_hour: 10, cooldown_sec: 60 };
  const recentCount = Number(options.recent_count || 0);
  const lastSentAt = options.last_sent_at || options.lastSentAt;

  if (recentCount >= cap.max_per_hour) {
    return {
      ok: true,
      error: "",
      family,
      allowed: false,
      reason: "rate_limited",
      max_per_hour: cap.max_per_hour
    };
  }

  if (lastSentAt && cap.cooldown_sec > 0) {
    const lastTs = new Date(lastSentAt).getTime();
    if (!Number.isNaN(lastTs)) {
      const elapsed = (Date.now() - lastTs) / 1000;
      if (elapsed < cap.cooldown_sec) {
        return {
          ok: true,
          error: "",
          family,
          allowed: false,
          reason: "cooldown",
          remaining_sec: Math.ceil(cap.cooldown_sec - elapsed)
        };
      }
    }
  }

  return { ok: true, error: "", family, allowed: true, reason: "permitted" };
}

function muteFamily(preferences, family, durationSec) {
  const prefs = preferences && typeof preferences === "object" ? { ...preferences } : buildDefaultPreferences();
  const normalized = normalizeAlertFamily(family);
  if (!isValidAlertFamily(normalized)) return prefs;

  if (!prefs[normalized]) prefs[normalized] = { enabled: true, muted_until: null };
  const dur = Math.max(0, Number(durationSec || 3600));
  prefs[normalized].muted_until = new Date(Date.now() + dur * 1000).toISOString();
  return prefs;
}

function unmuteFamily(preferences, family) {
  const prefs = preferences && typeof preferences === "object" ? { ...preferences } : buildDefaultPreferences();
  const normalized = normalizeAlertFamily(family);
  if (!isValidAlertFamily(normalized)) return prefs;

  if (prefs[normalized]) prefs[normalized].muted_until = null;
  return prefs;
}

module.exports = {
  ALERT_FAMILIES,
  DEFAULT_FREQUENCY_CAP,
  normalizeAlertFamily,
  isValidAlertFamily,
  buildDefaultPreferences,
  mergePreferences,
  evaluateNotificationPermission,
  muteFamily,
  unmuteFamily
};
