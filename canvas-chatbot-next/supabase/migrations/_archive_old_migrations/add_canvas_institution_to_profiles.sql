-- Add canvas_institution column to profiles in dev and public schemas if present
BEGIN;

ALTER TABLE IF EXISTS dev.profiles
  ADD COLUMN IF NOT EXISTS canvas_institution TEXT;

ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS canvas_institution TEXT;

COMMIT;

