# GitHub Integration Guide (Free Implementation)

## Overview
This guide shows how to set up GitHub integration **completely free** using GitHub's free API and OAuth.

## Step 1: Create GitHub OAuth App (Free)

1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Click "New OAuth App"
3. Fill in:
   - **Application name**: "QOLabb Participation Tracker"
   - **Homepage URL**: Your app URL
   - **Authorization callback URL**: `https://your-domain.com/api/auth/github/callback`
4. Click "Register application"
5. **Copy Client ID and Client Secret** (you'll need these)

## Step 2: Set Environment Variables

Add to your `.env.local`:
```bash
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
GITHUB_WEBHOOK_SECRET=generate_random_string_here
```

## Step 3: Implementation Files Needed

### 3.1 OAuth Flow
- `app/api/auth/github/route.ts` - Initiate OAuth
- `app/api/auth/github/callback/route.ts` - Handle callback

### 3.2 API Integration
- `lib/services/github/integration.ts` - GitHub API client
- `lib/services/github/sync.ts` - Sync logic
- `lib/services/github/webhooks.ts` - Webhook handler

### 3.3 UI Components
- `components/integrations/GitHubConnect.tsx` - Connect button
- `components/integrations/GitHubReposList.tsx` - Repository list
- `components/integrations/GitHubSyncStatus.tsx` - Sync status

## Step 4: What We Can Track (Free)

### Commits
- Lines added/removed
- Files changed
- Commit messages
- Timestamps
- Author info

### Pull Requests
- PR creation
- Reviews
- Comments
- Merges
- Time to merge

### Issues
- Issue creation
- Comments
- Closures
- Labels

### Code Reviews
- Review comments
- Approvals
- Requested changes

## Rate Limits (Free)

- **Authenticated requests**: 5,000/hour
- **Webhooks**: Unlimited (free!)
- **GraphQL**: 5,000 points/hour

For student teams, this is more than enough.

## Webhook Setup (Free)

1. Go to repository Settings → Webhooks
2. Add webhook:
   - **Payload URL**: `https://your-domain.com/api/webhooks/github`
   - **Content type**: `application/json`
   - **Events**: Select "Individual events" → commits, pull requests, issues
   - **Secret**: Use `GITHUB_WEBHOOK_SECRET`
3. Save webhook

Webhooks are **free** and provide real-time updates!

## Cost: $0

Everything is free:
- OAuth: Free
- API access: Free
- Webhooks: Free
- Storage: Free (Supabase free tier)
