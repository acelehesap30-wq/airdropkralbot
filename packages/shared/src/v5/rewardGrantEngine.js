"use strict";

/**
 * rewardGrantEngine.js
 *
 * Blueprint lifecycle:  pending -> granted -> held -> released | reversed | expired
 *
 * Pure business-logic helpers for reward computation, pity system, streak
 * multipliers and grant eligibility.  No side-effects, no I/O.
 */

// ── constants ────────────────────────────────────────────────────────────────

const RARITY_WEIGHTS = Object.freeze({
  common: 50,
  uncommon: 30,
  rare: 15,
  epic: 4,
  legendary: 1
});

const RARITY_ORDER = Object.freeze(["common", "uncommon", "rare", "epic", "legendary"]);

const GRANT_LIFECYCLE = Object.freeze(["pending", "granted", "held", "released", "reversed", "expired"]);

// Base reward table per task tier (1-8).  Values are intentionally small so
// multipliers / bonuses can scale them.
const BASE_REWARDS = Object.freeze({
  1: { sc: 10, hc: 0, rc: 0, seasonPts: 5 },
  2: { sc: 20, hc: 0, rc: 0, seasonPts: 10 },
  3: { sc: 40, hc: 0, rc: 1, seasonPts: 20 },
  4: { sc: 80, hc: 1, rc: 2, seasonPts: 40 },
  5: { sc: 150, hc: 2, rc: 4, seasonPts: 75 },
  6: { sc: 300, hc: 4, rc: 8, seasonPts: 150 },
  7: { sc: 600, hc: 8, rc: 16, seasonPts: 300 },
  8: { sc: 1200, hc: 16, rc: 32, seasonPts: 600 }
});

// Rarity multiplier applied on top of base rewards
const RARITY_MULTIPLIERS = Object.freeze({
  common: 1.0,
  uncommon: 1.2,
  rare: 1.5,
  epic: 2.0,
  legendary: 3.0
});

// ── helpers ──────────────────────────────────────────────────────────────────

function clamp(value, min, max) {
  const num = Number(value);
  if (!Number.isFinite(num)) return min;
  return Math.max(min, Math.min(max, num));
}

function safePositiveInt(value, fallback) {
  const num = Math.floor(Number(value));
  return Number.isFinite(num) && num > 0 ? num : fallback;
}

// Weighted random selection from RARITY_WEIGHTS.  Returns a rarity string.
function weightedRandomRarity() {
  const entries = Object.entries(RARITY_WEIGHTS);
  const totalWeight = entries.reduce(function (sum, entry) { return sum + entry[1]; }, 0);
  let roll = Math.random() * totalWeight;
  for (let i = 0; i < entries.length; i++) {
    roll -= entries[i][1];
    if (roll <= 0) return entries[i][0];
  }
  return "common";
}

// ── public API ───────────────────────────────────────────────────────────────

/**
 * Apply streak multiplier to a base value.
 * Formula: base * (1.0 + streak * 0.05), capped at 2.0x.
 */
function applyStreakMultiplier(base, streak) {
  const b = Number(base);
  if (!Number.isFinite(b)) return 0;
  const s = Math.max(0, Math.floor(Number(streak) || 0));
  const multiplier = clamp(1.0 + s * 0.05, 1.0, 2.0);
  return Math.floor(b * multiplier);
}

/**
 * Roll a rarity using the pity system.
 * When pityCounter >= pityCap the roll is guaranteed rare or better.
 * Otherwise uses weighted random from RARITY_WEIGHTS.
 */
function rollRarity(pityCounter, pityCap) {
  const counter = Math.max(0, Math.floor(Number(pityCounter) || 0));
  const cap = safePositiveInt(pityCap, 50);

  if (counter >= cap) {
    // Guaranteed rare+: re-weight excluding common & uncommon
    const guaranteedEntries = [
      ["rare", RARITY_WEIGHTS.rare],
      ["epic", RARITY_WEIGHTS.epic],
      ["legendary", RARITY_WEIGHTS.legendary]
    ];
    const total = guaranteedEntries.reduce(function (sum, e) { return sum + e[1]; }, 0);
    let roll = Math.random() * total;
    for (let i = 0; i < guaranteedEntries.length; i++) {
      roll -= guaranteedEntries[i][1];
      if (roll <= 0) return guaranteedEntries[i][0];
    }
    return "rare";
  }

  return weightedRandomRarity();
}

