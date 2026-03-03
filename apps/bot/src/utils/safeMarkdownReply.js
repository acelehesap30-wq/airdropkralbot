function isMarkdownParseError(err) {
  const text = String(err?.description || err?.message || err || "").toLowerCase();
  return text.includes("parse entities") || text.includes("can't parse");
}

function markdownToPlainText(value) {
  return String(value || "")
    .replace(/\\([_*[\]()~`>#+\-=|{}.!\\])/g, "$1")
    .replace(/[*_`]/g, "")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)")
    .replace(/~{2}([^~]+)~{2}/g, "$1");
}

function createSafeMarkdownReplyMiddleware(options = {}) {
  const logEvent = typeof options.logEvent === "function" ? options.logEvent : null;
  return async function safeMarkdownReplyMiddleware(ctx, next) {
    if (!ctx || typeof ctx.replyWithMarkdown !== "function") {
      if (typeof next === "function") {
        await next();
      }
      return;
    }

    const alreadyPatched = Boolean(ctx.state && ctx.state.__safeMarkdownReplyPatched);
    if (!alreadyPatched) {
      const original = ctx.replyWithMarkdown.bind(ctx);
      if (!ctx.state || typeof ctx.state !== "object") {
        ctx.state = {};
      }
      ctx.state.__safeMarkdownReplyPatched = true;
      ctx.replyWithMarkdown = async (text, extra = {}) => {
        try {
          return await original(text, extra);
        } catch (err) {
          if (!isMarkdownParseError(err)) {
            throw err;
          }
          if (logEvent) {
            logEvent("markdown_reply_fallback", {
              user_id: Number(ctx.from?.id || 0),
              error: String(err?.message || err)
            });
          }
          const fallbackText = markdownToPlainText(text);
          const fallbackExtra = extra && typeof extra === "object" ? { ...extra } : {};
          delete fallbackExtra.parse_mode;
          return ctx.reply(fallbackText, fallbackExtra);
        }
      };
    }

    if (typeof next === "function") {
      await next();
    }
  };
}

module.exports = {
  createSafeMarkdownReplyMiddleware,
  markdownToPlainText
};
