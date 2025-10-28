# 🗄️ Supabase Database Setup Guide

## Overview
This guide will walk you through setting up your Supabase database for Qolabb.

---

## 📋 Prerequisites

1. A Supabase account (free tier works great!)
2. Access to Supabase SQL Editor
3. Your project's `.env.local` file ready

---

## 🚀 Step-by-Step Setup

### Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign in or create an account
3. Click "New Project"
4. Fill in the details:
   - **Name**: `qolabb` (or your preferred name)
   - **Database Password**: (save this - you'll need it!)
   - **Region**: Choose closest to you
5. Click "Create new project"
6. Wait for the project to be created (~2 minutes)

---

### Step 2: Get Your API Credentials

1. Once created, go to **Settings** → **API**
2. Copy the following values:

   ```bash
   Project URL: https://xxxxxxxxxxxxx.supabase.co
   anon/public key: eyJhbGciOiJI...
   ```

3. Update your `.env.local` file:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJI...
   ```

---

### Step 3: Run Migration Files

#### 🔹 Migration 1: Initial Schema

1. In Supabase Dashboard, go to **SQL Editor**
2. Click "New query"
3. Copy the entire contents of `supabase/migrations/001_initial_schema.sql`
4. Paste into the SQL Editor
5. Click **Run** (or press `Ctrl/Cmd + Enter`)
6. You should see: "Success. No rows returned"

**What this creates:**
- ✅ 9 core tables (profiles, workspaces, teams, projects, tasks, contributions, etc.)
- ✅ Helper functions (generate invite codes, update timestamps)
- ✅ Triggers (auto-update timestamps, set invite codes)
- ✅ Indexes for performance

#### 🔹 Migration 2: Row Level Security

1. In SQL Editor, click "New query" again
2. Copy the entire contents of `supabase/migrations/002_rls_policies.sql`
3. Paste into the SQL Editor
4. Click **Run**
5. You should see: "Success. No rows returned"

**What this creates:**
- ✅ RLS policies for all tables
- ✅ Secure access control based on user roles
- ✅ Workspace/team membership validation
- ✅ Prevents unauthorized data access

---

### Step 4: Verify the Setup

1. In Supabase Dashboard, go to **Table Editor**
2. You should see all tables:
   - profiles
   - workspaces
   - workspace_members
   - teams
   - team_members
   - projects
   - tasks
   - contributions
   - activity_log

3. Click on any table to explore its structure
4. Go to **Authentication** → **Policies** to see RLS rules

---

### Step 5: Enable Email Authentication

1. Go to **Authentication** → **Providers**
2. Make sure **Email** is enabled (should be by default)
3. Optional: Configure email templates:
   - **Authentication** → **Email Templates**
   - Customize "Confirm signup" and "Magic Link"

---

### Step 6: Configure Authentication Settings

1. Go to **Authentication** → **URL Configuration**
2. Add your local development URL:
   - **Site URL**: `http://localhost:3000`
   - **Redirect URLs**: `http://localhost:3000/**`

3. Later, add your production URL when deployed

---

### Step 7: Test the Connection

1. Restart your Next.js development server:
   ```bash
   npm run dev
   ```

2. Try signing up at `http://localhost:3000/signup`
3. Check Supabase Dashboard → **Authentication** → **Users**
4. You should see your new user!

---

## 🔍 Database Schema Overview

### Core Tables

```
┌─────────────────────────────────────────────────┐
│                   WORKSPACES                    │
│  - Classrooms, courses, organizations          │
└─────────────┬───────────────────────────────────┘
              │
              ├──> WORKSPACE_MEMBERS
              │    (Users in workspace)
              │
              └──> TEAMS
                   (Project groups)
                   │
                   ├──> TEAM_MEMBERS
                   │
                   └──> PROJECTS
                        │
                        ├──> TASKS
                        │
                        └──> CONTRIBUTIONS
                             (User work tracking)
```

### Key Relationships

1. **Users** (auth.users) → Extended by **profiles**
2. **Workspaces** → Contains **teams** → Contains **projects**
3. **Projects** → Has **tasks** and **contributions**
4. **Activity Log** → Tracks all workspace activities

---

## 📊 Database Functions

### Generate Invite Code
Automatically generates unique invite codes for workspaces:
```sql
-- Format: XXXX-XXXX-XXXX
-- Example: A7K9-M2P5-Q8R3
```

### Auto-Update Timestamps
All tables automatically update `updated_at` on changes.

---

## 🔐 Security Features

### Row Level Security (RLS)

**Profiles:**
- ✅ Anyone can view profiles
- ✅ Users can only edit their own profile

**Workspaces:**
- ✅ Only members can view workspace
- ✅ Only owners/admins can edit
- ✅ Only owners can delete

**Teams & Projects:**
- ✅ Only team members can view/edit
- ✅ Team leaders have additional permissions

**Contributions:**
- ✅ Only team members can view
- ✅ Users can only edit their own contributions

---

## 🧪 Testing Queries

After setup, try these test queries in SQL Editor:

### 1. Check if tables exist
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';
```

### 2. Test invite code generation
```sql
SELECT generate_invite_code();
```

### 3. View RLS policies
```sql
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public';
```

---

## 🐛 Troubleshooting

### Issue: Migration fails with "relation already exists"
**Solution**: Tables might already exist. Either:
- Drop existing tables first (⚠️ destroys data!)
- Or skip to next migration

### Issue: RLS policies fail
**Solution**: Make sure Migration 1 completed first. RLS policies require tables to exist.

### Issue: Can't connect from app
**Solution**: 
1. Check `.env.local` has correct values
2. Restart dev server: `npm run dev`
3. Verify URL includes `https://` protocol

### Issue: Authentication not working
**Solution**:
1. Check **Authentication** → **Providers** → Email is enabled
2. Check **URL Configuration** has `http://localhost:3000`
3. Clear browser cookies and try again

---

## 📈 Next Steps After Setup

Once migrations are complete:

1. ✅ Update Supabase client configuration
2. ✅ Test authentication flow
3. ✅ Create workspace via UI
4. ✅ Verify data in Supabase Table Editor
5. ✅ Build out remaining features

---

## 📝 Useful Supabase Commands

### View all tables
```sql
\dt
```

### Check table structure
```sql
\d+ table_name
```

### Count records in a table
```sql
SELECT COUNT(*) FROM table_name;
```

### View recent activity
```sql
SELECT * FROM activity_log 
ORDER BY created_at DESC 
LIMIT 10;
```

---

## 🔗 Helpful Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [SQL Editor Guide](https://supabase.com/docs/guides/database/overview)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (optional)

---

## ✅ Checklist

Before moving to code integration:

- [ ] Supabase project created
- [ ] Migration 001 applied successfully
- [ ] Migration 002 applied successfully
- [ ] All 9 tables visible in Table Editor
- [ ] RLS policies showing in Policies tab
- [ ] `.env.local` updated with credentials
- [ ] Email authentication enabled
- [ ] URL configuration set
- [ ] Test signup completed
- [ ] User visible in Authentication tab

---

## 🎉 You're Ready!

Once all migrations are applied and the checklist is complete, you're ready to integrate the database with your app!

**Next**: I'll update the app code to use the real Supabase data.

---

**Need help?** Check the Troubleshooting section or reach out!
