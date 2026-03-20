/**
 * Blueprint: Analytics event naming contract — family.object.verb
 * Canonical schema and factory shared across all surfaces.
 */
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Event families — exhaustive list of canonical event names
// ---------------------------------------------------------------------------

export const EVENT_FAMILIES = [
  // Chat surface
  'chat.command.executed',
  'chat.intent.resolved',
  // Miniapp surface
  'miniapp.route.viewed',
  'miniapp.action.tapped',
  'miniapp.scene.loaded',
  // Economy
  'economy.currency.earned',
  'economy.currency.spent',
  'economy.payout.requested',
  'economy.payout.completed',
  // Progression
  'progression.mission.accepted',
  'progression.mission.completed',
  'progression.streak.maintained',
  'progression.streak.broken',
  'progression.quest.step_completed',
  'progression.quest.chain_completed',
  // PvP
  'pvp.match.started',
  'pvp.match.completed',
  'pvp.elo.updated',
  // Social
  'social.invite.sent',
  'social.friend.added',
  // Chest / Loot
  'chest.reveal.opened',
  'chest.reveal.rare_drop',
  'chest.pity.triggered',
  // NFT
  'nft.mint.requested',
  'nft.mint.completed',
  // Performance telemetry
  'perf.api.response_time',
  'perf.scene.frame_rate',
  'perf.scene.load_time',
  'perf.ws.latency',
  'perf.db.query_time',
  'perf.boot.cold_start',
  'perf.boot.warm_start',
  // Admin
  'admin.action.executed',
  'admin.action.confirmed',
  // Wallet
  'wallet.challenge.issued',
  'wallet.proof.verified',
  'wallet.session.linked',
] as const;

export type EventFamily = (typeof EVENT_FAMILIES)[number];

// ---------------------------------------------------------------------------
// Zod schema — all required dimensions per blueprint spec
// ---------------------------------------------------------------------------

export const AnalyticsEventSchema = z.object({
  /** UUID v4 — unique per event instance */
  event_id: z.string().uuid(),
  /** Canonical family.object.verb name */
  event_name: z.enum(EVENT_FAMILIES),
  /** ISO-8601 timestamp of when the event occurred */
  occurred_at: z.string().datetime({ offset: true }),
  /** Internal user id (from bootstrap) */
  user_id: z.number().int().positive(),
  /** Session reference token (uid from bootstrap session) */
  session_ref: z.string().min(1),
  /** Originating surface */
  surface: z.enum(['chat', 'miniapp', 'admin']),
  /** Active route key when event fired (e.g. 'hub', 'arena') */
  route_key: z.string().optional(),
  /** Active panel key when event fired */
  panel_key: z.string().optional(),
  /** Active locale */
  locale: z.string().min(1),
  /** Arbitrary extra properties attached to the event */
  properties: z.record(z.unknown()).optional(),
});

export type AnalyticsEvent = z.infer<typeof AnalyticsEventSchema>;

// ---------------------------------------------------------------------------
// Factory — creates a validated event with auto-populated id + timestamp
// ---------------------------------------------------------------------------

/**
 * Create an AnalyticsEvent.
 *
 * `event_id` and `occurred_at` are generated automatically when omitted.
 * All other required dimensions must be supplied by the caller.
 */
export function createEvent(
  input: Omit<AnalyticsEvent, 'event_id' | 'occurred_at'> & {
    event_id?: string;
    occurred_at?: string;
  },
): AnalyticsEvent {
  const event: AnalyticsEvent = {
    event_id: input.event_id ?? crypto.randomUUID(),
    occurred_at: input.occurred_at ?? new Date().toISOString(),
    event_name: input.event_name,
    user_id: input.user_id,
    session_ref: input.session_ref,
    surface: input.surface,
    locale: input.locale,
    ...(input.route_key !== undefined && { route_key: input.route_key }),
    ...(input.panel_key !== undefined && { panel_key: input.panel_key }),
    ...(input.properties !== undefined && { properties: input.properties }),
  };

  // Validate at runtime — throws ZodError if something is off
  return AnalyticsEventSchema.parse(event);
}
