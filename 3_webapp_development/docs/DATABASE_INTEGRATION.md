# 🔗 Database Integration Guide

## Overview

This guide explains how the Qolabb app is now integrated with Supabase for real-time data persistence and authentication.

---

## 📁 New Files Created

### **1. Type Definitions**
`lib/types/database.ts`

**What it contains:**
- TypeScript interfaces for all database tables
- Insert/Update types for type-safe operations
- Extended types with relations (e.g., `ProjectWithDetails`)
- Helper types for analytics and dashboards

**Key types:**
```typescript
Profile, Workspace, Team, Project, Task, Contribution, ActivityLog
WorkspaceWithMembers, TeamWithMembers, ProjectWithDetails
DashboardStats, TeamPerformance, UserContributionSummary
```

---

### **2. Database Queries**
`lib/db/queries.ts`

**Core functions organized by feature:**

#### Profile Management
- `getProfile(userId)` - Get user profile
- `updateProfile(userId, updates)` - Update profile

#### Workspace Management
- `createWorkspace(workspace, userId)` - Create new workspace
- `getUserWorkspaces(userId)` - Get user's workspaces
- `joinWorkspaceByCode(inviteCode, userId)` - Join via invite
- `getWorkspaceMembers(workspaceId)` - Get all members

#### Team Management
- `createTeam(team, userId)` - Create team
- `getWorkspaceTeams(workspaceId)` - Get all teams
- `getUserTeams(userId, workspaceId?)` - Get user's teams

#### Project Management
- `createProject(project, userId)` - Create project
- `getTeamProjects(teamId)` - Get team's projects
- `getWorkspaceProjects(workspaceId)` - Get all projects
- `updateProject(projectId, updates)` - Update project

#### Contribution Tracking
- `createContribution(contribution)` - Log contribution
- `getUserContributions(userId, projectId?)` - Get contributions
- `getProjectContributions(projectId)` - Get all project contributions

#### Activity & Analytics
- `logActivity(activity)` - Log user activity
- `getWorkspaceActivity(workspaceId, limit)` - Get activity feed
- `getWorkspaceStats(workspaceId)` - Get dashboard stats

---

### **3. Authentication Context**
`lib/auth/AuthContext.tsx`

**Provides app-wide authentication state:**

```typescript
const { user, profile, session, loading, signUp, signIn, signOut } = useAuth()
```

**Features:**
- ✅ Automatic session management
- ✅ Profile loading on auth
- ✅ Real-time auth state updates
- ✅ Sign up with profile creation
- ✅ Sign in/Sign out

**Usage in components:**
```typescript
'use client';
import { useAuth } from '@/lib/auth/AuthContext';

export default function MyComponent() {
  const { user, profile, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Not authenticated</div>;
  
  return <div>Welcome {profile?.full_name}!</div>;
}
```

---

### **4. Updated Supabase Client**
`lib/supabase.ts`

**Now includes:**
- TypeScript type safety with `Database` type
- Environment variable validation
- Better error messages

---

## 🔄 Integration Flow

### Sign Up Process
```
1. User fills signup form
2. Call signUp(email, password, fullName)
3. Supabase creates auth.users entry
4. Profile automatically created in profiles table
5. User redirected to onboarding
```

### Workspace Creation
```
1. User clicks "Create Workspace"
2. Call createWorkspace(data, userId)
3. Workspace created with auto-generated invite code
4. User added as owner in workspace_members
5. Redirect to dashboard
```

### Project Creation
```
1. User creates project
2. Call createProject(data, userId)
3. Project created in database
4. Activity logged in activity_log
5. Real-time update to team members
```

---

## 🎯 Usage Examples

### Example 1: Create Workspace

```typescript
import { createWorkspace } from '@/lib/db/queries';
import { useAuth } from '@/lib/auth/AuthContext';

const { user } = useAuth();

const handleCreate = async () => {
  try {
    const workspace = await createWorkspace({
      name: 'CS101 Spring 2025',
      description: 'Introduction to Computer Science',
      settings: {}
    }, user!.id);
    
    console.log('Created:', workspace);
    console.log('Invite code:', workspace.invite_code);
  } catch (error) {
    console.error('Error:', error);
  }
};
```

