"use strict";

// Blueprint §11 — Social Invite / Referral Funnel Routes
// GET  /webapp/api/v2/player/invite      — fetch invite code + referral stats
// POST /webapp/api/v2/player/invite/use  — apply a referral code

const {
  generateInviteCode,
  computeReferralBonus,
  MAX_REFERRALS_PER_USER,
} = require("../../../../../../packages/shared/src/v5/inviteEngine");

function registerWebappV2InviteRoutes(fastify, deps = {}) {
  const pool               = deps.pool;
  const verifyWebAppAuth   = deps.verifyWebAppAuth;
  const getProfileByTelegram = deps.getProfileByTelegram;
  const botUsername        = String(deps.botUsername || "airdropkralbot");

  if (!pool || typeof verifyWebAppAuth !== "function" || typeof getProfileByTelegram !== "function") {
    throw new Error("registerWebappV2InviteRoutes requires pool, verifyWebAppAuth, getProfileByTelegram");
  }

  // ── GET /webapp/api/v2/player/invite ─────────────────────────────────────────
  fastify.get(
    "/webapp/api/v2/player/invite",
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

        // Fetch invite_code (not in getProfileByTelegram select)
        const userRow = await client.query(
          "SELECT invite_code FROM users WHERE id = $1",
          [profile.user_id]
        );
        let inviteCode = userRow.rows[0]?.invite_code || null;

        // Generate if missing
        if (!inviteCode) {
          inviteCode = generateInviteCode(profile.user_id);
          await client.query(
            "UPDATE users SET invite_code = $1 WHERE id = $2",
            [inviteCode, profile.user_id]
          );
        }

        // Referral stats
        const stats = await client.query(
          `SELECT
              COUNT(*)                                             AS total_count,
              SUM(CASE WHEN bonus_granted THEN 1 ELSE 0 END)::int AS rewarded_count
             FROM referrals
            WHERE referrer_user_id = $1`,
          [profile.user_id]
        );

        const totalCount   = Number(stats.rows[0]?.total_count   || 0);
        const rewardedCount = Number(stats.rows[0]?.rewarded_count || 0);
        const currentTier  = Math.min(8, Math.floor(totalCount / 5) + 1);

        const inviteUrl = `https://t.me/${botUsername}?start=ref_${inviteCode}`;

        return reply.send({
          success: true,
          data: {
            api_version: "v2",
            invite_code: inviteCode,
            invite_url: inviteUrl,
            referral_count: totalCount,
            rewarded_count: rewardedCount,
            tier: currentTier,
            max_referrals: MAX_REFERRALS_PER_USER,
          },
        });
      } finally {
        client.release();
      }
    }
  );

  // ── POST /webapp/api/v2/player/invite/use ────────────────────────────────────
  fastify.post(
    "/webapp/api/v2/player/invite/use",
    {
      schema: {
        body: {
          type: "object",
          required: ["uid", "ts", "sig", "invite_code"],
          properties: {
            uid:         { type: "string" },
            ts:          { type: "string" },
            sig:         { type: "string" },
            invite_code: { type: "string", minLength: 4, maxLength: 32 },
          },
        },
      },
    },
    async (request, reply) => {
      const auth = verifyWebAppAuth(request.body.uid, request.body.ts, request.body.sig);
      if (!auth.ok) return reply.code(401).send({ success: false, error: auth.reason });

      const code = String(request.body.invite_code).trim().toLowerCase();

      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        const profile = await getProfileByTelegram(client, auth.uid);
        if (!profile) {
          await client.query("ROLLBACK");
          return reply.send({ success: false, error: "user_not_found" });
        }

        // Already referred?
        const existing = await client.query(
          "SELECT id FROM referrals WHERE referred_user_id = $1",
          [profile.user_id]
        );
        if (existing.rows.length > 0) {
          await client.query("ROLLBACK");
          return reply.send({ success: false, error: "already_referred" });
        }

        // Find referrer by code
        const referrerRow = await client.query(
          "SELECT id FROM users WHERE invite_code = $1",
          [code]
        );
        if (referrerRow.rows.length === 0) {
          await client.query("ROLLBACK");
          return reply.send({ success: false, error: "code_not_found" });
        }
        const referrerId = referrerRow.rows[0].id;
        if (referrerId === profile.user_id) {
          await client.query("ROLLBACK");
          return reply.send({ success: false, error: "self_referral" });
        }

        // Check referrer's cap
        const capRow = await client.query(
          "SELECT COUNT(*) AS cnt FROM referrals WHERE referrer_user_id = $1",
          [referrerId]
        );
        if (Number(capRow.rows[0]?.cnt || 0) >= MAX_REFERRALS_PER_USER) {
          await client.query("ROLLBACK");
          return reply.send({ success: false, error: "referrer_cap_reached" });
        }

        // Insert referral record
        await client.query(
          `INSERT INTO referrals (referrer_user_id, referred_user_id, tier, bonus_granted)
           VALUES ($1, $2, 1, false)`,
          [referrerId, profile.user_id]
        );

        // Compute and grant bonuses
        const bonus = computeReferralBonus(1, 1);
        const grantSC = async (userId, amount, reason, meta) => {
          if (amount <= 0) return;
          await client.query(
            `INSERT INTO currency_ledger (user_id, currency, delta, reason, meta_json)
             VALUES ($1, 'SC', $2, $3, $4)`,
            [userId, amount, reason, JSON.stringify(meta)]
          );
          await client.query(
            `INSERT INTO currency_balances (user_id, currency, balance)
             VALUES ($1, 'SC', $2)
             ON CONFLICT (user_id, currency) DO UPDATE
               SET balance = currency_balances.balance + $2, updated_at = now()`,
            [userId, amount]
          );
        };

        await grantSC(referrerId, bonus.inviterSC, "referral_bonus_referrer",
          { referred_user_id: profile.user_id, code });
        await grantSC(profile.user_id, bonus.inviteeSC, "referral_bonus_referred",
          { referrer_user_id: referrerId, code });

        // Mark bonus granted
        await client.query(
          `UPDATE referrals SET bonus_granted = true, bonus_granted_at = now()
            WHERE referrer_user_id = $1 AND referred_user_id = $2`,
          [referrerId, profile.user_id]
        );

        await client.query("COMMIT");

        return reply.send({
          success: true,
          data: {
            api_version: "v2",
            referral_recorded: true,
            bonus_sc_granted: bonus.inviteeSC,
          },
        });
      } catch (err) {
        await client.query("ROLLBACK").catch(() => {});
        fastify.log.error(err, "invite use error");
        return reply.code(500).send({ success: false, error: "internal_error" });
      } finally {
        client.release();
      }
    }
  );
}

module.exports = { registerWebappV2InviteRoutes };
