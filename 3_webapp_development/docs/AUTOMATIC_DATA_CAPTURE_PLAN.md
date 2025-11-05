# Automatic Data Capture Implementation Plan (Free)

## Overview
This document outlines how to implement automatic data capture from GitHub and Google Docs **without any paid services**. Both platforms offer free APIs that we can use.

## Free API Options

### 1. GitHub API (100% Free)
- **REST API**: Free, 5000 requests/hour for authenticated users
- **Webhooks**: Free, unlimited webhooks
- **GraphQL API**: Free, 5000 points/hour
- **OAuth**: Free, no cost

### 2. Google APIs (100% Free)
- **Google Docs API**: Free, 1000 requests/day per user
- **Google Drive API**: Free, 1000 requests/day per user  
- **OAuth 2.0**: Free, no cost
- **Service Accounts**: Free for personal use

## Implementation Strategy

### Phase 1: Database Schema (Free)
- Store integration credentials (encrypted)
- Track linked repositories/documents
- Store sync history and status

### Phase 2: GitHub Integration (Free)
- OAuth connection (free)
- Webhook setup (free)
- Automatic commit tracking
- Pull request tracking
- Issue tracking
- Contribution calculation

### Phase 3: Google Docs Integration (Free)
- OAuth connection (free)
- Document change tracking
- Collaborative edit tracking
- Time spent estimation

### Phase 4: Background Sync (Free)
- Use Supabase Edge Functions (free tier: 500K invocations/month)
- Or Next.js API routes with cron jobs
- Or Vercel Cron (free tier: 1 cron job)

## Data We Can Capture

### From GitHub:
1. **Commits**: Lines added/removed, files changed, commit messages
2. **Pull Requests**: Reviews, comments, merges
3. **Issues**: Created, commented, closed
4. **Code Reviews**: Review comments, approvals
5. **Time Estimation**: Based on commit timestamps

### From Google Docs:
1. **Edits**: Character additions/deletions per user
2. **Collaboration**: Who edited what sections
3. **Time Spent**: Based on edit timestamps
4. **Document Activity**: Views, comments, suggestions

## Cost Breakdown: $0 Total

- GitHub API: **$0** (free tier)
- Google APIs: **$0** (free tier)
- Supabase: **$0** (free tier covers our needs)
- Vercel/Next.js: **$0** (free tier)
- Database storage: **$0** (Supabase free tier: 500MB)

## Rate Limits (Free Tiers)

- GitHub: 5000 requests/hour (authenticated)
- Google Docs: 1000 requests/day per user
- Supabase: 500K Edge Function invocations/month

These limits are more than sufficient for student teams.
