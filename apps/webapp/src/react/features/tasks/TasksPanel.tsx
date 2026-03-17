import { buildTasksViewModel } from "../../../core/player/tasksViewModel.js";
import { SHELL_ACTION_KEY } from "../../../core/navigation/shellActions.js";
import { t, type Lang } from "../../i18n";

type TasksPanelProps = {
  lang: Lang;
  advanced: boolean;
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
  const copy =
    props.lang === "tr"
      ? {
          kicker: "Mission Command",
          title: "Gorev desteni hazir",
          body: "Bugunun ritmini buradan yonet: uygun offer sec, reveal penceresini ac ve claim hazir gorevleri kapat.",
          routeTitle: "Sonraki gorev rotasi",
          routeReadyBody: "Claim hazir gorev once kapanir, sonra odul hattina gecilir.",
          routeAttemptBody: "Reveal veya complete ile aktif denemeyi kapat, sonra claim zincirine gec.",
          routeOfferBody: "Siradaki oynanabilir hamle acik bir offer'dan baslar.",
          routeFallbackBody: "Yeni rota acmak icin board'u yenile ve en uygun gorevi cek.",
          routeLabelReady: "claim chain",
          routeLabelAttempt: "active attempt",
          routeLabelOffer: "offer route",
          routeLabelFallback: "board refresh",
          chainTitle: "Combat -> mission -> vault",
          chainBody: "Arena'dan cikan tempo burada gorevi kapatir, sonra odul ve payout koridoruna akar.",
          chainArena: "Arena baskisi",
          chainArenaBody: "Duel veya ladder sonucu seni bu mission board'a iter.",
          chainMission: "Claim push",
          chainMissionBody: "Hazir gorev ya kapanir ya da reveal/complete ile claim'e dondurulur.",
          chainVault: "Vault cikisi",
          chainVaultBody: "Mission kapandiginda odul, payout ve proof koridoru acilir.",
          sideRouteTitle: "Bagli cikislar",
          sideRouteBody: "Mission loop kapaninca hangi lane'e sicrarsin burada gorunur.",
          rewardsExit: "Odul cikisi",
          vaultExit: "Vault cikisi",
          boardExit: "Board cikisi",
          laneOffers: "Teklif hatti",
          laneOffersBody: "Hizli baslangic icin acik task offer'lari.",
          laneMissions: "Hazir claim hatti",
          laneMissionsBody: "Streak'i tutmak icin en yakin kapatilacak gorevler.",
          laneAttempt: "Aktif deneme",
          laneAttemptBody: "Devam eden ya da reveal bekleyen task akisi.",
          laneResult: "Son hareket",
          laneResultBody: "Sistemin aldigi son task cevabi.",
          openBoard: "Tum board'u ac",
          noAttempt: "Su an aktif deneme yok.",
          revealReady: "Reveal hazir",
          revealClosed: "Reveal kapali",
          daily: "Gunluk tempo",
          ready: "Hazir",
          open: "Acik",
          offers: "Offer",
          claimNow: "Simdi claim et",
          acceptNow: "Bu offer'i al",
          activeAttempt: "Aktif deneme",
          revealAttempt: "Reveal denemesi",
          lastAction: "Son request",
          stateClaimed: "claimed",
          stateClaimReady: "claim-ready",
          stateOpen: "open",
          resultCached: "response cached",
          resultWaiting: "waiting for next action"
        }
      : {
          kicker: "Mission Command",
          title: "Your mission deck is live",
          body: "Run today's loop from here: pick an offer, open the reveal window, and close claim-ready objectives.",
          routeTitle: "Next mission route",
          routeReadyBody: "Close the ready claim first, then move straight into the reward lane.",
          routeAttemptBody: "Resolve the active attempt with reveal or complete, then return to the claim chain.",
          routeOfferBody: "The next playable move starts from an open offer.",
          routeFallbackBody: "Refresh the board to pull the next playable objective.",
          routeLabelReady: "claim chain",
          routeLabelAttempt: "active attempt",
          routeLabelOffer: "offer route",
          routeLabelFallback: "board refresh",
          chainTitle: "Combat -> mission -> vault",
          chainBody: "Arena tempo lands here, closes the objective, then spills into rewards and payout.",
          chainArena: "Arena pressure",
          chainArenaBody: "A duel or ladder result pushes you into this mission board.",
          chainMission: "Claim push",
          chainMissionBody: "A ready mission closes now or an active attempt resolves into a claim.",
          chainVault: "Vault exit",
          chainVaultBody: "When the mission closes, the reward, payout, and proof corridor opens.",
          sideRouteTitle: "Linked exits",
          sideRouteBody: "See where the mission loop hands you off after the close.",
          rewardsExit: "Rewards exit",
          vaultExit: "Vault exit",
          boardExit: "Board exit",
          laneOffers: "Offer lane",
          laneOffersBody: "Open task offers for the next move.",
          laneMissions: "Ready claims",
          laneMissionsBody: "Closest objectives to close and protect the streak.",
          laneAttempt: "Active attempt",
          laneAttemptBody: "Current or revealable task flow.",
          laneResult: "Latest move",
          laneResultBody: "Most recent task response from the system.",
          openBoard: "Open full board",
          noAttempt: "No active attempt right now.",
          revealReady: "Reveal ready",
          revealClosed: "Reveal closed",
          daily: "Daily pace",
          ready: "Ready",
          open: "Open",
          offers: "Offers",
          claimNow: "Claim now",
          acceptNow: "Take this offer",
          activeAttempt: "Active attempt",
          revealAttempt: "Reveal attempt",
          lastAction: "Last request",
          stateClaimed: "claimed",
          stateClaimReady: "claim-ready",
          stateOpen: "open",
          resultCached: "response cached",
          resultWaiting: "waiting for next action"
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
            <button className="akrBtn akrBtnAccent" onClick={nextRoute.onPress}>
              {nextRoute.cta}
            </button>
            <button
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
              className="akrQuickHintCard"
              onClick={() => props.onShellAction(SHELL_ACTION_KEY.PLAYER_REWARDS_PANEL, "panel_tasks")}
            >
              <span className="akrKicker">{copy.rewardsExit}</span>
              <strong>{t(props.lang, "tasks_focus_rewards")}</strong>
            </button>
            <button
              className="akrQuickHintCard"
              onClick={() => props.onShellAction(SHELL_ACTION_KEY.PLAYER_PAYOUT_REQUEST, "panel_tasks")}
            >
              <span className="akrKicker">{copy.vaultExit}</span>
              <strong>{t(props.lang, "shell_panel_go_payout")}</strong>
            </button>
            <button
              className="akrQuickHintCard"
              onClick={() => props.onShellAction(SHELL_ACTION_KEY.PLAYER_TASKS_CLAIMS, "panel_tasks")}
            >
              <span className="akrKicker">{copy.boardExit}</span>
              <strong>{t(props.lang, "tasks_focus_claims")}</strong>
            </button>
          </div>
        </div>
      </section>

      <section className="akrRouteStrip" data-akr-panel-key="tasks" data-akr-focus-key="mission_chain">
        <div className="akrRouteStripHeader">
          <p className="akrKicker">{copy.chainTitle}</p>
          <p className="akrMuted">{copy.chainBody}</p>
        </div>
        <div className="akrRouteStripGrid">
          <button className="akrRouteStep" onClick={() => props.onShellAction(SHELL_ACTION_KEY.PLAYER_PVP_DAILY_DUEL, "panel_tasks")}>
            <span className="akrKicker">{copy.chainArena}</span>
            <strong>{t(props.lang, "shell_panel_go_pvp")}</strong>
            <p>{copy.chainArenaBody}</p>
          </button>
          <button className="akrRouteStep isActive" onClick={nextRoute.onPress}>
            <span className="akrKicker">{copy.chainMission}</span>
            <strong>{nextRoute.title}</strong>
            <p>{copy.chainMissionBody}</p>
          </button>
          <button className="akrRouteStep" onClick={() => props.onShellAction(SHELL_ACTION_KEY.PLAYER_PAYOUT_REQUEST, "panel_tasks")}>
            <span className="akrKicker">{copy.chainVault}</span>
            <strong>{t(props.lang, "shell_panel_go_payout")}</strong>
            <p>{copy.chainVaultBody}</p>
          </button>
        </div>
      </section>

      <div className="akrGameActionGrid">
        <button className="akrActionFeatureCard isPrimary" onClick={props.onReveal}>
          <p className="akrKicker">{copy.revealAttempt}</p>
          <h3>{t(props.lang, "tasks_reveal")}</h3>
          <p>{summary.revealable_attempt_id ? copy.revealReady : copy.revealClosed}</p>
          <span className="akrChip">#{summary.revealable_attempt_id || 0}</span>
        </button>
        <button className="akrActionFeatureCard" onClick={props.onComplete}>
          <p className="akrKicker">{copy.activeAttempt}</p>
          <h3>{t(props.lang, "tasks_complete")}</h3>
          <p>{summary.active_attempt_task_type || copy.noAttempt}</p>
          <span className="akrChip">#{summary.active_attempt_id || 0}</span>
        </button>
        <button
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
        <button className="akrActionFeatureCard" onClick={props.onReroll}>
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
                    <button className="akrBtn akrBtnGhost" onClick={() => props.onAccept(row.id)}>
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
            <button className="akrBtn akrBtnGhost" onClick={() => props.onShellAction(SHELL_ACTION_KEY.PLAYER_TASKS_BOARD, "panel_tasks")}>
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
                      <button className="akrBtn akrBtnAccent" onClick={() => props.onClaim(row.mission_key)}>
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
            <button className="akrBtn akrBtnGhost" onClick={props.onReveal}>
              {t(props.lang, "tasks_reveal")}
            </button>
            <button className="akrBtn akrBtnGhost" onClick={props.onComplete}>
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
            <span className="akrChip">{summary.last_snapshot_present ? "snapshot" : "live"}</span>
          </div>
          <p className="akrMuted">{summary.last_snapshot_present ? copy.resultCached : copy.resultWaiting}</p>
          <div className="akrActionRow">
            <button
              className="akrBtn akrBtnGhost"
              onClick={() => props.onShellAction(SHELL_ACTION_KEY.PLAYER_REWARDS_PANEL, "panel_tasks")}
            >
              {t(props.lang, "tasks_focus_rewards")}
            </button>
          </div>
        </section>
      </div>

      {!view.has_data ? <p className="akrMuted">{t(props.lang, "tasks_empty")}</p> : null}
      {props.advanced ? <pre className="akrJsonBlock">{JSON.stringify({ offers: props.offers, missions: props.missions, attempts: props.attempts, daily: props.daily, taskResult: props.taskResult }, null, 2)}</pre> : null}
    </section>
  );
}

