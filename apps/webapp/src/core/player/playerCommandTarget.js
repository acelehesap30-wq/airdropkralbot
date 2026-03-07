import { resolvePlayerRouteHandoff } from "./playerRouteHandoff.js";

function normalizeCommandKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^\/+/, "");
}

function buildTarget(routeKey, panelKey, focusKey) {
  return resolvePlayerRouteHandoff({
    routeKey,
    panelKey,
    focusKey
  });
}

export function resolvePlayerCommandTarget(commandKey) {
  const key = normalizeCommandKey(commandKey);
  if (!key) {
    return null;
  }

  if (key === "menu" || key === "play" || key === "profile" || key === "nexus") {
    return buildTarget("hub", "profile", "identity");
  }

  if (key === "tasks" || key === "missions" || key === "daily" || key === "finish") {
    return buildTarget("missions", "quests", "board");
  }

  if (key === "reveal") {
    return buildTarget("missions", "claim", "missions");
  }

  if (key === "pvp") {
    return buildTarget("pvp", "panel_pvp", "daily_duel");
  }

  if (key === "arena_rank" || key === "leaderboard") {
    return buildTarget("season", "leaderboard", "leaderboard");
  }

  if (key === "season" || key === "kingdom" || key === "streak" || key === "war" || key === "events") {
    return buildTarget("season", "rank", "weekly_ladder");
  }

  if (key === "wallet" || key === "token" || key === "mint" || key === "buytoken" || key === "tx") {
    return buildTarget("vault", "wallet", "connect");
  }

  if (key === "vault" || key === "payout") {
    return buildTarget("vault", "payout", "request");
  }

  if (key === "rewards") {
    return buildTarget("vault", "rewards", "premium_pass");
  }

  if (key === "story" || key === "help" || key === "support" || key === "faq") {
    return buildTarget("settings", "support", "faq_cards");
  }

  if (key === "lang" || key === "settings" || key === "ui_mode" || key === "perf") {
    return buildTarget("settings", "language", "locale_override");
  }

  if (key === "discover") {
    return buildTarget("hub", "discover", "command_center");
  }

  if (key === "status") {
    return buildTarget("hub", "status", "system_status");
  }

  return null;
}
