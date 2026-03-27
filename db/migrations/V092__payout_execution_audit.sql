-- V092: Blueprint §4 — Payout operator execution audit
-- "External operator execution is the only transfer path."
-- payout_tx: immutable record of every on-chain transfer executed by the operator

CREATE TABLE IF NOT EXISTS payout_tx (
  id                  BIGSERIAL PRIMARY KEY,
  payout_request_id   BIGINT NOT NULL,              -- FK to payout_requests(id) — soft reference
  user_id             BIGINT NOT NULL REFERENCES users(id),
  tx_hash             TEXT NOT NULL,
  chain               TEXT NOT NULL DEFAULT '',     -- e.g. 'TON', 'ETH', 'BTC', 'TRX', 'SOL', 'BSC'
  amount_native       TEXT NOT NULL DEFAULT '0',    -- chain-native amount (string to preserve precision)
  destination_address TEXT NOT NULL DEFAULT '',
  executed_by         TEXT NOT NULL,                -- 'operator:<telegram_id>' or 'operator:system'
  executed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at        TIMESTAMPTZ,                  -- NULL until on-chain confirmation received
  reconciled          BOOLEAN NOT NULL DEFAULT FALSE,
  meta                JSONB NOT NULL DEFAULT '{}'
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payout_tx_hash_chain
  ON payout_tx (tx_hash, chain);

CREATE INDEX IF NOT EXISTS idx_payout_tx_payout_request
  ON payout_tx (payout_request_id);

CREATE INDEX IF NOT EXISTS idx_payout_tx_user_time
  ON payout_tx (user_id, executed_at DESC);

-- Execution confirm token table (one-time tokens for operator confirmation UI)
CREATE TABLE IF NOT EXISTS payout_exec_tokens (
  id              BIGSERIAL PRIMARY KEY,
  payout_request_id BIGINT NOT NULL,
  token_hash      TEXT NOT NULL,               -- SHA-256 of the one-time confirm token
  used            BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at      TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payout_exec_tokens_hash
  ON payout_exec_tokens (token_hash) WHERE NOT used;

CREATE INDEX IF NOT EXISTS idx_payout_exec_tokens_request
  ON payout_exec_tokens (payout_request_id, used, expires_at);