---

### Example 2: Join Workspace

```typescript
import { joinWorkspaceByCode } from '@/lib/db/queries';

const handleJoin = async (code: string) => {
  try {
    const workspace = await joinWorkspaceByCode(code, user!.id);
    console.log('Joined:', workspace.name);
  } catch (error) {
    if (error.message === 'Already a member of this workspace') {
      alert('You are already a member!');
    }
  }
};
```

---

### Example 3: Load Dashboard Data

```typescript
import { getWorkspaceStats, getWorkspaceProjects, getWorkspaceActivity } from '@/lib/db/queries';

const loadDashboard = async (workspaceId: string) => {
  const [stats, projects, activity] = await Promise.all([
    getWorkspaceStats(workspaceId),
    getWorkspaceProjects(workspaceId),
    getWorkspaceActivity(workspaceId, 10)
  ]);
  
  return { stats, projects, activity };
};
```

---

### Example 4: Create Contribution

```typescript
import { createContribution } from '@/lib/db/queries';

const logWork = async () => {
  await createContribution({
    project_id: projectId,
    user_id: user!.id,
    title: 'Implemented user authentication',
    description: 'Added login and signup functionality',
    contribution_type: 'code',
    hours_spent: 3.5
  });
};
```

---

## 🔐 Security Notes

### Row Level Security (RLS)
All tables have RLS policies ensuring:
- ✅ Users only see workspaces they're members of
- ✅ Team data only visible to team members
- ✅ Users can only edit their own contributions
- ✅ Role-based permissions enforced

### Environment Variables
Never commit `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
```

---

## 🐛 Error Handling

### Common Patterns

```typescript
try {
  const data = await someQuery();
  return data;
} catch (error) {
  if (error.code === 'PGRST116') {
    // Not found
    console.error('Resource not found');
  } else if (error.message.includes('duplicate')) {
    // Duplicate entry
    console.error('Already exists');
  } else {
    // General error
    console.error('Error:', error.message);
  }
  throw error;
}
```

---

## 📊 Database Schema Quick Reference

```
auth.users (Supabase managed)
  └─ profiles (extended info)

workspaces
  ├─ workspace_members
  └─ teams
      ├─ team_members
      └─ projects
          ├─ tasks
          └─ contributions

activity_log (all workspace activity)
```

---

## 🚀 Next Steps

### To integrate a new feature:

1. **Define types** (if needed) in `lib/types/database.ts`
2. **Create queries** in `lib/db/queries.ts`
3. **Use in components** with `useAuth()` hook
4. **Handle errors** gracefully
5. **Test thoroughly**

---

## 💡 Best Practices

### 1. Always use TypeScript types
```typescript
// Good ✅
const workspace: Workspace = await getWorkspace(id);

// Bad ❌
const workspace = await getWorkspace(id);
```

### 2. Handle loading states
```typescript
const { loading } = useAuth();
if (loading) return <LoadingSpinner />;
```

### 3. Use try-catch for errors
```typescript
try {
  await createWorkspace(data, userId);
} catch (error) {
  toast.error('Failed to create workspace');
}
```

### 4. Validate user permissions
```typescript
if (!user) {
  router.push('/login');
  return;
}
```

### 5. Log important activities
```typescript
await logActivity({
  workspace_id,
  user_id,
  action_type: 'completed_project',
  entity_type: 'project',
  entity_id: projectId,
  metadata: { project_name }
});
```

---

## 🔍 Debugging Tips

### Check Supabase Logs
1. Go to Supabase Dashboard
2. Click **Logs** → **Postgres**
3. Filter by error level

### Verify RLS Policies
```sql
SELECT * FROM pg_policies WHERE tablename = 'workspaces';
```

### Test Queries in SQL Editor
```sql
-- Test if user can see workspace
SELECT * FROM workspaces WHERE id = 'workspace-id';
```

---

## 📚 Additional Resources

- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [TypeScript Support](https://supabase.com/docs/reference/javascript/typescript-support)

---

**All set! Your app is now fully connected to Supabase.** 🎉
