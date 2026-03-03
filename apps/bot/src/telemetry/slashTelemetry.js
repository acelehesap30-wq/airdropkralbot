function createSlashCommandTelemetryMiddleware(options = {}) {
  const parseSlashCommandText = options.parseSlashCommandText;
  const commandAliasLookup = options.commandAliasLookup;
  const ensureProfile = options.ensureProfile;
  const resolvePreferredLanguage = options.resolvePreferredLanguage;
  const logV5CommandEvent = options.logV5CommandEvent;
  const logEvent = typeof options.logEvent === "function" ? options.logEvent : () => {};

  if (typeof parseSlashCommandText !== "function") {
    throw new Error("slash_telemetry_requires_parseSlashCommandText");
  }
  if (!commandAliasLookup || typeof commandAliasLookup.has !== "function") {
    throw new Error("slash_telemetry_requires_commandAliasLookup");
  }
  if (typeof ensureProfile !== "function") {
    throw new Error("slash_telemetry_requires_ensureProfile");
  }
  if (typeof resolvePreferredLanguage !== "function") {
    throw new Error("slash_telemetry_requires_resolvePreferredLanguage");
  }
  if (typeof logV5CommandEvent !== "function") {
    throw new Error("slash_telemetry_requires_logV5CommandEvent");
  }

  return async function slashCommandTelemetryMiddleware(ctx, next) {
    const text = String(ctx?.message?.text || "").trim();
    const slash = parseSlashCommandText(text);
    if (slash && commandAliasLookup.has(slash.key)) {
      try {
        const profile = await ensureProfile(ctx);
        const locale = resolvePreferredLanguage(profile, ctx, "tr");
        await logV5CommandEvent(ctx, {
          userId: Number(profile.user_id || 0),
          commandKey: slash.key,
          handlerKey: commandAliasLookup.get(slash.key) || slash.key,
          source: "bot_slash",
          locale,
          text,
          argsText: slash.argsText,
          isSlash: true
        });
      } catch (err) {
        logEvent("slash_command_log_failed", {
          user_id: Number(ctx?.from?.id || 0),
          error: String(err?.message || err),
          command_key: slash.key
        });
      }
    }
    if (typeof next === "function") {
      await next();
    }
  };
}

module.exports = {
  createSlashCommandTelemetryMiddleware
};
