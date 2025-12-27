-- Grant permissions for anon and authenticated roles to access dev schema tables
-- This ensures RLS policies work correctly

-- Grant schema usage to service_role (needed for webhook operations)
GRANT USAGE ON SCHEMA dev TO service_role;
GRANT ALL ON dev.customers TO service_role;
GRANT ALL ON dev.subscriptions TO service_role;
GRANT ALL ON dev.products TO service_role;
GRANT ALL ON dev.prices TO service_role;
GRANT ALL ON dev.users TO service_role;

-- Grant SELECT on products and prices to anon role (for public access)
GRANT SELECT ON dev.products TO anon;
GRANT SELECT ON dev.prices TO anon;

-- Grant SELECT on products and prices to authenticated role (for logged-in users)
GRANT SELECT ON dev.products TO authenticated;
GRANT SELECT ON dev.prices TO authenticated;

