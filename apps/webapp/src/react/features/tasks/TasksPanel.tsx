import { useState } from "react";
import { buildTasksViewModel } from "../../../core/player/tasksViewModel.js";
import { SHELL_ACTION_KEY } from "../../../core/navigation/shellActions.js";
import { t, type Lang } from "../../i18n";
import { RouteStrip } from "../shared/RouteStrip";
import { AirdropCatcher } from "./AirdropCatcher";
import { QuestChains } from "./QuestChains";
import type { WebAppAuth } from "../../types";

type TasksPanelProps = {
  lang: Lang;
  advanced: boolean;
  auth?: WebAppAuth | null;
  offers: Array<Record<string, unknown>>;
  missions: Array<Record<string, unknown>>;
  attempts: Record<string, unknown> | null;
  daily: Record<string, unknown> | null;
  taskResult: Record<string, unknown> | null;
  onReroll: () => void;
  onComplete: () => void;
  onReveal: () => void;
  onAccept: (offerId: number) => void;
  onClaim: (missionKey: string) => void;
  onShellAction: (actionKey: string, sourcePanelKey?: string) => void;
};

function asText(value: unknown, fallback = "-") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

export function TasksPanel(props: TasksPanelProps) {
  const [subView, setSubView] = useState<"play" | "missions" | "detail">("play");
  const view = buildTasksViewModel({
    offers: props.offers,
    missions: props.missions,
    attempts: props.attempts,
    daily: props.daily,
    taskResult: props.taskResult
  });
  const summary = view.summary;
  const readyMission = view.missions.find((row) => row.can_claim);
  const activeMission = view.missions.find((row) => !row.claimed && !row.can_claim);
  const copy = {
    kicker: t(props.lang, "tasks_kicker"),
    title: t(props.lang, "tasks_title"),
    body: t(props.lang, "tasks_body"),
    routeTitle: t(props.lang, "tasks_route_title"),
    routeReadyBody: t(props.lang, "tasks_route_ready_body"),
    routeAttemptBody: t(props.lang, "tasks_route_attempt_body"),
    routeOfferBody: t(props.lang, "tasks_route_offer_body"),
    routeFallbackBody: t(props.lang, "tasks_route_fallback_body"),
    routeLabelReady: t(props.lang, "tasks_route_label_ready"),
    routeLabelAttempt: t(props.lang, "tasks_route_label_attempt"),
    routeLabelOffer: t(props.lang, "tasks_route_label_offer"),
    routeLabelFallback: t(props.lang, "tasks_route_label_fallback"),
    chainTitle: t(props.lang, "tasks_chain_title"),
    chainBody: t(props.lang, "tasks_chain_body"),
    chainArena: t(props.lang, "tasks_chain_arena"),
    chainArenaBody: t(props.lang, "tasks_chain_arena_body"),
    chainMission: t(props.lang, "tasks_chain_mission"),
    chainMissionBody: t(props.lang, "tasks_chain_mission_body"),
    chainVault: t(props.lang, "tasks_chain_vault"),
    chainVaultBody: t(props.lang, "tasks_chain_vault_body"),
    stateComplete: t(props.lang, "tasks_state_complete"),
    stateLive: t(props.lang, "tasks_state_live"),
    stateReady: t(props.lang, "tasks_state_ready"),
    stateQueued: t(props.lang, "tasks_state_queued"),
    signalOffers: t(props.lang, "tasks_signal_offers"),
    signalOpen: t(props.lang, "tasks_signal_open"),
    sideRouteTitle: t(props.lang, "tasks_side_route_title"),
    sideRouteBody: t(props.lang, "tasks_side_route_body"),
    rewardsExit: t(props.lang, "tasks_rewards_exit"),
    vaultExit: t(props.lang, "tasks_vault_exit"),
    boardExit: t(props.lang, "tasks_board_exit"),
    laneOffers: t(props.lang, "tasks_lane_offers"),
    laneOffersBody: t(props.lang, "tasks_lane_offers_body"),
    laneMissions: t(props.lang, "tasks_lane_missions"),
    laneMissionsBody: t(props.lang, "tasks_lane_missions_body"),
    laneAttempt: t(props.lang, "tasks_lane_attempt"),
    laneAttemptBody: t(props.lang, "tasks_lane_attempt_body"),
    laneResult: t(props.lang, "tasks_lane_result"),
    laneResultBody: t(props.lang, "tasks_lane_result_body"),
    openBoard: t(props.lang, "tasks_open_board"),
    noAttempt: t(props.lang, "tasks_no_attempt"),
    revealReady: t(props.lang, "tasks_reveal_ready"),
    revealClosed: t(props.lang, "tasks_reveal_closed"),
    daily: t(props.lang, "tasks_daily"),
    ready: t(props.lang, "tasks_ready"),
    open: t(props.lang, "tasks_open"),
    offers: t(props.lang, "tasks_offers"),
    claimNow: t(props.lang, "tasks_claim_now"),
    acceptNow: t(props.lang, "tasks_accept_now"),
    activeAttempt: t(props.lang, "tasks_active_attempt"),
    revealAttempt: t(props.lang, "tasks_reveal_attempt"),
    lastAction: t(props.lang, "tasks_last_action"),
    stateClaimed: t(props.lang, "tasks_state_claimed"),
    stateClaimReady: t(props.lang, "tasks_state_claim_ready"),
    stateOpen: t(props.lang, "tasks_state_open"),
    resultCached: t(props.lang, "tasks_result_cached"),
    resultWaiting: t(props.lang, "tasks_result_waiting"),
    signalPace: t(props.lang, "tasks_signal_pace"),
    snapshotWord: t(props.lang, "tasks_snapshot_word"),
    liveWord: t(props.lang, "tasks_live_word"),
  };
  const firstOffer = view.offers[0] || null;
  const nextRoute = (() => {
    if (readyMission) {
      return {
        kicker: copy.routeTitle,
        title: readyMission.title,
        body: copy.routeReadyBody,
        label: copy.routeLabelReady,
        cta: copy.claimNow,
        onPress: () => props.onClaim(readyMission.mission_key)
      };
    }
    if (summary.revealable_attempt_id || summary.active_attempt_id) {
      return {
        kicker: copy.routeTitle,
        title: summary.active_attempt_task_type || copy.activeAttempt,
        body: copy.routeAttemptBody,
        label: copy.routeLabelAttempt,
        cta: summary.revealable_attempt_id ? t(props.lang, "tasks_reveal") : t(props.lang, "tasks_complete"),
        onPress: summary.revealable_attempt_id ? props.onReveal : props.onComplete
      };
    }
    if (firstOffer) {
      return {
        kicker: copy.routeTitle,
        title: `${asText(firstOffer.task_type).replace(/_/g, " ")} | D${firstOffer.difficulty}`,
        body: copy.routeOfferBody,
        label: copy.routeLabelOffer,
        cta: copy.acceptNow,
        onPress: () => props.onAccept(firstOffer.id)
      };
    }
    return {
      kicker: copy.routeTitle,
      title: t(props.lang, "tasks_focus_board"),
      body: copy.routeFallbackBody,
      label: copy.routeLabelFallback,
      cta: t(props.lang, "tasks_reroll"),
      onPress: props.onReroll
    };
  })();
  const vaultChainState = readyMission ? copy.stateReady : summary.revealable_attempt_id || summary.active_attempt_id ? copy.stateQueued : copy.stateQueued;

  return (
    <section className="akrCard akrCardWide akrGameHub" data-akr-panel-key="tasks" data-akr-focus-key="mission_command">
      <div className="akrGameHero">
        <div className="akrGameHeroCopy">
          <p className="akrKicker">{copy.kicker}</p>
          <h2>{t(props.lang, "tasks_title")}</h2>
          <p>{copy.body}</p>
        </div>
        <div className="akrGameHeroStats">
          <span className="akrChip">
            {copy.daily} {summary.daily_tasks_done}/{summary.daily_cap}
          </span>
          <span className="akrChip akrChipInfo">
            {copy.ready} {summary.missions_ready}
          </span>
          <span className="akrChip">
            {copy.open} {summary.missions_open}
          </span>
          <span className="akrChip">
            {copy.offers} {summary.offers_total}
          </span>
        </div>
        <div className="akrDailyProgress">
          <span className="akrDailyLabel">
            {summary.daily_tasks_done}/{summary.daily_cap}
          </span>
          <div className="akrDailyBar">
            <div className="akrDailyBarFill" style={{ width: `${summary.daily_progress_pct}%` }} />
          </div>
        </div>
      </div>

      {/* ── Sub-navigation ── */}
      <div style={{ display: "flex", gap: 4, padding: "8px 12px", background: "rgba(0,0,0,0.25)", borderBottom: "1px solid rgba(255,255,255,0.04)", marginBottom: 8 }}>
        {([
          { key: "play" as const, icon: "🎮", l: t(props.lang, "sub_nav_games") },
          { key: "missions" as const, icon: "📋", l: t(props.lang, "sub_nav_missions") },
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
          <div className="akrCard akrCardGlow">
            <div className="akrFeaturedHeader">
              <div className="akrFeaturedIcon">🪂</div>
              <div>
                <div className="akrFeaturedTitle">{props.lang === "tr" ? "Airdrop Avcısı" : "Airdrop Catcher"}</div>
                <div className="akrFeaturedSub">{props.lang === "tr" ? "Düşen ödülleri yakala · SC kazan" : "Catch falling rewards · Earn SC"}</div>
                <div className="akrFeaturedBadge">🎮 {props.lang === "tr" ? "OYNA" : "PLAY"}</div>
              </div>
            </div>
            <AirdropCatcher lang={props.lang} auth={props.auth} onClose={() => {}} />
          </div>
          <div style={{ marginTop: 12 }}>
            <QuestChains lang={props.lang} auth={props.auth} />
          </div>
        </>
      )}

      {subView === "missions" && (<>
      <section className="akrGameSpotlight" data-akr-panel-key="tasks" data-akr-focus-key="mission_route">
        <div className="akrGameSpotlightMain">
          <p className="akrKicker">
            {nextRoute.kicker} | {nextRoute.label}
          </p>
          <h3>{nextRoute.title}</h3>
          <p>{nextRoute.body}</p>
          <div className="akrChipRow">
            <span className="akrChip akrChipInfo">
              {copy.ready} {summary.missions_ready}
            </span>
            <span className="akrChip">
              {copy.open} {summary.missions_open}
            </span>
            <span className="akrChip">
              {copy.offers} {summary.offers_total}
            </span>
          </div>
          <div className="akrActionRow">
            <button type="button" className="akrBtn akrBtnAccent" onClick={nextRoute.onPress}>
              {nextRoute.cta}
            </button>
            <button
              type="button"
              className="akrBtn akrBtnGhost"
              onClick={() => props.onShellAction(SHELL_ACTION_KEY.PLAYER_TASKS_BOARD, "panel_tasks")}
            >
              {t(props.lang, "tasks_focus_board")}
            </button>
          </div>
        </div>
        <div className="akrGameSpotlightAside">
          <h4>{copy.sideRouteTitle}</h4>
          <p className="akrMuted akrMiniPanelBody">{copy.sideRouteBody}</p>
          <div className="akrQuickHintGrid">
            <button
              type="button"
              className="akrQuickHintCard"
              onClick={() => props.onShellAction(SHELL_ACTION_KEY.PLAYER_REWARDS_PANEL, "panel_tasks")}
            >
              <span className="akrKicker">{copy.rewardsExit}</span>
              <strong>{t(props.lang, "tasks_focus_rewards")}</strong>
            </button>
            <button
              type="button"
              className="akrQuickHintCard"
              onClick={() => props.onShellAction(SHELL_ACTION_KEY.PLAYER_PAYOUT_REQUEST, "panel_tasks")}
            >
              <span className="akrKicker">{copy.vaultExit}</span>
              <strong>{t(props.lang, "shell_panel_go_payout")}</strong>
            </button>
            <button
              type="button"
              className="akrQuickHintCard"
              onClick={() => props.onShellAction(SHELL_ACTION_KEY.PLAYER_TASKS_CLAIMS, "panel_tasks")}
            >
              <span className="akrKicker">{copy.boardExit}</span>
              <strong>{t(props.lang, "tasks_focus_claims")}</strong>
            </button>
          </div>
        </div>
      </section>

      <RouteStrip
        panelKey="tasks"
        focusKey="mission_chain"
        title={copy.chainTitle}
        body={copy.chainBody}
        steps={[
          {
            kicker: copy.chainArena,
            title: t(props.lang, "shell_panel_go_pvp"),
            body: copy.chainArenaBody,
            stateLabel: copy.stateComplete,
            signals: [`${summary.daily_progress_pct}% ${copy.signalPace}`, `${summary.daily_tasks_done}/${summary.daily_cap}`],
            tone: "done",
            onClick: () => props.onShellAction(SHELL_ACTION_KEY.PLAYER_PVP_DAILY_DUEL, "panel_tasks")
          },
          {
            kicker: copy.chainMission,
            title: nextRoute.title,
            body: copy.chainMissionBody,
            stateLabel: readyMission ? copy.stateReady : copy.stateLive,
            signals: [`${summary.missions_ready} ${copy.ready.toLowerCase()}`, `${summary.offers_total} ${copy.signalOffers}`],
            tone: "active",
            onClick: nextRoute.onPress
          },
          {
            kicker: copy.chainVault,
            title: t(props.lang, "shell_panel_go_payout"),
            body: copy.chainVaultBody,
            stateLabel: vaultChainState,
            signals: [readyMission ? copy.claimNow : copy.routeLabelFallback, `${summary.missions_open} ${copy.signalOpen}`],
            tone: readyMission ? "done" : "idle",
            onClick: () => props.onShellAction(SHELL_ACTION_KEY.PLAYER_PAYOUT_REQUEST, "panel_tasks")
          }
        ]}
      />

      <div className="akrGameActionGrid">
        <button type="button" className="akrActionFeatureCard isPrimary" onClick={props.onReveal}>
          <p className="akrKicker">{copy.revealAttempt}</p>
          <h3>{t(props.lang, "tasks_reveal")}</h3>
          <p>{summary.revealable_attempt_id ? copy.revealReady : copy.revealClosed}</p>
          <span className="akrChip">#{summary.revealable_attempt_id || 0}</span>
        </button>
        <button type="button" className="akrActionFeatureCard" onClick={props.onComplete}>
          <p className="akrKicker">{copy.activeAttempt}</p>
          <h3>{t(props.lang, "tasks_complete")}</h3>
          <p>{summary.active_attempt_task_type || copy.noAttempt}</p>
          <span className="akrChip">#{summary.active_attempt_id || 0}</span>
        </button>
        <button
          type="button"
          className="akrActionFeatureCard"
          onClick={() =>
            readyMission ? props.onClaim(readyMission.mission_key) : props.onShellAction(SHELL_ACTION_KEY.PLAYER_REWARDS_PANEL, "panel_tasks")
          }
        >
          <p className="akrKicker">{copy.laneMissions}</p>
          <h3>{t(props.lang, "tasks_claim")}</h3>
          <p>{readyMission ? readyMission.title : t(props.lang, "tasks_missions_empty")}</p>
          <span className="akrChip">{summary.missions_ready}</span>
        </button>
        <button type="button" className="akrActionFeatureCard" onClick={props.onReroll}>
          <p className="akrKicker">{copy.laneOffers}</p>
          <h3>{t(props.lang, "tasks_reroll")}</h3>
          <p>{copy.openBoard}</p>
          <span className="akrChip">{summary.offers_total}</span>
        </button>
      </div>

      <div className="akrStatRail">
        <div className="akrMetricCard">
          <span>{copy.daily}</span>
          <strong>{summary.daily_progress_pct}%</strong>
        </div>
        <div className="akrMetricCard">
          <span>{copy.ready}</span>
          <strong>{summary.missions_ready}</strong>
        </div>
        <div className="akrMetricCard">
          <span>{copy.open}</span>
          <strong>{summary.missions_open}</strong>
        </div>
        <div className="akrMetricCard">
          <span>{copy.offers}</span>
          <strong>{summary.offers_total}</strong>
        </div>
      </div>

      </>)}

      {subView === "detail" && (<>
      <div className="akrSplit">
        <section className="akrMiniPanel">
          <h4>{copy.laneOffers}</h4>
          <p className="akrMuted akrMiniPanelBody">{copy.laneOffersBody}</p>
          {view.offers.length ? (
            <ul className="akrList">
              {view.offers.slice(0, 4).map((row) => (
                <li key={`offer_${row.id}`}>
                  <strong>
                    {asText(row.task_type).replace(/_/g, " ")} | D{row.difficulty}
                  </strong>
                  <span>
                    {asText(row.expires_at)}
                    <button type="button" className="akrBtn akrBtnGhost" onClick={() => props.onAccept(row.id)}>
                      {copy.acceptNow}
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="akrMuted">{t(props.lang, "tasks_offers_empty")}</p>
          )}
          <div className="akrActionRow">
            <button type="button" className="akrBtn akrBtnGhost" onClick={() => props.onShellAction(SHELL_ACTION_KEY.PLAYER_TASKS_BOARD, "panel_tasks")}>
              {t(props.lang, "tasks_focus_board")}
            </button>
          </div>
        </section>

        <section className="akrMiniPanel">
          <h4>{copy.laneMissions}</h4>
          <p className="akrMuted akrMiniPanelBody">{copy.laneMissionsBody}</p>
          {view.missions.length ? (
            <ul className="akrList">
              {view.missions.slice(0, 5).map((row) => (
                <li key={`mission_${row.mission_key}`}>
                  <strong>{row.title}</strong>
                  <span>
                    {row.claimed ? copy.stateClaimed : row.can_claim ? copy.stateClaimReady : copy.stateOpen}
                    {row.can_claim ? (
                      <button type="button" className="akrBtn akrBtnAccent" onClick={() => props.onClaim(row.mission_key)}>
                        {copy.claimNow}
                      </button>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="akrMuted">{t(props.lang, "tasks_missions_empty")}</p>
          )}
          <div className="akrActionRow">
            <button
              className="akrBtn akrBtnGhost"
              onClick={() => props.onShellAction(SHELL_ACTION_KEY.PLAYER_REWARDS_PANEL, "panel_tasks")}
            >
              {t(props.lang, "tasks_focus_claims")}
            </button>
          </div>
        </section>
      </div>

      <div className="akrSplit">
        <section className="akrMiniPanel">
          <h4>{copy.laneAttempt}</h4>
          <p className="akrMuted akrMiniPanelBody">{copy.laneAttemptBody}</p>
          <div className="akrChipRow">
            <span className="akrChip">
              {copy.activeAttempt} #{summary.active_attempt_id || 0}
            </span>
            <span className="akrChip">
              {copy.revealAttempt} #{summary.revealable_attempt_id || 0}
            </span>
            <span className="akrChip">{summary.active_attempt_task_type || "-"}</span>
          </div>
          <p className="akrMuted">
            {activeMission?.title || readyMission?.title || copy.noAttempt}
          </p>
          <div className="akrActionRow">
            <button type="button" className="akrBtn akrBtnGhost" onClick={props.onReveal}>
              {t(props.lang, "tasks_reveal")}
            </button>
            <button type="button" className="akrBtn akrBtnGhost" onClick={props.onComplete}>
              {t(props.lang, "tasks_complete")}
            </button>
          </div>
        </section>

        <section className="akrMiniPanel">
          <h4>{copy.laneResult}</h4>
          <p className="akrMuted akrMiniPanelBody">{copy.laneResultBody}</p>
          <div className="akrChipRow">
            <span className="akrChip">
              {copy.lastAction} {summary.last_action_request_id || "-"}
            </span>
            <span className="akrChip">{summary.last_snapshot_present ? copy.snapshotWord : copy.liveWord}</span>
          </div>
          <p className="akrMuted">{summary.last_snapshot_present ? copy.resultCached : copy.resultWaiting}</p>
          <div className="akrActionRow">
            <button
              type="button"
              className="akrBtn akrBtnGhost"
              onClick={() => props.onShellAction(SHELL_ACTION_KEY.PLAYER_REWARDS_PANEL, "panel_tasks")}
            >
              {t(props.lang, "tasks_focus_rewards")}
            </button>
          </div>
        </section>
      </div>

      </>)}

      {!view.has_data ? <p className="akrMuted">{t(props.lang, "tasks_empty")}</p> : null}
      {props.advanced ? <pre className="akrJsonBlock">{JSON.stringify({ offers: props.offers, missions: props.missions, attempts: props.attempts, daily: props.daily, taskResult: props.taskResult }, null, 2)}</pre> : null}
    </section>
  );
}

