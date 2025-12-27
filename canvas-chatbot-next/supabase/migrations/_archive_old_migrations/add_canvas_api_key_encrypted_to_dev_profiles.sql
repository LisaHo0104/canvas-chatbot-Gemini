BEGIN;

ALTER TABLE IF EXISTS dev.profiles
  ADD COLUMN IF NOT EXISTS canvas_api_key_encrypted TEXT;

COMMIT;

