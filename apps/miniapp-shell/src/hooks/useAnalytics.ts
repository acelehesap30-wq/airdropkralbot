/**
 * Blueprint: Analytics event naming — family.object.verb
 * Batched telemetry via /v2/telemetry/ui-events/batch
 */
'use client';

import { useCallback, useRef } from 'react';
import { apiFetch, endpoints } from '@/lib/api';
import { useAppStore } from '@/store/useAppStore';

interface AnalyticsEvent {
  event_name: string;
  occurred_at: string;
  surface: 'miniapp';
  route_key?: string;
  panel_key?: string;
  meta?: Record<string, unknown>;
}

const FLUSH_INTERVAL_MS = 6000; // Blueprint: WEBAPP_ANALYTICS_FLUSH_INTERVAL_MS
const MAX_BATCH_SIZE = 40; // Blueprint: WEBAPP_ANALYTICS_MAX_BATCH_SIZE

export function useAnalytics() {
  const bufferRef = useRef<AnalyticsEvent[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { userId } = useAppStore();

  const flush = useCallback(async () => {
    if (bufferRef.current.length === 0) return;

    const batch = bufferRef.current.splice(0, MAX_BATCH_SIZE);
    try {
      await apiFetch(endpoints.telemetryBatch, {
        method: 'POST',
        body: {
          user_id: userId,
          events: batch,
        },
      });
    } catch (err) {
      // Blueprint: analytics failures are non-blocking
      console.warn('[analytics] flush failed:', err);
      // Re-queue failed events (up to limit)
      if (bufferRef.current.length < MAX_BATCH_SIZE * 3) {
        bufferRef.current.unshift(...batch);
      }
    }
  }, [userId]);

  const track = useCallback(
    (eventName: string, routeKey?: string, panelKey?: string, meta?: Record<string, unknown>) => {
      bufferRef.current.push({
        event_name: eventName,
        occurred_at: new Date().toISOString(),
        surface: 'miniapp',
        route_key: routeKey,
        panel_key: panelKey,
        meta,
      });

      // Auto-flush when batch is full
      if (bufferRef.current.length >= MAX_BATCH_SIZE) {
        flush();
      }

      // Schedule flush if not already scheduled
      if (!timerRef.current) {
        timerRef.current = setTimeout(() => {
          flush();
          timerRef.current = null;
        }, FLUSH_INTERVAL_MS);
      }
    },
    [flush],
  );

  return { track, flush };
}
