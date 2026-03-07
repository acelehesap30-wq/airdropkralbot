import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL } from "node:url";

async function loadModule() {
  const target = pathToFileURL(
    path.join(process.cwd(), "apps", "webapp", "src", "core", "player", "playerCommandTarget.js")
  ).href;
  return import(target);
}

test("resolvePlayerCommandTarget maps core command keys into canonical targets", async () => {
  const mod = await loadModule();

  assert.deepEqual(mod.resolvePlayerCommandTarget("/wallet"), {
    route_key: "vault",
    panel_key: "wallet",
    focus_key: "connect",
    workspace: "player",
    tab: "vault"
  });

  assert.deepEqual(mod.resolvePlayerCommandTarget("payout"), {
    route_key: "vault",
    panel_key: "payout",
    focus_key: "request",
    workspace: "player",
    tab: "vault"
  });

  assert.deepEqual(mod.resolvePlayerCommandTarget("missions"), {
    route_key: "missions",
    panel_key: "quests",
    focus_key: "board",
    workspace: "player",
    tab: "tasks"
  });

  assert.deepEqual(mod.resolvePlayerCommandTarget("leaderboard"), {
    route_key: "season",
    panel_key: "leaderboard",
    focus_key: "leaderboard",
    workspace: "player",
    tab: "pvp"
  });
});

test("resolvePlayerCommandTarget returns null for unsupported keys", async () => {
  const mod = await loadModule();
  assert.equal(mod.resolvePlayerCommandTarget("admin_queue"), null);
  assert.equal(mod.resolvePlayerCommandTarget(""), null);
});
