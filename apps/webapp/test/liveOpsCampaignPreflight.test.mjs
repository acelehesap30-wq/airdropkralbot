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
    }
  );

  assert.equal(result.ok, true);
  assert.equal(result.campaign_key, "wallet_reconnect");
  assert.equal(result.segment_key, "wallet_unlinked");
  assert.equal(result.max_recipients, 40);
  assert.equal(result.gate.scene_gate_effect, "capped");
  assert.equal(result.gate.scene_gate_recipient_cap, 20);
});

test("buildLiveOpsCampaignPreflight returns parse error for invalid draft", () => {
  const result = buildLiveOpsCampaignPreflight("{bad json", {
    total_24h: 0,
    alarm_state_7d: "no_data"
  });

  assert.equal(result.ok, false);
  assert.equal(result.error, "live_ops_campaign_invalid_json");
  assert.equal(result.gate.scene_gate_state, "no_data");
});
