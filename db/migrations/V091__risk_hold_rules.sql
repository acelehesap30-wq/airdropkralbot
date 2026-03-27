-- V091: Blueprint §9 — Risk scoring + hold rules
-- risk_holds table: manual/automatic holds on payout eligibility

CREATE TABLE IF NOT EXISTS risk_holds (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES users(id),
  reason          TEXT NOT NULL,                    -- e.g. 'high_value_first_payout', 'shared_destination', 'rapid_play_dampening'
  hold_until      TIMESTAMPTZ,                      -- NULL = indefinite until manual release
  released_at     TIMESTAMPTZ,                      -- NULL = still active
  released_by     TEXT NOT NULL DEFAULT 'system',   -- 'system' | 'admin:<telegram_id>'
  risk_score      NUMERIC(5,4) NOT NULL DEFAULT 0,  -- 0.0000 – 1.0000
  meta            JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risk_holds_user_active
  ON risk_holds (user_id, released_at NULLS FIRST, hold_until DESC);

CREATE INDEX IF NOT EXISTS idx_risk_holds_reason_time
  ON risk_holds (reason, created_at DESC);

-- Risk score snapshot per user (rolling window aggregation)
CREATE TABLE IF NOT EXISTS risk_score_snapshots (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES users(id),
  score           NUMERIC(5,4) NOT NULL DEFAULT 0,
  factors         JSONB NOT NULL DEFAULT '{}',
  snapshot_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risk_score_snapshots_user_time
  ON risk_score_snapshots (user_id, snapshot_at DESC);

-- Add risk_band column to users table if not present
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS risk_band TEXT NOT NULL DEFAULT 'unknown';

CREATE INDEX IF NOT EXISTS idx_users_risk_band
  ON users (risk_band) WHERE risk_band != 'unknown';
