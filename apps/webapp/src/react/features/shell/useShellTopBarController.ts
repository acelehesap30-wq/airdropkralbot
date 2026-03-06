import { useCallback } from "react";
import { UI_EVENT_KEY, UI_FUNNEL_KEY, UI_SURFACE_KEY } from "../../../core/telemetry/uiEventTaxonomy";
import type { Lang } from "../../i18n";

type Workspace = "player" | "admin";

type ShellTopBarControllerOptions = {
  workspace: Workspace;
  uiPrefs: Record<string, unknown> | null | undefined;
  patchData: (patch: Record<string, unknown>) => void;
  trackUiEvent: (payload: Record<string, unknown>) => void;
  syncPrefs: (patch: Record<string, unknown>) => Promise<void> | void;
  toggleAdvanced: () => void;
  setLang: (next: Lang) => void;
  setWorkspace: (next: Workspace) => void;
  refreshBootstrap: () => Promise<void> | void;
};

function resolveWorkspaceFunnel(workspace: Workspace): string {
  return workspace === "admin" ? UI_FUNNEL_KEY.ADMIN_OPS : UI_FUNNEL_KEY.PLAYER_LOOP;
}

export function useShellTopBarController(options: ShellTopBarControllerOptions) {
  const onRefresh = useCallback(() => {
    void options.refreshBootstrap();
  }, [options]);

  const onToggleAdvanced = useCallback(
    (next: boolean) => {
      options.trackUiEvent({
        event_key: UI_EVENT_KEY.ADVANCED_TOGGLE,
        panel_key: UI_SURFACE_KEY.TOPBAR,
        funnel_key: resolveWorkspaceFunnel(options.workspace),
        surface_key: UI_SURFACE_KEY.TOPBAR,
        payload_json: { next }
      });
      options.toggleAdvanced();
      void options.syncPrefs({ advanced_view: next });
    },
    [options]
  );

  const onToggleReducedMotion = useCallback(
    (next: boolean) => {
      options.patchData({
        ui_prefs: {
          ...(options.uiPrefs || {}),
          reduced_motion: next
        } as any
      });
      void options.syncPrefs({ reduced_motion: next });
    },
    [options]
  );

  const onToggleLargeText = useCallback(
    (next: boolean) => {
      options.patchData({
        ui_prefs: {
          ...(options.uiPrefs || {}),
          large_text: next
        } as any
      });
      void options.syncPrefs({ large_text: next });
    },
    [options]
  );

  const onToggleLanguage = useCallback(
    (next: Lang) => {
      options.trackUiEvent({
        event_key: UI_EVENT_KEY.LANGUAGE_SWITCH,
        panel_key: UI_SURFACE_KEY.TOPBAR,
        funnel_key: resolveWorkspaceFunnel(options.workspace),
        surface_key: UI_SURFACE_KEY.TOPBAR,
        payload_json: { next }
      });
      options.setLang(next);
      void options.syncPrefs({ language: next });
    },
    [options]
  );

  const onToggleWorkspace = useCallback(
    (next: Workspace) => {
      options.trackUiEvent({
        event_key: UI_EVENT_KEY.WORKSPACE_SWITCH,
        panel_key: UI_SURFACE_KEY.TOPBAR,
        funnel_key: resolveWorkspaceFunnel(next),
        surface_key: UI_SURFACE_KEY.TOPBAR,
        payload_json: {
          from: options.workspace,
          to: next
        }
      });
      options.setWorkspace(next);
      void options.syncPrefs({ workspace: next });
    },
    [options]
  );

  return {
    onRefresh,
    onToggleAdvanced,
    onToggleReducedMotion,
    onToggleLargeText,
    onToggleLanguage,
    onToggleWorkspace
  };
}
