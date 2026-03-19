const {
  formatTokenDecisionUpdate: formatSharedTokenDecisionUpdate,
  formatPayoutDecisionUpdate: formatSharedPayoutDecisionUpdate
} = require("../../../packages/shared/src/chatTrustMessages");

function progressBar(value, max, size = 10) {
  const safeMax = Math.max(1, Number(max || 1));
  const ratio = Math.max(0, Math.min(1, Number(value || 0) / safeMax));
  const filled = Math.round(ratio * size);
  return `${'▰'.repeat(filled)}${'▱'.repeat(size - filled)}`;
}

function pct(value) {
  return `${Math.round(Number(value || 0) * 100)}%`;
}

function escapeMarkdown(value) {
  return String(value || "").replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}

function localizeText(value, lang = "tr") {
  if (!value || typeof value !== "object") {
    return "";
  }
  const normalized = String(lang || "tr")
    .trim()
    .toLowerCase()
    .startsWith("en")
    ? "en"
    : "tr";
  return normalized === "en"
    ? String(value.en || value.tr || "")
    : String(value.tr || value.en || "");
}

// ── Immersive visual helpers ──────────────────────────────────
const TIER_BADGES = ['🥉', '🥈', '🥇', '💎', '👑', '🌟', '⚡', '🔥'];
function tierBadge(tier) { return TIER_BADGES[Math.min(Math.max(0, Number(tier || 0) - 1), TIER_BADGES.length - 1)] || '⬛'; }

function currencyBar(label, value, max, emoji, size = 8) {
  const v = Number(value || 0);
  const m = Math.max(1, Number(max || 1));
  const bar = progressBar(v, m, size);
  const p = Math.round((v / m) * 100);
  return `${emoji} ${label}: \`${bar}\` *${v.toLocaleString()}* (${p}%)`;
}

