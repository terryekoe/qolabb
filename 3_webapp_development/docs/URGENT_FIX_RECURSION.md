# URGENT: Fix Infinite Recursion in workspace_members Policies

## Problem
The application is experiencing infinite recursion errors when accessing workspace_members data:
```
Error: infinite recursion detected in policy for relation "workspace_members"
Code: 42P17
```

## Root Cause
The Row Level Security (RLS) policies on the `workspace_members` table are creating circular dependencies, where the policies reference the same table they're protecting.

## IMMEDIATE FIX REQUIRED

### Step 1: Access Supabase Dashboard
1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Navigate to your project
3. Click on the **SQL Editor** tab in the left sidebar

### Step 2: Execute the Fix SQL
Copy and paste this SQL into the SQL Editor and click "Run":

```sql
-- URGENT FIX: Remove infinite recursion in workspace_members policies
-- This SQL must be executed in the Supabase dashboard SQL Editor

-- Step 1: Disable RLS temporarily to avoid recursion during policy changes
ALTER TABLE workspace_members DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies that might be causing recursion
DROP POLICY IF EXISTS "workspace_members_select_policy" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_insert_policy" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_update_policy" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_delete_policy" ON workspace_members;
DROP POLICY IF EXISTS "Users can view workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Users can insert workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Users can update workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Users can delete workspace members" ON workspace_members;

-- Step 3: Re-enable RLS
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

-- Step 4: Create new non-recursive policies
-- SELECT policy: Users can view members of workspaces they own or their own membership
CREATE POLICY "workspace_members_select_policy" ON workspace_members
FOR SELECT USING (
  -- User is the workspace owner (direct check, no recursion)
  EXISTS (
    SELECT 1 FROM workspaces w 
    WHERE w.id = workspace_members.workspace_id 
    AND w.owner_id = auth.uid()
  )
  OR
  -- User is viewing their own membership record (direct check, no recursion)
  workspace_members.user_id = auth.uid()
);

-- INSERT policy: Only workspace owners can add members
CREATE POLICY "workspace_members_insert_policy" ON workspace_members
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM workspaces w 
    WHERE w.id = workspace_members.workspace_id 
    AND w.owner_id = auth.uid()
  )
);

-- UPDATE policy: Only workspace owners can update member roles
CREATE POLICY "workspace_members_update_policy" ON workspace_members
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM workspaces w 
    WHERE w.id = workspace_members.workspace_id 
    AND w.owner_id = auth.uid()
  )
);

-- DELETE policy: Workspace owners can remove any member, users can remove themselves
CREATE POLICY "workspace_members_delete_policy" ON workspace_members
FOR DELETE USING (
  -- User is the workspace owner
  EXISTS (
    SELECT 1 FROM workspaces w 
    WHERE w.id = workspace_members.workspace_id 
    AND w.owner_id = auth.uid()
  )
  OR
  -- User is removing their own membership
  workspace_members.user_id = auth.uid()
);

-- Step 5: Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
```

### Step 3: Verify the Fix
1. After executing the SQL, you should see "Success. No rows returned" or similar
2. Go back to your application and refresh the page
3. Check the browser console - the infinite recursion errors should be gone
4. Test workspace functionality to ensure it works properly

## What This Fix Does

### Key Changes:
1. **Removes circular dependencies**: The new policies don't reference the `workspace_members` table within their own policy checks
2. **Uses direct workspace ownership checks**: Queries the `workspaces` table directly instead of using helper functions
3. **Maintains security**: Ensures only workspace owners and members can access appropriate data
4. **Prevents recursion**: Each policy uses simple, non-recursive conditions

### Security Model:
- **SELECT**: Users can see workspace members if they own the workspace OR if they are viewing their own membership
- **INSERT**: Only workspace owners can add new members
- **UPDATE**: Only workspace owners can modify member roles
- **DELETE**: Workspace owners can remove any member, users can remove themselves

## Troubleshooting

### If the error persists:
1. Check that all policies were dropped successfully
2. Verify that RLS is enabled on the table
3. Clear your browser cache and refresh
4. Check for any remaining helper functions that might be causing issues

### If you see permission errors:
1. Make sure you're logged in as the database owner
2. Try running the SQL in smaller chunks
3. Contact your database administrator if needed

## Prevention
To prevent this issue in the future:
1. Always test RLS policies in a development environment first
2. Avoid referencing the same table within its own policies
3. Use direct table queries instead of complex helper functions when possible
4. Monitor for recursion warnings during policy creation

## Status
- [ ] SQL executed in Supabase dashboard
- [ ] Application tested and working
- [ ] Infinite recursion errors resolved
- [ ] Workspace functionality verified

---
**IMPORTANT**: This fix must be applied immediately to restore application functionality. The migrations through CLI are not working, so manual execution via the Supabase dashboard is required.