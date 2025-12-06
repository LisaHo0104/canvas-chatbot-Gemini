-- Drop unused tables and schema

-- Drop rate_limits table as rate limiting is handled in-memory
DROP TABLE IF EXISTS public.rate_limits;

-- Drop canvas_api_cache table as it is not used in the code
DROP TABLE IF EXISTS public.canvas_api_cache;

-- Drop dev schema and its profiles table
DROP TABLE IF EXISTS dev.profiles;
DROP SCHEMA IF EXISTS dev;

-- Drop file_uploads table as the feature is not fully implemented and the code is broken
DROP TABLE IF EXISTS public.file_uploads;
