type AuthPayload = {
  uid: string;
  ts: string;
  sig: string;
};

type FetchJsonOptions = {
  cache?: RequestCache;
};

type NetApiBridge = {
  fetchActiveAssetManifestMeta: (auth: AuthPayload, extra?: Record<string, string>) => Promise<any>;
  fetchSceneProfileEffective: (auth: AuthPayload) => Promise<any>;
  fetchTokenQuote: (auth: AuthPayload, usdAmount: number, chain: string) => Promise<any>;
  fetchTokenRouteStatus: (auth: AuthPayload) => Promise<any>;
  fetchTokenDecisionTraces: (auth: AuthPayload, limit?: number) => Promise<any>;
  fetchPvpSessionState: (auth: AuthPayload, sessionRef?: string) => Promise<any>;
  fetchPvpDiagnosticsLive: (auth: AuthPayload, bucketWindow?: string) => Promise<any>;
  fetchPvpMatchTick: (auth: AuthPayload, sessionRef: string) => Promise<any>;
  startPvpSession: (auth: AuthPayload, modeSuggested?: string, transport?: string) => Promise<any>;
  postPvpSessionAction: (
    auth: AuthPayload,
    payload: {
      session_ref: string;
      action_seq: number;
      input_action: string;
      latency_ms: number;
      client_ts: number;
    }
  ) => Promise<any>;
  resolvePvpSession: (auth: AuthPayload, sessionRef: string) => Promise<any>;
  fetchPvpLeaderboardLive: (auth: AuthPayload, limit?: number) => Promise<any>;
  fetchAdminQueues: (auth: AuthPayload) => Promise<any>;
  fetchAdminMetrics: (auth: AuthPayload) => Promise<any>;
  fetchAdminRuntime: (auth: AuthPayload, limit?: number) => Promise<any>;
  fetchAdminRuntimeFlags: (auth: AuthPayload) => Promise<any>;
  fetchAdminDeployStatus: (auth: AuthPayload) => Promise<any>;
  fetchAdminAuditPhaseStatus: (auth: AuthPayload, persist?: boolean) => Promise<any>;
  fetchAdminAuditDataIntegrity: (auth: AuthPayload) => Promise<any>;
  fetchAdminAssetStatus: (auth: AuthPayload) => Promise<any>;
  reconcileAdminSceneRuntime: (
    auth: AuthPayload,
    payload?: {
      scene_key?: string;
      reason?: string;
      force_refresh?: boolean;
      target_uid?: string;
    }
  ) => Promise<any>;
  postAdmin: (auth: AuthPayload, path: string, extraBody?: Record<string, unknown>) => Promise<any>;
};

declare global {
  interface Window {
    __AKR_NET_API__?: NetApiBridge;
  }
}

function asString(value: unknown): string {
  return String(value ?? "");
}

function asNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildQuery(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }
    search.set(key, asString(value));
  });
  return search.toString();
}

async function fetchJson(pathWithQuery: string, options: FetchJsonOptions = {}): Promise<any> {
  const res = await fetch(pathWithQuery, {
    cache: options.cache || "default"
  });
  const payload = await res.json();
  if (!res.ok || !payload?.success) {
    const err = new Error(payload?.error || `request_failed:${res.status}`);
    (err as any).code = res.status;
    throw err;
  }
  return payload;
}

async function postJson(path: string, body: Record<string, unknown>): Promise<any> {
  const res = await fetch(asString(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {})
  });
  const payload = await res.json();
  if (!res.ok || !payload?.success) {
    const err = new Error(payload?.error || `request_failed:${res.status}`);
    (err as any).code = res.status;
    throw err;
  }
  return payload;
}

async function fetchActiveAssetManifestMeta(
  auth: AuthPayload,
  extra: Record<string, string> = {}
): Promise<any> {
  const query = buildQuery({
    uid: auth?.uid,
    ts: auth?.ts,
    sig: auth?.sig,
    include_entries: "1",
    limit: "200",
    ...extra
  });
  return fetchJson(`/webapp/api/assets/manifest/active?${query}`, { cache: "no-store" });
}

async function fetchSceneProfileEffective(auth: AuthPayload): Promise<any> {
  const query = buildQuery({
    uid: auth?.uid,
    ts: auth?.ts,
    sig: auth?.sig
  });
  return fetchJson(`/webapp/api/scene/profile/effective?${query}`, { cache: "no-store" });
}

async function fetchTokenQuote(auth: AuthPayload, usdAmount: number, chain: string): Promise<any> {
  const query = buildQuery({
    uid: auth?.uid,
    ts: auth?.ts,
    sig: auth?.sig,
    usd: String(asNumber(usdAmount)),
    chain: asString(chain).toUpperCase()
  });
  return fetchJson(`/webapp/api/token/quote?${query}`);
}

