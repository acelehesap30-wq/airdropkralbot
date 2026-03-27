"use strict";

// Blueprint §9 — Risk scoring, hold rules, enforcement ladder
// Baseline implementation: high-value first payout, shared destination, rapid play dampening

const RISK_BAND_THRESHOLDS = Object.freeze({
  low:      0.25,
  medium:   0.55,
  high:     0.80,
  critical: 1.01   // sentinel — anything >= 0.80 is "high"
});

function resolveRiskBand(score) {
  if (score >= RISK_BAND_THRESHOLDS.high)   return "high";
  if (score >= RISK_BAND_THRESHOLDS.medium) return "medium";
  if (score >= RISK_BAND_THRESHOLDS.low)    return "low";
  return "safe";
}

/**
 * Compute a simple risk score for a payout request.
 * Returns { score, band, factors, shouldHold }
 */
async function scorePayoutRisk(client, { userId, destinationAddress, amountSc, chain }) {
  const factors = {};
  let score = 0;

  // Factor 1: High-value first payout
  const prevPayouts = await client.query(
    `SELECT COUNT(*) AS cnt FROM payout_requests WHERE user_id = $1 AND status = 'approved'`,
    [userId]
  );
  const prevCount = Number(prevPayouts.rows[0]?.cnt || 0);
  if (prevCount === 0 && amountSc > 5000) {
    factors.high_value_first_payout = 0.45;
    score += 0.45;
  }

  // Factor 2: Shared destination address (same address used by multiple users)
  if (destinationAddress && String(destinationAddress).length > 10) {
    const sharedDest = await client.query(
      `SELECT COUNT(DISTINCT user_id) AS cnt FROM payout_requests
       WHERE destination_address = $1 AND user_id != $2`,
      [String(destinationAddress), userId]
    );
    const sharedCount = Number(sharedDest.rows[0]?.cnt || 0);
    if (sharedCount >= 3) {
      factors.shared_destination = 0.40;
      score += 0.40;
    } else if (sharedCount >= 1) {
      factors.shared_destination_minor = 0.15;
      score += 0.15;
    }
  }

  // Factor 3: Rapid play — many game completions in last hour
  const rapidPlay = await client.query(
    `SELECT COUNT(*) AS cnt FROM player_lifecycle_events
     WHERE user_id = $1
       AND event_name = 'player.game.complete'
       AND occurred_at > NOW() - INTERVAL '1 hour'`,
    [userId]
  );
  const recentGames = Number(rapidPlay.rows[0]?.cnt || 0);
  if (recentGames > 30) {
    factors.rapid_play_heavy = 0.30;
    score += 0.30;
  } else if (recentGames > 15) {
    factors.rapid_play_moderate = 0.10;
    score += 0.10;
  }

  const clampedScore = Math.min(1, Math.max(0, Number(score.toFixed(4))));
  const band = resolveRiskBand(clampedScore);
  const shouldHold = clampedScore >= RISK_BAND_THRESHOLDS.medium;

  return { score: clampedScore, band, factors, shouldHold };
}

/**
 * Insert a risk hold record. Returns hold id.
 */
async function insertRiskHold(client, { userId, reason, holdUntilMs = null, riskScore = 0, meta = {} }) {
  const holdUntil = holdUntilMs ? new Date(Date.now() + holdUntilMs).toISOString() : null;
  const result = await client.query(
    `INSERT INTO risk_holds (user_id, reason, hold_until, risk_score, meta)
     VALUES ($1, $2, $3, $4, $5::jsonb)
     RETURNING id`,
    [
      Number(userId),
      String(reason),
      holdUntil,
      Number(riskScore),
      JSON.stringify(meta || {})
    ]
  );
  return Number(result.rows[0]?.id || 0);
}

/**
 * Check if user has an active hold. Returns { held, reason, holdId }
 */
async function checkActiveHold(client, userId) {
  const result = await client.query(
    `SELECT id, reason FROM risk_holds
     WHERE user_id = $1
       AND released_at IS NULL
       AND (hold_until IS NULL OR hold_until > NOW())
     ORDER BY created_at DESC
     LIMIT 1`,
    [Number(userId)]
  );
  if (result.rows.length === 0) return { held: false, reason: null, holdId: null };
  return {
    held: true,
    reason: String(result.rows[0].reason || "risk_hold"),
    holdId: Number(result.rows[0].id)
  };
}

/**
 * Snapshot risk score to risk_score_snapshots and update users.risk_band
 */
async function persistRiskScore(client, { userId, score, band, factors }) {
  await client.query(
    `INSERT INTO risk_score_snapshots (user_id, score, factors)
     VALUES ($1, $2, $3::jsonb)`,
    [Number(userId), Number(score), JSON.stringify(factors || {})]
  );
  await client.query(
    `UPDATE users SET risk_band = $1 WHERE id = $2`,
    [String(band), Number(userId)]
  );
}

module.exports = {
  scorePayoutRisk,
  insertRiskHold,
  checkActiveHold,
  persistRiskScore,
  resolveRiskBand
};
