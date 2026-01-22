-- Create study_plans table in dev schema
CREATE TABLE IF NOT EXISTS dev.study_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL,
  course_name TEXT NOT NULL,
  selected_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  study_preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_plan JSONB,
  progress JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_study_plans_user_id ON dev.study_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_study_plans_course_id ON dev.study_plans(course_id);
CREATE INDEX IF NOT EXISTS idx_study_plans_created_at ON dev.study_plans(created_at DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION dev.update_study_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_study_plans_updated_at
  BEFORE UPDATE ON dev.study_plans
  FOR EACH ROW
  EXECUTE FUNCTION dev.update_study_plans_updated_at();

-- Enable Row Level Security
ALTER TABLE dev.study_plans ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Policy: Users can only see their own study plans
CREATE POLICY "Users can view their own study plans"
  ON dev.study_plans
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can only insert their own study plans
CREATE POLICY "Users can insert their own study plans"
  ON dev.study_plans
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only update their own study plans
CREATE POLICY "Users can update their own study plans"
  ON dev.study_plans
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only delete their own study plans
CREATE POLICY "Users can delete their own study plans"
  ON dev.study_plans
  FOR DELETE
  USING (auth.uid() = user_id);
