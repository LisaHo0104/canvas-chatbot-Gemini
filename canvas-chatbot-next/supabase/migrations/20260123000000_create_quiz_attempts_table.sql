-- Migration: Create quiz_attempts table in dev schema
-- This migration creates a table to store quiz attempt history

-- ============================================================================
-- STEP 1: Create quiz_attempts table in dev schema
-- ============================================================================

CREATE TABLE IF NOT EXISTS dev.quiz_attempts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    artifact_id UUID REFERENCES dev.artifacts(id) ON DELETE CASCADE NOT NULL,
    quiz_data JSONB NOT NULL,
    user_answers JSONB NOT NULL,
    self_assessments JSONB DEFAULT '{}'::JSONB,
    score NUMERIC(5, 2) NOT NULL,
    total_questions INTEGER NOT NULL,
    time_taken_seconds INTEGER,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ============================================================================
-- STEP 2: Create indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_dev_quiz_attempts_user_id ON dev.quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_dev_quiz_attempts_artifact_id ON dev.quiz_attempts(artifact_id);
CREATE INDEX IF NOT EXISTS idx_dev_quiz_attempts_created_at ON dev.quiz_attempts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dev_quiz_attempts_user_artifact ON dev.quiz_attempts(user_id, artifact_id);

-- ============================================================================
-- STEP 3: Enable Row Level Security (RLS)
-- ============================================================================

ALTER TABLE dev.quiz_attempts ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 4: Create RLS Policies
-- ============================================================================

-- Users can view their own quiz attempts
DROP POLICY IF EXISTS "Users can view their own quiz attempts" ON dev.quiz_attempts;
CREATE POLICY "Users can view their own quiz attempts"
    ON dev.quiz_attempts
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can create their own quiz attempts
DROP POLICY IF EXISTS "Users can create their own quiz attempts" ON dev.quiz_attempts;
CREATE POLICY "Users can create their own quiz attempts"
    ON dev.quiz_attempts
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own quiz attempts
DROP POLICY IF EXISTS "Users can update their own quiz attempts" ON dev.quiz_attempts;
CREATE POLICY "Users can update their own quiz attempts"
    ON dev.quiz_attempts
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own quiz attempts
DROP POLICY IF EXISTS "Users can delete their own quiz attempts" ON dev.quiz_attempts;
CREATE POLICY "Users can delete their own quiz attempts"
    ON dev.quiz_attempts
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- STEP 5: Grant Permissions
-- ============================================================================

-- Grant schema usage if not already granted
GRANT USAGE ON SCHEMA dev TO authenticated;

-- Grant table permissions to authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE ON dev.quiz_attempts TO authenticated;
