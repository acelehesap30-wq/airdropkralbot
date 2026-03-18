import { t, type Lang } from "../../i18n";
import { buildPvpLiveViewModel } from "../../../core/player/pvpLiveViewModel.js";
import { SHELL_ACTION_KEY } from "../../../core/navigation/shellActions.js";
import { RouteStrip } from "../shared/RouteStrip";

type PvpPanelProps = {
  lang: Lang;
  advanced: boolean;
  pvpRuntime: Record<string, unknown> | null;
  leagueOverview: Record<string, unknown> | null;
  liveLeaderboard: Record<string, unknown> | null;
  liveDiagnostics: Record<string, unknown> | null;
  liveTick: Record<string, unknown> | null;
  canStart: boolean;
  canRefreshState: boolean;
  canStrike: boolean;
  canResolve: boolean;
  onStart: () => void;
  onRefreshState: () => void;
  onRefreshLeague: () => void;
  onRefreshLive: () => void;
  onStrike: () => void;
  onResolve: () => void;
  onShellAction: (actionKey: string, sourcePanelKey?: string) => void;
};

export function PvpPanel(props: PvpPanelProps) {
  const view = buildPvpLiveViewModel({
    pvpRuntime: props.pvpRuntime,
    leagueOverview: props.leagueOverview,
    liveLeaderboard: props.liveLeaderboard,
    liveDiagnostics: props.liveDiagnostics,
    liveTick: props.liveTick
  });
  const summary = view.summary;
  const league = view.league;
  const copy =
    props.lang === "tr"
      ? {
          heroBody: "Arena burada rapor okumaz; gunluk duel, ladder ve boss penceresini tek savas tahtasinda toplar.",
          routeTitle: "Sonraki combat rotasi",
          routeStartBody: "Yeni clash baslat, sonra gorev ve odul zincirini ac.",
          routeStrikeBody: "Tempo sende; strike ile baskiyi buyut ve sonra claim hattina gec.",
          routeResolveBody: "Bu carpismayi kapat, rating'i topla ve odul cikisini ac.",
          routeBoardBody: "Canli leaderboard ve ladder takibi sonraki savas rotasini belirler.",
          routeLabelStart: "clash start",
          routeLabelStrike: "tempo strike",
          routeLabelResolve: "resolve finish",
          routeLabelBoard: "board chase",
          chainTitle: "Arena -> mission -> vault",
          chainBody: "Combat sonucu claim baskisina, oradan reward ve payout cikisina akar.",
          chainArena: "Combat tempo",
          chainArenaBody: "Clash'i baslat, strike ile baskiyi kur veya resolve ile rating'i kilitle.",
          chainMission: "Mission pressure",
          chainMissionBody: "Arena kapandiginda gorev claim hattina gecilir ve streak korunur.",
          chainVault: "Reward exit",
          chainVaultBody: "Claim kapaninca payout ve prize market koridoru acilir.",
          stateLive: "canli",
          stateQueued: "sirada",
          stateReady: "hazir",
          stateLocked: "kilitli",
          signalAccept: "accept",
          signalWin: "win",
          routeSideTitle: "Bagli koridorlar",
          routeSideBody: "Arena kapaninca gorev ve vault cebe giden cikislar burada.",
          missionsExit: "Mission quarter",
          vaultExit: "Vault route",
          leaderboardExit: "Top board",
          clashTitle: "Canli karsilasma",
          clashBody: "Acilacak ya da devam edecek savas hattin.",
          duelTitle: "Gunluk duel",
          duelBody: "Bugunun ritmini kuran hizli cekisme.",
          ladderTitle: "Haftalik ladder",
          ladderBody: "Promotion zone'a yaklasan kosu.",
          bossTitle: "Arc boss",
          bossBody: "Sezonun toplu baski penceresi.",
          leaderboardTitle: "Ust sira",
          leaderboardBody: "En yakindaki rakipler.",
          clashHistoryTitle: "Son carpismalar",
          clashHistoryBody: "Son rating kaymalari ve sonuc izi.",
          liveWord: "canli",
          queueWord: "sirada"
        }
      : {
          heroBody: "The arena is not a report. It keeps the daily duel, ladder, and boss window on one combat board.",
          routeTitle: "Next combat route",
          routeStartBody: "Start the next clash, then roll the mission and reward chain forward.",
          routeStrikeBody: "You hold tempo; strike now and push into the claim route after the hit.",
          routeResolveBody: "Close this clash, bank the rating swing, and open the reward exit.",
          routeBoardBody: "The live leaderboard and ladder chase define the next fight route.",
          routeLabelStart: "clash start",
          routeLabelStrike: "tempo strike",
          routeLabelResolve: "resolve finish",
          routeLabelBoard: "board chase",
          chainTitle: "Arena -> mission -> vault",
          chainBody: "Combat results spill into claim pressure, then into rewards and payout exits.",
          chainArena: "Combat tempo",
          chainArenaBody: "Start the clash, strike to build pressure, or resolve to lock the rating swing.",
          chainMission: "Mission pressure",
          chainMissionBody: "When the arena closes, the mission claim lane carries the streak forward.",
          chainVault: "Reward exit",
          chainVaultBody: "Once the claim closes, payout and prize-market corridors open.",
          stateLive: "live",
          stateQueued: "queued",
          stateReady: "ready",
          stateLocked: "locked",
          signalAccept: "accept",
          signalWin: "win",
          routeSideTitle: "Linked corridors",
          routeSideBody: "Mission and vault exits that become useful after the arena close.",
          missionsExit: "Mission quarter",
          vaultExit: "Vault route",
          leaderboardExit: "Top board",
          clashTitle: "Live clash",
          clashBody: "Your next or current fight lane.",
          duelTitle: "Daily duel",
          duelBody: "Fast pressure fight that sets today's rhythm.",
          ladderTitle: "Weekly ladder",
          ladderBody: "Promotion-zone climb.",
          bossTitle: "Arc boss",
          bossBody: "Season pressure window for the whole run.",
          leaderboardTitle: "Top board",
          leaderboardBody: "Closest rivals worth chasing.",
          clashHistoryTitle: "Recent clashes",
          clashHistoryBody: "Recent rating swings and outcomes.",
          liveWord: "live",
          queueWord: "queued"
        };

  const pressureLevel =
    summary.p95_latency_ms >= 1200 || summary.accept_rate_pct < 45
      ? "critical"
      : summary.p95_latency_ms >= 800 || summary.accept_rate_pct < 60
        ? "high"
        : summary.p95_latency_ms >= 400 || summary.accept_rate_pct < 78
          ? "medium"
          : "low";
  const nextRoute = (() => {
    if (props.canResolve) {
      return {
        kicker: copy.routeTitle,
        title: t(props.lang, "pvp_resolve"),
        body: copy.routeResolveBody,
        label: copy.routeLabelResolve,
        cta: t(props.lang, "pvp_resolve"),
        onPress: props.onResolve
      };
    }
    if (props.canStrike) {
      return {
        kicker: copy.routeTitle,
        title: t(props.lang, "pvp_strike"),
        body: copy.routeStrikeBody,
        label: copy.routeLabelStrike,
        cta: t(props.lang, "pvp_strike"),
        onPress: props.onStrike
      };
    }
    if (props.canStart) {
      return {
        kicker: copy.routeTitle,
        title: t(props.lang, "pvp_start"),
        body: copy.routeStartBody,
        label: copy.routeLabelStart,
        cta: t(props.lang, "pvp_start"),
        onPress: props.onStart
      };
    }
    return {
      kicker: copy.routeTitle,
      title: t(props.lang, "pvp_focus_leaderboard"),
      body: copy.routeBoardBody,
      label: copy.routeLabelBoard,
      cta: t(props.lang, "pvp_focus_leaderboard"),
      onPress: () => props.onShellAction(SHELL_ACTION_KEY.PLAYER_PVP_LEADERBOARD, "panel_pvp")
    };
  })();
  const missionRouteState = props.canResolve ? copy.stateReady : copy.stateQueued;
  const vaultRouteState = props.canResolve ? copy.stateQueued : copy.stateLocked;
  const formatPvpStatus = (value: unknown, fallback: string) => {
    const raw = String(value || "").trim().toLowerCase();
    if (!raw) {
      return fallback;
    }
    if (["active", "running", "live"].includes(raw)) {
      return copy.stateLive;
    }
    if (["queued", "queue", "pending", "idle", "open"].includes(raw)) {
      return copy.stateQueued;
    }
    if (["resolved", "complete", "completed", "closed", "ready"].includes(raw)) {
      return copy.stateReady;
    }
    if (["blocked", "locked"].includes(raw)) {
      return copy.stateLocked;
    }
    return raw.replace(/[_-]+/g, " ");
  };
  const formatNextAction = (value: unknown) => {
    const raw = String(value || "").trim().toLowerCase();
    if (!raw) {
      return t(props.lang, "pvp_session_waiting");
    }
    if (["start", "open", "queue", "matchmake"].includes(raw)) {
      return t(props.lang, "pvp_start");
    }
    if (["strike", "attack"].includes(raw)) {
      return t(props.lang, "pvp_strike");
    }
    if (["resolve", "finish", "close"].includes(raw)) {
      return t(props.lang, "pvp_resolve");
    }
    if (["wait", "waiting", "idle"].includes(raw)) {
      return t(props.lang, "pvp_session_waiting");
    }
    return raw.replace(/[_-]+/g, " ");
  };
  const sessionStatusLabel = formatPvpStatus(summary.session_status, copy.queueWord);
  const nextActionLabel = formatNextAction(summary.next_expected_action);
  const dailyDuelStatusLabel = formatPvpStatus(league.daily_duel.status, copy.queueWord);

  return (
    <section className="akrCard akrCardWide akrArenaPanel" data-akr-panel-key="pvp" data-akr-focus-key="arena_command">
      <div className="akrGameHero akrArenaHero">
        <div className="akrGameHeroCopy">
          <p className="akrKicker">{t(props.lang, "pvp_hub_kicker")}</p>
          <h2>{t(props.lang, "pvp_hub_title")}</h2>
          <p>{copy.heroBody}</p>
        </div>
        <div className="akrGameHeroStats">
          <span className="akrChip">{sessionStatusLabel}</span>
          <span className="akrChip">R {Math.floor(league.session_snapshot.rating)}</span>
          <span className="akrChip">#{Math.floor(league.weekly_ladder.rank)}</span>
          <span className="akrChip">{Math.floor(league.daily_duel.win_rate_pct)}%</span>
        </div>
      </div>

      <section className="akrGameSpotlight" data-akr-panel-key="pvp" data-akr-focus-key="combat_route">
        <div className="akrGameSpotlightMain">
          <p className="akrKicker">
            {nextRoute.kicker} | {nextRoute.label}
          </p>
          <h3>{nextRoute.title}</h3>
          <p>{nextRoute.body}</p>
          <div className="akrChipRow">
            <span className="akrChip akrChipInfo">{sessionStatusLabel}</span>
            <span className="akrChip">R {Math.floor(league.session_snapshot.rating)}</span>
            <span className="akrChip">#{Math.floor(league.weekly_ladder.rank)}</span>
          </div>
          <div className="akrActionRow">
            <button type="button" className="akrBtn akrBtnAccent" onClick={nextRoute.onPress}>
              {nextRoute.cta}
            </button>
            <button type="button" className="akrBtn akrBtnGhost" onClick={() => props.onShellAction(SHELL_ACTION_KEY.PLAYER_TASKS_BOARD, "panel_pvp")}>
              {t(props.lang, "shell_panel_go_tasks")}
            </button>
          </div>
        </div>
        <div className="akrGameSpotlightAside">
          <h4>{copy.routeSideTitle}</h4>
          <p className="akrMuted akrMiniPanelBody">{copy.routeSideBody}</p>
          <div className="akrQuickHintGrid">
            <button type="button" className="akrQuickHintCard" onClick={() => props.onShellAction(SHELL_ACTION_KEY.PLAYER_TASKS_BOARD, "panel_pvp")}>
              <span className="akrKicker">{copy.missionsExit}</span>
              <strong>{t(props.lang, "shell_panel_go_tasks")}</strong>
            </button>
            <button type="button" className="akrQuickHintCard" onClick={() => props.onShellAction(SHELL_ACTION_KEY.PLAYER_REWARDS_PANEL, "panel_pvp")}>
              <span className="akrKicker">{copy.vaultExit}</span>
              <strong>{t(props.lang, "shell_panel_go_vault")}</strong>
            </button>
            <button type="button" className="akrQuickHintCard" onClick={() => props.onShellAction(SHELL_ACTION_KEY.PLAYER_PVP_LEADERBOARD, "panel_pvp")}>
              <span className="akrKicker">{copy.leaderboardExit}</span>
              <strong>{t(props.lang, "pvp_focus_leaderboard")}</strong>
            </button>
          </div>
        </div>
      </section>

      <RouteStrip
        panelKey="pvp"
        focusKey="combat_chain"
        title={copy.chainTitle}
        body={copy.chainBody}
        steps={[
          {
            kicker: copy.chainArena,
            title: nextRoute.title,
            body: copy.chainArenaBody,
            stateLabel: copy.stateLive,
            signals: [sessionStatusLabel, `R ${Math.floor(league.session_snapshot.rating)}`],
            tone: "active",
            onClick: nextRoute.onPress
          },
          {
            kicker: copy.chainMission,
            title: t(props.lang, "shell_panel_go_tasks"),
            body: copy.chainMissionBody,
            stateLabel: missionRouteState,
            signals: [`${Math.floor(summary.accept_rate_pct)}% ${copy.signalAccept}`, `#${Math.floor(league.weekly_ladder.rank)}`],
            tone: props.canResolve ? "done" : "idle",
            onClick: () => props.onShellAction(SHELL_ACTION_KEY.PLAYER_TASKS_BOARD, "panel_pvp")
          },
          {
            kicker: copy.chainVault,
            title: t(props.lang, "shell_panel_go_payout"),
            body: copy.chainVaultBody,
            stateLabel: vaultRouteState,
            signals: [`${Math.floor(league.daily_duel.win_rate_pct)}% ${copy.signalWin}`, `${Math.floor(summary.self_score)}-${Math.floor(summary.opponent_score)}`],
            tone: "idle",
            onClick: () => props.onShellAction(SHELL_ACTION_KEY.PLAYER_PAYOUT_REQUEST, "panel_pvp")
          }
        ]}
      />

      <div className="akrGameActionGrid">
        <button type="button" className="akrActionFeatureCard isPrimary" disabled={!props.canStart} onClick={props.onStart}>
          <p className="akrKicker">{copy.clashTitle}</p>
          <h3>{t(props.lang, "pvp_start")}</h3>
          <p>{copy.clashBody}</p>
          <span className="akrChip">{summary.session_ref || copy.queueWord}</span>
        </button>
        <button type="button" className="akrActionFeatureCard" disabled={!props.canStrike} onClick={props.onStrike}>
          <p className="akrKicker">{copy.duelTitle}</p>
          <h3>{t(props.lang, "pvp_strike")}</h3>
          <p>{copy.duelBody}</p>
          <span className="akrChip">{nextActionLabel}</span>
        </button>
        <button type="button" className="akrActionFeatureCard" disabled={!props.canResolve} onClick={props.onResolve}>
          <p className="akrKicker">{copy.ladderTitle}</p>
          <h3>{t(props.lang, "pvp_resolve")}</h3>
          <p>{copy.ladderBody}</p>
          <span className="akrChip">{league.weekly_ladder.tier || "-"}</span>
        </button>
        <button type="button" className="akrActionFeatureCard" onClick={() => props.onShellAction(SHELL_ACTION_KEY.PLAYER_PVP_LEADERBOARD, "panel_pvp")}>
          <p className="akrKicker">{copy.leaderboardTitle}</p>
          <h3>{t(props.lang, "pvp_focus_leaderboard")}</h3>
          <p>{copy.leaderboardBody}</p>
          <span className="akrChip">#{Math.floor(league.session_snapshot.rank)}</span>
        </button>
      </div>

      <div className="akrStatRail">
        <div className="akrMetricCard">
          <span>{copy.clashTitle}</span>
          <strong>{sessionStatusLabel}</strong>
        </div>
        <div className="akrMetricCard">
          <span>{copy.duelTitle}</span>
          <strong>
            {Math.floor(league.daily_duel.wins)}W / {Math.floor(league.daily_duel.losses)}L
          </strong>
        </div>
        <div className="akrMetricCard">
          <span>{copy.ladderTitle}</span>
          <strong>#{Math.floor(league.weekly_ladder.rank)}</strong>
        </div>
        <div className="akrMetricCard">
          <span>{copy.bossTitle}</span>
          <strong>{Math.floor(league.season_arc_boss.hp_pct)}%</strong>
        </div>
      </div>

      <div className="pvpObjectiveGrid">
        <article className={`pvpObjectiveCard ${league.daily_duel.win_rate_pct >= 55 ? "advantage pulse" : "neutral"}`} data-akr-focus-key="daily_duel">
          <p className="label">{copy.duelTitle}</p>
          <p className="value">
            {Math.floor(league.daily_duel.wins)}W / {Math.floor(league.daily_duel.losses)}L
          </p>
          <p className="micro">
            {dailyDuelStatusLabel} | {Math.floor(league.daily_duel.progress_pct)}%
          </p>
        </article>
        <article className={`pvpObjectiveCard ${league.weekly_ladder.promotion_zone ? "advantage" : "neutral"}`} data-akr-focus-key="weekly_ladder">
          <p className="label">{copy.ladderTitle}</p>
          <p className="value">
            #{Math.floor(league.weekly_ladder.rank)} | {league.weekly_ladder.tier || "-"}
          </p>
          <p className="micro">{Math.floor(league.weekly_ladder.points)} {t(props.lang, "pvp_points_label")}</p>
        </article>
        <article className={`pvpObjectiveCard ${league.season_arc_boss.hp_pct <= 25 ? "danger" : league.season_arc_boss.hp_pct <= 55 ? "warning" : "neutral"}`} data-akr-focus-key="arc_boss">
          <p className="label">{copy.bossTitle}</p>
          <p className="value">{league.season_arc_boss.phase || "-"}</p>
          <p className="micro">
            {league.season_arc_boss.stage || "-"} | HP {Math.floor(league.season_arc_boss.hp_pct)}%
          </p>
        </article>
        <article className="pvpObjectiveCard neutral">
          <p className="label">{copy.clashTitle}</p>
          <p className="value">
            {Math.floor(summary.self_score)} - {Math.floor(summary.opponent_score)}
          </p>
          <p className="micro">
            {Math.floor(summary.self_actions)} / {Math.floor(summary.opponent_actions)} {t(props.lang, "pvp_action_count_label")}
          </p>
        </article>
      </div>

      <div className={`combatHudPanel pressure-${pressureLevel}`}>
        <section className="combatHudCell">
          <p className="akrKicker">{t(props.lang, "pvp_pressure_title")}</p>
          <strong>{t(props.lang, `pvp_pressure_${pressureLevel}` as any)}</strong>
          <span className="akrMuted">{view.diagnostics_window || "-"}</span>
        </section>
        <section className="combatHudCell">
          <p className="akrKicker">{t(props.lang, "pvp_window_title")}</p>
          <strong>{Math.floor(summary.action_window_ms)}ms</strong>
          <span className="akrMuted">{t(props.lang, "pvp_window_caption")}</span>
        </section>
        <section className="combatHudCell">
          <p className="akrKicker">{t(props.lang, "pvp_transport_title")}</p>
          <strong>{summary.transport || "-"}</strong>
          <span className="akrMuted">P95 {Math.floor(summary.p95_latency_ms)}ms</span>
        </section>
        <section className="combatHudCell">
          <p className="akrKicker">{t(props.lang, "pvp_next_call_title")}</p>
          <strong>{nextActionLabel}</strong>
          <span className="akrMuted">Tick #{Math.floor(summary.server_tick)}</span>
        </section>
      </div>

      <div className="akrSplit">
        <section className="akrMiniPanel">
          <h4>{copy.leaderboardTitle}</h4>
          <p className="akrMuted akrMiniPanelBody">{copy.leaderboardBody}</p>
          {view.leaderboard.length ? (
            <ul className="akrList">
              {view.leaderboard.slice(0, 5).map((row) => (
                <li key={`${row.rank}_${row.public_name}`}>
                  <strong>
                    #{row.rank} {row.public_name}
                  </strong>
                  <span>
                    R {Math.floor(row.rating)} | {Math.floor(row.matches_24h)} {t(props.lang, "pvp_matches_24h_label")}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="akrMuted">{t(props.lang, "pvp_live_empty")}</p>
          )}
          <div className="akrActionRow">
            <button type="button" className="akrBtn akrBtnGhost" onClick={() => props.onShellAction(SHELL_ACTION_KEY.PLAYER_PVP_DAILY_DUEL, "panel_pvp")}>
              {t(props.lang, "pvp_focus_daily_duel")}
            </button>
            <button type="button" className="akrBtn akrBtnGhost" onClick={() => props.onShellAction(SHELL_ACTION_KEY.PLAYER_PVP_WEEKLY_LADDER, "panel_pvp")}>
              {t(props.lang, "pvp_focus_weekly_ladder")}
            </button>
          </div>
        </section>
        <section className="akrMiniPanel">
          <h4>{copy.clashHistoryTitle}</h4>
          <p className="akrMuted akrMiniPanelBody">{copy.clashHistoryBody}</p>
          {league.trend.length ? (
            <ul className="akrList">
              {league.trend.slice(0, 5).map((row) => (
                <li key={row.session_ref}>
                  <strong>{row.session_ref}</strong>
                  <span>
                    {row.result} | dR {Math.floor(row.rating_delta)} | {Math.floor(row.score_self)}-{Math.floor(row.score_opponent)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="akrMuted">{t(props.lang, "pvp_trend_empty")}</p>
          )}
          <div className="akrActionRow">
            <button type="button" className="akrBtn akrBtnGhost" disabled={!props.canRefreshState} onClick={props.onRefreshState}>
              {t(props.lang, "pvp_refresh")}
            </button>
            <button type="button" className="akrBtn akrBtnGhost" onClick={props.onRefreshLeague}>
              {t(props.lang, "pvp_refresh_league")}
            </button>
            <button type="button" className="akrBtn akrBtnGhost" onClick={props.onRefreshLive}>
              {t(props.lang, "pvp_refresh_live")}
            </button>
          </div>
        </section>
      </div>

      {props.advanced ? (
        <>
          <h3>{t(props.lang, "pvp_runtime_title")}</h3>
          <div className="akrChipRow">
            <span className="akrChip">Session: {summary.session_ref || "-"}</span>
            <span className="akrChip">Status: {sessionStatusLabel}</span>
            <span className="akrChip">Transport: {summary.transport || "-"}</span>
            <span className="akrChip">Tick: {Math.floor(summary.server_tick)}</span>
            <span className="akrChip">Tick ms: {Math.floor(summary.tick_ms)}</span>
            <span className="akrChip">Action ms: {Math.floor(summary.action_window_ms)}</span>
            <span className="akrChip">Accept: {Math.round(summary.accept_rate_pct)}%</span>
            <span className="akrChip">P95: {Math.floor(summary.p95_latency_ms)}ms</span>
          </div>
          <pre className="akrJsonBlock">{JSON.stringify(props.leagueOverview || null, null, 2)}</pre>
          <pre className="akrJsonBlock">{JSON.stringify(props.liveLeaderboard || null, null, 2)}</pre>
          <pre className="akrJsonBlock">{JSON.stringify(props.liveDiagnostics || null, null, 2)}</pre>
          <pre className="akrJsonBlock">{JSON.stringify(props.liveTick || null, null, 2)}</pre>
          <pre className="akrJsonBlock">{JSON.stringify(props.pvpRuntime || null, null, 2)}</pre>
        </>
      ) : null}
    </section>
  );
}
