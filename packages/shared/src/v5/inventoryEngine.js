"use strict";

/**
 * inventoryEngine.js
 *
 * Pure helpers for inventory categorisation, item fusion, expiry checks and
 * rarity-based sorting.  No side-effects, no I/O.
 */

// ── constants ────────────────────────────────────────────────────────────────

const RARITY_ORDER = Object.freeze(["common", "uncommon", "rare", "epic", "legendary"]);

const CATEGORY_KEYS = Object.freeze(["boosts", "materials", "collectibles", "loot"]);

// ── helpers ──────────────────────────────────────────────────────────────────

function safeString(value, fallback) {
  return value != null ? String(value) : fallback;
}

function rarityIndex(rarity) {
  var idx = RARITY_ORDER.indexOf(String(rarity));
  return idx === -1 ? 0 : idx;
}

// ── public API ───────────────────────────────────────────────────────────────

/**
 * Categorise an array of items into { boosts, materials, collectibles, loot }.
 * Each item is expected to have a `category` field.  Items with an unknown or
 * missing category fall into "loot".
 */
function categorizeItems(items) {
  var result = {
    boosts: [],
    materials: [],
    collectibles: [],
    loot: []
  };

  if (!Array.isArray(items)) return result;

  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    if (!item || typeof item !== "object") continue;

    var cat = safeString(item.category, "loot").toLowerCase();
    if (cat === "boost" || cat === "boosts") {
      result.boosts.push(item);
    } else if (cat === "material" || cat === "materials") {
      result.materials.push(item);
    } else if (cat === "collectible" || cat === "collectibles") {
      result.collectibles.push(item);
    } else {
      result.loot.push(item);
    }
  }

  return result;
}

/**
 * Determine whether two items can be fused.
 * Rules: same rarity, same category, neither is locked.
 */
function canFuse(item1, item2) {
  if (!item1 || typeof item1 !== "object") return false;
  if (!item2 || typeof item2 !== "object") return false;

  if (item1.locked || item2.locked) return false;

  var r1 = safeString(item1.rarity, "");
  var r2 = safeString(item2.rarity, "");
  if (r1 === "" || r2 === "" || r1 !== r2) return false;

  // Cannot fuse legendary items (no higher rarity exists)
  if (r1 === "legendary") return false;

  var c1 = safeString(item1.category, "").toLowerCase();
  var c2 = safeString(item2.category, "").toLowerCase();
  if (c1 === "" || c2 === "" || c1 !== c2) return false;

  return true;
}

/**
 * Compute the result of fusing two items.
 * The result takes the name from item1, keeps the same tier, and advances to
 * the next rarity in RARITY_ORDER.  Returns null if the fusion is invalid.
 */
function computeFuseResult(item1, item2) {
  if (!canFuse(item1, item2)) return null;

  var currentIdx = rarityIndex(item1.rarity);
  var nextIdx = Math.min(currentIdx + 1, RARITY_ORDER.length - 1);

  var baseName = safeString(item1.name, "fused_item");
  // Strip any existing rarity suffix to build a clean name
  var cleanName = baseName;
  for (var i = 0; i < RARITY_ORDER.length; i++) {
    var suffix = "_" + RARITY_ORDER[i];
    if (cleanName.endsWith(suffix)) {
      cleanName = cleanName.slice(0, cleanName.length - suffix.length);
      break;
    }
  }

  return {
    name: cleanName + "_" + RARITY_ORDER[nextIdx],
    tier: Number(item1.tier) || 1,
    rarity: RARITY_ORDER[nextIdx]
  };
}

/**
 * Check whether an item has expired.
 * Items without an `expiresAt` field are considered permanent (not expired).
 */
function isExpired(item) {
  if (!item || typeof item !== "object") return false;

  var expiresAt = item.expiresAt || item.expires_at;
  if (expiresAt == null) return false;

  var expiryTime = new Date(expiresAt).getTime();
  if (!Number.isFinite(expiryTime)) return false;

  return Date.now() >= expiryTime;
}

/**
 * Sort items by rarity, legendary first (descending order).
 * Returns a new array; does not mutate the input.
 */
function sortByRarity(items) {
  if (!Array.isArray(items)) return [];

  return items.slice().sort(function (a, b) {
    var idxA = rarityIndex(a && a.rarity);
    var idxB = rarityIndex(b && b.rarity);
    return idxB - idxA; // higher index = rarer = first
  });
}

// ── exports ──────────────────────────────────────────────────────────────────

module.exports = {
  RARITY_ORDER: RARITY_ORDER,
  CATEGORY_KEYS: CATEGORY_KEYS,
  categorizeItems: categorizeItems,
  canFuse: canFuse,
  computeFuseResult: computeFuseResult,
  isExpired: isExpired,
  sortByRarity: sortByRarity
};
