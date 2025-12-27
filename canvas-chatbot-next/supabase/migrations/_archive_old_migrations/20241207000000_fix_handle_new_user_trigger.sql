-- Fix handle_new_user trigger function to properly handle profile creation
-- This ensures the trigger can insert profiles even with RLS enabled

-- Drop and recreate the function with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    -- Insert profile, handling potential errors gracefully
    INSERT INTO public.profiles (id, email, full_name, avatar_url, created_at, updated_at)
    VALUES (
        NEW.id, 
        COALESCE(NEW.email, ''),
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url',
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;
    
    RETURN NEW;
EXCEPTION
    WHEN others THEN
        -- Log the error but don't fail the user creation
        RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$;

-- Ensure the function has the right owner (postgres role can bypass RLS)
ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

-- Grant execute permission to authenticated role (though SECURITY DEFINER should handle this)
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated, anon, service_role;

-- Ensure the trigger exists and is properly configured
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Ensure the function owner can bypass RLS
-- SECURITY DEFINER functions should bypass RLS, but we'll ensure proper configuration
-- The function is already set to SECURITY DEFINER and owned by postgres, which should work

