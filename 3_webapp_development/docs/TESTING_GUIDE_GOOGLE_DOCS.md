# Google Docs Integration - Testing Guide

## Prerequisites

1. ✅ Google OAuth credentials set up in Google Cloud Console
2. ✅ Environment variables configured
3. ✅ Database migration applied
4. ✅ Build passes

## Step-by-Step Testing

### Step 1: Verify Environment Variables

Check that your `.env.local` has:
```bash
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 2: Run Migration

```bash
# If using Supabase CLI
supabase migration up

# Or apply directly in Supabase dashboard
# Go to SQL Editor and run: 049_add_external_integrations.sql
```

### Step 3: Start Development Server

```bash
npm run dev
```

### Step 4: Test OAuth Connection

1. **Navigate to a project**:
   - Go to `/projects`
   - Click on any project to open details

2. **Open Integrations tab**:
   - Click the "Integrations" tab in the project modal
   - You should see "Connect Google Docs" section

3. **Connect Google Account**:
   - Click "Connect Google Account" button
   - You'll be redirected to Google OAuth
   - Sign in with your Google account
   - Grant permissions (read access to Docs)
   - You'll be redirected back

4. **Verify Connection**:
   - Should see "Connected as [Your Name]" green banner
   - Should see list of your Google Docs

### Step 5: Link a Document

1. **Select a document**:
   - Scroll through available documents
   - Click on a document to link it
   - Should see success message

2. **Verify Link**:
   - Document should appear in "Linked Documents" section
   - Shows "Last synced: Never" initially

### Step 6: Test Document Sync

1. **Make edits to linked document**:
   - Open the Google Doc in another tab
   - Make some edits (add text, delete text)
   - Save the document

2. **Trigger sync** (manual for now):
   - You can create a test button or API call
   - Or wait for automatic sync (if implemented)

3. **Check contributions**:
   - Go to `/contributions` page
   - Should see automated contributions created
   - Check contribution details:
     - Title: "Edited [Document Name]"
     - Type: "documentation"
     - Characters added/removed
     - Estimated hours

### Step 7: Test Error Handling

1. **Invalid redirect URI**:
   - Try with wrong redirect URI in env
   - Should show error

2. **Expired token**:
   - Wait for token to expire (or manually expire)
   - Try to sync
   - Should automatically refresh token

3. **Disconnect**:
   - Click "Disconnect" button
   - Should remove integration
   - Documents should be unlinked

## Testing Checklist

- [ ] Environment variables set correctly
- [ ] Migration applied successfully
- [ ] Build passes without errors
- [ ] OAuth flow works (redirects to Google)
- [ ] OAuth callback works (saves tokens)
- [ ] Connection status shows correctly
- [ ] Documents list loads
- [ ] Document linking works
- [ ] Linked documents display correctly
- [ ] Document sync works (manual test)
- [ ] Contributions created automatically
- [ ] Token refresh works
- [ ] Disconnect works

## Common Issues

### "redirect_uri_mismatch"
- Check that redirect URI in `.env.local` matches Google Cloud Console
- Check for trailing slashes
- Check http vs https

### "invalid_client"
- Verify Client ID and Secret are correct
- Check for extra spaces or quotes

### "No documents found"
- Make sure you have Google Docs in your account
- Check that scopes are correct
- Verify token is valid

### "Token expired"
- Token should auto-refresh
- If not, check refresh_token is stored
- Reconnect if needed

## Manual Sync Test

To test sync manually, create a test API route:

```typescript
// app/api/test-sync/route.ts
import { syncProjectDocuments } from '@/lib/services/google/sync';

export async function POST(request: Request) {
  const { projectId } = await request.json();
  const result = await syncProjectDocuments(projectId);
  return Response.json(result);
}
```

Then call it:
```bash
curl -X POST http://localhost:3000/api/test-sync \
  -H "Content-Type: application/json" \
  -d '{"projectId": "your-project-id"}'
```

## Next Steps After Testing

1. Add automatic periodic syncing
2. Add sync button to UI
3. Add sync status indicator
4. Add contribution merging UI
5. Add sync history view
