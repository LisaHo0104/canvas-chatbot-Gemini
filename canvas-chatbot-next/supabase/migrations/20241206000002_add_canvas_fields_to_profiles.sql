-- Add Canvas-related fields to public.profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS canvas_institution TEXT,
  ADD COLUMN IF NOT EXISTS canvas_api_key_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS canvas_api_url TEXT;

GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT INSERT ON public.profiles TO authenticated;
GRANT UPDATE ON public.profiles TO authenticated;
