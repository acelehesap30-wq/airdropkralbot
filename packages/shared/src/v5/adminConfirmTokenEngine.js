"use strict";

const crypto = require("crypto");
const { CRITICAL_ACTIONS, normalizeActionKey } = require("./adminPolicyEngine");

const DEFAULT_TOKEN_TTL_SEC = 120;
const DEFAULT_COOLDOWN_MS = 8000;
const MAX_TOKEN_TTL_SEC = 600;
const TOKEN_BYTE_LENGTH = 24;

function generateConfirmToken(size = TOKEN_BYTE_LENGTH) {
  return crypto.randomBytes(Math.max(16, size)).toString("hex");
}

function hashConfirmToken(token) {
  return crypto
    .createHash("sha256")
    .update(String(token || ""))
    .digest("hex");
}

function buildConfirmRequest(options = {}) {
  const actionKey = normalizeActionKey(options.action_key || options.actionKey);
  if (!actionKey) {
    return { ok: false, error: "confirm_action_key_missing" };
  }

  const isCritical = CRITICAL_ACTIONS.has(actionKey) || Boolean(options.critical);
  if (!isCritical) {
    return {
      ok: true,
      action_key: actionKey,
      critical: false,
      confirmation_required: false,
      token: null,
      token_hash: null,
      ttl_sec: 0,
      cooldown_ms: 0,
      issued_at: new Date().toISOString(),
      expires_at: null
    };
  }

  const adminId = Number(options.admin_id || options.adminId || 0);
  const ttlSec = Math.max(
    30,
    Math.min(MAX_TOKEN_TTL_SEC, Number(options.ttl_sec || options.ttlSec || DEFAULT_TOKEN_TTL_SEC))
  );
  const cooldownMs = Math.max(
    1000,
    Number(options.cooldown_ms || options.cooldownMs || DEFAULT_COOLDOWN_MS)
  );
  const token = generateConfirmToken();
  const tokenHash = hashConfirmToken(token);
  const issuedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + ttlSec * 1000).toISOString();
  const payload = options.payload && typeof options.payload === "object" ? options.payload : {};

  return {
    ok: true,
    action_key: actionKey,
    critical: true,
    confirmation_required: true,
    admin_id: adminId,
    token,
    token_hash: tokenHash,
    ttl_sec: ttlSec,
    cooldown_ms: cooldownMs,
    issued_at: issuedAt,
    expires_at: expiresAt,
    payload_fingerprint: crypto
      .createHash("sha1")
      .update(`${actionKey}:${JSON.stringify(payload)}`)
      .digest("hex")
  };
}

function validateConfirmToken(options = {}) {
  const token = String(options.token || "").trim();
  const expectedHash = String(options.expected_hash || options.expectedHash || "").trim();
  const expiresAt = options.expires_at || options.expiresAt;

  if (!token) {
    return { ok: false, error: "confirm_token_missing" };
  }
  if (!expectedHash) {
    return { ok: false, error: "confirm_hash_missing" };
  }

  const computedHash = hashConfirmToken(token);
  if (computedHash !== expectedHash) {
    return { ok: false, error: "confirm_token_invalid" };
  }

  if (expiresAt) {
    const expiry = new Date(expiresAt).getTime();
    if (Number.isNaN(expiry) || Date.now() > expiry) {
      return { ok: false, error: "confirm_token_expired" };
    }
  }

  return { ok: true, error: "", token_hash: computedHash };
}

function evaluateCooldown(options = {}) {
  const lastExecutedAt = options.last_executed_at || options.lastExecutedAt;
  const cooldownMs = Math.max(0, Number(options.cooldown_ms || options.cooldownMs || DEFAULT_COOLDOWN_MS));

  if (!lastExecutedAt || cooldownMs <= 0) {
    return { ok: true, remaining_ms: 0 };
  }

  const lastTs = new Date(lastExecutedAt).getTime();
  if (Number.isNaN(lastTs)) {
    return { ok: true, remaining_ms: 0 };
  }

  const elapsed = Date.now() - lastTs;
  if (elapsed < cooldownMs) {
    return {
      ok: false,
      error: "confirm_cooldown_active",
      remaining_ms: cooldownMs - elapsed,
      cooldown_ms: cooldownMs
    };
  }

  return { ok: true, remaining_ms: 0 };
}

function buildAuditEntry(options = {}) {
  const actionKey = normalizeActionKey(options.action_key || options.actionKey);
  const adminId = Number(options.admin_id || options.adminId || 0);
  const outcome = String(options.outcome || "executed").trim();
  const payload = options.payload && typeof options.payload === "object" ? options.payload : {};

  return {
    action_key: actionKey,
    admin_id: adminId,
    outcome,
    payload_fingerprint: crypto
      .createHash("sha1")
      .update(`${actionKey}:${JSON.stringify(payload)}`)
      .digest("hex"),
    executed_at: new Date().toISOString(),
    ip: String(options.ip || "").trim() || null,
    user_agent: String(options.user_agent || options.userAgent || "").trim() || null
  };
}

module.exports = {
  DEFAULT_TOKEN_TTL_SEC,
  DEFAULT_COOLDOWN_MS,
  MAX_TOKEN_TTL_SEC,
  generateConfirmToken,
  hashConfirmToken,
  buildConfirmRequest,
  validateConfirmToken,
  evaluateCooldown,
  buildAuditEntry
};
