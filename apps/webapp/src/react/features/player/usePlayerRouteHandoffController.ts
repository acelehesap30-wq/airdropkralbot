import { useCallback, useState } from "react";
import { resolvePlayerRouteHandoff } from "../../../core/player/playerRouteHandoff.js";
import { UI_EVENT_KEY, UI_FUNNEL_KEY, UI_SURFACE_KEY } from "../../../core/telemetry/uiEventTaxonomy";
import type { LaunchContext, TabKey } from "../../types";

type RouteTargetInput = {
  routeKey?: string;
  panelKey?: string;
  focusKey?: string;
  tab?: TabKey;
  sourcePanelKey?: string;
};

type PlayerRouteHandoffControllerOptions = {
  currentTab: TabKey;
  onTabChange: (next: TabKey) => void;
  trackUiEvent: (payload: Record<string, unknown>) => void;
};

function resolveFunnelKey(tab: TabKey) {
  if (tab === "pvp") {
    return UI_FUNNEL_KEY.PVP_LOOP;
  }
  if (tab === "tasks") {
    return UI_FUNNEL_KEY.TASKS_LOOP;
  }
  if (tab === "vault") {
    return UI_FUNNEL_KEY.VAULT_LOOP;
  }
  return UI_FUNNEL_KEY.PLAYER_LOOP;
}

export function usePlayerRouteHandoffController(options: PlayerRouteHandoffControllerOptions) {
  const [handoffContext, setHandoffContext] = useState<LaunchContext | null>(null);
  const [handoffRequestKey, setHandoffRequestKey] = useState(0);

  const routeToTarget = useCallback(
    (input: RouteTargetInput) => {
      const target = resolvePlayerRouteHandoff({
        routeKey: input.routeKey,
        panelKey: input.panelKey,
        focusKey: input.focusKey,
        tab: input.tab
      }) as LaunchContext;
      const targetTab = (target.tab || "home") as TabKey;
      const eventKey = targetTab === options.currentTab ? UI_EVENT_KEY.PANEL_OPEN : UI_EVENT_KEY.TAB_SWITCH;

      setHandoffContext(target);
      setHandoffRequestKey((value) => value + 1);
      options.trackUiEvent({
        event_key: eventKey,
        tab_key: targetTab,
        panel_key: target.panel_key || UI_SURFACE_KEY.SHELL,
        route_key: target.route_key || "",
        focus_key: target.focus_key || "",
        funnel_key: resolveFunnelKey(targetTab),
        surface_key: input.sourcePanelKey || UI_SURFACE_KEY.SHELL,
        payload_json: {
          source: "player_shell_handoff",
          source_panel_key: input.sourcePanelKey || UI_SURFACE_KEY.SHELL,
          target_panel_key: target.panel_key || "",
          from_tab: options.currentTab
        }
      });

      if (targetTab !== options.currentTab) {
        options.onTabChange(targetTab);
      }
    },
    [options.currentTab, options.onTabChange, options.trackUiEvent]
  );

  return {
    handoffContext,
    handoffRequestKey,
    routeToTarget
  };
}
