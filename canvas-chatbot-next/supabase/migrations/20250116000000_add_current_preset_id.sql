-- Migration: Add current_preset_id to user_context_selections table
-- This allows tracking which preset is currently applied to the user's selections

-- ============================================================================
-- STEP 1: Add current_preset_id column to dev schema
-- ============================================================================

ALTER TABLE dev.user_context_selections
ADD COLUMN IF NOT EXISTS current_preset_id UUID REFERENCES dev.context_presets(id) ON DELETE SET NULL;

-- ============================================================================
-- STEP 2: Add current_preset_id column to public schema (if exists)
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_context_selections') THEN
        ALTER TABLE public.user_context_selections
        ADD COLUMN IF NOT EXISTS current_preset_id UUID REFERENCES public.context_presets(id) ON DELETE SET NULL;
    END IF;
END $$;
