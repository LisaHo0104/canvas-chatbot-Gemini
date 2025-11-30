-- Create AI providers table for storing user AI provider configurations
CREATE TABLE public.ai_providers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    provider_name TEXT NOT NULL CHECK (provider_name IN ('gemini', 'openrouter')),
    api_key_encrypted TEXT NOT NULL,
    model_name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT false NOT NULL,
    config JSONB DEFAULT '{}'::jsonb,
    usage_stats JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(user_id, provider_name)
);

-- Create AI provider usage logs table for tracking usage
CREATE TABLE public.ai_provider_usage (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    provider_id UUID REFERENCES public.ai_providers(id) ON DELETE CASCADE NOT NULL,
    session_id UUID REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
    model_name TEXT NOT NULL,
    request_type TEXT NOT NULL,
    prompt_tokens INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    cost_usd DECIMAL(10,6) DEFAULT 0.000000,
    response_time_ms INTEGER,
    status TEXT NOT NULL CHECK (status IN ('success', 'error', 'timeout')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX idx_ai_providers_user_id ON public.ai_providers(user_id);
CREATE INDEX idx_ai_providers_provider_name ON public.ai_providers(provider_name);
CREATE INDEX idx_ai_providers_is_active ON public.ai_providers(is_active);
CREATE INDEX idx_ai_provider_usage_user_id ON public.ai_provider_usage(user_id);
CREATE INDEX idx_ai_provider_usage_provider_id ON public.ai_provider_usage(provider_id);
CREATE INDEX idx_ai_provider_usage_session_id ON public.ai_provider_usage(session_id);
CREATE INDEX idx_ai_provider_usage_created_at ON public.ai_provider_usage(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.ai_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_provider_usage ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for AI providers
CREATE POLICY "Users can view their own AI providers" ON public.ai_providers
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own AI providers" ON public.ai_providers
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI providers" ON public.ai_providers
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own AI providers" ON public.ai_providers
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for AI provider usage
CREATE POLICY "Users can view their own AI usage" ON public.ai_provider_usage
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service can log AI usage" ON public.ai_provider_usage
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Grant permissions to anon and authenticated roles
GRANT SELECT ON public.ai_providers TO anon, authenticated;
GRANT INSERT ON public.ai_providers TO authenticated;
GRANT UPDATE ON public.ai_providers TO authenticated;
GRANT DELETE ON public.ai_providers TO authenticated;

GRANT SELECT ON public.ai_provider_usage TO anon, authenticated;
GRANT INSERT ON public.ai_provider_usage TO authenticated;

-- Create function to ensure only one active provider per user
CREATE OR REPLACE FUNCTION public.ensure_single_active_provider()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_active = true THEN
        UPDATE public.ai_providers
        SET is_active = false
        WHERE user_id = NEW.user_id 
            AND provider_name != NEW.provider_name
            AND is_active = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for ensuring single active provider
CREATE TRIGGER on_ai_provider_active_update
    AFTER INSERT OR UPDATE OF is_active ON public.ai_providers
    FOR EACH ROW EXECUTE FUNCTION public.ensure_single_active_provider();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_ai_provider_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for updating timestamp
CREATE TRIGGER on_ai_provider_updated
    BEFORE UPDATE ON public.ai_providers
    FOR EACH ROW EXECUTE FUNCTION public.update_ai_provider_timestamp();