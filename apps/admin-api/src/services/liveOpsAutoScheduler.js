"use strict";

/**
 * Live Ops Auto-Scheduler
 *
 * Automated campaign lifecycle manager:
 *  1. Auto-dispatch approved campaigns when scene gate is clear
 *  2. Auto-expire ended campaigns and events
 *  3. Auto-rotate seasonal events (anomalies, flash drops)
 *  4. Auto-generate recurring events (tournaments, wars)
 *
 * Runs on configurable interval (default 60s).
 * Respects scene gate — if gate is "alert", dispatch is paused.
 * If gate is "no_data" or "clear", dispatch proceeds normally.
 */

const SCHEDULER_INTERVAL_MS = 60_000; // 60s
const MAX_DISPATCH_PER_CYCLE = 5;

const DEFAULT_SCHEDULER_CONFIG = {
  enabled: true,
  auto_dispatch_approved: true,
  auto_expire_campaigns: true,
  auto_rotate_anomalies: true,
  auto_generate_events: true,
  anomaly_rotate_hours: 12,
  flash_drop_interval_hours: 6,
  tournament_interval_hours: 168, // weekly
  war_interval_hours: 336 // bi-weekly
};

function mergeSchedulerConfig(incoming) {
  const cfg = incoming && typeof incoming === "object" ? incoming : {};
  return { ...DEFAULT_SCHEDULER_CONFIG, ...cfg };
}

