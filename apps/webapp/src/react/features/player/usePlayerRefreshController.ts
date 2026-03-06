import { useCallback, type MutableRefObject } from "react";
import { UI_EVENT_KEY, UI_FUNNEL_KEY, UI_SURFACE_KEY } from "../../../core/telemetry/uiEventTaxonomy";
import type { WebAppApiResponse, WebAppAuth } from "../../types";

type RefetchableQuery = {
  refetch: () => Promise<any>;
};

type LazyQueryRunner = (payload: Record<string, unknown>) => { unwrap: () => Promise<any> };

type PlayerRefreshControllerOptions = {
  hasActiveAuth: boolean;
  activeAuth: WebAppAuth;
  pvpRuntimeSession: Record<string, unknown> | null;
  pvpLiveRefreshInFlightRef: MutableRefObject<boolean>;
  trackUiEvent: (payload: Record<string, unknown>) => void;
  setError: (next: string) => void;
  asError: (payload: WebAppApiResponse | null | undefined, fallback?: string) => string;
  applySession: (payload: any) => void;
  setHomeFeed: (next: any) => void;
  setLeagueOverview: (next: any) => void;
  setPvpLive: (next: any) => void;
  homeFeedQuery: RefetchableQuery;
  leagueOverviewQuery: RefetchableQuery;
  loadPvpLeaderboardLive: LazyQueryRunner;
  loadPvpDiagnosticsLive: LazyQueryRunner;
  loadPvpMatchTick: LazyQueryRunner;
};

function readSessionRef(payload: any): string {
  return String(payload?.session?.session_ref || payload?.session_ref || "").trim();
}

