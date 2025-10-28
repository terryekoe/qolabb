-- =====================================================
-- TEST: Manually test workspace insertion
-- =====================================================

-- 1. Check what auth.uid() returns (should return YOUR user ID)
SELECT auth.uid() as my_user_id;

-- 2. Check the INSERT policy condition
SELECT 
  policyname,
  with_check as check_condition
FROM pg_policies 
WHERE tablename = 'workspaces' AND cmd = 'INSERT';

-- 3. Try to manually insert a workspace (this will test if the policy works)
-- Replace 'YOUR_USER_ID' with the actual UUID from step 1
INSERT INTO workspaces (name, description, owner_id, settings)
VALUES (
  'Test Workspace',
  'Testing RLS policy',
  auth.uid(), -- This should automatically use your user ID
  '{}'::jsonb
)
RETURNING *;

-- 4. If that worked, check if it was created
SELECT id, name, owner_id FROM workspaces ORDER BY created_at DESC LIMIT 1;

-- 5. Clean up the test workspace
DELETE FROM workspaces WHERE name = 'Test Workspace';
