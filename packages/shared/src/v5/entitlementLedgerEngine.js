"use strict";

const crypto = require("crypto");

const LEDGER_ENTRY_TYPES = Object.freeze([
  "grant",
  "revoke",
  "payout_request",
  "payout_approved",
  "payout_rejected",
  "payout_completed",
  "conversion",
  "adjustment"
]);

const LEDGER_CURRENCIES = Object.freeze(["sc", "hc", "rc", "nxt", "btc"]);

function normalizeLedgerType(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeCurrency(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function isValidEntryType(value) {
  return LEDGER_ENTRY_TYPES.includes(normalizeLedgerType(value));
}

function isValidCurrency(value) {
  return LEDGER_CURRENCIES.includes(normalizeCurrency(value));
}

function buildLedgerEntry(options = {}) {
  const entryType = normalizeLedgerType(options.entry_type || options.entryType);
  if (!isValidEntryType(entryType)) {
    return { ok: false, error: "ledger_entry_type_invalid", entry_type: entryType };
  }

  const currency = normalizeCurrency(options.currency);
  if (!isValidCurrency(currency)) {
    return { ok: false, error: "ledger_currency_invalid", currency };
  }

  const userId = Number(options.user_id || options.userId || 0);
  if (!userId) {
    return { ok: false, error: "ledger_user_id_missing" };
  }

  const amount = Number(options.amount || 0);
  if (amount === 0) {
    return { ok: false, error: "ledger_amount_zero" };
  }

  const source = String(options.source || "system").trim();
  const referenceId = String(options.reference_id || options.referenceId || "").trim();
  const metadata = options.metadata && typeof options.metadata === "object" ? options.metadata : {};
  const createdAt = new Date().toISOString();

  const entryHash = crypto
    .createHash("sha256")
    .update(`${userId}:${entryType}:${currency}:${amount}:${createdAt}:${referenceId}`)
    .digest("hex");

  return {
    ok: true,
    entry: {
      entry_hash: entryHash,
      user_id: userId,
      entry_type: entryType,
      currency,
      amount,
      source,
      reference_id: referenceId || null,
      metadata,
      created_at: createdAt,
      is_credit: amount > 0,
      is_debit: amount < 0
    }
  };
}

function buildPayoutRequestEntry(options = {}) {
  const userId = Number(options.user_id || options.userId || 0);
  const btcAmount = Number(options.btc_amount || options.btcAmount || 0);
  const walletAddress = String(options.wallet_address || options.walletAddress || "").trim();
  const network = String(options.network || "btc").trim().toLowerCase();

  if (!userId) return { ok: false, error: "ledger_user_id_missing" };
  if (btcAmount <= 0) return { ok: false, error: "ledger_payout_amount_invalid" };
  if (!walletAddress) return { ok: false, error: "ledger_wallet_address_missing" };

  return buildLedgerEntry({
    entry_type: "payout_request",
    currency: "btc",
    user_id: userId,
    amount: -btcAmount,
    source: "payout_system",
    reference_id: options.reference_id || options.referenceId || "",
    metadata: {
      wallet_address: walletAddress,
      network,
      requested_at: new Date().toISOString()
    }
  });
}

function buildGrantEntry(options = {}) {
  return buildLedgerEntry({
    entry_type: "grant",
    currency: options.currency,
    user_id: options.user_id || options.userId,
    amount: Math.abs(Number(options.amount || 0)),
    source: options.source || "reward",
    reference_id: options.reference_id || options.referenceId || "",
    metadata: options.metadata
  });
}

function computeBalance(entries, currency) {
  const cur = normalizeCurrency(currency);
  let balance = 0;
  for (const entry of entries) {
    if (normalizeCurrency(entry.currency) === cur) {
      balance += Number(entry.amount || 0);
    }
  }
  return { currency: cur, balance, entry_count: entries.length };
}

function validateLedgerIntegrity(entries) {
  const seen = new Set();
  const issues = [];

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (!entry.entry_hash) {
      issues.push({ index: i, error: "missing_hash" });
      continue;
    }
    if (seen.has(entry.entry_hash)) {
      issues.push({ index: i, error: "duplicate_hash", hash: entry.entry_hash });
    }
    seen.add(entry.entry_hash);

    if (!isValidEntryType(entry.entry_type)) {
      issues.push({ index: i, error: "invalid_entry_type", value: entry.entry_type });
    }
    if (!isValidCurrency(entry.currency)) {
      issues.push({ index: i, error: "invalid_currency", value: entry.currency });
    }
  }

  return {
    ok: issues.length === 0,
    total_entries: entries.length,
    unique_hashes: seen.size,
    issues
  };
}

module.exports = {
  LEDGER_ENTRY_TYPES,
  LEDGER_CURRENCIES,
  normalizeLedgerType,
  normalizeCurrency,
  isValidEntryType,
  isValidCurrency,
  buildLedgerEntry,
  buildPayoutRequestEntry,
  buildGrantEntry,
  computeBalance,
  validateLedgerIntegrity
};
