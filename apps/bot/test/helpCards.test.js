const test = require("node:test");
const assert = require("node:assert/strict");
const { getCommandRegistry, buildAliasLookup } = require("../src/commands/registry");
const {
  buildHelpCards,
  buildHelpCardMap,
  validateHelpCardsCoverage,
  resolveHelpTarget,
  suggestHelpKeys
} = require("../src/commands/helpCards");

test("help cards keep one-to-one coverage with registry", () => {
  const registry = getCommandRegistry();
  const cards = buildHelpCards(registry);
  const coverage = validateHelpCardsCoverage(registry, cards);

  assert.equal(coverage.ok, true);
  assert.equal(cards.length, registry.length);
});

test("help target resolves command alias payout -> vault", () => {
  const registry = getCommandRegistry();
  const cards = buildHelpCards(registry);
  const map = buildHelpCardMap(cards);
  const aliasLookup = buildAliasLookup(registry);
  const resolved = resolveHelpTarget("payout", {
    includeAdmin: false,
    cards,
    cardMap: map,
    aliasLookup
  });

  assert.equal(resolved.kind, "card");
  assert.equal(resolved.key, "vault");
});

test("help target resolves command alias raid -> pvp", () => {
  const registry = getCommandRegistry();
  const cards = buildHelpCards(registry);
  const map = buildHelpCardMap(cards);
  const aliasLookup = buildAliasLookup(registry);
  const resolved = resolveHelpTarget("raid", {
    includeAdmin: false,
    cards,
    cardMap: map,
    aliasLookup
  });

  assert.equal(resolved.kind, "card");
  assert.equal(resolved.key, "pvp");
});

test("help target resolves economy category and admin permission boundary", () => {
  const registry = getCommandRegistry();
  const cards = buildHelpCards(registry);
  const map = buildHelpCardMap(cards);
  const aliasLookup = buildAliasLookup(registry);

  const economy = resolveHelpTarget("ekonomi", {
    includeAdmin: false,
    cards,
    cardMap: map,
    aliasLookup
  });
  assert.equal(economy.kind, "index");
  assert.equal(economy.category, "economy");

  const forbidden = resolveHelpTarget("admin_freeze", {
    includeAdmin: false,
    cards,
    cardMap: map,
    aliasLookup
  });
  assert.equal(forbidden.kind, "forbidden");
  assert.equal(forbidden.key, "admin_freeze");
});

test("help suggestions return close commands for typo queries", () => {
  const registry = getCommandRegistry();
  const cards = buildHelpCards(registry);
  const aliasLookup = buildAliasLookup(registry);
  const suggestions = suggestHelpKeys("tokn", {
    includeAdmin: false,
    cards,
    aliasLookup,
    limit: 4
  });

  assert.ok(suggestions.includes("token"));
});

test("help cards keep mandatory flow chains stable", () => {
  const registry = getCommandRegistry();
  const cards = buildHelpCards(registry);
  const map = buildHelpCardMap(cards);

  const tasks = map.get("tasks");
  const wallet = map.get("wallet");
  const token = map.get("token");
  const status = map.get("status");
  const adminQueue = map.get("admin_queue");

  assert.deepEqual(tasks.related_commands.slice(0, 2), ["finish", "reveal"]);
  assert.equal(wallet.related_commands.includes("vault"), true);
  assert.equal(wallet.related_commands.includes("token"), true);
  assert.equal(token.related_commands.includes("buytoken"), true);
  assert.equal(token.related_commands.includes("tx"), true);
  assert.deepEqual(status.related_commands.slice(0, 2), ["perf", "ui_mode"]);
  assert.deepEqual(adminQueue.related_commands.slice(0, 3), ["admin_payouts", "admin_tokens", "pay"]);
});

test("argument-sensitive commands expose explicit syntax placeholders", () => {
  const registry = getCommandRegistry();
  const cards = buildHelpCards(registry);
  const map = buildHelpCardMap(cards);

  assert.ok(map.get("tx").syntax.some((row) => row.includes("<requestId>") && row.includes("<txHash>")));
  assert.ok(map.get("buytoken").syntax.some((row) => row.includes("<usd>") && row.includes("<chain>")));
  assert.ok(map.get("admin_gate").syntax.some((row) => row.includes("<minCapUsd>")));
  assert.ok(map.get("pay").syntax.some((row) => row.includes("<requestId>") && row.includes("<txHash>")));
});

test("all command cards expose operation flow and decision guards", () => {
  const registry = getCommandRegistry();
  const cards = buildHelpCards(registry);
  assert.equal(cards.length, registry.length);

  for (const card of cards) {
    assert.ok(Array.isArray(card.operation_flow_tr) && card.operation_flow_tr.length >= 3, `${card.key}:operation_flow_tr`);
    assert.ok(Array.isArray(card.operation_flow_en) && card.operation_flow_en.length >= 3, `${card.key}:operation_flow_en`);
    assert.ok(Array.isArray(card.decision_guards_tr) && card.decision_guards_tr.length >= 2, `${card.key}:decision_guards_tr`);
    assert.ok(Array.isArray(card.decision_guards_en) && card.decision_guards_en.length >= 2, `${card.key}:decision_guards_en`);
  }
});
