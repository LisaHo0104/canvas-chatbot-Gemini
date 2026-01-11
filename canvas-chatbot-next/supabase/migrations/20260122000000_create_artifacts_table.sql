-- Migration: Create artifacts table in dev schema
-- This migration creates a table to store quiz and rubric analysis artifacts

-- ============================================================================
-- STEP 1: Create artifacts table in dev schema
-- ============================================================================

CREATE TABLE IF NOT EXISTS dev.artifacts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    tags TEXT[] DEFAULT '{}'::TEXT[],
    artifact_type TEXT NOT NULL CHECK (artifact_type IN ('quiz', 'rubric_analysis')),
    artifact_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ============================================================================
-- STEP 2: Create indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_dev_artifacts_user_id ON dev.artifacts(user_id);
CREATE INDEX IF NOT EXISTS idx_dev_artifacts_artifact_type ON dev.artifacts(artifact_type);
CREATE INDEX IF NOT EXISTS idx_dev_artifacts_created_at ON dev.artifacts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dev_artifacts_user_id_type ON dev.artifacts(user_id, artifact_type);

-- ============================================================================
-- STEP 3: Create trigger function for updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION dev.update_artifacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 4: Create trigger
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_update_artifacts_updated_at ON dev.artifacts;
CREATE TRIGGER trigger_update_artifacts_updated_at
    BEFORE UPDATE ON dev.artifacts
    FOR EACH ROW
    EXECUTE FUNCTION dev.update_artifacts_updated_at();

-- ============================================================================
-- STEP 5: Enable Row Level Security (RLS)
-- ============================================================================

ALTER TABLE dev.artifacts ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 6: Create RLS Policies
-- ============================================================================

-- Users can view their own artifacts
DROP POLICY IF EXISTS "Users can view their own artifacts" ON dev.artifacts;
CREATE POLICY "Users can view their own artifacts"
    ON dev.artifacts
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can create their own artifacts
DROP POLICY IF EXISTS "Users can create their own artifacts" ON dev.artifacts;
CREATE POLICY "Users can create their own artifacts"
    ON dev.artifacts
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own artifacts
DROP POLICY IF EXISTS "Users can update their own artifacts" ON dev.artifacts;
CREATE POLICY "Users can update their own artifacts"
    ON dev.artifacts
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own artifacts
DROP POLICY IF EXISTS "Users can delete their own artifacts" ON dev.artifacts;
CREATE POLICY "Users can delete their own artifacts"
    ON dev.artifacts
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- STEP 7: Grant Permissions
-- ============================================================================

-- Grant schema usage if not already granted
GRANT USAGE ON SCHEMA dev TO authenticated;

-- Grant table permissions to authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE ON dev.artifacts TO authenticated;
