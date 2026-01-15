-- Migration: Create study_plan_progress table and add study_plan artifact type
-- This migration creates a table to store study plan milestone progress and
-- adds 'study_plan' as a valid artifact type

-- ============================================================================
-- STEP 1: Update artifacts table to include study_plan type
-- ============================================================================

-- Drop the existing constraint and recreate with study_plan included
ALTER TABLE dev.artifacts DROP CONSTRAINT IF EXISTS artifacts_artifact_type_check;
ALTER TABLE dev.artifacts ADD CONSTRAINT artifacts_artifact_type_check 
    CHECK (artifact_type IN ('quiz', 'rubric_analysis', 'study_plan'));

-- ============================================================================
-- STEP 2: Create study_plan_progress table in dev schema
-- ============================================================================

CREATE TABLE IF NOT EXISTS dev.study_plan_progress (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    artifact_id UUID REFERENCES dev.artifacts(id) ON DELETE CASCADE NOT NULL,
    milestone_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    -- Ensure unique milestone per user per artifact
    UNIQUE(user_id, artifact_id, milestone_id)
);

-- ============================================================================
-- STEP 3: Create indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_dev_study_plan_progress_user_id ON dev.study_plan_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_dev_study_plan_progress_artifact_id ON dev.study_plan_progress(artifact_id);
CREATE INDEX IF NOT EXISTS idx_dev_study_plan_progress_status ON dev.study_plan_progress(status);
CREATE INDEX IF NOT EXISTS idx_dev_study_plan_progress_user_artifact ON dev.study_plan_progress(user_id, artifact_id);

-- ============================================================================
-- STEP 4: Create trigger function for updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION dev.update_study_plan_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 5: Create trigger
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_update_study_plan_progress_updated_at ON dev.study_plan_progress;
CREATE TRIGGER trigger_update_study_plan_progress_updated_at
    BEFORE UPDATE ON dev.study_plan_progress
    FOR EACH ROW
    EXECUTE FUNCTION dev.update_study_plan_progress_updated_at();

-- ============================================================================
-- STEP 6: Enable Row Level Security (RLS)
-- ============================================================================

ALTER TABLE dev.study_plan_progress ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 7: Create RLS Policies
-- ============================================================================

-- Users can view their own study plan progress
DROP POLICY IF EXISTS "Users can view their own study plan progress" ON dev.study_plan_progress;
CREATE POLICY "Users can view their own study plan progress"
    ON dev.study_plan_progress
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can create their own study plan progress
DROP POLICY IF EXISTS "Users can create their own study plan progress" ON dev.study_plan_progress;
CREATE POLICY "Users can create their own study plan progress"
    ON dev.study_plan_progress
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own study plan progress
DROP POLICY IF EXISTS "Users can update their own study plan progress" ON dev.study_plan_progress;
CREATE POLICY "Users can update their own study plan progress"
    ON dev.study_plan_progress
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own study plan progress
DROP POLICY IF EXISTS "Users can delete their own study plan progress" ON dev.study_plan_progress;
CREATE POLICY "Users can delete their own study plan progress"
    ON dev.study_plan_progress
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- STEP 8: Grant Permissions
-- ============================================================================

-- Grant schema usage if not already granted
GRANT USAGE ON SCHEMA dev TO authenticated;

-- Grant table permissions to authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE ON dev.study_plan_progress TO authenticated;
