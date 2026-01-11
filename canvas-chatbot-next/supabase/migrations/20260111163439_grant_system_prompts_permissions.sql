-- Grant permissions for system_prompts table to authenticated role
-- This ensures RLS policies work correctly for authenticated users

-- Grant schema usage if not already granted
GRANT USAGE ON SCHEMA dev TO authenticated;

-- Grant table permissions to authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE ON dev.system_prompts TO authenticated;

-- Grant permissions on public schema if table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'system_prompts') THEN
        GRANT USAGE ON SCHEMA public TO authenticated;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_prompts TO authenticated;
    END IF;
END $$;
