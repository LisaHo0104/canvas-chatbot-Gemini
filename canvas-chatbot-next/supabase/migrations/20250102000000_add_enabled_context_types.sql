-- Migration: Add enabled context types to user_context_selections table
-- This allows users to enable/disable which types of context (courses, assignments, modules)
-- are available for selection in the chat page

-- ============================================================================
-- STEP 1: Add enabled type columns to dev schema
-- ============================================================================

ALTER TABLE dev.user_context_selections
ADD COLUMN IF NOT EXISTS courses_enabled BOOLEAN DEFAULT true NOT NULL,
ADD COLUMN IF NOT EXISTS assignments_enabled BOOLEAN DEFAULT true NOT NULL,
ADD COLUMN IF NOT EXISTS modules_enabled BOOLEAN DEFAULT true NOT NULL;

-- ============================================================================
-- STEP 2: Add enabled type columns to public schema (if exists)
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_context_selections') THEN
        ALTER TABLE public.user_context_selections
        ADD COLUMN IF NOT EXISTS courses_enabled BOOLEAN DEFAULT true NOT NULL,
        ADD COLUMN IF NOT EXISTS assignments_enabled BOOLEAN DEFAULT true NOT NULL,
        ADD COLUMN IF NOT EXISTS modules_enabled BOOLEAN DEFAULT true NOT NULL;
    END IF;
END $$;
