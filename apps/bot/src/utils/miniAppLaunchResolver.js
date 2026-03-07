"use strict";

const { resolveCommandLaunchEventKey } = require("../../../../packages/shared/src/launchEventContract");
const { resolveShellActionTarget } = require("../../../../packages/shared/src/shellActionCatalog");

function buildNavigationFromCommand(commandKey, resolveNavigation, overrides = {}, resolveActionNavigation = resolveShellActionTarget) {
  const shellActionKey = String(overrides.shellActionKey || "").trim().toLowerCase();
  const actionNavigation =
    shellActionKey && typeof resolveActionNavigation === "function" ? resolveActionNavigation(shellActionKey) : null;
  const navigation = actionNavigation || (typeof resolveNavigation === "function" ? resolveNavigation(commandKey) : null);
  if (!navigation) {
    return null;
  }
  return {
    routeKey: overrides.routeKey || navigation.route_key || navigation.routeKey,
    panelKey: overrides.panelKey || navigation.panel_key || navigation.panelKey || "",
    focusKey: overrides.focusKey || navigation.focus_key || navigation.focusKey || "",
    launchEventKey: overrides.launchEventKey || resolveCommandLaunchEventKey(commandKey) || "",
    shellActionKey: shellActionKey || navigation.action_key || navigation.actionKey || ""
  };
}

async function resolveLaunchUrlBundle({
  entries = [],
  resolveNavigation,
  resolveActionNavigation = resolveShellActionTarget,
  resolveBaseUrl,
  buildSignedUrl
} = {}) {
  const safeEntries = Array.isArray(entries)
    ? entries.filter((entry) => entry && String(entry.key || entry.commandKey || "").trim())
    : [];
  if (!safeEntries.length) {
    return {};
  }
  if (typeof resolveNavigation !== "function" || typeof resolveBaseUrl !== "function" || typeof buildSignedUrl !== "function") {
    throw new Error("resolveLaunchUrlBundle requires resolveNavigation, resolveBaseUrl and buildSignedUrl");
  }

  const baseUrl = await resolveBaseUrl();
  return Object.fromEntries(
    safeEntries.map((entry) => {
      const bundleKey = String(entry.key || entry.commandKey || "").trim();
      const navigation = buildNavigationFromCommand(entry.commandKey, resolveNavigation, entry.overrides, resolveActionNavigation);
      if (!bundleKey) {
        return [];
      }
      if (!navigation) {
        return [bundleKey, ""];
      }
      return [bundleKey, buildSignedUrl(baseUrl, navigation) || ""];
    })
  );
}

module.exports = {
  buildNavigationFromCommand,
  resolveLaunchUrlBundle
};
