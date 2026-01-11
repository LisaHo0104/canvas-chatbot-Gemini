-- Migration: Add current_system_prompt_id to user_context_selections table
-- This allows tracking which system prompt is currently applied to the user's chat sessions

-- ============================================================================
-- STEP 1: Add current_system_prompt_id column to dev schema
-- ============================================================================

ALTER TABLE dev.user_context_selections
ADD COLUMN IF NOT EXISTS current_system_prompt_id UUID REFERENCES dev.system_prompts(id) ON DELETE SET NULL;

-- ============================================================================
-- STEP 2: Add current_system_prompt_id column to public schema (if exists)
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_context_selections') THEN
        ALTER TABLE public.user_context_selections
        ADD COLUMN IF NOT EXISTS current_system_prompt_id UUID REFERENCES public.system_prompts(id) ON DELETE SET NULL;
    END IF;
END $$;
