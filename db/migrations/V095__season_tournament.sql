-- V095: Season Tournament bracket system
-- Supports weekly/seasonal bracket tournaments with auto-seeding from season points

CREATE TABLE IF NOT EXISTS season_tournaments (
  id              BIGSERIAL PRIMARY KEY,
  tournament_key  TEXT NOT NULL UNIQUE,
  title_tr        TEXT NOT NULL,
  title_en        TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'upcoming'
                    CHECK (status IN ('upcoming','registration','active','completed','cancelled')),
  bracket_size    INT  NOT NULL DEFAULT 8  CHECK (bracket_size IN (8,16,32)),
  starts_at       TIMESTAMPTZ NOT NULL,
  ends_at         TIMESTAMPTZ NOT NULL,
  prize_pool_sc   INT  NOT NULL DEFAULT 0,
  prize_pool_hc   INT  NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tournament_entries (
  id              BIGSERIAL PRIMARY KEY,
  tournament_id   BIGINT NOT NULL REFERENCES season_tournaments(id),
  user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seed            INT,
  bracket_slot    INT,
  eliminated_at   TIMESTAMPTZ,
  final_rank      INT,
  reward_sc       INT NOT NULL DEFAULT 0,
  reward_hc       INT NOT NULL DEFAULT 0,
  registered_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_tournament_entries_tournament
  ON tournament_entries(tournament_id, seed);

-- Seed one active tournament for dev/demo
INSERT INTO season_tournaments
  (tournament_key, title_tr, title_en, status, bracket_size, starts_at, ends_at, prize_pool_sc, prize_pool_hc)
VALUES
  ('s1_weekly_1', 'Haftalık Arena #1', 'Weekly Arena #1', 'registration',
   8,
   now(),
   now() + interval '7 days',
   10000, 50)
ON CONFLICT (tournament_key) DO NOTHING;
