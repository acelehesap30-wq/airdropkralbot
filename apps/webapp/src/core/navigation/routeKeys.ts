/**
 * Canonical route and panel key contract.
 * Blueprint Section 1: "Freeze shared route_key + panel_key contract"
 */

export const ROUTE_KEY = {
  HUB: "hub",
  MISSIONS: "missions",
  FORGE: "forge",
  EXCHANGE: "exchange",
  SEASON: "season",
  EVENTS: "events",
  VAULT: "vault",
  SETTINGS: "settings",
  PVP: "pvp",
  ADMIN: "admin",
} as const;

export const PANEL_KEY = {
  ONBOARDING: "onboarding",
  PROFILE: "profile",
  REWARDS: "rewards",
  WALLET: "wallet",
  PAYOUT: "payout",
  HISTORY: "history",
  STATUS: "status",
  RANK: "rank",
  INVENTORY: "inventory",
  LEADERBOARD: "leaderboard",
  CHESTS: "chests",
  LANGUAGE: "language",
  SUPPORT: "support",
  CLAIM: "claim",
} as const;

export const DISTRICT_KEY = {
  CENTRAL_HUB: "central_hub",
  MISSION_QUARTER: "mission_quarter",
  LOOT_FORGE: "loot_forge",
  EXCHANGE_DISTRICT: "exchange_district",
  SEASON_HALL: "season_hall",
  ELITE_DISTRICT: "elite_district",
  LIVE_EVENT_OVERLAY: "live_event_overlay",
  SOCIAL_MONUMENTS: "social_monuments",
} as const;

/** API endpoint paths — single source of truth for all fetch calls */
export const API = {
  PLAYER_ACTION: "/webapp/api/v2/player/action",
  CLAIM_MISSION: "/webapp/api/v2/actions/claim-mission",
  ACCEPT_OFFER: "/webapp/api/v2/actions/accept",
  COMPLETE_TASK: "/webapp/api/v2/actions/complete",
  TOKEN_SUMMARY: "/webapp/api/v2/token/summary",
  TOKEN_MINT: "/webapp/api/v2/token/mint",
  PVP_SESSION_START: "/webapp/api/v2/pvp/session/start",
  PVP_SESSION_ACTION: "/webapp/api/v2/pvp/session/action",
  PVP_SESSION_RESOLVE: "/webapp/api/v2/pvp/session/resolve",
  PVP_LEADERBOARD: "/webapp/api/v2/pvp/leaderboard/live",
  ADMIN_AUTOMATION: "/webapp/api/v2/admin/automation-status",
} as const;

/** Game action keys — must match PLAYER_ACTION_REWARDS in admin-api */
export const GAME_ACTION = {
  TAP_BLITZ: "game_tap_blitz",
  COIN_FLIP: "game_coin_flip",
  DAILY_SPIN: "game_daily_spin",
  ARENA_REFLEX: "game_arena_reflex",
  STREAK_CHALLENGE: "game_streak_challenge",
  RESOURCE_MERGE: "game_resource_merge",
  QUICK_MATCH: "game_quick_match",
  AIRDROP_CATCHER: "game_airdrop_catcher",
  PRICE_PREDICTOR: "game_price_predictor",
  HASH_RACER: "game_hash_racer",
} as const;

export type RouteKey = (typeof ROUTE_KEY)[keyof typeof ROUTE_KEY];
export type PanelKey = (typeof PANEL_KEY)[keyof typeof PANEL_KEY];
export type DistrictKey = (typeof DISTRICT_KEY)[keyof typeof DISTRICT_KEY];
export type GameAction = (typeof GAME_ACTION)[keyof typeof GAME_ACTION];