async function fetchTokenRouteStatus(auth: AuthPayload): Promise<any> {
  const query = buildQuery({
    uid: auth?.uid,
    ts: auth?.ts,
    sig: auth?.sig
  });
  return fetchJson(`/webapp/api/token/route/status?${query}`, { cache: "no-store" });
}

async function fetchTokenDecisionTraces(auth: AuthPayload, limit = 40): Promise<any> {
  const safeLimit = Math.max(5, Math.min(100, Math.floor(asNumber(limit) || 40)));
  const query = buildQuery({
    uid: auth?.uid,
    ts: auth?.ts,
    sig: auth?.sig,
    limit: String(safeLimit)
  });
  return fetchJson(`/webapp/api/token/decision/traces?${query}`, { cache: "no-store" });
}

async function fetchPvpSessionState(auth: AuthPayload, sessionRef = ""): Promise<any> {
  const queryParams: Record<string, unknown> = {
    uid: auth?.uid,
    ts: auth?.ts,
    sig: auth?.sig
  };
  if (asString(sessionRef).trim()) {
    queryParams.session_ref = asString(sessionRef).trim();
  }
  const query = buildQuery(queryParams);
  return fetchJson(`/webapp/api/pvp/session/state?${query}`);
}

async function fetchPvpDiagnosticsLive(auth: AuthPayload, bucketWindow = "5m"): Promise<any> {
  const normalizedWindow = asString(bucketWindow || "5m").toLowerCase();
  const query = buildQuery({
    uid: auth?.uid,
    ts: auth?.ts,
    sig: auth?.sig,
    window: normalizedWindow
  });
  return fetchJson(`/webapp/api/pvp/diagnostics/live?${query}`, { cache: "no-store" });
}

async function fetchPvpMatchTick(auth: AuthPayload, sessionRef: string): Promise<any> {
  const clean = asString(sessionRef).trim();
  if (!clean) {
    throw new Error("session_ref_required");
  }
  const query = buildQuery({
    uid: auth?.uid,
    ts: auth?.ts,
    sig: auth?.sig,
    session_ref: clean
  });
  return fetchJson(`/webapp/api/pvp/match/tick?${query}`);
}