function compactNum(value) {
  const n = Number(value || 0);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function countdownStr(ms) {
  const total = Math.max(0, Number(ms || 0));
  const d = Math.floor(total / 86400000);
  const h = Math.floor((total % 86400000) / 3600000);
  const m = Math.floor((total % 3600000) / 60000);
  if (d > 0) return `${d}g ${h}s`;
  if (h > 0) return `${h}s ${m}dk`;
  return `${m}dk`;
}

function sparkline(values, size = 7) {
  const chars = '▁▂▃▄▅▆▇█';
  const arr = Array.isArray(values) ? values.map(Number).filter(v => !isNaN(v)) : [];
  if (arr.length === 0) return '▁'.repeat(size);
  const min = Math.min(...arr);
  const max = Math.max(...arr);
  const range = max - min || 1;
  return arr.slice(-size).map(v => chars[Math.min(chars.length - 1, Math.floor(((v - min) / range) * (chars.length - 1)))]).join('');
}

function trendArrow(current, previous) {
  const c = Number(current || 0);
  const p = Number(previous || 0);
  if (c > p) return '📈';
  if (c < p) return '📉';
  return '➡️';
}

function resolveLang(options) {
  return String(options?.lang || "tr").trim().toLowerCase().startsWith("en") ? "en" : "tr";
}

function formatStart(profile, balances, season, anomaly, contract, options = {}) {
  const lang = resolveLang(options);
  const publicName = escapeMarkdown(profile.public_name);
  const tier = Number(profile.kingdom_tier || 0);
  const streak = Number(profile.current_streak || 0);
  const streakMult = (1 + Math.min(streak, 30) * 0.05).toFixed(2);
  const sc = Number(balances?.SC || 0);
  const hc = Number(balances?.HC || 0);
  const rc = Number(balances?.RC || 0);
  const nxt = Number(balances?.NXT || 0);
  const payout = Number(balances?.payout_available || 0);
  const badge = tierBadge(tier);
  const tierNames_tr = ['Cirak', 'Asker', 'Sovalye', 'Kaptan', 'Komutan', 'General', 'Lord', 'Kral'];
  const tierNames_en = ['Apprentice', 'Soldier', 'Knight', 'Captain', 'Commander', 'General', 'Lord', 'King'];
  const tierName = lang === "en" ? (tierNames_en[tier] || `T${tier}`) : (tierNames_tr[tier] || `T${tier}`);

  // Next best move engine
  const daily = options.daily || {};
  const tasksDone = Number(daily.tasksDone || 0);
  const dailyCap = Number(daily.dailyCap || 5);
  const remaining = Math.max(0, dailyCap - tasksDone);
  const hasReveal = Boolean(options.hasReveal);
  const hasActive = Boolean(options.hasActive);
  let nextMove, nextCmd;
  if (hasReveal) {
    nextMove = lang === "en" ? "Open your chest — loot is ready!" : "Kasani ac — ganimet hazir!";
    nextCmd = "/reveal";
  } else if (hasActive) {
    nextMove = lang === "en" ? "Complete your active run" : "Aktif gorevini tamamla";
    nextCmd = "/finish balanced";
  } else if (remaining > 0) {
    nextMove = lang === "en" ? `${remaining} tasks left today (+${remaining * 80}-${remaining * 160} SC)` : `Bugun ${remaining} gorev kaldi (+${remaining * 80}-${remaining * 160} SC)`;
    nextCmd = "/tasks";
  } else {
    nextMove = lang === "en" ? "Arena PvP — earn HC & climb ranks" : "Arena PvP — HC kazan & sirala";
    nextCmd = "/pvp";
  }

  const seasonLine = season
    ? `\n📅 ${lang === "en" ? "Season" : "Sezon"}: *S${season.seasonId}* — *${season.daysLeft}* ${lang === "en" ? "days" : "gun"}`
    : "";
  const anomalyLine = anomaly
    ? `\n🌀 ${lang === "en" ? "ANOMALY" : "ANOMALI"}: *${escapeMarkdown(anomaly.title)}* │ ${progressBar(Number(anomaly.pressure_pct || 0), 100, 6)} ${anomaly.pressure_pct}%`
    : "";
  const contractLine = contract
    ? `\n📜 ${lang === "en" ? "Contract" : "Kontrat"}: *${escapeMarkdown(contract.title)}* [${escapeMarkdown(contract.required_mode)}]`
    : "";

  const tr = lang === "tr";
  return (
    `╔══════════════════════════╗\n` +
    `║   🏰 *AIRDROPKRAL NEXUS*   ║\n` +
    `╚══════════════════════════╝\n\n` +
    `${badge} *${publicName}* — ${tierName}\n` +
    `⚔️ Tier *${tier}* │ 🔥 Streak *${streak}* ${tr ? "gun" : "days"} (x${streakMult})\n` +
    `${progressBar(streak, 14, 14)} ${streak}/14\n\n` +
    `┌─── ${tr ? "HAZINE" : "TREASURY"} ───────────────┐\n` +
    `│ 💰 SC  \`${String(compactNum(sc)).padStart(8)}\`  │\n` +
    `│ 💎 HC  \`${String(compactNum(hc)).padStart(8)}\`  │\n` +
    `│ 🌀 RC  \`${String(compactNum(rc)).padStart(8)}\`  │\n` +
    `│ 🪙 NXT \`${String(nxt.toFixed(2)).padStart(8)}\`  │\n` +
    (payout > 0 ? `│ ₿ BTC \`${String(payout.toFixed(6)).padStart(8)}\`  │\n` : '') +
    `└──────────────────────────┘${seasonLine}${anomalyLine}${contractLine}\n\n` +
    `🧭 *${tr ? "Sonraki En Iyi Hamle" : "Next Best Move"}:*\n` +
    `  ➤ ${nextMove}\n` +
    `  ➤ \`${nextCmd}\`\n\n` +
    `📊 ${tr ? "Bugun" : "Today"}: *${tasksDone}/${dailyCap}* ${tr ? "gorev" : "tasks"} │ ${tr ? "Verim" : "Yield"}: *${pct(tasksDone / Math.max(1, dailyCap))}*`
  );
}

function formatGuide(snapshot, options = {}) {
  const lang = String(options.lang || "tr")
    .trim()
    .toLowerCase()
    .startsWith("en")
    ? "en"
    : "tr";
  const profile = snapshot?.profile || {};
  const daily = snapshot?.daily || {};
  const attempts = snapshot?.attempts || {};
  const offers = snapshot?.offers || [];
  const balances = snapshot?.balances || {};
  const anomaly = snapshot?.anomaly || null;
  const contract = snapshot?.contract || null;
  const pvpContent = snapshot?.pvpContent || null;
  const pvpDaily = pvpContent?.daily_duel || {};
  const pvpWeekly = pvpContent?.weekly_ladder || {};
  const pvpArc = pvpContent?.season_arc_boss || {};
  const hasActive = Boolean(attempts.active);
  const hasReveal = Boolean(attempts.revealable);
  const nextStep =
    lang === "en"
      ? hasReveal
        ? "1) Open your current chest with /reveal."
        : hasActive
          ? "1) Complete the active run with /finish balanced."
          : offers.length > 0
            ? "1) Pick a task from /tasks."
            : Number(balances.RC || 0) > 0
              ? "1) Open /tasks and use Refresh Panel if needed."
              : "1) Start the task loop to earn RC."
      : hasReveal
        ? "1) /reveal ile mevcut kasayi ac."
        : hasActive
          ? "1) /finish dengeli ile denemeyi tamamla."
          : offers.length > 0
            ? "1) /tasks ile panelden bir gorev sec."
            : Number(balances.RC || 0) > 0
              ? "1) /tasks ac, gerekirse Panel Yenile kullan."
              : "1) RC kazanmak icin gorev dongusunu ac.";
  const pvpLine = pvpContent
    ? lang === "en"
      ? `\nPvP Flow: Daily *${Number(pvpDaily.wins || 0)}/${Number(pvpDaily.target_wins || 0)}* | Weekly *${Number(
          pvpWeekly.points || 0
        )}/${Number(pvpWeekly.next_milestone_points || pvpWeekly.target_points || 0)}* | Arc *W${Number(
          pvpArc.wave_index || 1
        )}/${Number(pvpArc.wave_total || 1)}*`
      : `\nPvP Akis: Gunluk *${Number(pvpDaily.wins || 0)}/${Number(pvpDaily.target_wins || 0)}* | Haftalik *${Number(
          pvpWeekly.points || 0
        )}/${Number(pvpWeekly.next_milestone_points || pvpWeekly.target_points || 0)}* | Arc *W${Number(
          pvpArc.wave_index || 1
        )}/${Number(pvpArc.wave_total || 1)}*`
    : "";
  if (lang === "en") {
    return (
      `*Nexus Guide*\n` +
      `Player: *${escapeMarkdown(profile.public_name || "player")}*\n` +
      `Tier: *${profile.kingdom_tier || 0}* | Streak: *${profile.current_streak || 0} days*\n` +
      `Daily: *${Number(daily.tasksDone || 0)}/${Number(daily.dailyCap || 0)} tasks*` +
      (anomaly ? `\nNexus: *${escapeMarkdown(anomaly.title || "-")}* (${anomaly.preferred_mode || "balanced"})` : "") +
      (contract
        ? `\nContract: *${escapeMarkdown(contract.title || "-")}* [${escapeMarkdown(contract.required_mode || "balanced")}]`
        : "") +
      pvpLine +
      `\n\n` +
      `*Best Next Move*\n` +
      `${nextStep}\n\n` +
      `*Standard Flow*\n` +
      `- /tasks -> accept a task\n` +
      `- /finish [safe|balanced|aggressive] -> run result\n` +
      `- /reveal -> final reward\n` +
      `- /missions and /daily -> extra rewards\n` +
      `- /play -> Nexus Arena web panel\n\n` +
      `*Command Packs*\n` +
      `- Economy: /wallet, /vault, /token\n` +
      `- Meta: /season, /leaderboard, /nexus\n` +
      `- Utility: /status, /lang, /help\n\n` +
      `Short form: "tasks", "finish balanced", "reveal", "raid aggressive"`
    );
  }

  return (
    `*Nexus Rehber*\n` +
    `Kral: *${escapeMarkdown(profile.public_name || "oyuncu")}*\n` +
    `Tier: *${profile.kingdom_tier || 0}* | Streak: *${profile.current_streak || 0} gun*\n` +
    `Gunluk: *${Number(daily.tasksDone || 0)}/${Number(daily.dailyCap || 0)} gorev*` +
    (anomaly ? `\nNexus: *${escapeMarkdown(anomaly.title || "-")}* (${anomaly.preferred_mode || "balanced"})` : "") +
    (contract
      ? `\nKontrat: *${escapeMarkdown(contract.title || "-")}* [${escapeMarkdown(contract.required_mode || "balanced")}]`
      : "") +
    pvpLine +
    `\n\n` +
    `*Su an en iyi hamle*\n` +
    `${nextStep}\n\n` +
    `*Standart Akis*\n` +
    `- /tasks -> gorev kabul\n` +
    `- /finish [safe|balanced|aggressive] -> deneme sonucu\n` +
    `- /reveal -> kesin odul\n` +
    `- /missions ve /daily -> ek odul\n` +
    `- /play -> Nexus Arena web paneli\n\n` +
    `*Komut Paketleri*\n` +
    `- Ekonomi: /wallet, /vault, /token\n` +
    `- Meta: /season, /leaderboard, /nexus\n` +
    `- Yardimci: /status, /lang, /help\n\n` +
    `Kisa yazim: "gorev", "bitir dengeli", "reveal", "raid aggressive"`
  );
}

function formatOnboard(payload = {}, options = {}) {
  const lang = String(options.lang || "tr")
    .trim()
    .toLowerCase()
    .startsWith("en")
    ? "en"
    : "tr";
  const profile = payload.profile || {};
  const balances = payload.balances || {};
  const daily = payload.daily || {};
  const season = payload.season || {};
  const token = payload.token || {};
  const symbol = String(token.symbol || "NXT").toUpperCase();
  const remaining = Math.max(0, Number(daily.dailyCap || 0) - Number(daily.tasksDone || 0));
  if (lang === "en") {
    return (
      `*Onboard // 3 Steps*\n` +
      `Player: *${escapeMarkdown(profile.public_name || "player")}* | Tier *${profile.kingdom_tier || 0}* | Season *S${Number(
        season.seasonId || 0
      )}* (${Number(season.daysLeft || 0)} days)\n` +
      `Balance: *${Number(balances.SC || 0)} SC / ${Number(balances.HC || 0)} HC / ${Number(balances.RC || 0)} RC*\n\n` +
      `1) Pick a task with */tasks*\n` +
      `2) Close the run with */finish balanced*\n` +
      `3) Open reward with */reveal*\n\n` +
      `*Today* ${Number(daily.tasksDone || 0)}/${Number(daily.dailyCap || 0)} tasks | Remaining: *${remaining}*\n` +
      `SC today: *${Number(daily.scEarned || 0)}* | Token: *${Number(token.balance || 0).toFixed(4)} ${symbol}* (@ $${Number(
        token.spotUsd || 0
      ).toFixed(8)})\n\n` +
      `Then: */play* (Nexus panel) -> */wallet* -> */token*\n` +
      `Need fallback? Use */help* for detailed command cards.`
    );
  }

  return (
    `*Onboard // 3 Adim*\n` +
    `Kral: *${escapeMarkdown(profile.public_name || "oyuncu")}* | Tier *${profile.kingdom_tier || 0}* | Sezon *S${Number(
      season.seasonId || 0
    )}* (${Number(season.daysLeft || 0)} gun)\n` +
    `Bakiye: *${Number(balances.SC || 0)} SC / ${Number(balances.HC || 0)} HC / ${Number(balances.RC || 0)} RC*\n\n` +
    `1) */tasks* ile gorev sec\n` +
    `2) */finish dengeli* ile denemeyi kapat\n` +
    `3) */reveal* ile odulu ac\n\n` +
    `*Bugun* ${Number(daily.tasksDone || 0)}/${Number(daily.dailyCap || 0)} gorev | Kalan: *${remaining}*\n` +
    `SC bugun: *${Number(daily.scEarned || 0)}* | Token: *${Number(token.balance || 0).toFixed(4)} ${symbol}* (@ $${Number(
      token.spotUsd || 0
    ).toFixed(8)})\n\n` +
    `Sonra: */play* (Nexus panel) -> */wallet* -> */token*\n` +
    `Takildiginda */help* ile detayli komut kartlarini ac.`
  );
}

function formatProfile(profile, balances, options = {}) {
  const lang = resolveLang(options);
  const tr = lang === "tr";
  const publicName = escapeMarkdown(profile.public_name);
  const tier = Number(profile.kingdom_tier || 0);
  const badge = tierBadge(tier);
  const tierNames_tr = ['Cirak', 'Asker', 'Sovalye', 'Kaptan', 'Komutan', 'General', 'Lord', 'Kral'];
  const tierNames_en = ['Apprentice', 'Soldier', 'Knight', 'Captain', 'Commander', 'General', 'Lord', 'King'];
  const tierName = tr ? (tierNames_tr[tier] || `T${tier}`) : (tierNames_en[tier] || `T${tier}`);
  const rep = Number(profile.reputation_score || 0);
  const prestige = Number(profile.prestige_level || 0);
  const streak = Number(profile.current_streak || 0);
  const bestStreak = Number(profile.best_streak || streak);
  const seasonRank = Number(profile.season_rank || 0);
  const wins = Number(profile.wins || 0);
  const losses = Number(profile.losses || 0);
  const total = wins + losses;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
  const sc = Number(balances?.SC || 0);
  const hc = Number(balances?.HC || 0);
  const rc = Number(balances?.RC || 0);
  const nxt = Number(balances?.NXT || 0);
  const streakMult = (1 + Math.min(streak, 30) * 0.05).toFixed(2);

  const tierProgress = options.tierProgress || {};
  const progressVal = Number(tierProgress.progressValue || rep);
  const progressMax = Math.max(1, Number(tierProgress.progressMax || 1500));
  const progressPct = Math.round((progressVal / progressMax) * 100);

  return (
    `╔══════════════════════════╗\n` +
    `║     👤 *${tr ? "PROFIL KARTI" : "PROFILE CARD"}*      ║\n` +
    `╚══════════════════════════╝\n\n` +
    `${badge} *${publicName}*\n` +
    `⚔️ *${tierName}* (Tier ${tier}) │ 🏅 Prestige *${prestige}*\n\n` +
    `┌─── ${tr ? "ISTATISTIKLER" : "STATISTICS"} ────────────┐\n` +
    `│ ⭐ ${tr ? "Itibar" : "Reputation"}: *${rep.toLocaleString()}*\n` +
    `│ 🔥 Streak: *${streak}* ${tr ? "gun" : "days"} (${tr ? "en iyi" : "best"}: *${bestStreak}*)\n` +
    `│ ⚡ ${tr ? "Carpan" : "Multiplier"}: *x${streakMult}*\n` +
    `│ 🏆 ${tr ? "Sezon Sirasi" : "Season Rank"}: *${seasonRank > 0 ? `#${seasonRank}` : (tr ? "Yerlesmedi" : "Unranked")}*\n` +
    `│ ⚔️ PvP: *${wins}W/${losses}L* (${winRate}% ${tr ? "galibiyet" : "win rate"})\n` +
    `└──────────────────────────┘\n\n` +
    `┌─── ${tr ? "HAZINE" : "TREASURY"} ───────────────┐\n` +
    `│ 💰 SC  *${compactNum(sc)}*\n` +
    `│ 💎 HC  *${compactNum(hc)}*\n` +
    `│ 🌀 RC  *${compactNum(rc)}*\n` +
    `│ 🪙 NXT *${nxt.toFixed(2)}*\n` +
    `└──────────────────────────┘\n\n` +
    `📊 ${tr ? "Tier Ilerlemesi" : "Tier Progress"}: ${progressBar(progressVal, progressMax, 14)} ${progressPct}%\n` +
    `   ${progressVal.toLocaleString()} / ${progressMax.toLocaleString()}`
  );
}

function formatTasks(offers, taskMap, options = {}) {
  const lang = resolveLang(options);
  const tr = lang === "tr";
  const anomaly = options.anomaly || null;
  const contract = options.contract || null;
  const combo = Number(options.combo || 0);
  const pity = Number(options.pity || 0);
  const pityCap = Number(options.pityCap || 10);
  const numEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣'];
  const familyEmoji = { CORE: '⚔️', DEFENSE: '🛡', RECON: '🔍', STEALTH: '🥷', RAID: '💥', ELITE: '👑' };
  const rarityEmoji = { common: '⬜', uncommon: '🟩', rare: '🟦', epic: '🟪', legendary: '🟨' };

  const lines = offers.map((offer, index) => {
    const task = taskMap.get(offer.task_type);
    const title = task ? task.title : offer.task_type;
    const family = task?.family ? task.family.toUpperCase() : "CORE";
    const fEmoji = familyEmoji[family] || '⚔️';
    const rarity = String(task?.rarity || "common").toLowerCase();
    const rEmoji = rarityEmoji[rarity] || '⬜';
    const duration = task ? `${task.durationMinutes} dk` : "-";
    const reward = task ? task.rewardPreview : "-";
    const expires = Math.max(0, Math.ceil((new Date(offer.expires_at).getTime() - Date.now()) / 60000));
    const urgency = progressBar(Math.max(0, 60 - expires), 60, 6);
    const urgencyIcon = expires < 10 ? '🔴' : expires < 30 ? '🟡' : '🟢';
    return (
      `${numEmojis[index] || `${index + 1})`} ${fEmoji} *${title}*\n` +
      `   ${rEmoji} \`${family}\` │ ⏱ ${duration} │ 💰 ${reward}\n` +
      `   ${urgencyIcon} ${expires} dk ${urgency}`
    );
  });

  const anomalyLine = anomaly
    ? `\n🌀 *${tr ? "ANOMALI" : "ANOMALY"}:* ${escapeMarkdown(anomaly.title)}\n   SC x${Number(anomaly.sc_multiplier || 1).toFixed(1)} │ Risk ${Number(anomaly.risk_shift_pct || 0)}% │ ${tr ? "Oneri" : "Tip"}: ${anomaly.preferred_mode}\n`
    : "";
  const contractLine = contract
    ? `📜 *${tr ? "Kontrat" : "Contract"}:* ${escapeMarkdown(contract.title)} │ [${escapeMarkdown(contract.required_mode)}]\n`
    : "";
  const comboLine = combo > 1
    ? `\n🔗 *Combo:* x${(1 + Math.min(0.25, combo * 0.05)).toFixed(2)} (${combo} ${tr ? "zincir" : "chain"})`
    : "";
  const pityLine = `\n🎰 *Pity:* ${progressBar(pity, pityCap, 8)} ${pity}/${pityCap}` +
    (pity >= pityCap - 2 ? ` ${tr ? "— Epic+ garanti yakin!" : "— Epic+ guarantee near!"}` : "");

  return (
    `╔══════════════════════════╗\n` +
    `║   📋 *${tr ? "GOREV PANELI" : "TASK PANEL"}*         ║\n` +
    `╚══════════════════════════╝\n` +
    `${anomalyLine}${contractLine}\n` +
    `${lines.join("\n\n")}\n` +
    `${comboLine}${pityLine}\n\n` +
    `🎯 *${tr ? "Mod Secimi Kritik" : "Mode Selection Critical"}:*\n` +
    `  🟢 ${tr ? "Temkinli" : "Safe"} — ${tr ? "dusuk risk, stabil" : "low risk, stable"}\n` +
    `  🟡 ${tr ? "Dengeli" : "Balanced"} — ${tr ? "standart" : "standard"}\n` +
    `  🔴 ${tr ? "Saldirgan" : "Aggressive"} — ${tr ? "yuksek risk, yuksek tavan" : "high risk, high ceiling"}\n\n` +
    `🔄 ${tr ? "Panel Yenileme" : "Panel Refresh"}: 1 RC`
  );
}

function formatTaskStarted(task, currentStreak) {
  return (
    `🚀 *Görev Başladı!*\n\n` +
    `📌 Görev: *${task.title}*\n` +
    `🏷 Arketip: *${(task.family || "core").toUpperCase()}*\n` +
    `⏱ Süre: ${task.durationMinutes} dk\n` +
    `💰 Ödül: ${task.rewardPreview}\n` +
    `🔥 Streak Çarpanı: x${(1 + Math.min(0.2, (currentStreak || 0) * 0.02)).toFixed(2)}\n\n` +
    `🎯 *Mod Seç:*\n` +
    `🟢 Temkinli — daha güvenli\n` +
    `🟡 Dengeli — standart\n` +
    `🔴 Saldırgan — yüksek risk, yüksek tavan`
  );
}

