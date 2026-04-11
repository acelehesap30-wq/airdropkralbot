// ── Rate Limiter — per-user command cooldowns ────────────────

const _cooldowns = new Map(); // key: `${userId}:${action}` → timestamp

const DEFAULTS = {
  slot: 3000,
  withdraw: 60000,
  duel: 10000,
  lootbox: 5000,
  crash: 3000
};

function check(userId, action, overrideMs) {
  const key = `${userId}:${action}`;
  const now = Date.now();
  const last = _cooldowns.get(key) || 0;
  const cooldownMs = overrideMs || DEFAULTS[action] || 5000;

  if (now - last < cooldownMs) {
    const remainMs = cooldownMs - (now - last);
    return { allowed: false, remainMs, remainSec: Math.ceil(remainMs / 1000) };
  }

  _cooldowns.set(key, now);
  return { allowed: true, remainMs: 0, remainSec: 0 };
}

function reset(userId, action) {
  _cooldowns.delete(`${userId}:${action}`);
}

// Cleanup old entries every 5 minutes
setInterval(() => {
  const cutoff = Date.now() - 300_000;
  for (const [key, ts] of _cooldowns) {
    if (ts < cutoff) _cooldowns.delete(key);
  }
}, 300_000);

module.exports = { check, reset, DEFAULTS };
