const DEFAULT_STATE_KEY = "primary";
const DEFAULT_LEASE_STALE_AFTER_SEC = 45;

async function hasBotRuntimeTables(db) {
  const result = await db.query(
    `SELECT
        to_regclass('public.bot_runtime_state') IS NOT NULL AS bot_runtime_state,
        to_regclass('public.bot_runtime_events') IS NOT NULL AS bot_runtime_events;`
  );
  const row = result.rows[0] || {};
  return Boolean(row.bot_runtime_state && row.bot_runtime_events);
}

async function upsertRuntimeState(db, payload) {
  const result = await db.query(
    `INSERT INTO bot_runtime_state (
       state_key,
       service_name,
       mode,
       alive,
       lock_acquired,
       lock_key,
       instance_ref,
       pid,
       hostname,
       service_env,
       started_at,
       last_heartbeat_at,
       stopped_at,
       last_error,
       state_json,
       updated_at,
       updated_by
     )
     VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
       $11, $12, $13, $14, $15::jsonb, now(), $16
     )
     ON CONFLICT (state_key)
     DO UPDATE SET
       service_name = EXCLUDED.service_name,
       mode = EXCLUDED.mode,
       alive = EXCLUDED.alive,
       lock_acquired = EXCLUDED.lock_acquired,
       lock_key = EXCLUDED.lock_key,
       instance_ref = EXCLUDED.instance_ref,
       pid = EXCLUDED.pid,
       hostname = EXCLUDED.hostname,
       service_env = EXCLUDED.service_env,
       started_at = COALESCE(EXCLUDED.started_at, bot_runtime_state.started_at),
       last_heartbeat_at = EXCLUDED.last_heartbeat_at,
       stopped_at = EXCLUDED.stopped_at,
       last_error = EXCLUDED.last_error,
       state_json = COALESCE(bot_runtime_state.state_json, '{}'::jsonb) || EXCLUDED.state_json,
       updated_at = now(),
       updated_by = EXCLUDED.updated_by
     RETURNING *;`,
    [
      String(payload.stateKey || DEFAULT_STATE_KEY),
      String(payload.serviceName || "airdropkral-bot"),
      String(payload.mode || "disabled"),
      Boolean(payload.alive),
      Boolean(payload.lockAcquired),
      Number(payload.lockKey || 0),
      String(payload.instanceRef || ""),
      Number(payload.pid || 0),
      String(payload.hostname || ""),
      String(payload.serviceEnv || ""),
      payload.startedAt || null,
      payload.lastHeartbeatAt || null,
      payload.stoppedAt || null,
      String(payload.lastError || ""),
      JSON.stringify(payload.stateJson || {}),
      Number(payload.updatedBy || 0)
    ]
  );
  return result.rows[0] || null;
}

function normalizeLeaseStaleAfterSec(value) {
  const parsed = Number(value || DEFAULT_LEASE_STALE_AFTER_SEC);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_LEASE_STALE_AFTER_SEC;
  }
  return Math.max(15, Math.min(600, Math.floor(parsed)));
}

async function tryAcquireRuntimeLease(db, payload = {}) {
  const stateKey = String(payload.stateKey || DEFAULT_STATE_KEY);
  const serviceName = String(payload.serviceName || "airdropkral-bot");
  const lockKey = Number(payload.lockKey || 0);
  const instanceRef = String(payload.instanceRef || "");
  const pid = Number(payload.pid || 0);
  const hostname = String(payload.hostname || "");
  const serviceEnv = String(payload.serviceEnv || "");
  const startedAt = payload.startedAt || new Date();
  const heartbeatAt = payload.lastHeartbeatAt || new Date();
  const lastError = String(payload.lastError || "");
  const stateJson = JSON.stringify(payload.stateJson || {});
  const updatedBy = Number(payload.updatedBy || 0);
  const staleAfterSec = normalizeLeaseStaleAfterSec(payload.staleAfterSec);
  const result = await db.query(
    `INSERT INTO bot_runtime_state (
       state_key,
       service_name,
       mode,
       alive,
       lock_acquired,
       lock_key,
       instance_ref,
       pid,
       hostname,
       service_env,
       started_at,
       last_heartbeat_at,
       stopped_at,
       last_error,
       state_json,
       updated_at,
       updated_by
     )
     VALUES (
       $1, $2, 'polling', TRUE, TRUE, $3, $4, $5, $6, $7,
       $8, $9, NULL, $10, $11::jsonb, now(), $12
     )
     ON CONFLICT (state_key)
     DO UPDATE SET
       service_name = EXCLUDED.service_name,
       mode = 'polling',
       alive = TRUE,
       lock_acquired = TRUE,
       lock_key = EXCLUDED.lock_key,
       instance_ref = EXCLUDED.instance_ref,
       pid = EXCLUDED.pid,
       hostname = EXCLUDED.hostname,
       service_env = EXCLUDED.service_env,
       started_at = COALESCE(bot_runtime_state.started_at, EXCLUDED.started_at),
       last_heartbeat_at = EXCLUDED.last_heartbeat_at,
       stopped_at = NULL,
       last_error = EXCLUDED.last_error,
       state_json = COALESCE(bot_runtime_state.state_json, '{}'::jsonb) || EXCLUDED.state_json,
       updated_at = now(),
       updated_by = EXCLUDED.updated_by
     WHERE
       bot_runtime_state.lock_acquired = FALSE
       OR bot_runtime_state.last_heartbeat_at IS NULL
       OR bot_runtime_state.last_heartbeat_at < now() - make_interval(secs => $13)
       OR bot_runtime_state.instance_ref = EXCLUDED.instance_ref
     RETURNING *;`,
    [
      stateKey,
      serviceName,
      lockKey,
      instanceRef,
      pid,
      hostname,
      serviceEnv,
      startedAt,
      heartbeatAt,
      lastError,
      stateJson,
      updatedBy,
      staleAfterSec
    ]
  );
  return result.rows[0] || null;
}