/**
 * Compute the full reward grant for a completed task.
 *
 * @param {object} params
 * @param {number} params.taskTier       1-8
 * @param {string} params.taskRarity     common|uncommon|rare|epic|legendary
 * @param {number} params.streakMultiplier  current streak count
 * @param {number} params.anomalyBonus   flat SC bonus from anomaly events
 * @param {number} params.comboChain     consecutive combo count (adds 2% per combo, max 50%)
 * @param {number} params.pityCounter    current pity counter
 * @param {number} params.pityCap        pity threshold
 * @returns {object} { sc, hc, rc, seasonPts, items, pityReset }
 */
function computeRewardGrant(params) {
  const p = params && typeof params === "object" ? params : {};

  const tier = clamp(safePositiveInt(p.taskTier, 1), 1, 8);
  const rarity = RARITY_ORDER.indexOf(String(p.taskRarity)) !== -1 ? String(p.taskRarity) : "common";
  const streak = Math.max(0, Math.floor(Number(p.streakMultiplier) || 0));
  const anomaly = Math.max(0, Math.floor(Number(p.anomalyBonus) || 0));
  const combo = Math.max(0, Math.floor(Number(p.comboChain) || 0));
  const pityCounter = Math.max(0, Math.floor(Number(p.pityCounter) || 0));
  const pityCap = safePositiveInt(p.pityCap, 50);

  const base = BASE_REWARDS[tier] || BASE_REWARDS[1];
  const rarityMul = RARITY_MULTIPLIERS[rarity] || 1.0;
  const comboMul = clamp(1.0 + combo * 0.02, 1.0, 1.5);

  // Apply rarity multiplier, then streak, then combo
  let sc = applyStreakMultiplier(Math.floor(base.sc * rarityMul), streak);
  sc = Math.floor(sc * comboMul) + anomaly;

  let hc = applyStreakMultiplier(Math.floor(base.hc * rarityMul), streak);
  hc = Math.floor(hc * comboMul);

  let rc = applyStreakMultiplier(Math.floor(base.rc * rarityMul), streak);
  rc = Math.floor(rc * comboMul);

  let seasonPts = applyStreakMultiplier(Math.floor(base.seasonPts * rarityMul), streak);
  seasonPts = Math.floor(seasonPts * comboMul);

  // Roll an item reward
  const itemRarity = rollRarity(pityCounter, pityCap);
  const pityReset = RARITY_ORDER.indexOf(itemRarity) >= RARITY_ORDER.indexOf("rare");

  var items = [
    {
      name: "reward_t" + tier + "_" + itemRarity,
      tier: tier,
      rarity: itemRarity
    }
  ];

  return {
    sc: sc,
    hc: hc,
    rc: rc,
    seasonPts: seasonPts,
    items: items,
    pityReset: pityReset
  };
}

/**
 * Check whether a grant is eligible for claiming.
 * Must be in "granted" status and not past its expiry.
 */
function isClaimEligible(grant) {
  const g = grant && typeof grant === "object" ? grant : {};
  var status = String(g.grantStatus || "");
  if (status !== "granted") return false;

  var expiry = g.expiry;
  if (expiry == null) return true; // no expiry means always eligible

  var expiryTime = new Date(expiry).getTime();
  if (!Number.isFinite(expiryTime)) return false;

  return Date.now() < expiryTime;
}

// ── exports ──────────────────────────────────────────────────────────────────

module.exports = {
  RARITY_WEIGHTS: RARITY_WEIGHTS,
  RARITY_ORDER: RARITY_ORDER,
  GRANT_LIFECYCLE: GRANT_LIFECYCLE,
  BASE_REWARDS: BASE_REWARDS,
  RARITY_MULTIPLIERS: RARITY_MULTIPLIERS,
  computeRewardGrant: computeRewardGrant,
  isClaimEligible: isClaimEligible,
  applyStreakMultiplier: applyStreakMultiplier,
  rollRarity: rollRarity
};
