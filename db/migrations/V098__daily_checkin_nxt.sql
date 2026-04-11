-- V098: Add NXT reward column to daily_checkins
-- Enables NXT-based daily login bonus (replaces SC/HC rewards)

ALTER TABLE daily_checkins
  ADD COLUMN IF NOT EXISTS reward_nxt NUMERIC(18, 9) NOT NULL DEFAULT 0;

COMMENT ON COLUMN daily_checkins.reward_nxt IS 'NXT tokens awarded for this day check-in';
