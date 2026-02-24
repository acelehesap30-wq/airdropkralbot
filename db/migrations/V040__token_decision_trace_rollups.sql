-- V040__token_decision_trace_rollups.sql
-- Rollups for token auto/manual decision reason analytics.

CREATE TABLE IF NOT EXISTS token_decision_reason_buckets (
  id BIGSERIAL PRIMARY KEY,
  token_symbol TEXT NOT NULL DEFAULT 'NXT',
  decision_source TEXT NOT NULL DEFAULT 'auto',
  decision_status TEXT NOT NULL DEFAULT 'pending',
  reason_key TEXT NOT NULL DEFAULT 'unknown',
  bucket_window TEXT NOT NULL DEFAULT '24h',
  bucket_start TIMESTAMPTZ NOT NULL,
  bucket_end TIMESTAMPTZ NOT NULL,
  hit_count INT NOT NULL DEFAULT 0,
  meta_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (token_symbol, decision_source, decision_status, reason_key, bucket_window, bucket_start)
);

CREATE INDEX IF NOT EXISTS idx_token_decision_reason_buckets_window
  ON token_decision_reason_buckets(bucket_window, bucket_start DESC);

CREATE INDEX IF NOT EXISTS idx_token_decision_reason_buckets_reason
  ON token_decision_reason_buckets(reason_key, bucket_start DESC);

CREATE TABLE IF NOT EXISTS token_decision_window_rollups (
  id BIGSERIAL PRIMARY KEY,
  token_symbol TEXT NOT NULL DEFAULT 'NXT',
  bucket_window TEXT NOT NULL DEFAULT '24h',
  bucket_start TIMESTAMPTZ NOT NULL,
  bucket_end TIMESTAMPTZ NOT NULL,
  auto_count INT NOT NULL DEFAULT 0,
  manual_count INT NOT NULL DEFAULT 0,
  approve_count INT NOT NULL DEFAULT 0,
  reject_count INT NOT NULL DEFAULT 0,
  stale_provider_count INT NOT NULL DEFAULT 0,
  gate_block_count INT NOT NULL DEFAULT 0,
  summary_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (token_symbol, bucket_window, bucket_start)
);

CREATE INDEX IF NOT EXISTS idx_token_decision_window_rollups_window
  ON token_decision_window_rollups(bucket_window, bucket_start DESC);
