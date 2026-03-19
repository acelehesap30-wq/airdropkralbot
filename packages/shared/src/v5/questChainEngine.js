"use strict";

/**
 * questChainEngine.js
 *
 * Pure helpers for quest-chain progression, step completion checks and
 * chain-level reward aggregation.  No side-effects, no I/O.
 */

// ── constants ────────────────────────────────────────────────────────────────

var QUEST_CHAINS = Object.freeze([
  Object.freeze({
    id: "nexus_awakening",
    name_tr: "Nexus Uyanışı",
    name_en: "Nexus Awakening",
    steps: Object.freeze([
      Object.freeze({
        id: "na_step_1",
        description_tr: "İlk görevini tamamla",
        description_en: "Complete your first task",
        requirement: Object.freeze({ type: "tasks_completed", value: 1 }),
        reward: Object.freeze({ sc: 50, hc: 0, seasonPts: 10 })
      }),
      Object.freeze({
        id: "na_step_2",
        description_tr: "3 günlük giriş serisi yap",
        description_en: "Achieve a 3-day login streak",
        requirement: Object.freeze({ type: "login_streak", value: 3 }),
        reward: Object.freeze({ sc: 100, hc: 0, seasonPts: 20 })
      }),
      Object.freeze({
        id: "na_step_3",
        description_tr: "İlk eşyanı birleştir",
        description_en: "Fuse your first item",
        requirement: Object.freeze({ type: "items_fused", value: 1 }),
        reward: Object.freeze({ sc: 150, hc: 1, seasonPts: 30 })
      }),
      Object.freeze({
        id: "na_step_4",
        description_tr: "10 görev tamamla",
        description_en: "Complete 10 tasks",
        requirement: Object.freeze({ type: "tasks_completed", value: 10 }),
        reward: Object.freeze({ sc: 300, hc: 2, seasonPts: 50 })
      }),
      Object.freeze({
        id: "na_step_5",
        description_tr: "Bir arkadaşını davet et",
        description_en: "Invite a friend",
        requirement: Object.freeze({ type: "referrals", value: 1 }),
        reward: Object.freeze({ sc: 500, hc: 5, seasonPts: 100 })
      })
    ])
  }),
  Object.freeze({
    id: "arena_master",
    name_tr: "Arena Ustası",
    name_en: "Arena Master",
    steps: Object.freeze([
      Object.freeze({
        id: "am_step_1",
        description_tr: "İlk PvP maçını kazan",
        description_en: "Win your first PvP match",
        requirement: Object.freeze({ type: "pvp_wins", value: 1 }),
        reward: Object.freeze({ sc: 100, hc: 0, seasonPts: 15 })
      }),
      Object.freeze({
        id: "am_step_2",
        description_tr: "5 PvP maçı kazan",
        description_en: "Win 5 PvP matches",
        requirement: Object.freeze({ type: "pvp_wins", value: 5 }),
        reward: Object.freeze({ sc: 250, hc: 1, seasonPts: 40 })
      }),
      Object.freeze({
        id: "am_step_3",
        description_tr: "3 ardışık PvP galibiyeti al",
        description_en: "Achieve a 3-win PvP streak",
        requirement: Object.freeze({ type: "pvp_win_streak", value: 3 }),
        reward: Object.freeze({ sc: 500, hc: 3, seasonPts: 75 })
      }),
      Object.freeze({
        id: "am_step_4",
        description_tr: "Sezon sıralama listesine gir (ilk 100)",
        description_en: "Enter the season leaderboard (top 100)",
        requirement: Object.freeze({ type: "leaderboard_rank", value: 100 }),
        reward: Object.freeze({ sc: 1000, hc: 10, seasonPts: 200 })
      })
    ])
  }),
  Object.freeze({
    id: "treasure_hunter",
    name_tr: "Hazine Avcısı",
    name_en: "Treasure Hunter",
    steps: Object.freeze([
      Object.freeze({
        id: "th_step_1",
        description_tr: "5 eşya topla",
        description_en: "Collect 5 items",
        requirement: Object.freeze({ type: "items_collected", value: 5 }),
        reward: Object.freeze({ sc: 75, hc: 0, seasonPts: 10 })
      }),
      Object.freeze({
        id: "th_step_2",
        description_tr: "Nadir (rare) veya üstü bir eşya edin",
        description_en: "Obtain a rare or higher item",
        requirement: Object.freeze({ type: "rare_items_obtained", value: 1 }),
        reward: Object.freeze({ sc: 300, hc: 2, seasonPts: 50 })
      }),
      Object.freeze({
        id: "th_step_3",
        description_tr: "3 eşyayı birleştirerek epik yap",
        description_en: "Fuse items to create an epic",
        requirement: Object.freeze({ type: "epic_items_created", value: 1 }),
        reward: Object.freeze({ sc: 750, hc: 5, seasonPts: 120 })
      })
    ])
  })
]);

