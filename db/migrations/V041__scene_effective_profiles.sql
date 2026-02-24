-- V041__scene_effective_profiles.sql
-- Effective scene profile snapshots and fallback events used by WebApp diagnostics.

CREATE TABLE IF NOT EXISTS scene_effective_profiles (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  scene_key TEXT NOT NULL DEFAULT 'nexus_arena',
  scene_mode TEXT NOT NULL DEFAULT 'pro',
  asset_mode TEXT NOT NULL DEFAULT 'mixed',
  perf_profile TEXT NOT NULL DEFAULT 'normal',
  quality_mode TEXT NOT NULL DEFAULT 'auto',
  reduced_motion BOOLEAN NOT NULL DEFAULT FALSE,
  large_text BOOLEAN NOT NULL DEFAULT FALSE,
  fallback_active BOOLEAN NOT NULL DEFAULT FALSE,
  profile_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'scene_effective_profiles_scene_mode_check'
  ) THEN
    ALTER TABLE scene_effective_profiles
      ADD CONSTRAINT scene_effective_profiles_scene_mode_check
      CHECK (scene_mode IN ('pro', 'lite', 'cinematic', 'minimal'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'scene_effective_profiles_asset_mode_check'
  ) THEN
    ALTER TABLE scene_effective_profiles
      ADD CONSTRAINT scene_effective_profiles_asset_mode_check
      CHECK (asset_mode IN ('glb', 'procedural', 'mixed', 'lite'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_scene_effective_profiles_user_time
  ON scene_effective_profiles(user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_scene_effective_profiles_scene_time
  ON scene_effective_profiles(scene_key, created_at DESC);

CREATE TABLE IF NOT EXISTS scene_fallback_events (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  scene_key TEXT NOT NULL DEFAULT 'nexus_arena',
  fallback_mode TEXT NOT NULL DEFAULT 'lite',
  reason_key TEXT NOT NULL DEFAULT 'unknown',
  event_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scene_fallback_events_scene_time
  ON scene_fallback_events(scene_key, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_scene_fallback_events_reason_time
  ON scene_fallback_events(reason_key, created_at DESC);
