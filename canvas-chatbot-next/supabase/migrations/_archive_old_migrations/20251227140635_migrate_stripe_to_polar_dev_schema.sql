-- Migration: Migrate Stripe to Polar Payments in dev schema
-- Create payment tables in dev schema to match existing application pattern

-- Ensure dev schema exists
CREATE SCHEMA IF NOT EXISTS dev;

-- Users table (payment-related user data in dev schema)
-- Links to auth.users.id for user authentication
CREATE TABLE IF NOT EXISTS dev.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    polar_customer_id UUID UNIQUE,
    polar_customer_external_id TEXT,
    subscription_status VARCHAR(50) DEFAULT 'inactive',
    current_plan_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS dev.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES dev.users(id) ON DELETE CASCADE,
    polar_subscription_id UUID UNIQUE NOT NULL,
    polar_product_id UUID NOT NULL,
    status VARCHAR(50) NOT NULL,
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payments table
CREATE TABLE IF NOT EXISTS dev.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES dev.users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES dev.subscriptions(id) ON DELETE SET NULL,
    polar_payment_id UUID UNIQUE,
    polar_order_id UUID,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'usd',
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Webhook events table
CREATE TABLE IF NOT EXISTS dev.webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    polar_event_id TEXT UNIQUE NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_dev_users_email ON dev.users(email);
CREATE INDEX IF NOT EXISTS idx_dev_users_polar_customer ON dev.users(polar_customer_id);
CREATE INDEX IF NOT EXISTS idx_dev_users_polar_external ON dev.users(polar_customer_external_id);
CREATE INDEX IF NOT EXISTS idx_dev_subscriptions_user_id ON dev.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_dev_subscriptions_polar_subscription ON dev.subscriptions(polar_subscription_id);
CREATE INDEX IF NOT EXISTS idx_dev_subscriptions_status ON dev.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_dev_payments_user_id ON dev.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_dev_payments_polar_payment ON dev.payments(polar_payment_id);
CREATE INDEX IF NOT EXISTS idx_dev_webhook_events_polar_event ON dev.webhook_events(polar_event_id);
CREATE INDEX IF NOT EXISTS idx_dev_webhook_events_processed ON dev.webhook_events(processed);

-- Row Level Security (RLS) policies
ALTER TABLE dev.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE dev.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dev.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE dev.webhook_events ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT SELECT ON dev.users TO anon, authenticated;
GRANT SELECT ON dev.subscriptions TO anon, authenticated;
GRANT SELECT ON dev.payments TO anon, authenticated;
GRANT SELECT ON dev.webhook_events TO anon, authenticated;

GRANT ALL ON dev.users TO authenticated;
GRANT ALL ON dev.subscriptions TO authenticated;
GRANT ALL ON dev.payments TO authenticated;
GRANT ALL ON dev.webhook_events TO authenticated;

-- RLS Policies for dev.users
CREATE POLICY "Users can view own data (dev)" ON dev.users 
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data (dev)" ON dev.users 
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own data (dev)" ON dev.users 
    FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for dev.subscriptions
CREATE POLICY "Users can view own subscriptions (dev)" ON dev.subscriptions 
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own subscriptions (dev)" ON dev.subscriptions 
    FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for dev.payments
CREATE POLICY "Users can view own payments (dev)" ON dev.payments 
    FOR SELECT USING (auth.uid() = user_id);

-- RLS Policies for dev.webhook_events
CREATE POLICY "Admins can view all webhook events (dev)" ON dev.webhook_events 
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage webhook events (dev)" ON dev.webhook_events 
    FOR ALL USING (true);

