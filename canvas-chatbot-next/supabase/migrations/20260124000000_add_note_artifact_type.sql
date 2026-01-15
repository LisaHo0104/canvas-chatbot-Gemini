-- Migration: Add 'note' artifact type to artifacts table
-- This migration updates the CHECK constraint to allow 'note' as a valid artifact_type

-- ============================================================================
-- STEP 1: Drop the existing CHECK constraint (if it exists)
-- ============================================================================
-- PostgreSQL auto-generates constraint names, so we need to find and drop it
-- The constraint name is typically: artifacts_artifact_type_check

DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- Find the constraint name for the artifact_type CHECK constraint
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'dev.artifacts'::regclass
      AND contype = 'c'
      AND conname LIKE '%artifact_type%';
    
    -- Drop the constraint if it exists
    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE dev.artifacts DROP CONSTRAINT %I', constraint_name);
    END IF;
END $$;

-- ============================================================================
-- STEP 2: Add new CHECK constraint that includes 'note'
-- ============================================================================

ALTER TABLE dev.artifacts
ADD CONSTRAINT artifacts_artifact_type_check 
CHECK (artifact_type IN ('quiz', 'rubric_analysis', 'note'));
