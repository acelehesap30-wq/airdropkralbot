-- V089: Automation infrastructure — live ops campaigns, game events, anomalies
-- Supports the queueAutoProcessor and liveOpsAutoScheduler services

-- ═══════════════════════════════════════════
-- Live Ops Campaigns
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS live_ops_campaigns (
  id              SERIAL PRIMARY KEY,
  campaign_key    TEXT NOT NULL DEFAULT '',
  title           TEXT NOT NULL DEFAULT '',
  description     TEXT DEFAULT '',
  targeting       JSONB DEFAULT '{}',
  schedule_at     TIMESTAMPTZ,
  starts_at       TIMESTAMPTZ,
  ends_at         TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','pending_approval','approved','dispatched','active','expired','cancelled')),
  approved_by     TEXT DEFAULT '',
  approved_at     TIMESTAMPTZ,
  dispatched_by   TEXT DEFAULT '',
  dispatched_at   TIMESTAMPTZ,
  delivery_count  INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_live_ops_campaigns_status ON live_ops_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_live_ops_campaigns_schedule ON live_ops_campaigns(schedule_at) WHERE status = 'approved';

-- ═══════════════════════════════════════════
-- Game Events (tournaments, wars, flash drops)
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS game_events (
  id              SERIAL PRIMARY KEY,
  event_type      TEXT NOT NULL DEFAULT 'campaign'
                    CHECK (event_type IN ('anomaly','tournament','war','flash','campaign')),
  title_tr        TEXT NOT NULL DEFAULT '',
  title_en        TEXT NOT NULL DEFAULT '',
  description_tr  TEXT DEFAULT '',
  description_en  TEXT DEFAULT '',
  reward_text     TEXT DEFAULT '',
  status          TEXT NOT NULL DEFAULT 'upcoming'
                    CHECK (status IN ('upcoming','active','ended','cancelled')),
  participants    INTEGER DEFAULT 0,
  starts_at       TIMESTAMPTZ,
  ends_at         TIMESTAMPTZ,
  config          JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_game_events_status ON game_events(status);
CREATE INDEX IF NOT EXISTS idx_game_events_type_status ON game_events(event_type, status);

-- ═══════════════════════════════════════════
-- Active Anomalies (rotating bonuses)
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS active_anomalies (
  id              SERIAL PRIMARY KEY,
  anomaly_key     TEXT NOT NULL DEFAULT '',
  title_tr        TEXT NOT NULL DEFAULT '',
  title_en        TEXT NOT NULL DEFAULT '',
  bonus_text      TEXT DEFAULT '',
  description_tr  TEXT DEFAULT '',
  description_en  TEXT DEFAULT '',
  status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','expired','cancelled')),
  starts_at       TIMESTAMPTZ,
  ends_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_active_anomalies_status ON active_anomalies(status);

-- ═══════════════════════════════════════════
-- Event Participation Tracking
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS event_participations (
  id              SERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES users(id),
  event_id        INTEGER NOT NULL,
  event_type      TEXT NOT NULL DEFAULT 'campaign',
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  score           INTEGER DEFAULT 0,
  reward_claimed  BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id, event_id, event_type)
);

CREATE INDEX IF NOT EXISTS idx_event_participations_user ON event_participations(user_id);
CREATE INDEX IF NOT EXISTS idx_event_participations_event ON event_participations(event_id, event_type);

-- ═══════════════════════════════════════════
-- Season Reward Claims Tracking
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS season_reward_claims (
  id              SERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES users(id),
  season_id       INTEGER NOT NULL,
  tier            INTEGER NOT NULL,
  reward_text     TEXT DEFAULT '',
  claimed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, season_id, tier)
);

CREATE INDEX IF NOT EXISTS idx_season_reward_claims_user ON season_reward_claims(user_id, season_id);

-- ═══════════════════════════════════════════
-- Forge Craft Log
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS forge_craft_log (
  id              SERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES users(id),
  recipe_id       TEXT NOT NULL,
  cost_json       JSONB DEFAULT '{}',
  reward_json     JSONB DEFAULT '{}',
  status          TEXT NOT NULL DEFAULT 'success'
                    CHECK (status IN ('success','failed','cooldown')),
  crafted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_forge_craft_log_user ON forge_craft_log(user_id);

-- ═══════════════════════════════════════════
-- Auto-Processor Audit Log
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS auto_processor_audit (
  id              SERIAL PRIMARY KEY,
  processor       TEXT NOT NULL DEFAULT 'queue',
  action          TEXT NOT NULL DEFAULT '',
  item_kind       TEXT NOT NULL DEFAULT '',
  item_id         INTEGER NOT NULL DEFAULT 0,
  user_id         BIGINT DEFAULT 0,
  result          TEXT NOT NULL DEFAULT 'skip'
                    CHECK (result IN ('approved','rejected','escalated','skip','error')),
  reason          TEXT DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auto_processor_audit_ts ON auto_processor_audit(created_at);
CREATE INDEX IF NOT EXISTS idx_auto_processor_audit_result ON auto_processor_audit(result);
