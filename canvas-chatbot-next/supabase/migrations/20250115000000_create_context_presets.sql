-- Migration: Create context_presets table
-- Stores user's saved context selection presets (named configurations)
-- for quick switching between different context selections

-- ============================================================================
-- STEP 1: Create context_presets table in dev schema
-- ============================================================================

CREATE TABLE IF NOT EXISTS dev.context_presets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    selected_courses JSONB DEFAULT '[]'::jsonb NOT NULL,
    selected_assignments JSONB DEFAULT '[]'::jsonb NOT NULL,
    selected_modules JSONB DEFAULT '[]'::jsonb NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ============================================================================
-- STEP 2: Create indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_context_presets_user_id ON dev.context_presets(user_id);
CREATE INDEX IF NOT EXISTS idx_context_presets_user_id_name ON dev.context_presets(user_id, name);

-- ============================================================================
-- STEP 3: Create trigger to update updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION dev.update_context_presets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_context_presets_updated_at ON dev.context_presets;

CREATE TRIGGER trigger_update_context_presets_updated_at
    BEFORE UPDATE ON dev.context_presets
    FOR EACH ROW
    EXECUTE FUNCTION dev.update_context_presets_updated_at();

-- ============================================================================
-- STEP 4: Enable Row Level Security (RLS) and Create RLS policies
-- ============================================================================

-- For dev schema
ALTER TABLE dev.context_presets ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own presets
DROP POLICY IF EXISTS "Users can view their own context presets" ON dev.context_presets;
CREATE POLICY "Users can view their own context presets"
    ON dev.context_presets
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own presets
DROP POLICY IF EXISTS "Users can insert their own context presets" ON dev.context_presets;
CREATE POLICY "Users can insert their own context presets"
    ON dev.context_presets
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own presets
DROP POLICY IF EXISTS "Users can update their own context presets" ON dev.context_presets;
CREATE POLICY "Users can update their own context presets"
    ON dev.context_presets
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own presets
DROP POLICY IF EXISTS "Users can delete their own context presets" ON dev.context_presets;
CREATE POLICY "Users can delete their own context presets"
    ON dev.context_presets
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- STEP 6: Create table in public schema (if needed)
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_context_selections') THEN
        -- Create table in public schema
        CREATE TABLE IF NOT EXISTS public.context_presets (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            selected_courses JSONB DEFAULT '[]'::jsonb NOT NULL,
            selected_assignments JSONB DEFAULT '[]'::jsonb NOT NULL,
            selected_modules JSONB DEFAULT '[]'::jsonb NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
        );

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_context_presets_user_id ON public.context_presets(user_id);
        CREATE INDEX IF NOT EXISTS idx_context_presets_user_id_name ON public.context_presets(user_id, name);

        -- Create trigger function if it doesn't exist
        CREATE OR REPLACE FUNCTION public.update_context_presets_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = TIMEZONE('utc'::text, NOW());
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        -- Create trigger
        DROP TRIGGER IF EXISTS trigger_update_context_presets_updated_at ON public.context_presets;
        CREATE TRIGGER trigger_update_context_presets_updated_at
            BEFORE UPDATE ON public.context_presets
            FOR EACH ROW
            EXECUTE FUNCTION public.update_context_presets_updated_at();

        -- Enable RLS
        ALTER TABLE public.context_presets ENABLE ROW LEVEL SECURITY;

        -- Create RLS policies
        DROP POLICY IF EXISTS "Users can view their own context presets" ON public.context_presets;
        CREATE POLICY "Users can view their own context presets"
            ON public.context_presets
            FOR SELECT
            USING (auth.uid() = user_id);

        DROP POLICY IF EXISTS "Users can insert their own context presets" ON public.context_presets;
        CREATE POLICY "Users can insert their own context presets"
            ON public.context_presets
            FOR INSERT
            WITH CHECK (auth.uid() = user_id);

        DROP POLICY IF EXISTS "Users can update their own context presets" ON public.context_presets;
        CREATE POLICY "Users can update their own context presets"
            ON public.context_presets
            FOR UPDATE
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);

        DROP POLICY IF EXISTS "Users can delete their own context presets" ON public.context_presets;
        CREATE POLICY "Users can delete their own context presets"
            ON public.context_presets
            FOR DELETE
            USING (auth.uid() = user_id);
    END IF;
END $$;
