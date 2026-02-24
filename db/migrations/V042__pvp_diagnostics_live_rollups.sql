-- V042__pvp_diagnostics_live_rollups.sql
-- Rolling PvP diagnostics for reject mix / latency / drift / acceptance monitoring.

CREATE TABLE IF NOT EXISTS pvp_diag_windows (
  id BIGSERIAL PRIMARY KEY,
  bucket_window TEXT NOT NULL DEFAULT '5m',
  bucket_start TIMESTAMPTZ NOT NULL,
  bucket_end TIMESTAMPTZ NOT NULL,
  session_count INT NOT NULL DEFAULT 0,
  action_count INT NOT NULL DEFAULT 0,
  accepted_count INT NOT NULL DEFAULT 0,
  rejected_count INT NOT NULL DEFAULT 0,
  median_latency_ms INT NOT NULL DEFAULT 0,
  p95_latency_ms INT NOT NULL DEFAULT 0,
  drift_avg_ms INT NOT NULL DEFAULT 0,
  diagnostics_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (bucket_window, bucket_start)
);

CREATE INDEX IF NOT EXISTS idx_pvp_diag_windows_window_time
  ON pvp_diag_windows(bucket_window, bucket_start DESC);

CREATE TABLE IF NOT EXISTS pvp_reject_reason_rollups (
  id BIGSERIAL PRIMARY KEY,
  bucket_window TEXT NOT NULL DEFAULT '5m',
  bucket_start TIMESTAMPTZ NOT NULL,
  bucket_end TIMESTAMPTZ NOT NULL,
  reason_code TEXT NOT NULL DEFAULT 'unknown',
  hit_count INT NOT NULL DEFAULT 0,
  sample_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (bucket_window, bucket_start, reason_code)
);

CREATE INDEX IF NOT EXISTS idx_pvp_reject_reason_rollups_window_time
  ON pvp_reject_reason_rollups(bucket_window, bucket_start DESC);

CREATE INDEX IF NOT EXISTS idx_pvp_reject_reason_rollups_reason_time
  ON pvp_reject_reason_rollups(reason_code, bucket_start DESC);
