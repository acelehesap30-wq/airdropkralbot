-- V096: Chest loot system
-- Tracks per-user per-chest-tier cooldowns and open history

CREATE TABLE IF NOT EXISTS chest_opens (
  id            BIGSERIAL PRIMARY KEY,
  user_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chest_type    TEXT   NOT NULL CHECK (chest_type IN ('common','rare','epic')),
  reward_sc     INT    NOT NULL DEFAULT 0,
  reward_hc     INT    NOT NULL DEFAULT 0,
  reward_rc     INT    NOT NULL DEFAULT 0,
  reward_label  TEXT,
  opened_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chest_opens_user_type
  ON chest_opens(user_id, chest_type, opened_at DESC);
