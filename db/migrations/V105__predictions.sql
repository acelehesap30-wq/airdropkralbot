-- V105: Prediction Market — TON price up/down bets

CREATE TABLE IF NOT EXISTS predictions (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  direction   VARCHAR(8) NOT NULL, -- 'up' or 'down'
  bet_nxt     NUMERIC(18,9) NOT NULL,
  start_price NUMERIC(18,9) NOT NULL,
  end_price   NUMERIC(18,9),
  result      VARCHAR(16) DEFAULT 'pending', -- pending, won, lost
  payout_nxt  NUMERIC(18,9) DEFAULT 0,
  resolves_at TIMESTAMPTZ NOT NULL,
  resolved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_predictions_pending
  ON predictions(resolves_at) WHERE result = 'pending';

CREATE INDEX IF NOT EXISTS idx_predictions_user
  ON predictions(user_id, created_at DESC);
