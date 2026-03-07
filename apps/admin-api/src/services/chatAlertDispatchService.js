"use strict";

const crypto = require("crypto");
const {
  buildStartAppPayload,
  encodeStartAppPayload
} = require("../../../../packages/shared/src/navigationContract");
const {
  CHAT_ALERT_KEY,
  resolveChatAlertConfig
} = require("../../../../packages/shared/src/chatAlertCatalog");
const { resolveAlertLaunchEventKey } = require("../../../../packages/shared/src/launchEventContract");
const {
  formatChatAlertMessage
} = require("../../../../packages/shared/src/chatAlertMessages");
const { normalizeTrustMessageLanguage } = require("../../../../packages/shared/src/chatTrustMessages");
const { resolveLaunchSurface } = require("../../../bot/src/ui/launchSurfaceCatalog");
const { buildNavigationFromCommand } = require("../../../bot/src/utils/miniAppLaunchResolver");
const { resolvePlayerCommandNavigation } = require("../../../../packages/shared/src/playerCommandNavigation");

const CHAT_ALERT_EVENT_TYPE = "chat_alert_sent";

const DEFAULT_ALERT_OPTIONS = Object.freeze({
  chestReadyLimit: 25,
  missionRefreshLimit: 25,
  rareDropLimit: 15,
  streakRiskLimit: 25,
  eventCountdownLimit: 25,
  seasonDeadlineLimit: 25,
  comebackOfferLimit: 25,
  chestReadyLookbackHours: 168,
  missionRefreshRecentSeenDays: 7,
  rareDropLookbackHours: 168,
  streakRiskWindowMinutes: 90,
  streakRiskActiveWithinDays: 7,
  eventCountdownRecentSeenDays: 14,
  eventCountdownTargetDays: Object.freeze([3, 1]),
  seasonDeadlineRecentSeenDays: 21,
  seasonDeadlineTargetDays: Object.freeze([7, 3, 1]),
  comebackInactiveHours: 72,
  comebackMaxAgeDays: 30,
  dryRun: false
});

const SURFACE_LABELS = Object.freeze({
  tr: Object.freeze({
    rewards_vault: "Odul Kasasi",
    payout_screen: "Payout Ekrani",
    mission_quarter: "Gorev Mahallesi",
    status_hub: "Durum",
    events_hall: "Etkinlikler",
    discover_panel: "Kesfet",
    play_world: "Dunyaya Don",
    support_panel: "Destek",
    leaderboard_panel: "Liderlik",
    season_hall: "Sezon Salonu"
  }),
  en: Object.freeze({
    rewards_vault: "Rewards Vault",
    payout_screen: "Payout Screen",
    mission_quarter: "Mission Quarter",
    status_hub: "Status",
    events_hall: "Event Hall",
    discover_panel: "Discover",
    play_world: "Open World",
    support_panel: "Support",
    leaderboard_panel: "Leaderboard",
    season_hall: "Season Hall"
  })
});

function buildVersionedWebAppUrl(baseUrl, version) {
  const base = String(baseUrl || "").trim();
  const safeVersion = String(version || "")
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .slice(0, 40);
  if (!base) {
    return "";
  }
  if (!safeVersion) {
    return base;
  }
  try {
    const url = new URL(base);
    url.searchParams.set("v", safeVersion);
    return url.toString();
  } catch {
    const separator = base.includes("?") ? "&" : "?";
    return `${base}${separator}v=${encodeURIComponent(safeVersion)}`;
  }
}

function toPositiveInt(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return Math.max(1, Number(fallback || 1));
  }
  return Math.max(1, Math.floor(parsed));
}

function localizeSurfaceLabel(surfaceKey, lang = "tr") {
  const locale = normalizeTrustMessageLanguage(lang);
  return SURFACE_LABELS[locale]?.[surfaceKey] || SURFACE_LABELS.tr[surfaceKey] || surfaceKey;
}

function normalizePrefsJson(prefsJson) {
  return prefsJson && typeof prefsJson === "object" && !Array.isArray(prefsJson) ? prefsJson : {};
}

function readBooleanToggle(source, key) {
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    return null;
  }
  if (typeof source[key] === "boolean") {
    return source[key];
  }
  return null;
}

