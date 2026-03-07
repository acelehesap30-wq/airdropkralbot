const test = require("node:test");
const assert = require("node:assert/strict");
const {
  resolvePlayerCommandActionKey,
  resolvePlayerCommandNavigation
} = require("../../../packages/shared/src/playerCommandNavigation");

test("shared player command navigation resolves core player commands", () => {
  assert.deepEqual(resolvePlayerCommandNavigation("play"), {
    route_key: "hub",
    panel_key: "",
    focus_key: "",
    workspace: "player",
    tab: "home"
  });

  assert.deepEqual(resolvePlayerCommandNavigation("profile"), {
    route_key: "hub",
    panel_key: "profile",
    focus_key: "identity",
    workspace: "player",
    tab: "home"
  });

  assert.deepEqual(resolvePlayerCommandNavigation("/wallet"), {
    route_key: "vault",
    panel_key: "wallet",
    focus_key: "connect",
    workspace: "player",
    tab: "vault"
  });

  assert.deepEqual(resolvePlayerCommandNavigation("events"), {
    route_key: "events",
    panel_key: "discover",
    focus_key: "command_center",
    workspace: "player",
    tab: "pvp"
  });

  assert.equal(resolvePlayerCommandActionKey("wallet"), "player.route.wallet_connect");
  assert.equal(resolvePlayerCommandActionKey("settings"), "player.panel.settings");
});

test("shared player command navigation returns null for unsupported admin keys", () => {
  assert.equal(resolvePlayerCommandNavigation("admin_queue"), null);
});
