# Google Docs Integration Guide (Free Implementation)

## Overview
This guide shows how to set up Google Docs integration **completely free** using Google's free API.

## Step 1: Create Google Cloud Project (Free)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use existing)
3. **Enable APIs**:
   - Google Docs API
   - Google Drive API
   - Google OAuth 2.0 API

## Step 2: Create OAuth Credentials (Free)

1. Go to APIs & Services → Credentials
2. Click "Create Credentials" → "OAuth client ID"
3. Choose "Web application"
4. Add authorized redirect URIs:
   - `https://your-domain.com/api/auth/google/callback`
5. **Copy Client ID and Client Secret**

## Step 3: Set Environment Variables

Add to your `.env.local`:
```bash
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=https://your-domain.com/api/auth/google/callback
```

## Step 4: What We Can Track (Free)

### Document Edits
- Characters added/removed per user
- Edit timestamps
- Document sections edited
- Collaborative edits

### Comments
- Comments added
- Replies to comments
- Resolved comments

### Suggestions
- Suggested changes
- Acceptances/rejections

### Time Estimation
- Based on edit timestamps
- Calculate time between edits
- Estimate active editing time

## Rate Limits (Free)

- **Google Docs API**: 1,000 requests/day per user
- **Google Drive API**: 1,000 requests/day per user
- **OAuth**: Unlimited

For student document editing, this is sufficient.

## Implementation Approach

### Option 1: Polling (Free)
- Check document revisions every X minutes
- Compare revisions to detect changes
- Calculate contributions from changes

### Option 2: Push Notifications (Free)
- Use Google Drive API watch notifications
- Real-time updates when documents change
- More efficient than polling

## Cost: $0

Everything is free:
- Google Cloud Project: Free
- APIs: Free within limits
- OAuth: Free
- Storage: Free (Supabase free tier)

## Privacy Note

- We only request read access to documents
- Users can revoke access anytime
- We only track documents they explicitly link
