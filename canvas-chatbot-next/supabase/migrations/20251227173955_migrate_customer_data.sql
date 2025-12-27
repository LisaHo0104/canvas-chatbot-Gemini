-- Data Migration: Move polar_customer_id from dev.users to dev.customers table
-- This migration should be run after the schema migration

-- Migrate existing polar_customer_id from users table to customers table
INSERT INTO dev.customers (id, polar_customer_id)
SELECT 
  id, 
  polar_customer_id::TEXT
FROM dev.users
WHERE polar_customer_id IS NOT NULL
ON CONFLICT (id) DO UPDATE
SET polar_customer_id = EXCLUDED.polar_customer_id;

-- Log the migration
DO $$
DECLARE
  migrated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO migrated_count
  FROM dev.customers
  WHERE polar_customer_id IS NOT NULL;
  
  RAISE NOTICE 'Migrated % customer records from dev.users to dev.customers', migrated_count;
END $$;

