/**
 * Blueprint Section 5: Zod validation schemas for v2 API contracts
 * Canonical data shapes shared between miniapp-shell and backend
 */
import { z } from 'zod';

// Blueprint: Unified currency model
export const CurrencyBalanceSchema = z.object({
  sc: z.number(),
  hc: z.number(),
  rc: z.number(),
  nxt: z.number().optional(),
  payout_available: z.number().optional(),
});

export type CurrencyBalance = z.infer<typeof CurrencyBalanceSchema>;

export const BootstrapSessionSchema = z.object({
  uid: z.string(),
  ts: z.string(),
  sig: z.string(),
  ttl_sec: z.number(),
});

export const BootstrapAdminSchema = z.object({
  is_admin: z.boolean(),
  telegram_id: z.number(),
  configured_admin_id: z.number(),
  summary: z.unknown().nullable().optional(),
});

export type BootstrapSession = z.infer<typeof BootstrapSessionSchema>;
export type BootstrapAdmin = z.infer<typeof BootstrapAdminSchema>;

// Blueprint: v2 bootstrap response
export const BootstrapResponseSchema = z.object({
  api_version: z.string(),
  success: z.boolean(),
  user: z.object({
    id: z.number(),
    telegram_id: z.number(),
    username: z.string().nullable(),
    kingdom_tier: z.number(),
    locale: z.string(),
  }).optional(),
  balances: CurrencyBalanceSchema.optional(),
  command_catalog: z.array(z.object({
    key: z.string(),
    description_tr: z.string(),
    description_en: z.string(),
    admin_only: z.boolean(),
  })).optional(),
  runtime_flags_effective: z.record(z.boolean()).optional(),
  wallet_capabilities: z.object({
    enabled: z.boolean(),
    chains: z.array(z.string()),
    verify_mode: z.string(),
  }).optional(),
  wallet_session: z.object({
    linked: z.boolean(),
    chain: z.string().nullable(),
    address: z.string().nullable(),
  }).nullable().optional(),
  kyc_status: z.object({
    required: z.boolean(),
    verified: z.boolean(),
    reason: z.string().nullable(),
  }).optional(),
  monetization: z.object({
    pass_active: z.boolean(),
    pass_expires_at: z.string().nullable(),
  }).optional(),
  session: BootstrapSessionSchema.optional(),
  admin: BootstrapAdminSchema.optional(),
});

export type BootstrapResponse = z.infer<typeof BootstrapResponseSchema>;

// Blueprint: Payout request state machine
export const PayoutStatusSchema = z.object({
  success: z.boolean(),
  payout_available: z.number(),
  latest_request: z.object({
    id: z.number(),
    status: z.enum(['draft', 'requested', 'risk_review', 'approved', 'batched', 'submitted', 'paid', 'failed', 'rejected', 'cancelled']),
    btc_amount: z.number(),
    btc_address: z.string(),
    tx_hash: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
  }).nullable(),
  gate: z.object({
    open: z.boolean(),
    min_market_cap_usd: z.number(),
    current_market_cap_usd: z.number().nullable(),
  }),
});

export type PayoutStatus = z.infer<typeof PayoutStatusSchema>;

// Blueprint: Token quote
export const TokenQuoteSchema = z.object({
  success: z.boolean(),
  price_usd: z.number(),
  supply: z.number(),
  market_cap_usd: z.number(),
  quote_quorum: z.object({
    decision: z.string(),
    provider_count: z.number(),
    ok_provider_count: z.number(),
    agreement_ratio: z.number(),
    quorum_price_usd: z.number().nullable(),
  }).optional(),
});

export type TokenQuote = z.infer<typeof TokenQuoteSchema>;

// Blueprint: Action request idempotency
export const ActionRequestSchema = z.object({
  action_request_id: z.string().min(1),
});

// Blueprint: Analytics event naming — family.object.verb (canonical module)
export {
  AnalyticsEventSchema,
  EVENT_FAMILIES,
  createEvent,
  type AnalyticsEvent,
  type EventFamily,
} from './analytics';
