const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

async function loadCanaryModule() {
  const target = pathToFileURL(path.join(process.cwd(), "scripts", "v5_canary_guard.mjs")).href;
  return import(target);
}

test("evaluateCanary passes healthy snapshot", async () => {
  const canary = await loadCanaryModule();
  const thresholds = canary.parseThresholds({});
  const evaluation = canary.evaluateCanary(
    {
      kpis: {
        command_events_24h: 12,
        tx_verify_events_24h: 10,
        tx_verify_error_rate_pct: 10,
        idempotency_conflict_events_24h: 1,
        invalid_action_request_id_events_24h: 0
      },
      details: {
        queue_actions: {
          total_events: 20,
          success_events: 18,
          failed_events: 2,
          queued_events: 1
        }
      }
    },
    thresholds
  );

  assert.equal(evaluation.ok, true);
  assert.equal(evaluation.failed_checks, 0);
});

test("evaluateCanary fails unhealthy snapshot", async () => {
  const canary = await loadCanaryModule();
  const thresholds = canary.parseThresholds({
    min_command_events_24h: 1,
    max_queue_failed_rate_pct: 20,
    max_tx_verify_error_rate_pct: 20,
    max_idempotency_conflict_events_24h: 2,
    max_invalid_action_request_id_events_24h: 1
  });
  const evaluation = canary.evaluateCanary(
    {
      kpis: {
        command_events_24h: 0,
        tx_verify_events_24h: 10,
        tx_verify_error_rate_pct: 60,
        idempotency_conflict_events_24h: 7,
        invalid_action_request_id_events_24h: 3
      },
      details: {
        queue_actions: {
          total_events: 10,
          success_events: 5,
          failed_events: 5,
          queued_events: 4
        }
      }
    },
    thresholds
  );

  assert.equal(evaluation.ok, false);
  assert.ok(evaluation.failed_checks >= 5);
});

