const test = require("node:test");
const assert = require("node:assert/strict");
const { buildHelpIndexKeyboard, buildHelpCommandCardKeyboard } = require("../src/ui/keyboards");

test("help index keyboard builds category, command and paging callbacks", () => {
  const keyboard = buildHelpIndexKeyboard(
    {
      categories: [
        { key: "core_loop", label: "Core Loop", active: true },
        { key: "economy", label: "Ekonomi", active: false }
      ],
      activeCategory: "core_loop",
      items: [{ key: "tasks" }, { key: "finish" }],
      page: 1,
      totalPages: 3
    },
    "tr"
  );
  const rows = keyboard?.reply_markup?.inline_keyboard || [];
  const callbackData = rows.flat().map((btn) => btn.callback_data);

  assert.ok(callbackData.includes("HELP_SECTION:core_loop:1"));
  assert.ok(callbackData.includes("HELP_SECTION:economy:1"));
  assert.ok(callbackData.includes("HELP_CARD:tasks"));
  assert.ok(callbackData.includes("HELP_CARD:finish"));
  assert.ok(callbackData.includes("HELP_SECTION:core_loop:2"));
});

test("help command card keyboard provides related commands and back action", () => {
  const keyboard = buildHelpCommandCardKeyboard(
    {
      relatedCommands: ["wallet", "vault", "token"],
      backCategory: "economy",
      backPage: 2
    },
    "tr"
  );
  const rows = keyboard?.reply_markup?.inline_keyboard || [];
  const callbackData = rows.flat().map((btn) => btn.callback_data);

  assert.ok(callbackData.includes("HELP_CARD:wallet"));
  assert.ok(callbackData.includes("HELP_CARD:vault"));
  assert.ok(callbackData.includes("HELP_BACK:economy:2"));
});

