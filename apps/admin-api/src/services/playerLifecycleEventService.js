"use strict";

// Blueprint §5 — Canonical analytics event pipeline
// Emits family.object.verb events to player_lifecycle_events table

const GAME_ACTION_EVENT_MAP = Object.freeze({
  game_tap_blitz:      "player.game.complete",
  game_coin_flip:      "player.game.complete",
  game_daily_spin:     "player.game.complete",
  game_airdrop_catcher:"player.game.complete",
  game_price_predictor:"player.game.complete",
  game_hash_racer:     "player.game.complete",
  game_arena_reflex:   "player.game.complete",
  game_streak_challenge:"player.game.complete",
  game_resource_merge: "player.game.complete",
  game_quick_match:    "player.game.complete",
  forge_sc_to_hc:      "player.forge.complete",
  forge_hc_boost:      "player.forge.complete",
  forge_rc_craft:      "player.forge.complete",
  forge_tier_forge:    "player.forge.complete",
  forge_nxt_compound:  "player.forge.complete"
});

function splitEventName(eventName) {
  const parts = String(eventName || "").split(".");
  return {
    event_family: parts[0] || "",
    event_object:  parts[1] || "",
    event_verb:    parts[2] || ""
  };
}

/**
 * Emit a single lifecycle event — fire and forget, never throws.
 * Call AFTER transaction COMMIT so the event record is consistent.
 */
async function emitLifecycleEvent(pool, {
  userId,
  eventName,
  surface = "webapp",
  routeKey = "",
  panelKey = "",
  locale = "tr",
  riskBand = "unknown",
  walletChain = "",
  campaignKey = "",
  meta = {},
  sessionRef = ""
}) {
  if (!pool || !userId || !eventName) return;

  const { event_family, event_object, event_verb } = splitEventName(eventName);
  if (!event_family || !event_object || !event_verb) return;

  try {
    await pool.query(
      `INSERT INTO player_lifecycle_events (
        user_id, event_name, event_family, event_object, event_verb,
        surface, route_key, panel_key, locale,
        risk_band, wallet_chain, campaign_key, meta, session_ref
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        $10, $11, $12, $13::jsonb, $14
      )`,
      [
        Number(userId),
        String(eventName),
        event_family,
        event_object,
        event_verb,
        surface,
        String(routeKey || ""),
        String(panelKey || ""),
        String(locale || "tr"),
        String(riskBand || "unknown"),
        String(walletChain || ""),
        String(campaignKey || ""),
        JSON.stringify(meta || {}),
        String(sessionRef || "")
      ]
    );
  } catch (_err) {
    // Non-blocking — analytics must not break core flows
  }
}

/**
 * Emit game complete event from player action payload
 */
async function emitGameComplete(pool, { userId, actionKey, payload = {}, sessionRef = "" }) {
  const eventName = GAME_ACTION_EVENT_MAP[actionKey];
  if (!eventName) return;

  await emitLifecycleEvent(pool, {
    userId,
    eventName,
    surface: "webapp",
    routeKey: actionKey.startsWith("forge_") ? "forge" : "games",
    meta: {
      action_key: actionKey,
      reward_sc: Number(payload.reward_sc || 0),
      score: Number(payload.score || payload.taps || payload.best_streak || 0)
    },
    sessionRef
  });
}

/**
 * Emit mission claim event
 */
async function emitMissionClaim(pool, { userId, missionId, rewardSc = 0, sessionRef = "" }) {
  await emitLifecycleEvent(pool, {
    userId,
    eventName: "player.mission.claim",
    surface: "webapp",
    routeKey: "missions",
    panelKey: "tasks_board",
    meta: { mission_id: missionId, reward_sc: rewardSc },
    sessionRef
  });
}

/**
 * Emit wallet verified event
 */
async function emitWalletVerified(pool, { userId, walletChain = "", sessionRef = "" }) {
  await emitLifecycleEvent(pool, {
    userId,
    eventName: "wallet.link.verified",
    surface: "webapp",
    routeKey: "vault",
    panelKey: "wallet_connect",
    walletChain,
    sessionRef
  });
}

/**
 * Emit payout request submitted event
 */
async function emitPayoutRequested(pool, { userId, currency = "", amountSc = 0, sessionRef = "" }) {
  await emitLifecycleEvent(pool, {
    userId,
    eventName: "payout.request.submitted",
    surface: "webapp",
    routeKey: "vault",
    panelKey: "payout_request",
    meta: { currency, amount_sc: amountSc },
    sessionRef
  });
}

/**
 * Emit season tier upgrade event
 */
async function emitSeasonTierUpgraded(pool, { userId, fromTier = 0, toTier = 0, sessionRef = "" }) {
  await emitLifecycleEvent(pool, {
    userId,
    eventName: "season.tier.upgraded",
    surface: "webapp",
    routeKey: "season",
    meta: { from_tier: fromTier, to_tier: toTier },
    sessionRef
  });
}

module.exports = {
  emitLifecycleEvent,
  emitGameComplete,
  emitMissionClaim,
  emitWalletVerified,
  emitPayoutRequested,
  emitSeasonTierUpgraded
};
