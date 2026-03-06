import { useCallback } from "react";
import { UI_EVENT_KEY, UI_FUNNEL_KEY, UI_SURFACE_KEY } from "../../../core/telemetry/uiEventTaxonomy";
import type { BootstrapV2Payload } from "../../types";

type RefetchableQuery = {
  refetch: () => Promise<any>;
};

type BootstrapRefreshControllerOptions = {
  hasActiveAuth: boolean;
  workspace: "player" | "admin";
  bootstrapQuery: RefetchableQuery;
  setLoading: (next: boolean) => void;
  setError: (next: string) => void;
  setBootstrap: (payload: Record<string, unknown>) => void;
  trackUiEvent: (payload: Record<string, unknown>) => void;
  asError: (payload: BootstrapV2Payload | null | undefined, fallback?: string) => string;
};

function resolveWorkspaceFunnel(workspace: "player" | "admin"): string {
  return workspace === "admin" ? UI_FUNNEL_KEY.ADMIN_OPS : UI_FUNNEL_KEY.PLAYER_LOOP;
}

export function useBootstrapRefreshController(options: BootstrapRefreshControllerOptions) {
  const refreshBootstrap = useCallback(async () => {
    if (!options.hasActiveAuth) return;
    options.setLoading(true);
    options.setError("");
    options.trackUiEvent({
      event_key: UI_EVENT_KEY.REFRESH_REQUEST,
      panel_key: UI_SURFACE_KEY.TOPBAR,
      funnel_key: resolveWorkspaceFunnel(options.workspace),
      surface_key: UI_SURFACE_KEY.TOPBAR,
      payload_json: {
        target: "bootstrap",
        workspace: options.workspace
      }
    });
    const refreshed = await options.bootstrapQuery.refetch().catch(() => null);
    const payload = (refreshed?.data || null) as BootstrapV2Payload | null;
    if (!payload?.success || !payload.data) {
      const nextError = options.asError(payload, "bootstrap_failed");
      options.setLoading(false);
      options.setError(nextError);
      options.trackUiEvent({
        event_key: UI_EVENT_KEY.REFRESH_FAILED,
        panel_key: UI_SURFACE_KEY.TOPBAR,
        funnel_key: resolveWorkspaceFunnel(options.workspace),
        surface_key: UI_SURFACE_KEY.TOPBAR,
        payload_json: {
          target: "bootstrap",
          error: nextError
        }
      });
      return;
    }
    options.setBootstrap(payload.data);
    options.trackUiEvent({
      event_key: UI_EVENT_KEY.REFRESH_SUCCESS,
      panel_key: UI_SURFACE_KEY.TOPBAR,
      funnel_key: resolveWorkspaceFunnel(options.workspace),
      surface_key: UI_SURFACE_KEY.TOPBAR,
      payload_json: {
        target: "bootstrap"
      }
    });
  }, [options]);

  return {
    refreshBootstrap
  };
}
