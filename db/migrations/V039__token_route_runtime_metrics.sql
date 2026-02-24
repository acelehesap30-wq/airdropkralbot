-- V039__token_route_runtime_metrics.sql
-- Token routing runtime snapshots and provider quorum events for operational visibility.

CREATE TABLE IF NOT EXISTS token_route_runtime_snapshots (
  id BIGSERIAL PRIMARY KEY,
  token_symbol TEXT NOT NULL DEFAULT 'NXT',
  route_count INT NOT NULL DEFAULT 0,
  enabled_route_count INT NOT NULL DEFAULT 0,
  provider_count INT NOT NULL DEFAULT 0,
  ok_provider_count INT NOT NULL DEFAULT 0,
  gate_open BOOLEAN NOT NULL DEFAULT FALSE,
  quote_source_mode TEXT NOT NULL DEFAULT 'curve_only',
  snapshot_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_token_route_runtime_snapshots_symbol_time
  ON token_route_runtime_snapshots(token_symbol, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_token_route_runtime_snapshots_gate_time
  ON token_route_runtime_snapshots(gate_open, created_at DESC);

CREATE TABLE IF NOT EXISTS token_route_provider_quorum_events (
  id BIGSERIAL PRIMARY KEY,
  request_ref TEXT NOT NULL DEFAULT '',
  token_symbol TEXT NOT NULL DEFAULT 'NXT',
  chain TEXT NOT NULL DEFAULT '',
  provider_count INT NOT NULL DEFAULT 0,
  ok_provider_count INT NOT NULL DEFAULT 0,
  agreement_ratio NUMERIC(12,6) NOT NULL DEFAULT 0,
  chosen_provider TEXT NOT NULL DEFAULT '',
  decision TEXT NOT NULL DEFAULT 'curve_only',
  event_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (request_ref)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'token_route_provider_quorum_events_decision_check'
  ) THEN
    ALTER TABLE token_route_provider_quorum_events
      ADD CONSTRAINT token_route_provider_quorum_events_decision_check
      CHECK (decision IN ('curve_only', 'provider_quorum', 'fallback', 'blocked'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_token_route_provider_quorum_events_symbol_time
  ON token_route_provider_quorum_events(token_symbol, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_token_route_provider_quorum_events_decision_time
  ON token_route_provider_quorum_events(decision, created_at DESC);
