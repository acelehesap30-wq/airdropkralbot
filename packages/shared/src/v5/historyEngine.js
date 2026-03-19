"use strict";

/**
 * historyEngine.js
 *
 * Pure helpers for building history queries, formatting raw history entries
 * and summarising earnings / spending.  No side-effects, no I/O.
 */

// ── constants ────────────────────────────────────────────────────────────────

var VALID_TYPES = Object.freeze(["all", "task", "pvp", "payout", "token", "reward"]);

var CURRENCY_KEYS = Object.freeze(["sc", "hc", "rc"]);

var DEFAULT_LIMIT = 20;
var MAX_LIMIT = 100;

// ── helpers ──────────────────────────────────────────────────────────────────

function safePositiveInt(value, fallback) {
  var num = Math.floor(Number(value));
  return Number.isFinite(num) && num > 0 ? num : fallback;
}

function safeNonNegativeInt(value, fallback) {
  var num = Math.floor(Number(value));
  return Number.isFinite(num) && num >= 0 ? num : fallback;
}

function zeroCurrencies() {
  return { sc: 0, hc: 0, rc: 0 };
}

// ── public API ───────────────────────────────────────────────────────────────

/**
 * Build a history query descriptor from raw user input.
 *
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.type   one of VALID_TYPES
 * @param {number} params.limit  page size (1-100, default 20)
 * @param {number} params.offset page offset (default 0)
 * @returns {{ filters: object, pagination: object }}
 */
function buildHistoryQuery(params) {
  var p = params && typeof params === "object" ? params : {};

  var userId = p.userId != null ? String(p.userId) : "";
  var type = VALID_TYPES.indexOf(String(p.type)) !== -1 ? String(p.type) : "all";
  var limit = Math.min(MAX_LIMIT, safePositiveInt(p.limit, DEFAULT_LIMIT));
  var offset = safeNonNegativeInt(p.offset, 0);

  var filters = { userId: userId };
  if (type !== "all") {
    filters.type = type;
  }

  return {
    filters: filters,
    pagination: {
      limit: limit,
      offset: offset
    }
  };
}

/**
 * Transform a raw database / API row into a consistent history entry shape.
 *
 * @param {object} raw
 * @returns {object}
 */
function formatHistoryEntry(raw) {
  var r = raw && typeof raw === "object" ? raw : {};

  var id = String(r.id || r._id || "");
  var type = VALID_TYPES.indexOf(String(r.type)) !== -1 ? String(r.type) : "task";
  var descTr = String(r.description_tr || r.descriptionTr || r.description || "");
  var descEn = String(r.description_en || r.descriptionEn || r.description || "");
  var amount = Number(r.amount);
  amount = Number.isFinite(amount) ? amount : 0;
  var currency = CURRENCY_KEYS.indexOf(String(r.currency)) !== -1 ? String(r.currency) : "sc";

  var ts = r.timestamp || r.created_at || r.createdAt;
  var timestamp;
  if (ts != null) {
    var d = new Date(ts);
    timestamp = Number.isFinite(d.getTime()) ? d.toISOString() : "";
  } else {
    timestamp = "";
  }

  var status = String(r.status || "completed");

  return {
    id: id,
    type: type,
    description_tr: descTr,
    description_en: descEn,
    amount: amount,
    currency: currency,
    timestamp: timestamp,
    status: status
  };
}

/**
 * Summarise an array of formatted history entries.
 * Positive amounts count as earned; negative as spent.
 *
 * @param {Array} entries  array of objects returned by formatHistoryEntry
 * @returns {{ totalEarned: {sc,hc,rc}, totalSpent: {sc,hc,rc}, netBalance: {sc,hc,rc} }}
 */
function summarizeHistory(entries) {
  var earned = zeroCurrencies();
  var spent = zeroCurrencies();

  if (!Array.isArray(entries)) {
    return { totalEarned: earned, totalSpent: spent, netBalance: zeroCurrencies() };
  }

  for (var i = 0; i < entries.length; i++) {
    var e = entries[i];
    if (!e || typeof e !== "object") continue;

    var cur = CURRENCY_KEYS.indexOf(String(e.currency)) !== -1 ? String(e.currency) : null;
    if (!cur) continue;

    var amt = Number(e.amount);
    if (!Number.isFinite(amt)) continue;

    if (amt >= 0) {
      earned[cur] += amt;
    } else {
      spent[cur] += Math.abs(amt);
    }
  }

  var net = zeroCurrencies();
  for (var k = 0; k < CURRENCY_KEYS.length; k++) {
    var key = CURRENCY_KEYS[k];
    net[key] = earned[key] - spent[key];
  }

  return {
    totalEarned: earned,
    totalSpent: spent,
    netBalance: net
  };
}

// ── exports ──────────────────────────────────────────────────────────────────

module.exports = {
  VALID_TYPES: VALID_TYPES,
  CURRENCY_KEYS: CURRENCY_KEYS,
  DEFAULT_LIMIT: DEFAULT_LIMIT,
  MAX_LIMIT: MAX_LIMIT,
  buildHistoryQuery: buildHistoryQuery,
  formatHistoryEntry: formatHistoryEntry,
  summarizeHistory: summarizeHistory
};
