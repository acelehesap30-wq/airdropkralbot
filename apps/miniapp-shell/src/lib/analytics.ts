/**
 * Blueprint: Client-side analytics tracker for the miniapp surface.
 *
 * - Batches events in memory and flushes every 5 seconds or on page hide.
 * - POSTs to /webapp/api/v2/analytics/events
 * - Never blocks the UI — all errors are swallowed silently.
 */
import {
  createEvent,
  type EventFamily,
  type AnalyticsEvent,
} from '@airdropkralbot/contracts';
import { useAppStore } from '../store/useAppStore';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const FLUSH_INTERVAL_MS = 5_000;
const ANALYTICS_ENDPOINT =
  (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://webapp.k99-exchange.xyz/webapp/api') +
  '/v2/analytics/events';

// ---------------------------------------------------------------------------
// Internal queue
// ---------------------------------------------------------------------------

let queue: AnalyticsEvent[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;

// ---------------------------------------------------------------------------
// flush — send queued events to the backend
// ---------------------------------------------------------------------------

async function flush(): Promise<void> {
  if (queue.length === 0) return;

  // Snapshot and clear — so new events during the POST go into a fresh batch
  const batch = queue;
  queue = [];

  try {
    const keepalive = true; // allows request to outlive the page
    await fetch(ANALYTICS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: batch }),
      keepalive,
    });
  } catch {
    // Blueprint: analytics must never block UI — silently discard on failure.
    // Optionally: push back to queue for retry. For now, fire-and-forget.
  }
}

// ---------------------------------------------------------------------------
// Lifecycle — start / stop the periodic flush timer
// ---------------------------------------------------------------------------

function ensureTimer(): void {
  if (flushTimer !== null) return;

  flushTimer = setInterval(() => {
    void flush();
  }, FLUSH_INTERVAL_MS);

  // Flush on page hide (tab switch, app backgrounding, navigation)
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        void flush();
      }
    });

    // Belt-and-suspenders: also flush on beforeunload
    window.addEventListener('beforeunload', () => {
      void flush();
    });
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Track a canonical analytics event.
 *
 * Dimensions `user_id`, `session_ref`, `surface`, and `locale` are
 * automatically pulled from the global app store.  The caller supplies the
 * event name plus any extra properties and optional route/panel keys.
 *
 * @example
 *   trackEvent('miniapp.route.viewed', { route_key: 'hub' });
 *   trackEvent('economy.currency.earned', { properties: { amount: 100, currency: 'sc' } });
 */
export function trackEvent(
  name: EventFamily,
  extras: {
    route_key?: string;
    panel_key?: string;
    properties?: Record<string, unknown>;
  } = {},
): void {
  try {
    const state = useAppStore.getState();

    // Guard: cannot track before bootstrap
    if (!state.userId || !state.session?.uid) return;

    const event = createEvent({
      event_name: name,
      user_id: state.userId,
      session_ref: state.session.uid,
      surface: 'miniapp',
      locale: state.locale,
      route_key: extras.route_key,
      panel_key: extras.panel_key,
      properties: extras.properties,
    });

    queue.push(event);
    ensureTimer();
  } catch {
    // Blueprint: never throw from analytics code
  }
}

/**
 * Force-flush any queued events immediately.
 * Useful during explicit navigation transitions or logout.
 */
export function flushEvents(): Promise<void> {
  return flush();
}

/**
 * Returns the current queue length (useful for tests / devtools).
 */
export function pendingEventCount(): number {
  return queue.length;
}
