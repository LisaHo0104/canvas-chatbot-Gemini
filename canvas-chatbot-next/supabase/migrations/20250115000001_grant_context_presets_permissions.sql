-- Grant permissions for context_presets table to authenticated role
-- This ensures RLS policies work correctly for authenticated users

-- Grant schema usage if not already granted
GRANT USAGE ON SCHEMA dev TO authenticated;

-- Grant table permissions to authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE ON dev.context_presets TO authenticated;

-- Grant permissions on public schema if table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'context_presets') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.context_presets TO authenticated;
    END IF;
END $$;
