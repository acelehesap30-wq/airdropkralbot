"use strict";

/**
 * Game Routes — Mini-game completion + NXT rewards
 *
 * POST /webapp/api/v2/games/complete — submit game result, earn NXT
 * GET  /webapp/api/v2/games/rewards  — daily reward summary
 */

const { processGameReward, DAILY_NXT_CAP } = require("../../../services/nxtRewardService");

function registerGameRoutes(fastify, deps = {}) {
  const { verifyWebAppAuth, pool, economyStore } = deps;

  // ── Submit game completion ──
  fastify.post(
    "/webapp/api/v2/games/complete",
    {
      schema: {
        body: {
          type: "object",
          required: ["gameId"],
          properties: {
            gameId: { type: "string", enum: ["airdrop_catcher", "hash_racer"] },
            score: { type: "number" },
            wave: { type: "number" },
            duration: { type: "number" },
          },
        },
        querystring: {
          type: "object",
          required: ["uid", "ts", "sig"],
          properties: {
            uid: { type: "string" },
            ts: { type: "string" },
            sig: { type: "string" },
          },
        },
      },
      preValidation: async (request, reply) => {
        await verifyWebAppAuth(request, reply);
      },
    },
    async (request, reply) => {
      const uid = String(request.query.uid || "");
      const { gameId, score, wave, duration } = request.body;

      // Resolve user ID from uid
      let userId = null;
      try {
        const userResult = await pool.query(
          `SELECT id FROM users WHERE uid = $1 LIMIT 1`,
          [uid]
        );
        userId = userResult.rows[0]?.id || null;
      } catch (_) {
        // Fallback: try telegram_id
        try {
          const tgResult = await pool.query(
            `SELECT user_id FROM user_profiles WHERE telegram_id = $1 LIMIT 1`,
            [uid]
          );
          userId = tgResult.rows[0]?.user_id || null;
        } catch (__) {
          // Skip
        }
      }

      if (!userId) {
        return reply.code(404).send({
          success: false,
          error: "user_not_found",
        });
      }

      // Process the game reward
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const result = await processGameReward(
          client,
          { userId, gameId, result: { wave, score, duration } },
          { economyStore }
        );
        await client.query("COMMIT");

        return reply.send({
          success: result.ok,
          data: {
            nxt_earned: result.nxtEarned || 0,
            total_today: result.totalToday || 0,
            daily_cap: DAILY_NXT_CAP,
            reason: result.reason || null,
          },
        });
      } catch (err) {
        await client.query("ROLLBACK").catch(() => {});
        fastify.log.error({ err, event: "game_reward_error", userId, gameId });
        return reply.code(500).send({
          success: false,
          error: "reward_processing_failed",
        });
      } finally {
        client.release();
      }
    }
  );

  // ── Get daily reward summary ──
  fastify.get(
    "/webapp/api/v2/games/rewards",
    {
      schema: {
        querystring: {
          type: "object",
          required: ["uid", "ts", "sig"],
          properties: {
            uid: { type: "string" },
            ts: { type: "string" },
            sig: { type: "string" },
          },
        },
      },
      preValidation: async (request, reply) => {
        await verifyWebAppAuth(request, reply);
      },
    },
    async (request, reply) => {
      const uid = String(request.query.uid || "");

      let todayEarned = 0;
      try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const result = await pool.query(
          `SELECT COALESCE(SUM(el.amount), 0)::numeric AS total
           FROM economy_ledger el
           JOIN users u ON u.id = el.user_id
           WHERE u.uid = $1
             AND el.currency = 'NXT'
             AND el.reason LIKE 'game_reward_%'
             AND el.created_at >= $2`,
          [uid, todayStart.toISOString()]
        );
        todayEarned = Number(result.rows[0]?.total || 0);
      } catch (_) {
        // Table may not exist
      }

      return reply.send({
        success: true,
        data: {
          today_earned: todayEarned,
          daily_cap: DAILY_NXT_CAP,
          remaining: Math.max(0, DAILY_NXT_CAP - todayEarned),
          games: [
            { id: "airdrop_catcher", name: "Airdrop Catcher", reward_range: "0.1-0.25 NXT" },
            { id: "hash_racer", name: "Hash Racer", reward_range: "0.15 NXT" },
          ],
        },
      });
    }
  );
}

module.exports = { registerGameRoutes };
