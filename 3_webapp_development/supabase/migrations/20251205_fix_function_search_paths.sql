-- Migration: 20251205_fix_function_search_paths.sql
-- Description: Fixes "Function Search Path Mutable" security warnings by explicitly setting search_path to public
-- This uses a dynamic approach to find the exact function signatures in the database

DO $$
DECLARE
    func_record RECORD;
    func_sig TEXT;
    funcs_to_fix TEXT[] := ARRAY[
        'update_task_subtasks_updated_at',
        'update_external_integrations_updated_at',
        'is_workspace_member',
        'update_linked_repos_updated_at',
        'update_linked_docs_updated_at',
        'auto_create_contribution_from_automated',
        'update_discussion_last_activity',
        'mark_message_as_edited',
        'create_default_team_channel',
        'get_workspace_members_rpc',
        'get_workspace_teams_rpc',
        'update_updated_at_column',
        'generate_invite_code',
        'set_workspace_invite_code',
        'is_workspace_owner',
        'get_user_workspaces',
        'auto_approve_join_request',
        'add_member_on_approval',
        'debug_workspace_access',
        'mark_notification_read',
        'mark_all_notifications_read',
        'get_unread_notification_count',
        'create_notification',
        'get_workspace_rpc',
        'handle_new_user',
        'safe_create_profile',
        'get_workspace_projects_rpc',
        'get_workspace_activity_rpc'
    ];
BEGIN
    FOR func_record IN 
        SELECT 
            n.nspname as schema_name,
            p.proname as function_name,
            pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.proname = ANY(funcs_to_fix)
    LOOP
        func_sig := format('%I.%I(%s)', func_record.schema_name, func_record.function_name, func_record.args);
        
        RAISE NOTICE 'Fixing search_path for function: %', func_sig;
        
        EXECUTE format('ALTER FUNCTION %s SET search_path = public', func_sig);
    END LOOP;
END $$;