// ── helpers ──────────────────────────────────────────────────────────────────

function findChain(chainId) {
  var id = String(chainId);
  for (var i = 0; i < QUEST_CHAINS.length; i++) {
    if (QUEST_CHAINS[i].id === id) return QUEST_CHAINS[i];
  }
  return null;
}

// ── public API ───────────────────────────────────────────────────────────────

/**
 * Get all chains annotated with the user's current step.
 *
 * @param {object} userProgress  map of chainId -> completedStepIndex (0-based,
 *                               -1 or missing means no steps completed)
 * @returns {Array} chains with an added `currentStepIndex` and `completed` flag
 */
function getActiveChains(userProgress) {
  var progress = userProgress && typeof userProgress === "object" ? userProgress : {};

  var result = [];
  for (var i = 0; i < QUEST_CHAINS.length; i++) {
    var chain = QUEST_CHAINS[i];
    var raw = Number(progress[chain.id]);
    var completedIndex = Number.isFinite(raw) ? Math.floor(raw) : -1;
    var nextIndex = completedIndex + 1;
    var chainComplete = nextIndex >= chain.steps.length;

    result.push({
      id: chain.id,
      name_tr: chain.name_tr,
      name_en: chain.name_en,
      totalSteps: chain.steps.length,
      currentStepIndex: chainComplete ? chain.steps.length : nextIndex,
      completed: chainComplete,
      currentStep: chainComplete ? null : chain.steps[nextIndex]
    });
  }

  return result;
}

/**
 * Check whether a specific step's requirement is met by the user's stats.
 *
 * @param {object} step       a step object from QUEST_CHAINS
 * @param {object} userStats  map of requirement-type -> current value
 * @returns {boolean}
 */
function isStepComplete(step, userStats) {
  if (!step || typeof step !== "object") return false;
  if (!step.requirement || typeof step.requirement !== "object") return false;

  var stats = userStats && typeof userStats === "object" ? userStats : {};
  var reqType = String(step.requirement.type || "");
  var reqValue = Number(step.requirement.value);
  if (!Number.isFinite(reqValue)) return false;

  var current = Number(stats[reqType]);
  if (!Number.isFinite(current)) return false;

  // For leaderboard_rank, lower is better (must be <= requirement)
  if (reqType === "leaderboard_rank") {
    return current > 0 && current <= reqValue;
  }

  return current >= reqValue;
}

/**
 * Compute the total aggregated reward for completing an entire chain.
 *
 * @param {string} chainId
 * @returns {{ sc: number, hc: number, seasonPts: number } | null}
 */
function computeChainReward(chainId) {
  var chain = findChain(chainId);
  if (!chain) return null;

  var total = { sc: 0, hc: 0, seasonPts: 0 };

  for (var i = 0; i < chain.steps.length; i++) {
    var r = chain.steps[i].reward;
    if (!r) continue;
    total.sc += Number(r.sc) || 0;
    total.hc += Number(r.hc) || 0;
    total.seasonPts += Number(r.seasonPts) || 0;
  }

  return total;
}

/**
 * Get the next incomplete step in a chain, or null if the chain is done.
 *
 * @param {string} chainId
 * @param {number} currentStep  0-based index of the last completed step
 *                              (-1 means no steps completed)
 * @returns {object|null}
 */
function getNextStep(chainId, currentStep) {
  var chain = findChain(chainId);
  if (!chain) return null;

  var idx = Math.floor(Number(currentStep));
  if (!Number.isFinite(idx)) idx = -1;

  var nextIdx = idx + 1;
  if (nextIdx >= chain.steps.length) return null;

  return chain.steps[nextIdx];
}

// ── exports ──────────────────────────────────────────────────────────────────

module.exports = {
  QUEST_CHAINS: QUEST_CHAINS,
  getActiveChains: getActiveChains,
  isStepComplete: isStepComplete,
  computeChainReward: computeChainReward,
  getNextStep: getNextStep
};
