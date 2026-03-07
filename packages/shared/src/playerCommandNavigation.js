"use strict";

const { resolveLaunchTarget } = require("./navigationContract");

function normalizePlayerCommandKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^\/+/, "");
}

function buildPlayerCommandTarget(routeKey, panelKey, focusKey) {
  const target = resolveLaunchTarget({
    workspace: "player",
    routeKey,
    panelKey,
    focusKey
  });
  return {
    route_key: String(target.route_key || "hub"),
    panel_key: String(target.panel_key || ""),
    focus_key: String(target.focus_key || ""),
    workspace: "player",
    tab: String(target.tab || "home")
  };
}

function resolvePlayerCommandNavigation(commandKey) {
  const key = normalizePlayerCommandKey(commandKey);
  if (!key) {
    return null;
  }

  if (key === "menu" || key === "play" || key === "profile" || key === "nexus") {
    return buildPlayerCommandTarget("hub", "profile", "identity");
  }

  if (key === "tasks" || key === "missions" || key === "daily" || key === "finish") {
    return buildPlayerCommandTarget("missions", "quests", "board");
  }

  if (key === "reveal" || key === "claim") {
    return buildPlayerCommandTarget("missions", "claim", "missions");
  }

  if (key === "pvp") {
    return buildPlayerCommandTarget("pvp", "panel_pvp", "daily_duel");
  }

  if (key === "arena_rank" || key === "leaderboard") {
    return buildPlayerCommandTarget("season", "leaderboard", "leaderboard");
  }

  if (key === "season") {
    return buildPlayerCommandTarget("season", "rank", "weekly_ladder");
  }

  if (key === "kingdom") {
    return buildPlayerCommandTarget("season", "kingdom", "weekly_ladder");
  }

  if (key === "streak") {
    return buildPlayerCommandTarget("season", "streak", "weekly_ladder");
  }

  if (key === "war" || key === "events") {
    return buildPlayerCommandTarget("events", "discover", "command_center");
  }

  if (key === "wallet" || key === "token" || key === "mint" || key === "buytoken" || key === "tx") {
    return buildPlayerCommandTarget("exchange", "wallet", "connect");
  }

  if (key === "vault" || key === "payout") {
    return buildPlayerCommandTarget("vault", "payout", "request");
  }

  if (key === "rewards" || key === "shop") {
    return buildPlayerCommandTarget("vault", "rewards", "premium_pass");
  }

  if (key === "discover") {
    return buildPlayerCommandTarget("hub", "discover", "command_center");
  }

  if (key === "status") {
    return buildPlayerCommandTarget("hub", "status", "system_status");
  }

  if (key === "settings" || key === "lang" || key === "language" || key === "ui_mode" || key === "perf") {
    return buildPlayerCommandTarget("settings", "language", "locale_override");
  }

  if (key === "help" || key === "story" || key === "support" || key === "faq") {
    return buildPlayerCommandTarget("settings", "support", "faq_cards");
  }

  return null;
}

module.exports = {
  normalizePlayerCommandKey,
  buildPlayerCommandTarget,
  resolvePlayerCommandNavigation
};
