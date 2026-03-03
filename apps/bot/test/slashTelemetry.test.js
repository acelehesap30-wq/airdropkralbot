const test = require("node:test");
const assert = require("node:assert/strict");
const { createSlashCommandTelemetryMiddleware } = require("../src/telemetry/slashTelemetry");

test("slash telemetry middleware logs known slash command and continues chain", async () => {
  const calls = [];
  const middleware = createSlashCommandTelemetryMiddleware({
    parseSlashCommandText: (text) => {
      const cleaned = String(text || "").trim();
      if (!cleaned.startsWith("/")) return null;
      return {
        key: cleaned.replace(/^\//, "").split(/\s+/)[0],
        argsText: cleaned.split(/\s+/).slice(1).join(" ")
      };
    },
    commandAliasLookup: new Map([["tasks", "tasks"]]),
    ensureProfile: async () => ({ user_id: 42, locale: "tr" }),
    resolvePreferredLanguage: () => "tr",
    logV5CommandEvent: async (_ctx, payload) => {
      calls.push(payload);
    }
  });

  let nextCalled = false;
  const ctx = {
    from: { id: 99 },
    message: { text: "/tasks fast" }
  };
  await middleware(ctx, async () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].userId, 42);
  assert.equal(calls[0].commandKey, "tasks");
  assert.equal(calls[0].isSlash, true);
  assert.equal(calls[0].argsText, "fast");
});

test("slash telemetry middleware ignores unknown slash commands", async () => {
  let logged = false;
  const middleware = createSlashCommandTelemetryMiddleware({
    parseSlashCommandText: () => ({ key: "unknown", argsText: "" }),
    commandAliasLookup: new Map([["tasks", "tasks"]]),
    ensureProfile: async () => ({ user_id: 42, locale: "tr" }),
    resolvePreferredLanguage: () => "tr",
    logV5CommandEvent: async () => {
      logged = true;
    }
  });

  await middleware(
    {
      from: { id: 77 },
      message: { text: "/unknown" }
    },
    async () => {}
  );

  assert.equal(logged, false);
});
