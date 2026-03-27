-- V090: Blueprint §5 — Canonical analytics event contract
-- family.object.verb naming convention
-- Required dimensions: event_family, event_object, event_verb, risk_band, wallet_chain, campaign_key

ALTER TABLE v5_webapp_ui_events
  ADD COLUMN IF NOT EXISTS event_family      TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS event_object      TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS event_verb        TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS risk_band         TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS wallet_chain      TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS campaign_key      TEXT NOT NULL DEFAULT '';

-- Canonical event family index
CREATE INDEX IF NOT EXISTS idx_v5_webapp_ui_events_family_object_verb
  ON v5_webapp_ui_events (event_family, event_object, event_verb, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_v5_webapp_ui_events_risk_band_time
  ON v5_webapp_ui_events (risk_band, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_v5_webapp_ui_events_wallet_chain_time
  ON v5_webapp_ui_events (wallet_chain, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_v5_webapp_ui_events_campaign_key_time
  ON v5_webapp_ui_events (campaign_key, created_at DESC);

-- Game analytics rollup table
CREATE TABLE IF NOT EXISTS game_analytics_rollup (
  id                  BIGSERIAL PRIMARY KEY,
  game_key            TEXT NOT NULL,
  user_id             BIGINT NOT NULL REFERENCES users(id),
  session_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  play_count          INT NOT NULL DEFAULT 0,
  total_reward_sc     BIGINT NOT NULL DEFAULT 0,
  best_score          INT NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (game_key, user_id, session_date)
);

CREATE INDEX IF NOT EXISTS idx_game_analytics_rollup_date
  ON game_analytics_rollup (session_date DESC, game_key);

CREATE INDEX IF NOT EXISTS idx_game_analytics_rollup_user
  ON game_analytics_rollup (user_id, game_key, session_date DESC);

-- Player lifecycle events table (family.object.verb schema)
CREATE TABLE IF NOT EXISTS player_lifecycle_events (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES users(id),
  event_name      TEXT NOT NULL,   -- e.g. "player.game.complete"
  event_family    TEXT NOT NULL,   -- e.g. "player"
  event_object    TEXT NOT NULL,   -- e.g. "game"
  event_verb      TEXT NOT NULL,   -- e.g. "complete"
  surface         TEXT NOT NULL DEFAULT 'webapp',
  route_key       TEXT NOT NULL DEFAULT '',
  panel_key       TEXT NOT NULL DEFAULT '',
  locale          TEXT NOT NULL DEFAULT 'tr',
  risk_band       TEXT NOT NULL DEFAULT 'unknown',
  wallet_chain    TEXT NOT NULL DEFAULT '',
  campaign_key    TEXT NOT NULL DEFAULT '',
  meta            JSONB NOT NULL DEFAULT '{}',
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  session_ref     TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_player_lifecycle_events_user_time
  ON player_lifecycle_events (user_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_player_lifecycle_events_name_time
  ON player_lifecycle_events (event_name, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_player_lifecycle_events_family_object
  ON player_lifecycle_events (event_family, event_object, event_verb, occurred_at DESC);

-- Canonical event names (family.object.verb) enforced via check constraint
ALTER TABLE player_lifecycle_events
  ADD CONSTRAINT chk_player_lifecycle_event_name_format
  CHECK (event_name ~ '^[a-z_]+\.[a-z_]+\.[a-z_]+$');
