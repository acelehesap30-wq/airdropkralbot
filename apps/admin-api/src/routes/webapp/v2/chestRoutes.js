"use strict";

/**
 * Blueprint §forge:chests — Chest Loot Reveal Routes
 *
 * GET  /webapp/api/v2/forge/chests          – list chest types + cooldown status
 * POST /webapp/api/v2/forge/chests/open     – open a chest, reveal loot
 *
 * Chest definitions:
 *   common → free every 4h, loot: 50-250 SC
 *   rare   → costs 500 SC, cooldown 1h, loot: 200-1000 SC + 0-2 HC
 *   epic   → costs 5 HC, cooldown 6h, loot: 500-3000 SC + 1-5 HC + 0-2 RC
 */

const CHESTS = {
  common: {
    label_tr: "Ortak Sandık",
    label_en: "Common Chest",
    desc_tr:  "4 saatte bir ücretsiz. Temel SC ödülleri.",
    desc_en:  "Free every 4 hours. Basic SC rewards.",
    cost_sc:  0,
    cost_hc:  0,
    cooldown_ms: 4 * 60 * 60 * 1000,  // 4h
    icon: "📦",
    color: "#00ff88",
    loot: () => {
      const sc = Math.floor(50 + Math.random() * 200);
      return { sc, hc: 0, rc: 0, label: `${sc} SC` };
    }
  },
  rare: {
    label_tr: "Nadir Sandık",
    label_en: "Rare Chest",
    desc_tr:  "500 SC harca. Daha iyi ödüller.",
    desc_en:  "Costs 500 SC. Better rewards inside.",
    cost_sc:  500,
    cost_hc:  0,
    cooldown_ms: 60 * 60 * 1000,       // 1h
    icon: "💠",
    color: "#00d2ff",
    loot: () => {
      const sc = Math.floor(200 + Math.random() * 800);
      const hc = Math.random() < 0.4 ? Math.floor(1 + Math.random() * 2) : 0;
      return { sc, hc, rc: 0, label: hc > 0 ? `${sc} SC + ${hc} HC` : `${sc} SC` };
    }
  },
  epic: {
    label_tr: "Epik Sandık",
    label_en: "Epic Chest",
    desc_tr:  "5 HC harca. Epik ödüller ve RC.",
    desc_en:  "Costs 5 HC. Epic rewards including RC.",
    cost_sc:  0,
    cost_hc:  5,
    cooldown_ms: 6 * 60 * 60 * 1000,  // 6h
    icon: "🔮",
    color: "#e040fb",
    loot: () => {
      const sc = Math.floor(500 + Math.random() * 2500);
      const hc = Math.floor(1 + Math.random() * 5);
      const rc = Math.random() < 0.35 ? Math.floor(1 + Math.random() * 2) : 0;
      let label = `${sc} SC + ${hc} HC`;
      if (rc > 0) label += ` + ${rc} RC`;
      return { sc, hc, rc, label };
    }
  }
};

