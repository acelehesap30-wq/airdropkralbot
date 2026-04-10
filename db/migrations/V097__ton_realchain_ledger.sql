-- V021__ton_realchain_ledger.sql
-- Real on-chain TON deposit tracking, NXT transfer log, and house sweep records.

-- ── TON Deposits (incoming TON from players) ──────────────────
CREATE TABLE IF NOT EXISTS ton_deposits (
  id            BIGSERIAL PRIMARY KEY,
  user_id       BIGINT REFERENCES users(id),
  tx_hash       TEXT NOT NULL,
  from_address  TEXT NOT NULL,
  ton_amount    NUMERIC(24,9) NOT NULL CHECK (ton_amount > 0),
  nxt_credited  NUMERIC(24,9) NOT NULL DEFAULT 0,
  nxt_rate      NUMERIC(18,9) NOT NULL DEFAULT 0,
  memo          TEXT,
  status        TEXT NOT NULL DEFAULT 'confirmed',
  confirmed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ton_deposits_tx_hash
  ON ton_deposits(tx_hash);

CREATE INDEX IF NOT EXISTS idx_ton_deposits_user_created
  ON ton_deposits(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ton_deposits_status
  ON ton_deposits(status, created_at DESC);

-- ── NXT Transfers (outgoing jetton transfers to players or burns) ──
CREATE TABLE IF NOT EXISTS nxt_transfers (
  id            BIGSERIAL PRIMARY KEY,
  user_id       BIGINT NOT NULL REFERENCES users(id),
  to_address    TEXT NOT NULL,
  nano_amount   BIGINT NOT NULL CHECK (nano_amount > 0),
  tx_hash       TEXT,
  type          TEXT NOT NULL DEFAULT 'payout',
  status        TEXT NOT NULL DEFAULT 'pending',
  error_msg     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at  TIMESTAMPTZ
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'nxt_transfers_type_check'
  ) THEN
    ALTER TABLE nxt_transfers
      ADD CONSTRAINT nxt_transfers_type_check
      CHECK (type IN ('payout', 'game_reward', 'referral', 'mint', 'burn', 'duel_win', 'raid_win'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'nxt_transfers_status_check'
  ) THEN
    ALTER TABLE nxt_transfers
      ADD CONSTRAINT nxt_transfers_status_check
      CHECK (status IN ('pending', 'sent', 'confirmed', 'failed'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_nxt_transfers_user_created
  ON nxt_transfers(user_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_nxt_transfers_tx_hash
  ON nxt_transfers(tx_hash)
  WHERE tx_hash IS NOT NULL;

-- ── House Sweeps (daily transfer of house profits to cold wallet) ──
CREATE TABLE IF NOT EXISTS house_sweeps (
  id            BIGSERIAL PRIMARY KEY,
  ton_amount    NUMERIC(24,9) NOT NULL CHECK (ton_amount > 0),
  to_address    TEXT NOT NULL,
  tx_hash       TEXT,
  triggered_by  TEXT NOT NULL DEFAULT 'auto',
  status        TEXT NOT NULL DEFAULT 'pending',
  error_msg     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at  TIMESTAMPTZ
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'house_sweeps_trigger_check'
  ) THEN
    ALTER TABLE house_sweeps
      ADD CONSTRAINT house_sweeps_trigger_check
      CHECK (triggered_by IN ('auto', 'admin'));
  END IF;
END $$;

-- ── Game Escrows (locked NXT for active duels/raids) ──
CREATE TABLE IF NOT EXISTS game_escrows (
  id            BIGSERIAL PRIMARY KEY,
  user_id       BIGINT NOT NULL REFERENCES users(id),
  game_type     TEXT NOT NULL,
  game_ref      TEXT NOT NULL,
  nxt_amount    NUMERIC(24,9) NOT NULL CHECK (nxt_amount > 0),
  status        TEXT NOT NULL DEFAULT 'locked',
  resolved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'game_escrows_status_check'
  ) THEN
    ALTER TABLE game_escrows
      ADD CONSTRAINT game_escrows_status_check
      CHECK (status IN ('locked', 'released', 'forfeited'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_game_escrows_user_status
  ON game_escrows(user_id, status);

CREATE INDEX IF NOT EXISTS idx_game_escrows_game_ref
  ON game_escrows(game_ref);

-- ── House Ledger (running total of house earnings) ──
CREATE TABLE IF NOT EXISTS house_ledger (
  id            BIGSERIAL PRIMARY KEY,
  source        TEXT NOT NULL,
  game_ref      TEXT,
  ton_amount    NUMERIC(24,9) NOT NULL DEFAULT 0,
  nxt_amount    NUMERIC(24,9) NOT NULL DEFAULT 0,
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_house_ledger_created
  ON house_ledger(created_at DESC);
