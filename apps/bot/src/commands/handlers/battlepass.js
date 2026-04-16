// ── /battlepass Command Handler ───────────────────────────────
// Seasonal battle pass with free + premium tiers.
// Usage: /battlepass              — view progress
//        /battlepass claim <lvl>  — claim free reward
//        /battlepass premium      — upgrade to premium (cost NXT)

const battlePassStore = require("../../stores/battlePassStore");
const economyStore = require("../../stores/economyStore");
const userStore = require("../../stores/userStore");
const { withTransaction } = require("../../db");

function fmtNxt(n) {
  return Number(n || 0).toLocaleString("en", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function progressBar(cur, max, len = 15) {
  const filled = Math.min(len, Math.floor((cur / Math.max(1, max)) * len));
  return "█".repeat(filled) + "░".repeat(len - filled);
}

async function handleBattlePass(ctx, pool) {
  const userId = ctx.from?.id;
  if (!userId) return;

  const args = (ctx.message?.text || "").trim().split(/\s+/).slice(1);
  const sub = (args[0] || "").toLowerCase();

  if (sub === "claim") return claimReward(ctx, pool, parseInt(args[1], 10));
  if (sub === "premium") return upgradePremium(ctx, pool);

  // Default: show progress
  const data = await withTransaction(pool, async (db) => {
    const season = await battlePassStore.getActiveSeason(db);
    if (!season) return { ok: false, reason: "no_season" };

    const profile = await userStore.getOrCreateProfile(db, {
      telegramId: userId,
      publicName: ctx.from?.username ? `@${ctx.from.username}` : ctx.from?.first_name || "Kral"
    });

    const idRow = await db.query(
      `SELECT COALESCE(xp, 0) AS xp FROM identities WHERE user_id = $1;`,
      [profile.user_id]
    );
    const currentXp = Number(idRow.rows[0]?.xp || 0);

    // Auto-join if not joined
    let userBp = await battlePassStore.getUserBattlePass(db, profile.user_id, season.id);
    if (!userBp) {
      userBp = await battlePassStore.joinBattlePass(db, profile.user_id, season.id, currentXp);
    }

    const seasonXp = Math.max(0, currentXp - Number(userBp.xp_at_start || 0));
    const currentLevel = Math.min(season.max_levels, Math.floor(seasonXp / season.xp_per_level));
    const xpInLevel = seasonXp % season.xp_per_level;
    const daysLeft = Math.max(0, Math.ceil((new Date(season.ends_at) - new Date()) / 86400000));

    return {
      ok: true,
      season,
      userBp,
      currentXp,
      seasonXp,
      currentLevel,
      xpInLevel,
      daysLeft,
      profileId: profile.user_id
    };
  });

  if (!data.ok) {
    await ctx.replyWithMarkdown("⚠️ Aktif Battle Pass sezonu yok.");
    return;
  }

  const claimedFree = data.userBp.claimed_free || [];
  const claimedPremium = data.userBp.claimed_premium || [];
  const isPremium = data.userBp.is_premium;

  // Find unclaimed rewards within reached levels
  const unclaimedFree = [];
  const unclaimedPrem = [];
  for (let lvl = 1; lvl <= data.currentLevel; lvl++) {
    if (!claimedFree.includes(lvl)) unclaimedFree.push(lvl);
    if (isPremium && !claimedPremium.includes(lvl)) unclaimedPrem.push(lvl);
  }

  const bar = progressBar(data.xpInLevel, data.season.xp_per_level);

  let msg =
    `🎫 *${data.season.name} — Battle Pass*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `📊 Seviye: *${data.currentLevel}/${data.season.max_levels}*\n` +
    `${bar} ${data.xpInLevel}/${data.season.xp_per_level} XP\n` +
    `📅 Kalan: *${data.daysLeft} gün*\n` +
    `${isPremium ? "👑 *Premium Aktif*" : "🆓 Ücretsiz Tier"}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n`;

  if (unclaimedFree.length > 0) {
    msg += `\n🎁 *Alınabilir (Ücretsiz):* ${unclaimedFree.join(", ")}\n`;
    msg += `Claim: \`/battlepass claim <seviye>\`\n`;
  }
  if (unclaimedPrem.length > 0) {
    msg += `\n👑 *Alınabilir (Premium):* ${unclaimedPrem.join(", ")}\n`;
  }
  if (unclaimedFree.length === 0 && unclaimedPrem.length === 0) {
    msg += `\n_Alınabilir ödül yok. XP kazan, seviye atla!_\n`;
  }

  if (!isPremium) {
    msg += `\n━━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `💎 Premium: *${fmtNxt(data.season.premium_cost)} NXT*\n`;
    msg += `Yükselt: \`/battlepass premium\`\n`;
    msg += `(Tüm seviyelerde 3x NXT ödül)\n`;
  }

  msg += `━━━━━━━━━━━━━━━━━━━━━━`;
  await ctx.replyWithMarkdown(msg);
}

async function claimReward(ctx, pool, level) {
  const userId = ctx.from?.id;
  if (!userId || !level || isNaN(level)) {
    await ctx.replyWithMarkdown("⚠️ Kullanım: `/battlepass claim <seviye>`");
    return;
  }

  const result = await withTransaction(pool, async (db) => {
    const season = await battlePassStore.getActiveSeason(db);
    if (!season) return { ok: false, reason: "no_season" };

    const profile = await userStore.getOrCreateProfile(db, {
      telegramId: userId,
      publicName: ctx.from?.username ? `@${ctx.from.username}` : ctx.from?.first_name || "Kral"
    });

    const userBp = await battlePassStore.getUserBattlePass(db, profile.user_id, season.id);
    if (!userBp) return { ok: false, reason: "not_joined" };

    const idRow = await db.query(`SELECT COALESCE(xp, 0) AS xp FROM identities WHERE user_id = $1;`, [profile.user_id]);
    const seasonXp = Math.max(0, Number(idRow.rows[0]?.xp || 0) - Number(userBp.xp_at_start || 0));
    const currentLevel = Math.min(season.max_levels, Math.floor(seasonXp / season.xp_per_level));

    if (level > currentLevel || level < 1) {
      return { ok: false, reason: "level_not_reached", currentLevel };
    }

    // Claim free + premium (if premium)
    const rewards = [];
    const freeClaim = await battlePassStore.claimLevelReward(db, profile.user_id, season.id, level, "free");
    if (freeClaim) {
      const r = await battlePassStore.getRewardByLevel(db, season.id, level, "free");
      if (r && r.reward_nxt > 0) {
        await economyStore.creditCurrency(db, {
          userId: profile.user_id, currency: "NXT", amount: Number(r.reward_nxt),
          reason: "battle_pass_reward", meta: { seasonId: season.id, level, tier: "free" }
        });
        rewards.push({ tier: "free", amount: Number(r.reward_nxt) });
      }
    }

    if (userBp.is_premium) {
      const premClaim = await battlePassStore.claimLevelReward(db, profile.user_id, season.id, level, "premium");
      if (premClaim) {
        const r = await battlePassStore.getRewardByLevel(db, season.id, level, "premium");
        if (r && r.reward_nxt > 0) {
          await economyStore.creditCurrency(db, {
            userId: profile.user_id, currency: "NXT", amount: Number(r.reward_nxt),
            reason: "battle_pass_reward", meta: { seasonId: season.id, level, tier: "premium" }
          });
          rewards.push({ tier: "premium", amount: Number(r.reward_nxt) });
        }
      }
    }

    return { ok: true, rewards, level };
  });

  if (!result.ok) {
    const msgs = {
      no_season: "⚠️ Aktif sezon yok.",
      not_joined: "⚠️ Önce Battle Pass'a katıl: `/battlepass`",
      level_not_reached: `⚠️ Seviye ${level}'e henüz ulaşmadın (şu an: ${result.currentLevel || 0}).`
    };
    await ctx.replyWithMarkdown(msgs[result.reason] || "⚠️ İşlem başarısız.");
    return;
  }

  if (result.rewards.length === 0) {
    await ctx.replyWithMarkdown(`ℹ️ Seviye ${level} ödülleri zaten alınmış.`);
    return;
  }

  const lines = result.rewards.map((r) =>
    `${r.tier === "premium" ? "👑" : "🆓"} +${fmtNxt(r.amount)} NXT`
  ).join("\n");

  await ctx.replyWithMarkdown(
    `🎫 *Seviye ${level} Ödülü Alındı!*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `${lines}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━`
  );
}

async function upgradePremium(ctx, pool) {
  const userId = ctx.from?.id;
  if (!userId) return;

  const result = await withTransaction(pool, async (db) => {
    const season = await battlePassStore.getActiveSeason(db);
    if (!season) return { ok: false, reason: "no_season" };

    const profile = await userStore.getOrCreateProfile(db, {
      telegramId: userId,
      publicName: ctx.from?.username ? `@${ctx.from.username}` : ctx.from?.first_name || "Kral"
    });

    let userBp = await battlePassStore.getUserBattlePass(db, profile.user_id, season.id);
    if (!userBp) {
      const idRow = await db.query(`SELECT COALESCE(xp, 0) AS xp FROM identities WHERE user_id = $1;`, [profile.user_id]);
      userBp = await battlePassStore.joinBattlePass(db, profile.user_id, season.id, Number(idRow.rows[0]?.xp || 0));
    }

    if (userBp.is_premium) return { ok: false, reason: "already_premium" };

    const cost = Number(season.premium_cost);
    const debit = await economyStore.debitCurrency(db, {
      userId: profile.user_id, currency: "NXT", amount: cost,
      reason: "battle_pass_premium", meta: { seasonId: season.id }
    });

    if (!debit.applied) return { ok: false, reason: debit.reason, balance: debit.balance };

    await battlePassStore.upgradeToPremium(db, profile.user_id, season.id);

    return { ok: true, cost, seasonName: season.name };
  });

  if (!result.ok) {
    const msgs = {
      no_season: "⚠️ Aktif sezon yok.",
      already_premium: "✅ Zaten Premium'sun.",
      insufficient_balance: `⚠️ Yetersiz bakiye. Mevcut: *${fmtNxt(result.balance)} NXT*`
    };
    await ctx.replyWithMarkdown(msgs[result.reason] || "⚠️ İşlem başarısız.");
    return;
  }

  await ctx.replyWithMarkdown(
    `👑 *Premium Battle Pass Aktif!*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `Sezon: *${result.seasonName}*\n` +
    `Ödenen: *${fmtNxt(result.cost)} NXT*\n` +
    `Artık tüm seviye ödüllerini 3x kazanıyorsun!\n` +
    `━━━━━━━━━━━━━━━━━━━━━━`
  );
}

module.exports = { handleBattlePass };
