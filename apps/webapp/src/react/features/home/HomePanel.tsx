import { useState } from "react";
import { buildHomeFeedViewModel } from "../../../core/player/homeFeedViewModel.js";
import { resolvePlayerCommandHintNavigation } from "../../../core/player/commandHintNavigation.js";
import { SHELL_ACTION_KEY } from "../../../core/navigation/shellActions.js";
import { RouteStrip } from "../shared/RouteStrip";
import { MiniGames } from "./MiniGames";
import { InviteWidget } from "./InviteWidget";
import { DailyCheckin } from "./DailyCheckin";
import { t, type Lang } from "../../i18n";
import type { BootstrapV2Data, WebAppAuth, TabKey } from "../../types";

type HomePanelProps = {
  lang: Lang;
  advanced: boolean;
  homeFeed: Record<string, unknown> | null;
  data: BootstrapV2Data | null;
  auth?: WebAppAuth | null;
  onRefresh: () => void;
  onShellAction: (actionKey: string, sourcePanelKey?: string) => void;
  onRouteTarget: (input: {
    routeKey?: string;
    panelKey?: string;
    focusKey?: string;
    tab?: TabKey | string;
    sourcePanelKey?: string;
  }) => void;
};

export function HomePanel(props: HomePanelProps) {
  const [subView, setSubView] = useState<"play" | "overview" | "detail">("play");
  const view = buildHomeFeedViewModel({
    homeFeed: props.homeFeed,
    bootstrap: props.data
  });
  const summary = view.summary;
  const prefs =
    (props.data?.ui_prefs as {
      reduced_motion?: boolean;
      large_text?: boolean;
      sound_enabled?: boolean;
    } | null) || { reduced_motion: false, large_text: false, sound_enabled: true };
  const copy = {
    heroBody: t(props.lang, "home_hero_body"),
    arenaHint: t(props.lang, "home_arena_hint"),
    missionHint: t(props.lang, "home_mission_hint"),
    vaultHint: t(props.lang, "home_vault_hint"),
    discoverHint: t(props.lang, "home_discover_hint"),
    nextMoveTitle: t(props.lang, "home_next_move_title"),
    nextMoveBodyMissions: t(props.lang, "home_next_move_body_missions"),
    nextMoveBodyVault: t(props.lang, "home_next_move_body_vault"),
    nextMoveBodyArena: t(props.lang, "home_next_move_body_arena"),
    nextMoveBodyDiscover: t(props.lang, "home_next_move_body_discover"),
    nextMoveLabelMissions: t(props.lang, "home_next_move_label_missions"),
    nextMoveLabelVault: t(props.lang, "home_next_move_label_vault"),
    nextMoveLabelArena: t(props.lang, "home_next_move_label_arena"),
    nextMoveLabelDiscover: t(props.lang, "home_next_move_label_discover"),
    seasonChainTitle: t(props.lang, "home_season_chain_title"),
    seasonChainBody: t(props.lang, "home_season_chain_body"),
    seasonChainHome: t(props.lang, "home_chain_home"),
    seasonChainHomeBody: t(props.lang, "home_chain_home_body"),
    seasonChainArena: t(props.lang, "home_chain_arena"),
    seasonChainArenaBody: t(props.lang, "home_chain_arena_body"),
    seasonChainMission: t(props.lang, "home_chain_mission"),
    seasonChainMissionBody: t(props.lang, "home_chain_mission_body"),
    seasonChainVault: t(props.lang, "home_chain_vault"),
    seasonChainVaultBody: t(props.lang, "home_chain_vault_body"),
    stateLive: t(props.lang, "home_state_live"),
    stateQueued: t(props.lang, "home_state_queued"),
    stateReady: t(props.lang, "home_state_ready"),
    stateComplete: t(props.lang, "home_state_complete"),
    stateLocked: t(props.lang, "home_state_locked"),
    signalStreak: t(props.lang, "home_signal_streak"),
    signalReady: t(props.lang, "home_signal_ready"),
    signalTotal: t(props.lang, "home_signal_total"),
    signalPasses: t(props.lang, "home_signal_passes"),
    hintTitle: t(props.lang, "home_hint_title"),
    hintBody: t(props.lang, "home_hint_body"),
    rhythmTitle: t(props.lang, "home_rhythm_title"),
    rhythmBody: t(props.lang, "home_rhythm_body"),
    goalsTitle: t(props.lang, "home_goals_title"),
    goalsBody: t(props.lang, "home_goals_body"),
    supportTitle: t(props.lang, "home_support_title"),
    supportBody: t(props.lang, "home_support_body"),
    walletLive: t(props.lang, "home_wallet_live"),
    walletIdle: t(props.lang, "home_wallet_idle"),
    seasonRun: t(props.lang, "home_season_run"),
    readyWord: t(props.lang, "home_ready_word"),
  };

  const resolveSurfaceActionKey = (sectionKey: string, slotKey: string, fallbackActionKey: string) => {
    const rows = Array.isArray((view.surface_actions as Record<string, Array<Record<string, unknown>>> | undefined)?.[sectionKey])
      ? ((view.surface_actions as Record<string, Array<Record<string, unknown>>>)[sectionKey] || [])
      : [];
    const match = rows.find((row) => String(row.slot_key || "").trim().toLowerCase() === String(slotKey || "").trim().toLowerCase());
    return String(match?.action_key || fallbackActionKey || "");
  };
  const runSurfaceAction = (sectionKey: string, slotKey: string, fallbackActionKey: string) => {
    const actionKey = resolveSurfaceActionKey(sectionKey, slotKey, fallbackActionKey);
    if (!actionKey) {
      return;
    }
    props.onShellAction(actionKey, "panel_home");
  };
  const runCommandHint = (row: Record<string, unknown>) => {
    const target = resolvePlayerCommandHintNavigation(row);
    if (!target) {
      return;
    }
    if (target.kind === "action") {
      props.onShellAction(target.action_key, "panel_home");
      return;
    }
    props.onRouteTarget({
      routeKey: target.route_key,
      panelKey: target.panel_key,
      focusKey: target.focus_key,
      tab: target.tab,
      sourcePanelKey: "panel_home"
    });
  };

  const openArena = () =>
    props.onRouteTarget({
      routeKey: "pvp",
      tab: "pvp",
      sourcePanelKey: "panel_home"
    });
  const openMissions = () =>
    props.onRouteTarget({
      routeKey: "missions",
      tab: "tasks",
      sourcePanelKey: "panel_home"
    });
  const openVault = () =>
    props.onRouteTarget({
      routeKey: "vault",
      tab: "vault",
      sourcePanelKey: "panel_home"
    });
  const openDiscover = () => runSurfaceAction("home_discover", "discover", SHELL_ACTION_KEY.PLAYER_DISCOVER_CENTER);
  const walletStateKey = summary.wallet_active ? "home_wallet_live" : "home_wallet_dormant";
  const premiumStateKey = summary.premium_active ? "home_premium_live" : "home_premium_standard";
  const nextMission = view.mission_preview.find((row) => !row.claimed && row.completed) || view.mission_preview.find((row) => !row.claimed) || null;
  const quickHints = view.command_hints.slice(0, 3);
  const nextMove = (() => {
    if (summary.mission_ready > 0) {
      return {
        kicker: copy.missionHint,
        title: `${Math.floor(summary.mission_ready)} ${t(props.lang, "home_missions_ready_msg")}`,
        body: nextMission?.title ? `${nextMission.title} | ${copy.nextMoveBodyMissions}` : copy.nextMoveBodyMissions,
        label: copy.nextMoveLabelMissions,
        cta: t(props.lang, "shell_panel_go_tasks"),
        onPress: openMissions
      };
    }
    if (!summary.wallet_active) {
      return {
        kicker: copy.vaultHint,
        title: t(props.lang, "home_wallet_open_msg"),
        body: copy.nextMoveBodyVault,
        label: copy.nextMoveLabelVault,
        cta: t(props.lang, "shell_panel_go_vault"),
        onPress: openVault
      };
    }
    if (quickHints.length) {
      const primaryHint = quickHints[0];
      return {
        kicker: copy.discoverHint,
        title: String(primaryHint.description || primaryHint.key || t(props.lang, "home_action_discover_title")),
        body: copy.nextMoveBodyDiscover,
        label: copy.nextMoveLabelDiscover,
        cta: t(props.lang, "home_action_discover_title"),
        onPress: () => runCommandHint(primaryHint)
      };
    }
    return {
      kicker: copy.arenaHint,
      title: t(props.lang, "home_action_arena_title"),
      body: copy.nextMoveBodyArena,
      label: copy.nextMoveLabelArena,
      cta: t(props.lang, "shell_panel_go_pvp"),
      onPress: openArena
    };
  })();
  const seasonRouteFocus = summary.mission_ready > 0 ? "mission" : !summary.wallet_active ? "vault" : quickHints.length ? "home" : "arena";
  const seasonRouteBadge = (step: "home" | "arena" | "mission" | "vault") => {
    if (step === "home") {
      return seasonRouteFocus === "home" ? copy.stateLive : copy.stateComplete;
    }
    if (step === "arena") {
      return seasonRouteFocus === "arena" ? copy.stateLive : seasonRouteFocus === "mission" || seasonRouteFocus === "vault" ? copy.stateComplete : copy.stateQueued;
    }
    if (step === "mission") {
      return seasonRouteFocus === "mission" ? copy.stateReady : seasonRouteFocus === "vault" ? copy.stateComplete : copy.stateQueued;
    }
    return seasonRouteFocus === "vault" ? (summary.wallet_active ? copy.stateReady : copy.stateLive) : copy.stateLocked;
  };
  const seasonRouteClassName = (step: "home" | "arena" | "mission" | "vault") => {
    if (step === seasonRouteFocus) {
      return "akrRouteStep isActive";
    }
    if (
      step === "home" ||
      (step === "arena" && (seasonRouteFocus === "mission" || seasonRouteFocus === "vault")) ||
      (step === "mission" && seasonRouteFocus === "vault")
    ) {
      return "akrRouteStep isDone";
    }
    return "akrRouteStep";
  };
  const seasonRouteTone = (step: "home" | "arena" | "mission" | "vault"): "active" | "done" | "idle" => {
    const className = seasonRouteClassName(step);
    if (className.includes("isActive")) {
      return "active";
    }
    if (className.includes("isDone")) {
      return "done";
    }
    return "idle";
  };

  return (
    <section className="akrCard akrCardWide akrGameHub" data-akr-panel-key="profile" data-akr-focus-key="identity">
      <div className="akrGameHero">
        <div className="akrGameHeroCopy">
          <p className="akrKicker">{t(props.lang, "home_hub_kicker")}</p>
          <h2>{t(props.lang, "home_hub_title")}</h2>
          <p>{copy.heroBody}</p>
        </div>
        <div className="akrGameHeroStats">
          <span className="akrChip">{summary.player_name || t(props.lang, "unknown_player")}</span>
          <span className="akrChip akrChipInfo">
            {t(props.lang, "home_stat_tier")} {Math.floor(summary.kingdom_tier)}
          </span>
          <span className={`akrChip ${summary.streak > 0 ? "akrChipDanger akrStreakFlame" : ""}`}>
            {t(props.lang, "home_stat_streak")} {Math.floor(summary.streak)}
          </span>
          <span className="akrChip">
            {t(props.lang, "home_stat_season")} #{Math.floor(summary.season_id)} / {Math.floor(summary.season_days_left)}d
          </span>
          <span className="akrChip">
            {Math.floor(summary.season_points)} {copy.seasonRun}
          </span>
        </div>
        <div className="akrCurrencyHud">
          <span className="akrCurrencyChip" style={{ background: "rgba(16,255,145,0.12)", color: "#10ff91", fontWeight: 700, fontSize: 12 }}>
            NXT {Number(summary.nxt_balance || 0).toLocaleString("en", { maximumFractionDigits: 2 })}
          </span>
          <span className="akrCurrencyChip akrCurrencySC">SC {Math.floor(summary.sc_earned || 0)}</span>
          <span className="akrCurrencyChip akrCurrencyHC">HC {Math.floor(summary.hc_earned || 0)}</span>
          <span className="akrCurrencyChip" style={{ background: "rgba(0,210,255,0.08)", color: "#00d2ff", fontSize: 9 }}>LIVE</span>
        </div>
        {/* NXT Token Live Ticker */}
        <div style={{ display: "flex", gap: 6, padding: "6px 0", overflow: "auto", scrollbarWidth: "none" }}>
          <span style={{ padding: "3px 8px", borderRadius: 6, background: "rgba(16,255,145,0.08)", border: "1px solid rgba(16,255,145,0.15)", color: "#10ff91", fontSize: 10, fontWeight: 700, whiteSpace: "nowrap", letterSpacing: 0.5 }}>
            NXT {summary.token_price_usd > 0 ? `$${summary.token_price_usd.toFixed(4)}` : "PRE-LAUNCH"}
          </span>
          <span style={{ padding: "3px 8px", borderRadius: 6, background: "rgba(0,214,255,0.06)", color: "rgba(0,214,255,0.7)", fontSize: 10, whiteSpace: "nowrap" }}>
            TON {props.lang === "tr" ? "Ağı" : "Network"}
          </span>
          <span style={{ padding: "3px 8px", borderRadius: 6, background: "rgba(255,215,0,0.06)", color: "rgba(255,215,0,0.7)", fontSize: 10, whiteSpace: "nowrap" }}>
            {summary.token_balance > 0 ? `${Math.floor(summary.token_balance)} NXT` : props.lang === "tr" ? "0 NXT bakiye" : "0 NXT balance"}
          </span>
          {summary.wallet_active && (
            <span style={{ padding: "3px 8px", borderRadius: 6, background: "rgba(0,255,136,0.08)", color: "#00ff88", fontSize: 10, whiteSpace: "nowrap" }}>
              {props.lang === "tr" ? "Cüzdan Aktif" : "Wallet Active"}
            </span>
          )}
        </div>
        <div className="akrDailyProgress">
          <span className="akrDailyLabel">
            {Math.floor(summary.tasks_done)}/{Math.floor(summary.daily_cap)}
          </span>
          <div className="akrDailyBar">
            <div
              className="akrDailyBarFill"
              style={{ width: `${Math.min(100, Math.round((summary.tasks_done / Math.max(1, summary.daily_cap)) * 100))}%` }}
            />
          </div>
        </div>
        {/* Achievement badges */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
          {summary.streak >= 7 && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 8, fontSize: 10, fontWeight: 700, background: "rgba(255,215,0,0.12)", color: "#ffd700", border: "1px solid rgba(255,215,0,0.2)" }}>
              {summary.streak >= 30 ? "LEGEND" : summary.streak >= 14 ? "VETERAN" : "DEDICATED"} {Math.floor(summary.streak)}d
            </span>
          )}
          {summary.kingdom_tier >= 2 && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 8, fontSize: 10, fontWeight: 700, background: "rgba(224,64,251,0.12)", color: "#e040fb", border: "1px solid rgba(224,64,251,0.2)" }}>
              T{Math.floor(summary.kingdom_tier)} RANK
            </span>
          )}
          {(summary.sc_earned || 0) >= 10000 && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 8, fontSize: 10, fontWeight: 700, background: "rgba(0,255,136,0.12)", color: "#00ff88", border: "1px solid rgba(0,255,136,0.2)" }}>
              SC WHALE
            </span>
          )}
          {summary.wallet_active && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 8, fontSize: 10, fontWeight: 700, background: "rgba(0,214,255,0.12)", color: "#00d6ff", border: "1px solid rgba(0,214,255,0.2)" }}>
              VERIFIED
            </span>
          )}
          {summary.tasks_done >= summary.daily_cap && summary.daily_cap > 0 && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 8, fontSize: 10, fontWeight: 700, background: "rgba(255,60,80,0.12)", color: "#ff3c50", border: "1px solid rgba(255,60,80,0.2)" }}>
              CAP FULL
            </span>
          )}
        </div>
      </div>

      {/* ── Sub-navigation ── */}
      <div style={{ display: "flex", gap: 4, padding: "8px 12px", background: "rgba(0,0,0,0.25)", borderBottom: "1px solid rgba(255,255,255,0.04)", marginBottom: 8 }}>
        {([
          { key: "play" as const, icon: "🎮", l: t(props.lang, "sub_nav_games") },
          { key: "overview" as const, icon: "⚡", l: t(props.lang, "sub_nav_actions") },
          { key: "detail" as const, icon: "📊", l: t(props.lang, "sub_nav_detail") },
        ]).map(tab => (
          <button key={tab.key} onClick={() => setSubView(tab.key)} style={{
            flex: 1, padding: "8px 4px", borderRadius: 8, border: "none",
            background: subView === tab.key ? "rgba(0,214,255,0.12)" : "transparent",
            color: subView === tab.key ? "#00d6ff" : "rgba(255,255,255,0.35)",
            fontSize: 11, fontWeight: 600, cursor: "pointer",
            borderBottom: subView === tab.key ? "2px solid rgba(0,214,255,0.5)" : "2px solid transparent",
          }}>
            {tab.icon} {tab.l}
          </button>
        ))}
      </div>

      {subView === "play" && (
        <>
          <MiniGames lang={props.lang} auth={props.auth} sc={Math.floor(summary.sc_earned || 0)} />
          <div style={{ marginTop: 8 }}><DailyCheckin lang={props.lang} auth={props.auth} /></div>
          <div style={{ marginTop: 8 }}><InviteWidget lang={props.lang} auth={props.auth} /></div>
        </>
      )}

      {subView === "overview" && (<>
      <section className="t21-glass-panel t21-animate-fade-in" style={{ marginBottom: 24, textAlign: "center" }}>
        <div className="t21-card-decoration"></div>
        <div style={{ position: "relative", zIndex: 1 }}>
          <h2 className="t21-gradient-text" style={{ fontSize: "2rem", margin: "0 0 8px 0" }}>
            AirdropKralBot'a Hoş Geldin
          </h2>
          <p style={{ color: "var(--21st-text-muted)", fontSize: "1.1rem", marginBottom: 24 }}>
            Cüzdanını bağla, görevleri tamamla ve NXT tokenlarını anında kazan.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
            {summary.wallet_active ? (
              <button type="button" className="t21-button-primary t21-wallet-connect" onClick={openVault}>
                <span className="t21-icon-container" style={{ width: 32, height: 32 }}>💳</span>
                Cüzdan Yönetimi & NXT İşlemleri
              </button>
            ) : (
              <button type="button" className="t21-button-primary" onClick={openVault}>
                <span className="t21-icon-container" style={{ width: 32, height: 32, background: "rgba(255,255,255,0.1)" }}>🔗</span>
                Cüzdanını Bağla
              </button>
            )}
            <button type="button" className="t21-button-primary t21-wallet-connect" style={{ background: "rgba(255,255,255,0.05)" }} onClick={props.onRefresh}>
              <span className="t21-icon-container" style={{ width: 32, height: 32 }}>🔄</span>
              Bakiyeyi Yenile
            </button>
          </div>
        </div>
      </section>

      <section className="akrGameSpotlight" data-akr-panel-key="status" data-akr-focus-key="next_move">
        <div className="t21-glass-panel" style={{ display: "flex", flexWrap: "wrap", gap: 24, padding: "24px 32px" }}>
          <div style={{ flex: "1 1 300px" }}>
            <p className="akrKicker" style={{ color: "var(--21st-accent)" }}>
              {copy.nextMoveTitle} | {nextMove.kicker}
            </p>
            <h3 style={{ margin: "8px 0", fontSize: "1.4rem" }}>{nextMove.title}</h3>
            <p style={{ color: "var(--21st-text-muted)" }}>{nextMove.body}</p>
            <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
              <button type="button" className="t21-button-primary" onClick={nextMove.onPress}>
                {nextMove.cta}
              </button>
              <button type="button" className="t21-button-primary t21-wallet-connect" onClick={openArena}>
                {t(props.lang, "shell_panel_go_pvp")}
              </button>
            </div>
          </div>
          
          <div style={{ flex: "1 1 200px", paddingLeft: 24, borderLeft: "1px solid var(--21st-glass-border)" }}>
            <h4 style={{ margin: "0 0 12px 0" }}>{copy.hintTitle}</h4>
            <div style={{ display: "grid", gap: 8 }}>
              {quickHints.length ? (
                quickHints.map((row) => (
                  <button
                    type="button"
                    key={String(row.key || row.description || "hint")}
                    className="akrQuickHintCard"
                    onClick={() => runCommandHint(row)}
                    style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12, padding: "12px 16px", textAlign: "left", cursor: "pointer" }}
                  >
                    <span className="akrKicker" style={{ color: "var(--21st-accent)", fontSize: "0.7rem", display: "block" }}>{String(row.key || "route").replace(/^\/+/, "")}</span>
                    <strong style={{ color: "#fff" }}>{String(row.description || row.key || t(props.lang, "home_action_discover_title"))}</strong>
                  </button>
                ))
              ) : (
                <div style={{ opacity: 0.5, fontSize: "0.85rem" }}>
                  <strong>{t(props.lang, "home_action_discover_body")}</strong>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <RouteStrip
        panelKey="status"
        focusKey="season_chain"
        title={copy.seasonChainTitle}
        body={copy.seasonChainBody}
        steps={[
          {
            kicker: copy.seasonChainHome,
            title: t(props.lang, "home_hub_title"),
            body: copy.seasonChainHomeBody,
            stateLabel: seasonRouteBadge("home"),
            signals: [`${Math.floor(summary.streak)} ${copy.signalStreak}`, `${Math.floor(summary.tasks_done)}/${Math.floor(summary.daily_cap)}`],
            tone: seasonRouteTone("home"),
            onClick: props.onRefresh
          },
          {
            kicker: copy.seasonChainArena,
            title: t(props.lang, "shell_panel_go_pvp"),
            body: copy.seasonChainArenaBody,
            stateLabel: seasonRouteBadge("arena"),
            signals: [`${Math.floor(summary.season_points)} pts`, `T${Math.floor(summary.kingdom_tier)}`],
            tone: seasonRouteTone("arena"),
            onClick: openArena
          },
          {
            kicker: copy.seasonChainMission,
            title: t(props.lang, "shell_panel_go_tasks"),
            body: copy.seasonChainMissionBody,
            stateLabel: seasonRouteBadge("mission"),
            signals: [`${Math.floor(summary.mission_ready)} ${copy.signalReady}`, `${Math.floor(summary.mission_total)} ${copy.signalTotal}`],
            tone: seasonRouteTone("mission"),
            onClick: openMissions
          },
          {
            kicker: copy.seasonChainVault,
            title: t(props.lang, "shell_panel_go_vault"),
            body: copy.seasonChainVaultBody,
            stateLabel: seasonRouteBadge("vault"),
            signals: [summary.wallet_active ? copy.walletLive : copy.walletIdle, `${Math.floor(summary.active_pass_count)} ${copy.signalPasses}`],
            tone: seasonRouteTone("vault"),
            onClick: openVault
          }
        ]}
      />

      <div className="akrGameActionGrid">
        <button type="button" className="akrActionFeatureCard isPrimary" onClick={openArena}>
          <p className="akrKicker">{copy.arenaHint}</p>
          <h3>{t(props.lang, "home_action_arena_title")}</h3>
          <p>{t(props.lang, "home_action_arena_body")}</p>
          <span className="akrChip">
            {Math.floor(summary.season_points)} {t(props.lang, "home_action_points")}
          </span>
        </button>
        <button type="button" className="akrActionFeatureCard" onClick={openMissions}>
          <p className="akrKicker">{copy.missionHint}</p>
          <h3>{t(props.lang, "home_action_missions_title")}</h3>
          <p>{t(props.lang, "home_action_missions_body")}</p>
          <span className="akrChip">
            {Math.floor(summary.mission_ready)}/{Math.floor(summary.mission_total)} {copy.readyWord}
          </span>
        </button>
        <button type="button" className="akrActionFeatureCard" onClick={openVault}>
          <p className="akrKicker">{copy.vaultHint}</p>
          <h3>{t(props.lang, "home_action_vault_title")}</h3>
          <p>{t(props.lang, "home_action_vault_body")}</p>
          <span className="akrChip">{summary.wallet_active ? copy.walletLive : copy.walletIdle}</span>
        </button>
        <button type="button" className="akrActionFeatureCard" onClick={openDiscover}>
          <p className="akrKicker">{copy.discoverHint}</p>
          <h3>{t(props.lang, "home_action_discover_title")}</h3>
          <p>{t(props.lang, "home_action_discover_body")}</p>
          <span className="akrChip">{t(props.lang, "home_action_discover_chip")}</span>
        </button>
      </div>

      <div className="akrStatRail">
        <div className="akrMetricCard">
          <span>{copy.rhythmTitle}</span>
          <strong>
            {Math.floor(summary.tasks_done)}/{Math.floor(summary.daily_cap)}
          </strong>
        </div>
        <div className="akrMetricCard">
          <span>{t(props.lang, "home_metric_wallet")}</span>
          <strong>{summary.wallet_chain || (summary.wallet_active ? copy.walletLive : copy.walletIdle)}</strong>
        </div>
        <div className="akrMetricCard">
          <span>{t(props.lang, "home_metric_premium")}</span>
          <strong>{summary.premium_active ? "premium" : "standard"}</strong>
        </div>
        <div className="akrMetricCard">
          <span>{t(props.lang, "home_metric_passes")}</span>
          <strong>{Math.floor(summary.active_pass_count)}</strong>
        </div>
      </div>

      </>)}

      {subView === "detail" && (<>
      <div className="akrGameFocusGrid">
        <section className="akrMiniPanel" data-akr-panel-key="status" data-akr-focus-key="mission_status">
          <h4>{copy.goalsTitle}</h4>
          <p className="akrMuted akrMiniPanelBody">{copy.goalsBody}</p>
          {view.mission_preview.length ? (
            <ul className="akrList">
              {view.mission_preview.slice(0, 3).map((row) => (
                <li key={row.mission_key || row.title}>
                  <strong>{row.title || row.mission_key}</strong>
                  <span>
                    {row.claimed ? t(props.lang, "home_task_claimed") : row.completed ? t(props.lang, "home_task_ready") : t(props.lang, "home_task_open")}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="akrMuted">{t(props.lang, "home_mission_empty")}</p>
          )}
          <div className="akrActionRow">
            <button type="button" className="akrBtn akrBtnGhost" onClick={() => runSurfaceAction("home_mission", "tasks", SHELL_ACTION_KEY.PLAYER_TASKS_BOARD)}>
              {t(props.lang, "shell_panel_go_tasks")}
            </button>
          </div>
        </section>

        <section className="akrMiniPanel" data-akr-panel-key="status" data-akr-focus-key="system_status">
          <h4>{copy.rhythmTitle}</h4>
          <p className="akrMuted akrMiniPanelBody">{copy.rhythmBody}</p>
          <div className="akrChipRow">
            <span className="akrChip">{summary.wallet_active ? copy.walletLive : copy.walletIdle}</span>
            <span className="akrChip">{summary.wallet_chain || "-"}</span>
            <span className="akrChip">{summary.wallet_kyc_status || t(props.lang, "status_unknown")}</span>
          </div>
          <p className="akrMuted">{summary.wallet_address_masked || "-"}</p>
          <div className="akrActionRow">
            <button type="button" className="akrBtn akrBtnGhost" onClick={() => runSurfaceAction("home_wallet", "wallet", SHELL_ACTION_KEY.PLAYER_WALLET_CONNECT)}>
              {t(props.lang, "shell_panel_go_wallet")}
            </button>
            <button type="button" className="akrBtn akrBtnGhost" onClick={() => runSurfaceAction("home_wallet", "payout", SHELL_ACTION_KEY.PLAYER_PAYOUT_REQUEST)}>
              {t(props.lang, "shell_panel_go_payout")}
            </button>
          </div>
        </section>

        <section className="akrMiniPanel" data-akr-panel-key="rewards" data-akr-focus-key="premium_status">
          <h4>{copy.supportTitle}</h4>
          <p className="akrMuted akrMiniPanelBody">{copy.supportBody}</p>
          <div className="akrChipRow">
            <span className="akrChip">{t(props.lang, premiumStateKey as any)}</span>
            <span className="akrChip">
              {Math.floor(summary.active_pass_count)} {t(props.lang, "home_metric_passes")}
            </span>
            <span className="akrChip">
              {Math.floor(summary.sc_earned)} SC / {Math.floor(summary.hc_earned)} HC
            </span>
          </div>
          <div className="akrActionRow">
            <button type="button" className="akrBtn akrBtnGhost" onClick={() => runSurfaceAction("home_rewards", "rewards", SHELL_ACTION_KEY.PLAYER_REWARDS_PANEL)}>
              {t(props.lang, "home_rewards_cta")}
            </button>
          </div>
        </section>
      </div>

      </>)}

      <div className="akrActionRow akrHomeFooterActions">
        <button type="button" className="akrBtn akrBtnGhost" onClick={props.onRefresh}>
          {t(props.lang, "home_feed_refresh")}
        </button>
        <button type="button" className="akrBtn akrBtnGhost" onClick={() => runSurfaceAction("home_settings", "settings", SHELL_ACTION_KEY.PLAYER_SETTINGS_LOCALE)}>
          {t(props.lang, "shell_panel_open_settings")}
        </button>
        <button type="button" className="akrBtn akrBtnGhost" onClick={() => runSurfaceAction("home_support", "support", SHELL_ACTION_KEY.PLAYER_SUPPORT_FAQ)}>
          {t(props.lang, "shell_panel_open_support")}
        </button>
        <span className="akrChip">{String(props.lang).toUpperCase()}</span>
        <span className="akrChip">{prefs.sound_enabled === false ? t(props.lang, "home_sound_off") : t(props.lang, "home_sound_on")}</span>
      </div>

      {props.advanced ? <pre className="akrJsonBlock">{JSON.stringify(props.homeFeed || props.data || {}, null, 2)}</pre> : null}
    </section>
  );
}