function isAlertEnabledForPrefs(prefsJson, throttleKey) {
  const prefs = normalizePrefsJson(prefsJson);
  if (readBooleanToggle(prefs, "chat_alerts_enabled") === false) {
    return false;
  }
  if (readBooleanToggle(prefs, "notifications_enabled") === false) {
    return false;
  }
  const nestedNotifications = normalizePrefsJson(prefs.notifications);
  const nestedAlerts = normalizePrefsJson(prefs.alerts);
  const directToggle = readBooleanToggle(prefs, throttleKey);
  const notificationToggle = readBooleanToggle(nestedNotifications, throttleKey);
  const alertToggle = readBooleanToggle(nestedAlerts, throttleKey);
  if (directToggle === false || notificationToggle === false || alertToggle === false) {
    return false;
  }
  return true;
}

function calculateMinutesLeft(targetAt, now = new Date()) {
  const targetMs = new Date(targetAt || 0).getTime();
  const nowMs = now.getTime();
  if (!Number.isFinite(targetMs)) {
    return 0;
  }
  return Math.max(0, Math.ceil((targetMs - nowMs) / 60000));
}

function calculateDaysAway(lastSeenAt, now = new Date()) {
  const seenMs = new Date(lastSeenAt || 0).getTime();
  const nowMs = now.getTime();
  if (!Number.isFinite(seenMs)) {
    return 0;
  }
  return Math.max(0, Math.floor((nowMs - seenMs) / 86400000));
}

function decorateCandidate(candidate, alertKey, now) {
  const safeCandidate = candidate && typeof candidate === "object" ? candidate : {};
  switch (alertKey) {
    case CHAT_ALERT_KEY.STREAK_RISK:
      return {
        ...safeCandidate,
        minutes_left: calculateMinutesLeft(safeCandidate.grace_until, now)
      };
    case CHAT_ALERT_KEY.COMEBACK_OFFER:
      return {
        ...safeCandidate,
        days_away: calculateDaysAway(safeCandidate.last_seen_at, now)
      };
    case CHAT_ALERT_KEY.MISSION_REFRESH:
      return {
        ...safeCandidate,
        active_offer_count: Math.max(1, Number(safeCandidate.active_offer_count || 0))
      };
    default:
      return safeCandidate;
  }
}

function buildAlertStateKey(alertKey, candidate = {}, seasonInfo = null) {
  switch (alertKey) {
    case CHAT_ALERT_KEY.CHEST_READY:
      return `attempt_${Number(candidate.task_attempt_id || candidate.id || 0)}`;
    case CHAT_ALERT_KEY.MISSION_REFRESH:
      return `offer_${Number(candidate.latest_offer_id || candidate.task_offer_id || candidate.id || 0)}`;
    case CHAT_ALERT_KEY.RARE_DROP:
      return `loot_${Number(candidate.loot_reveal_id || candidate.id || 0)}`;
    case CHAT_ALERT_KEY.STREAK_RISK:
      return `streak_${Number(candidate.current_streak || 0)}_${String(candidate.grace_until || "")}`;
    case CHAT_ALERT_KEY.EVENT_COUNTDOWN:
    case CHAT_ALERT_KEY.SEASON_DEADLINE:
      return `season_${Number(seasonInfo?.seasonId || candidate.season_id || 0)}_days_${Number(
        seasonInfo?.daysLeft || candidate.days_left || 0
      )}`;
    case CHAT_ALERT_KEY.COMEBACK_OFFER:
      return `last_seen_${String(candidate.last_seen_at || "")}`;
    default:
      return `${alertKey}_${Number(candidate.user_id || 0)}`;
  }
}

async function queryChestReadyCandidates(client, options = {}) {
  const limit = Math.max(1, toPositiveInt(options.chestReadyLimit, DEFAULT_ALERT_OPTIONS.chestReadyLimit));
  const lookbackHours = Math.max(1, toPositiveInt(options.chestReadyLookbackHours, DEFAULT_ALERT_OPTIONS.chestReadyLookbackHours));
  const result = await client.query(
    `SELECT
       u.id AS user_id,
       u.telegram_id,
       u.locale,
       u.last_seen_at,
       up.prefs_json,
       a.id AS task_attempt_id,
       a.completed_at,
       o.task_type,
       o.difficulty
     FROM task_attempts a
     JOIN task_offers o ON o.id = a.task_offer_id
     JOIN users u ON u.id = a.user_id
     LEFT JOIN user_ui_prefs up ON up.user_id = u.id
     LEFT JOIN loot_reveals l ON l.task_attempt_id = a.id
     WHERE a.result <> 'pending'
       AND l.id IS NULL
       AND u.telegram_id IS NOT NULL
       AND COALESCE(u.status, 'active') = 'active'
       AND a.completed_at >= now() - make_interval(hours => $1::int)
       AND u.last_seen_at >= now() - interval '14 days'
       AND NOT EXISTS (
         SELECT 1
         FROM behavior_events be
         WHERE be.user_id = u.id
           AND be.event_type = $2
           AND COALESCE(be.meta_json->>'alert_key', '') = $3
           AND COALESCE(be.meta_json->>'state_key', '') = CONCAT('attempt_', a.id::text)
       )
     ORDER BY a.completed_at ASC
     LIMIT $4;`,
    [lookbackHours, CHAT_ALERT_EVENT_TYPE, CHAT_ALERT_KEY.CHEST_READY, limit * 4]
  );
  return result.rows;
}

