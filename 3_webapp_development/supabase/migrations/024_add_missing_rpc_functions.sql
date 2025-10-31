-- =====================================================
-- Add Missing RPC Functions
-- Migration: 024_add_missing_rpc_functions.sql
-- Description: Adds debug_workspace_access and get_workspace_rpc functions
-- =====================================================

-- Function to debug workspace access (helps troubleshoot RLS issues)
CREATE OR REPLACE FUNCTION debug_workspace_access(
  workspace_id_param UUID,
  user_id_param UUID
)
RETURNS TABLE (
  workspace_exists BOOLEAN,
  user_is_member BOOLEAN,
  user_is_owner BOOLEAN,
  membership_role TEXT,
  workspace_name TEXT,
  debug_info JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  workspace_record RECORD;
  membership_record RECORD;
BEGIN
  -- Check if workspace exists
  SELECT w.* INTO workspace_record
  FROM workspaces w
  WHERE w.id = workspace_id_param;

  -- Check membership
  SELECT wm.* INTO membership_record
  FROM workspace_members wm
  WHERE wm.workspace_id = workspace_id_param 
    AND wm.user_id = user_id_param;

  -- Return debug information
  RETURN QUERY
  SELECT 
    (workspace_record.id IS NOT NULL) as workspace_exists,
    (membership_record.user_id IS NOT NULL) as user_is_member,
    (workspace_record.owner_id = user_id_param) as user_is_owner,
    COALESCE(membership_record.role, 'none') as membership_role,
    COALESCE(workspace_record.name, 'N/A') as workspace_name,
    jsonb_build_object(
      'workspace_id', workspace_id_param,
      'user_id', user_id_param,
      'workspace_owner_id', workspace_record.owner_id,
      'membership_joined_at', membership_record.joined_at,
      'workspace_created_at', workspace_record.created_at
    ) as debug_info;
END;
$$;

-- Function to get workspace data (bypasses RLS)
CREATE OR REPLACE FUNCTION get_workspace_rpc(
  workspace_id_param UUID,
  user_id_param UUID
)
RETURNS TABLE (
  workspace_id UUID,
  workspace_name TEXT,
  workspace_description TEXT,
  workspace_invite_code TEXT,
  workspace_owner_id UUID,
  workspace_settings JSONB,
  workspace_created_at TIMESTAMPTZ,
  workspace_updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user has access to this workspace
  IF NOT EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = workspace_id_param 
      AND wm.user_id = user_id_param
  ) AND NOT EXISTS (
    SELECT 1 FROM workspaces w
    WHERE w.id = workspace_id_param 
      AND w.owner_id = user_id_param
  ) THEN
    RAISE EXCEPTION 'Access denied: User is not a member of this workspace';
  END IF;

  -- Return workspace data
  RETURN QUERY
  SELECT 
    w.id as workspace_id,
    w.name as workspace_name,
    w.description as workspace_description,
    w.invite_code as workspace_invite_code,
    w.owner_id as workspace_owner_id,
    w.settings as workspace_settings,
    w.created_at as workspace_created_at,
    w.updated_at as workspace_updated_at
  FROM workspaces w
  WHERE w.id = workspace_id_param;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION debug_workspace_access(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_workspace_rpc(UUID, UUID) TO authenticated;