-- V099: Centralized game configuration table
-- Replaces hardcoded values in slot, duel, withdraw, checkin, tournament handlers

CREATE TABLE IF NOT EXISTS game_configs (
  key        VARCHAR(128) PRIMARY KEY,
  value      JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed defaults
INSERT INTO game_configs (key, value) VALUES
  ('slot',       '{"min_bet":10,"max_bet":10000,"house_fee_pct":0.08}'),
  ('duel',       '{"timeout_ms":120000,"house_fee_pct":0.08,"min_bet":10,"max_bet":50000}'),
  ('withdraw',   '{"min_nxt":100,"fee_nxt":5,"daily_limit":5}'),
  ('checkin',    '{"base_reward":50,"max_reward":300}'),
  ('tournament', '{"house_cut_pct":0.10,"min_fee":50,"prize_split":[0.60,0.25,0.15]}'),
  ('referral',   '{"commission_pct":0.10}'),
  ('rate_limit', '{"slot_ms":3000,"withdraw_ms":60000,"duel_ms":10000}')
ON CONFLICT (key) DO NOTHING;
