# Supabase Setup Guide for Qolabb

This guide will help you set up Supabase for the Qolabb web application.

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in the details:
   - **Name**: Qolabb
   - **Database Password**: (choose a strong password)
   - **Region**: Choose closest to your users
5. Click "Create new project"

## Step 2: Get Your API Keys

1. Once your project is created, go to **Settings** → **API**
2. Copy the following:
   - **Project URL** (looks like: `https://xxxxxxxxxxxxx.supabase.co`)
   - **anon/public key** (long string starting with `eyJ...`)

3. Add these to your `.env.local` file:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

## Step 3: Enable Email Authentication

1. Go to **Authentication** → **Providers**
2. Make sure **Email** is enabled
3. Configure email templates (optional):
   - Go to **Authentication** → **Email Templates**
   - Customize "Confirm signup" and "Reset password" templates

## Step 4: Set Up Database Tables (Future)

When we add more features, you'll need to create these tables:

### Users Profile Table
```sql
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  avatar_url text,
  role text check (role in ('student', 'instructor', 'both')),
  institution text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table profiles enable row level security;

-- Create policies
create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );
```

### Teams Table
```sql
create table teams (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  owner_id uuid references auth.users on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table teams enable row level security;

create policy "Teams are viewable by members."
  on teams for select
  using ( auth.uid() in (
    select user_id from team_members where team_id = id
  ));

create policy "Team owners can update their teams."
  on teams for update
  using ( auth.uid() = owner_id );
```

### Team Members Table
```sql
create table team_members (
  id uuid default uuid_generate_v4() primary key,
  team_id uuid references teams on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  role text default 'member',
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(team_id, user_id)
);

alter table team_members enable row level security;

create policy "Team members are viewable by team members."
  on team_members for select
  using ( 
    auth.uid() in (
      select user_id from team_members where team_id = team_members.team_id
    )
  );
```

### Contributions Table
```sql
create table contributions (
  id uuid default uuid_generate_v4() primary key,
  team_id uuid references teams on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  description text,
  contribution_type text,
  hours_spent numeric,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table contributions enable row level security;

create policy "Contributions are viewable by team members."
  on contributions for select
  using ( 
    auth.uid() in (
      select user_id from team_members where team_id = contributions.team_id
    )
  );

create policy "Users can insert their own contributions."
  on contributions for insert
  with check ( auth.uid() = user_id );
```

## Step 5: Configure Authentication Settings (Optional)

### Email Confirmation
1. Go to **Authentication** → **Settings**
2. Enable/disable "Enable email confirmations"
3. Set up custom SMTP (optional for production)

### Password Requirements
1. Set minimum password length (default: 6)
2. Configure password complexity requirements

### Session Settings
1. Set JWT expiry time
2. Configure refresh token settings

## Step 6: Test Your Setup

1. Restart your development server:
   ```bash
   npm run dev
   ```

2. Try signing up with a test email:
   - Go to `http://localhost:3000/signup`
   - Create a test account
   - Check the **Authentication** → **Users** section in Supabase

3. Verify email confirmation:
   - Check your email inbox
   - Or check **Authentication** → **Logs** for the confirmation link

## Troubleshooting

### Common Issues

**Issue**: "Invalid API key"
- **Solution**: Make sure you copied the **anon/public** key, not the service role key
- Check that your `.env.local` file is in the root of your project

**Issue**: "User not found after signup"
- **Solution**: Check if email confirmation is required
- Look in Supabase **Authentication** → **Users** to see if user was created

**Issue**: "Cross-origin error"
- **Solution**: Add your local development URL to allowed origins:
  - Go to **Authentication** → **URL Configuration**
  - Add `http://localhost:3000` to Site URL and Redirect URLs

## Next Steps

Once authentication is working:
1. Create the database tables listed above
2. Test the complete user flow (signup → login → dashboard)
3. Set up storage buckets for file uploads (if needed)
4. Configure real-time subscriptions (optional)

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

---

**Need help?** Check the [Supabase Discord](https://discord.supabase.com/) or GitHub discussions.
