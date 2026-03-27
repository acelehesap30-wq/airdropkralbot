"use strict";

/**
 * Blueprint §season_hall: Season Tournament Routes
 *
 * GET  /webapp/api/v2/season/tournaments         – list active/upcoming tournaments
 * GET  /webapp/api/v2/season/tournaments/:key    – tournament detail + entries + user status
 * POST /webapp/api/v2/season/tournaments/:key/join – register user for tournament
 */

module.exports = {
  registerWebappV2TournamentRoutes(fastify, { pool, verifyWebAppAuth, getProfileByTelegram }) {

    /** GET /webapp/api/v2/season/tournaments */
    fastify.get("/webapp/api/v2/season/tournaments", async (request, reply) => {
      try {
        const { uid, ts, sig } = request.query;
        const authErr = await verifyWebAppAuth(uid, ts, sig);
        if (authErr) return reply.status(401).send({ success: false, error: authErr });

        const profile = await getProfileByTelegram(uid);
        const userId = profile?.user_id;

        const res = await pool.query(
          `SELECT t.*,
                  COUNT(e.id)::int AS entry_count,
                  MAX(CASE WHEN e.user_id = $1 THEN 1 ELSE 0 END)::boolean AS user_joined
           FROM season_tournaments t
           LEFT JOIN tournament_entries e ON e.tournament_id = t.id
           WHERE t.status IN ('upcoming','registration','active')
           GROUP BY t.id
           ORDER BY t.starts_at ASC
           LIMIT 10`,
          [userId || 0]
        );

        return reply.send({ success: true, data: { tournaments: res.rows } });
      } catch (err) {
        fastify.log.error(err, "tournaments GET error");
        return reply.status(500).send({ success: false, error: "internal_error" });
      }
    });

    /** GET /webapp/api/v2/season/tournaments/:key */
    fastify.get("/webapp/api/v2/season/tournaments/:key", async (request, reply) => {
      try {
        const { uid, ts, sig } = request.query;
        const { key } = request.params;
        const authErr = await verifyWebAppAuth(uid, ts, sig);
        if (authErr) return reply.status(401).send({ success: false, error: authErr });

        const profile = await getProfileByTelegram(uid);
        const userId = profile?.user_id;

        // Tournament info
        const tRes = await pool.query(
          `SELECT * FROM season_tournaments WHERE tournament_key = $1`, [key]
        );
        if (!tRes.rows.length) return reply.status(404).send({ success: false, error: "not_found" });
        const tournament = tRes.rows[0];

        // Entries (top 16 by seed)
        const eRes = await pool.query(
          `SELECT e.seed, e.bracket_slot, e.final_rank, e.reward_sc, e.reward_hc, e.eliminated_at,
                  p.public_name AS display_name, p.kingdom_tier
           FROM tournament_entries e
           JOIN user_profiles p ON p.user_id = e.user_id
           WHERE e.tournament_id = $1
           ORDER BY COALESCE(e.seed, 9999) ASC, e.registered_at ASC
           LIMIT 32`,
          [tournament.id]
        );

        // User's own entry
        const myRes = userId ? await pool.query(
          `SELECT * FROM tournament_entries WHERE tournament_id = $1 AND user_id = $2`,
          [tournament.id, userId]
        ) : { rows: [] };

        return reply.send({
          success: true,
          data: {
            tournament,
            entries: eRes.rows,
            user_entry: myRes.rows[0] || null
          }
        });
      } catch (err) {
        fastify.log.error(err, "tournament detail GET error");
        return reply.status(500).send({ success: false, error: "internal_error" });
      }
    });

    /** POST /webapp/api/v2/season/tournaments/:key/join */
    fastify.post("/webapp/api/v2/season/tournaments/:key/join", async (request, reply) => {
      const client = await pool.connect();
      try {
        const { uid, ts, sig } = request.body || {};
        const { key } = request.params;
        const authErr = await verifyWebAppAuth(uid, ts, sig);
        if (authErr) return reply.status(401).send({ success: false, error: authErr });

        const profile = await getProfileByTelegram(uid);
        if (!profile) return reply.status(404).send({ success: false, error: "player_not_found" });
        const userId = profile.user_id;

        await client.query("BEGIN");

        const tRes = await client.query(
          `SELECT * FROM season_tournaments WHERE tournament_key = $1 FOR UPDATE`, [key]
        );
        if (!tRes.rows.length) {
          await client.query("ROLLBACK");
          return reply.status(404).send({ success: false, error: "tournament_not_found" });
        }
        const t = tRes.rows[0];

        if (t.status !== "registration" && t.status !== "upcoming") {
          await client.query("ROLLBACK");
          return reply.status(409).send({ success: false, error: "registration_closed" });
        }

        // Check bracket capacity
        const countRes = await client.query(
          `SELECT COUNT(*)::int AS cnt FROM tournament_entries WHERE tournament_id = $1`, [t.id]
        );
        if (countRes.rows[0].cnt >= t.bracket_size) {
          await client.query("ROLLBACK");
          return reply.status(409).send({ success: false, error: "bracket_full" });
        }

        // Idempotent: already joined?
        const existRes = await client.query(
          `SELECT id FROM tournament_entries WHERE tournament_id = $1 AND user_id = $2`, [t.id, userId]
        );
        if (existRes.rows.length > 0) {
          await client.query("ROLLBACK");
          return reply.send({ success: true, data: { already_joined: true } });
        }

        await client.query(
          `INSERT INTO tournament_entries (tournament_id, user_id) VALUES ($1, $2)`,
          [t.id, userId]
        );

        await client.query("COMMIT");
        return reply.send({ success: true, data: { joined: true, tournament_key: key } });
      } catch (err) {
        await client.query("ROLLBACK").catch(() => {});
        fastify.log.error(err, "tournament join error");
        return reply.status(500).send({ success: false, error: "internal_error" });
      } finally {
        client.release();
      }
    });
  }
};