async function queryMissionRefreshCandidates(client, options = {}) {
  const limit = Math.max(1, toPositiveInt(options.missionRefreshLimit, DEFAULT_ALERT_OPTIONS.missionRefreshLimit));
  const recentSeenDays = Math.max(
    1,
    toPositiveInt(options.missionRefreshRecentSeenDays, DEFAULT_ALERT_OPTIONS.missionRefreshRecentSeenDays)
  );
  const result = await client.query(
    `WITH mission_windows AS (
       SELECT
         o.user_id,
         MAX(o.id) AS latest_offer_id,
         COUNT(*)::int AS active_offer_count,
         MAX(o.created_at) AS latest_offer_created_at,
         MIN(o.expires_at) AS next_expires_at
       FROM task_offers o
       WHERE o.offer_state = 'offered'
         AND o.expires_at > now()
       GROUP BY o.user_id
     )
     SELECT
       u.id AS user_id,
       u.telegram_id,
       u.locale,
       u.last_seen_at,
       up.prefs_json,
       mw.latest_offer_id,
       mw.active_offer_count,
       mw.latest_offer_created_at,
       mw.next_expires_at
     FROM mission_windows mw
     JOIN users u ON u.id = mw.user_id
     LEFT JOIN user_ui_prefs up ON up.user_id = u.id
     WHERE u.telegram_id IS NOT NULL
       AND COALESCE(u.status, 'active') = 'active'
       AND u.last_seen_at IS NOT NULL
       AND u.last_seen_at >= now() - make_interval(days => $1::int)
       AND mw.latest_offer_created_at > u.last_seen_at
       AND NOT EXISTS (
         SELECT 1
         FROM task_attempts a
         WHERE a.user_id = u.id
           AND a.result = 'pending'
       )
       AND NOT EXISTS (
         SELECT 1
         FROM behavior_events be
         WHERE be.user_id = u.id
           AND be.event_type = $2
           AND COALESCE(be.meta_json->>'alert_key', '') = $3
           AND COALESCE(be.meta_json->>'state_key', '') = CONCAT('offer_', mw.latest_offer_id::text)
       )
     ORDER BY mw.latest_offer_created_at ASC
     LIMIT $4;`,
    [recentSeenDays, CHAT_ALERT_EVENT_TYPE, CHAT_ALERT_KEY.MISSION_REFRESH, limit * 4]
  );
  return result.rows;
}

async function queryStreakRiskCandidates(client, options = {}) {
  const limit = Math.max(1, toPositiveInt(options.streakRiskLimit, DEFAULT_ALERT_OPTIONS.streakRiskLimit));
  const windowMinutes = Math.max(5, toPositiveInt(options.streakRiskWindowMinutes, DEFAULT_ALERT_OPTIONS.streakRiskWindowMinutes));
  const activeWithinDays = Math.max(
    1,
    toPositiveInt(options.streakRiskActiveWithinDays, DEFAULT_ALERT_OPTIONS.streakRiskActiveWithinDays)
  );
  const result = await client.query(
    `SELECT
       u.id AS user_id,
       u.telegram_id,
       u.locale,
       u.last_seen_at,
       up.prefs_json,
       s.current_streak,
       s.grace_until
     FROM streaks s
     JOIN users u ON u.id = s.user_id
     LEFT JOIN user_ui_prefs up ON up.user_id = u.id
     WHERE u.telegram_id IS NOT NULL
       AND COALESCE(u.status, 'active') = 'active'
       AND COALESCE(s.current_streak, 0) > 0
       AND s.grace_until > now()
       AND s.grace_until <= now() + make_interval(mins => $1::int)
       AND u.last_seen_at >= now() - make_interval(days => $2::int)
       AND NOT EXISTS (
         SELECT 1
         FROM behavior_events be
         WHERE be.user_id = u.id
           AND be.event_type = $3
           AND COALESCE(be.meta_json->>'alert_key', '') = $4
           AND be.event_at >= now() - interval '12 hours'
       )
     ORDER BY s.grace_until ASC
     LIMIT $5;`,
    [windowMinutes, activeWithinDays, CHAT_ALERT_EVENT_TYPE, CHAT_ALERT_KEY.STREAK_RISK, limit * 4]
  );
  return result.rows;
}

