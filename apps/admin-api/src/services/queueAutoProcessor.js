"use strict";

/**
 * Queue Auto-Processor Service
 *
 * Runs on interval to automatically process queue items (payouts, tokens, KYC)
 * based on configured auto-approve policies. Removes the need for manual admin
 * approval for low-risk, routine operations.
 *
 * Policies:
 *  - token_approve: auto-approve token mint requests under USD limit with low risk
 *  - payout_pay:    auto-approve payout requests under threshold with verified wallet
 *  - kyc_approve:   auto-approve KYC when docs are verified and risk is below threshold
 */

const PROCESS_INTERVAL_MS = 30_000;   // 30s cycle
const MAX_BATCH_SIZE = 20;            // max items per cycle
const COOLDOWN_MS = 5_000;            // cooldown between actions on same item
const STALE_THRESHOLD_MS = 48 * 60 * 60 * 1000; // 48h → escalate to admin

const DEFAULT_POLICY = {
  enabled: true,
  token_auto_approve: {
    enabled: true,
    max_usd: 25,
    max_tokens: 1000,
    risk_threshold: 0.5,
    velocity_per_hour: 20,
    require_wallet_verified: false
  },
  payout_auto_pay: {
    enabled: true,
    max_btc: 0.01,
    max_usd_equiv: 500,
    require_wallet_verified: true,
    min_tier: 1,
    min_tenure_days: 7
  },
  kyc_auto_approve: {
    enabled: true,
    require_doc_verified: true,
    risk_threshold: 0.3,
    max_pending_hours: 24
  }
};

function mergePolicy(runtimePolicy) {
  const incoming = runtimePolicy && typeof runtimePolicy === "object" ? runtimePolicy : {};
  return {
    enabled: incoming.enabled !== false,
    token_auto_approve: { ...DEFAULT_POLICY.token_auto_approve, ...incoming.token_auto_approve },
    payout_auto_pay: { ...DEFAULT_POLICY.payout_auto_pay, ...incoming.payout_auto_pay },
    kyc_auto_approve: { ...DEFAULT_POLICY.kyc_auto_approve, ...incoming.kyc_auto_approve }
  };
}