function formatTaskComplete(result, probabilities, details) {
  const resultEmoji = result === "success" ? "✅" : result === "near_miss" ? "⚡" : "❌";
  const label = result === "success" ? "Başarılı" : result === "near_miss" ? "Neredeyse" : "Başarısız";
  const hint =
    result === "success"
      ? "🎯 Ritmi koru. Drop olasılığı açık."
      : result === "near_miss"
        ? "💫 Çok yakındı! Pity ilerledi."
        : "💀 Bu tur kaçtı. Sonraki deneme daha kritik.";
  const modeLabel = details?.modeLabel || "Dengeli";
  const combo = Number(details?.combo || 0);
  const anomalyLabel = details?.anomaly?.title ? `\n🌀 Nexus: ${details.anomaly.title}` : "";
  const contract = details?.contract || null;
  const contractLabel = contract?.title
    ? `\n📜 Kontrat: ${escapeMarkdown(contract.title)} (${contract?.match?.matched ? "✅ HIT" : "❌ MISS"})`
    : "";
  const comboLine = combo > 1 ? `\n🔗 Momentum: x${(1 + Math.min(0.25, combo * 0.05)).toFixed(2)} (Combo ${combo})` : "";
  const successPct = Math.round((probabilities?.pSuccess || 0) * 100);
  return (
    `${resultEmoji} *Görev Tamamlandı*\n\n` +
    `Sonuç: *${label}*\n` +
    `Mod: *${modeLabel}* │ Başarı: *%${successPct}*${comboLine}${anomalyLabel}${contractLabel}\n\n` +
    `${hint}`
  );
}

function formatLootReveal(lootTier, rewardLine, pityAfter, pityCap, balances, seasonPoints = 0, meta, options = {}) {
  const lang = resolveLang(options);
  const tr = lang === "tr";
  const sc = Number(balances?.SC || 0);
  const hc = Number(balances?.HC || 0);
  const rc = Number(balances?.RC || 0);
  const tierLower = String(lootTier).toLowerCase();
  const tierEmoji = { common: '📦', uncommon: '🎁', rare: '💜', epic: '🌟', legendary: '👑' };
  const tierColor = { common: '⬜', uncommon: '🟩', rare: '🟦', epic: '🟪', legendary: '🟨' };
  const tierLabel_tr = { common: 'Siradan', uncommon: 'Nadir degil', rare: 'Nadir', epic: 'Epik', legendary: 'Efsanevi' };
  const tierLabel_en = { common: 'Common', uncommon: 'Uncommon', rare: 'Rare', epic: 'Epic', legendary: 'Legendary' };
  const tEmoji = tierEmoji[tierLower] || '🎁';
  const tColor = tierColor[tierLower] || '⬜';
  const tLabel = tr ? (tierLabel_tr[tierLower] || lootTier) : (tierLabel_en[tierLower] || lootTier);

  const isRare = ['rare', 'epic', 'legendary'].includes(tierLower);
  const header = isRare
    ? `✨✨✨✨✨✨✨✨✨✨✨✨✨\n${tEmoji} *${tr ? "NADIR LOOT ACILDI!" : "RARE LOOT REVEALED!"}* ${tEmoji}\n✨✨✨✨✨✨✨✨✨✨✨✨✨`
    : `${tEmoji} *${tr ? "LOOT ACILDI!" : "LOOT REVEALED!"}*`;

  const seasonLine = seasonPoints > 0 ? `\n📅 ${tr ? "Sezon" : "Season"} +${seasonPoints} ${tr ? "puan" : "pts"}` : "";
  const pityLine = `🎰 Pity: ${progressBar(pityAfter, pityCap, 8)} ${pityAfter}/${pityCap}` +
    (pityAfter >= pityCap - 2 ? ` 🔥` : "");
  const boostLine = meta?.boost ? `\n⚡ Boost: +${Math.round(meta.boost * 100)}% SC` : "";
  const hiddenLine = meta?.hidden ? `\n🎊 *${tr ? "GIZLI BONUS ACILDI!" : "HIDDEN BONUS UNLOCKED!"}*` : "";
  const modeLine = meta?.modeLabel ? `\n🎯 Mod: ${meta.modeLabel}` : "";
  const comboLine = Number(meta?.combo || 0) > 1 ? `\n🔗 Combo: x${(1 + Math.min(0.25, Number(meta.combo) * 0.05)).toFixed(2)} (${meta.combo} ${tr ? "zincir" : "chain"})` : "";
  const warLine = Number(meta?.warDelta || 0) > 0 ? `\n⚔️ War +${Math.floor(meta.warDelta)} │ ${tr ? "Havuz" : "Pool"} ${Math.floor(Number(meta?.warPool || 0))}` : "";
  const anomalyLine = meta?.anomalyTitle ? `\n🌀 Nexus: ${anomalyEscape(meta.anomalyTitle)}` : "";
  const contractLine = meta?.contractTitle
    ? `\n📜 ${tr ? "Kontrat" : "Contract"}: ${escapeMarkdown(meta.contractTitle)} (${meta.contractMatch ? "✅ HIT" : "❌ MISS"})`
    : "";

  return (
    `${header}\n\n` +
    `${tColor} ${tr ? "Seviye" : "Tier"}: *${tLabel}*\n` +
    `💎 ${tr ? "Kazanc" : "Reward"}: *${rewardLine}*\n\n` +
    `${pityLine}${modeLine}${comboLine}${boostLine}${hiddenLine}${seasonLine}${warLine}${anomalyLine}${contractLine}\n\n` +
    `┌─── ${tr ? "GUNCEL BAKIYE" : "CURRENT BALANCE"} ───────┐\n` +
    `│ 💰 *${compactNum(sc)}* SC │ 💎 *${compactNum(hc)}* HC │ 🌀 *${rc}* RC\n` +
    `└──────────────────────────┘`
  );
}

function anomalyEscape(value) {
  return escapeMarkdown(String(value || ""));
}

function formatStreak(profile) {
  return (
    `🔥 *Streak Durumu*\n\n` +
    `📊 Mevcut: *${profile.current_streak} gün*\n` +
    `🏆 En İyi: *${profile.best_streak} gün*\n` +
    `⏰ Grace: *6 saat*\n\n` +
    `${progressBar(profile.current_streak, 14, 14)}\n\n` +
    `💡 Bir görev tamamla ve zinciri canlı tut!`
  );
}

function formatWallet(profile, balances, daily, anomaly, contract, options = {}) {
  const lang = resolveLang(options);
  const tr = lang === "tr";
  const sc = Number(balances?.SC || 0);
  const hc = Number(balances?.HC || 0);
  const rc = Number(balances?.RC || 0);
  const nxt = Number(balances?.NXT || 0);
  const payout = Number(balances?.payout_available || 0);
  const dailyCap = Number(daily?.dailyCap || 5);
  const tasksDone = Number(daily?.tasksDone || 0);
  const earnedSc = Number(daily?.scEarned || 0);
  const streak = Number(profile.current_streak || 0);
  const streakMult = (1 + Math.min(streak, 30) * 0.05).toFixed(2);
  const productivity = dailyCap > 0 ? Math.min(1, tasksDone / dailyCap) : 0;
  const scCap = Number(daily?.scDailyCap || 5000);
  const hcCap = Number(daily?.hcDailyCap || 20);

  const anomalyLine = anomaly
    ? `\n🌀 *${tr ? "ANOMALI AKTIF" : "ANOMALY ACTIVE"}:* ${escapeMarkdown(anomaly.title)}\n   SC x${Number(anomaly.sc_multiplier || 1).toFixed(1)} │ HC x${Number(anomaly.hc_multiplier || 1).toFixed(1)}`
    : "";
  const contractLine = contract
    ? `\n📜 *${tr ? "Kontrat" : "Contract"}:* ${escapeMarkdown(contract.title)} [${escapeMarkdown(contract.required_mode)}]`
    : "";

  return (
    `╔══════════════════════════╗\n` +
    `║  💰 *${tr ? "EKONOMI HUD" : "ECONOMY HUD"}*           ║\n` +
    `╚══════════════════════════╝\n\n` +
    `┌─── ${tr ? "BAKIYELER" : "BALANCES"} ──────────────┐\n` +
    `│ ${currencyBar("SC", sc, scCap, "💰", 8)}\n` +
    `│ ${currencyBar("HC", hc, hcCap, "💎", 8)}\n` +
    `│ 🌀 RC: *${rc.toLocaleString()}*\n` +
    `│ 🪙 NXT: *${nxt.toFixed(4)}*\n` +
    (payout > 0 ? `│ ₿ BTC: *${payout.toFixed(8)}*\n` : '') +
    `└──────────────────────────┘\n\n` +
    `┌─── ${tr ? "GUNLUK RAPOR" : "DAILY REPORT"} ─────────┐\n` +
    `│ 📋 ${tr ? "Gorev" : "Tasks"}: *${tasksDone}/${dailyCap}* ${progressBar(tasksDone, dailyCap, 8)}\n` +
    `│ 💰 ${tr ? "Kazanilan" : "Earned"}: *${earnedSc.toLocaleString()} SC*\n` +
    `│ 📈 ${tr ? "Verimlilik" : "Productivity"}: *${pct(productivity)}*\n` +
    `│ 🔥 Streak: *${streak}* ${tr ? "gun" : "days"} (x${streakMult})\n` +
    `│ ⚔️ Kingdom: *Tier ${profile.kingdom_tier}* ${tierBadge(profile.kingdom_tier)}\n` +
    `└──────────────────────────┘${anomalyLine}${contractLine}\n\n` +
    `💡 ${tr ? "Gunluk SC kazanc potansiyeli" : "Daily SC earning potential"}: ~*${Math.round((dailyCap - tasksDone) * 80 * Number(streakMult))} SC*`
  );
}

function formatTokenWallet(profile, view) {
  const lines = (view.chains || [])
    .map((chain) => `${chain.chain}: ${chain.enabled ? chain.address : "adres_tanimli_degil"}`)
    .join("\n");

  const requests = (view.requests || [])
    .slice(0, 4)
    .map((req) => {
      const status = String(req.status || "").toUpperCase();
      const tx = req.tx_hash ? ` | tx ${escapeMarkdown(String(req.tx_hash).slice(0, 14))}...` : "";
      return `#${req.id} ${Number(req.usd_amount || 0)} USD -> ${Number(req.token_amount || 0)} ${view.symbol} [${status}]${tx}`;
    })
    .join("\n");

  return (
    `*Token Treasury*\n` +
    `Kral: *${escapeMarkdown(profile.public_name)}*\n` +
    `Token: *${view.symbol}*\n` +
    `Bakiye: *${Number(view.balance || 0).toFixed(view.tokenConfig.decimals)} ${view.symbol}*\n` +
    `Spot: *$${Number(view.spotUsd || 0).toFixed(6)}* / ${view.symbol}\n` +
    `Unify Units: *${Number(view.unifiedUnits || 0).toFixed(2)}*\n` +
    `Maks Mint: *${Number(view.equivalentToken || 0).toFixed(view.tokenConfig.decimals)} ${view.symbol}*\n\n` +
    `Zincir Adresleri:\n${escapeMarkdown(lines || "yok")}\n\n` +
    `Son Talepler:\n${escapeMarkdown(requests || "kayit yok")}\n\n` +
    `Komut: /mint [miktar], /buytoken <usd> <chain>, /tx <id> <txHash>`
  );
}

function formatTokenMintResult(plan, view) {
  return (
    `*Token Mint Basarili*\n` +
    `Kazanc: *${Number(plan.tokenAmount || 0).toFixed(view.tokenConfig.decimals)} ${view.symbol}*\n` +
    `Harcanan birimler: ${Number(plan.unitsSpent || 0).toFixed(2)}\n` +
    `Debit: ${Number(plan.debits?.SC || 0).toFixed(4)} SC / ${Number(plan.debits?.HC || 0).toFixed(4)} HC / ${Number(plan.debits?.RC || 0).toFixed(4)} RC\n` +
    `Yeni bakiye: *${Number(view.balance || 0).toFixed(view.tokenConfig.decimals)} ${view.symbol}*`
  );
}

function formatTokenMintError(reason, plan) {
  if (reason === "mint_below_min") {
    return `*Token Mint*\nMin mint: *${Number(plan?.minTokens || 0).toFixed(4)}* token.`;
  }
  if (reason === "insufficient_balance") {
    return `*Token Mint*\nYetersiz bakiye. Maks: *${Number(plan?.maxMintable || 0).toFixed(4)}* token.`;
  }
  if (reason === "token_disabled") {
    return `*Token Mint*\nToken sistemi su an kapali.`;
  }
  if (reason === "freeze_mode") {
    return `*Token Mint*\nSistem freeze modunda.`;
  }
  return `*Token Mint Hatasi*\n${escapeMarkdown(reason || "bilinmeyen_hata")}`;
}

