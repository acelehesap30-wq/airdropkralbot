import { Suspense, lazy } from "react";
import { t, type Lang } from "../../i18n";
import { buildAdminSurfaceActionsView } from "../../../core/admin/adminSurfaceActions.js";
import { lazyRetry } from "../../utils/lazyRetry";
import { SHELL_ACTION_KEY } from "../../../core/navigation/shellActions.js";

const AdminQueueCard = lazy(async () => {
  const module = await lazyRetry(() => import("./cards/AdminQueueCard"), "admin-queue-card");
  return { default: module.AdminQueueCard };
});

const DynamicPolicyCard = lazy(async () => {
  const module = await lazyRetry(() => import("./cards/DynamicPolicyCard"), "admin-dynamic-policy-card");
  return { default: module.DynamicPolicyCard };
});

const LiveOpsCampaignCard = lazy(async () => {
  const module = await lazyRetry(() => import("./cards/LiveOpsCampaignCard"), "admin-live-ops-card");
  return { default: module.LiveOpsCampaignCard };
});

const RuntimeBotCard = lazy(async () => {
  const module = await lazyRetry(() => import("./cards/RuntimeBotCard"), "admin-runtime-bot-card");
  return { default: module.RuntimeBotCard };
});

const RuntimeFlagsCard = lazy(async () => {
  const module = await lazyRetry(() => import("./cards/RuntimeFlagsCard"), "admin-runtime-flags-card");
  return { default: module.RuntimeFlagsCard };
});

const RuntimeMetaCard = lazy(async () => {
  const module = await lazyRetry(() => import("./cards/RuntimeMetaCard"), "admin-runtime-meta-card");
  return { default: module.RuntimeMetaCard };
});

type QueueActionState = {
  action_key: string;
  kind: string;
  request_id: string;
  tx_hash: string;
  reason: string;
  confirm_token: string;
};

type AdminPanelProps = {
  lang: Lang;
  isAdmin: boolean;
  advanced: boolean;
  onShellAction: (actionKey: string, sourcePanelKey?: string) => void;
  adminRuntime: {
    summary: Record<string, unknown> | null;
    queue: Array<Record<string, unknown>>;
  };
  adminPanels: Record<string, unknown> | null;
  usersRecentData: Record<string, unknown> | null;
  queueAction: QueueActionState;
  onQueueActionChange: (patch: Partial<QueueActionState>) => void;
  onRefresh: () => void;
  onRunQueueAction: () => void;
  dynamicPolicyData: Record<string, unknown> | null;
  dynamicPolicyTokenSymbol: string;
  dynamicPolicyDraft: string;
  dynamicPolicyError: string;
  dynamicPolicySaving: boolean;
  onDynamicPolicyTokenSymbolChange: (value: string) => void;
  onDynamicPolicyDraftChange: (value: string) => void;
  onRefreshDynamicPolicy: () => void;
  onSaveDynamicPolicy: () => void;
  liveOpsCampaignData: Record<string, unknown> | null;
  liveOpsCampaignDispatchData: Record<string, unknown> | null;
  liveOpsCampaignDraft: string;
  liveOpsCampaignError: string;
  liveOpsCampaignApprovalError: string;
  liveOpsCampaignDispatchError: string;
  liveOpsCampaignSaving: boolean;
  liveOpsCampaignApprovaling: boolean;
  liveOpsCampaignDispatching: boolean;
  onLiveOpsCampaignDraftChange: (value: string) => void;
  onRefreshLiveOpsCampaign: () => void;
  onSaveLiveOpsCampaign: () => void;
  onRequestLiveOpsCampaignApproval: () => void;
  onApproveLiveOpsCampaign: () => void;
  onRevokeLiveOpsCampaignApproval: () => void;
  onDryRunLiveOpsCampaign: () => void;
  onDispatchLiveOpsCampaign: () => void;
  runtimeFlagsData: Record<string, unknown> | null;
  runtimeFlagsDraft: string;
  runtimeFlagsError: string;
  runtimeFlagsSaving: boolean;
  onRuntimeFlagsDraftChange: (value: string) => void;
  onRefreshRuntimeFlags: () => void;
  onSaveRuntimeFlags: () => void;
  botRuntimeData: Record<string, unknown> | null;
  botReconcileDraft: string;
  botReconcileError: string;
  botReconcileSaving: boolean;
  onBotReconcileDraftChange: (value: string) => void;
  onRefreshBotRuntime: () => void;
  onRunBotReconcile: () => void;
  metricsData: Record<string, unknown> | null;
  opsKpiData: Record<string, unknown> | null;
  opsKpiRunData: Record<string, unknown> | null;
  opsKpiRunError: string;
  opsKpiRunning: boolean;
  deployStatusData: Record<string, unknown> | null;
  assetsStatusData: Record<string, unknown> | null;
  assetsReloading: boolean;
  auditPhaseStatusData: Record<string, unknown> | null;
  auditIntegrityData: Record<string, unknown> | null;
  onRefreshRuntimeMeta: () => void;
  onRefreshOpsKpi: () => void;
  onRunOpsKpi: () => void;
  onReloadAssets: () => void;
  panelVisibility: {
    queue: boolean;
    dynamicPolicy: boolean;
    liveOps: boolean;
    runtimeFlags: boolean;
    runtimeBot: boolean;
    runtimeMeta: boolean;
  };
};

