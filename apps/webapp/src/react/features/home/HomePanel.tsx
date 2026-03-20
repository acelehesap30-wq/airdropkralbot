import { buildHomeFeedViewModel } from "../../../core/player/homeFeedViewModel.js";
import { resolvePlayerCommandHintNavigation } from "../../../core/player/commandHintNavigation.js";
import { SHELL_ACTION_KEY } from "../../../core/navigation/shellActions.js";
import { RouteStrip } from "../shared/RouteStrip";
import { t, type Lang } from "../../i18n";
import type { BootstrapV2Data, TabKey } from "../../types";

type HomePanelProps = {
  lang: Lang;
  advanced: boolean;
  homeFeed: Record<string, unknown> | null;
  data: BootstrapV2Data | null;
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
  const copy =
    props.lang === "tr"
      ? {
          heroBody: "Oyuncu hub'i burada rapor okumaz. Seni direkt bir sonraki oynanabilir hamleye iter.",
          arenaHint: "arena acik",
          missionHint: "claim hazir",
          vaultHint: "wallet route",
          discoverHint: "yeni rota",
          nextMoveTitle: "Sonraki hamle",
          nextMoveBodyMissions: "Claim hazir gorevleri kapat, streak'i koru ve gunluk cap'i ilerlet.",
          nextMoveBodyVault: "Wallet hattini ac, payout penceresini kontrol et ve odul rotasini temizle.",
          nextMoveBodyArena: "Arena'ya don, ladder baskisini kur ve sezon puanini yukari cek.",
          nextMoveBodyDiscover: "Bot'un one cikardigi hizli rotayi calistir ve bir sonraki lane'e ziplat.",
          nextMoveLabelMissions: "Missions lane",
          nextMoveLabelVault: "Vault lane",
          nextMoveLabelArena: "Arena lane",
          nextMoveLabelDiscover: "Fast route",
          seasonChainTitle: "Season run chain",
          seasonChainBody: "Giris hub'i seni arena baskisina yollar, oradan mission claim ve sonunda vault cikisina baglar.",
          seasonChainHome: "Hub wake",
          seasonChainHomeBody: "Bugunun streak, wallet ve hizli route karari burada verilir.",
          seasonChainArena: "Arena push",
          seasonChainArenaBody: "Duel ve ladder sonucu sonraki claim baskisini belirler.",
          seasonChainMission: "Mission close",
          seasonChainMissionBody: "Hazir objective kapanir ve odul rotasi acilir.",
          seasonChainVault: "Vault exit",
          seasonChainVaultBody: "Proof, payout ve prize market sezon kosusunu tamamlar.",
          stateLive: "canli",
          stateQueued: "sirada",
          stateReady: "hazir",
          stateComplete: "tamam",
          stateLocked: "kilitli",
          signalStreak: "streak",
          signalReady: "hazir",
          signalTotal: "toplam",
          signalPasses: "pass",
          hintTitle: "Hizli rota kartlari",
          hintBody: "Bot'un onerdigi bir sonraki lane veya komut buradan acilir.",
          rhythmTitle: "Bugunun ritmi",
          rhythmBody: "Gunluk loop, wallet ve premium hattini tek bakista oku.",
          goalsTitle: "Anlik hedefler",
          goalsBody: "Simdi kapatman gereken gorevler burada.",
          supportTitle: "Odul bay",
          supportBody: "Oduller, premium etkiler ve hizli destek hareketleri burada.",
          walletLive: "wallet hazir",
          walletIdle: "wallet bekliyor",
          seasonRun: "sezon kosusu",
          readyWord: "hazir"
        }
      : {
          heroBody: "This player hub does not read like a report. It pushes you straight into the next playable move.",
          arenaHint: "arena live",
          missionHint: "claim ready",
          vaultHint: "wallet route",
          discoverHint: "new route",
          nextMoveTitle: "Next move",
          nextMoveBodyMissions: "Close claim-ready objectives, protect the streak and keep the daily cap moving.",
          nextMoveBodyVault: "Open the wallet lane, check the payout window and clear the reward route.",
          nextMoveBodyArena: "Jump back into the arena, pressure the ladder and push the season score higher.",
          nextMoveBodyDiscover: "Run the bot's fastest suggestion and pivot into the next lane.",
          nextMoveLabelMissions: "Missions lane",
          nextMoveLabelVault: "Vault lane",
          nextMoveLabelArena: "Arena lane",
          nextMoveLabelDiscover: "Fast route",
          seasonChainTitle: "Season run chain",
          seasonChainBody: "The entry hub sends you into arena pressure, then into mission claims, and finally the vault exit.",
          seasonChainHome: "Hub wake",
          seasonChainHomeBody: "Today's streak, wallet, and fast-route decision starts here.",
          seasonChainArena: "Arena push",
          seasonChainArenaBody: "Duel and ladder results define the next claim pressure.",
          seasonChainMission: "Mission close",
          seasonChainMissionBody: "A ready objective closes and opens the reward route.",
          seasonChainVault: "Vault exit",
          seasonChainVaultBody: "Proof, payout, and prize market close the season run.",
          stateLive: "live",
          stateQueued: "queued",
          stateReady: "ready",
          stateComplete: "complete",
          stateLocked: "locked",
          signalStreak: "streak",
          signalReady: "ready",
          signalTotal: "total",
          signalPasses: "passes",
          hintTitle: "Quick route cards",
          hintBody: "Launch the bot's next suggested lane or command from here.",
          rhythmTitle: "Today's rhythm",
          rhythmBody: "Read the daily loop, wallet, and premium lane at a glance.",
          goalsTitle: "Immediate targets",
          goalsBody: "The objectives you should close right now.",
          supportTitle: "Reward bay",
          supportBody: "Rewards, premium effects, and quick support moves live here.",
          walletLive: "wallet ready",
          walletIdle: "wallet waiting",
          seasonRun: "season run",
          readyWord: "ready"
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
        title:
          props.lang === "tr"
            ? `${Math.floor(summary.mission_ready)} gorev claim bekliyor`
            : `${Math.floor(summary.mission_ready)} missions are ready to claim`,
        body: nextMission?.title ? `${nextMission.title} | ${copy.nextMoveBodyMissions}` : copy.nextMoveBodyMissions,
        label: copy.nextMoveLabelMissions,
        cta: t(props.lang, "shell_panel_go_tasks"),
        onPress: openMissions
      };
    }
    if (!summary.wallet_active) {
      return {
        kicker: copy.vaultHint,
        title: props.lang === "tr" ? "Wallet hattini bagla" : "Open the wallet route",
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
          <span className="akrCurrencyChip akrCurrencySC">SC {Math.floor(summary.sc_earned || 0)}</span>
          <span className="akrCurrencyChip akrCurrencyHC">HC {Math.floor(summary.hc_earned || 0)}</span>
          <span className="akrCurrencyChip akrCurrencyRC">RC {Math.floor(summary.rc_earned || 0)}</span>
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
      </div>

      <section className="akrGameSpotlight" data-akr-panel-key="status" data-akr-focus-key="next_move">
        <div className="akrGameSpotlightMain">
          <p className="akrKicker">
            {copy.nextMoveTitle} | {nextMove.kicker}
          </p>
          <h3>{nextMove.title}</h3>
          <p>{nextMove.body}</p>
          <div className="akrChipRow">
            <span className="akrChip akrChipInfo">{nextMove.label}</span>
            <span className="akrChip">
              {Math.floor(summary.mission_ready)}/{Math.floor(summary.mission_total)} {copy.readyWord}
            </span>
            <span className="akrChip">{summary.wallet_active ? copy.walletLive : copy.walletIdle}</span>
          </div>
          <div className="akrActionRow">
            <button type="button" className="akrBtn akrBtnAccent" onClick={nextMove.onPress}>
              {nextMove.cta}
            </button>
            <button type="button" className="akrBtn akrBtnGhost" onClick={openArena}>
              {t(props.lang, "shell_panel_go_pvp")}
            </button>
          </div>
        </div>
        <div className="akrGameSpotlightAside">
          <h4>{copy.hintTitle}</h4>
          <p className="akrMuted akrMiniPanelBody">{copy.hintBody}</p>
          <div className="akrQuickHintGrid">
            {quickHints.length ? (
              quickHints.map((row) => (
                <button
                  type="button"
                  key={String(row.key || row.description || "hint")}
                  className="akrQuickHintCard"
                  onClick={() => runCommandHint(row)}
                >
                  <span className="akrKicker">{String(row.key || "route").replace(/^\/+/, "")}</span>
                  <strong>{String(row.description || row.key || t(props.lang, "home_action_discover_title"))}</strong>
                </button>
              ))
            ) : (
              <div className="akrQuickHintCard isEmpty">
                <span className="akrKicker">{copy.discoverHint}</span>
                <strong>{t(props.lang, "home_action_discover_body")}</strong>
              </div>
            )}
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
