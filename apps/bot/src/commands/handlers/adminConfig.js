// ── /admin_config Command Handler ─────────────────────────────
// View and update game configuration at runtime.
// Usage: /admin_config                    — list all
//        /admin_config <key>              — view one
//        /admin_config <key> <json_value> — update

const configStore = require("../../stores/configStore");
const { withTransaction } = require("../../db");

async function handleAdminConfig(ctx, pool) {
  const text = ctx.message?.text || "";
  const parts = text.trim().split(/\s+/).slice(1);

  if (parts.length === 0) {
    // List all configs
    const configs = await withTransaction(pool, (db) => configStore.getAllConfigs(db));
    if (!configs || configs.length === 0) {
      await ctx.replyWithMarkdown("⚠️ Henüz config yok.");
      return;
    }
    const lines = configs.map((c) =>
      `\`${c.key}\`: \`${JSON.stringify(c.value)}\``
    ).join("\n");
    await ctx.replyWithMarkdown(`⚙️ *Game Configs*\n━━━━━━━━━━━━━━━━━━━━━━\n${lines}`);
    return;
  }

  const key = parts[0];

  if (parts.length === 1) {
    // View single config
    const val = await withTransaction(pool, (db) => configStore.getGameConfig(db, key));
    await ctx.replyWithMarkdown(`⚙️ *${key}*\n\`\`\`json\n${JSON.stringify(val, null, 2)}\n\`\`\``);
    return;
  }

  // Update config: /admin_config <key> <json>
  const jsonStr = parts.slice(1).join(" ");
  let parsed;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    await ctx.replyWithMarkdown("❌ Geçersiz JSON. Örnek:\n`/admin_config slot {\"max_bet\":50000}`");
    return;
  }

  // Merge with existing
  const existing = await withTransaction(pool, (db) => configStore.getGameConfig(db, key));
  const merged = { ...existing, ...parsed };
  await withTransaction(pool, (db) => configStore.setGameConfig(db, key, merged));

  await ctx.replyWithMarkdown(
    `✅ *${key}* güncellendi\n\`\`\`json\n${JSON.stringify(merged, null, 2)}\n\`\`\``
  );
}

module.exports = { handleAdminConfig };
