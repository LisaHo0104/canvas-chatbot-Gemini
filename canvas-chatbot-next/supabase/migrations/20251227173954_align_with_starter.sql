-- Migration: Align with polar-supabase-starter pattern
-- Adds products, prices, and customers tables in dev schema
-- Updates subscriptions table to support price_id

-- ============================================================================
-- STEP 1: Create products table in dev schema
-- ============================================================================

CREATE TABLE IF NOT EXISTS dev.products (
  -- Product ID from Polar (stored as TEXT to match starter pattern)
  id TEXT PRIMARY KEY,
  -- Whether the product is currently available for purchase
  active BOOLEAN,
  -- The product's name
  name TEXT,
  -- The product's description
  description TEXT,
  -- A URL of the product image
  image TEXT,
  -- Set of key-value pairs for additional information
  metadata JSONB
);

-- ============================================================================
-- STEP 2: Create prices table in dev schema
-- ============================================================================

-- Create pricing type enum
DO $$ BEGIN
  CREATE TYPE dev.pricing_type AS ENUM ('one_time', 'recurring');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create pricing plan interval enum
DO $$ BEGIN
  CREATE TYPE dev.pricing_plan_interval AS ENUM ('day', 'week', 'month', 'year');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS dev.prices (
  -- Price ID from Polar (stored as TEXT to match starter pattern)
  id TEXT PRIMARY KEY,
  -- The ID of the product that this price belongs to
  product_id TEXT REFERENCES dev.products(id) ON DELETE CASCADE,
  -- Price amount in USD cents
  price_amount INTEGER,
  -- One of `one_time` or `recurring`
  type dev.pricing_type,
  -- The frequency at which a subscription is billed
  recurring_interval dev.pricing_plan_interval,
  -- Set of key-value pairs for additional information
  metadata JSONB
);

-- ============================================================================
-- STEP 3: Create customers table in dev schema
-- ============================================================================

CREATE TABLE IF NOT EXISTS dev.customers (
  -- UUID from auth.users
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  -- The user's customer ID in Polar (stored as TEXT to match starter pattern)
  polar_customer_id TEXT UNIQUE
);

-- ============================================================================
-- STEP 4: Update subscriptions table to add price_id
-- ============================================================================

-- Add price_id column to subscriptions (nullable for backward compatibility)
ALTER TABLE dev.subscriptions 
ADD COLUMN IF NOT EXISTS price_id TEXT REFERENCES dev.prices(id) ON DELETE SET NULL;

-- ============================================================================
-- STEP 5: Create indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_dev_products_active ON dev.products(active);
CREATE INDEX IF NOT EXISTS idx_dev_prices_product_id ON dev.prices(product_id);
CREATE INDEX IF NOT EXISTS idx_dev_prices_active ON dev.prices(product_id) WHERE product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dev_customers_polar_customer_id ON dev.customers(polar_customer_id);
CREATE INDEX IF NOT EXISTS idx_dev_subscriptions_price_id ON dev.subscriptions(price_id) WHERE price_id IS NOT NULL;

-- ============================================================================
-- STEP 6: Enable Row Level Security
-- ============================================================================

ALTER TABLE dev.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE dev.prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE dev.customers ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 7: Create RLS Policies
-- ============================================================================

-- Products: Allow public read-only access
DROP POLICY IF EXISTS "Allow public read-only access (dev)" ON dev.products;
CREATE POLICY "Allow public read-only access (dev)" ON dev.products
  FOR SELECT USING (true);

-- Prices: Allow public read-only access
DROP POLICY IF EXISTS "Allow public read-only access (dev)" ON dev.prices;
CREATE POLICY "Allow public read-only access (dev)" ON dev.prices
  FOR SELECT USING (true);

-- Customers: No policies (private table, only accessible via service role)
-- Service role client will bypass RLS for webhook operations