function createLiveOpsAutoScheduler(deps = {}) {
  const pool = deps.pool;
  const logger = deps.logger || console;
  const getRuntimeConfig = deps.getRuntimeConfig || (() => ({}));
  const resolveSceneGate = deps.resolveSceneGate || (() => ({ ready_for_auto_dispatch: true }));

  if (!pool || typeof pool.query !== "function") {
    throw new Error("liveOpsAutoScheduler requires a database pool");
  }

  let intervalId = null;
  let running = false;
  let stats = {
    cycles: 0,
    dispatched: 0,
    expired: 0,
    events_generated: 0,
    anomalies_rotated: 0,
    errors: 0,
    last_run: null,
    last_error: null,
    scene_gate_state: "unknown"
  };

  // ─── Auto-dispatch approved campaigns ───
  async function dispatchApprovedCampaigns(client, config) {
    if (!config.auto_dispatch_approved) return;

    try {
      const result = await client.query(`
        SELECT id, title, targeting, schedule_at, status
        FROM live_ops_campaigns
        WHERE status = 'approved'
          AND (schedule_at IS NULL OR schedule_at <= NOW())
        ORDER BY COALESCE(schedule_at, created_at) ASC
        LIMIT $1
      `, [MAX_DISPATCH_PER_CYCLE]);

      for (const campaign of (result.rows || [])) {
        try {
          await client.query(
            `UPDATE live_ops_campaigns SET status = 'dispatched', dispatched_at = NOW(), dispatched_by = 'auto_scheduler', updated_at = NOW() WHERE id = $1`,
            [campaign.id]
          );
          stats.dispatched++;
          logger.info(`[live-ops-scheduler] Auto-dispatched campaign #${campaign.id}: ${campaign.title}`);
        } catch (err) {
          stats.errors++;
          logger.error(`[live-ops-scheduler] Dispatch error for campaign #${campaign.id}:`, err.message);
        }
      }
    } catch (err) {
      // Table may not exist
      logger.warn("[live-ops-scheduler] Campaign dispatch query failed:", err.message);
    }
  }

  // ─── Auto-expire ended campaigns ───
  async function expireEndedCampaigns(client, config) {
    if (!config.auto_expire_campaigns) return;

    try {
      const result = await client.query(`
        UPDATE live_ops_campaigns
        SET status = 'expired', updated_at = NOW()
        WHERE status IN ('dispatched', 'active')
          AND ends_at IS NOT NULL
          AND ends_at < NOW()
        RETURNING id
      `);

      const expired = result.rowCount || 0;
      stats.expired += expired;
      if (expired > 0) {
        logger.info(`[live-ops-scheduler] Expired ${expired} campaigns`);
      }
    } catch (err) {
      logger.warn("[live-ops-scheduler] Campaign expiry query failed:", err.message);
    }
  }

  // ─── Auto-rotate anomalies ───
  async function rotateAnomalies(client, config) {
    if (!config.auto_rotate_anomalies) return;

    try {
      // Check if current anomaly is expired
      const current = await client.query(`
        SELECT id, ends_at FROM active_anomalies
        WHERE status = 'active'
        ORDER BY created_at DESC LIMIT 1
      `).catch(() => ({ rows: [] }));

      const activeAnomaly = current.rows[0];
      const now = new Date();

      if (activeAnomaly && new Date(activeAnomaly.ends_at) > now) {
        return; // Still active
      }

      // Expire old anomaly
      if (activeAnomaly) {
        await client.query(
          `UPDATE active_anomalies SET status = 'expired', updated_at = NOW() WHERE id = $1`,
          [activeAnomaly.id]
        ).catch(() => {});
      }

      // Generate new anomaly
      const ANOMALY_TYPES = [
        { key: "xp_surge", title_tr: "XP Dalgası", title_en: "XP Surge", bonus: "x2 XP", duration_h: config.anomaly_rotate_hours },
        { key: "sc_rain", title_tr: "SC Yağmuru", title_en: "SC Rain", bonus: "x3 SC", duration_h: config.anomaly_rotate_hours },
        { key: "hc_storm", title_tr: "HC Fırtınası", title_en: "HC Storm", bonus: "+50% HC", duration_h: config.anomaly_rotate_hours },
        { key: "streak_shield", title_tr: "Seri Kalkanı", title_en: "Streak Shield", bonus: "No Streak Loss", duration_h: config.anomaly_rotate_hours },
        { key: "mint_boost", title_tr: "Mint Artışı", title_en: "Mint Boost", bonus: "+25% NXT Mint", duration_h: config.anomaly_rotate_hours },
        { key: "task_frenzy", title_tr: "Görev Çılgınlığı", title_en: "Task Frenzy", bonus: "x2 Task Rewards", duration_h: config.anomaly_rotate_hours }
      ];

      const anomaly = ANOMALY_TYPES[Math.floor(Math.random() * ANOMALY_TYPES.length)];
      const endsAt = new Date(now.getTime() + anomaly.duration_h * 3_600_000);

      await client.query(`
        INSERT INTO active_anomalies (anomaly_key, title_tr, title_en, bonus_text, status, starts_at, ends_at, created_at)
        VALUES ($1, $2, $3, $4, 'active', NOW(), $5, NOW())
      `, [anomaly.key, anomaly.title_tr, anomaly.title_en, anomaly.bonus, endsAt]).catch(() => {});

      stats.anomalies_rotated++;
      logger.info(`[live-ops-scheduler] Rotated anomaly → ${anomaly.key} (${anomaly.bonus}) until ${endsAt.toISOString()}`);

    } catch (err) {
      logger.warn("[live-ops-scheduler] Anomaly rotation failed:", err.message);
    }
  }

  // ─── Auto-generate recurring events ───
  async function generateRecurringEvents(client, config) {
    if (!config.auto_generate_events) return;

    try {
      // Check what events are active
      const activeResult = await client.query(`
        SELECT event_type, MAX(created_at) AS latest
        FROM game_events
        WHERE status IN ('active', 'upcoming')
        GROUP BY event_type
      `).catch(() => ({ rows: [] }));

      const activeTypes = new Map();
      for (const row of activeResult.rows) {
        activeTypes.set(row.event_type, new Date(row.latest));
      }

      const now = new Date();
      const EVENT_DEFS = [
        {
          type: "tournament",
          title_tr: "Arena Turnuvası",
          title_en: "Arena Tournament",
          desc_tr: "PvP turnuvasında ilk 10 sıraya gir, özel HC ödülü kazan.",
          desc_en: "Reach top 10 in PvP tournament, earn special HC rewards.",
          reward: "500 HC + Badge",
          interval_h: config.tournament_interval_hours,
          duration_h: 168
        },
        {
          type: "war",
          title_tr: "Krallık Savaşı",
          title_en: "Kingdom War",
          desc_tr: "Takımını seç ve topluluk havuzuna katkı yap.",
          desc_en: "Pick your team and contribute to the community pool.",
          reward: "3x Pool Share",
          interval_h: config.war_interval_hours,
          duration_h: 72
        },
        {
          type: "flash",
          title_tr: "Flash Drop",
          title_en: "Flash Drop",
          desc_tr: "Sınırlı süreli özel ödül havuzu. İlk gelenler kazanır.",
          desc_en: "Limited time special reward pool. First come, first served.",
          reward: "Mystery Box",
          interval_h: config.flash_drop_interval_hours,
          duration_h: 2
        }
      ];

      for (const def of EVENT_DEFS) {
        const lastCreated = activeTypes.get(def.type);
        const hoursSinceLast = lastCreated
          ? (now.getTime() - lastCreated.getTime()) / 3_600_000
          : Infinity;

        if (hoursSinceLast >= def.interval_h) {
          const startsAt = now;
          const endsAt = new Date(now.getTime() + def.duration_h * 3_600_000);

          await client.query(`
            INSERT INTO game_events (event_type, title_tr, title_en, description_tr, description_en, reward_text, status, starts_at, ends_at, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, 'active', $7, $8, NOW())
          `, [def.type, def.title_tr, def.title_en, def.desc_tr, def.desc_en, def.reward, startsAt, endsAt]).catch(() => {});

          stats.events_generated++;
          logger.info(`[live-ops-scheduler] Generated ${def.type} event: ${def.title_en} until ${endsAt.toISOString()}`);
        }
      }

      // Auto-expire old events
      await client.query(`
        UPDATE game_events SET status = 'ended', updated_at = NOW()
        WHERE status = 'active' AND ends_at < NOW()
      `).catch(() => {});

    } catch (err) {
      logger.warn("[live-ops-scheduler] Event generation failed:", err.message);
    }
  }

  // ─── Main cycle ───
  async function runCycle() {
    if (running) return;
    running = true;
    stats.cycles++;
    stats.last_run = new Date().toISOString();

    let client;
    try {
      const runtimeConfig = typeof getRuntimeConfig === "function" ? getRuntimeConfig() : {};
      const config = mergeSchedulerConfig(runtimeConfig.live_ops_scheduler);

      if (!config.enabled) {
        running = false;
        return;
      }

      // Check scene gate
      const sceneGate = typeof resolveSceneGate === "function" ? resolveSceneGate() : { ready_for_auto_dispatch: true };
      stats.scene_gate_state = sceneGate.scene_gate_state || "unknown";

      client = await pool.connect();

      // Always run expiry and rotation (even if gate is not clear for dispatch)
      await expireEndedCampaigns(client, config);
      await rotateAnomalies(client, config);
      await generateRecurringEvents(client, config);

      // Only dispatch if scene gate allows
      if (sceneGate.ready_for_auto_dispatch !== false) {
        await dispatchApprovedCampaigns(client, config);
      } else {
        logger.info(`[live-ops-scheduler] Dispatch paused — scene gate: ${sceneGate.scene_gate_state}`);
      }

    } catch (err) {
      stats.errors++;
      stats.last_error = err.message;
      logger.error("[live-ops-scheduler] cycle error:", err.message);
    } finally {
      if (client) client.release();
      running = false;
    }
  }

  function start() {
    if (intervalId) return;
    logger.info(`[live-ops-scheduler] Starting with ${SCHEDULER_INTERVAL_MS / 1000}s interval`);
    runCycle();
    intervalId = setInterval(runCycle, SCHEDULER_INTERVAL_MS);
  }

  function stop() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
      logger.info("[live-ops-scheduler] Stopped");
    }
  }

  function getStats() {
    return { ...stats, running, interval_ms: SCHEDULER_INTERVAL_MS };
  }

  return { start, stop, runCycle, getStats };
}

module.exports = { createLiveOpsAutoScheduler, DEFAULT_SCHEDULER_CONFIG, mergeSchedulerConfig };
