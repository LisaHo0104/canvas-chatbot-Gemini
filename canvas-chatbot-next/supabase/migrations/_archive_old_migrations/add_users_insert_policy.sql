-- Fix RLS for `users` to allow authenticated users to insert their own row
-- and ensure UPDATE operations also validate the new row.

-- Allow INSERT when the inserted row id equals auth.uid()
DROP POLICY IF EXISTS "Users can insert own data" ON users;
CREATE POLICY "Users can insert own data" ON users
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Ensure UPDATE both targets and new values match auth.uid()
DROP POLICY IF EXISTS "Users can update own data" ON users;
CREATE POLICY "Users can update own data" ON users
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
