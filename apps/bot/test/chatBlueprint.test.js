const test = require("node:test");
const assert = require("node:assert/strict");
const {
  CHAT_UX_PRINCIPLES,
  CHAT_INFORMATION_ARCHITECTURE,
  CHAT_COMMAND_MATRIX,
  ADMIN_HIDDEN_COMMANDS,
  CHAT_BUTTON_SYSTEM,
  CHAT_FIRST_RUN_FLOW,
  CHAT_REENGAGEMENT_SYSTEM,
  CHAT_LOCALIZATION_MODEL,
  CHAT_TRUST_SUPPORT_FRAMEWORK,
  CHAT_DEEP_LINK_FRAMEWORK,
  CHAT_FAILURE_MODES,
  getMenuCommands,
  getCommandByKey
} = require("../src/commands/chatBlueprint");

const REQUIRED_PLAYER_COMMANDS = [
  "start", "play", "hub", "profile", "rewards",
  "wallet", "claim", "payout", "history", "status",
  "missions", "season", "rank", "streak", "inventory",
  "invite", "friends", "kingdom", "leaderboard", "share",
  "events", "news", "chests", "quests", "discover",
  "language", "settings", "help", "support", "faq"
];

test("chat blueprint exposes all required top-level sections", () => {
  assert.ok(Array.isArray(CHAT_UX_PRINCIPLES) && CHAT_UX_PRINCIPLES.length >= 6);
  assert.ok(Array.isArray(CHAT_INFORMATION_ARCHITECTURE.chat_handles));
  assert.ok(Array.isArray(CHAT_COMMAND_MATRIX) && CHAT_COMMAND_MATRIX.length >= REQUIRED_PLAYER_COMMANDS.length);
  assert.ok(Array.isArray(ADMIN_HIDDEN_COMMANDS) && ADMIN_HIDDEN_COMMANDS.length >= 10);
  assert.ok(Array.isArray(CHAT_BUTTON_SYSTEM.primary_patterns));
  assert.ok(Array.isArray(CHAT_FIRST_RUN_FLOW.minute_0_to_1));
  assert.ok(Array.isArray(CHAT_REENGAGEMENT_SYSTEM) && CHAT_REENGAGEMENT_SYSTEM.length >= 8);
  assert.ok(Array.isArray(CHAT_LOCALIZATION_MODEL.detection_precedence));
  assert.ok(Array.isArray(CHAT_TRUST_SUPPORT_FRAMEWORK.payout_message_patterns));
  assert.ok(CHAT_DEEP_LINK_FRAMEWORK.startapp_strategy && typeof CHAT_DEEP_LINK_FRAMEWORK.startapp_strategy === "object");
  assert.ok(Array.isArray(CHAT_FAILURE_MODES) && CHAT_FAILURE_MODES.length >= 6);
});

test("player command matrix covers all required command keys with mandatory metadata", () => {
  const keys = new Set(CHAT_COMMAND_MATRIX.map((item) => item.key));
  for (const key of REQUIRED_PLAYER_COMMANDS) {
    assert.ok(keys.has(key), `missing player command blueprint: ${key}`);
    const row = getCommandByKey(key);
    assert.ok(row, `missing blueprint row lookup: ${key}`);
    assert.ok(row.purpose?.tr && row.purpose?.en, `${key}:purpose`);
    assert.ok(Array.isArray(row.labels?.tr) && row.labels.tr.length > 0, `${key}:labels_tr`);
    assert.ok(Array.isArray(row.labels?.en) && row.labels.en.length > 0, `${key}:labels_en`);
    assert.ok(String(row.first_use || "").trim(), `${key}:first_use`);
    assert.ok(String(row.confused || "").trim(), `${key}:confused`);
    assert.ok(Array.isArray(row.context) && row.context.length > 0, `${key}:context`);
    assert.ok(Array.isArray(row.analytics) && row.analytics.length > 0, `${key}:analytics`);
    assert.ok(Array.isArray(row.abuse) && row.abuse.length > 0, `${key}:abuse`);
    assert.ok(String(row.deep_link || "").trim(), `${key}:deep_link`);
  }
});

test("command menu stays compact and avoids command spam", () => {
  const menuKeys = getMenuCommands();
  assert.ok(menuKeys.length > 0);
  assert.ok(menuKeys.length <= 14, `menu too large: ${menuKeys.length}`);
  assert.ok(menuKeys.includes("hub"));
  assert.ok(menuKeys.includes("play"));
  assert.ok(menuKeys.includes("help"));
  assert.ok(!menuKeys.includes("history"));
  assert.ok(!menuKeys.includes("faq"));
});

test("admin hidden commands keep critical safeguards", () => {
  const keys = new Set(ADMIN_HIDDEN_COMMANDS.map((item) => item.key));
  for (const key of ["admin", "admin_queue", "admin_gate", "admin_freeze", "pay", "reject_payout", "approve_token", "reject_token"]) {
    assert.ok(keys.has(key), `missing admin command: ${key}`);
  }
  const critical = ADMIN_HIDDEN_COMMANDS.filter((item) => item.type === "critical");
  assert.ok(critical.length >= 5);
  for (const row of critical) {
    assert.ok(row.abuse.includes("critical_confirm_required"), `${row.key}:confirm_guard`);
  }
});

test("re-engagement rules and deep link strategy stay abuse-safe", () => {
  const deepLinkRules = new Set(CHAT_DEEP_LINK_FRAMEWORK.abuse_safe_validation);
  assert.ok(deepLinkRules.has("only_allow_known_zone_keys"));
  assert.ok(deepLinkRules.has("server_side_auth_signature_required"));
  for (const item of CHAT_REENGAGEMENT_SYSTEM) {
    assert.ok(String(item.key || "").trim(), "missing alert key");
    assert.ok(String(item.spam_limits || "").trim(), `${item.key}:spam_limits`);
    assert.ok(String(item.controls || "").trim(), `${item.key}:controls`);
  }
});
