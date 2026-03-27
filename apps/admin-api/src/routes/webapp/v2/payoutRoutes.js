"use strict";

const crypto = require("crypto");
const { normalizeV2Payload } = require("./shared/v2ResponseNormalizer");

const PAYOUT_V2_ERROR_MAP = Object.freeze({
  market_cap_gate: "market_cap_gate_closed",
  payout_not_eligible: "tier_locked",
  duplicate_or_locked_request: "idempotency_conflict",
  kyc_tables_missing: "kyc_unavailable"
});

const SUPPORTED_CHAINS = new Set(["TON", "ETH", "BTC", "TRX", "SOL", "BSC"]);
const EXEC_TOKEN_TTL_SEC = 300; // 5 minutes

function registerWebappV2PayoutRoutes(fastify, deps = {}) {
  const proxyWebAppApiV1 = deps.proxyWebAppApiV1;
  const pool = deps.pool;
  const verifyAdminToken = deps.verifyAdminToken;

  if (typeof proxyWebAppApiV1 !== "function") {
    throw new Error("registerWebappV2PayoutRoutes requires proxyWebAppApiV1");
  }

  fastify.get("/webapp/api/v2/payout/status", async (request, reply) => {
    await proxyWebAppApiV1(request, reply, {
      targetPath: "/webapp/api/payout/status",
      method: "GET",
      transform: (payload) => normalizeV2Payload(payload, { errorMap: PAYOUT_V2_ERROR_MAP })
    });
  });

  fastify.post(
    "/webapp/api/v2/payout/request",
    {
      schema: {
        body: {
          type: "object",
          required: ["uid", "ts", "sig"],
          properties: {
            uid: { type: "string" },
            ts: { type: "string" },
            sig: { type: "string" },
            currency: { type: "string", minLength: 3, maxLength: 6 }
          }
        }
      }
    },
    async (request, reply) => {
      await proxyWebAppApiV1(request, reply, {
        targetPath: "/webapp/api/payout/request",
        method: "POST",
        transform: (payload) => normalizeV2Payload(payload, { errorMap: PAYOUT_V2_ERROR_MAP })
      });
    }
  );

  // ═══════════════════════════════════════════════════════════════
  // Blueprint §4 — Operator execution endpoint
  // POST /admin/api/v2/payout/execute
  // Records operator-submitted tx_hash and reconciles payout_request
  // ═══════════════════════════════════════════════════════════════
  fastify.post(
    "/admin/api/v2/payout/execute",
    {
      schema: {
        body: {
          type: "object",
          required: ["payout_request_id", "tx_hash", "chain", "admin_token"],
          properties: {
            payout_request_id: { type: "integer", minimum: 1 },
            tx_hash: { type: "string", minLength: 10, maxLength: 128 },
            chain: { type: "string", minLength: 2, maxLength: 8 },
            amount_native: { type: "string", maxLength: 64 },
            destination_address: { type: "string", maxLength: 256 },
            admin_token: { type: "string", minLength: 8, maxLength: 256 },
            confirm_token: { type: "string", minLength: 8, maxLength: 256 },
            notes: { type: "string", maxLength: 512 }
          }
        }
      }
    },
    async (request, reply) => {
      // Verify admin token
      const adminToken = String(request.body.admin_token || "").trim();
      const expectedToken = String(process.env.ADMIN_API_TOKEN || "").trim();
      if (!expectedToken || adminToken !== expectedToken) {
        reply.code(401).send({ success: false, error: "unauthorized" });
        return;
      }

      if (!pool) {
        reply.code(503).send({ success: false, error: "db_unavailable" });
        return;
      }

      const payoutRequestId = Number(request.body.payout_request_id);
      const txHash = String(request.body.tx_hash || "").trim();
      const chain = String(request.body.chain || "").toUpperCase().trim();
      const amountNative = String(request.body.amount_native || "0").trim();
      const destinationAddress = String(request.body.destination_address || "").trim();
      const notes = String(request.body.notes || "").trim();

      if (!SUPPORTED_CHAINS.has(chain)) {
        reply.code(400).send({ success: false, error: "unsupported_chain", supported: [...SUPPORTED_CHAINS] });
        return;
      }

      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        // Verify confirm token if provided (one-time use)
        const confirmToken = String(request.body.confirm_token || "").trim();
        if (confirmToken) {
          const tokenHash = crypto.createHash("sha256").update(confirmToken).digest("hex");
          const tokenRow = await client.query(
            `SELECT id FROM payout_exec_tokens
             WHERE payout_request_id = $1
               AND token_hash = $2
               AND NOT used
               AND expires_at > NOW()
             LIMIT 1`,
            [payoutRequestId, tokenHash]
          );
          if (tokenRow.rows.length === 0) {
            await client.query("ROLLBACK");
            reply.code(409).send({ success: false, error: "invalid_or_expired_confirm_token" });
            return;
          }
          await client.query(
            `UPDATE payout_exec_tokens SET used = TRUE WHERE id = $1`,
            [tokenRow.rows[0].id]
          );
        }

        // Resolve user_id from payout request
        let userId = null;
        try {
          const prRow = await client.query(
            `SELECT user_id FROM payout_requests WHERE id = $1 LIMIT 1`,
            [payoutRequestId]
          );
          if (prRow.rows.length > 0) userId = Number(prRow.rows[0].user_id);
        } catch (_) {
          // payout_requests table may have different schema — soft fail
        }

        if (!userId) {
          await client.query("ROLLBACK");
          reply.code(404).send({ success: false, error: "payout_request_not_found" });
          return;
        }

        // Insert audit record
        const execResult = await client.query(
          `INSERT INTO payout_tx (
            payout_request_id, user_id, tx_hash, chain,
            amount_native, destination_address, executed_by, meta
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
          RETURNING id, executed_at`,
          [
            payoutRequestId,
            userId,
            txHash,
            chain,
            amountNative,
            destinationAddress,
            `operator:admin`,
            JSON.stringify({ notes: notes || "" })
          ]
        );

        const execId = Number(execResult.rows[0]?.id || 0);
        const executedAt = execResult.rows[0]?.executed_at || new Date().toISOString();

        // Update payout request status to executed if table supports it
        try {
          await client.query(
            `UPDATE payout_requests
             SET status = 'executed', updated_at = NOW()
             WHERE id = $1 AND status IN ('approved', 'pending')`,
            [payoutRequestId]
          );
        } catch (_) {
          // Non-blocking — audit record is the source of truth
        }

        await client.query("COMMIT");

        reply.send({
          success: true,
          data: {
            payout_tx_id: execId,
            payout_request_id: payoutRequestId,
            tx_hash: txHash,
            chain,
            executed_at: executedAt
          }
        });
      } catch (err) {
        await client.query("ROLLBACK");
        if (err.code === "23505") {
          reply.code(409).send({ success: false, error: "tx_hash_already_recorded" });
          return;
        }
        throw err;
      } finally {
        client.release();
      }
    }
  );

  // ═══════════════════════════════════════════════════════════════
  // Issue one-time confirm token for operator UI
  // POST /admin/api/v2/payout/execute/token
  // ═══════════════════════════════════════════════════════════════
  fastify.post(
    "/admin/api/v2/payout/execute/token",
    {
      schema: {
        body: {
          type: "object",
          required: ["payout_request_id", "admin_token"],
          properties: {
            payout_request_id: { type: "integer", minimum: 1 },
            admin_token: { type: "string", minLength: 8, maxLength: 256 }
          }
        }
      }
    },
    async (request, reply) => {
      const adminToken = String(request.body.admin_token || "").trim();
      const expectedToken = String(process.env.ADMIN_API_TOKEN || "").trim();
      if (!expectedToken || adminToken !== expectedToken) {
        reply.code(401).send({ success: false, error: "unauthorized" });
        return;
      }

      if (!pool) {
        reply.code(503).send({ success: false, error: "db_unavailable" });
        return;
      }

      const payoutRequestId = Number(request.body.payout_request_id);
      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
      const expiresAt = new Date(Date.now() + EXEC_TOKEN_TTL_SEC * 1000).toISOString();

      const client = await pool.connect();
      try {
        await client.query(
          `INSERT INTO payout_exec_tokens (payout_request_id, token_hash, expires_at)
           VALUES ($1, $2, $3)`,
          [payoutRequestId, tokenHash, expiresAt]
        );
        client.release();
      } catch (err) {
        client.release();
        throw err;
      }

      reply.send({
        success: true,
        data: {
          confirm_token: rawToken,
          expires_at: expiresAt,
          ttl_sec: EXEC_TOKEN_TTL_SEC
        }
      });
    }
  );
}

module.exports = {
  registerWebappV2PayoutRoutes
};
