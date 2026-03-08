"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  resolveLiveOpsRecipientCapRecommendation,
  resolveLiveOpsSceneGate
} = require("../../../packages/shared/src/liveOpsSceneGate.cjs");

test("resolveLiveOpsSceneGate blocks scheduler on alert band", () => {
  const gate = resolveLiveOpsSceneGate(
    {
      total_24h: 10,
      alarm_state_7d: "alert"
    },
    {
      targeting: {
        max_recipients: 40
      }
    }
  );

  assert.equal(gate.scene_gate_state, "alert");
  assert.equal(gate.scene_gate_effect, "blocked");
  assert.equal(gate.scene_gate_reason, "scene_runtime_alert_blocked");
  assert.equal(gate.scene_gate_recipient_cap, 0);
  assert.equal(gate.ready_for_auto_dispatch, false);
});

test("resolveLiveOpsSceneGate caps scheduler on watch band", () => {
  const gate = resolveLiveOpsSceneGate(
    {
      total_24h: 10,
      alarm_state_7d: "watch"
    },
    {
      targeting: {
        max_recipients: 40
      }
    }
  );

  assert.equal(gate.scene_gate_state, "watch");
  assert.equal(gate.scene_gate_effect, "capped");
  assert.equal(gate.scene_gate_reason, "scene_runtime_watch_capped");
  assert.equal(gate.scene_gate_recipient_cap, 20);
  assert.equal(gate.ready_for_auto_dispatch, true);
});

test("resolveLiveOpsRecipientCapRecommendation tightens cap on matching segment pressure", () => {
  const recommendation = resolveLiveOpsRecipientCapRecommendation(
    {
      total_24h: 10,
      alarm_state_7d: "watch"
    },
    {
      targeting: {
        segment_key: "wallet_unlinked",
        max_recipients: 40
      },
      surfaces: [{ surface_key: "wallet_panel" }]
    },
    {
      skipped_24h: 1,
      skipped_7d: 3,
      alarm_state: "watch"
    },
    {
      raised_24h: 1,
      raised_7d: 3,
      latest_alarm_state: "watch",
      experiment_key: "webapp_react_v1",
      segment_breakdown: [{ bucket_key: "wallet_unlinked", item_count: 3 }],
      locale_breakdown: [{ bucket_key: "tr", item_count: 2 }],
      surface_breakdown: [{ bucket_key: "wallet_panel", item_count: 2 }],
      variant_breakdown: [{ bucket_key: "treatment", item_count: 2 }],
      cohort_breakdown: [{ bucket_key: "17", item_count: 2 }]
    }
  );

  assert.equal(recommendation.scene_gate_recipient_cap, 20);
  assert.equal(recommendation.recommended_recipient_cap, 12);
  assert.equal(recommendation.effective_cap_delta, 28);
  assert.equal(recommendation.pressure_band, "watch");
  assert.equal(recommendation.reason, "ops_alert_segment_pressure");
  assert.equal(recommendation.segment_match, true);
  assert.equal(recommendation.surface_match, true);
});