async function queryComebackOfferCandidates(client, options = {}) {
  const limit = Math.max(1, toPositiveInt(options.comebackOfferLimit, DEFAULT_ALERT_OPTIONS.comebackOfferLimit));
  const inactiveHours = Math.max(24, toPositiveInt(options.comebackInactiveHours, DEFAULT_ALERT_OPTIONS.comebackInactiveHours));
  const maxAgeDays = Math.max(3, toPositiveInt(options.comebackMaxAgeDays, DEFAULT_ALERT_OPTIONS.comebackMaxAgeDays));
  const result = await client.query(
    `SELECT
       u.id AS user_id,
       u.telegram_id,
       u.locale,
       u.last_seen_at,
       up.prefs_json
     FROM users u
     LEFT JOIN user_ui_prefs up ON up.user_id = u.id
     WHERE u.telegram_id IS NOT NULL
       AND COALESCE(u.status, 'active') = 'active'
       AND u.last_seen_at <= now() - make_interval(hours => $1::int)
       AND u.last_seen_at >= now() - make_interval(days => $2::int)
       AND NOT EXISTS (
         SELECT 1
         FROM behavior_events be
         WHERE be.user_id = u.id
           AND be.event_type = $3
           AND COALESCE(be.meta_json->>'alert_key', '') = $4
           AND be.event_at >= now() - interval '72 hours'
       )
     ORDER BY u.last_seen_at ASC
     LIMIT $5;`,
    [inactiveHours, maxAgeDays, CHAT_ALERT_EVENT_TYPE, CHAT_ALERT_KEY.COMEBACK_OFFER, limit * 4]
  );
  return result.rows;
}

async function queryRareDropCandidates(client, options = {}) {
  const limit = Math.max(1, toPositiveInt(options.rareDropLimit, DEFAULT_ALERT_OPTIONS.rareDropLimit));
  const lookbackHours = Math.max(1, toPositiveInt(options.rareDropLookbackHours, DEFAULT_ALERT_OPTIONS.rareDropLookbackHours));
  const result = await client.query(
    `SELECT
       u.id AS user_id,
       u.telegram_id,
       u.locale,
       u.last_seen_at,
       up.prefs_json,
       l.id AS loot_reveal_id,
       l.task_attempt_id,
       l.loot_tier,
       l.created_at
     FROM loot_reveals l
     JOIN users u ON u.id = l.user_id
     LEFT JOIN user_ui_prefs up ON up.user_id = u.id
     WHERE l.loot_tier IN ('rare', 'legendary')
       AND l.created_at >= now() - make_interval(hours => $1::int)
       AND u.telegram_id IS NOT NULL
       AND COALESCE(u.status, 'active') = 'active'
       AND COALESCE(u.last_seen_at, u.created_at) < l.created_at
       AND NOT EXISTS (
         SELECT 1
         FROM behavior_events be
         WHERE be.user_id = u.id
           AND be.event_type = $2
           AND COALESCE(be.meta_json->>'alert_key', '') = $3
           AND COALESCE(be.meta_json->>'state_key', '') = CONCAT('loot_', l.id::text)
       )
     ORDER BY l.created_at ASC
     LIMIT $4;`,
    [lookbackHours, CHAT_ALERT_EVENT_TYPE, CHAT_ALERT_KEY.RARE_DROP, limit * 4]
  );
  return result.rows;
}

