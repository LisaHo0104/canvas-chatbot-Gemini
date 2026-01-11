-- Migration: Create system_prompts table
-- Stores system prompt templates and user's custom system prompt presets
-- Templates are system-wide (user_id = NULL, is_template = true)
-- User presets are user-specific (user_id = current_user, is_template = false)

-- ============================================================================
-- STEP 1: Create system_prompts table in dev schema
-- ============================================================================

CREATE TABLE IF NOT EXISTS dev.system_prompts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    prompt_text TEXT NOT NULL,
    is_template BOOLEAN DEFAULT false NOT NULL,
    template_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT system_prompts_template_check CHECK (
        (is_template = true AND user_id IS NULL) OR
        (is_template = false AND user_id IS NOT NULL)
    )
);

-- ============================================================================
-- STEP 2: Create indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_system_prompts_user_id ON dev.system_prompts(user_id);
CREATE INDEX IF NOT EXISTS idx_system_prompts_is_template ON dev.system_prompts(is_template);
CREATE INDEX IF NOT EXISTS idx_system_prompts_template_type ON dev.system_prompts(template_type);
CREATE INDEX IF NOT EXISTS idx_system_prompts_user_id_name ON dev.system_prompts(user_id, name) WHERE user_id IS NOT NULL;

-- ============================================================================
-- STEP 3: Create trigger to update updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION dev.update_system_prompts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_system_prompts_updated_at ON dev.system_prompts;

CREATE TRIGGER trigger_update_system_prompts_updated_at
    BEFORE UPDATE ON dev.system_prompts
    FOR EACH ROW
    EXECUTE FUNCTION dev.update_system_prompts_updated_at();

-- ============================================================================
-- STEP 4: Enable Row Level Security (RLS) and Create RLS policies
-- ============================================================================

ALTER TABLE dev.system_prompts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all templates (is_template=true) and their own custom prompts
DROP POLICY IF EXISTS "Users can view templates and their own prompts" ON dev.system_prompts;
CREATE POLICY "Users can view templates and their own prompts"
    ON dev.system_prompts
    FOR SELECT
    USING (
        is_template = true OR
        (is_template = false AND auth.uid() = user_id)
    );

-- Policy: Users can insert their own custom prompts (not templates)
DROP POLICY IF EXISTS "Users can insert their own prompts" ON dev.system_prompts;
CREATE POLICY "Users can insert their own prompts"
    ON dev.system_prompts
    FOR INSERT
    WITH CHECK (
        is_template = false AND
        auth.uid() = user_id
    );

-- Policy: Users can update their own custom prompts (not templates)
DROP POLICY IF EXISTS "Users can update their own prompts" ON dev.system_prompts;
CREATE POLICY "Users can update their own prompts"
    ON dev.system_prompts
    FOR UPDATE
    USING (
        is_template = false AND
        auth.uid() = user_id
    )
    WITH CHECK (
        is_template = false AND
        auth.uid() = user_id
    );

-- Policy: Users can delete their own custom prompts (not templates)
DROP POLICY IF EXISTS "Users can delete their own prompts" ON dev.system_prompts;
CREATE POLICY "Users can delete their own prompts"
    ON dev.system_prompts
    FOR DELETE
    USING (
        is_template = false AND
        auth.uid() = user_id
    );

-- ============================================================================
-- STEP 5: Create table in public schema (if needed)
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_context_selections') THEN
        -- Create table in public schema
        CREATE TABLE IF NOT EXISTS public.system_prompts (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            description TEXT,
            prompt_text TEXT NOT NULL,
            is_template BOOLEAN DEFAULT false NOT NULL,
            template_type TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
            CONSTRAINT system_prompts_template_check CHECK (
                (is_template = true AND user_id IS NULL) OR
                (is_template = false AND user_id IS NOT NULL)
            )
        );

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_system_prompts_user_id ON public.system_prompts(user_id);
        CREATE INDEX IF NOT EXISTS idx_system_prompts_is_template ON public.system_prompts(is_template);
        CREATE INDEX IF NOT EXISTS idx_system_prompts_template_type ON public.system_prompts(template_type);
        CREATE INDEX IF NOT EXISTS idx_system_prompts_user_id_name ON public.system_prompts(user_id, name) WHERE user_id IS NOT NULL;

        -- Create trigger function if it doesn't exist
        CREATE OR REPLACE FUNCTION public.update_system_prompts_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = TIMEZONE('utc'::text, NOW());
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        -- Create trigger
        DROP TRIGGER IF EXISTS trigger_update_system_prompts_updated_at ON public.system_prompts;
        CREATE TRIGGER trigger_update_system_prompts_updated_at
            BEFORE UPDATE ON public.system_prompts
            FOR EACH ROW
            EXECUTE FUNCTION public.update_system_prompts_updated_at();

        -- Enable RLS
        ALTER TABLE public.system_prompts ENABLE ROW LEVEL SECURITY;

        -- Create RLS policies
        DROP POLICY IF EXISTS "Users can view templates and their own prompts" ON public.system_prompts;
        CREATE POLICY "Users can view templates and their own prompts"
            ON public.system_prompts
            FOR SELECT
            USING (
                is_template = true OR
                (is_template = false AND auth.uid() = user_id)
            );

        DROP POLICY IF EXISTS "Users can insert their own prompts" ON public.system_prompts;
        CREATE POLICY "Users can insert their own prompts"
            ON public.system_prompts
            FOR INSERT
            WITH CHECK (
                is_template = false AND
                auth.uid() = user_id
            );

        DROP POLICY IF EXISTS "Users can update their own prompts" ON public.system_prompts;
        CREATE POLICY "Users can update their own prompts"
            ON public.system_prompts
            FOR UPDATE
            USING (
                is_template = false AND
                auth.uid() = user_id
            )
            WITH CHECK (
                is_template = false AND
                auth.uid() = user_id
            );

        DROP POLICY IF EXISTS "Users can delete their own prompts" ON public.system_prompts;
        CREATE POLICY "Users can delete their own prompts"
            ON public.system_prompts
            FOR DELETE
            USING (
                is_template = false AND
                auth.uid() = user_id
            );
    END IF;
END $$;
