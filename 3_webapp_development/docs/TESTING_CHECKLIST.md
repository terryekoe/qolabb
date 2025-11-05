# Google Docs Integration - Quick Testing Checklist

## ✅ Pre-Testing Setup

### 1. Environment Variables
Check `.env.local` has:
```bash
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. Run Migration
```bash
# Apply migration to create tables
supabase migration up
# Or run the SQL file in Supabase dashboard SQL Editor
```

### 3. Start Dev Server
```bash
npm run dev
```

## 🧪 Testing Steps

### Test 1: OAuth Connection
1. ✅ Go to `/projects`
2. ✅ Click on any project
3. ✅ Click "Integrations" tab
4. ✅ Click "Connect Google Account"
5. ✅ Should redirect to Google
6. ✅ Sign in and grant permissions
7. ✅ Should redirect back with "Connected" message

**Expected Result**: Green "Connected as [Your Name]" banner

### Test 2: Document Listing
1. ✅ After connecting, should see list of your Google Docs
2. ✅ Documents should show name and last modified date

**Expected Result**: List of your Google Docs appears

### Test 3: Link Document
1. ✅ Click on a document to link it
2. ✅ Should see success message
3. ✅ Document appears in "Linked Documents" section

**Expected Result**: Document linked and displayed

### Test 4: Document Sync (Manual)
1. ✅ Open the linked Google Doc in another tab
2. ✅ Make some edits (add/remove text)
3. ✅ Save the document
4. ✅ Create a test API call to sync (see below)

**Expected Result**: Contributions created automatically

## 🔧 Manual Sync Test

Create a test API route:

```typescript
// app/api/test-sync/route.ts
import { syncProjectDocuments } from '@/lib/services/google/sync';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { projectId } = await request.json();
    if (!projectId) {
      return NextResponse.json({ error: 'projectId required' }, { status: 400 });
    }
    
    const result = await syncProjectDocuments(projectId);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

Then test with:
```bash
curl -X POST http://localhost:3000/api/test-sync \
  -H "Content-Type: application/json" \
  -d '{"projectId": "your-project-id"}'
```

Or use the browser console:
```javascript
fetch('/api/test-sync', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ projectId: 'your-project-id' })
}).then(r => r.json()).then(console.log)
```

## 📊 Verify Results

1. **Check Database**:
   - Go to Supabase dashboard
   - Check `external_integrations` table - should have your connection
   - Check `linked_documents` table - should have linked docs
   - Check `automated_contributions` table - should have contributions after sync

2. **Check UI**:
   - Go to `/contributions` page
   - Should see automated contributions
   - Check contribution details

## 🐛 Troubleshooting

### "redirect_uri_mismatch"
- ✅ Check redirect URI matches exactly in Google Cloud Console
- ✅ Check for http vs https
- ✅ Check for trailing slashes

### "No documents found"
- ✅ Make sure you have Google Docs in your account
- ✅ Check scopes are correct
- ✅ Verify token is valid

### "Connection not saving"
- ✅ Check database migration ran
- ✅ Check RLS policies allow insert
- ✅ Check browser console for errors

## ✅ Success Criteria

- [ ] OAuth flow completes successfully
- [ ] Integration saved to database
- [ ] Documents list loads
- [ ] Document can be linked
- [ ] Sync creates contributions
- [ ] Contributions appear in UI
