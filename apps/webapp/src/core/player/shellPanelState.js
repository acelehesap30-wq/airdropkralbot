function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

export const PLAYER_SHELL_PANEL_KEY = Object.freeze({
  SETTINGS: "settings",
  SUPPORT: "support",
  DISCOVER: "discover"
});

function buildTarget(panelKey, sourcePanelKey, focusKey) {
  const normalizedPanelKey = normalizeKey(panelKey);
  const normalizedSourcePanelKey = normalizeKey(sourcePanelKey);
  const normalizedFocusKey = normalizeKey(focusKey);
  return {
    panel_key: normalizedPanelKey,
    source_panel_key: normalizedSourcePanelKey,
    focus_key: normalizedFocusKey,
    token: [normalizedPanelKey, normalizedSourcePanelKey, normalizedFocusKey].join(":")
  };
}

export function resolvePlayerShellPanelTarget(input = {}) {
  const launchContext = input.launchContext && typeof input.launchContext === "object" ? input.launchContext : {};
  const tabKey = normalizeKey(input.tab || launchContext.tab || "home");
  if (tabKey && tabKey !== "home") {
    return null;
  }

  const routeKey = normalizeKey(launchContext.route_key || "");
  const panelKey = normalizeKey(launchContext.panel_key || "");
  const focusKey = normalizeKey(launchContext.focus_key || "");

  if (panelKey === "language" || routeKey === "settings") {
    return buildTarget(PLAYER_SHELL_PANEL_KEY.SETTINGS, panelKey || "language", focusKey || "locale_override");
  }

  if (panelKey === "support" || panelKey === "faq" || panelKey === "help") {
    return buildTarget(PLAYER_SHELL_PANEL_KEY.SUPPORT, panelKey || "support", focusKey || "faq_cards");
  }

  if (panelKey === "discover") {
    return buildTarget(PLAYER_SHELL_PANEL_KEY.DISCOVER, panelKey, focusKey || "command_center");
  }

  return null;
}
