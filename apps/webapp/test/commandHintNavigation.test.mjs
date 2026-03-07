import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL } from "node:url";

async function loadModule() {
  const target = pathToFileURL(
    path.join(process.cwd(), "apps", "webapp", "src", "core", "player", "commandHintNavigation.js")
  ).href;
  return import(target);
}

test("resolvePlayerCommandHintNavigation prefers canonical action keys", async () => {
  const mod = await loadModule();

  assert.deepEqual(
    mod.resolvePlayerCommandHintNavigation({
      key: "play",
      action_key: "player.route.world_hub"
    }),
    {
      kind: "action",
      action_key: "player.route.world_hub"
    }
  );
});

test("resolvePlayerCommandHintNavigation falls back to shared player command navigation", async () => {
  const mod = await loadModule();

  assert.deepEqual(
    mod.resolvePlayerCommandHintNavigation({
      key: "wallet"
    }),
    {
      kind: "action",
      action_key: "player.route.wallet_connect"
    }
  );

  assert.deepEqual(
    mod.resolvePlayerCommandHintNavigation({
      key: "kingdom"
    }),
    {
      kind: "route",
      route_key: "season",
      panel_key: "kingdom",
      focus_key: "weekly_ladder",
      tab: "pvp"
    }
  );
});

test("resolvePlayerCommandHintNavigation returns null for unsupported hints", async () => {
  const mod = await loadModule();
  assert.equal(mod.resolvePlayerCommandHintNavigation({ key: "admin_queue" }), null);
});
