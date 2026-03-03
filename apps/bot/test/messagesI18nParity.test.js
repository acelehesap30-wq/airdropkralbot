const test = require("node:test");
const assert = require("node:assert/strict");
const messages = require("../src/messages");
const { buildPlayKeyboard } = require("../src/ui/keyboards");

test("formatGuide renders English copy when lang is en", () => {
  const text = messages.formatGuide(
    {
      profile: { public_name: "Alice", kingdom_tier: 2, current_streak: 5 },
      daily: { tasksDone: 1, dailyCap: 5 },
      offers: [{ id: 1 }],
      balances: { RC: 3 }
    },
    { lang: "en" }
  );

  assert.match(text, /\*Nexus Guide\*/);
  assert.match(text, /Best Next Move/);
  assert.doesNotMatch(text, /Nexus Rehber/);
});

test("formatOnboard renders English copy when lang is en", () => {
  const text = messages.formatOnboard(
    {
      profile: { public_name: "Bob", kingdom_tier: 1 },
      balances: { SC: 10, HC: 2, RC: 1 },
      daily: { tasksDone: 2, dailyCap: 5, scEarned: 7 },
      season: { seasonId: 9, daysLeft: 12 },
      token: { symbol: "NXT", balance: 1.2345, spotUsd: 0.00012 }
    },
    { lang: "en" }
  );

  assert.match(text, /\*Onboard \/\/ 3 Steps\*/);
  assert.match(text, /Player: \*/);
  assert.doesNotMatch(text, /Onboard \/\/ 3 Adim/);
});

test("buildPlayKeyboard uses English labels for en locale", () => {
  const keyboard = buildPlayKeyboard("https://example.com/app", "en");
  const rows = keyboard?.reply_markup?.inline_keyboard || [];
  const labels = rows.flat().map((button) => button.text);

  assert.deepEqual(labels, ["Open Arena 3D", "Open in Browser", "Back to Bot Panel"]);
});
