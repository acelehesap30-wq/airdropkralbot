-- V094: Daily check-in streak system
-- Tracks per-user per-day claims and streak length for reward escalation

CREATE TABLE IF NOT EXISTS daily_checkins (
  user_id        BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  checkin_date   DATE   NOT NULL DEFAULT CURRENT_DATE,
  day_of_streak  INT    NOT NULL DEFAULT 1,
  reward_sc      INT    NOT NULL DEFAULT 0,
  reward_hc      INT    NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, checkin_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_checkins_user_date
  ON daily_checkins(user_id, checkin_date DESC);
