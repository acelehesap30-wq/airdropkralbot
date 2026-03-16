/**
 * Blueprint: signed query/body fields (uid, ts, sig) with WEBAPP_HMAC_SECRET
 * All API calls go through the admin API v2 endpoints
 */

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  'https://webapp.k99-exchange.xyz/webapp/api';

interface ApiOptions {
  method?: 'GET' | 'POST';
  body?: Record<string, unknown>;
  signal?: AbortSignal;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  opts: ApiOptions = {},
): Promise<T> {
  const { method = 'GET', body, signal } = opts;

  const url = `${API_BASE}${path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });

  const json = await res.json();

  if (!res.ok || json.success === false) {
    throw new ApiError(
      res.status,
      json.error_code ?? json.error ?? 'unknown',
      json.message ?? json.error ?? `API error ${res.status}`,
    );
  }

  return json as T;
}

// Blueprint v2 endpoints
export const endpoints = {
  bootstrap: '/v2/bootstrap',
  payoutStatus: '/v2/payout/status',
  payoutRequest: '/v2/payout/request',
  pvpProgression: '/v2/pvp/progression',
  walletChallenge: '/v2/wallet/challenge',
  walletVerify: '/v2/wallet/verify',
  walletSession: '/v2/wallet/session',
  walletUnlink: '/v2/wallet/unlink',
  tokenSummary: '/token/summary',
  tokenMint: '/token/mint',
  tokenBuyIntent: '/token/buy_intent',
  tokenSubmitTx: '/token/submit_tx',
  tokenQuote: '/token/quote',
  arenaSessionStart: '/arena/session/start',
  arenaSessionAction: '/arena/session/action',
  arenaSessionResolve: '/arena/session/resolve',
  arenaSessionState: '/arena/session/state',
  raidSessionStart: '/arena/raid/session/start',
  raidSessionAction: '/arena/raid/session/action',
  raidSessionResolve: '/arena/raid/session/resolve',
  raidSessionState: '/arena/raid/session/state',
  arenaLeaderboard: '/arena/leaderboard',
  arenaDirector: '/arena/director',
  tasksReroll: '/tasks/reroll',
  actionsAccept: '/actions/accept',
  actionsComplete: '/actions/complete',
  actionsReveal: '/actions/reveal',
  claimMission: '/actions/claim_mission',
  telemetryBatch: '/v2/telemetry/ui-events/batch',
} as const;
