"use strict";

// Blueprint §10 — Quest Chain Progression Routes
// GET  /webapp/api/v2/player/quests          — fetch all chains + user progress
// POST /webapp/api/v2/player/quests/advance  — advance a step and claim reward

const {
  getActiveChains,
  QUEST_CHAINS,
} = require("../../../../../../packages/shared/src/v5/questChainEngine");
const { emitGameComplete } = require("../../../services/playerLifecycleEventService");

function registerWebappV2QuestRoutes(fastify, deps = {}) {
  const pool = deps.pool;
  const verifyWebAppAuth = deps.verifyWebAppAuth;
  const getProfileByTelegram = deps.getProfileByTelegram;

  if (!pool || typeof verifyWebAppAuth !== "function" || typeof getProfileByTelegram !== "function") {
    throw new Error("registerWebappV2QuestRoutes requires pool, verifyWebAppAuth, getProfileByTelegram");
  }

  // ── GET /webapp/api/v2/player/quests ────────────────────────────────────────
  fastify.get(
    "/webapp/api/v2/player/quests",
    {
      schema: {
        querystring: {
          type: "object",
          required: ["uid", "ts", "sig"],
          properties: {
            uid: { type: "string" },
            ts:  { type: "string" },
            sig: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const auth = verifyWebAppAuth(request.query.uid, request.query.ts, request.query.sig);
      if (!auth.ok) return reply.code(401).send({ success: false, error: auth.reason });

      const client = await pool.connect();
      try {
        const profile = await getProfileByTelegram(client, auth.uid);
        if (!profile) return reply.send({ success: false, error: "user_not_found" });

        const rows = await client.query(
          `SELECT chain_id, completed_step_index, reward_claimed_steps
             FROM user_quest_chain_progress
            WHERE user_id = $1`,
          [profile.user_id]
        );

        const progressMap = {};
        const claimedMap = {};
        for (const row of rows.rows) {
          progressMap[row.chain_id] = row.completed_step_index;
          claimedMap[row.chain_id] = row.reward_claimed_steps || [];
        }

        const chains = getActiveChains(progressMap).map((c) => ({
          ...c,
          claimed_steps: claimedMap[c.id] || [],
        }));

        return reply.send({
          success: true,
          data: { api_version: "v2", chains },
        });
      } finally {
        client.release();
      }
    }
  );

  // ── POST /webapp/api/v2/player/quests/advance ────────────────────────────────
  fastify.post(
    "/webapp/api/v2/player/quests/advance",
    {
      schema: {
        body: {
          type: "object",
          required: ["uid", "ts", "sig", "chain_id", "step_index"],
          properties: {
            uid:        { type: "string" },
            ts:         { type: "string" },
            sig:        { type: "string" },
            chain_id:   { type: "string", minLength: 2, maxLength: 64 },
            step_index: { type: "integer", minimum: 0, maximum: 20 },
          },
        },
      },
    },
    async (request, reply) => {
      const auth = verifyWebAppAuth(request.body.uid, request.body.ts, request.body.sig);
      if (!auth.ok) return reply.code(401).send({ success: false, error: auth.reason });

      const chainId   = String(request.body.chain_id).trim();
      const stepIndex = Number(request.body.step_index);

      // Validate chain
      const chainDef = QUEST_CHAINS.find((c) => c.id === chainId);
      if (!chainDef) return reply.send({ success: false, error: "chain_not_found" });
      if (stepIndex >= chainDef.steps.length) return reply.send({ success: false, error: "invalid_step" });

      const step   = chainDef.steps[stepIndex];
      const reward = step.reward || {};

      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        const profile = await getProfileByTelegram(client, auth.uid);
        if (!profile) {
          await client.query("ROLLBACK");
          return reply.send({ success: false, error: "user_not_found" });
        }

        // Upsert progress row
        await client.query(
          `INSERT INTO user_quest_chain_progress (user_id, chain_id)
           VALUES ($1, $2)
           ON CONFLICT (user_id, chain_id) DO NOTHING`,
          [profile.user_id, chainId]
        );

        const cur = await client.query(
          `SELECT completed_step_index, reward_claimed_steps
             FROM user_quest_chain_progress
            WHERE user_id = $1 AND chain_id = $2
              FOR UPDATE`,
          [profile.user_id, chainId]
        );

        const completedIdx  = Number(cur.rows[0]?.completed_step_index ?? -1);
        const claimedSteps  = cur.rows[0]?.reward_claimed_steps || [];

        if (stepIndex !== completedIdx + 1) {
          await client.query("ROLLBACK");
          return reply.send({ success: false, error: "step_not_ready", current: completedIdx });
        }
        if (claimedSteps.includes(stepIndex)) {
          await client.query("ROLLBACK");
          return reply.send({ success: false, error: "already_claimed" });
        }

        // Grant SC reward
        if (Number(reward.sc) > 0) {
          const meta = JSON.stringify({ chain_id: chainId, step_index: stepIndex });
          await client.query(
            `INSERT INTO currency_ledger (user_id, currency, delta, reason, meta_json)
             VALUES ($1, 'SC', $2, 'quest_step_reward', $3)`,
            [profile.user_id, reward.sc, meta]
          );
          await client.query(
            `INSERT INTO currency_balances (user_id, currency, balance)
             VALUES ($1, 'SC', $2)
             ON CONFLICT (user_id, currency) DO UPDATE
               SET balance = currency_balances.balance + $2,
                   updated_at = now()`,
            [profile.user_id, reward.sc]
          );
        }
        // Grant HC reward
        if (Number(reward.hc) > 0) {
          const meta = JSON.stringify({ chain_id: chainId, step_index: stepIndex });
          await client.query(
            `INSERT INTO currency_ledger (user_id, currency, delta, reason, meta_json)
             VALUES ($1, 'HC', $2, 'quest_step_reward', $3)`,
            [profile.user_id, reward.hc, meta]
          );
          await client.query(
            `INSERT INTO currency_balances (user_id, currency, balance)
             VALUES ($1, 'HC', $2)
             ON CONFLICT (user_id, currency) DO UPDATE
               SET balance = currency_balances.balance + $2,
                   updated_at = now()`,
            [profile.user_id, reward.hc]
          );
        }

        // Advance progress
        const newClaimed = [...claimedSteps, stepIndex];
        await client.query(
          `UPDATE user_quest_chain_progress
              SET completed_step_index = $1,
                  reward_claimed_steps = $2,
                  last_advanced_at = now(),
                  updated_at = now()
            WHERE user_id = $3 AND chain_id = $4`,
          [stepIndex, newClaimed, profile.user_id, chainId]
        );

        await client.query("COMMIT");

        // Fire lifecycle event (fire-and-forget)
        emitGameComplete(pool, {
          userId: profile.user_id,
          actionKey: "quest_step_advance",
          payload: { chain_id: chainId, step_index: stepIndex, reward },
          sessionRef: "",
        }).catch(() => {});

        return reply.send({
          success: true,
          data: {
            api_version: "v2",
            chain_id: chainId,
            step_index: stepIndex,
            reward_granted: reward,
            new_completed_index: stepIndex,
          },
        });
      } catch (err) {
        await client.query("ROLLBACK").catch(() => {});
        fastify.log.error(err, "quest advance error");
        return reply.code(500).send({ success: false, error: "internal_error" });
      } finally {
        client.release();
      }
    }
  );
}

module.exports = { registerWebappV2QuestRoutes };
