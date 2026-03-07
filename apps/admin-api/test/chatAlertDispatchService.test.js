"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  CHAT_ALERT_EVENT_TYPE,
  buildAlertStateKey,
  isAlertEnabledForPrefs,
  createChatAlertDispatchService
} = require("../src/services/chatAlertDispatchService");
const { formatChatAlertMessage } = require("../../../packages/shared/src/chatAlertMessages");

function createPoolStub() {
  return {
    async connect() {
      return {
        async query() {
          return { rows: [] };
        },
        release() {}
      };
    }
  };
}

test("chat alert message formatter localizes comeback offer", () => {
  const tr = formatChatAlertMessage("comeback_offer", { days_away: 4 }, { lang: "tr" });
  const en = formatChatAlertMessage("comeback_offer", { days_away: 4 }, { lang: "en" });
  assert.match(tr, /Dunyaya Donus Hazir/);
  assert.match(en, /World Resume Ready/);
});

test("alert prefs helper respects nested notification toggles", () => {
  assert.equal(isAlertEnabledForPrefs({}, "marketing_alert_toggle"), true);
  assert.equal(isAlertEnabledForPrefs({ notifications: { marketing_alert_toggle: false } }, "marketing_alert_toggle"), false);
  assert.equal(isAlertEnabledForPrefs({ chat_alerts_enabled: false }, "event_alert_toggle"), false);
});

test("chat alert dispatch service sends canonical chest ready alert and records behavior event", async () => {
  const sentPayloads = [];
  const recorded = [];
  const service = createChatAlertDispatchService({
    pool: createPoolStub(),
    fetchImpl: async (_url, options) => {
      sentPayloads.push(JSON.parse(String(options.body || "{}")));
      return {
        ok: true
      };
    },
    botToken: "bot_token",
    botUsername: "airdropkral_2026_bot",
    webappPublicUrl: "https://example.com/app",
    webappHmacSecret: "secret",
    resolveWebappVersion: async () => ({ version: "abc123" }),
    logger: () => {},
    recordAlertEvent: async (_client, payload) => {
      recorded.push(payload);
    },
    loadChestReadyCandidates: async () => [
      {
        user_id: 41,
        telegram_id: 777,
        locale: "en",
        prefs_json: {},
        task_attempt_id: 91,
        task_type: "raid",
        difficulty: "elite",
        completed_at: "2026-03-07T10:00:00.000Z"
      }
    ],
    loadStreakRiskCandidates: async () => [],
    loadEventCountdownCandidates: async () => [],
    loadComebackOfferCandidates: async () => []
  });

  const result = await service.runDispatchCycle({
    chestReadyLimit: 5,
    eventCountdownTargetDays: [3, 1]
  });

  assert.equal(result.ok, true);
  assert.equal(result.alerts.chest_ready.sent, 1);
  assert.equal(sentPayloads.length, 1);
  assert.match(sentPayloads[0].text, /\*Reward Lane Ready\*/);
  const firstButton = sentPayloads[0].reply_markup.inline_keyboard[0][0];
  assert.ok(firstButton.web_app.url.includes("route_key=vault"));
  assert.ok(firstButton.web_app.url.includes("launch_event_key=launch.alert.chest_ready_reward_lane.open"));
  assert.equal(recorded.length, 1);
  assert.equal(recorded[0].userId, 41);
  assert.equal(recorded[0].meta.alert_key, "chest_ready");
  assert.equal(recorded[0].meta.state_key, "attempt_91");
});

test("chat alert dispatch service supports dry run without telegram send", async () => {
  const service = createChatAlertDispatchService({
    pool: createPoolStub(),
    fetchImpl: async () => {
      throw new Error("fetch_should_not_run");
    },
    botToken: "bot_token",
    botUsername: "airdropkral_2026_bot",
    webappPublicUrl: "https://example.com/app",
    webappHmacSecret: "secret",
    logger: () => {},
    recordAlertEvent: async () => {
      throw new Error("record_should_not_run");
    },
    loadChestReadyCandidates: async () => [],
    loadStreakRiskCandidates: async () => [
      {
        user_id: 99,
        telegram_id: 555,
        locale: "tr",
        prefs_json: {},
        current_streak: 8,
        grace_until: "2026-03-07T12:30:00.000Z"
      }
    ],
    loadEventCountdownCandidates: async () => [],
    loadComebackOfferCandidates: async () => []
  });

  const result = await service.runDispatchCycle({
    dryRun: true
  });

  assert.equal(result.ok, true);
  assert.equal(result.dry_run, true);
  assert.equal(result.alerts.streak_risk.sent, 1);
  assert.equal(result.totals.recorded, 0);
});

test("alert state key uses season window for event countdown", () => {
  const key = buildAlertStateKey("event_countdown", {}, { seasonId: 4, daysLeft: 3 });
  assert.equal(key, "season_4_days_3");
  assert.equal(CHAT_ALERT_EVENT_TYPE, "chat_alert_sent");
});