async function renewRuntimeLease(db, payload = {}) {
  const stateKey = String(payload.stateKey || DEFAULT_STATE_KEY);
  const instanceRef = String(payload.instanceRef || "");
  const serviceName = String(payload.serviceName || "airdropkral-bot");
  const lockKey = Number(payload.lockKey || 0);
  const pid = Number(payload.pid || 0);
  const hostname = String(payload.hostname || "");
  const serviceEnv = String(payload.serviceEnv || "");
  const heartbeatAt = payload.lastHeartbeatAt || new Date();
  const lastError = String(payload.lastError || "");
  const stateJson = JSON.stringify(payload.stateJson || {});
  const updatedBy = Number(payload.updatedBy || 0);
  const result = await db.query(
    `UPDATE bot_runtime_state
     SET service_name = $3,
         mode = 'polling',
         alive = TRUE,
         lock_acquired = TRUE,
         lock_key = $4,
         pid = $5,
         hostname = $6,
         service_env = $7,
         last_heartbeat_at = $8,
         stopped_at = NULL,
         last_error = $9,
         state_json = COALESCE(bot_runtime_state.state_json, '{}'::jsonb) || $10::jsonb,
         updated_at = now(),
         updated_by = $11
     WHERE state_key = $1
       AND instance_ref = $2
       AND lock_acquired = TRUE
     RETURNING *;`,
    [stateKey, instanceRef, serviceName, lockKey, pid, hostname, serviceEnv, heartbeatAt, lastError, stateJson, updatedBy]
  );
  return result.rows[0] || null;
}

async function releaseRuntimeLease(db, payload = {}) {
  const stateKey = String(payload.stateKey || DEFAULT_STATE_KEY);
  const instanceRef = String(payload.instanceRef || "");
  const heartbeatAt = payload.lastHeartbeatAt || new Date();
  const stoppedAt = payload.stoppedAt || new Date();
  const lastError = String(payload.lastError || "");
  const stateJson = JSON.stringify(payload.stateJson || {});
  const updatedBy = Number(payload.updatedBy || 0);
  const result = await db.query(
    `UPDATE bot_runtime_state
     SET mode = 'disabled',
         alive = FALSE,
         lock_acquired = FALSE,
         last_heartbeat_at = $3,
         stopped_at = $4,
         last_error = $5,
         state_json = COALESCE(bot_runtime_state.state_json, '{}'::jsonb) || $6::jsonb,
         updated_at = now(),
         updated_by = $7
     WHERE state_key = $1
       AND instance_ref = $2
     RETURNING *;`,
    [stateKey, instanceRef, heartbeatAt, stoppedAt, lastError, stateJson, updatedBy]
  );
  return result.rows[0] || null;
}

async function touchHeartbeat(db, payload = {}) {
  return upsertRuntimeState(db, {
    ...payload,
    stateKey: payload.stateKey || DEFAULT_STATE_KEY,
    mode: payload.mode || "polling",
    alive: payload.alive !== false,
    lastHeartbeatAt: payload.lastHeartbeatAt || new Date(),
    stoppedAt: payload.stoppedAt || null
  });
}

async function insertRuntimeEvent(db, payload) {
  const result = await db.query(
    `INSERT INTO bot_runtime_events (
       state_key,
       event_type,
       event_json
     )
     VALUES ($1, $2, $3::jsonb)
     RETURNING id, state_key, event_type, event_json, created_at;`,
    [
      String(payload.stateKey || DEFAULT_STATE_KEY),
      String(payload.eventType || "runtime"),
      JSON.stringify(payload.eventJson || {})
    ]
  );
  return result.rows[0] || null;
}

async function getRuntimeState(db, stateKey = DEFAULT_STATE_KEY) {
  const result = await db.query(
    `SELECT state_key, service_name, mode, alive, lock_acquired, lock_key, instance_ref, pid, hostname,
            service_env, started_at, last_heartbeat_at, stopped_at, last_error, state_json, updated_at, updated_by
     FROM bot_runtime_state
     WHERE state_key = $1
     LIMIT 1;`,
    [String(stateKey || DEFAULT_STATE_KEY)]
  );
  return result.rows[0] || null;
}

async function getRecentRuntimeEvents(db, stateKey = DEFAULT_STATE_KEY, limit = 20) {
  const safeLimit = Math.max(1, Math.min(200, Number(limit || 20)));
  const result = await db.query(
    `SELECT id, state_key, event_type, event_json, created_at
     FROM bot_runtime_events
     WHERE state_key = $1
     ORDER BY created_at DESC, id DESC
     LIMIT $2;`,
    [String(stateKey || DEFAULT_STATE_KEY), safeLimit]
  );
  return result.rows;
}

module.exports = {
  DEFAULT_STATE_KEY,
  DEFAULT_LEASE_STALE_AFTER_SEC,
  hasBotRuntimeTables,
  upsertRuntimeState,
  tryAcquireRuntimeLease,
  renewRuntimeLease,
  releaseRuntimeLease,
  touchHeartbeat,
  insertRuntimeEvent,
  getRuntimeState,
  getRecentRuntimeEvents
};