async function queryEventCountdownCandidates(client, options = {}, seasonInfo = null) {
  const limit = Math.max(1, toPositiveInt(options.eventCountdownLimit, DEFAULT_ALERT_OPTIONS.eventCountdownLimit));
  const activeWithinDays = Math.max(
    1,
    toPositiveInt(options.eventCountdownRecentSeenDays, DEFAULT_ALERT_OPTIONS.eventCountdownRecentSeenDays)
  );
  const allowedDays = Array.isArray(options.eventCountdownTargetDays)
    ? options.eventCountdownTargetDays
    : Array.from(DEFAULT_ALERT_OPTIONS.eventCountdownTargetDays);
  const seasonId = Number(seasonInfo?.seasonId || 0);
  const daysLeft = Number(seasonInfo?.daysLeft || 0);
  const stateKey = buildAlertStateKey(CHAT_ALERT_KEY.EVENT_COUNTDOWN, {}, seasonInfo);
  if (!seasonId || daysLeft <= 0 || !allowedDays.includes(daysLeft)) {
    return [];
  }
  const result = await client.query(
    `SELECT
       u.id AS user_id,
       u.telegram_id,
       u.locale,
       u.last_seen_at,
       up.prefs_json,
       COALESCE(ss.season_points, 0) AS season_points
     FROM users u
     LEFT JOIN user_ui_prefs up ON up.user_id = u.id
     LEFT JOIN season_stats ss ON ss.user_id = u.id AND ss.season_id = $1
     WHERE u.telegram_id IS NOT NULL
       AND COALESCE(u.status, 'active') = 'active'
       AND (
         u.last_seen_at >= now() - make_interval(days => $2::int)
         OR COALESCE(ss.season_points, 0) > 0
       )
       AND NOT EXISTS (
         SELECT 1
         FROM behavior_events be
         WHERE be.user_id = u.id
           AND be.event_type = $3
           AND COALESCE(be.meta_json->>'alert_key', '') = $4
           AND COALESCE(be.meta_json->>'state_key', '') = $5
       )
     ORDER BY COALESCE(ss.season_points, 0) DESC, u.last_seen_at DESC
     LIMIT $6;`,
    [seasonId, activeWithinDays, CHAT_ALERT_EVENT_TYPE, CHAT_ALERT_KEY.EVENT_COUNTDOWN, stateKey, limit * 4]
  );
  return result.rows.map((row) => ({
    ...row,
    season_id: seasonId,
    days_left: daysLeft
  }));
}

async function querySeasonDeadlineCandidates(client, options = {}, seasonInfo = null) {
  const limit = Math.max(1, toPositiveInt(options.seasonDeadlineLimit, DEFAULT_ALERT_OPTIONS.seasonDeadlineLimit));
  const activeWithinDays = Math.max(
    1,
    toPositiveInt(options.seasonDeadlineRecentSeenDays, DEFAULT_ALERT_OPTIONS.seasonDeadlineRecentSeenDays)
  );
  const allowedDays = Array.isArray(options.seasonDeadlineTargetDays)
    ? options.seasonDeadlineTargetDays
    : Array.from(DEFAULT_ALERT_OPTIONS.seasonDeadlineTargetDays);
  const seasonId = Number(seasonInfo?.seasonId || 0);
  const daysLeft = Number(seasonInfo?.daysLeft || 0);
  const stateKey = buildAlertStateKey(CHAT_ALERT_KEY.SEASON_DEADLINE, {}, seasonInfo);
  if (!seasonId || daysLeft <= 0 || !allowedDays.includes(daysLeft)) {
    return [];
  }
  const result = await client.query(
    `SELECT
       u.id AS user_id,
       u.telegram_id,
       u.locale,
       u.last_seen_at,
       up.prefs_json,
       COALESCE(ss.season_points, 0) AS season_points
     FROM users u
     LEFT JOIN user_ui_prefs up ON up.user_id = u.id
     LEFT JOIN season_stats ss ON ss.user_id = u.id AND ss.season_id = $1
     WHERE u.telegram_id IS NOT NULL
       AND COALESCE(u.status, 'active') = 'active'
       AND (
         u.last_seen_at >= now() - make_interval(days => $2::int)
         OR COALESCE(ss.season_points, 0) > 0
       )
       AND NOT EXISTS (
         SELECT 1
         FROM behavior_events be
         WHERE be.user_id = u.id
           AND be.event_type = $3
           AND COALESCE(be.meta_json->>'alert_key', '') = $4
           AND COALESCE(be.meta_json->>'state_key', '') = $5
       )
     ORDER BY COALESCE(ss.season_points, 0) DESC, u.last_seen_at DESC
     LIMIT $6;`,
    [seasonId, activeWithinDays, CHAT_ALERT_EVENT_TYPE, CHAT_ALERT_KEY.SEASON_DEADLINE, stateKey, limit * 4]
  );
  return result.rows.map((row) => ({
    ...row,
    season_id: seasonId,
    days_left: daysLeft
  }));
}