async function startPvpSession(auth: AuthPayload, modeSuggested = "balanced", transport = "poll"): Promise<any> {
  return postJson("/webapp/api/pvp/session/start", {
    uid: auth?.uid,
    ts: auth?.ts,
    sig: auth?.sig,
    request_id: `webapp_pvp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    mode_suggested: asString(modeSuggested) || "balanced",
    transport: asString(transport) || "poll"
  });
}

async function postPvpSessionAction(
  auth: AuthPayload,
  payload: {
    session_ref: string;
    action_seq: number;
    input_action: string;
    latency_ms: number;
    client_ts: number;
  }
): Promise<any> {
  return postJson("/webapp/api/pvp/session/action", {
    uid: auth?.uid,
    ts: auth?.ts,
    sig: auth?.sig,
    session_ref: asString(payload?.session_ref).trim(),
    action_seq: Math.max(1, Math.floor(asNumber(payload?.action_seq) || 1)),
    input_action: asString(payload?.input_action).toLowerCase(),
    latency_ms: Math.max(0, Math.floor(asNumber(payload?.latency_ms) || 0)),
    client_ts: Math.max(0, Math.floor(asNumber(payload?.client_ts) || Date.now()))
  });
}

async function resolvePvpSession(auth: AuthPayload, sessionRef: string): Promise<any> {
  const clean = asString(sessionRef).trim();
  if (!clean) {
    throw new Error("pvp_session_not_found");
  }
  return postJson("/webapp/api/pvp/session/resolve", {
    uid: auth?.uid,
    ts: auth?.ts,
    sig: auth?.sig,
    session_ref: clean
  });
}

async function fetchPvpLeaderboardLive(auth: AuthPayload, limit = 10): Promise<any> {
  const safeLimit = Math.max(1, Math.min(50, Math.floor(asNumber(limit) || 10)));
  const query = buildQuery({
    uid: auth?.uid,
    ts: auth?.ts,
    sig: auth?.sig,
    limit: String(safeLimit)
  });
  return fetchJson(`/webapp/api/pvp/leaderboard/live?${query}`);
}

async function fetchAdminQueues(auth: AuthPayload): Promise<any> {
  const query = buildQuery({
    uid: auth?.uid,
    ts: auth?.ts,
    sig: auth?.sig
  });
  return fetchJson(`/webapp/api/admin/queues?${query}`);
}

async function fetchAdminMetrics(auth: AuthPayload): Promise<any> {
  const query = buildQuery({
    uid: auth?.uid,
    ts: auth?.ts,
    sig: auth?.sig
  });
  return fetchJson(`/webapp/api/admin/metrics?${query}`);
}

async function fetchAdminRuntime(auth: AuthPayload, limit = 20): Promise<any> {
  const safeLimit = Math.max(1, Math.min(100, Math.floor(asNumber(limit) || 20)));
  const query = buildQuery({
    uid: auth?.uid,
    ts: auth?.ts,
    sig: auth?.sig,
    limit: String(safeLimit)
  });
  return fetchJson(`/webapp/api/admin/runtime/bot?${query}`);
}

async function fetchAdminRuntimeFlags(auth: AuthPayload): Promise<any> {
  const query = buildQuery({
    uid: auth?.uid,
    ts: auth?.ts,
    sig: auth?.sig
  });
  return fetchJson(`/webapp/api/admin/runtime/flags?${query}`, { cache: "no-store" });
}

async function fetchAdminDeployStatus(auth: AuthPayload): Promise<any> {
  const query = buildQuery({
    uid: auth?.uid,
    ts: auth?.ts,
    sig: auth?.sig
  });
  return fetchJson(`/webapp/api/admin/runtime/deploy/status?${query}`, { cache: "no-store" });
}

async function fetchAdminAuditPhaseStatus(auth: AuthPayload, persist = false): Promise<any> {
  const query = buildQuery({
    uid: auth?.uid,
    ts: auth?.ts,
    sig: auth?.sig,
    persist: persist ? "1" : "0"
  });
  return fetchJson(`/webapp/api/admin/runtime/audit/phase-status?${query}`, { cache: "no-store" });
}

async function fetchAdminAuditDataIntegrity(auth: AuthPayload): Promise<any> {
  const query = buildQuery({
    uid: auth?.uid,
    ts: auth?.ts,
    sig: auth?.sig
  });
  return fetchJson(`/webapp/api/admin/runtime/audit/data-integrity?${query}`, { cache: "no-store" });
}

async function fetchAdminAssetStatus(auth: AuthPayload): Promise<any> {
  const query = buildQuery({
    uid: auth?.uid,
    ts: auth?.ts,
    sig: auth?.sig
  });
  return fetchJson(`/webapp/api/admin/assets/status?${query}`);
}

async function reconcileAdminSceneRuntime(
  auth: AuthPayload,
  payload: {
    scene_key?: string;
    reason?: string;
    force_refresh?: boolean;
    target_uid?: string;
  } = {}
): Promise<any> {
  return postJson("/webapp/api/admin/runtime/scene/reconcile", {
    uid: auth?.uid,
    ts: auth?.ts,
    sig: auth?.sig,
    scene_key: payload?.scene_key || "nexus_arena",
    reason: payload?.reason || "asset_reload_sync",
    force_refresh: Boolean(payload?.force_refresh),
    ...(payload?.target_uid ? { target_uid: asString(payload.target_uid) } : {})
  });
}

async function postAdmin(
  auth: AuthPayload,
  path: string,
  extraBody: Record<string, unknown> = {}
): Promise<any> {
  const res = await fetch(asString(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      uid: auth?.uid,
      ts: auth?.ts,
      sig: auth?.sig,
      ...extraBody
    })
  });
  const payload = await res.json();
  if (!res.ok || !payload?.success) {
    const err = new Error(payload?.error || `admin_action_failed:${res.status}`);
    (err as any).code = res.status;
    throw err;
  }
  return payload;
}

export function installNetApiBridge(): void {
  window.__AKR_NET_API__ = {
    fetchActiveAssetManifestMeta,
    fetchSceneProfileEffective,
    fetchTokenQuote,
    fetchTokenRouteStatus,
    fetchTokenDecisionTraces,
    fetchPvpSessionState,
    fetchPvpDiagnosticsLive,
    fetchPvpMatchTick,
    startPvpSession,
    postPvpSessionAction,
    resolvePvpSession,
    fetchPvpLeaderboardLive,
    fetchAdminQueues,
    fetchAdminMetrics,
    fetchAdminRuntime,
    fetchAdminRuntimeFlags,
    fetchAdminDeployStatus,
    fetchAdminAuditPhaseStatus,
    fetchAdminAuditDataIntegrity,
    fetchAdminAssetStatus,
    reconcileAdminSceneRuntime,
    postAdmin
  };
}
