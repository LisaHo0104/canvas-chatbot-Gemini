-- Consolidated Dev Schema Migration
-- This migration creates a complete dev schema with all application and payment tables
-- It also ensures public schema is clean (drops all tables)

-- ============================================================================
-- STEP 1: Drop all tables in public schema to ensure clean state
-- ============================================================================

-- Drop all tables in public schema (CASCADE to handle dependencies)
DROP TABLE IF EXISTS public.ai_provider_usage CASCADE;
DROP TABLE IF EXISTS public.ai_providers CASCADE;
DROP TABLE IF EXISTS public.chat_messages CASCADE;
DROP TABLE IF EXISTS public.chat_sessions CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.subscriptions CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.webhook_events CASCADE;
DROP TABLE IF EXISTS public.canvas_api_cache CASCADE;
DROP TABLE IF EXISTS public.file_uploads CASCADE;
DROP TABLE IF EXISTS public.rate_limits CASCADE;

-- Drop functions in public schema
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.update_chat_session_timestamp() CASCADE;
DROP FUNCTION IF EXISTS public.ensure_single_active_provider() CASCADE;
DROP FUNCTION IF EXISTS public.update_ai_provider_timestamp() CASCADE;

-- ============================================================================
-- STEP 2: Create dev schema
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE SCHEMA IF NOT EXISTS dev;

-- ============================================================================
-- STEP 3: Create App Tables in dev schema
-- ============================================================================