function createChatAlertDispatchService(deps = {}) {
  const pool = deps.pool;
  const fetchImpl = deps.fetchImpl || global.fetch;
  const botToken = String(deps.botToken || "").trim();
  const botUsername = String(deps.botUsername || "airdropkral_2026_bot").trim();
  const webappPublicUrl = String(deps.webappPublicUrl || "").trim();
  const webappHmacSecret = String(deps.webappHmacSecret || "").trim();
  const logger = typeof deps.logger === "function" ? deps.logger : () => {};
  const resolveNow = typeof deps.resolveNow === "function" ? deps.resolveNow : () => new Date();
  const configService = deps.configService || null;
  const seasonStore = deps.seasonStore || null;
  const resolveWebappVersion =
    typeof deps.resolveWebappVersion === "function" ? deps.resolveWebappVersion : async () => ({ version: "" });
  const candidateLoaders = {
    [CHAT_ALERT_KEY.CHEST_READY]:
      typeof deps.loadChestReadyCandidates === "function" ? deps.loadChestReadyCandidates : queryChestReadyCandidates,
    [CHAT_ALERT_KEY.MISSION_REFRESH]:
      typeof deps.loadMissionRefreshCandidates === "function" ? deps.loadMissionRefreshCandidates : queryMissionRefreshCandidates,
    [CHAT_ALERT_KEY.RARE_DROP]:
      typeof deps.loadRareDropCandidates === "function" ? deps.loadRareDropCandidates : queryRareDropCandidates,
    [CHAT_ALERT_KEY.STREAK_RISK]:
      typeof deps.loadStreakRiskCandidates === "function" ? deps.loadStreakRiskCandidates : queryStreakRiskCandidates,
    [CHAT_ALERT_KEY.EVENT_COUNTDOWN]:
      typeof deps.loadEventCountdownCandidates === "function" ? deps.loadEventCountdownCandidates : queryEventCountdownCandidates,
    [CHAT_ALERT_KEY.SEASON_DEADLINE]:
      typeof deps.loadSeasonDeadlineCandidates === "function" ? deps.loadSeasonDeadlineCandidates : querySeasonDeadlineCandidates,
    [CHAT_ALERT_KEY.COMEBACK_OFFER]:
      typeof deps.loadComebackOfferCandidates === "function" ? deps.loadComebackOfferCandidates : queryComebackOfferCandidates
  };
  const recordAlertEvent =
    typeof deps.recordAlertEvent === "function"
      ? deps.recordAlertEvent
      : async (client, payload) => {
          await client.query(
            `INSERT INTO behavior_events (user_id, event_type, meta_json)
             VALUES ($1, $2, $3::jsonb);`,
            [payload.userId, CHAT_ALERT_EVENT_TYPE, JSON.stringify(payload.meta || {})]
          );
        };

  function isEnabled() {
    return Boolean(pool?.connect && fetchImpl && botToken && webappPublicUrl && webappHmacSecret);
  }

  function signWebAppPayload(uid, ts) {
    return crypto.createHmac("sha256", webappHmacSecret).update(`${uid}.${ts}`).digest("hex");
  }

  async function resolveLaunchBaseUrl() {
    const versionState = await resolveWebappVersion();
    return buildVersionedWebAppUrl(webappPublicUrl, versionState?.version || "");
  }

  function buildSignedWebAppUrl(telegramId, navigation = {}, baseUrl) {
    const launchBaseUrl = String(baseUrl || "").trim();
    if (!launchBaseUrl) {
      return "";
    }
    try {
      const url = new URL(launchBaseUrl);
      const ts = Date.now().toString();
      const uid = String(telegramId || "");
      const sig = signWebAppPayload(uid, ts);
      url.searchParams.set("uid", uid);
      url.searchParams.set("ts", ts);
      url.searchParams.set("sig", sig);
      url.searchParams.set("bot", botUsername);
      const startAppPayload = buildStartAppPayload(navigation);
      if (startAppPayload.route_key) {
        url.searchParams.set("route_key", startAppPayload.route_key);
        url.searchParams.set("startapp", encodeStartAppPayload(startAppPayload));
      }
      if (startAppPayload.panel_key) {
        url.searchParams.set("panel_key", startAppPayload.panel_key);
      }
      if (startAppPayload.focus_key) {
        url.searchParams.set("focus_key", startAppPayload.focus_key);
      }
      if (navigation.launchEventKey) {
        url.searchParams.set("launch_event_key", String(navigation.launchEventKey));
      }
      if (navigation.shellActionKey) {
        url.searchParams.set("shell_action_key", String(navigation.shellActionKey));
      }
      return url.toString();
    } catch {
      return "";
    }
  }

  async function resolveAlertSurfaceEntries(telegramId, alertKey, options = {}) {
    const alertConfig = resolveChatAlertConfig(alertKey);
    if (!alertConfig) {
      return [];
    }
    const launchBaseUrl = await resolveLaunchBaseUrl();
    if (!launchBaseUrl) {
      return [];
    }

    return alertConfig.surfaces
      .map((slot) => {
        const slotKey = String(slot.slot_key || "").trim();
        const surfaceKey = String(slot.surface_key || "").trim();
        const surface = resolveLaunchSurface(surfaceKey);
        if (!slotKey || !surface?.commandKey) {
          return null;
        }
        const navigation = buildNavigationFromCommand(surface.commandKey, resolvePlayerCommandNavigation, {
          ...(surface.overrides || {}),
          shellActionKey: surface.shellActionKey || surface.overrides?.shellActionKey || "",
          launchEventKey: resolveAlertLaunchEventKey(alertConfig.key, slotKey)
        });
        const url = buildSignedWebAppUrl(telegramId, navigation, launchBaseUrl);
        if (!url) {
          return null;
        }
        return {
          surfaceKey: surface.key,
          text: localizeSurfaceLabel(surface.key, options.lang),
          url
        };
      })
      .filter(Boolean);
  }

  function buildReplyMarkup(entries = []) {
    const rows = (Array.isArray(entries) ? entries : [])
      .map((entry) => {
        if (!entry?.url || !entry?.text) {
          return null;
        }
        return [{ text: String(entry.text), web_app: { url: String(entry.url) } }];
      })
      .filter(Boolean);
    return rows.length ? { inline_keyboard: rows } : undefined;
  }

  async function postTelegramMessage(telegramId, text, replyMarkup) {
    const res = await fetchImpl(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        chat_id: Number(telegramId || 0),
        text: String(text || ""),
        parse_mode: "Markdown",
        ...(replyMarkup ? { reply_markup: replyMarkup } : {})
      })
    });
    if (!res?.ok) {
      const bodyText = typeof res?.text === "function" ? await res.text().catch(() => "") : "";
      throw new Error(`telegram_send_failed:${res?.status || 0}:${bodyText.slice(0, 120)}`);
    }
    return true;
  }

  async function resolveSeasonInfo(client, options = {}) {
    if (!configService?.getEconomyConfig || !seasonStore?.getSeasonInfo) {
      return null;
    }
    const config = await configService.getEconomyConfig(client);
    const seasonInfo = seasonStore.getSeasonInfo(config, resolveNow());
    return seasonInfo || null;
  }

  async function runDispatchCycle(options = {}) {
    if (!isEnabled()) {
      return {
        ok: false,
        reason: "service_disabled",
        totals: {}
      };
    }

    const client = await pool.connect();
    const now = resolveNow();
    const summary = {
      ok: true,
      started_at: now.toISOString(),
      dry_run: options.dryRun === true,
      totals: {
        scanned: 0,
        skipped_disabled: 0,
        sent: 0,
        failed: 0,
        recorded: 0
      },
      alerts: {}
    };

    try {
      const seasonInfo = await resolveSeasonInfo(client, options);
      const alertKeys = [
        CHAT_ALERT_KEY.CHEST_READY,
        CHAT_ALERT_KEY.MISSION_REFRESH,
        CHAT_ALERT_KEY.RARE_DROP,
        CHAT_ALERT_KEY.STREAK_RISK,
        CHAT_ALERT_KEY.EVENT_COUNTDOWN,
        CHAT_ALERT_KEY.SEASON_DEADLINE,
        CHAT_ALERT_KEY.COMEBACK_OFFER
      ];

      for (const alertKey of alertKeys) {
        if ((alertKey === CHAT_ALERT_KEY.EVENT_COUNTDOWN || alertKey === CHAT_ALERT_KEY.SEASON_DEADLINE) && !seasonInfo) {
          summary.alerts[alertKey] = { scanned: 0, skipped_disabled: 0, sent: 0, failed: 0, recorded: 0, reason: "window_closed" };
          continue;
        }

        const loader = candidateLoaders[alertKey];
        if (typeof loader !== "function") {
          summary.alerts[alertKey] = { scanned: 0, skipped_disabled: 0, sent: 0, failed: 0, recorded: 0, reason: "loader_missing" };
          continue;
        }
        const config = resolveChatAlertConfig(alertKey);
        const rows = (await loader(client, options, seasonInfo)) || [];
        const alertSummary = { scanned: 0, skipped_disabled: 0, sent: 0, failed: 0, recorded: 0 };
        const limitKey =
          alertKey === CHAT_ALERT_KEY.CHEST_READY
            ? "chestReadyLimit"
            : alertKey === CHAT_ALERT_KEY.MISSION_REFRESH
              ? "missionRefreshLimit"
              : alertKey === CHAT_ALERT_KEY.RARE_DROP
                ? "rareDropLimit"
            : alertKey === CHAT_ALERT_KEY.STREAK_RISK
              ? "streakRiskLimit"
            : alertKey === CHAT_ALERT_KEY.EVENT_COUNTDOWN
              ? "eventCountdownLimit"
                : alertKey === CHAT_ALERT_KEY.SEASON_DEADLINE
                  ? "seasonDeadlineLimit"
                : "comebackOfferLimit";
        const targetLimit = toPositiveInt(options[limitKey], DEFAULT_ALERT_OPTIONS[limitKey]);

        for (const rawCandidate of rows) {
          if (alertSummary.sent >= targetLimit) {
            break;
          }
          const candidate = decorateCandidate(rawCandidate, alertKey, now);
          alertSummary.scanned += 1;
          summary.totals.scanned += 1;

          if (!candidate?.telegram_id) {
            continue;
          }
          if (!isAlertEnabledForPrefs(candidate.prefs_json, config?.throttle_key)) {
            alertSummary.skipped_disabled += 1;
            summary.totals.skipped_disabled += 1;
            continue;
          }

          const stateKey = buildAlertStateKey(alertKey, candidate, seasonInfo);
          const lang = normalizeTrustMessageLanguage(candidate.locale);
          const text = formatChatAlertMessage(
            alertKey,
            {
              ...candidate,
              season_id: Number(seasonInfo?.seasonId || candidate.season_id || 0),
              days_left: Number(seasonInfo?.daysLeft || candidate.days_left || 0)
            },
            { lang }
          );
          const entries = await resolveAlertSurfaceEntries(candidate.telegram_id, alertKey, { lang });
          const replyMarkup = buildReplyMarkup(entries);

          if (options.dryRun === true) {
            alertSummary.sent += 1;
            summary.totals.sent += 1;
            continue;
          }

          try {
            await postTelegramMessage(candidate.telegram_id, text, replyMarkup);
            await recordAlertEvent(client, {
              userId: Number(candidate.user_id || 0),
              meta: {
                alert_key: alertKey,
                state_key: stateKey,
                surface_keys: entries.map((entry) => entry.surfaceKey),
                season_id: Number(seasonInfo?.seasonId || candidate.season_id || 0) || undefined,
                days_left: Number(seasonInfo?.daysLeft || candidate.days_left || 0) || undefined,
                task_attempt_id: Number(candidate.task_attempt_id || 0) || undefined
              }
            });
            alertSummary.sent += 1;
            alertSummary.recorded += 1;
            summary.totals.sent += 1;
            summary.totals.recorded += 1;
            logger("info", {
              event: "chat_alert_sent",
              alert_key: alertKey,
              user_id: Number(candidate.user_id || 0),
              telegram_id: Number(candidate.telegram_id || 0),
              state_key: stateKey
            });
          } catch (err) {
            alertSummary.failed += 1;
            summary.totals.failed += 1;
            logger("warn", {
              event: "chat_alert_send_failed",
              alert_key: alertKey,
              user_id: Number(candidate.user_id || 0),
              telegram_id: Number(candidate.telegram_id || 0),
              error: String(err?.message || err).slice(0, 240)
            });
          }
        }

        if (
          (alertKey === CHAT_ALERT_KEY.EVENT_COUNTDOWN || alertKey === CHAT_ALERT_KEY.SEASON_DEADLINE) &&
          alertSummary.scanned === 0 &&
          alertSummary.sent === 0 &&
          alertSummary.failed === 0 &&
          alertSummary.recorded === 0
        ) {
          alertSummary.reason = "window_closed";
        }

        summary.alerts[alertKey] = alertSummary;
      }

      return summary;
    } finally {
      client.release();
    }
  }

  return {
    runDispatchCycle
  };
}

module.exports = {
  CHAT_ALERT_EVENT_TYPE,
  DEFAULT_ALERT_OPTIONS,
  buildAlertStateKey,
  isAlertEnabledForPrefs,
  createChatAlertDispatchService
};