function formatTokenBuyIntent(request, quote, tokenConfig) {
  const txHelp = `/tx ${request.id} <txHash>`;
  return (
    `*Token Satin Alma Talebi*\n` +
    `Talep: *#${request.id}*\n` +
    `Zincir: *${request.chain}*\n` +
    `Odeme: *${Number(quote.usdAmount).toFixed(2)} USD* (${request.pay_currency})\n` +
    `Karsilik: *${Number(quote.tokenAmount).toFixed(tokenConfig.decimals)} ${tokenConfig.symbol}*\n` +
    `Min teslim: *${Number(quote.tokenMinReceive).toFixed(tokenConfig.decimals)} ${tokenConfig.symbol}*\n\n` +
    `Adres:\n\`${request.pay_address}\`\n\n` +
    `Odeme sonrasi tx hash gonder:\n\`${txHelp}\``
  );
}

function formatTokenBuyIntentError(reason, quote, chain) {
  if (reason === "purchase_below_min") {
    return `*Token Satin Alma*\nMin USD: *${Number(quote?.minUsd || 0).toFixed(2)}*`;
  }
  if (reason === "purchase_above_max") {
    return `*Token Satin Alma*\nMaks USD: *${Number(quote?.maxUsd || 0).toFixed(2)}*`;
  }
  if (reason === "unsupported_chain") {
    return `*Token Satin Alma*\nDesteklenmeyen zincir: *${escapeMarkdown(chain || "-")}*`;
  }
  if (reason === "chain_address_missing") {
    return `*Token Satin Alma*\nBu zincir icin odeme adresi tanimli degil.`;
  }
  if (reason === "token_disabled") {
    return `*Token Satin Alma*\nToken sistemi su an kapali.`;
  }
  return `*Token Satin Alma Hatasi*\n${escapeMarkdown(reason || "bilinmeyen_hata")}`;
}

function formatTokenTxSubmitted(request) {
  return (
    `*TX Kaydi Alindi*\n` +
    `Talep: *#${request.id}*\n` +
    `Durum: *${String(request.status || "tx_submitted").toUpperCase()}*\n` +
    `TX: \`${escapeMarkdown(String(request.tx_hash || ""))}\`\n\n` +
    `Admin dogrulama sonrasi token bakiyene yansir.`
  );
}

function formatTokenTxError(reason, request) {
  if (reason === "request_not_found") {
    return `*TX Kaydi*\nTalep bulunamadi.`;
  }
  if (reason === "already_approved") {
    return `*TX Kaydi*\nBu talep zaten onaylandi.`;
  }
  if (reason === "already_rejected") {
    return `*TX Kaydi*\nBu talep reddedildi.`;
  }
  if (reason === "request_update_failed") {
    return `*TX Kaydi*\nTalep guncellenemedi.`;
  }
  if (reason === "tx_hash_missing") {
    return `*TX Kaydi*\nOnay icin once zincir tx hash girilmeli.`;
  }
  if (reason === "invalid_tx_hash_format") {
    return `*TX Kaydi*\nHash formati zincir tipine uymuyor.`;
  }
  if (reason === "tx_not_found_onchain") {
    return `*TX Kaydi*\nTX hash zincirde bulunamadi, tekrar kontrol et.`;
  }
  if (reason === "tx_hash_already_used") {
    return `*TX Kaydi*\nBu tx hash baska bir talepte zaten kullanildi.`;
  }
  return `*TX Kaydi Hatasi*\n${escapeMarkdown(reason || "bilinmeyen_hata")}`;
}

function formatTokenDecisionUpdate(request, options = {}) {
  return formatSharedTokenDecisionUpdate(request, options);
}

function formatDaily(profile, daily, board, balances, anomaly, contract) {
  const dailyCap = Number(daily?.dailyCap || 0);
  const tasksDone = Number(daily?.tasksDone || 0);
  const streak = Number(profile?.streak_days || 0);
  const streakMult = 1 + Math.min(streak, 30) * 0.05;
  const claimable = { sc: 0, hc: 0, rc: 0 };
  const statusMap = { ALINDI: '✅', HAZIR: '🎁', DEVAM: '🔄' };
  const missionLines = (board || []).map((mission, idx) => {
    const done = mission.completed;
    const claimed = mission.claimed;
    if (done && !claimed) {
      claimable.sc += Number(mission.reward.sc || 0);
      claimable.hc += Number(mission.reward.hc || 0);
      claimable.rc += Number(mission.reward.rc || 0);
    }
    const tag = claimed ? "ALINDI" : done ? "HAZIR" : "DEVAM";
    const emoji = statusMap[tag] || '🔄';
    const bar = progressBar(mission.progress, mission.target, 8);
    const rewardParts = [];
    if (mission.reward.sc > 0) rewardParts.push(`${mission.reward.sc} SC`);
    if (mission.reward.hc > 0) rewardParts.push(`${mission.reward.hc} HC`);
    if (mission.reward.rc > 0) rewardParts.push(`${mission.reward.rc} RC`);
    return (
      `${emoji} *${escapeMarkdown(mission.title)}*\n` +
      `   ${mission.progress}/${mission.target} ${bar} │ 💰 ${rewardParts.join(" + ")}`
    );
  });

  const anomalyLine = anomaly
    ? `\n🌀 *Nexus:* ${escapeMarkdown(anomaly.title)} (${anomaly.pressure_pct}% basınç)`
    : "";
  const contractLine = contract
    ? `\n📜 *Kontrat:* ${escapeMarkdown(contract.title)} \`${escapeMarkdown(contract.required_mode)}\``
    : "";

  const totalEarnable = Math.round((claimable.sc + (dailyCap - tasksDone) * 80) * streakMult);

  return (
    `🌅 *Günlük Kontrol Paneli*\n\n` +
    `👤 *${escapeMarkdown(profile.public_name)}*\n` +
    `📅 Görev: *${tasksDone}/${dailyCap}* │ 🔥 Streak: *${streak} gün*\n` +
    `${progressBar(tasksDone, Math.max(1, dailyCap), 14)} %${Math.round((tasksDone / Math.max(1, dailyCap)) * 100)}\n\n` +
    `┌──────────────────────────┐\n` +
    `│ 🪙 SC  *${String(balances.SC).padStart(7)}*  │\n` +
    `│ 💎 HC  *${String(balances.HC).padStart(7)}*  │\n` +
    `│ 🔮 RC  *${String(balances.RC).padStart(7)}*  │\n` +
    `└──────────────────────────┘\n` +
    `📊 Streak Çarpanı: *x${streakMult.toFixed(2)}* (+${Math.round((streakMult - 1) * 100)}% SC)` +
    anomalyLine + contractLine +
    `\n\n📋 *Günlük Hedefler:*\n\n` +
    missionLines.join("\n\n") +
    `\n\n💎 Bekleyen Ödül: *${claimable.sc} SC + ${claimable.hc} HC + ${claimable.rc} RC*` +
    `\n💰 Bugün kazanılabilir: ~*${totalEarnable} SC*`
  );
}

function formatSeason(season, stat, rank) {
  const points = Number(stat?.season_points || 0);
  const currentRank = rank > 0 ? `#${rank}` : "Yerleşmedi";
  const start = season.seasonStart.toISOString().slice(0, 10);
  const end = season.seasonEnd.toISOString().slice(0, 10);
  return (
    `📅 *Sezon Durumu*\n\n` +
    `🏟 Sezon: *S${season.seasonId}*\n` +
    `📆 Aralık: ${start} — ${end}\n` +
    `⏳ Kalan: *${season.daysLeft} gün*\n\n` +
    `⭐ Puanın: *${points}*\n` +
    `🏆 Sıralaman: *${currentRank}*`
  );
}

function formatLeaderboard(season, rows) {
  if (!rows || rows.length === 0) {
    return `*S${season.seasonId} Liderlik*\nHenuz puan yok.`;
  }
  const lines = rows.map((row, idx) => `${idx + 1}) *${escapeMarkdown(row.public_name)}* - ${Number(row.season_points || 0)} puan`);
  return `*S${season.seasonId} Liderlik*\n${lines.join("\n")}\n\nYaris acik.`;
}

function formatShop(offers, balances, activeEffects) {
  const emojiMap = {
    xp_boost: '⚡', sc_boost: '💰', streak_shield: '🛡️',
    task_reroll: '🎯', hc_drop: '💎', premium_pass: '👑'
  };
  const lines = offers.map((offer, idx) => {
    const title = offer.benefit_json?.title || offer.offer_type;
    const emoji = emojiMap[offer.offer_type] || '🛍️';
    const price = `${Number(offer.price)} ${offer.currency}`;
    const desc = offer.benefit_json?.description || '';
    return (
      `${idx + 1}️⃣ ${emoji} *${escapeMarkdown(title)}* — ${price}` +
      (desc ? `\n   _${escapeMarkdown(desc)}_` : '')
    );
  });

  let effectLines = '';
  if (activeEffects && activeEffects.length > 0) {
    effectLines = activeEffects.map((effect) => {
      const remaining = Math.max(0, new Date(effect.expires_at).getTime() - Date.now());
      const hours = Math.floor(remaining / 3600000);
      const mins = Math.floor((remaining % 3600000) / 60000);
      const emoji = emojiMap[effect.effect_key] || '✨';
      return `  ${emoji} ${effect.effect_key} — ${hours}s ${mins}dk kaldı`;
    }).join('\n');
  }

  return (
    `🛒 *Boost Dükkanı*\n\n` +
    `💰 Bakiye: *${balances.SC}* SC │ *${balances.HC}* HC │ *${balances.RC}* RC\n\n` +
    (effectLines
      ? `📦 *Aktif Boost'lar:*\n${effectLines}\n\n`
      : `📦 Aktif boost yok\n\n`) +
    `🛍️ *Katalog:*\n\n` +
    `${lines.join("\n\n")}\n\n` +
    `💡 Satın almak için ürün numarasına tıkla!`
  );
}

function formatPurchaseResult(result) {
  if (!result.success) {
    return `*Satin Alma Basarisiz*\nSebep: ${escapeMarkdown(result.reason || "islem_hatasi")}`;
  }
  const title = result.offer?.benefit_json?.title || result.offer?.offer_type || "Offer";
  const effectLine = result.effect
    ? `\nEtki: ${escapeMarkdown(result.effect.effect_key)} aktif edildi.`
    : "\nEtki uygulanmadi.";
  return (
    `*Satin Alma Basarili*\n` +
    `Urun: *${escapeMarkdown(title)}*\n` +
    `Odeme: *${Number(result.offer.price)} ${result.offer.currency}*\n` +
    `Kalan Bakiye: *${result.balanceAfter} ${result.offer.currency}*` +
    effectLine
  );
}

function formatMissions(board) {
  if (!board || board.length === 0) {
    return "🎯 *Günlük Görevler*\n\nŞu an görev yok.";
  }
  const statusEmoji = { ALINDI: '✅', HAZIR: '🎁', DEVAM: '🔄' };
  const lines = board.map((mission, idx) => {
    const bar = progressBar(mission.progress, mission.target, 10);
    const status = mission.claimed ? "ALINDI" : mission.completed ? "HAZIR" : "DEVAM";
    const sEmoji = statusEmoji[status] || '🔄';
    const rewardParts = [];
    if (mission.reward.sc > 0) rewardParts.push(`${mission.reward.sc} SC`);
    if (mission.reward.hc > 0) rewardParts.push(`${mission.reward.hc} HC`);
    if (mission.reward.rc > 0) rewardParts.push(`${mission.reward.rc} RC`);
    return (
      `${sEmoji} *${escapeMarkdown(mission.title)}*\n` +
      `   ${escapeMarkdown(mission.description)}\n` +
      `   ${mission.progress}/${mission.target} ${bar} │ 💰 ${rewardParts.join(" + ")}`
    );
  });
  return `🎯 *Günlük Görevler*\n\n${lines.join("\n\n")}\n\n💡 Tamamlananlar için ödülü al!`;
}

function formatMissionClaim(result) {
  if (result.status === "claimed") {
    const reward = result.mission.reward;
    const parts = [];
    if (reward.sc > 0) parts.push(`${reward.sc} SC`);
    if (reward.hc > 0) parts.push(`${reward.hc} HC`);
    if (reward.rc > 0) parts.push(`${reward.rc} RC`);
    return (
      `*Misyon Odulu Alindi*\n` +
      `Misyon: *${escapeMarkdown(result.mission.title)}*\n` +
      `Odul: *${parts.join(" + ")}*`
    );
  }
  if (result.status === "already_claimed") {
    return `*Misyon*\nBu odulu zaten aldin.`;
  }
  if (result.status === "not_ready") {
    return `*Misyon*\nHedef tamamlanmadi. Biraz daha ilerle.`;
  }
  return `*Misyon*\nBulunamadi.`;
}

