// ── Nexus Event Engine V2 — Dynamic Game Events ──────────────
// Provides daily anomalies (reward multipliers) and admin-triggered
// bonus events (2x NXT hour, reduced house fee, etc.)

// ── Active Events (in-memory, admin-managed) ─────────────────
const _activeEvents = []; // { id, type, multiplier, expiresAt, label }

// ── Daily Anomalies ──────────────────────────────────────────
// Changes daily based on date seed. Deterministic per UTC day.
const ANOMALIES = [
  { id: "calm",       label: "Sakin Piyasa",      rewardMul: 1.0,  riskShift: 0,     effects: [] },
  { id: "bull_run",   label: "Boğa Koşusu",       rewardMul: 1.3,  riskShift: -0.01, effects: ["reward_boost"] },
  { id: "bear_trap",  label: "Ayı Tuzağı",        rewardMul: 0.8,  riskShift: 0.02,  effects: ["risk_increase"] },
  { id: "nxt_rain",   label: "NXT Yağmuru",       rewardMul: 1.5,  riskShift: 0,     effects: ["reward_boost", "xp_boost"] },
  { id: "volatility", label: "Volatilite Fırtınası", rewardMul: 1.2, riskShift: 0.01, effects: ["high_variance"] },
  { id: "whale_alert", label: "Balina Alarmı",    rewardMul: 0.9,  riskShift: -0.02, effects: ["whale_bonus"] },
  { id: "genesis",    label: "Genesis Günü",       rewardMul: 2.0,  riskShift: 0,     effects: ["reward_boost", "double_xp"] }
];

function getDayHash() {
  const d = new Date();
  const dayStr = `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
  let hash = 0;
  for (let i = 0; i < dayStr.length; i++) {
    hash = ((hash << 5) - hash + dayStr.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function resolveDailyAnomaly() {
  const idx = getDayHash() % ANOMALIES.length;
  return { ...ANOMALIES[idx] };
}

function publicAnomalyView(anomaly) {
  if (!anomaly) return { id: "none", label: "none", effects: [] };
  return {
    id: anomaly.id,
    label: anomaly.label,
    effects: anomaly.effects || [],
    rewardMul: anomaly.rewardMul || 1.0
  };
}

// ── Risk Shift ───────────────────────────────────────────────
// Adjusts house fee based on daily anomaly + active events
function applyRiskShift(baseRisk) {
  const anomaly = resolveDailyAnomaly();
  let adjusted = Number(baseRisk || 0) + (anomaly.riskShift || 0);

  // Apply active event modifiers
  for (const evt of _activeEvents) {
    if (evt.type === "reduced_fee" && Date.now() < evt.expiresAt) {
      adjusted *= 0.5; // half house fee during event
    }
  }

  return Math.max(0, Math.min(0.25, adjusted)); // clamp 0-25%
}

// ── Reward Multiplier ────────────────────────────────────────
function applyAnomalyToReward(baseReward) {
  const anomaly = resolveDailyAnomaly();
  let multiplier = anomaly.rewardMul || 1.0;

  // Apply active event multipliers
  for (const evt of _activeEvents) {
    if (evt.type === "double_nxt" && Date.now() < evt.expiresAt) {
      multiplier *= evt.multiplier || 2.0;
    }
  }

  const boosted = typeof baseReward === "number"
    ? Math.round(baseReward * multiplier * 100) / 100
    : baseReward;

  return { reward: boosted, multiplier, anomalyId: anomaly.id };
}

// ── XP Multiplier ────────────────────────────────────────────
function getXpMultiplier() {
  const anomaly = resolveDailyAnomaly();
  let mul = 1.0;
  if (anomaly.effects.includes("xp_boost") || anomaly.effects.includes("double_xp")) {
    mul = 2.0;
  }
  for (const evt of _activeEvents) {
    if (evt.type === "double_xp" && Date.now() < evt.expiresAt) {
      mul *= 2.0;
    }
  }
  return mul;
}

// ── Admin Event Management ───────────────────────────────────
function addEvent({ type, multiplier, durationMs, label }) {
  const id = `evt_${Date.now().toString(36)}`;
  const evt = {
    id,
    type,
    multiplier: multiplier || 2.0,
    expiresAt: Date.now() + (durationMs || 3600000),
    label: label || type,
    createdAt: Date.now()
  };
  _activeEvents.push(evt);
  // Auto-cleanup expired
  cleanupExpired();
  return evt;
}

function getActiveEvents() {
  cleanupExpired();
  return _activeEvents.map((e) => ({
    id: e.id,
    type: e.type,
    label: e.label,
    multiplier: e.multiplier,
    remainingMs: Math.max(0, e.expiresAt - Date.now()),
    remainingMin: Math.max(0, Math.ceil((e.expiresAt - Date.now()) / 60000))
  }));
}

function removeEvent(eventId) {
  const idx = _activeEvents.findIndex((e) => e.id === eventId);
  if (idx >= 0) { _activeEvents.splice(idx, 1); return true; }
  return false;
}

function cleanupExpired() {
  const now = Date.now();
  for (let i = _activeEvents.length - 1; i >= 0; i--) {
    if (_activeEvents[i].expiresAt <= now) _activeEvents.splice(i, 1);
  }
}

module.exports = {
  resolveDailyAnomaly,
  publicAnomalyView,
  applyRiskShift,
  applyAnomalyToReward,
  getXpMultiplier,
  addEvent,
  getActiveEvents,
  removeEvent,
  ANOMALIES
};
