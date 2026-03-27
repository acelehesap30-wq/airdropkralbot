"use strict";

/**
 * Blueprint §12-daily: Daily Streak Check-in
 *
 * GET  /webapp/api/v2/player/daily     – status + 7-day history
 * POST /webapp/api/v2/player/daily/claim – claim today's reward (idempotent per day)
 *
 * Streak reward schedule (escalating, wraps at day 7):
 *   Day 1 → 50 SC
 *   Day 2 → 100 SC
 *   Day 3 → 200 SC + 1 HC
 *   Day 4 → 300 SC + 2 HC
 *   Day 5 → 500 SC + 3 HC
 *   Day 6 → 750 SC + 5 HC
 *   Day 7 → 1000 SC + 10 HC  (mega bonus)
 */

const STREAK_REWARDS = [
  { day: 1, sc: 50,   hc: 0  },
  { day: 2, sc: 100,  hc: 0  },
  { day: 3, sc: 200,  hc: 1  },
  { day: 4, sc: 300,  hc: 2  },
  { day: 5, sc: 500,  hc: 3  },
  { day: 6, sc: 750,  hc: 5  },
  { day: 7, sc: 1000, hc: 10 },
];

function rewardForDay(dayOfStreak) {
  const idx = ((dayOfStreak - 1) % 7);
  return STREAK_REWARDS[idx];
}