function formatWar(status, season) {
  const value = Math.floor(Number(status.value || 0));
  const next = Number(status.next || 0);
  const tier = Number(status.tier || 0);
  const gap = next > 0 ? Math.max(0, next - value) : 0;
  const bar = progressBar(value, next || Math.max(1, value), 14);
  const pctVal = next > 0 ? Math.round((value / next) * 100) : 100;
  const tierStars = '⭐'.repeat(Math.min(tier, 5));

  const rewardTiers = [
    { t: 1, reward: '500 SC' },
    { t: 2, reward: '1,000 SC + 10 HC' },
    { t: 3, reward: '2,000 SC + 25 HC' },
    { t: 4, reward: '5,000 SC + 50 HC + 5 RC' },
    { t: 5, reward: '10,000 SC + 100 HC + 20 RC' }
  ];
  const currentReward = rewardTiers.find(r => r.t === tier);
  const nextReward = rewardTiers.find(r => r.t === tier + 1);

  return (
    `⚔️ *Topluluk Savaşı // War Room*\n\n` +
    `📅 Sezon: *S${season.seasonId}* │ ⏳ *${season.daysLeft} gün* kaldı\n\n` +
    `🏰 *Topluluk Havuzu:* ${value.toLocaleString()} puan\n` +
    `🎖️ *Tier:* ${tier} ${tierStars}\n` +
    `${bar} %${pctVal}\n\n` +
    (gap > 0
      ? `📈 Sonraki tier'e: *${gap.toLocaleString()} puan*\n`
      : `🏆 *Maksimum tier'e ulaşıldı!*\n`) +
    `\n💰 *Sezon Sonu Ödülleri:*\n` +
    (currentReward ? `  🎁 Mevcut (T${currentReward.t}): ${currentReward.reward}\n` : '') +
    (nextReward ? `  🔓 Sonraki (T${nextReward.t}): ${nextReward.reward}\n` : '') +
    `\n🎯 Görev ve PvP ile topluluk puanına katkı sağla!`
  );
}

function formatKingdom(profile, state) {
  const tier = Number(profile.kingdom_tier || 0);
  const rep = Number(profile.reputation_score || 0);
  const toNext = Number(state.toNext || 0);
  const tierNames = ['Çırak', 'Asker', 'Şövalye', 'Kaptan', 'Komutan', 'General', 'Lord', 'Kral'];
  const tierName = tierNames[Math.min(tier, tierNames.length - 1)] || `T${tier}`;
  const tierStars = '⭐'.repeat(Math.min(tier, 7));
  const bar = progressBar(state.progressValue || 0, state.progressMax || 1, 12);
  const pctVal = Math.round(((state.progressValue || 0) / Math.max(1, state.progressMax || 1)) * 100);

  const unlocks = {
    1: ['📋 Temel görevler açık'],
    2: ['⚔️ PvP Raid erişimi', '💰 Günlük SC cap +20%'],
    3: ['🎯 ELITE görevler açık', '💎 Günlük HC cap: 5'],
    4: ['🏰 War Room katılımı', '💎 Günlük HC cap: 8', '💰 Payout çarpanı x1.5'],
    5: ['👑 Premium görevler', '💎 Günlük HC cap: 12', '💰 Payout çarpanı x2'],
    6: ['🔥 Boss Raid erişimi', '🛡️ Streak koruması ücretsiz'],
    7: ['🏆 Topluluk lideri rozeti', '💰 Payout çarpanı x3']
  };

  const currentUnlocks = unlocks[tier] || [];
  const nextUnlocks = unlocks[tier + 1] || [];

  const historyLines = (state.history || []).slice(0, 5).map((row) => {
    const date = new Date(row.created_at).toISOString().slice(0, 10);
    return `  📌 ${date}: T${row.from_tier} → T${row.to_tier}`;
  });

  return (
    `👑 *Kingdom // Tier Paneli*\n\n` +
    `👤 *${escapeMarkdown(profile.public_name)}*\n` +
    `⚔️ Tier: *${tier}* — ${tierName} ${tierStars}\n` +
    `🏅 Reputasyon: *${rep.toLocaleString()}*\n` +
    `${bar} %${pctVal}\n\n` +
    (state.nextThreshold !== null
      ? `📈 Sonraki Tier *T${state.nextTier}*: *${toNext} puan* kaldı\n\n`
      : `🏆 *Maksimum tier'e ulaştın!*\n\n`) +
    (currentUnlocks.length
      ? `🔓 *Mevcut Avantajlar (T${tier}):*\n${currentUnlocks.map(u => `  ${u}`).join('\n')}\n\n`
      : '') +
    (nextUnlocks.length
      ? `🔮 *T${tier + 1} Açılınca:*\n${nextUnlocks.map(u => `  ${u}`).join('\n')}\n\n`
      : '') +
    (historyLines.length
      ? `📜 *Son Hareketler:*\n${historyLines.join('\n')}`
      : '📜 Henüz tier hareketi yok')
  );
}

function formatBossFight(boss, playerDamage, participants) {
  const hp = Number(boss?.hp || 0);
  const maxHp = Number(boss?.max_hp || 1);
  const hpPct = Math.round((hp / Math.max(1, maxHp)) * 100);
  const bar = progressBar(maxHp - hp, maxHp, 12);
  const dmg = Number(playerDamage || 0);
  const count = Number(participants || 0);
  const weakType = boss?.weak_type || 'NONE';
  const weakEmoji = { LIGHTNING: '⚡', FIRE: '🔥', ICE: '❄️', POISON: '☠️', NONE: '❓' };
  const rewardSc = Number(boss?.reward_sc || 0);
  const rewardHc = Number(boss?.reward_hc || 0);
  const remaining = boss?.remaining_minutes || 0;

  return (
    `🐉 *BOSS FIGHT — ${escapeMarkdown(boss?.name || 'Unknown')}*\n\n` +
    `❤️ HP: ${bar} ${hp.toLocaleString()}/${maxHp.toLocaleString()} (%${hpPct})\n` +
    `⚔️ Senin Hasarın: *${dmg.toLocaleString()}*\n` +
    `👥 Katılımcı: *${count}* oyuncu\n\n` +
    `🎯 Zayıf Nokta: ${weakEmoji[weakType] || '❓'} *${weakType}*\n` +
    `💰 Ödül Havuzu: *${rewardSc.toLocaleString()} SC* + *${rewardHc} HC*\n\n` +
    `⏰ Kalan: *${remaining} dk*\n\n` +
    `💡 Boss'un zayıf noktasına uygun görev modu ile hasar artır!`
  );
}

function formatChainQuest(chain) {
  const steps = chain?.steps || [];
  const currentStep = Number(chain?.current_step || 0);
  const totalSteps = steps.length || 5;
  const bar = progressBar(currentStep, totalSteps, 10);
  const pctVal = Math.round((currentStep / Math.max(1, totalSteps)) * 100);
  const bonusSc = Number(chain?.bonus_sc || 0);
  const bonusHc = Number(chain?.bonus_hc || 0);

  const stepLines = steps.map((step, idx) => {
    const num = idx + 1;
    if (num < currentStep) {
      return `  ✅ ${num}. ${escapeMarkdown(step.title)}`;
    }
    if (num === currentStep) {
      const stepBar = progressBar(step.progress || 0, step.target || 1, 8);
      return `  🔄 ${num}. *${escapeMarkdown(step.title)}* (aktif)\n     ${step.progress || 0}/${step.target || 1} ${stepBar}`;
    }
    return `  ⬜ ${num}. ${escapeMarkdown(step.title)}`;
  });

  return (
    `🔗 *Zincir Görev — ${escapeMarkdown(chain?.title || 'Bilinmeyen')}*\n\n` +
    `Adım ${currentStep}/${totalSteps}: ${bar} %${pctVal}\n\n` +
    `📋 *Zincir:*\n${stepLines.join('\n')}\n\n` +
    `💎 Zincir Bonusu: *${bonusSc.toLocaleString()} SC + ${bonusHc} HC*\n` +
    `🏆 Tüm adımları tamamla, büyük ödülü kap!`
  );
}

function formatStreakWarning(profile) {
  const streak = Number(profile?.streak_days || 0);
  const mult = 1 + Math.min(streak, 30) * 0.05;
  const extraSc = Math.round((mult - 1) * 80 * streak);
  const hoursLeft = Number(profile?.streak_hours_left || 0);
  const h = Math.floor(hoursLeft);
  const m = Math.round((hoursLeft - h) * 60);

  return (
    `⚠️ *STREAK UYARISI*\n\n` +
    `🔥 *${streak} günlük* streak'in risk altında!\n` +
    `⏰ Kalan süre: *${h}s ${m}dk*\n\n` +
    `❌ Kaybedersen:\n` +
    `  → x${mult.toFixed(2)} SC çarpanı → x1.00\n` +
    `  → ~${extraSc} SC ekstra gelir kaybolur\n` +
    `  → ${streak} günlük ilerleme sıfırlanır\n\n` +
    `🛡️ Streak Koruması: *300 HC*\n` +
    `📋 Hızlı görev: /tasks\n` +
    `⚔️ Hızlı PvP: /pvp\n\n` +
    `💡 Giriş yap veya 1 görev tamamla!`
  );
}

function formatPassOffer(season, currentTier) {
  const tier = Number(currentTier || 0);
  const daysLeft = Number(season?.daysLeft || 0);
  const seasonId = season?.seasonId || 1;

  return (
    `👑 *Premium Arena Pass — Sezon ${seasonId}*\n\n` +
    `🎁 *İçerik:*\n` +
    `  → 💎 Günlük HC: 2 → *5*\n` +
    `  → ⚡ XP Çarpanı: *x2*\n` +
    `  → 🎯 Özel görevler (*ELITE* tier)\n` +
    `  → 🏆 Özel rozet + leaderboard\n` +
    `  → 💰 Payout çarpanı: *x2*\n` +
    `  → 🛡️ Haftalık ücretsiz streak koruması\n\n` +
    `📊 *Free vs Premium:*\n` +
    `┌──────────────┬───────┬─────────┐\n` +
    `│              │ Free  │ Premium │\n` +
    `├──────────────┼───────┼─────────┤\n` +
    `│ Günlük HC    │   2   │    5    │\n` +
    `│ XP Çarpanı   │  x1   │   x2    │\n` +
    `│ Payout Çarp. │  x1   │   x2    │\n` +
    `│ ELITE Görev  │  ❌   │   ✅    │\n` +
    `│ Streak Kalkan│  ❌   │   ✅    │\n` +
    `└──────────────┴───────┴─────────┘\n\n` +
    `💲 Fiyat: *5 TON* (≈$5)\n` +
    `⏰ Sezon sonu: *${daysLeft} gün*\n\n` +
    (tier >= 3
      ? `🔓 Tier ${tier} — Premium'a uygunsun!`
      : `⚠️ Tier 3+ gerekli (Mevcut: T${tier})`)
  );
}

function formatPayout(details) {
  if (!details || typeof details !== "object") {
    return (
      `*Cekim Durumu*\n` +
      `Esik: 0.0001 BTC\n` +
      `Cooldown: 72 saat\n\n` +
      `Uygunluk: *Hayir*\n` +
      `Not: Cekim entitlement tabanlidir, transfer admin tarafinda disarida yapilir.`
    );
  }

  const entitled = Number(details.entitledBtc || 0).toFixed(8);
  const threshold = Number(details.thresholdBtc || 0).toFixed(8);
  const cooldown = details.cooldownUntil ? new Date(details.cooldownUntil).toISOString().slice(0, 16).replace("T", " ") : "Yok";
  const eligibility = details.canRequest ? "Evet" : "Hayir";
  const latestLine = details.latest
    ? `\nSon Talep: #${details.latest.id} ${details.latest.status} ${Number(details.latest.amount || 0).toFixed(8)} BTC (${Number(details.latest.source_hc_amount || 0).toFixed(4)} HC)`
    : "\nSon Talep: Yok";
  const txLine = details.latest?.tx_hash ? `\nTX: ${escapeMarkdown(details.latest.tx_hash)}` : "";
  const gate = details.marketCapGate || {};
  const gateLine = gate.enabled
    ? `\nMarket Cap Gate: *${gate.allowed ? "acik" : "kapali"}* (${Number(gate.current || 0).toFixed(2)} / ${Number(gate.min || 0).toFixed(2)} USD)`
    : "";
  const release = details.release || {};
  const releaseLine =
    release.enabled
      ? `\nUnlock Tier: *${escapeMarkdown(String(release.unlockTier || "T0"))}* (${Math.round(
          Number(release.unlockProgress || 0) * 100
        )}%)` +
        `\nBugun Damla Kalan: *${Number(release.todayDripRemainingBtc || 0).toFixed(8)} BTC*` +
        `\nBugun Damla Limit: *${Number(release.todayDripCapBtc || 0).toFixed(8)} BTC*` +
        `\nSonraki Hedef: ${escapeMarkdown(String(release.nextTierTarget || "veri yok"))}`
      : "";
  const globalGateLine =
    release.enabled && release.globalGateOpen === false
      ? `\nGlobal Kilit: *kapali* (${Number(release.globalCapCurrentUsd || 0).toFixed(2)} / ${Number(
          release.globalCapMinUsd || 0
        ).toFixed(2)} USD)`
      : "";
  return (
    `*Cekim Durumu*\n` +
    `Entitlement: *${entitled} BTC*\n` +
    `Esik: *${threshold} BTC*\n` +
    `Cooldown: *${cooldown}*\n\n` +
    `Uygunluk: *${eligibility}*${gateLine}${globalGateLine}${releaseLine}${latestLine}${txLine}\n` +
    `Model: entitlement-only, odeme disaridan admin tarafinda islenir.`
  );
}

