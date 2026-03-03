const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

async function loadGoLiveModule() {
  const target = pathToFileURL(path.join(process.cwd(), "scripts", "v5_go_live_check.mjs")).href;
  return import(target);
}

test("resolveGoLiveStage maps stage aliases to expected rollout keys", async () => {
  const mod = await loadGoLiveModule();
  assert.deepEqual(mod.resolveGoLiveStage("admin"), { key: "admin_canary", cliStage: "admin" });
  assert.deepEqual(mod.resolveGoLiveStage("25"), { key: "rollout_25", cliStage: "25" });
  assert.deepEqual(mod.resolveGoLiveStage("100"), { key: "rollout_100", cliStage: "100" });
  assert.deepEqual(mod.resolveGoLiveStage("rollout_100"), { key: "rollout_100", cliStage: "100" });
});

test("buildGoLiveThresholdInput uses strict stage defaults by default", async () => {
  const mod = await loadGoLiveModule();
  const out = mod.buildGoLiveThresholdInput({}, "rollout_100");
  assert.equal(Number(out.min_command_events_24h), 3);
  assert.equal(Number(out.min_queue_success_rate_pct), 90);
  assert.equal(String(out.require_command_events), "true");
  assert.equal(String(out.require_queue_events), "true");
});

test("buildReadinessHints computes missing command and queue events", async () => {
  const mod = await loadGoLiveModule();
  const hints = mod.buildReadinessHints(
    {
      kpis: {
        command_events_24h: 1,
        queue_action_events_24h: 0
      }
    },
    {
      min_command_events_24h: 3,
      require_command_events: true,
      require_queue_events: true
    }
  );

  assert.equal(hints.command_events_24h, 1);
  assert.equal(hints.min_command_events_24h, 3);
  assert.equal(hints.missing_command_events, 2);
  assert.equal(hints.missing_queue_events, 1);
  assert.equal(hints.command_events_ready, false);
  assert.equal(hints.queue_events_ready, false);
});

