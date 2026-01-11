-- Migration: Create user_context_selections table
-- Stores user's selected Canvas context items (courses, assignments, modules)
-- and tracks when Canvas data was last synced

-- ============================================================================
-- STEP 1: Create user_context_selections table in dev schema
-- ============================================================================

CREATE TABLE IF NOT EXISTS dev.user_context_selections (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    selected_courses JSONB DEFAULT '[]'::jsonb NOT NULL,
    selected_assignments JSONB DEFAULT '[]'::jsonb NOT NULL,
    selected_modules JSONB DEFAULT '[]'::jsonb NOT NULL,
    last_synced_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ============================================================================
-- STEP 2: Create indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_user_context_selections_user_id ON dev.user_context_selections(user_id);

-- ============================================================================
-- STEP 3: Create trigger to update updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION dev.update_user_context_selections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_context_selections_updated_at ON dev.user_context_selections;

CREATE TRIGGER trigger_update_user_context_selections_updated_at
    BEFORE UPDATE ON dev.user_context_selections
    FOR EACH ROW
    EXECUTE FUNCTION dev.update_user_context_selections_updated_at();

-- ============================================================================
-- STEP 4: Enable Row Level Security (RLS)
-- ============================================================================

ALTER TABLE dev.user_context_selections ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 5: Create RLS policies
-- ============================================================================

-- Policy: Users can only view their own context selections
DROP POLICY IF EXISTS "Users can view their own context selections" ON dev.user_context_selections;
CREATE POLICY "Users can view their own context selections"
    ON dev.user_context_selections
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own context selections
DROP POLICY IF EXISTS "Users can insert their own context selections" ON dev.user_context_selections;
CREATE POLICY "Users can insert their own context selections"
    ON dev.user_context_selections
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own context selections
DROP POLICY IF EXISTS "Users can update their own context selections" ON dev.user_context_selections;
CREATE POLICY "Users can update their own context selections"
    ON dev.user_context_selections
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own context selections
DROP POLICY IF EXISTS "Users can delete their own context selections" ON dev.user_context_selections;
CREATE POLICY "Users can delete their own context selections"
    ON dev.user_context_selections
    FOR DELETE
    USING (auth.uid() = user_id);
