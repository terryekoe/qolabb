-- =====================================================
-- Fix Ambiguous Column Reference in create_workspace_with_owner
-- Migration: 014_fix_ambiguous_column_reference.sql
-- Description: Fixes the ambiguous 'invite_code' column reference in the RETURN QUERY SELECT
-- =====================================================

-- Drop and recreate the function with proper column qualification
DROP FUNCTION IF EXISTS create_workspace_with_owner(text, uuid, text, jsonb);

CREATE OR REPLACE FUNCTION create_workspace_with_owner(
  workspace_name text,
  owner_user_id uuid,
  workspace_description text DEFAULT NULL,
  workspace_settings jsonb DEFAULT '{}'::jsonb
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
    IF NOT EXISTS (SELECT 1 FROM workspaces WHERE workspaces.invite_code = generated_invite_code) THEN
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

  -- Return the created workspace with fully qualified column names
  RETURN QUERY
  SELECT 
    w.id,
    w.name,
    w.description,
    w.invite_code,  -- This is now unambiguous as it refers to w.invite_code
    w.owner_id,
    w.settings,
    w.created_at,
    w.updated_at
  FROM workspaces w
  WHERE w.id = new_workspace_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_workspace_with_owner(text, uuid, text, jsonb) TO authenticated;