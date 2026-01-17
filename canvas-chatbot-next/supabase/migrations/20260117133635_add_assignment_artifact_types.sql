-- Migration: Add 'assignment_plan' and 'assignment_summary' artifact types to artifacts table
-- This migration updates the CHECK constraint to allow these new artifact types

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
-- STEP 2: Add new CHECK constraint that includes 'assignment_plan' and 'assignment_summary'
-- ============================================================================

ALTER TABLE dev.artifacts
ADD CONSTRAINT artifacts_artifact_type_check 
CHECK (artifact_type IN ('quiz', 'rubric_analysis', 'note', 'assignment_plan', 'assignment_summary'));

-- ============================================================================
-- STEP 3: Add comment for documentation
-- ============================================================================

COMMENT ON COLUMN dev.artifacts.artifact_data IS 'JSONB data for artifacts. Structure varies by type:
- quiz: QuizOutput with title, questions, etc.
- rubric_analysis: Simplified RubricAnalysisOutput (no scoringBreakdown, simplified criteria)
- note: Simplified NoteOutput (no summary, successCriteria, practiceQuestions, metadata, sections.keyPoints)
- assignment_plan: { content: string (markdown), metadata?: {...} }
- assignment_summary: { content: string (markdown), metadata?: {...} }';
