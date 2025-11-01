// =====================================================
// Qolabb Database Types
// Auto-generated TypeScript types for Supabase tables
// =====================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// =====================================================
// DATABASE TYPE (for Supabase client)
// =====================================================

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: ProfileInsert
        Update: ProfileUpdate
      }
      workspaces: {
        Row: Workspace
        Insert: WorkspaceInsert
        Update: WorkspaceUpdate
      }
      workspace_members: {
        Row: WorkspaceMember
        Insert: WorkspaceMemberInsert
        Update: Partial<WorkspaceMember>
      }
      teams: {
        Row: Team
        Insert: TeamInsert
        Update: TeamUpdate
      }
      team_members: {
        Row: TeamMember
        Insert: TeamMemberInsert
        Update: Partial<TeamMember>
      }
      team_join_requests: {
        Row: TeamJoinRequest
        Insert: TeamJoinRequestInsert
        Update: TeamJoinRequestUpdate
      }
      team_assignment_audit: {
        Row: TeamAssignmentAudit
        Insert: TeamAssignmentAuditInsert
        Update: never
      }
      projects: {
        Row: Project
        Insert: ProjectInsert
        Update: ProjectUpdate
      }
      tasks: {
        Row: Task
        Insert: TaskInsert
        Update: TaskUpdate
      }
      contributions: {
        Row: Contribution
        Insert: ContributionInsert
        Update: ContributionUpdate
      }
      activity_log: {
        Row: ActivityLog
        Insert: ActivityLogInsert
        Update: never
      }
    }
  }
}

// =====================================================
// ENUMS
// =====================================================

export type UserRole = 'student' | 'instructor' | 'both'
export type WorkspaceMemberRole = 'owner' | 'admin' | 'member'
export type TeamMemberRole = 'leader' | 'member'
export type ProjectStatus = 'pending' | 'active' | 'completed' | 'archived'
export type TaskStatus = 'todo' | 'in_progress' | 'completed'
export type TaskPriority = 'low' | 'medium' | 'high'
export type ContributionType = 'code' | 'documentation' | 'research' | 'design' | 'meeting' | 'other'
export type JoinRequestType = 'self_request' | 'owner_invitation'
export type JoinRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'
export type TeamAssignmentAction = 'join_request' | 'invitation_sent' | 'approved' | 'rejected' | 'cancelled' | 'member_added' | 'member_removed' | 'role_changed'

// =====================================================
// TABLE TYPES
// =====================================================

export interface Profile {
  id: string
  full_name: string
  avatar_url: string | null
  role: UserRole
  institution: string | null
  email: string | null
  goals: string[] | null
  created_at: string
  updated_at: string
}

export interface Workspace {
  id: string
  name: string
  description: string | null
  invite_code: string
  owner_id: string
  settings: Json
  created_at: string
  updated_at: string
}

export interface WorkspaceMember {
  id: string
  workspace_id: string
  user_id: string
  role: WorkspaceMemberRole
  joined_at: string
}

export interface Team {
  id: string
  workspace_id: string
  name: string
  description: string | null
  avatar_color: string
  created_by: string | null
  settings: Json | null
  is_public: boolean
  created_at: string
  updated_at: string
}

export interface TeamMember {
  id: string
  team_id: string
  user_id: string
  role: TeamMemberRole
  joined_at: string
}

export interface TeamJoinRequest {
  id: string
  team_id: string
  user_id: string
  requested_by: string
  request_type: JoinRequestType
  status: JoinRequestStatus
  message: string | null
  created_at: string
  updated_at: string
}

export interface TeamAssignmentAudit {
  id: string
  team_id: string
  user_id: string
  action: TeamAssignmentAction
  performed_by: string
  details: Json | null
  created_at: string
}

