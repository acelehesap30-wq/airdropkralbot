import { Suspense, lazy } from "react";
import { t, type Lang } from "../../i18n";
import { SHELL_ACTION_KEY } from "../../../core/navigation/shellActions.js";
import { buildAdminSurfaceActionsView } from "../../../core/admin/adminSurfaceActions.js";
import { lazyRetry } from "../../utils/lazyRetry";

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
  const showCompactOpsOnly = props.isAdmin && !props.advanced;
  const queueCount = Array.isArray(props.adminRuntime.queue) ? props.adminRuntime.queue.length : 0;
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
        {props.isAdmin ? <p className="akrMuted">{t(props.lang, "admin_console_body")}</p> : null}
        {!props.isAdmin && <p className="akrErrorLine">{t(props.lang, "admin_access_denied")}</p>}
        {props.isAdmin ? (
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
        ) : null}
        {props.isAdmin ? (
          <div className="akrActionRow">
            {props.panelVisibility.queue ? (
              <button
                className="akrBtn akrBtnGhost"
                onClick={() => runSurfaceAction("admin_header", "queue", SHELL_ACTION_KEY.ADMIN_QUEUE_PANEL, "panel_admin")}
              >
                {t(props.lang, "admin_nav_queue")}
              </button>
            ) : null}
            {props.panelVisibility.liveOps ? (
              <button
                className="akrBtn akrBtnGhost"
                onClick={() => runSurfaceAction("admin_header", "live_ops", SHELL_ACTION_KEY.ADMIN_LIVE_OPS_PANEL, "panel_admin")}
              >
                {t(props.lang, "admin_nav_live_ops")}
              </button>
            ) : null}
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
