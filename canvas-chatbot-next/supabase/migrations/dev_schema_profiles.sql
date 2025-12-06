-- Create dev schema and profiles table mirroring public
CREATE SCHEMA IF NOT EXISTS dev;

-- Create profiles table in dev schema
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_dev_profiles_email ON dev.profiles(email);

-- Enable Row Level Security (RLS)
ALTER TABLE dev.profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for dev.profiles
CREATE POLICY "Users can view their own profile (dev)" ON dev.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile (dev)" ON dev.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile (dev)" ON dev.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Grants (match public grants)
GRANT SELECT ON dev.profiles TO anon, authenticated;
GRANT INSERT ON dev.profiles TO authenticated;
GRANT UPDATE ON dev.profiles TO authenticated;
