import test from "node:test";
import assert from "node:assert/strict";
import { buildLiveOpsCampaignPreflight } from "../src/core/admin/liveOpsCampaignPreflight.js";

test("buildLiveOpsCampaignPreflight exposes capped watch gate for draft campaign", () => {
  const result = buildLiveOpsCampaignPreflight(
    JSON.stringify({
      campaign_key: "wallet_reconnect",
      targeting: {
        segment_key: "wallet_unlinked",
        max_recipients: 40
      }
    }),
    {
      total_24h: 12,
      alarm_state_7d: "watch"
    },
    {
      skipped_24h: 2,
      skipped_7d: 5,
      latest_skip_reason: "scene_runtime_watch_capped",
      latest_skip_at: "2026-03-08T11:22:00.000Z"
    }
  );

  assert.equal(result.ok, true);
  assert.equal(result.campaign_key, "wallet_reconnect");
  assert.equal(result.segment_key, "wallet_unlinked");
  assert.equal(result.max_recipients, 40);
  assert.equal(result.recent_skip_24h, 2);
  assert.equal(result.recent_skip_7d, 5);
  assert.equal(result.recent_skip_pressure, "active");
  assert.equal(result.latest_skip_reason, "scene_runtime_watch_capped");
  assert.equal(result.gate.scene_gate_effect, "capped");
  assert.equal(result.gate.scene_gate_recipient_cap, 20);
});

test("buildLiveOpsCampaignPreflight returns parse error for invalid draft", () => {
  const result = buildLiveOpsCampaignPreflight(
    "{bad json",
    {
      total_24h: 0,
      alarm_state_7d: "no_data"
    },
    {
      skipped_24h: 0,
      skipped_7d: 1,
      latest_skip_reason: "already_dispatched_for_window"
    }
  );

  assert.equal(result.ok, false);
  assert.equal(result.error, "live_ops_campaign_invalid_json");
  assert.equal(result.recent_skip_pressure, "watch");
  assert.equal(result.latest_skip_reason, "already_dispatched_for_window");
  assert.equal(result.gate.scene_gate_state, "no_data");
});
