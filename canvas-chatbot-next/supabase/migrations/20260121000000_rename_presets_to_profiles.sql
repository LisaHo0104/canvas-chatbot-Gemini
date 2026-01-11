-- Migration: Rename context_presets to context_profiles and current_preset_id to current_profile_id
-- This migration renames all preset-related database objects to use "profile" terminology

-- ============================================================================
-- STEP 1: Rename table in dev schema
-- ============================================================================

ALTER TABLE IF EXISTS dev.context_presets RENAME TO context_profiles;

-- ============================================================================
-- STEP 2: Rename indexes in dev schema
-- ============================================================================

ALTER INDEX IF EXISTS dev.idx_context_presets_user_id RENAME TO idx_context_profiles_user_id;
ALTER INDEX IF EXISTS dev.idx_context_presets_user_id_name RENAME TO idx_context_profiles_user_id_name;

-- ============================================================================
-- STEP 3: Rename trigger function in dev schema
-- ============================================================================

DROP FUNCTION IF EXISTS dev.update_context_presets_updated_at() CASCADE;
CREATE OR REPLACE FUNCTION dev.update_context_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 4: Recreate trigger with new name in dev schema
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_update_context_presets_updated_at ON dev.context_profiles;
CREATE TRIGGER trigger_update_context_profiles_updated_at
    BEFORE UPDATE ON dev.context_profiles
    FOR EACH ROW
    EXECUTE FUNCTION dev.update_context_profiles_updated_at();

-- ============================================================================
-- STEP 5: Rename RLS policies in dev schema
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own context presets" ON dev.context_profiles;
CREATE POLICY "Users can view their own context profiles"
    ON dev.context_profiles
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own context presets" ON dev.context_profiles;
CREATE POLICY "Users can insert their own context profiles"
    ON dev.context_profiles
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own context presets" ON dev.context_profiles;
CREATE POLICY "Users can update their own context profiles"
    ON dev.context_profiles
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own context presets" ON dev.context_profiles;
CREATE POLICY "Users can delete their own context profiles"
    ON dev.context_profiles
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- STEP 6: Rename column in user_context_selections (dev schema)
-- ============================================================================

ALTER TABLE IF EXISTS dev.user_context_selections
    RENAME COLUMN current_preset_id TO current_profile_id;

-- Drop old foreign key constraint and recreate with new table name
ALTER TABLE IF EXISTS dev.user_context_selections
    DROP CONSTRAINT IF EXISTS user_context_selections_current_preset_id_fkey;

ALTER TABLE IF EXISTS dev.user_context_selections
    ADD CONSTRAINT user_context_selections_current_profile_id_fkey
    FOREIGN KEY (current_profile_id) REFERENCES dev.context_profiles(id) ON DELETE SET NULL;

-- ============================================================================
-- STEP 7: Rename table in public schema (if exists)
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'context_presets') THEN
        ALTER TABLE public.context_presets RENAME TO context_profiles;

        -- Rename indexes
        ALTER INDEX IF EXISTS public.idx_context_presets_user_id RENAME TO idx_context_profiles_user_id;
        ALTER INDEX IF EXISTS public.idx_context_presets_user_id_name RENAME TO idx_context_profiles_user_id_name;

        -- Rename trigger function
        DROP FUNCTION IF EXISTS public.update_context_presets_updated_at() CASCADE;
        CREATE OR REPLACE FUNCTION public.update_context_profiles_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = TIMEZONE('utc'::text, NOW());
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        -- Recreate trigger
        DROP TRIGGER IF EXISTS trigger_update_context_presets_updated_at ON public.context_profiles;
        CREATE TRIGGER trigger_update_context_profiles_updated_at
            BEFORE UPDATE ON public.context_profiles
            FOR EACH ROW
            EXECUTE FUNCTION public.update_context_profiles_updated_at();

        -- Rename RLS policies
        DROP POLICY IF EXISTS "Users can view their own context presets" ON public.context_profiles;
        CREATE POLICY "Users can view their own context profiles"
            ON public.context_profiles
            FOR SELECT
            USING (auth.uid() = user_id);

        DROP POLICY IF EXISTS "Users can insert their own context presets" ON public.context_profiles;
        CREATE POLICY "Users can insert their own context profiles"
            ON public.context_profiles
            FOR INSERT
            WITH CHECK (auth.uid() = user_id);

        DROP POLICY IF EXISTS "Users can update their own context presets" ON public.context_profiles;
        CREATE POLICY "Users can update their own context profiles"
            ON public.context_profiles
            FOR UPDATE
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);

        DROP POLICY IF EXISTS "Users can delete their own context presets" ON public.context_profiles;
        CREATE POLICY "Users can delete their own context profiles"
            ON public.context_profiles
            FOR DELETE
            USING (auth.uid() = user_id);
    END IF;
END $$;

-- ============================================================================
-- STEP 8: Rename column in user_context_selections (public schema, if exists)
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_context_selections') THEN
        ALTER TABLE public.user_context_selections
            RENAME COLUMN current_preset_id TO current_profile_id;

        -- Drop old foreign key constraint and recreate with new table name
        ALTER TABLE public.user_context_selections
            DROP CONSTRAINT IF EXISTS user_context_selections_current_preset_id_fkey;

        ALTER TABLE public.user_context_selections
            ADD CONSTRAINT user_context_selections_current_profile_id_fkey
            FOREIGN KEY (current_profile_id) REFERENCES public.context_profiles(id) ON DELETE SET NULL;
    END IF;
END $$;
