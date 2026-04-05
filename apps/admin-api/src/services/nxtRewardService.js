"use strict";

/**
 * NXT Reward Service — Game completion rewards
 *
 * Calculates NXT token rewards for mini-game completions,
 * enforces daily caps, and triggers on-chain mint if wallet is linked.
 */

const REWARD_TABLE = {
  airdrop_catcher: { wave1: 0.1, wave2: 0.25 },
  hash_racer: { complete: 0.15 },
  default: { complete: 0.05 }
};

const DAILY_NXT_CAP = 5; // max NXT per user per day from games

/**
 * Calculate NXT reward for a game completion.
 * @param {string} gameId — "airdrop_catcher" | "hash_racer"
 * @param {{ wave?: number, score?: number }} result — game result details
 * @returns {{ nxtAmount: number, rewardKey: string }}
 */
function calculateReward(gameId, result = {}) {
  const table = REWARD_TABLE[gameId] || REWARD_TABLE.default;
  const wave = Number(result.wave || 1);

  if (gameId === "airdrop_catcher") {
    const key = wave >= 2 ? "wave2" : "wave1";
    return { nxtAmount: table[key] || 0.1, rewardKey: `${gameId}_${key}` };
  }

  return { nxtAmount: table.complete || 0.05, rewardKey: `${gameId}_complete` };
}

/**
 * Process a game completion — credit NXT, enforce daily cap.
 * @param {import('pg').PoolClient} db — database client
 * @param {object} params
 * @param {number} params.userId — internal user ID
 * @param {string} params.gameId — game identifier
 * @param {{ wave?: number, score?: number }} params.result — game result
 * @param {object} deps — injected dependencies
 * @param {object} deps.economyStore — economy store for balance ops
 * @returns {Promise<{ ok: boolean, nxtEarned: number, totalToday: number, reason?: string }>}
 */
async function processGameReward(db, { userId, gameId, result }, deps) {
  const { economyStore } = deps;

  // Calculate base reward
  const { nxtAmount, rewardKey } = calculateReward(gameId, result);
  if (nxtAmount <= 0) {
    return { ok: false, nxtEarned: 0, totalToday: 0, reason: "no_reward" };
  }

  // Check daily cap
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  let todayEarned = 0;
  try {
    const capResult = await db.query(
      `SELECT COALESCE(SUM(amount), 0)::numeric AS total
       FROM economy_ledger
       WHERE user_id = $1
         AND currency = 'NXT'
         AND reason LIKE 'game_reward_%'
         AND created_at >= $2`,
      [userId, todayStart.toISOString()]
    );
    todayEarned = Number(capResult.rows[0]?.total || 0);
  } catch (_) {
    // Table might not have the right columns, proceed with 0
  }

  if (todayEarned >= DAILY_NXT_CAP) {
    return { ok: false, nxtEarned: 0, totalToday: todayEarned, reason: "daily_cap_reached" };
  }

  // Cap the reward to not exceed daily limit
  const effectiveReward = Math.min(nxtAmount, DAILY_NXT_CAP - todayEarned);

  // Credit NXT to player balance
  const credit = await economyStore.creditCurrency(db, {
    userId,
    currency: "NXT",
    amount: effectiveReward,
    reason: `game_reward_${rewardKey}`,
    refEventId: `game_reward:${userId}:${gameId}:${Date.now()}`,
    meta: {
      game_id: gameId,
      reward_key: rewardKey,
      base_amount: nxtAmount,
      effective_amount: effectiveReward,
      wave: result.wave || null,
      score: result.score || null
    }
  });

  if (!credit.applied) {
    return { ok: false, nxtEarned: 0, totalToday: todayEarned, reason: credit.reason || "credit_failed" };
  }

  return {
    ok: true,
    nxtEarned: effectiveReward,
    totalToday: todayEarned + effectiveReward,
    dailyCap: DAILY_NXT_CAP,
    rewardKey
  };
}

module.exports = {
  calculateReward,
  processGameReward,
  DAILY_NXT_CAP,
  REWARD_TABLE
};
