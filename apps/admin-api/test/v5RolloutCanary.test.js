const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

async function loadRolloutModule() {
  const target = pathToFileURL(path.join(process.cwd(), "scripts", "v5_rollout_canary.mjs")).href;
  return import(target);
}

test("resolveStage maps admin, 25 and 100 stages", async () => {
  const rollout = await loadRolloutModule();
  assert.deepEqual(rollout.resolveStage("admin"), { key: "admin_canary", pct: 5, run: false });
  assert.deepEqual(rollout.resolveStage("25"), { key: "rollout_25", pct: 25, run: true });
  assert.deepEqual(rollout.resolveStage("100"), { key: "rollout_100", pct: 100, run: true });
});

test("buildCanaryThresholdInput applies stage defaults", async () => {
  const rollout = await loadRolloutModule();

  const admin = rollout.buildCanaryThresholdInput({}, "admin_canary");
  assert.equal(Number(admin.min_queue_success_rate_pct), 80);
  assert.equal(String(admin.require_command_events), "false");
  assert.equal(String(admin.require_queue_events), "false");

  const s25 = rollout.buildCanaryThresholdInput({}, "rollout_25");
  assert.equal(Number(s25.min_queue_success_rate_pct), 85);
  assert.equal(Number(s25.max_queue_failed_rate_pct), 15);
  assert.equal(String(s25.require_command_events), "true");
  assert.equal(String(s25.require_queue_events), "true");

  const s100 = rollout.buildCanaryThresholdInput({}, "rollout_100");
  assert.equal(Number(s100.min_queue_success_rate_pct), 90);
  assert.equal(Number(s100.max_tx_verify_error_rate_pct), 8);
  assert.equal(Number(s100.max_invalid_action_request_id_events_24h), 0);
});

test("buildCanaryThresholdInput allows env and arg overrides", async () => {
  const rollout = await loadRolloutModule();
  const prevMin = process.env.V5_CANARY_MIN_QUEUE_SUCCESS_RATE_PCT;
  const prevRequireQueue = process.env.V5_CANARY_REQUIRE_QUEUE_EVENTS;
  try {
    process.env.V5_CANARY_MIN_QUEUE_SUCCESS_RATE_PCT = "88";
    process.env.V5_CANARY_REQUIRE_QUEUE_EVENTS = "true";
    const fromEnv = rollout.buildCanaryThresholdInput({}, "admin_canary");
    assert.equal(String(fromEnv.min_queue_success_rate_pct), "88");
    assert.equal(String(fromEnv.require_queue_events), "true");

    const fromArgs = rollout.buildCanaryThresholdInput(
      {
        canary_min_queue_success_rate_pct: "92",
        canary_require_queue_events: "false"
      },
      "admin_canary"
    );
    assert.equal(String(fromArgs.min_queue_success_rate_pct), "92");
    assert.equal(String(fromArgs.require_queue_events), "false");
  } finally {
    if (prevMin == null) {
      delete process.env.V5_CANARY_MIN_QUEUE_SUCCESS_RATE_PCT;
    } else {
      process.env.V5_CANARY_MIN_QUEUE_SUCCESS_RATE_PCT = prevMin;
    }
    if (prevRequireQueue == null) {
      delete process.env.V5_CANARY_REQUIRE_QUEUE_EVENTS;
    } else {
      process.env.V5_CANARY_REQUIRE_QUEUE_EVENTS = prevRequireQueue;
    }
  }
});

test("resolveAdminApiBaseUrl prefers explicit URL then ADMIN_API_PORT fallback", async () => {
  const rollout = await loadRolloutModule();
  const prevBaseUrl = process.env.ADMIN_API_BASE_URL;
  const prevPort = process.env.ADMIN_API_PORT;
  try {
    process.env.ADMIN_API_BASE_URL = "http://example.local:5555///";
    process.env.ADMIN_API_PORT = "4999";
    assert.equal(rollout.resolveAdminApiBaseUrl(), "http://example.local:5555");

    delete process.env.ADMIN_API_BASE_URL;
    process.env.ADMIN_API_PORT = "4111";
    assert.equal(rollout.resolveAdminApiBaseUrl(), "http://127.0.0.1:4111");

    process.env.ADMIN_API_PORT = "invalid";
    assert.equal(rollout.resolveAdminApiBaseUrl(), "http://127.0.0.1:4000");
  } finally {
    if (prevBaseUrl == null) {
      delete process.env.ADMIN_API_BASE_URL;
    } else {
      process.env.ADMIN_API_BASE_URL = prevBaseUrl;
    }
    if (prevPort == null) {
      delete process.env.ADMIN_API_PORT;
    } else {
      process.env.ADMIN_API_PORT = prevPort;
    }
  }
});
