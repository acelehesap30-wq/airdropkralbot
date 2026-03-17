import { useCallback } from "react";
import type { AdminQueueActionRequest, WebAppApiResponse, WebAppAuth } from "../../types";
import { buildActionRequestId } from "../../api";
import { UI_EVENT_KEY, UI_FUNNEL_KEY, UI_SURFACE_KEY } from "../../../core/telemetry/uiEventTaxonomy";

type QueueActionState = {
  action_key: string;
  kind: string;
  request_id: string;
  tx_hash: string;
  reason: string;
  confirm_token: string;
};

type MutationRunner = (payload: Record<string, unknown>) => { unwrap: () => Promise<any> };

type AdminQueueControllerOptions = {
  hasActiveAuth: boolean;
  activeAuth: WebAppAuth;
  queueAction: QueueActionState;
  setQueueAction: (updater: (prev: QueueActionState) => QueueActionState) => void;
  setError: (next: string) => void;
  asError: (payload: WebAppApiResponse | null | undefined, fallback?: string) => string;
  ensureAdminPanelEnabled: (panelKey: "queue") => boolean;
  trackUiEvent: (payload: Record<string, unknown>) => void;
  adminQueueAction: MutationRunner;
  refreshAdmin: () => Promise<void> | void;
};

export function useAdminQueueController(options: AdminQueueControllerOptions) {
  const runQueueAction = useCallback(async () => {
    if (!options.hasActiveAuth) return;
    if (!options.ensureAdminPanelEnabled("queue")) return;
    const payload: AdminQueueActionRequest = {
      action_key: String(options.queueAction.action_key || ""),
      kind: String(options.queueAction.kind || "") || undefined,
      request_id: Math.max(1, Number(options.queueAction.request_id || 0)),
      action_request_id: buildActionRequestId("admin_queue"),
      tx_hash: String(options.queueAction.tx_hash || "") || undefined,
      reason: String(options.queueAction.reason || "") || undefined,
      confirm_token: String(options.queueAction.confirm_token || "") || undefined
    };
    options.trackUiEvent({
      event_key: UI_EVENT_KEY.ACTION_REQUEST,
      panel_key: UI_SURFACE_KEY.PANEL_ADMIN_QUEUE,
      funnel_key: UI_FUNNEL_KEY.ADMIN_OPS,
      surface_key: UI_SURFACE_KEY.PANEL_ADMIN_QUEUE,
      payload_json: {
        action_key: payload.action_key,
        request_id: payload.request_id
      }
    });
    const res = await options.adminQueueAction({
      auth: options.activeAuth,
      payload
    })
      .unwrap()
      .catch(() => null);
    if (!res?.success) {
      const nextError = options.asError(res, "admin_queue_action_failed");
      options.setError(nextError);
      options.trackUiEvent({
        event_key: UI_EVENT_KEY.ACTION_FAILED,
        panel_key: UI_SURFACE_KEY.PANEL_ADMIN_QUEUE,
        funnel_key: UI_FUNNEL_KEY.ADMIN_OPS,
        surface_key: UI_SURFACE_KEY.PANEL_ADMIN_QUEUE,
        payload_json: {
          action_key: payload.action_key,
          request_id: payload.request_id,
          error: nextError
        }
      });
      return;
    }
    options.trackUiEvent({
      event_key: UI_EVENT_KEY.ACTION_SUCCESS,
      panel_key: UI_SURFACE_KEY.PANEL_ADMIN_QUEUE,
      funnel_key: UI_FUNNEL_KEY.ADMIN_OPS,
      surface_key: UI_SURFACE_KEY.PANEL_ADMIN_QUEUE,
      payload_json: {
        action_key: payload.action_key,
        request_id: payload.request_id
      }
    });
    options.setQueueAction((prev) => ({
      ...prev,
      request_id: "",
      tx_hash: "",
      reason: "",
      confirm_token: ""
    }));
    await options.refreshAdmin();
  }, [options]);

  const patchQueueAction = useCallback(
    (patch: Partial<QueueActionState>) => {
      options.setQueueAction((prev) => ({
        ...prev,
        ...(patch || {})
      }));
    },
    [options]
  );

  return {
    runQueueAction,
    patchQueueAction
  };
}
