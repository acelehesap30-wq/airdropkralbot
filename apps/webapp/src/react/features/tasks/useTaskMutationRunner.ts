import { useCallback } from "react";
import type { RunRetriableApiCall } from "../shared/useRetriableAction";

type RunMutationTelemetry = {
  panelKey?: string;
  funnelKey?: string;
  surfaceKey?: string;
  economyEventKey?: string;
  txState?: string;
  actionKey?: string;
};

export type RunTaskMutation = (
  runner: (attempt: number) => Promise<any>,
  fallback: string,
  telemetry?: RunMutationTelemetry
) => Promise<void>;

type TaskMutationRunnerOptions = {
  runRetriableApiCall: RunRetriableApiCall;
  setLoading: (next: boolean) => void;
  setTaskResult: (next: any) => void;
  refreshBootstrap: () => Promise<void> | void;
};

export function useTaskMutationRunner(options: TaskMutationRunnerOptions) {
  const runMutation: RunTaskMutation = useCallback(
    async (runner, fallback, telemetry = {}) => {
      options.setLoading(true);
      const res = await options.runRetriableApiCall(runner, fallback, {
        maxAttempts: 3,
        baseDelayMs: 220,
        telemetry
      });
      if (!res?.success) {
        options.setLoading(false);
        return;
      }
      options.setTaskResult(res.data || null);
      await options.refreshBootstrap();
    },
    [options]
  );

  return {
    runMutation
  };
}
