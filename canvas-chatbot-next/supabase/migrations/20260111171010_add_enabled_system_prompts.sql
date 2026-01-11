-- Migration: Add enabled_system_prompt_ids to user_context_selections table
-- This tracks which system prompts are available for selection in chat sessions
-- Similar pattern to how context types are enabled

-- ============================================================================
-- STEP 1: Add enabled_system_prompt_ids column to dev schema
-- ============================================================================

ALTER TABLE dev.user_context_selections
ADD COLUMN IF NOT EXISTS enabled_system_prompt_ids UUID[] DEFAULT '{}'::UUID[];

-- ============================================================================
-- STEP 2: Add enabled_system_prompt_ids column to public schema (if exists)
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_context_selections') THEN
        ALTER TABLE public.user_context_selections
        ADD COLUMN IF NOT EXISTS enabled_system_prompt_ids UUID[] DEFAULT '{}'::UUID[];
    END IF;
END $$;
