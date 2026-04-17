-- V104: Clan / Guild system
-- Users form clans, pool NXT, compete on leaderboards

CREATE TABLE IF NOT EXISTS clans (
  id          BIGSERIAL PRIMARY KEY,
  name        VARCHAR(32) UNIQUE NOT NULL,
  tag         VARCHAR(6) UNIQUE NOT NULL,
  leader_id   BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  treasury    NUMERIC(18,9) DEFAULT 0,
  total_xp    BIGINT DEFAULT 0,
  member_cap  INT DEFAULT 20,
  created_at  TIMESTAMPTZ DEFAULT now(),
  disbanded_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS clan_members (
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  clan_id     BIGINT NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
  role        VARCHAR(16) DEFAULT 'member', -- leader, officer, member
  contributed NUMERIC(18,9) DEFAULT 0,
  joined_at   TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id)  -- each user can only be in one clan
);

CREATE INDEX IF NOT EXISTS idx_clan_members_clan ON clan_members(clan_id);
CREATE INDEX IF NOT EXISTS idx_clans_active
  ON clans(total_xp DESC) WHERE disbanded_at IS NULL;