function formatPayoutDecisionUpdate(request, options = {}) {
  return formatSharedPayoutDecisionUpdate(request, options);
}

function formatFreezeMessage(reason) {
  const detail = reason ? `\nSebep: ${reason}` : "";
  return `*Sistem Bakim Modunda*\nGorev dagitimi gecici olarak durduruldu.${detail}`;
}

function formatOps(state) {
  const activeLine = state.activeAttempt
    ? `#${state.activeAttempt.id} ${escapeMarkdown(state.activeAttempt.taskType || "task")} ${state.activeAttempt.startedAt}`
    : "Yok";
  const revealLine = state.revealAttempt
    ? `#${state.revealAttempt.id} ${escapeMarkdown(state.revealAttempt.taskType || "task")} ${state.revealAttempt.completedAt}`
    : "Yok";
  const effectsLine =
    (state.effects || []).length > 0
      ? state.effects.map((x) => `${escapeMarkdown(x.effect_key)} (${x.expires_at})`).join("\n")
      : "Aktif boost yok";
  const eventsLine =
    (state.events || []).length > 0
      ? state.events
          .map((event) => `${event.time} ${escapeMarkdown(event.event_type)}${event.hint ? ` | ${escapeMarkdown(event.hint)}` : ""}`)
          .join("\n")
      : "Event yok";
  const anomalyLine = state.anomaly
    ? `\n\n*Nexus*\n${escapeMarkdown(state.anomaly.title)} (${state.anomaly.preferred_mode}) | ${state.anomaly.pressure_pct}%`
    : "";

  return (
    `*Ops Console*\n` +
    `Risk: *${state.riskPct}%*\n` +
    `Callback Dup: *${state.duplicateRatio}%*\n` +
    `Saatlik Complete: *${state.hourlyComplete}*\n` +
    `Aktif Attempt: ${activeLine}\n` +
    `Reveal Hazir: ${revealLine}\n\n` +
    `*Aktif Efektler*\n${effectsLine}\n\n` +
    `*Son Eventler*\n${eventsLine}${anomalyLine}`
  );
}

function formatArenaStatus(state, options = {}) {
  const lang = resolveLang(options);
  const tr = lang === "tr";
  const rating = Math.floor(Number(state.rating || 0));
  const rank = state.rank || "-";
  const wins = Number(state.wins || 0);
  const losses = Number(state.losses || 0);
  const total = wins + losses;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
  const winStreak = Number(state.winStreak || 0);
  const eloHistory = Array.isArray(state.eloHistory) ? state.eloHistory : [];

  const lastRuns = (state.recentRuns || []).length
    ? state.recentRuns
        .slice(0, 5)
        .map((run) => {
          const at = new Date(run.created_at).toISOString().slice(11, 16);
          const icon = run.outcome === 'win' ? '🏆' : run.outcome === 'near' ? '⚡' : '💀';
          const delta = run.rating_delta >= 0 ? `+${run.rating_delta}` : String(run.rating_delta);
          return `  ${icon} ${at} *${run.mode}* │ ${delta} ELO`;
        })
        .join("\n")
    : tr ? "  Kayit yok" : "  No records";

  const leaders = (state.leaderboard || []).length
    ? state.leaderboard
        .slice(0, 5)
        .map((row, index) => {
          const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
          return `  ${medal} *${escapeMarkdown(row.public_name)}* — ${Math.floor(Number(row.rating || 0))} ELO`;
        })
        .join("\n")
    : tr ? "  Veri yok" : "  No data";

  return (
    `╔══════════════════════════╗\n` +
    `║  ⚔️ *ARENA PROTOCOL*        ║\n` +
    `╚══════════════════════════╝\n\n` +
    `🏅 *ELO Rating:* ${rating} │ *#${rank}*\n` +
    `${eloHistory.length > 0 ? `📊 ${tr ? "Trend" : "Trend"}: ${sparkline(eloHistory)}\n` : ""}` +
    `\n┌─── ${tr ? "SAVAS ISTATISTIKLERI" : "COMBAT STATS"} ─────┐\n` +
    `│ 🎮 ${tr ? "Oyun" : "Games"}: *${total}* │ ✅ *${wins}*W ❌ *${losses}*L\n` +
    `│ 📈 ${tr ? "Galibiyet" : "Win Rate"}: *${winRate}%* ${progressBar(wins, Math.max(1, total), 8)}\n` +
    (winStreak > 0 ? `│ 🔥 ${tr ? "Zafer Serisi" : "Win Streak"}: *${winStreak}* (x${(1 + winStreak * 0.05).toFixed(2)} bonus)\n` : '') +
    `│ 🎫 Ticket: *${state.ticketCost || 1} RC*\n` +
    `│ ⏱ Cooldown: *${state.cooldownSec || 0}s*\n` +
    `└──────────────────────────┘\n\n` +
    `🏆 *${tr ? "Liderlik Tablosu" : "Leaderboard"}:*\n${leaders}\n\n` +
    `📜 *${tr ? "Son Maclar" : "Recent Matches"}:*\n${lastRuns}`
  );
}

function formatArenaRaidResult(result) {
  const sign = result.run?.rating_delta >= 0 ? "+" : "";
  const modeLabel = result.mode?.label || "Dengeli";
  const outcomeMap = {
    win: "ZAFER",
    near: "KIL PAYI",
    loss: "KAYIP"
  };
  const outcome = outcomeMap[result.run?.outcome] || String(result.run?.outcome || "win").toUpperCase();
  const anomalyLine = result.anomaly?.title
    ? `\nNexus: *${escapeMarkdown(result.anomaly.title)}* (${escapeMarkdown(result.anomaly.preferred_mode || "balanced")})`
    : "";
  const outcomeEmoji = result.run?.outcome === 'win' ? '🏆' : result.run?.outcome === 'near' ? '⚡' : '💀';
  return (
    `${outcomeEmoji} *Arena Raid Sonucu*\n\n` +
    `🎯 Mod: *${modeLabel}* │ Durum: *${outcome}*\n` +
    `💰 Ödül: *${result.reward?.sc || 0} SC + ${result.reward?.hc || 0} HC + ${result.reward?.rc || 0} RC*\n` +
    `🏅 Rating: *${result.rating_after || 0}* (${sign}${result.run?.rating_delta || 0})\n` +
    `🏆 Arena Rank: *#${result.rank || "-"}*${anomalyLine}\n\n` +
    `📅 Sezon +${result.season_points || 0} │ ⚔️ War +${result.war_delta || 0}`
  );
}

function formatNexusPulse(payload) {
  const anomaly = payload?.anomaly || {};
  const tactical = payload?.tactical || {};
  const contract = payload?.contract || {};
  const bars = progressBar(Number(anomaly.pressure_pct || 0), 100, 14);
  const families = Array.isArray(contract.focus_families) ? contract.focus_families.join(", ") : "";
  return (
    `*Nexus Pulse*\n` +
    `Event: *${escapeMarkdown(anomaly.title || "Stability Window")}*\n` +
    `Etki: ${escapeMarkdown(anomaly.subtitle || "-")}\n` +
    `Risk Shift: *${Number(anomaly.risk_shift_pct || 0)}%*\n` +
    `SC x${Number(anomaly.sc_multiplier || 1).toFixed(2)} | RC x${Number(anomaly.rc_multiplier || 1).toFixed(2)} | HC x${Number(
      anomaly.hc_multiplier || 1
    ).toFixed(2)}\n` +
    `Sezon x${Number(anomaly.season_multiplier || 1).toFixed(2)}\n` +
    `Basinc: ${bars}\n\n` +
    `Kontrat: *${escapeMarkdown(contract.title || "Nexus Contract")}*\n` +
    `Hedef Mod: *${escapeMarkdown(contract.required_mode || "balanced")}* | Aile: ${escapeMarkdown(families || "any")}\n` +
    `Bonus: SC x${Number(contract.sc_multiplier || 1).toFixed(2)} +${Number(contract.rc_flat_bonus || 0)} RC\n\n` +
    `Taktik Oneri: *${escapeMarkdown(tactical.recommended_mode || anomaly.preferred_mode || "balanced")}*\n` +
    `Sonraki Hamle: ${escapeMarkdown(tactical.next_step || "tasks")}`
  );
}

function formatHelp(options = {}) {
  const lang = String(options.lang || "tr").toLowerCase().startsWith("en") ? "en" : "tr";
  const commands = Array.isArray(options.commands) ? options.commands.filter(Boolean) : null;
  if (!commands || commands.length === 0) {
    return (
      `*Komut Merkezi*\n` +
      `/menu - Ana launcher + hizli rota paneli\n` +
      `/play - Nexus Arena web paneli\n` +
      `/tasks - Gorev havuzu (sure/odul)\n` +
      `/finish [safe|balanced|aggressive] - Aktif denemeyi bitir\n` +
      `/reveal - Son denemenin odulunu ac\n` +
      `/pvp [safe|balanced|aggressive] - Raid baslat\n` +
      `/wallet - SC/HC/RC bakiye\n` +
      `/vault - Cekim/Vault paneli\n` +
      `/token - Token cuzdani + talepler\n` +
      `/status - Runtime durum ozeti\n` +
      `/story - Hikaye + rota rehberi\n` +
      `/lang <tr|en> - Kalici dil tercihi\n` +
      `/help - Detayli komut kartlari\n\n` +
      `Alias: /raid -> /pvp, /payout -> /vault, /guide -> /story\n` +
      `Slashsiz kisayollar: "gorev", "bitir dengeli", "reveal", "raid aggressive"\n\n` +
      `Admin: /admin, /admin_live, /admin_queue, /admin_metrics, /admin_config`
    );
  }

  const primaryCommands = commands.filter((command) => command.primary);
  const focusCommands = primaryCommands.length > 0 ? primaryCommands : commands.filter((command) => !command.adminOnly);
  const advancedCommands = commands.filter((command) => !command.primary && !command.adminOnly);
  const adminCommands = commands.filter((command) => command.adminOnly);
  const title = lang === "en" ? "*Command Center*" : "*Komut Merkezi*";
  const lines = focusCommands.map((command, idx) => {
    const desc = localizeText(
      {
        tr: command.description_tr || command.description || "",
        en: command.description_en || command.description || ""
      },
      lang
    );
    const aliases = Array.isArray(command.aliases) && command.aliases.length > 0 ? ` (${command.aliases.join(", ")})` : "";
    const scenarios = Array.isArray(command.scenarios) ? command.scenarios.slice(0, 2) : [];
    const outcomes = Array.isArray(command.outcomes) ? command.outcomes.slice(0, 2) : [];
    const scenarioLine =
      scenarios.length > 0
        ? lang === "en"
          ? `Scenario: ${escapeMarkdown(scenarios.join(" | "))}`
          : `Senaryo: ${escapeMarkdown(scenarios.join(" | "))}`
        : lang === "en"
          ? "Scenario: -"
          : "Senaryo: -";
    const outcomeLine =
      outcomes.length > 0
        ? lang === "en"
          ? `Outcome: ${escapeMarkdown(outcomes.join(" | "))}`
          : `Cikti: ${escapeMarkdown(outcomes.join(" | "))}`
        : lang === "en"
          ? "Outcome: -"
          : "Cikti: -";
    const purposeLabel = lang === "en" ? "Purpose" : "Amac";
    return (
      `${idx + 1}) */${command.key}${aliases}*\n` +
      `${purposeLabel}: ${escapeMarkdown(desc)}\n` +
      `${scenarioLine}\n` +
      `${outcomeLine}`
    );
  });
  const shortcuts =
    lang === "en"
      ? `Free text shortcuts: "tasks", "finish balanced", "reveal", "pvp aggressive"`
      : `Slashsiz kisayollar: "gorev", "bitir dengeli", "reveal", "pvp aggressive"`;
  const advancedHeader = lang === "en" ? "*Advanced Commands*" : "*Gelismis Komutlar*";
  const advancedLine =
    advancedCommands.length > 0
      ? advancedCommands.map((command) => `/${command.key}`).join(", ")
      : lang === "en"
        ? "None"
        : "Yok";
  const adminHeader = lang === "en" ? "*Admin Commands*" : "*Admin Komutlari*";
  const adminLine =
    adminCommands.length > 0
      ? adminCommands.map((command) => `/${command.key}`).join(", ")
      : lang === "en"
        ? "None"
        : "Yok";
  const languageHint =
    lang === "en"
      ? `Language: /lang tr or /lang en`
      : `Dil: /lang tr veya /lang en`;
  return (
    `${title}\n` +
    `${lines.join("\n")}\n\n` +
    `${advancedHeader}\n${advancedLine}\n\n` +
    `${adminHeader}\n${adminLine}\n\n` +
    `${shortcuts}\n${languageHint}`
  );
}

