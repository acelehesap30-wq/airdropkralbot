-- V092: Blueprint §4 — Payout operator execution audit
-- payout_tx already exists from V001 (id, payout_request_id, tx_hash, recorded_at, admin_id)
-- Extend it with operator execution columns; all additions are idempotent.

ALTER TABLE payout_tx
  ADD COLUMN IF NOT EXISTS chain               TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS amount_native       TEXT NOT NULL DEFAULT '0',
  ADD COLUMN IF NOT EXISTS destination_address TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS executed_by         TEXT NOT NULL DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS executed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS confirmed_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reconciled          BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS meta                JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS user_id             BIGINT;

-- Back-fill user_id from payout_requests for existing rows
UPDATE payout_tx pt
   SET user_id = pr.user_id
  FROM payout_requests pr
 WHERE pt.payout_request_id = pr.id
   AND pt.user_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payout_tx_hash_chain
  ON payout_tx (tx_hash, chain)
  WHERE chain != '';

CREATE INDEX IF NOT EXISTS idx_payout_tx_payout_request
  ON payout_tx (payout_request_id);

CREATE INDEX IF NOT EXISTS idx_payout_tx_user_time
  ON payout_tx (user_id, executed_at DESC)
  WHERE user_id IS NOT NULL;

-- Execution confirm token table (one-time tokens for operator confirmation UI)
CREATE TABLE IF NOT EXISTS payout_exec_tokens (
  id                  BIGSERIAL PRIMARY KEY,
  payout_request_id   BIGINT NOT NULL,
  token_hash          TEXT NOT NULL,
  used                BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at          TIMESTAMPTZ NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payout_exec_tokens_hash
  ON payout_exec_tokens (token_hash) WHERE NOT used;

CREATE INDEX IF NOT EXISTS idx_payout_exec_tokens_request
  ON payout_exec_tokens (payout_request_id, used, expires_at);