export function usePlayerRefreshController(options: PlayerRefreshControllerOptions) {
  const refreshHome = useCallback(async () => {
    if (!options.hasActiveAuth) return;
    options.trackUiEvent({
      event_key: UI_EVENT_KEY.REFRESH_REQUEST,
      panel_key: UI_SURFACE_KEY.PANEL_HOME,
      funnel_key: UI_FUNNEL_KEY.PLAYER_LOOP,
      surface_key: UI_SURFACE_KEY.PANEL_HOME,
      payload_json: { target: "home_feed" }
    });
    const refreshed = await options.homeFeedQuery.refetch().catch(() => null);
    const payload = (refreshed?.data || null) as WebAppApiResponse | null;
    if (!payload?.success) {
      const nextError = options.asError(payload, "home_feed_failed");
      options.setError(nextError);
      options.trackUiEvent({
        event_key: UI_EVENT_KEY.REFRESH_FAILED,
        panel_key: UI_SURFACE_KEY.PANEL_HOME,
        funnel_key: UI_FUNNEL_KEY.PLAYER_LOOP,
        surface_key: UI_SURFACE_KEY.PANEL_HOME,
        payload_json: { target: "home_feed", error: nextError }
      });
      return;
    }
    options.setHomeFeed(payload.data || null);
    options.trackUiEvent({
      event_key: UI_EVENT_KEY.REFRESH_SUCCESS,
      panel_key: UI_SURFACE_KEY.PANEL_HOME,
      funnel_key: UI_FUNNEL_KEY.PLAYER_LOOP,
      surface_key: UI_SURFACE_KEY.PANEL_HOME,
      payload_json: { target: "home_feed" }
    });
  }, [options]);

  const refreshLeagueOverview = useCallback(async () => {
    if (!options.hasActiveAuth) return;
    options.trackUiEvent({
      event_key: UI_EVENT_KEY.REFRESH_REQUEST,
      panel_key: UI_SURFACE_KEY.PANEL_PVP,
      funnel_key: UI_FUNNEL_KEY.PVP_LOOP,
      surface_key: UI_SURFACE_KEY.PANEL_PVP,
      payload_json: { target: "league_overview" }
    });
    const refreshed = await options.leagueOverviewQuery.refetch().catch(() => null);
    const payload = (refreshed?.data || null) as WebAppApiResponse | null;
    if (!payload?.success) {
      const nextError = options.asError(payload, "league_overview_failed");
      options.setError(nextError);
      options.trackUiEvent({
        event_key: UI_EVENT_KEY.REFRESH_FAILED,
        panel_key: UI_SURFACE_KEY.PANEL_PVP,
        funnel_key: UI_FUNNEL_KEY.PVP_LOOP,
        surface_key: UI_SURFACE_KEY.PANEL_PVP,
        payload_json: { target: "league_overview", error: nextError }
      });
      return;
    }
    options.setLeagueOverview(payload.data || null);
    options.trackUiEvent({
      event_key: UI_EVENT_KEY.REFRESH_SUCCESS,
      panel_key: UI_SURFACE_KEY.PANEL_PVP,
      funnel_key: UI_FUNNEL_KEY.PVP_LOOP,
      surface_key: UI_SURFACE_KEY.PANEL_PVP,
      payload_json: { target: "league_overview" }
    });
  }, [options]);

  const refreshPvpLive = useCallback(
    async (sessionRefHint = "") => {
      if (!options.hasActiveAuth) return;
      if (options.pvpLiveRefreshInFlightRef.current) return;
      options.pvpLiveRefreshInFlightRef.current = true;
      const sessionRef = String(sessionRefHint || readSessionRef(options.pvpRuntimeSession || null) || "").trim();
      try {
        options.trackUiEvent({
          event_key: UI_EVENT_KEY.REFRESH_REQUEST,
          panel_key: UI_SURFACE_KEY.PANEL_PVP,
          funnel_key: UI_FUNNEL_KEY.PVP_LOOP,
          surface_key: UI_SURFACE_KEY.PANEL_PVP,
          payload_json: { target: "pvp_live" }
        });
        const [leaderboard, diagnostics, tick] = await Promise.all([
          options
            .loadPvpLeaderboardLive({
              auth: options.activeAuth,
              limit: 25
            })
            .unwrap()
            .catch(() => null),
          options
            .loadPvpDiagnosticsLive({
              auth: options.activeAuth,
              window: "1h"
            })
            .unwrap()
            .catch(() => null),
          sessionRef
            ? options
                .loadPvpMatchTick({
                  auth: options.activeAuth,
                  session_ref: sessionRef
                })
                .unwrap()
                .catch(() => null)
            : Promise.resolve(null)
        ]);
        options.applySession(leaderboard);
        options.applySession(diagnostics);
        options.applySession(tick);
        const hasData = Boolean(leaderboard?.success || diagnostics?.success || tick?.success);
        if (!hasData) {
          options.setError("pvp_live_failed");
          options.trackUiEvent({
            event_key: UI_EVENT_KEY.REFRESH_FAILED,
            panel_key: UI_SURFACE_KEY.PANEL_PVP,
            funnel_key: UI_FUNNEL_KEY.PVP_LOOP,
            surface_key: UI_SURFACE_KEY.PANEL_PVP,
            payload_json: { target: "pvp_live", error: "pvp_live_failed" }
          });
          return;
        }
        options.setPvpLive({
          leaderboard: leaderboard?.data || null,
          diagnostics: diagnostics?.data || null,
          tick: tick?.data || null
        });
        options.trackUiEvent({
          event_key: UI_EVENT_KEY.REFRESH_SUCCESS,
          panel_key: UI_SURFACE_KEY.PANEL_PVP,
          funnel_key: UI_FUNNEL_KEY.PVP_LOOP,
          surface_key: UI_SURFACE_KEY.PANEL_PVP,
          payload_json: {
            target: "pvp_live",
            leaderboard_success: Boolean(leaderboard?.success),
            diagnostics_success: Boolean(diagnostics?.success),
            tick_success: Boolean(tick?.success)
          }
        });
      } finally {
        options.pvpLiveRefreshInFlightRef.current = false;
      }
    },
    [options]
  );

  return {
    refreshHome,
    refreshLeagueOverview,
    refreshPvpLive
  };
}
