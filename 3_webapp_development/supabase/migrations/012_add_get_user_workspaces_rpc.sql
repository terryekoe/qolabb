-- Add RPC function to get user workspaces (bypasses RLS)
CREATE OR REPLACE FUNCTION get_user_workspaces(user_id_param UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  workspace_id UUID,
  role TEXT,
  joined_at TIMESTAMPTZ,
  workspace JSON
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wm.id,
    wm.user_id,
    wm.workspace_id,
    wm.role,
    wm.joined_at,
    row_to_json(w.*) as workspace
  FROM workspace_members wm
  JOIN workspaces w ON w.id = wm.workspace_id
  WHERE wm.user_id = user_id_param;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_workspaces(UUID) TO authenticated;