export interface Project {
  id: string
  workspace_id: string
  team_id: string
  name: string
  description: string | null
  status: ProjectStatus
  due_date: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  project_id: string
  title: string
  description: string | null
  assigned_to: string | null
  status: TaskStatus
  priority: TaskPriority
  due_date: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Contribution {
  id: string
  project_id: string
  user_id: string
  task_id: string | null
  title: string
  description: string | null
  contribution_type: ContributionType
  hours_spent: number | null
  created_at: string
  updated_at: string
}

export interface TaskAttachment {
  id: string
  task_id: string
  user_id: string | null
  file_name: string | null
  file_path: string | null
  file_size: number | null
  file_type: string | null
  external_url: string | null
  uploaded_at: string
  user?: {
    id: string
    full_name: string
    avatar_url?: string
  }
}

export interface TaskSubtask {
  id: string
  task_id: string
  title: string
  completed: boolean
  position: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ActivityLog {
  id: string
  workspace_id: string
  user_id: string
  action_type: string
  entity_type: string
  entity_id: string | null
  metadata: Json
  created_at: string
}

// =====================================================
// INSERT TYPES (for creating new records)
// =====================================================

export type ProfileInsert = Omit<Profile, 'created_at' | 'updated_at'>
export type WorkspaceInsert = Omit<Workspace, 'id' | 'invite_code' | 'created_at' | 'updated_at'>
export type WorkspaceMemberInsert = Omit<WorkspaceMember, 'id' | 'joined_at'>
export type TeamInsert = Omit<Team, 'id' | 'created_by' | 'created_at' | 'updated_at'>
export type TeamMemberInsert = Omit<TeamMember, 'id' | 'joined_at'>
export type TeamJoinRequestInsert = Omit<TeamJoinRequest, 'id' | 'created_at' | 'updated_at'>
export type TeamAssignmentAuditInsert = Omit<TeamAssignmentAudit, 'id' | 'created_at'>
export type ProjectInsert = Omit<Project, 'id' | 'created_at' | 'updated_at'>
export type TaskInsert = Omit<Task, 'id' | 'created_by' | 'created_at' | 'updated_at'>
export type ContributionInsert = Omit<Contribution, 'id' | 'created_at' | 'updated_at'>
export type ActivityLogInsert = Omit<ActivityLog, 'id' | 'created_at'>

// =====================================================
// UPDATE TYPES (for updating records)
// =====================================================

export type ProfileUpdate = Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>
export type WorkspaceUpdate = Partial<Omit<Workspace, 'id' | 'owner_id' | 'created_at' | 'updated_at'>>
export type TeamUpdate = Partial<Omit<Team, 'id' | 'workspace_id' | 'created_at' | 'updated_at'>>
export type TeamJoinRequestUpdate = Partial<Omit<TeamJoinRequest, 'id' | 'team_id' | 'user_id' | 'requested_by' | 'request_type' | 'created_at' | 'updated_at'>>
export type ProjectUpdate = Partial<Omit<Project, 'id' | 'workspace_id' | 'team_id' | 'created_at' | 'updated_at'>>
export type TaskUpdate = Partial<Omit<Task, 'id' | 'project_id' | 'created_at' | 'updated_at'>>
export type ContributionUpdate = Partial<Omit<Contribution, 'id' | 'project_id' | 'user_id' | 'created_at' | 'updated_at'>>

// =====================================================
// EXTENDED TYPES (with relations)
// =====================================================

export interface WorkspaceWithMembers extends Workspace {
  members: (WorkspaceMember & { profile: Profile })[]
  member_count: number
}

export interface TeamWithMembers extends Team {
  members: (TeamMember & { profile: Profile })[]
  member_count: number
}

export interface ProjectWithDetails extends Project {
  team: Team
  tasks: Task[]
  contributions: Contribution[]
  progress: number
}

export interface ActivityWithUser extends ActivityLog {
  user: Profile
}

export interface TeamJoinRequestWithDetails extends TeamJoinRequest {
  user: Profile
  team: Team
  requested_by_user: Profile
}

export interface TeamWithSettings extends Team {
  settings: {
    allow_self_join?: boolean
    require_approval?: boolean
    max_members?: number
  } | null
}

export interface DiscoverableTeam extends TeamWithSettings {
  member_count: number
  can_join: boolean
  join_status?: 'not_member' | 'pending' | 'member'
}

// =====================================================
// HELPER TYPES
// =====================================================

export interface DashboardStats {
  activeProjects: number
  totalMembers: number
  avgParticipation: number
  tasksCompleted: number
}

export interface TeamPerformance {
  team_id: string
  team_name: string
  total_contributions: number
  total_hours: number
  avg_participation: number
  member_count: number
}

export interface UserContributionSummary {
  user_id: string
  user_name: string
  total_contributions: number
  total_hours: number
  contribution_breakdown: {
    [key in ContributionType]: number
  }
}
