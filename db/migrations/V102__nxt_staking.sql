-- V102: NXT staking system
-- Lock NXT for 7+ days, earn 0.5% daily interest

CREATE TABLE IF NOT EXISTS nxt_stakes (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount          NUMERIC(18,9) NOT NULL,
  daily_rate      NUMERIC(8,6) DEFAULT 0.005,
  locked_until    DATE NOT NULL,
  accrued_interest NUMERIC(18,9) DEFAULT 0,
  status          VARCHAR(16) DEFAULT 'active',
  created_at      TIMESTAMPTZ DEFAULT now(),
  completed_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_nxt_stakes_user_active
  ON nxt_stakes(user_id) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_nxt_stakes_status
  ON nxt_stakes(status, locked_until);