module.exports = {
  registerWebappV2DailyCheckinRoutes(fastify, { pool, verifyWebAppAuth, getProfileByTelegram }) {

    /** GET /webapp/api/v2/player/daily */
    fastify.get("/webapp/api/v2/player/daily", async (request, reply) => {
      try {
        const { uid, ts, sig } = request.query;
        const authErr = await verifyWebAppAuth(uid, ts, sig);
        if (authErr) return reply.status(401).send({ success: false, error: authErr });

        const profile = await getProfileByTelegram(uid);
        if (!profile) return reply.status(404).send({ success: false, error: "player_not_found" });

        const userId = profile.user_id;
        const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

        // Fetch last 7 checkins for calendar display
        const histRes = await pool.query(
          `SELECT checkin_date::text, day_of_streak, reward_sc, reward_hc
           FROM daily_checkins
           WHERE user_id = $1
           ORDER BY checkin_date DESC
           LIMIT 7`,
          [userId]
        );
        const history = histRes.rows;

        // Determine today's claim state
        const todayRow = history.find(r => r.checkin_date === today);
        const claimed_today = !!todayRow;

        // Compute current streak: consecutive days ending today or yesterday
        let currentStreak = 0;
        if (history.length > 0) {
          const latest = history[0];
          const latestDate = new Date(latest.checkin_date);
          const todayDate = new Date(today);
          const diffMs = todayDate - latestDate;
          const diffDays = diffMs / 86400000;

          if (diffDays <= 1) {
            // Still in streak window
            currentStreak = latest.day_of_streak;
          }
        }

        const nextStreakDay = currentStreak + (claimed_today ? 0 : 1);
        const nextReward = rewardForDay(claimed_today ? currentStreak : nextStreakDay);

        // Build 7-day calendar: today back to 6 days ago
        const calendar = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().slice(0, 10);
          const row = history.find(r => r.checkin_date === dateStr);
          const dayNum = row ? row.day_of_streak : null;
          calendar.push({
            date: dateStr,
            claimed: !!row,
            day_of_streak: dayNum,
            reward_sc: row?.reward_sc ?? rewardForDay(i === 0 ? nextStreakDay : 1).sc,
            reward_hc: row?.reward_hc ?? rewardForDay(i === 0 ? nextStreakDay : 1).hc,
            is_today: i === 0
          });
        }

        return reply.send({
          success: true,
          data: {
            claimed_today,
            current_streak: currentStreak,
            next_reward: nextReward,
            calendar
          }
        });
      } catch (err) {
        fastify.log.error(err, "daily GET error");
        return reply.status(500).send({ success: false, error: "internal_error" });
      }
    });

    /** POST /webapp/api/v2/player/daily/claim */
    fastify.post("/webapp/api/v2/player/daily/claim", async (request, reply) => {
      const client = await pool.connect();
      try {
        const { uid, ts, sig } = request.body || {};
        const authErr = await verifyWebAppAuth(uid, ts, sig);
        if (authErr) return reply.status(401).send({ success: false, error: authErr });

        const profile = await getProfileByTelegram(uid);
        if (!profile) return reply.status(404).send({ success: false, error: "player_not_found" });

        const userId = profile.user_id;
        const today = new Date().toISOString().slice(0, 10);

        await client.query("BEGIN");

        // Lock the row to prevent race conditions
        const existingRes = await client.query(
          `SELECT checkin_date FROM daily_checkins
           WHERE user_id = $1 AND checkin_date = $2
           FOR UPDATE`,
          [userId, today]
        );

        if (existingRes.rows.length > 0) {
          await client.query("ROLLBACK");
          return reply.status(409).send({ success: false, error: "already_claimed" });
        }

        // Determine streak: was yesterday claimed?
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().slice(0, 10);

        const prevRes = await client.query(
          `SELECT day_of_streak FROM daily_checkins
           WHERE user_id = $1 AND checkin_date = $2`,
          [userId, yesterdayStr]
        );

        const prevStreak = prevRes.rows.length > 0 ? prevRes.rows[0].day_of_streak : 0;
        const newStreakDay = prevStreak + 1;
        const reward = rewardForDay(newStreakDay);

        // Insert check-in record
        await client.query(
          `INSERT INTO daily_checkins (user_id, checkin_date, day_of_streak, reward_sc, reward_hc)
           VALUES ($1, $2, $3, $4, $5)`,
          [userId, today, newStreakDay, reward.sc, reward.hc]
        );

        // Grant SC via ledger
        if (reward.sc > 0) {
          await client.query(
            `INSERT INTO currency_ledger (user_id, currency, amount, source, ref_type, ref_id, note)
             VALUES ($1, 'SC', $2, 'daily_checkin', 'daily_checkins', $3, $4)`,
            [userId, reward.sc, `${userId}_${today}`, `Daily check-in day ${newStreakDay}`]
          );
          await client.query(
            `INSERT INTO currency_balances (user_id, currency, balance)
             VALUES ($1, 'SC', $2)
             ON CONFLICT (user_id, currency) DO UPDATE
             SET balance = currency_balances.balance + EXCLUDED.balance,
                 updated_at = now()`,
            [userId, reward.sc]
          );
        }

        // Grant HC via ledger
        if (reward.hc > 0) {
          await client.query(
            `INSERT INTO currency_ledger (user_id, currency, amount, source, ref_type, ref_id, note)
             VALUES ($1, 'HC', $2, 'daily_checkin', 'daily_checkins', $3, $4)`,
            [userId, reward.hc, `${userId}_${today}`, `Daily check-in day ${newStreakDay} HC bonus`]
          );
          await client.query(
            `INSERT INTO currency_balances (user_id, currency, balance)
             VALUES ($1, 'HC', $2)
             ON CONFLICT (user_id, currency) DO UPDATE
             SET balance = currency_balances.balance + EXCLUDED.balance,
                 updated_at = now()`,
            [userId, reward.hc]
          );
        }

        await client.query("COMMIT");

        return reply.send({
          success: true,
          data: {
            claimed: true,
            day_of_streak: newStreakDay,
            reward_sc: reward.sc,
            reward_hc: reward.hc,
            is_mega: newStreakDay % 7 === 0
          }
        });
      } catch (err) {
        await client.query("ROLLBACK").catch(() => {});
        fastify.log.error(err, "daily claim error");
        return reply.status(500).send({ success: false, error: "internal_error" });
      } finally {
        client.release();
      }
    });
  }
};
