-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table (extends Supabase auth.users)
CREATE TABLE public.profiles (
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

-- Create chat sessions table
CREATE TABLE public.chat_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL DEFAULT 'New Chat',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create chat messages table
CREATE TABLE public.chat_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id UUID REFERENCES public.chat_sessions(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create Canvas API cache table
CREATE TABLE public.canvas_api_cache (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    cache_key TEXT NOT NULL,
    cache_data JSONB NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(user_id, cache_key)
);

-- Create file uploads table
CREATE TABLE public.file_uploads (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    session_id UUID REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    file_type TEXT NOT NULL,
    file_path TEXT NOT NULL,
    content_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create rate limiting table
CREATE TABLE public.rate_limits (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    identifier TEXT NOT NULL UNIQUE,
    request_count INTEGER NOT NULL DEFAULT 0,
    window_start TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_chat_sessions_user_id ON public.chat_sessions(user_id);
CREATE INDEX idx_chat_sessions_last_message_at ON public.chat_sessions(last_message_at DESC);
CREATE INDEX idx_chat_messages_session_id ON public.chat_messages(session_id);
CREATE INDEX idx_chat_messages_user_id ON public.chat_messages(user_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at);
CREATE INDEX idx_canvas_api_cache_user_id ON public.canvas_api_cache(user_id);
CREATE INDEX idx_canvas_api_cache_cache_key ON public.canvas_api_cache(cache_key);
CREATE INDEX idx_canvas_api_cache_expires_at ON public.canvas_api_cache(expires_at);
CREATE INDEX idx_file_uploads_user_id ON public.file_uploads(user_id);
CREATE INDEX idx_file_uploads_session_id ON public.file_uploads(session_id);
CREATE INDEX idx_rate_limits_identifier ON public.rate_limits(identifier);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canvas_api_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Create RLS policies for chat sessions
CREATE POLICY "Users can view their own chat sessions" ON public.chat_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own chat sessions" ON public.chat_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chat sessions" ON public.chat_sessions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chat sessions" ON public.chat_sessions
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for chat messages
CREATE POLICY "Users can view messages from their sessions" ON public.chat_messages
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create messages in their sessions" ON public.chat_messages
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for Canvas API cache
CREATE POLICY "Users can view their own cache" ON public.canvas_api_cache
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own cache" ON public.canvas_api_cache
    FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for file uploads
CREATE POLICY "Users can view their own uploads" ON public.file_uploads
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own uploads" ON public.file_uploads
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own uploads" ON public.file_uploads
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for rate limits (admin only)
CREATE POLICY "Service role can manage rate limits" ON public.rate_limits
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Grant permissions to anon and authenticated roles
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT INSERT ON public.profiles TO authenticated;
GRANT UPDATE ON public.profiles TO authenticated;

GRANT SELECT ON public.chat_sessions TO anon, authenticated;
GRANT INSERT ON public.chat_sessions TO authenticated;
GRANT UPDATE ON public.chat_sessions TO authenticated;
GRANT DELETE ON public.chat_sessions TO authenticated;

GRANT SELECT ON public.chat_messages TO anon, authenticated;
GRANT INSERT ON public.chat_messages TO authenticated;

GRANT SELECT ON public.canvas_api_cache TO anon, authenticated;
GRANT ALL ON public.canvas_api_cache TO authenticated;

GRANT SELECT ON public.file_uploads TO anon, authenticated;
GRANT INSERT ON public.file_uploads TO authenticated;
GRANT DELETE ON public.file_uploads TO authenticated;

GRANT ALL ON public.rate_limits TO service_role;

-- Create function to handle user profile creation on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update chat session last_message_at
CREATE OR REPLACE FUNCTION public.update_chat_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.chat_sessions
    SET last_message_at = NEW.created_at
    WHERE id = NEW.session_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for updating chat session timestamp
CREATE TRIGGER on_chat_message_created
    AFTER INSERT ON public.chat_messages
    FOR EACH ROW EXECUTE FUNCTION public.update_chat_session_timestamp();