const test = require("node:test");
const assert = require("node:assert/strict");
const { createSafeMarkdownReplyMiddleware } = require("../src/utils/safeMarkdownReply");

test("safe markdown middleware falls back to plain text on parse error", async () => {
  const sent = [];
  const middleware = createSafeMarkdownReplyMiddleware();
  const ctx = {
    state: {},
    from: { id: 1 },
    replyWithMarkdown: async () => {
      const err = new Error("can't parse entities");
      err.description = "Bad Request: can't parse entities";
      throw err;
    },
    reply: async (text, extra) => {
      sent.push({ text, extra });
      return { ok: true };
    }
  };

  await middleware(ctx, async () => {
    await ctx.replyWithMarkdown("*User* [broken](test");
  });

  assert.equal(sent.length, 1);
  assert.match(sent[0].text, /User/);
});
