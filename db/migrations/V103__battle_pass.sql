-- V103: Seasonal Battle Pass system
-- 30-day seasons, free + premium tiers, level-based NXT rewards

CREATE TABLE IF NOT EXISTS battle_pass_seasons (
  id           SERIAL PRIMARY KEY,
  name         VARCHAR(64) NOT NULL,
  starts_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at      TIMESTAMPTZ NOT NULL,
  premium_cost NUMERIC(18,9) DEFAULT 500,
  xp_per_level INT DEFAULT 100,
  max_levels   INT DEFAULT 30,
  status       VARCHAR(16) DEFAULT 'active'
);

-- Rewards per level (free + premium)
CREATE TABLE IF NOT EXISTS battle_pass_rewards (
  id          SERIAL PRIMARY KEY,
  season_id   INT NOT NULL REFERENCES battle_pass_seasons(id) ON DELETE CASCADE,
  level       INT NOT NULL,
  tier        VARCHAR(16) NOT NULL, -- 'free' or 'premium'
  reward_nxt  NUMERIC(18,9) DEFAULT 0,
  label       VARCHAR(64),
  UNIQUE(season_id, level, tier)
);

-- User progress per season
CREATE TABLE IF NOT EXISTS user_battle_pass (
  user_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  season_id     INT NOT NULL REFERENCES battle_pass_seasons(id) ON DELETE CASCADE,
  is_premium    BOOLEAN DEFAULT FALSE,
  xp_at_start   BIGINT DEFAULT 0,
  claimed_free  INT[] DEFAULT '{}',
  claimed_premium INT[] DEFAULT '{}',
  joined_at     TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, season_id)
);

CREATE INDEX IF NOT EXISTS idx_battle_pass_active
  ON battle_pass_seasons(status) WHERE status = 'active';

-- Seed Season 1 (30 days from now)
INSERT INTO battle_pass_seasons (name, ends_at, premium_cost, xp_per_level, max_levels)
VALUES ('Nexus Genesis', now() + interval '30 days', 500, 100, 30)
ON CONFLICT DO NOTHING;

-- Seed rewards for Season 1 (if doesn't exist yet)
DO $$
DECLARE
  sid INT;
  lvl INT;
BEGIN
  SELECT id INTO sid FROM battle_pass_seasons WHERE name = 'Nexus Genesis' LIMIT 1;
  IF sid IS NOT NULL AND NOT EXISTS (SELECT 1 FROM battle_pass_rewards WHERE season_id = sid) THEN
    FOR lvl IN 1..30 LOOP
      -- Free tier: modest NXT every level (grows slightly)
      INSERT INTO battle_pass_rewards (season_id, level, tier, reward_nxt, label)
      VALUES (sid, lvl, 'free', 20 + (lvl * 5), 'Lv ' || lvl || ' Free');
      -- Premium tier: larger NXT reward
      INSERT INTO battle_pass_rewards (season_id, level, tier, reward_nxt, label)
      VALUES (sid, lvl, 'premium', 50 + (lvl * 15), 'Lv ' || lvl || ' Premium');
    END LOOP;
  END IF;
END $$;
