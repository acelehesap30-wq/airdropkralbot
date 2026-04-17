// ── /clan Command Handler ─────────────────────────────────────
// Clan/Guild system — create clans, join, donate, compete
// Subcommands: create, join, leave, info, top, donate

const economyStore = require("../../stores/economyStore");
const userStore = require("../../stores/userStore");
const clanStore = require("../../stores/clanStore");
const tonStore = require("../../stores/tonStore");
const { withTransaction } = require("../../db");

const CREATE_COST_NXT = 1000;
const NAME_REGEX = /^[A-Za-z0-9 _-]{3,32}$/;
const TAG_REGEX = /^[A-Z0-9]{2,6}$/;

function fmtNxt(n) {
  return Number(n || 0).toLocaleString("en", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

async function handleClan(ctx, pool) {
  const userId = ctx.from?.id;
  if (!userId) return;

  const args = (ctx.message?.text || "").trim().split(/\s+/).slice(1);
  const sub = (args[0] || "").toLowerCase();

  if (sub === "create") return createClanCmd(ctx, pool, args.slice(1));
  if (sub === "join")   return joinClanCmd(ctx, pool, args[1]);
  if (sub === "leave")  return leaveClanCmd(ctx, pool);
  if (sub === "info")   return infoClanCmd(ctx, pool, args[1]);
  if (sub === "top")    return topClansCmd(ctx, pool);
  if (sub === "donate") return donateClanCmd(ctx, pool, args[1]);

  // Default: show own clan or help
  const myClan = await withTransaction(pool, async (db) => {
    const profile = await userStore.getOrCreateProfile(db, {
      telegramId: userId,
      publicName: ctx.from?.username ? `@${ctx.from.username}` : ctx.from?.first_name || "Kral"
    });
    return clanStore.getUserClan(db, profile.user_id);
  });

  if (myClan) {
    return infoClanCmd(ctx, pool, myClan.tag);
  }

  await ctx.replyWithMarkdown(
    `🏰 *Clan Sistemi*\n\n` +
    `Clan kurarak arkadaşlarınla yarış, NXT havuzu oluştur, liderlik tablosunda yüksel.\n\n` +
    `*Komutlar:*\n` +
    `\`/clan create <isim> <TAG>\` — Clan kur (${fmtNxt(CREATE_COST_NXT)} NXT)\n` +
    `\`/clan join <TAG>\` — Clan'a katıl\n` +
    `\`/clan leave\` — Clan'dan ayrıl\n` +
    `\`/clan info [TAG]\` — Clan bilgisi\n` +
    `\`/clan top\` — Top 10 clan\n` +
    `\`/clan donate <miktar>\` — Hazineye NXT bağışla`
  );
}

async function createClanCmd(ctx, pool, args) {
  const userId = ctx.from?.id;
  if (args.length < 2) {
    await ctx.replyWithMarkdown(
      `⚠️ Kullanım: \`/clan create <isim> <TAG>\`\n` +
      `İsim: 3-32 karakter (harf, rakam, boşluk, _ -)\n` +
      `TAG: 2-6 karakter (BÜYÜK harf/rakam)\n` +
      `Örnek: \`/clan create Nexus Warriors NXW\``
    );
    return;
  }

  const tag = args[args.length - 1].toUpperCase();
  const name = args.slice(0, -1).join(" ");

  if (!NAME_REGEX.test(name)) {
    await ctx.replyWithMarkdown("⚠️ Geçersiz isim (3-32 karakter, harf/rakam/boşluk/_-).");
    return;
  }
  if (!TAG_REGEX.test(tag)) {
    await ctx.replyWithMarkdown("⚠️ Geçersiz TAG (2-6 karakter, BÜYÜK harf/rakam).");
    return;
  }

  const result = await withTransaction(pool, async (db) => {
    const profile = await userStore.getOrCreateProfile(db, {
      telegramId: userId,
      publicName: ctx.from?.username ? `@${ctx.from.username}` : ctx.from?.first_name || "Kral"
    });

    const existing = await clanStore.getUserClan(db, profile.user_id);
    if (existing) return { ok: false, reason: "already_in_clan", clanName: existing.name };

    const tagTaken = await clanStore.getClanByTag(db, tag);
    if (tagTaken) return { ok: false, reason: "tag_taken" };

    const debit = await economyStore.debitCurrency(db, {
      userId: profile.user_id, currency: "NXT", amount: CREATE_COST_NXT,
      reason: "clan_create", meta: { name, tag }
    });
    if (!debit.applied) return { ok: false, reason: debit.reason, balance: debit.balance };

    try {
      const clan = await clanStore.createClan(db, { name, tag, leaderId: profile.user_id });
      await tonStore.recordHouseEarning(db, {
        source: "clan_create", nxtAmount: CREATE_COST_NXT,
        note: `clan ${tag} created by ${profile.user_id}`
      });
      return { ok: true, clan };
    } catch (err) {
      if (err.code === "23505") return { ok: false, reason: "name_or_tag_taken" };
      throw err;
    }
  });

  if (!result.ok) {
    const msgs = {
      already_in_clan: `⚠️ Zaten bir clan üyesisin: *${result.clanName}*. Önce ayrıl.`,
      tag_taken: "⚠️ Bu TAG zaten kullanılıyor.",
      name_or_tag_taken: "⚠️ Bu isim veya TAG zaten kullanılıyor.",
      insufficient_balance: `⚠️ Yetersiz bakiye. Gerekli: *${fmtNxt(CREATE_COST_NXT)} NXT*`
    };
    await ctx.replyWithMarkdown(msgs[result.reason] || "⚠️ İşlem başarısız.");
    return;
  }

  await ctx.replyWithMarkdown(
    `🏰 *Clan Kuruldu!*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `*${result.clan.name}* [${result.clan.tag}]\n` +
    `👑 Lider: sen\n` +
    `💰 Hazine: 0 NXT\n` +
    `👥 Üye: 1/${result.clan.member_cap}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `Arkadaşların \`/clan join ${result.clan.tag}\` ile katılabilir.`
  );
}

async function joinClanCmd(ctx, pool, tagInput) {
  const userId = ctx.from?.id;
  if (!tagInput) {
    await ctx.replyWithMarkdown("⚠️ Kullanım: `/clan join <TAG>`");
    return;
  }
  const tag = tagInput.toUpperCase();

  const result = await withTransaction(pool, async (db) => {
    const profile = await userStore.getOrCreateProfile(db, {
      telegramId: userId,
      publicName: ctx.from?.username ? `@${ctx.from.username}` : ctx.from?.first_name || "Kral"
    });

    const existing = await clanStore.getUserClan(db, profile.user_id);
    if (existing) return { ok: false, reason: "already_in_clan", clanName: existing.name };

    const clan = await clanStore.getClanByTag(db, tag);
    if (!clan) return { ok: false, reason: "not_found" };

    const count = await clanStore.countMembers(db, clan.id);
    if (count >= clan.member_cap) return { ok: false, reason: "full", cap: clan.member_cap };

    await clanStore.joinClan(db, profile.user_id, clan.id);
    return { ok: true, clan, count: count + 1 };
  });

  if (!result.ok) {
    const msgs = {
      already_in_clan: `⚠️ Zaten bir clan üyesisin: *${result.clanName}*.`,
      not_found: "⚠️ Bu TAG ile clan bulunamadı.",
      full: `⚠️ Clan dolu (${result.cap}/${result.cap}).`
    };
    await ctx.replyWithMarkdown(msgs[result.reason] || "⚠️ İşlem başarısız.");
    return;
  }

  await ctx.replyWithMarkdown(
    `🏰 *${result.clan.name}* [${result.clan.tag}] clanına katıldın!\n` +
    `👥 Üye: ${result.count}/${result.clan.member_cap}`
  );
}

async function leaveClanCmd(ctx, pool) {
  const userId = ctx.from?.id;

  const result = await withTransaction(pool, async (db) => {
    const profile = await userStore.getOrCreateProfile(db, {
      telegramId: userId,
      publicName: ctx.from?.username ? `@${ctx.from.username}` : ctx.from?.first_name || "Kral"
    });
    const myClan = await clanStore.getUserClan(db, profile.user_id);
    if (!myClan) return { ok: false, reason: "not_in_clan" };

    // Leader can't leave unless clan empty — disband instead
    if (myClan.role === "leader") {
      const memberCount = await clanStore.countMembers(db, myClan.id);
      if (memberCount > 1) {
        return { ok: false, reason: "leader_has_members" };
      }
      // Solo leader leaves → disband
      await clanStore.disbandClan(db, myClan.id);
      return { ok: true, disbanded: true, clan: myClan };
    }

    await clanStore.leaveClan(db, profile.user_id);
    return { ok: true, disbanded: false, clan: myClan };
  });

  if (!result.ok) {
    const msgs = {
      not_in_clan: "⚠️ Bir clan üyesi değilsin.",
      leader_has_members: "⚠️ Lidersin. Önce tüm üyeler ayrılmalı."
    };
    await ctx.replyWithMarkdown(msgs[result.reason] || "⚠️ İşlem başarısız.");
    return;
  }

  if (result.disbanded) {
    await ctx.replyWithMarkdown(`🏰 *${result.clan.name}* clanı dağıtıldı.`);
  } else {
    await ctx.replyWithMarkdown(`👋 *${result.clan.name}* clanından ayrıldın.`);
  }
}

async function infoClanCmd(ctx, pool, tagInput) {
  const userId = ctx.from?.id;

  const data = await withTransaction(pool, async (db) => {
    let clan;
    if (tagInput) {
      clan = await clanStore.getClanByTag(db, tagInput.toUpperCase());
    } else {
      const profile = await userStore.getOrCreateProfile(db, {
        telegramId: userId,
        publicName: ctx.from?.username ? `@${ctx.from.username}` : ctx.from?.first_name || "Kral"
      });
      clan = await clanStore.getUserClan(db, profile.user_id);
    }
    if (!clan) return null;

    const members = await clanStore.getClanMembers(db, clan.id);
    return { clan, members };
  });

  if (!data) {
    await ctx.replyWithMarkdown("⚠️ Clan bulunamadı veya üye değilsin.");
    return;
  }

  const leaderMember = data.members.find((m) => m.role === "leader");
  const leaderName = leaderMember?.public_name || "?";

  const top5 = data.members.slice(0, 5).map((m, i) => {
    const roleIcon = m.role === "leader" ? "👑" : (m.role === "officer" ? "⭐" : "•");
    return `${roleIcon} ${m.public_name || "?"} — ${fmtNxt(m.contributed)} NXT`;
  }).join("\n");

  await ctx.replyWithMarkdown(
    `🏰 *${data.clan.name}* [${data.clan.tag}]\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `👑 Lider: ${leaderName}\n` +
    `💰 Hazine: *${fmtNxt(data.clan.treasury)} NXT*\n` +
    `⚡ Toplam XP: *${fmtNxt(data.clan.total_xp)}*\n` +
    `👥 Üye: *${data.members.length}/${data.clan.member_cap}*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `*Top Katkı:*\n${top5 || "_Henüz katkı yok_"}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━`
  );
}

async function topClansCmd(ctx, pool) {
  const clans = await withTransaction(pool, (db) => clanStore.getTopClans(db, 10));

  if (!clans || clans.length === 0) {
    await ctx.replyWithMarkdown("🏰 Henüz clan yok. İlk sen kur: `/clan create <isim> <TAG>`");
    return;
  }

  const lines = clans.map((c, i) => {
    const medal = ["🥇", "🥈", "🥉"][i] || `${i + 1}.`;
    return `${medal} *${c.name}* [${c.tag}] — ${fmtNxt(c.total_xp)} XP | ${c.members}👥 | ${fmtNxt(c.treasury)}💰`;
  }).join("\n");

  await ctx.replyWithMarkdown(
    `🏆 *Top 10 Clan*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `${lines}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━`
  );
}

async function donateClanCmd(ctx, pool, amountInput) {
  const userId = ctx.from?.id;
  const amount = parseFloat(amountInput);

  if (isNaN(amount) || amount <= 0) {
    await ctx.replyWithMarkdown("⚠️ Kullanım: `/clan donate <miktar>`");
    return;
  }

  const result = await withTransaction(pool, async (db) => {
    const profile = await userStore.getOrCreateProfile(db, {
      telegramId: userId,
      publicName: ctx.from?.username ? `@${ctx.from.username}` : ctx.from?.first_name || "Kral"
    });
    const myClan = await clanStore.getUserClan(db, profile.user_id);
    if (!myClan) return { ok: false, reason: "not_in_clan" };

    const debit = await economyStore.debitCurrency(db, {
      userId: profile.user_id, currency: "NXT", amount,
      reason: "clan_donate", meta: { clanId: myClan.id, clanTag: myClan.tag }
    });
    if (!debit.applied) return { ok: false, reason: debit.reason, balance: debit.balance };

    await clanStore.donateToClan(db, profile.user_id, myClan.id, amount);

    return { ok: true, clan: myClan, amount, newTreasury: Number(myClan.treasury) + amount };
  });

  if (!result.ok) {
    const msgs = {
      not_in_clan: "⚠️ Önce bir clan'a katıl.",
      insufficient_balance: `⚠️ Yetersiz bakiye. Mevcut: *${fmtNxt(result.balance)} NXT*`
    };
    await ctx.replyWithMarkdown(msgs[result.reason] || "⚠️ İşlem başarısız.");
    return;
  }

  await ctx.replyWithMarkdown(
    `💰 *${fmtNxt(result.amount)} NXT* bağışlandı!\n` +
    `Clan: *${result.clan.name}* [${result.clan.tag}]\n` +
    `Yeni hazine: *${fmtNxt(result.newTreasury)} NXT*`
  );
}

module.exports = { handleClan };
