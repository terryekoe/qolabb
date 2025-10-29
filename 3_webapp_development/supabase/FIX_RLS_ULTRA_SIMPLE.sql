-- =====================================================
-- ULTRA SIMPLE RLS FIX - ZERO RECURSION
-- =====================================================

-- Step 1: Completely disable RLS and clean up
ALTER TABLE workspaces DISABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies (including any with different names)
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    -- Drop all policies on workspaces table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'workspaces') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON workspaces';
    END LOOP;
    
    -- Drop all policies on workspace_members table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'workspace_members') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON workspace_members';
    END LOOP;
END $$;

-- Step 3: Re-enable RLS
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

-- Step 4: Create ULTRA SIMPLE policies with ZERO cross-table references

-- WORKSPACES TABLE - Only direct owner checks
CREATE POLICY "workspaces_all_operations" ON workspaces
  FOR ALL
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- WORKSPACE_MEMBERS TABLE - Only direct user checks  
CREATE POLICY "workspace_members_all_operations" ON workspace_members
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Step 5: Verify the simple setup
SELECT 
  tablename,
  policyname,
  cmd,
  permissive
FROM pg_policies 
WHERE tablename IN ('workspaces', 'workspace_members')
ORDER BY tablename;