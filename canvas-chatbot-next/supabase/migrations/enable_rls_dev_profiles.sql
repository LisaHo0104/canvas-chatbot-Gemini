BEGIN;

ALTER TABLE dev.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile (dev)" ON dev.profiles;
DROP POLICY IF EXISTS "Users can update own profile (dev)" ON dev.profiles;
DROP POLICY IF EXISTS "Users can insert own profile (dev)" ON dev.profiles;

CREATE POLICY "Users can view own profile (dev)"
ON dev.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile (dev)"
ON dev.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile (dev)"
ON dev.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

GRANT SELECT ON dev.profiles TO authenticated;
GRANT INSERT ON dev.profiles TO authenticated;
GRANT UPDATE ON dev.profiles TO authenticated;

COMMIT;

