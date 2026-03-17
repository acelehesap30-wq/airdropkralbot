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
          lastAction: "Son request"
        }
      : {
          kicker: "Mission Command",
          title: "Your mission deck is live",
          body: "Run today’s loop from here: pick an offer, open the reveal window, and close claim-ready objectives.",
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
          lastAction: "Last request"
        };

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
                    {row.claimed ? "claimed" : row.can_claim ? "claim-ready" : "open"}
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
          <p className="akrMuted">{summary.last_snapshot_present ? "response cached" : "waiting for next action"}</p>
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
