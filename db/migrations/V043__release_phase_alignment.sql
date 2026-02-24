-- V043__release_phase_alignment.sql
-- Links release markers to runtime phase alignment / acceptance snapshots.

CREATE TABLE IF NOT EXISTS release_phase_alignment (
  id BIGSERIAL PRIMARY KEY,
  release_ref TEXT NOT NULL,
  git_revision TEXT NOT NULL DEFAULT '',
  phase_name TEXT NOT NULL DEFAULT 'unknown',
  phase_status TEXT NOT NULL DEFAULT 'partial',
  flag_source_mode TEXT NOT NULL DEFAULT 'env_locked',
  bundle_mode TEXT NOT NULL DEFAULT '',
  bot_alive BOOLEAN NOT NULL DEFAULT FALSE,
  bot_lock_acquired BOOLEAN NOT NULL DEFAULT FALSE,
  acceptance_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by BIGINT NOT NULL DEFAULT 0,
  UNIQUE (release_ref, phase_name)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'release_phase_alignment_phase_status_check'
  ) THEN
    ALTER TABLE release_phase_alignment
      ADD CONSTRAINT release_phase_alignment_phase_status_check
      CHECK (phase_status IN ('pass', 'partial', 'warn', 'fail'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_release_phase_alignment_release_time
  ON release_phase_alignment(release_ref, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_release_phase_alignment_git_time
  ON release_phase_alignment(git_revision, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_release_phase_alignment_phase_time
  ON release_phase_alignment(phase_name, created_at DESC);