function clipTextToLimit(text, maxLen, suffix = "...") {
  const safeMax = Math.max(32, Number(maxLen || 0));
  const raw = String(text || "");
  if (raw.length <= safeMax) {
    return raw;
  }
  const trimmed = raw.slice(0, Math.max(0, safeMax - suffix.length));
  return `${trimmed}${suffix}`;
}

function formatListForCard(items = [], lang = "tr") {
  const rows = (Array.isArray(items) ? items : []).map((row, idx) => `${idx + 1}) ${escapeMarkdown(String(row || ""))}`);
  if (rows.length > 0) {
    return rows.join("\n");
  }
  return lang === "en" ? "1) -" : "1) -";
}

function formatHelpIndex(payload = {}) {
  const lang = String(payload.lang || "tr").toLowerCase().startsWith("en") ? "en" : "tr";
  const categoryLabel = escapeMarkdown(String(payload.categoryLabel || (lang === "en" ? "Core Loop" : "Core Loop")));
  const page = Math.max(1, Number(payload.page || 1));
  const totalPages = Math.max(1, Number(payload.totalPages || 1));
  const totalItems = Math.max(0, Number(payload.totalItems || 0));
  const categories = Array.isArray(payload.categories) ? payload.categories : [];
  const items = Array.isArray(payload.items) ? payload.items : [];
  const categoryLine = categories
    .map((row) => {
      const label = escapeMarkdown(String(row.label || row.key || "-"));
      return row.active ? `[${label}]` : label;
    })
    .join(" | ");
  const lines = items.map((card, idx) => {
    const purpose = lang === "en" ? card.purpose_en : card.purpose_tr;
    const shortPurpose = clipTextToLimit(String(purpose || ""), lang === "en" ? 84 : 110);
    return `${idx + 1}) */${escapeMarkdown(card.key || "")}*\n${escapeMarkdown(shortPurpose)}`;
  });
  const header =
    lang === "en"
      ? `*Command Center // Index*\nCategory: *${categoryLabel}* | Page: *${page}/${totalPages}* | Commands: *${totalItems}*`
      : `*Komut Merkezi // Indeks*\nKategori: *${categoryLabel}* | Sayfa: *${page}/${totalPages}* | Komut: *${totalItems}*`;
  const usage =
    lang === "en"
      ? `Use: \`/help <command>\` or \`/help <category>\``
      : `Kullanim: \`/help <komut>\` veya \`/help <kategori>\``;
  const text =
    `${header}\n` +
    `${lang === "en" ? "Categories" : "Kategoriler"}: ${categoryLine || "-"}\n\n` +
    `${lines.join("\n\n") || "-"}\n\n` +
    `${usage}`;
  return clipTextToLimit(text, 1800);
}

function formatHelpCommandCard(card = {}, payload = {}) {
  const lang = String(payload.lang || "tr").toLowerCase().startsWith("en") ? "en" : "tr";
  const categoryLabel = escapeMarkdown(String(payload.categoryLabel || card.category || "-"));
  const scopeLabel = card.scope === "admin" ? (lang === "en" ? "admin" : "admin") : lang === "en" ? "player" : "oyuncu";
  const flowTitle = lang === "en" ? "Operation Flow" : "Operasyon Akisi";
  const guardTitle = lang === "en" ? "Decision Guards" : "Karar Guard";
  const syntaxTitle = lang === "en" ? "Syntax" : "Kullanim";
  const examplesTitle = lang === "en" ? "Examples" : "Ornekler";
  const expectedTitle = lang === "en" ? "Expected Output" : "Beklenen Cikti";
  const failuresTitle = lang === "en" ? "Common Failures" : "Sik Hata/Cozum";
  const relatedTitle = lang === "en" ? "Related Commands" : "Ilgili Komutlar";
  const flowText = formatListForCard(lang === "en" ? card.operation_flow_en : card.operation_flow_tr, lang);
  const guardText = formatListForCard(lang === "en" ? card.decision_guards_en : card.decision_guards_tr, lang);
  const syntaxText = formatListForCard(card.syntax || [], lang);
  const examplesText = formatListForCard(lang === "en" ? card.examples_en : card.examples_tr, lang);
  const expectedText = formatListForCard(lang === "en" ? card.expected_en : card.expected_tr, lang);
  const failuresText = formatListForCard(lang === "en" ? card.failures_en : card.failures_tr, lang);
  const related =
    Array.isArray(card.related_commands) && card.related_commands.length > 0
      ? card.related_commands.map((cmd) => `/${escapeMarkdown(String(cmd || ""))}`).join(" | ")
      : "-";
  const title = escapeMarkdown(String(lang === "en" ? card.title_en : card.title_tr || `/${card.key || "help"}`));
  const purpose = escapeMarkdown(String(lang === "en" ? card.purpose_en : card.purpose_tr || ""));
  const whenToUse = escapeMarkdown(String(lang === "en" ? card.when_to_use_en : card.when_to_use_tr || ""));
  const text =
    `*${title}*\n` +
    `${lang === "en" ? "Category" : "Kategori"}: *${categoryLabel}* | ${lang === "en" ? "Scope" : "Scope"}: *${scopeLabel}*\n\n` +
    `${lang === "en" ? "Purpose" : "Amac"}: ${purpose}\n` +
    `${lang === "en" ? "When to use" : "Ne zaman kullanilir"}: ${whenToUse}\n\n` +
    `*${flowTitle}*\n${flowText}\n\n` +
    `*${guardTitle}*\n${guardText}\n\n` +
    `*${syntaxTitle}*\n${syntaxText}\n\n` +
    `*${examplesTitle}*\n${examplesText}\n\n` +
    `*${expectedTitle}*\n${expectedText}\n\n` +
    `*${failuresTitle}*\n${failuresText}\n\n` +
    `*${relatedTitle}*\n${related}`;
  return clipTextToLimit(text, lang === "en" ? 1400 : 2400);
}

function formatHelpNotFound(payload = {}) {
  const lang = String(payload.lang || "tr").toLowerCase().startsWith("en") ? "en" : "tr";
  const query = escapeMarkdown(String(payload.query || "-"));
  const suggestions = Array.isArray(payload.suggestions) ? payload.suggestions : [];
  const suggestionLine =
    suggestions.length > 0
      ? suggestions.map((key) => `/${escapeMarkdown(String(key || ""))}`).join(" | ")
      : lang === "en"
        ? "No close match."
        : "Yakin eslesme bulunamadi.";
  const text =
    lang === "en"
      ? `*Help Query Not Found*\nQuery: \`${query}\`\nSuggestions: ${suggestionLine}\n\nUse \`/help\`, \`/help token\`, \`/help economy\`.`
      : `*Help Sorgusu Bulunamadi*\nSorgu: \`${query}\`\nOneriler: ${suggestionLine}\n\nKullanim: \`/help\`, \`/help token\`, \`/help ekonomi\`.`;
  return clipTextToLimit(text, 1200);
}

function formatHelpAccessDenied(payload = {}) {
  const lang = String(payload.lang || "tr").toLowerCase().startsWith("en") ? "en" : "tr";
  const commandKey = escapeMarkdown(String(payload.commandKey || "admin"));
  const alternatives = Array.isArray(payload.alternatives) ? payload.alternatives : [];
  const altLine =
    alternatives.length > 0
      ? alternatives.map((key) => `/${escapeMarkdown(String(key || ""))}`).join(" | ")
      : lang === "en"
        ? "/help | /status | /menu"
        : "/help | /status | /menu";
  const text =
    lang === "en"
      ? `*Admin Command Scope*\nThis command is admin-only: /${commandKey}\nTry these player commands: ${altLine}`
      : `*Admin Komut Kapsami*\nBu komut admin kapsamindadir: /${commandKey}\nOyuncu alternatifleri: ${altLine}`;
  return clipTextToLimit(text, 1200);
}

function formatAdminQueue(payload = {}) {
  const payouts = Array.isArray(payload.payouts) ? payload.payouts : [];
  const tokens = Array.isArray(payload.tokens) ? payload.tokens : [];
  const payoutLines =
    payouts.length > 0
      ? payouts
          .slice(0, 10)
          .map(
            (row) =>
              `P#${row.id} u${row.user_id} ${Number(row.amount || 0).toFixed(8)} BTC [${String(row.status || "").toUpperCase()}]`
          )
          .join("\n")
      : "Payout queue bos";
  const tokenLines =
    tokens.length > 0
      ? tokens
          .slice(0, 10)
          .map(
            (row) =>
              `T#${row.id} u${row.user_id} ${Number(row.usd_amount || 0).toFixed(2)} USD -> ${Number(
                row.token_amount || 0
              ).toFixed(4)} ${escapeMarkdown(row.token_symbol || "NXT")} [${escapeMarkdown(String(row.status || "").toUpperCase())}]`
          )
          .join("\n")
      : "Token queue bos";
  return (
    `*Admin Queue*\n` +
    `Toplam: *${payouts.length + tokens.length}*\n` +
    `Payout: *${payouts.length}* | Token: *${tokens.length}*\n\n` +
    `*Payout*\n${payoutLines}\n\n` +
    `*Token*\n${tokenLines}`
  );
}

function formatRaidContract(payload = {}) {
  const profile = payload.profile || {};
  const anomaly = payload.anomaly || {};
  const contract = payload.contract || {};
  const tactical = payload.tactical || {};
  const war = payload.war || {};
  const riskPct = (Number(payload.risk || 0) * 100).toFixed(0);
  const focusFamilies = Array.isArray(contract.focus_families) ? contract.focus_families.join(", ") : "any";
  const bonus = contract.match_bonus || {};
  return (
    `*Raid Kontrat Direktifi*\n` +
    `Kral: *${escapeMarkdown(profile.public_name || "-")}*\n` +
    `Event: *${escapeMarkdown(anomaly.title || "Stability Window")}* | Risk *${riskPct}%*\n` +
    `War Tier: *${escapeMarkdown(String(war.tier || "seed"))}* | Havuz *${Number(war.value || 0).toFixed(0)}*\n\n` +
    `Kontrat: *${escapeMarkdown(contract.title || "Nexus Contract")}*\n` +
    `Hedef Mod: *${escapeMarkdown(contract.required_mode || "balanced")}*\n` +
    `Aile: ${escapeMarkdown(focusFamilies)}\n` +
    `Bonus: SC x${Number(bonus.sc_multiplier || 1).toFixed(2)} | +${Number(bonus.rc_flat_bonus || 0)} RC | +${Number(
      bonus.season_points || 0
    )} SP\n\n` +
    `Taktik: *${escapeMarkdown(tactical.recommended_mode || "balanced")}*\n` +
    `Sonraki Hamle: ${escapeMarkdown(tactical.next_step || "raid balanced")}`
  );
}