-- Profiles table
CREATE TABLE IF NOT EXISTS dev.profiles (
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
CREATE TABLE IF NOT EXISTS dev.chat_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL DEFAULT 'New Chat',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Chat messages table
CREATE TABLE IF NOT EXISTS dev.chat_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id UUID REFERENCES dev.chat_sessions(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    ui_parts JSONB DEFAULT '[]'::jsonb NOT NULL
);

-- ============================================================================
-- STEP 4: Create Payment Tables in dev schema (Polar)
-- ============================================================================

-- Users table (payment-related user data)
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

-- ============================================================================
-- STEP 5: Create Indexes
-- ============================================================================

-- App table indexes
CREATE INDEX IF NOT EXISTS idx_dev_profiles_email ON dev.profiles(email);
CREATE INDEX IF NOT EXISTS idx_dev_chat_sessions_user_id ON dev.chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_dev_chat_sessions_last_message_at ON dev.chat_sessions(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_dev_chat_messages_session_id ON dev.chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_dev_chat_messages_user_id ON dev.chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_dev_chat_messages_created_at ON dev.chat_messages(created_at);

-- Payment table indexes
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

-- ============================================================================
-- STEP 6: Enable Row Level Security (RLS)
-- ============================================================================

ALTER TABLE dev.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE dev.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dev.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE dev.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE dev.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dev.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE dev.webhook_events ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 7: Create RLS Policies
-- ============================================================================

-- Profiles policies
DROP POLICY IF EXISTS "Users can view their own profile (dev)" ON dev.profiles;
DROP POLICY IF EXISTS "Users can update their own profile (dev)" ON dev.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile (dev)" ON dev.profiles;

CREATE POLICY "Users can view their own profile (dev)" ON dev.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile (dev)" ON dev.profiles
    FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert their own profile (dev)" ON dev.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Chat sessions policies
DROP POLICY IF EXISTS "Users can view their own chat sessions (dev)" ON dev.chat_sessions;
DROP POLICY IF EXISTS "Users can create their own chat sessions (dev)" ON dev.chat_sessions;
DROP POLICY IF EXISTS "Users can update their own chat sessions (dev)" ON dev.chat_sessions;
DROP POLICY IF EXISTS "Users can delete their own chat sessions (dev)" ON dev.chat_sessions;

CREATE POLICY "Users can view their own chat sessions (dev)" ON dev.chat_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own chat sessions (dev)" ON dev.chat_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chat sessions (dev)" ON dev.chat_sessions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chat sessions (dev)" ON dev.chat_sessions
    FOR DELETE USING (auth.uid() = user_id);

-- Chat messages policies
DROP POLICY IF EXISTS "Users can view messages from their sessions (dev)" ON dev.chat_messages;
DROP POLICY IF EXISTS "Users can create messages in their sessions (dev)" ON dev.chat_messages;

CREATE POLICY "Users can view messages from their sessions (dev)" ON dev.chat_messages
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create messages in their sessions (dev)" ON dev.chat_messages
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Payment users policies
DROP POLICY IF EXISTS "Users can view own data (dev)" ON dev.users;
DROP POLICY IF EXISTS "Users can update own data (dev)" ON dev.users;
DROP POLICY IF EXISTS "Users can insert own data (dev)" ON dev.users;

CREATE POLICY "Users can view own data (dev)" ON dev.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data (dev)" ON dev.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own data (dev)" ON dev.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Subscriptions policies
DROP POLICY IF EXISTS "Users can view own subscriptions (dev)" ON dev.subscriptions;
DROP POLICY IF EXISTS "Users can manage own subscriptions (dev)" ON dev.subscriptions;

CREATE POLICY "Users can view own subscriptions (dev)" ON dev.subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own subscriptions (dev)" ON dev.subscriptions
    FOR ALL USING (auth.uid() = user_id);

-- Payments policies
DROP POLICY IF EXISTS "Users can view own payments (dev)" ON dev.payments;

CREATE POLICY "Users can view own payments (dev)" ON dev.payments
    FOR SELECT USING (auth.uid() = user_id);

-- Webhook events policies
DROP POLICY IF EXISTS "Admins can view all webhook events (dev)" ON dev.webhook_events;
DROP POLICY IF EXISTS "Admins can manage webhook events (dev)" ON dev.webhook_events;

CREATE POLICY "Admins can view all webhook events (dev)" ON dev.webhook_events
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage webhook events (dev)" ON dev.webhook_events
    FOR ALL USING (true);

-- ============================================================================
-- STEP 8: Grant Permissions
-- ============================================================================

-- App tables grants
GRANT SELECT ON dev.profiles TO anon, authenticated;
GRANT INSERT ON dev.profiles TO authenticated;
GRANT UPDATE ON dev.profiles TO authenticated;

GRANT SELECT ON dev.chat_sessions TO anon, authenticated;
GRANT INSERT ON dev.chat_sessions TO authenticated;
GRANT UPDATE ON dev.chat_sessions TO authenticated;
GRANT DELETE ON dev.chat_sessions TO authenticated;

GRANT SELECT ON dev.chat_messages TO anon, authenticated;
GRANT INSERT ON dev.chat_messages TO authenticated;

-- Payment tables grants
GRANT SELECT ON dev.users TO anon, authenticated;
GRANT SELECT ON dev.subscriptions TO anon, authenticated;
GRANT SELECT ON dev.payments TO anon, authenticated;
GRANT SELECT ON dev.webhook_events TO anon, authenticated;

GRANT ALL ON dev.users TO authenticated;
GRANT ALL ON dev.subscriptions TO authenticated;
GRANT ALL ON dev.payments TO authenticated;
GRANT ALL ON dev.webhook_events TO authenticated;

-- ============================================================================
-- STEP 9: Create Functions
-- ============================================================================

-- Function to handle new user profile creation in dev schema
CREATE OR REPLACE FUNCTION dev.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = dev
LANGUAGE plpgsql
AS $$
BEGIN
    -- Insert profile in dev schema, handling potential errors gracefully
    INSERT INTO dev.profiles (id, email, full_name, avatar_url, created_at, updated_at)
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

-- Function to update chat session timestamp in dev schema
CREATE OR REPLACE FUNCTION dev.update_chat_session_timestamp()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = dev
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE dev.chat_sessions
    SET last_message_at = NEW.created_at
    WHERE id = NEW.session_id;
    RETURN NEW;
END;
$$;

-- ============================================================================
-- STEP 10: Create Triggers
-- ============================================================================

-- Trigger for new user signup (creates profile in dev schema)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION dev.handle_new_user();

-- Trigger for updating chat session timestamp
DROP TRIGGER IF EXISTS on_chat_message_created ON dev.chat_messages;
CREATE TRIGGER on_chat_message_created
    AFTER INSERT ON dev.chat_messages
    FOR EACH ROW EXECUTE FUNCTION dev.update_chat_session_timestamp();

