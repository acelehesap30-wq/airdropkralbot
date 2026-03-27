-- V093: Quest chain progress + referral / invite system
-- Blueprint §10 (Quest Chains) + §11 (Social Invite Funnel)

-- ── Quest chain step tracking ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_quest_chain_progress (
  user_id                BIGINT   NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chain_id               TEXT     NOT NULL,
  completed_step_index   INT      NOT NULL DEFAULT -1,
  last_advanced_at       TIMESTAMPTZ,
  reward_claimed_steps   INT[]    NOT NULL DEFAULT '{}',
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, chain_id)
);

CREATE INDEX IF NOT EXISTS idx_uqcp_user_id   ON user_quest_chain_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_uqcp_chain_id  ON user_quest_chain_progress(chain_id);

-- ── Referral / invite system ──────────────────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS invite_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_invite_code
  ON users(invite_code) WHERE invite_code IS NOT NULL;

CREATE TABLE IF NOT EXISTS referrals (
  id                BIGSERIAL PRIMARY KEY,
  referrer_user_id  BIGINT    NOT NULL REFERENCES users(id),
  referred_user_id  BIGINT    NOT NULL REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  bonus_granted     BOOLEAN   NOT NULL DEFAULT false,
  bonus_granted_at  TIMESTAMPTZ,
  tier              INT       NOT NULL DEFAULT 1,
  UNIQUE (referred_user_id)   -- one referrer per user
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_created  ON referrals(created_at DESC);
