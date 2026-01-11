-- Grant permissions for user_context_selections table to authenticated role
-- This ensures RLS policies work correctly for authenticated users

-- Grant schema usage if not already granted
GRANT USAGE ON SCHEMA dev TO authenticated;

-- Grant table permissions to authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE ON dev.user_context_selections TO authenticated;