module.exports = {
  registerWebappV2ChestRoutes(fastify, { pool, verifyWebAppAuth, getProfileByTelegram }) {

    /** GET /webapp/api/v2/forge/chests */
    fastify.get("/webapp/api/v2/forge/chests", async (request, reply) => {
      try {
        const { uid, ts, sig } = request.query;
        const authErr = await verifyWebAppAuth(uid, ts, sig);
        if (authErr) return reply.status(401).send({ success: false, error: authErr });

        const profile = await getProfileByTelegram(uid);
        if (!profile) return reply.status(404).send({ success: false, error: "player_not_found" });
        const userId = profile.user_id;

        // Fetch last open time per chest type
        const res = await pool.query(
          `SELECT chest_type, MAX(opened_at) AS last_opened
           FROM chest_opens
           WHERE user_id = $1
           GROUP BY chest_type`,
          [userId]
        );
        const cooldownMap = {};
        res.rows.forEach((r) => { cooldownMap[r.chest_type] = new Date(r.last_opened); });

        // Fetch SC and HC balances
        const balRes = await pool.query(
          `SELECT currency, balance FROM currency_balances WHERE user_id = $1 AND currency IN ('SC','HC')`,
          [userId]
        );
        const balances = {};
        balRes.rows.forEach((r) => { balances[r.currency] = Number(r.balance); });

        const now = Date.now();
        const chestList = Object.entries(CHESTS).map(([type, def]) => {
          const lastOpened = cooldownMap[type];
          const cooldownEndsAt = lastOpened ? lastOpened.getTime() + def.cooldown_ms : 0;
          const readyInMs = Math.max(0, cooldownEndsAt - now);
          const canAfford = (balances.SC || 0) >= def.cost_sc && (balances.HC || 0) >= def.cost_hc;
          return {
            type,
            label_tr: def.label_tr,
            label_en: def.label_en,
            desc_tr: def.desc_tr,
            desc_en: def.desc_en,
            cost_sc: def.cost_sc,
            cost_hc: def.cost_hc,
            icon: def.icon,
            color: def.color,
            ready: readyInMs === 0,
            ready_in_ms: readyInMs,
            can_afford: canAfford
          };
        });

        return reply.send({ success: true, data: { chests: chestList } });
      } catch (err) {
        fastify.log.error(err, "chests GET error");
        return reply.status(500).send({ success: false, error: "internal_error" });
      }
    });

    /** POST /webapp/api/v2/forge/chests/open */
    fastify.post("/webapp/api/v2/forge/chests/open", async (request, reply) => {
      const client = await pool.connect();
      try {
        const { uid, ts, sig, chest_type } = request.body || {};
        const authErr = await verifyWebAppAuth(uid, ts, sig);
        if (authErr) return reply.status(401).send({ success: false, error: authErr });

        const def = CHESTS[chest_type];
        if (!def) return reply.status(400).send({ success: false, error: "invalid_chest_type" });

        const profile = await getProfileByTelegram(uid);
        if (!profile) return reply.status(404).send({ success: false, error: "player_not_found" });
        const userId = profile.user_id;

        await client.query("BEGIN");

        // Check cooldown
        const cdRes = await client.query(
          `SELECT MAX(opened_at) AS last_opened FROM chest_opens
           WHERE user_id = $1 AND chest_type = $2 FOR UPDATE`,
          [userId, chest_type]
        );
        const lastOpened = cdRes.rows[0]?.last_opened;
        if (lastOpened) {
          const elapsed = Date.now() - new Date(lastOpened).getTime();
          if (elapsed < def.cooldown_ms) {
            await client.query("ROLLBACK");
            return reply.status(429).send({
              success: false,
              error: "cooldown_active",
              ready_in_ms: def.cooldown_ms - elapsed
            });
          }
        }

        // Check and deduct cost
        if (def.cost_sc > 0) {
          const scRes = await client.query(
            `SELECT balance FROM currency_balances WHERE user_id = $1 AND currency = 'SC' FOR UPDATE`,
            [userId]
          );
          const sc = Number(scRes.rows[0]?.balance || 0);
          if (sc < def.cost_sc) {
            await client.query("ROLLBACK");
            return reply.status(402).send({ success: false, error: "insufficient_sc" });
          }
          await client.query(
            `UPDATE currency_balances SET balance = balance - $1, updated_at = now()
             WHERE user_id = $2 AND currency = 'SC'`,
            [def.cost_sc, userId]
          );
          await client.query(
            `INSERT INTO currency_ledger (user_id, currency, amount, source, ref_type, note)
             VALUES ($1, 'SC', $2, 'chest_cost', 'chest_opens', $3)`,
            [userId, -def.cost_sc, `Open ${chest_type} chest cost`]
          );
        }

        if (def.cost_hc > 0) {
          const hcRes = await client.query(
            `SELECT balance FROM currency_balances WHERE user_id = $1 AND currency = 'HC' FOR UPDATE`,
            [userId]
          );
          const hc = Number(hcRes.rows[0]?.balance || 0);
          if (hc < def.cost_hc) {
            await client.query("ROLLBACK");
            return reply.status(402).send({ success: false, error: "insufficient_hc" });
          }
          await client.query(
            `UPDATE currency_balances SET balance = balance - $1, updated_at = now()
             WHERE user_id = $2 AND currency = 'HC'`,
            [def.cost_hc, userId]
          );
          await client.query(
            `INSERT INTO currency_ledger (user_id, currency, amount, source, ref_type, note)
             VALUES ($1, 'HC', $2, 'chest_cost', 'chest_opens', $3)`,
            [userId, -def.cost_hc, `Open ${chest_type} chest cost`]
          );
        }

        // Roll loot
        const loot = def.loot();

        // Grant loot
        await client.query(
          `INSERT INTO chest_opens (user_id, chest_type, reward_sc, reward_hc, reward_rc, reward_label)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [userId, chest_type, loot.sc, loot.hc, loot.rc, loot.label]
        );

        for (const [currency, amount] of [["SC", loot.sc], ["HC", loot.hc], ["RC", loot.rc]]) {
          if (amount <= 0) continue;
          await client.query(
            `INSERT INTO currency_ledger (user_id, currency, amount, source, ref_type, note)
             VALUES ($1, $2, $3, 'chest_reward', 'chest_opens', $4)`,
            [userId, currency, amount, `${chest_type} chest loot: ${loot.label}`]
          );
          await client.query(
            `INSERT INTO currency_balances (user_id, currency, balance)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id, currency) DO UPDATE
             SET balance = currency_balances.balance + EXCLUDED.balance,
                 updated_at = now()`,
            [userId, currency, amount]
          );
        }

        await client.query("COMMIT");

        return reply.send({
          success: true,
          data: {
            chest_type,
            reward_sc: loot.sc,
            reward_hc: loot.hc,
            reward_rc: loot.rc,
            reward_label: loot.label
          }
        });
      } catch (err) {
        await client.query("ROLLBACK").catch(() => {});
        fastify.log.error(err, "chest open error");
        return reply.status(500).send({ success: false, error: "internal_error" });
      } finally {
        client.release();
      }
    });
  }
};
