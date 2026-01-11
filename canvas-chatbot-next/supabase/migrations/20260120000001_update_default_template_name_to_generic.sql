-- Migration: Update default template name from 'Default' to 'Generic'
-- This aligns the database name with the template definition in system-prompt-templates.ts

-- ============================================================================
-- Update template name in dev schema
-- ============================================================================

UPDATE dev.system_prompts
SET name = 'Generic'
WHERE is_template = true 
  AND template_type = 'default'
  AND name = 'Default';

-- ============================================================================
-- Update template name in public schema if it exists
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'system_prompts') THEN
    UPDATE public.system_prompts
    SET name = 'Generic'
    WHERE is_template = true 
      AND template_type = 'default'
      AND name = 'Default';
  END IF;
END $$;