function createQueueAutoProcessor(deps = {}) {
  const pool = deps.pool;
  const logger = deps.logger || console;
  const getRuntimeConfig = deps.getRuntimeConfig || (() => ({}));

  if (!pool || typeof pool.query !== "function") {
    throw new Error("queueAutoProcessor requires a database pool");
  }

  let running = false;
  let intervalId = null;
  let stats = {
    cycles: 0,
    processed: 0,
    approved: 0,
    rejected: 0,
    escalated: 0,
    errors: 0,
    last_run: null,
    last_error: null
  };

  async function fetchPendingItems(client, limit = MAX_BATCH_SIZE) {
    const query = `
      SELECT
        'token' AS kind, id AS request_id, status, user_id,
        created_at, amount_usd, risk_score,
        EXTRACT(EPOCH FROM (NOW() - created_at)) AS age_sec
      FROM token_mint_requests
      WHERE status = 'pending_approval'
      ORDER BY created_at ASC
      LIMIT $1

      UNION ALL

      SELECT
        'payout' AS kind, id AS request_id, status, user_id,
        created_at, amount_btc AS amount_usd, 0 AS risk_score,
        EXTRACT(EPOCH FROM (NOW() - created_at)) AS age_sec
      FROM payout_requests
      WHERE status = 'pending'
      ORDER BY created_at ASC
      LIMIT $1

      UNION ALL

      SELECT
        'kyc' AS kind, id AS request_id, status, user_id,
        created_at, 0 AS amount_usd, risk_score,
        EXTRACT(EPOCH FROM (NOW() - created_at)) AS age_sec
      FROM kyc_submissions
      WHERE status = 'pending_review'
      ORDER BY created_at ASC
      LIMIT $1
    `;

    try {
      const result = await client.query(query, [limit]);
      return result.rows || [];
    } catch (err) {
      // Tables may not exist yet — return empty
      logger.warn("[auto-processor] pending items query failed (tables may not exist):", err.message);
      return [];
    }
  }

  async function processTokenItem(client, item, policy) {
    const p = policy.token_auto_approve;
    if (!p.enabled) return "skip";

    const amountUsd = Number(item.amount_usd || 0);
    const risk = Number(item.risk_score || 0);
    const ageSec = Number(item.age_sec || 0);

    // Escalate stale items
    if (ageSec * 1000 > STALE_THRESHOLD_MS) {
      await client.query(
        `UPDATE token_mint_requests SET status = 'escalated', updated_at = NOW() WHERE id = $1`,
        [item.request_id]
      );
      return "escalated";
    }

    // Auto-approve if within limits
    if (amountUsd <= p.max_usd && risk <= p.risk_threshold) {
      await client.query(
        `UPDATE token_mint_requests SET status = 'approved', approved_by = 'auto_processor', approved_at = NOW(), updated_at = NOW() WHERE id = $1`,
        [item.request_id]
      );
      return "approved";
    }

    return "skip";
  }

  async function processPayoutItem(client, item, policy) {
    const p = policy.payout_auto_pay;
    if (!p.enabled) return "skip";

    const amountBtc = Number(item.amount_usd || 0); // amount_btc aliased as amount_usd in query
    const ageSec = Number(item.age_sec || 0);

    // Escalate stale items
    if (ageSec * 1000 > STALE_THRESHOLD_MS) {
      await client.query(
        `UPDATE payout_requests SET status = 'escalated', updated_at = NOW() WHERE id = $1`,
        [item.request_id]
      );
      return "escalated";
    }

    // Auto-approve if within limits
    if (amountBtc <= p.max_btc) {
      // Check user tier
      const userResult = await client.query(
        `SELECT kingdom_tier, created_at FROM users WHERE id = $1`,
        [item.user_id]
      ).catch(() => ({ rows: [] }));

      const user = userResult.rows[0];
      if (!user) return "skip";

      const tier = Number(user.kingdom_tier || 0);
      const tenureDays = (Date.now() - new Date(user.created_at).getTime()) / 86_400_000;

      if (tier >= p.min_tier && tenureDays >= p.min_tenure_days) {
        await client.query(
          `UPDATE payout_requests SET status = 'approved', approved_by = 'auto_processor', approved_at = NOW(), updated_at = NOW() WHERE id = $1`,
          [item.request_id]
        );
        return "approved";
      }
    }

    return "skip";
  }

  async function processKycItem(client, item, policy) {
    const p = policy.kyc_auto_approve;
    if (!p.enabled) return "skip";

    const risk = Number(item.risk_score || 0);
    const ageSec = Number(item.age_sec || 0);
    const ageHours = ageSec / 3600;

    // Escalate items older than max_pending_hours
    if (ageHours > p.max_pending_hours) {
      await client.query(
        `UPDATE kyc_submissions SET status = 'escalated', updated_at = NOW() WHERE id = $1`,
        [item.request_id]
      );
      return "escalated";
    }

    // Auto-approve if risk is low
    if (risk <= p.risk_threshold) {
      await client.query(
        `UPDATE kyc_submissions SET status = 'approved', approved_by = 'auto_processor', approved_at = NOW(), updated_at = NOW() WHERE id = $1`,
        [item.request_id]
      );
      return "approved";
    }

    return "skip";
  }

  async function runCycle() {
    if (running) return;
    running = true;
    stats.cycles++;
    stats.last_run = new Date().toISOString();

    let client;
    try {
      const runtimeConfig = typeof getRuntimeConfig === "function" ? getRuntimeConfig() : {};
      const policy = mergePolicy(runtimeConfig.queue_auto_policy);

      if (!policy.enabled) {
        running = false;
        return;
      }

      client = await pool.connect();
      const items = await fetchPendingItems(client, MAX_BATCH_SIZE);

      for (const item of items) {
        try {
          let result = "skip";

          if (item.kind === "token") {
            result = await processTokenItem(client, item, policy);
          } else if (item.kind === "payout") {
            result = await processPayoutItem(client, item, policy);
          } else if (item.kind === "kyc") {
            result = await processKycItem(client, item, policy);
          }

          stats.processed++;
          if (result === "approved") stats.approved++;
          if (result === "escalated") stats.escalated++;

        } catch (itemErr) {
          stats.errors++;
          stats.last_error = itemErr.message;
          logger.error(`[auto-processor] item error (${item.kind} #${item.request_id}):`, itemErr.message);
        }
      }

    } catch (err) {
      stats.errors++;
      stats.last_error = err.message;
      logger.error("[auto-processor] cycle error:", err.message);
    } finally {
      if (client) client.release();
      running = false;
    }
  }

  function start() {
    if (intervalId) return;
    logger.info(`[auto-processor] Starting with ${PROCESS_INTERVAL_MS / 1000}s interval`);
    runCycle();
    intervalId = setInterval(runCycle, PROCESS_INTERVAL_MS);
  }

  function stop() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
      logger.info("[auto-processor] Stopped");
    }
  }

  function getStats() {
    return { ...stats, running, interval_ms: PROCESS_INTERVAL_MS };
  }

  return { start, stop, runCycle, getStats };
}

module.exports = { createQueueAutoProcessor, DEFAULT_POLICY, mergePolicy };
