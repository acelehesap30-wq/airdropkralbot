-- V038__runtime_audit_snapshots.sql
-- Runtime audit snapshots and findings for phase alignment / production diagnostics.

CREATE TABLE IF NOT EXISTS runtime_audit_snapshots (
  id BIGSERIAL PRIMARY KEY,
  audit_scope TEXT NOT NULL DEFAULT 'phase_status',
  phase_name TEXT NOT NULL DEFAULT '',
  release_ref TEXT NOT NULL DEFAULT '',
  git_revision TEXT NOT NULL DEFAULT '',
  flag_source_mode TEXT NOT NULL DEFAULT 'env_locked',
  webapp_bundle_mode TEXT NOT NULL DEFAULT '',
  bot_alive BOOLEAN NOT NULL DEFAULT FALSE,
  bot_lock_acquired BOOLEAN NOT NULL DEFAULT FALSE,
  schema_head TEXT NOT NULL DEFAULT '',
  snapshot_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_runtime_audit_snapshots_scope_time
  ON runtime_audit_snapshots(audit_scope, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_runtime_audit_snapshots_phase_time
  ON runtime_audit_snapshots(phase_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_runtime_audit_snapshots_git_time
  ON runtime_audit_snapshots(git_revision, created_at DESC);

CREATE TABLE IF NOT EXISTS runtime_audit_findings (
  id BIGSERIAL PRIMARY KEY,
  snapshot_id BIGINT NOT NULL REFERENCES runtime_audit_snapshots(id) ON DELETE CASCADE,
  finding_key TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  status TEXT NOT NULL DEFAULT 'pass',
  finding_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (snapshot_id, finding_key)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'runtime_audit_findings_severity_check'
  ) THEN
    ALTER TABLE runtime_audit_findings
      ADD CONSTRAINT runtime_audit_findings_severity_check
      CHECK (severity IN ('info', 'warn', 'error', 'critical'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'runtime_audit_findings_status_check'
  ) THEN
    ALTER TABLE runtime_audit_findings
      ADD CONSTRAINT runtime_audit_findings_status_check
      CHECK (status IN ('pass', 'warn', 'fail'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_runtime_audit_findings_severity_time
  ON runtime_audit_findings(severity, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_runtime_audit_findings_status_time
  ON runtime_audit_findings(status, created_at DESC);
