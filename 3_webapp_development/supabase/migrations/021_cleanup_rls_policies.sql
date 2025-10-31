-- =====================================================
-- Migration: 021_cleanup_rls_policies.sql
-- Description: Clean up all conflicting RLS policies and establish consistent rules
-- =====================================================

-- First, drop ALL existing workspace_members policies to start fresh
DROP POLICY IF EXISTS "workspace_members_safe_select" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_safe_insert" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_safe_update" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_safe_delete" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_enhanced_select" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_enhanced_insert" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_enhanced_update" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_enhanced_delete" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_select_policy" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_insert_policy" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_update_policy" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_delete_policy" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_select" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_insert" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_update" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_delete" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_owner_all" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_self_insert" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_select_own" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_select_as_owner" ON workspace_members;
DROP POLICY IF EXISTS "wm_select_own" ON workspace_members;
DROP POLICY IF EXISTS "wm_insert_own" ON workspace_members;
DROP POLICY IF EXISTS "wm_update_own" ON workspace_members;
DROP POLICY IF EXISTS "wm_delete_own" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_own_access" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_all_operations" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_simple_select" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_simple_insert" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_simple_update" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_simple_delete" ON workspace_members;

-- Ensure RLS is enabled
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- CREATE CLEAN, CONSISTENT RLS POLICIES
-- =====================================================

-- SELECT: Users can see workspace members if they are:
-- 1. The member themselves
-- 2. A member of the same workspace
-- 3. The workspace owner
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workspace_members' AND policyname = 'workspace_members_select') THEN
    CREATE POLICY "workspace_members_select" ON workspace_members
    FOR SELECT
    TO authenticated
    USING (
      -- User can see their own membership
      user_id = auth.uid()
      OR
      -- User can see other members if they are also a member of the same workspace
      EXISTS (
        SELECT 1 FROM workspace_members wm2
        WHERE wm2.workspace_id = workspace_members.workspace_id
        AND wm2.user_id = auth.uid()
      )
      OR
      -- Workspace owner can see all members
      EXISTS (
        SELECT 1 FROM workspaces w
        WHERE w.id = workspace_members.workspace_id
        AND w.owner_id = auth.uid()
      )
    );
  END IF;
END $$;

-- INSERT: Users can join workspaces if:
-- 1. They are joining themselves
-- 2. They are the workspace owner adding someone
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workspace_members' AND policyname = 'workspace_members_insert') THEN
    CREATE POLICY "workspace_members_insert" ON workspace_members
    FOR INSERT
    TO authenticated
    WITH CHECK (
      -- User can join themselves
      user_id = auth.uid()
      OR
      -- Workspace owner can add members
      EXISTS (
        SELECT 1 FROM workspaces w
        WHERE w.id = workspace_members.workspace_id
        AND w.owner_id = auth.uid()
      )
    );
  END IF;
END $$;

-- UPDATE: Users can update memberships if:
-- 1. They are updating their own membership
-- 2. They are the workspace owner
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workspace_members' AND policyname = 'workspace_members_update') THEN
    CREATE POLICY "workspace_members_update" ON workspace_members
    FOR UPDATE
    TO authenticated
    USING (
      -- User can update their own membership
      user_id = auth.uid()
      OR
      -- Workspace owner can update any membership
      EXISTS (
        SELECT 1 FROM workspaces w
        WHERE w.id = workspace_members.workspace_id
        AND w.owner_id = auth.uid()
      )
    )
    WITH CHECK (
      -- Same conditions for WITH CHECK
      user_id = auth.uid()
      OR
      EXISTS (
        SELECT 1 FROM workspaces w
        WHERE w.id = workspace_members.workspace_id
        AND w.owner_id = auth.uid()
      )
    );
  END IF;
END $$;

-- DELETE: Users can remove memberships if:
-- 1. They are leaving themselves
-- 2. They are the workspace owner removing someone
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workspace_members' AND policyname = 'workspace_members_delete') THEN
    CREATE POLICY "workspace_members_delete" ON workspace_members
    FOR DELETE
    TO authenticated
    USING (
      -- User can leave themselves
      user_id = auth.uid()
      OR
      -- Workspace owner can remove members
      EXISTS (
        SELECT 1 FROM workspaces w
        WHERE w.id = workspace_members.workspace_id
        AND w.owner_id = auth.uid()
      )
    );
  END IF;
END $$;

-- =====================================================
-- ALSO CLEAN UP PROFILES RLS POLICIES
-- =====================================================

-- Drop existing profiles policies
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles SELECT: Users can see profiles of people in their workspaces
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_select') THEN
    CREATE POLICY "profiles_select" ON profiles
    FOR SELECT
    TO authenticated
    USING (
      -- User can see their own profile
      id = auth.uid()
      OR
      -- User can see profiles of people in the same workspace
      EXISTS (
        SELECT 1 FROM workspace_members wm1
        JOIN workspace_members wm2 ON wm1.workspace_id = wm2.workspace_id
        WHERE wm1.user_id = auth.uid()
        AND wm2.user_id = profiles.id
      )
    );
  END IF;
END $$;

-- Profiles UPDATE: Users can only update their own profile
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_update') THEN
    CREATE POLICY "profiles_update" ON profiles
    FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());
  END IF;
END $$;

-- Profiles INSERT: Users can only insert their own profile
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_insert') THEN
    CREATE POLICY "profiles_insert" ON profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (id = auth.uid());
  END IF;
END $$;

-- =====================================================
-- WORKSPACES RLS POLICIES
-- =====================================================

-- Drop existing workspace policies
DROP POLICY IF EXISTS "workspaces_select_policy" ON workspaces;
DROP POLICY IF EXISTS "workspaces_insert_policy" ON workspaces;
DROP POLICY IF EXISTS "workspaces_update_policy" ON workspaces;
DROP POLICY IF EXISTS "workspaces_delete_policy" ON workspaces;

-- Enable RLS on workspaces
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

-- Workspaces SELECT: Users can see workspaces they are members of
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workspaces' AND policyname = 'workspaces_select') THEN
    CREATE POLICY "workspaces_select" ON workspaces
    FOR SELECT
    TO authenticated
    USING (
      -- User is the owner
      owner_id = auth.uid()
      OR
      -- User is a member
      EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.workspace_id = workspaces.id
        AND wm.user_id = auth.uid()
      )
    );
  END IF;
END $$;

-- Workspaces INSERT: Any authenticated user can create workspaces
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workspaces' AND policyname = 'workspaces_insert') THEN
    CREATE POLICY "workspaces_insert" ON workspaces
    FOR INSERT
    TO authenticated
    WITH CHECK (owner_id = auth.uid());
  END IF;
END $$;

-- Workspaces UPDATE: Only owners can update workspaces
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workspaces' AND policyname = 'workspaces_update') THEN
    CREATE POLICY "workspaces_update" ON workspaces
    FOR UPDATE
    TO authenticated
    USING (owner_id = auth.uid())
    WITH CHECK (owner_id = auth.uid());
  END IF;
END $$;

-- Workspaces DELETE: Only owners can delete workspaces
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workspaces' AND policyname = 'workspaces_delete') THEN
    CREATE POLICY "workspaces_delete" ON workspaces
    FOR DELETE
    TO authenticated
    USING (owner_id = auth.uid());
  END IF;
END $$;

-- =====================================================
-- REFRESH SCHEMA CACHE
-- =====================================================

-- Refresh the schema cache to ensure policies are active
NOTIFY pgrst, 'reload schema';