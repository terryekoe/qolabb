-- =====================================================
-- Fix Workspace Join RLS Policy
-- Migration: 011_fix_workspace_join_rls.sql
-- Description: Creates RPC functions to bypass RLS for workspace operations
-- =====================================================

-- Function to create workspace (bypasses RLS)
CREATE OR REPLACE FUNCTION create_workspace_with_owner(
  workspace_name text,
  owner_user_id uuid,
  workspace_description text DEFAULT '',
  workspace_settings jsonb DEFAULT '{}'
)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  invite_code text,
  owner_id uuid,
  settings jsonb,
  created_at timestamptz,
  updated_at timestamptz
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  new_workspace_id uuid;
  generated_invite_code text;
  attempts int := 0;
BEGIN
  -- Generate unique invite code
  LOOP
    generated_invite_code := upper(substring(md5(random()::text) from 1 for 6));
    
    -- Check if invite code already exists
    IF NOT EXISTS (SELECT 1 FROM workspaces WHERE invite_code = generated_invite_code) THEN
      EXIT;
    END IF;
    
    attempts := attempts + 1;
    IF attempts > 10 THEN
      RAISE EXCEPTION 'Could not generate unique invite code';
    END IF;
  END LOOP;

  -- Insert workspace
  INSERT INTO workspaces (name, description, invite_code, owner_id, settings)
  VALUES (workspace_name, workspace_description, generated_invite_code, owner_user_id, workspace_settings)
  RETURNING workspaces.id INTO new_workspace_id;

  -- Add owner as workspace member
  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (new_workspace_id, owner_user_id, 'owner');

  -- Return the created workspace
  RETURN QUERY
  SELECT 
    w.id,
    w.name,
    w.description,
    w.invite_code,
    w.owner_id,
    w.settings,
    w.created_at,
    w.updated_at
  FROM workspaces w
  WHERE w.id = new_workspace_id;
END;
$$;

-- Function to join workspace by invite code (bypasses RLS)
CREATE OR REPLACE FUNCTION join_workspace_by_invite_code(
  invite_code_param text,
  user_id_param uuid
)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  invite_code text,
  owner_id uuid,
  settings jsonb,
  created_at timestamptz,
  updated_at timestamptz
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  target_workspace_id uuid;
BEGIN
  -- Find workspace by invite code
  SELECT w.id INTO target_workspace_id
  FROM workspaces w
  WHERE w.invite_code = upper(invite_code_param);

  -- Check if workspace exists
  IF target_workspace_id IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code. Please check and try again.';
  END IF;

  -- Check if user is already a member
  IF EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_id = target_workspace_id AND user_id = user_id_param
  ) THEN
    RAISE EXCEPTION 'You are already a member of this workspace.';
  END IF;

  -- Add user as member
  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (target_workspace_id, user_id_param, 'member');

  -- Return the workspace
  RETURN QUERY
  SELECT 
    w.id,
    w.name,
    w.description,
    w.invite_code,
    w.owner_id,
    w.settings,
    w.created_at,
    w.updated_at
  FROM workspaces w
  WHERE w.id = target_workspace_id;
END;
$$;

-- Ensure the get_workspace_by_invite_code function exists and works correctly
CREATE OR REPLACE FUNCTION get_workspace_by_invite_code(invite_code_param text)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  invite_code text,
  owner_id uuid,
  created_at timestamptz,
  updated_at timestamptz
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    w.id,
    w.name,
    w.description,
    w.invite_code,
    w.owner_id,
    w.created_at,
    w.updated_at
  FROM workspaces w
  WHERE w.invite_code = upper(invite_code_param);
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION create_workspace_with_owner(text, uuid, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION join_workspace_by_invite_code(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_workspace_by_invite_code(text) TO authenticated;