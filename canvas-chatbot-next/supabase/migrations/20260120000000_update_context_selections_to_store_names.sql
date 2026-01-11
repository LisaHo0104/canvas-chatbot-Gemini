-- Migration: Update context selections to store names along with IDs
-- This migration allows the selected_courses, selected_assignments, and selected_modules
-- to store objects with {id, name, code?} instead of just numbers
-- The JSONB columns already support this, so no schema change is needed
-- This is a data migration to convert existing number arrays to object arrays
-- Note: For existing data without names, we'll keep them as numbers for backward compatibility

-- ============================================================================
-- STEP 1: Convert existing number arrays to object arrays in dev schema
-- ============================================================================

-- Convert selected_courses from [1, 2, 3] to [{id: 1}, {id: 2}, {id: 3}]
-- This preserves existing data while allowing new code to add names
UPDATE dev.user_context_selections
SET selected_courses = (
  SELECT jsonb_agg(
    CASE 
      WHEN jsonb_typeof(value) = 'number' THEN jsonb_build_object('id', value)
      ELSE value
    END
  )
  FROM jsonb_array_elements(selected_courses)
)
WHERE jsonb_typeof(selected_courses -> 0) = 'number';

-- Convert selected_assignments from [1, 2, 3] to [{id: 1}, {id: 2}, {id: 3}]
UPDATE dev.user_context_selections
SET selected_assignments = (
  SELECT jsonb_agg(
    CASE 
      WHEN jsonb_typeof(value) = 'number' THEN jsonb_build_object('id', value)
      ELSE value
    END
  )
  FROM jsonb_array_elements(selected_assignments)
)
WHERE jsonb_typeof(selected_assignments -> 0) = 'number';

-- Convert selected_modules from [1, 2, 3] to [{id: 1}, {id: 2}, {id: 3}]
UPDATE dev.user_context_selections
SET selected_modules = (
  SELECT jsonb_agg(
    CASE 
      WHEN jsonb_typeof(value) = 'number' THEN jsonb_build_object('id', value)
      ELSE value
    END
  )
  FROM jsonb_array_elements(selected_modules)
)
WHERE jsonb_typeof(selected_modules -> 0) = 'number';

-- ============================================================================
-- STEP 2: Apply same changes to public schema if it exists
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_context_selections') THEN
        -- Convert selected_courses
        UPDATE public.user_context_selections
        SET selected_courses = (
          SELECT jsonb_agg(
            CASE 
              WHEN jsonb_typeof(value) = 'number' THEN jsonb_build_object('id', value)
              ELSE value
            END
          )
          FROM jsonb_array_elements(selected_courses)
        )
        WHERE jsonb_typeof(selected_courses -> 0) = 'number';

        -- Convert selected_assignments
        UPDATE public.user_context_selections
        SET selected_assignments = (
          SELECT jsonb_agg(
            CASE 
              WHEN jsonb_typeof(value) = 'number' THEN jsonb_build_object('id', value)
              ELSE value
            END
          )
          FROM jsonb_array_elements(selected_assignments)
        )
        WHERE jsonb_typeof(selected_assignments -> 0) = 'number';

        -- Convert selected_modules
        UPDATE public.user_context_selections
        SET selected_modules = (
          SELECT jsonb_agg(
            CASE 
              WHEN jsonb_typeof(value) = 'number' THEN jsonb_build_object('id', value)
              ELSE value
            END
          )
          FROM jsonb_array_elements(selected_modules)
        )
        WHERE jsonb_typeof(selected_modules -> 0) = 'number';
    END IF;
END $$;