function formatUiMode(profile = {}, prefs = null, perf = null) {
  const resolved = prefs || {};
  const uiMode = String(resolved.ui_mode || "hardcore");
  const quality = String(resolved.quality_mode || "auto");
  const reduced = Boolean(resolved.reduced_motion);
  const largeType = Boolean(resolved.large_text);
  const fps = Number(perf?.fps_avg || 0);
  return (
    `*UI Mode*\n` +
    `Kral: *${escapeMarkdown(profile.public_name || "-")}*\n` +
    `Profil: *${escapeMarkdown(uiMode)}*\n` +
    `Quality: *${escapeMarkdown(quality)}* | Reduced Motion: *${reduced ? "ON" : "OFF"}*\n` +
    `Large Text: *${largeType ? "ON" : "OFF"}*\n` +
    `Son FPS(avg): *${fps > 0 ? fps.toFixed(1) : "-"}*\n\n` +
    `WebApp ayari: /play -> Perf dugmeleri (Auto/High/Low, Motion, Yazi)`
  );
}

function formatPerf(payload = {}) {
  const profile = payload.profile || {};
  const perf = payload.perf || {};
  const external = Array.isArray(payload.external) ? payload.external : [];
  const freeze = payload.freeze || {};
  const token = payload.token || {};
  const lines = external.length
    ? external
        .slice(0, 4)
        .map((row) => {
          const ok = row.healthy ? "OK" : "WARN";
          const code = Number(row.status_code || 0);
          const latency = Number(row.latency_ms || 0);
          return `- ${escapeMarkdown(String(row.provider || "api"))}: ${ok} (${code}/${latency}ms)`;
        })
        .join("\n")
    : "- API health verisi yok";
  return (
    `*Perf + Health*\n` +
    `Kral: *${escapeMarkdown(profile.public_name || "-")}*\n` +
    `FPS(avg): *${Number(perf.fps_avg || 0).toFixed(1)}* | Frame: *${Number(perf.frame_time_ms || 0).toFixed(2)}ms*\n` +
    `Latency(avg): *${Number(perf.latency_avg_ms || 0).toFixed(1)}ms*\n` +
    `Dropped Frame: *${Number(perf.dropped_frames || 0)}*\n` +
    `Freeze: *${freeze.freeze ? "ON" : "OFF"}*\n` +
    `Token Symbol: *${escapeMarkdown(token.symbol || "NXT")}*\n\n` +
    `Dis API Durumu\n${lines}`
  );
}

function formatAdminPanel(snapshot, isAdmin) {
  if (!isAdmin) {
    return `🔒 *Admin Panel*\nBu panel sadece admin hesaba aciktir.\nKontrol: /whoami`;
  }

  const freeze = snapshot.freeze || {};
  const token = snapshot.token || {};
  const gate = token.payoutGate || {};
  const totalUsers = Number(snapshot.totalUsers || 0);
  const activeAttempts = Number(snapshot.activeAttempts || 0);
  const payoutQ = Number(snapshot.pendingPayoutCount || 0);
  const tokenQ = Number(snapshot.pendingTokenCount || 0);
  const totalQ = payoutQ + tokenQ;
  const supply = Number(token.supply || 0);
  const marketCap = Number(token.marketCapUsd || 0);
  const spotUsd = Number(token.spotUsd || 0);

  const statusIcon = freeze.freeze ? '🔴' : totalQ > 5 ? '🟡' : '🟢';
  const statusLabel = freeze.freeze ? 'FREEZE AKTIF' : totalQ > 5 ? 'KUYRUK YOĞUN' : 'STABIL';

  const payoutLines =
    (snapshot.pendingPayouts || []).length > 0
      ? snapshot.pendingPayouts
          .slice(0, 5)
          .map((row) => `  💎 #${row.id} │ u${row.user_id} │ *${Number(row.amount || 0).toFixed(8)} BTC*`)
          .join("\n")
      : "  Bekleyen payout yok";

  const tokenLines =
    (snapshot.pendingTokenRequests || []).length > 0
      ? snapshot.pendingTokenRequests
          .slice(0, 5)
          .map(
            (row) =>
              `  🪙 #${row.id} │ u${row.user_id} │ *${Number(row.usd_amount || 0).toFixed(2)} USD* → ${Number(row.token_amount || 0).toFixed(4)} ${escapeMarkdown(
                row.token_symbol || "NXT"
              )} [${escapeMarkdown(String(row.status || "").toUpperCase())}]`
          )
          .join("\n")
      : "  Bekleyen token talebi yok";

  return (
    `╔══════════════════════════╗\n` +
    `║  🛡️ *ADMIN KONTROL MERKEZI* ║\n` +
    `╚══════════════════════════╝\n\n` +
    `${statusIcon} Durum: *${statusLabel}*\n` +
    `🆔 Admin: *${snapshot.adminTelegramId}*\n` +
    `❄️ Freeze: *${freeze.freeze ? "ON" : "OFF"}*` +
    (freeze.reason ? ` — ${escapeMarkdown(freeze.reason)}` : "") +
    `\n\n┌─── SISTEM METRIKLERI ──────┐\n` +
    `│ 👥 Kullanici: *${totalUsers.toLocaleString()}*\n` +
    `│ 🎮 Aktif Deneme: *${activeAttempts}*\n` +
    `│ 📋 Kuyruk: *${totalQ}* (💎 ${payoutQ} + 🪙 ${tokenQ})\n` +
    `│ 🪙 Supply: *${supply.toFixed(2)} ${escapeMarkdown(token.symbol || "NXT")}*\n` +
    `│ 💹 Spot: *$${spotUsd.toFixed(6)}* │ Cap: *$${marketCap.toFixed(2)}*\n` +
    `│ 🚪 Gate: *${gate.allowed ? "ACIK" : "KAPALI"}*` +
    (gate.current ? ` (${Number(gate.current).toFixed(2)}/${Number(gate.min || 0).toFixed(2)})` : "") +
    `\n└──────────────────────────┘\n\n` +
    `📋 *Bekleyen Payoutlar:*\n${payoutLines}\n\n` +
    `🪙 *Bekleyen Token Talepleri:*\n${tokenLines}\n\n` +
    `⚡ *Hizli Komutlar:*\n` +
    `/admin\\_queue │ /admin\\_payouts │ /admin\\_tokens\n` +
    `/admin\\_metrics │ /admin\\_config │ /admin\\_freeze`
  );
}

function formatAdminWhoami(telegramId, adminTelegramId) {
  const isAdmin = Number(telegramId || 0) === Number(adminTelegramId || 0);
  const nextStep = isAdmin
    ? "Durum: admin kilidi dogru."
    : "Fix: /whoami ID degerini local + Render ADMIN_TELEGRAM_ID alanina birebir yaz.";
  return (
    `*Kimlik Kontrol*\n` +
    `Telegram ID: *${Number(telegramId || 0)}*\n` +
    `Config Admin ID: *${Number(adminTelegramId || 0)}*\n` +
    `Yetki: *${isAdmin ? "ADMIN" : "USER"}*\n` +
    `${escapeMarkdown(nextStep)}`
  );
}

function formatAdminActionResult(title, details) {
  return `*${escapeMarkdown(title)}*\n${escapeMarkdown(details || "islem tamamlandi")}`;
}

function formatAdminLive(payload = {}) {
  const snapshot = payload.snapshot || {};
  const metrics = payload.metrics || {};
  const runtime = payload.runtime || {};
  const webappUrl = String(payload.webappUrl || "");
  const freeze = snapshot.freeze || {};
  const token = snapshot.token || {};
  const gate = token.payoutGate || {};
  const payoutQueue = Number(snapshot.pendingPayoutCount || 0);
  const tokenQueue = Number(snapshot.pendingTokenCount || 0);
  const totalQ = payoutQueue + tokenQueue;

  const statusIcon = freeze.freeze ? '🔴' : totalQ > 5 ? '🟡' : '🟢';
  const critical = freeze.freeze ? "FREEZE AKTIF" : totalQ > 0 ? "AKSIYON GEREKLI" : "STABIL";

  const hb = runtime.last_heartbeat_at
    ? new Date(runtime.last_heartbeat_at).toISOString().slice(11, 19)
    : "-";
  const runtimeAlive = runtime.alive ? "🟢 ON" : "🔴 OFF";
  const runtimeLock = runtime.lock_acquired ? "🔒 LOCK" : "🔓 NOLOCK";
  const release = payload.release || {};
  const flags = payload.flags || {};
  const releaseShort = String(release.gitRevision || "").slice(0, 7) || "-";
  const flagSource = String(flags.sourceMode || "env_locked");
  const flagLine = Array.isArray(flags.critical)
    ? flags.critical.map((x) => `${x.key}:${x.enabled ? "1" : "0"}`).join(" ")
    : "";

  const dau = Number(metrics.users_active_24h || 0);
  const reveals = Number(metrics.reveals_24h || 0);
  const tokenVol = Number(metrics.token_usd_volume_24h || 0);

  const nextAction = freeze.freeze
    ? "➤ /admin\\_freeze off"
    : payoutQueue > 0
      ? "➤ /admin\\_payouts"
      : tokenQueue > 0
        ? "➤ /admin\\_tokens"
        : gate.allowed
          ? "➤ /admin\\_metrics"
          : "➤ /admin\\_gate (gate kapali)";

  return (
    `╔══════════════════════════╗\n` +
    `║  📡 *ADMIN LIVE MONITOR*    ║\n` +
    `╚══════════════════════════╝\n\n` +
    `${statusIcon} *${critical}*\n` +
    `❄️ Freeze: *${freeze.freeze ? "ON" : "OFF"}*` +
    (freeze.reason ? ` — ${escapeMarkdown(freeze.reason)}` : "") +
    `\n\n┌─── KPI (24s) ─────────────────┐\n` +
    `│ 👥 DAU: *${dau.toLocaleString()}* │ Users: *${Number(snapshot.totalUsers || 0).toLocaleString()}*\n` +
    `│ 🎮 Active: *${Number(snapshot.activeAttempts || 0)}* │ 🎁 Reveals: *${reveals}*\n` +
    `│ 💹 Token Vol: *$${tokenVol.toFixed(2)}*\n` +
    `│ 📋 Queue: 💎 *${payoutQueue}* + 🪙 *${tokenQueue}* = *${totalQ}*\n` +
    `└──────────────────────────┘\n\n` +
    `┌─── TOKEN ──────────────────┐\n` +
    `│ 🪙 *${escapeMarkdown(token.symbol || "NXT")}* │ Spot *$${Number(token.spotUsd || 0).toFixed(6)}*\n` +
    `│ 💹 Cap *$${Number(token.marketCapUsd || 0).toFixed(2)}*\n` +
    `│ 🚪 Gate: *${gate.allowed ? "OPEN" : "LOCKED"}* (${Number(gate.current || 0).toFixed(2)}/${Number(gate.min || 0).toFixed(2)})\n` +
    `└──────────────────────────┘\n\n` +
    `┌─── RUNTIME ────────────────┐\n` +
    `│ ${runtimeAlive} │ ${runtimeLock}\n` +
    `│ Mode: *${escapeMarkdown(String(runtime.mode || "unknown"))}* │ HB: *${escapeMarkdown(hb)}*\n` +
    `│ Release: *${escapeMarkdown(releaseShort)}* │ Flags: *${escapeMarkdown(flagSource)}*\n` +
    (flagLine ? `│ \`${escapeMarkdown(flagLine)}\`\n` : "") +
    `└──────────────────────────┘\n\n` +
    `🧭 *Sonraki Hamle:* ${nextAction}\n` +
    (webappUrl ? `🌐 WebApp: ${escapeMarkdown(webappUrl)}\n` : "")
  );
}

module.exports = {
  formatStart,
  formatGuide,
  formatOnboard,
  formatNexusPulse,
  formatProfile,
  formatTasks,
  formatTaskStarted,
  formatTaskComplete,
  formatLootReveal,
  formatStreak,
  formatWallet,
  formatTokenWallet,
  formatTokenMintResult,
  formatTokenMintError,
  formatTokenBuyIntent,
  formatTokenBuyIntentError,
  formatTokenTxSubmitted,
  formatTokenTxError,
  formatTokenDecisionUpdate,
  formatDaily,
  formatSeason,
  formatLeaderboard,
  formatShop,
  formatPurchaseResult,
  formatMissions,
  formatMissionClaim,
  formatWar,
  formatKingdom,
  formatBossFight,
  formatChainQuest,
  formatStreakWarning,
  formatPassOffer,
  formatPayout,
  formatPayoutDecisionUpdate,
  formatFreezeMessage,
  formatOps,
  formatArenaStatus,
  formatArenaRaidResult,
  formatHelp,
  formatHelpIndex,
  formatHelpCommandCard,
  formatHelpNotFound,
  formatHelpAccessDenied,
  formatRaidContract,
  formatUiMode,
  formatPerf,
  formatAdminQueue,
  formatAdminPanel,
  formatAdminLive,
  formatAdminWhoami,
  formatAdminActionResult
};

