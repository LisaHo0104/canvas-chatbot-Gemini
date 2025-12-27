-- Consolidated Prod Schema Migration
-- This migration creates a complete prod schema with all application and payment tables
-- NOTE: This migration is created but NOT executed yet - will be applied at a later stage
-- Public schema should remain empty

-- ============================================================================
-- STEP 1: Create prod schema
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE SCHEMA IF NOT EXISTS prod;

-- ============================================================================
-- STEP 2: Create App Tables in prod schema
-- ============================================================================

-- Profiles table
CREATE TABLE IF NOT EXISTS prod.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    canvas_institution TEXT,
    canvas_api_key_encrypted TEXT,
    canvas_api_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Chat sessions table
CREATE TABLE IF NOT EXISTS prod.chat_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL DEFAULT 'New Chat',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Chat messages table
CREATE TABLE IF NOT EXISTS prod.chat_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id UUID REFERENCES prod.chat_sessions(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    ui_parts JSONB DEFAULT '[]'::jsonb NOT NULL
);

-- ============================================================================
-- STEP 3: Create Payment Tables in prod schema (Polar)
-- ============================================================================

-- Users table (payment-related user data)
CREATE TABLE IF NOT EXISTS prod.users (
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
CREATE TABLE IF NOT EXISTS prod.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES prod.users(id) ON DELETE CASCADE,
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
CREATE TABLE IF NOT EXISTS prod.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES prod.users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES prod.subscriptions(id) ON DELETE SET NULL,
    polar_payment_id UUID UNIQUE,
    polar_order_id UUID,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'usd',
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Webhook events table
CREATE TABLE IF NOT EXISTS prod.webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    polar_event_id TEXT UNIQUE NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- STEP 4: Create Indexes
-- ============================================================================

-- App table indexes
CREATE INDEX IF NOT EXISTS idx_prod_profiles_email ON prod.profiles(email);
CREATE INDEX IF NOT EXISTS idx_prod_chat_sessions_user_id ON prod.chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_prod_chat_sessions_last_message_at ON prod.chat_sessions(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_prod_chat_messages_session_id ON prod.chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_prod_chat_messages_user_id ON prod.chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_prod_chat_messages_created_at ON prod.chat_messages(created_at);

-- Payment table indexes
CREATE INDEX IF NOT EXISTS idx_prod_users_email ON prod.users(email);
CREATE INDEX IF NOT EXISTS idx_prod_users_polar_customer ON prod.users(polar_customer_id);
CREATE INDEX IF NOT EXISTS idx_prod_users_polar_external ON prod.users(polar_customer_external_id);
CREATE INDEX IF NOT EXISTS idx_prod_subscriptions_user_id ON prod.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_prod_subscriptions_polar_subscription ON prod.subscriptions(polar_subscription_id);
CREATE INDEX IF NOT EXISTS idx_prod_subscriptions_status ON prod.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_prod_payments_user_id ON prod.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_prod_payments_polar_payment ON prod.payments(polar_payment_id);
CREATE INDEX IF NOT EXISTS idx_prod_webhook_events_polar_event ON prod.webhook_events(polar_event_id);
CREATE INDEX IF NOT EXISTS idx_prod_webhook_events_processed ON prod.webhook_events(processed);

-- ============================================================================
-- STEP 5: Enable Row Level Security (RLS)
-- ============================================================================

ALTER TABLE prod.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE prod.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prod.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE prod.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE prod.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prod.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE prod.webhook_events ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 6: Create RLS Policies
-- ============================================================================

-- Profiles policies
CREATE POLICY "Users can view their own profile (prod)" ON prod.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile (prod)" ON prod.profiles
    FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert their own profile (prod)" ON prod.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Chat sessions policies
CREATE POLICY "Users can view their own chat sessions (prod)" ON prod.chat_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own chat sessions (prod)" ON prod.chat_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chat sessions (prod)" ON prod.chat_sessions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chat sessions (prod)" ON prod.chat_sessions
    FOR DELETE USING (auth.uid() = user_id);

-- Chat messages policies
CREATE POLICY "Users can view messages from their sessions (prod)" ON prod.chat_messages
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create messages in their sessions (prod)" ON prod.chat_messages
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Payment users policies
CREATE POLICY "Users can view own data (prod)" ON prod.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data (prod)" ON prod.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own data (prod)" ON prod.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Subscriptions policies
CREATE POLICY "Users can view own subscriptions (prod)" ON prod.subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own subscriptions (prod)" ON prod.subscriptions
    FOR ALL USING (auth.uid() = user_id);

-- Payments policies
CREATE POLICY "Users can view own payments (prod)" ON prod.payments
    FOR SELECT USING (auth.uid() = user_id);

-- Webhook events policies
CREATE POLICY "Admins can view all webhook events (prod)" ON prod.webhook_events
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage webhook events (prod)" ON prod.webhook_events
    FOR ALL USING (true);

-- ============================================================================
-- STEP 7: Grant Permissions
-- ============================================================================

-- App tables grants
GRANT SELECT ON prod.profiles TO anon, authenticated;
GRANT INSERT ON prod.profiles TO authenticated;
GRANT UPDATE ON prod.profiles TO authenticated;

GRANT SELECT ON prod.chat_sessions TO anon, authenticated;
GRANT INSERT ON prod.chat_sessions TO authenticated;
GRANT UPDATE ON prod.chat_sessions TO authenticated;
GRANT DELETE ON prod.chat_sessions TO authenticated;

GRANT SELECT ON prod.chat_messages TO anon, authenticated;
GRANT INSERT ON prod.chat_messages TO authenticated;

-- Payment tables grants
GRANT SELECT ON prod.users TO anon, authenticated;
GRANT SELECT ON prod.subscriptions TO anon, authenticated;
GRANT SELECT ON prod.payments TO anon, authenticated;
GRANT SELECT ON prod.webhook_events TO anon, authenticated;

GRANT ALL ON prod.users TO authenticated;
GRANT ALL ON prod.subscriptions TO authenticated;
GRANT ALL ON prod.payments TO authenticated;
GRANT ALL ON prod.webhook_events TO authenticated;

-- ============================================================================
-- STEP 8: Create Functions
-- ============================================================================

-- Function to handle new user profile creation in prod schema
CREATE OR REPLACE FUNCTION prod.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = prod
LANGUAGE plpgsql
AS $$
BEGIN
    -- Insert profile in prod schema, handling potential errors gracefully
    INSERT INTO prod.profiles (id, email, full_name, avatar_url, created_at, updated_at)
    VALUES (
        NEW.id, 
        COALESCE(NEW.email, ''),
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url',
        TIMEZONE('utc'::text, NOW()),
        TIMEZONE('utc'::text, NOW())
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

-- Function to update chat session timestamp in prod schema
CREATE OR REPLACE FUNCTION prod.update_chat_session_timestamp()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = prod
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE prod.chat_sessions
    SET last_message_at = NEW.created_at
    WHERE id = NEW.session_id;
    RETURN NEW;
END;
$$;

-- ============================================================================
-- STEP 9: Create Triggers
-- ============================================================================

-- Note: Triggers for prod schema will need to be configured separately
-- as we can only have one trigger per event on auth.users
-- This will be handled when prod schema is activated