type SurfaceActionRunner = (sectionKey: string, slotKey: string, fallbackActionKey: string, sourcePanelKey?: string) => void;

function asText(value: unknown, fallback = "-") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function asInt(value: unknown) {
  const num = Number(value || 0);
  return Number.isFinite(num) ? Math.max(0, Math.round(num)) : 0;
}

function asRows(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object") : [];
}

function DisabledPanel(props: { lang: Lang; title: string }) {
  return (
    <section className="akrCard akrCardWide">
      <h3>{props.title}</h3>
      <p className="akrErrorLine">{t(props.lang, "admin_panel_disabled")}</p>
    </section>
  );
}

function AdminCardFallback(props: { lang: Lang; title: string }) {
  return (
    <section className="akrCard akrCardWide">
      <h3>{props.title}</h3>
      <p className="akrMuted">{t(props.lang, "loading")}</p>
    </section>
  );
}

export function AdminPanel(props: AdminPanelProps) {
  const copy =
    props.lang === "tr"
      ? {
          snapshotTitle: "Operasyon Ozeti",
          registered: "Kayitli oyuncu",
          active: "Aktif 24s",
          payouts: "Payout bekleyen",
          reviews: "Inceleme bekleyen",
          lanesTitle: "Onay koridorlari",
          lanesBody: "Normal mod sadece kullanici kontrolu, queue onayi ve canli gonderim kapisini acik tutar.",
          usersLane: "Oyuncu gozetimi",
          queueLane: "Queue onayi",
          liveOpsLane: "Canli gonderim",
          usersTitle: "Son aktif oyuncular",
          usersBody: "Hizli kontrol icin son gorulen oyuncular.",
          queueTitle: "Bekleyen onaylar",
          queueBody: "Hemen karar bekleyen istekler.",
          summaryBody: "Normal modda sadece onay ve gonderim icin gereken bilgiler gorunur."
        }
      : {
          snapshotTitle: "Operations Snapshot",
          registered: "Registered players",
          active: "Active 24h",
          payouts: "Pending payouts",
          reviews: "Pending reviews",
          lanesTitle: "Approval lanes",
          lanesBody: "Normal mode keeps only user review, queue approvals and live dispatch gates visible.",
          usersLane: "Player watch",
          queueLane: "Queue approval",
          liveOpsLane: "Live dispatch",
          usersTitle: "Recently active players",
          usersBody: "Most recent players for quick checks.",
          queueTitle: "Pending approvals",
          queueBody: "Requests that need a decision right now.",
          summaryBody: "Normal mode only keeps the data needed for approvals and live dispatch."
        };
  const showCompactOpsOnly = props.isAdmin && !props.advanced;
  const queueCount = Array.isArray(props.adminRuntime.queue) ? props.adminRuntime.queue.length : 0;
  const adminSummary = props.adminRuntime.summary && typeof props.adminRuntime.summary === "object" ? props.adminRuntime.summary : {};
  const adminMetrics =
    adminSummary.metrics && typeof adminSummary.metrics === "object" ? (adminSummary.metrics as Record<string, unknown>) : {};
  const liveOpsSnapshot =
    props.liveOpsCampaignData && typeof props.liveOpsCampaignData === "object" ? props.liveOpsCampaignData : {};
  const liveOpsApprovalSummary =
    liveOpsSnapshot.approval_summary && typeof liveOpsSnapshot.approval_summary === "object"
      ? (liveOpsSnapshot.approval_summary as Record<string, unknown>)
      : {};
  const liveOpsSchedulerSummary =
    liveOpsSnapshot.scheduler_summary && typeof liveOpsSnapshot.scheduler_summary === "object"
      ? (liveOpsSnapshot.scheduler_summary as Record<string, unknown>)
      : {};
  const recentUsers = asRows(props.usersRecentData?.items).slice(0, 6);
  const queueRows = Array.isArray(props.adminRuntime.queue) ? props.adminRuntime.queue : [];
  const recentQueueRows = queueRows.slice(0, 5);
  const registeredUsers = asInt(adminSummary.total_users || adminMetrics.users_total);
  const activeUsers = asInt(adminMetrics.users_active_24h);
  const pendingPayouts = asInt(adminSummary.pending_payout_count);
  const pendingToken = asInt(adminSummary.pending_token_count);
  const pendingKyc = queueRows.filter((row) => String(row.kind || "").trim().toLowerCase() === "kyc_manual_review").length;
  const pendingReviews = pendingToken + pendingKyc;
  const surfaceActions = buildAdminSurfaceActionsView({
    adminSummary: props.adminRuntime.summary,
    adminPanels: props.adminPanels
  });
  const resolveSurfaceActionKey = (sectionKey: string, slotKey: string, fallbackActionKey: string) => {
    const rows = Array.isArray((surfaceActions as Record<string, Array<Record<string, unknown>>> | undefined)?.[sectionKey])
      ? ((surfaceActions as Record<string, Array<Record<string, unknown>>>)[sectionKey] || [])
      : [];
    const match = rows.find((row) => String(row.slot_key || "").trim().toLowerCase() === String(slotKey || "").trim().toLowerCase());
    return String(match?.action_key || fallbackActionKey || "");
  };
  const runSurfaceAction: SurfaceActionRunner = (sectionKey, slotKey, fallbackActionKey, sourcePanelKey = "panel_admin") => {
    const actionKey = resolveSurfaceActionKey(sectionKey, slotKey, fallbackActionKey);
    if (!actionKey) {
      return;
    }
    props.onShellAction(actionKey, sourcePanelKey);
  };

  return (
    <main className="akrPanelGrid">
      <section className="akrCard akrCardWide" data-akr-panel-key="panel_admin" data-akr-focus-key="admin_summary">
        <h2>{showCompactOpsOnly ? t(props.lang, "admin_console_title") : t(props.lang, "admin_title")}</h2>
        {props.isAdmin ? <p className="akrMuted">{showCompactOpsOnly ? copy.summaryBody : t(props.lang, "admin_console_body")}</p> : null}
        {!props.isAdmin && <p className="akrErrorLine">{t(props.lang, "admin_access_denied")}</p>}
        {props.isAdmin ? (
          <>
            {!showCompactOpsOnly ? (
              <>
                <div className="akrStatRail">
                  <div className="akrMetricCard">
                    <span>{copy.registered}</span>
                    <strong>{registeredUsers}</strong>
                  </div>
                  <div className="akrMetricCard">
                    <span>{copy.active}</span>
                    <strong>{activeUsers}</strong>
                  </div>
                  <div className="akrMetricCard">
                    <span>{copy.payouts}</span>
                    <strong>{pendingPayouts}</strong>
                  </div>
                  <div className="akrMetricCard">
                    <span>{copy.reviews}</span>
                    <strong>{pendingReviews}</strong>
                  </div>
                </div>
                <div className="akrChipRow">
                  <span className="akrChip">
                    {t(props.lang, "admin_console_pending")}: {queueCount}
                  </span>
                  <span className="akrChip">
                    {t(props.lang, "admin_console_gate")}:{" "}
                    {liveOpsSchedulerSummary.ready_for_dispatch === true
                      ? t(props.lang, "admin_live_ops_gate_ready")
                      : t(props.lang, "admin_live_ops_gate_blocked")}
                  </span>
                  <span className="akrChip">
                    {t(props.lang, "admin_live_ops_approval_state_label")}:{" "}
                    {asText(liveOpsApprovalSummary.current_state || liveOpsSnapshot.approval_state)}
                  </span>
                </div>
              </>
            ) : null}
            {showCompactOpsOnly ? (
              <section className="akrDecisionDeck">
                <article className="akrDecisionCard">
                  <span className="akrKicker">{copy.usersLane}</span>
                  <strong>{registeredUsers}</strong>
                  <p className="akrMutedLine">
                    {copy.active}: {activeUsers}
                  </p>
                  <p className="akrMutedLine">
                    {recentUsers.length ? asText(recentUsers[0]?.public_name, `Player #${asInt(recentUsers[0]?.user_id)}`) : "-"}
                  </p>
                </article>
                <article className="akrDecisionCard">
                  <span className="akrKicker">{copy.queueLane}</span>
                  <strong>{queueCount}</strong>
                  <p className="akrMutedLine">
                    {copy.payouts}: {pendingPayouts}
                  </p>
                  <p className="akrMutedLine">
                    {copy.reviews}: {pendingReviews}
                  </p>
                  <div className="akrActionRow">
                    <button
                      className="akrBtn akrBtnAccent"
                      onClick={() => runSurfaceAction("admin_summary", "queue", SHELL_ACTION_KEY.ADMIN_QUEUE_PANEL)}
                    >
                      {t(props.lang, "admin_queue_title")}
                    </button>
                  </div>
                </article>
                <article className="akrDecisionCard">
                  <span className="akrKicker">{copy.liveOpsLane}</span>
                  <strong>
                    {liveOpsSchedulerSummary.ready_for_dispatch === true
                      ? t(props.lang, "admin_live_ops_gate_ready")
                      : t(props.lang, "admin_live_ops_gate_blocked")}
                  </strong>
                  <p className="akrMutedLine">
                    {t(props.lang, "admin_live_ops_approval_state_label")}: {asText(liveOpsApprovalSummary.current_state || liveOpsSnapshot.approval_state)}
                  </p>
                  <p className="akrMutedLine">
                    {t(props.lang, "admin_live_ops_last_dispatch_label")}: {asText(props.liveOpsCampaignDispatchData?.status || liveOpsSchedulerSummary.latest_dispatch_state)}
                  </p>
                  <div className="akrActionRow">
                    <button
                      className="akrBtn akrBtnAccent"
                      onClick={() => runSurfaceAction("admin_summary", "live_ops", SHELL_ACTION_KEY.ADMIN_LIVE_OPS_PANEL)}
                    >
                      {t(props.lang, "admin_live_ops_title")}
                    </button>
                  </div>
                </article>
              </section>
            ) : null}
          </>
        ) : null}
        {props.isAdmin && !showCompactOpsOnly ? (
          <div className="akrSplit">
            <section className="akrMiniPanel">
              <h4>{copy.usersTitle}</h4>
              <p className="akrMuted akrMiniPanelBody">{copy.usersBody}</p>
              {recentUsers.length ? (
                <ul className="akrList">
                  {recentUsers.map((row, index) => (
                    <li key={`${String(row.user_id || index)}_${String(row.telegram_id || "")}`}>
                      <strong>{asText(row.public_name, `Player #${asInt(row.user_id)}`)}</strong>
                      <span>
                        #{asInt(row.user_id)} | T{asInt(row.kingdom_tier)} | S{asInt(row.current_streak)} |{" "}
                        {asText(row.last_seen_at || row.created_at)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="akrMuted">-</p>
              )}
            </section>
            <section className="akrMiniPanel">
              <h4>{copy.queueTitle}</h4>
              <p className="akrMuted akrMiniPanelBody">{copy.queueBody}</p>
              {recentQueueRows.length ? (
                <ul className="akrList">
                  {recentQueueRows.slice(0, 4).map((row, index) => (
                    <li key={`${String(row.request_id || row.queue_key || index)}_${index}`}>
                      <strong>
                        {asText(row.kind, "request").replace(/_/g, " ")} #{asInt(row.request_id)}
                      </strong>
                      <span>
                        {asText(row.status).replace(/_/g, " ")} | P{asInt(row.priority)} | {asText(row.policy_reason_text || row.policy_reason_code)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="akrMuted">{t(props.lang, "admin_queue_empty")}</p>
              )}
            </section>
          </div>
        ) : null}
      </section>

      {props.isAdmin && (
        <>
          {props.panelVisibility.queue ? (
            <Suspense fallback={<AdminCardFallback lang={props.lang} title={t(props.lang, "admin_queue_title")} />}>
              <AdminQueueCard
                lang={props.lang}
                advanced={props.advanced}
                adminRuntime={props.adminRuntime}
                queueAction={props.queueAction}
                onQueueActionChange={props.onQueueActionChange}
                onRefresh={props.onRefresh}
                onRunQueueAction={props.onRunQueueAction}
                onSurfaceAction={runSurfaceAction}
              />
            </Suspense>
          ) : props.advanced ? (
            <DisabledPanel lang={props.lang} title={t(props.lang, "admin_queue_title")} />
          ) : null}
          {props.panelVisibility.liveOps ? (
            <Suspense fallback={<AdminCardFallback lang={props.lang} title={t(props.lang, "admin_live_ops_title")} />}>
              <LiveOpsCampaignCard
                lang={props.lang}
                advanced={props.advanced}
                liveOpsCampaignData={props.liveOpsCampaignData}
                liveOpsCampaignDispatchData={props.liveOpsCampaignDispatchData}
                liveOpsCampaignDraft={props.liveOpsCampaignDraft}
                liveOpsCampaignError={props.liveOpsCampaignError}
                liveOpsCampaignApprovalError={props.liveOpsCampaignApprovalError}
                liveOpsCampaignDispatchError={props.liveOpsCampaignDispatchError}
                liveOpsCampaignSaving={props.liveOpsCampaignSaving}
                liveOpsCampaignApprovaling={props.liveOpsCampaignApprovaling}
                liveOpsCampaignDispatching={props.liveOpsCampaignDispatching}
                onLiveOpsCampaignDraftChange={props.onLiveOpsCampaignDraftChange}
                onRefreshLiveOpsCampaign={props.onRefreshLiveOpsCampaign}
                onSaveLiveOpsCampaign={props.onSaveLiveOpsCampaign}
                onRequestLiveOpsCampaignApproval={props.onRequestLiveOpsCampaignApproval}
                onApproveLiveOpsCampaign={props.onApproveLiveOpsCampaign}
                onRevokeLiveOpsCampaignApproval={props.onRevokeLiveOpsCampaignApproval}
                onDryRunLiveOpsCampaign={props.onDryRunLiveOpsCampaign}
                onDispatchLiveOpsCampaign={props.onDispatchLiveOpsCampaign}
                onSurfaceAction={runSurfaceAction}
              />
            </Suspense>
          ) : props.advanced ? (
            <DisabledPanel lang={props.lang} title={t(props.lang, "admin_live_ops_title")} />
          ) : null}
        </>
      )}

      {props.isAdmin && props.advanced ? (
        <details className="akrCard akrCardWide akrDisclosureCard">
          <summary>
            <span>{t(props.lang, "admin_console_tools_title")}</span>
            <span className="akrMuted">{t(props.lang, "admin_console_tools_body")}</span>
          </summary>
          <div className="akrDisclosureBody">
            {props.panelVisibility.dynamicPolicy ? (
              <Suspense fallback={<AdminCardFallback lang={props.lang} title={t(props.lang, "admin_dynamic_policy_title")} />}>
                <DynamicPolicyCard
                  lang={props.lang}
                  dynamicPolicyData={props.dynamicPolicyData}
                  dynamicPolicyTokenSymbol={props.dynamicPolicyTokenSymbol}
                  dynamicPolicyDraft={props.dynamicPolicyDraft}
                  dynamicPolicyError={props.dynamicPolicyError}
                  dynamicPolicySaving={props.dynamicPolicySaving}
                  onDynamicPolicyTokenSymbolChange={props.onDynamicPolicyTokenSymbolChange}
                  onDynamicPolicyDraftChange={props.onDynamicPolicyDraftChange}
                  onRefreshDynamicPolicy={props.onRefreshDynamicPolicy}
                  onSaveDynamicPolicy={props.onSaveDynamicPolicy}
                  onSurfaceAction={runSurfaceAction}
                />
              </Suspense>
            ) : (
              <DisabledPanel lang={props.lang} title={t(props.lang, "admin_dynamic_policy_title")} />
            )}
            {props.panelVisibility.runtimeFlags ? (
              <Suspense fallback={<AdminCardFallback lang={props.lang} title={t(props.lang, "admin_runtime_flags_title")} />}>
                <RuntimeFlagsCard
                  lang={props.lang}
                  runtimeFlagsData={props.runtimeFlagsData}
                  runtimeFlagsDraft={props.runtimeFlagsDraft}
                  runtimeFlagsError={props.runtimeFlagsError}
                  runtimeFlagsSaving={props.runtimeFlagsSaving}
                  onRuntimeFlagsDraftChange={props.onRuntimeFlagsDraftChange}
                  onRefreshRuntimeFlags={props.onRefreshRuntimeFlags}
                  onSaveRuntimeFlags={props.onSaveRuntimeFlags}
                  onSurfaceAction={runSurfaceAction}
                />
              </Suspense>
            ) : (
              <DisabledPanel lang={props.lang} title={t(props.lang, "admin_runtime_flags_title")} />
            )}
            {props.panelVisibility.runtimeBot ? (
              <Suspense fallback={<AdminCardFallback lang={props.lang} title={t(props.lang, "admin_runtime_bot_title")} />}>
                <RuntimeBotCard
                  lang={props.lang}
                  botRuntimeData={props.botRuntimeData}
                  botReconcileDraft={props.botReconcileDraft}
                  botReconcileError={props.botReconcileError}
                  botReconcileSaving={props.botReconcileSaving}
                  onBotReconcileDraftChange={props.onBotReconcileDraftChange}
                  onRefreshBotRuntime={props.onRefreshBotRuntime}
                  onRunBotReconcile={props.onRunBotReconcile}
                  onSurfaceAction={runSurfaceAction}
                />
              </Suspense>
            ) : (
              <DisabledPanel lang={props.lang} title={t(props.lang, "admin_runtime_bot_title")} />
            )}
            {props.panelVisibility.runtimeMeta ? (
              <Suspense fallback={<AdminCardFallback lang={props.lang} title={t(props.lang, "admin_runtime_meta_title")} />}>
                <RuntimeMetaCard
                  lang={props.lang}
                  metricsData={props.metricsData}
                  opsKpiData={props.opsKpiData}
                  opsKpiRunData={props.opsKpiRunData}
                  opsKpiRunError={props.opsKpiRunError}
                  opsKpiRunning={props.opsKpiRunning}
                  deployStatusData={props.deployStatusData}
                  assetsStatusData={props.assetsStatusData}
                  assetsReloading={props.assetsReloading}
                  auditPhaseStatusData={props.auditPhaseStatusData}
                  auditIntegrityData={props.auditIntegrityData}
                  onRefreshRuntimeMeta={props.onRefreshRuntimeMeta}
                  onRefreshOpsKpi={props.onRefreshOpsKpi}
                  onRunOpsKpi={props.onRunOpsKpi}
                  onReloadAssets={props.onReloadAssets}
                  onSurfaceAction={runSurfaceAction}
                />
              </Suspense>
            ) : (
              <DisabledPanel lang={props.lang} title={t(props.lang, "admin_runtime_meta_title")} />
            )}
            <section className="akrCard akrCardWide">
              <h3>{t(props.lang, "admin_panel_dump_title")}</h3>
              <pre className="akrJsonBlock">{JSON.stringify(props.adminPanels || {}, null, 2)}</pre>
            </section>
          </div>
        </details>
      ) : null}
    </main>
  );
}
