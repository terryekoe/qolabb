# Task Attachments Debug Guide

## Issue: "Add link is not reflecting at all"

### Step 1: Check if Migration Has Been Run

The `external_url` column must exist in the database. Run this in your Supabase SQL Editor:

```sql
-- Check if external_url column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'task_attachments'
AND column_name = 'external_url';
```

**If the query returns no results**, you need to run the migration:
- Run `033_add_external_url_to_attachments.sql` in Supabase Dashboard → SQL Editor

### Step 2: Verify Database Schema

After running the migration, verify it worked:

```sql
-- Check table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'task_attachments'
ORDER BY ordinal_position;
```

You should see:
- `external_url` (TEXT, nullable)
- `file_path` (TEXT, nullable) 
- `file_name` (TEXT, nullable)
- `file_size` (BIGINT, nullable)

### Step 3: Check Browser Console

Open browser DevTools (F12) and check the Console tab:
1. Click the "Link" button in the attachments section
2. Look for console.log messages:
   - Should see: "Link button clicked, setting addMode to link"
3. Try adding a link and check for errors

### Step 4: Test the Link Form

1. **Verify Link Form Appears:**
   - Click "Link" button in the toggle
   - You should see a blue-bordered form with:
     - "Add a link to external file" heading
     - URL input field
     - Display Name input field
     - "Add Link" button

2. **Test Adding a Link:**
   - Enter a test URL: `https://drive.google.com/file/d/test123/view`
   - Enter a display name: `Test File`
   - Click "Add Link"
   - Check browser console for errors
   - Check Network tab for failed requests

### Step 5: Common Issues & Fixes

#### Issue: Link form doesn't appear when clicking "Link" button
**Possible Causes:**
- Component not re-rendering (check React DevTools)
- CSS hiding the form (check computed styles)
- `canManage` is false (check permissions)

**Fix:**
- Check browser console for errors
- Verify `canManage` prop is `true` in TaskDetailModal
- Inspect element to see if form is in DOM but hidden

#### Issue: Link saves but doesn't appear in list
**Possible Causes:**
- Migration not run (no `external_url` column)
- Query not selecting `external_url`
- Real-time subscription not working

**Fix:**
- Run migration: `033_add_external_url_to_attachments.sql`
- Check `getTaskAttachments` query includes `external_url`
- Verify real-time subscription is active

#### Issue: Error when adding link
**Check Error Message:**
- "column 'external_url' does not exist" → Run migration
- "Invalid URL format" → Check URL starts with http:// or https://
- "Failed to add link" → Check browser console for details

### Step 6: Manual Database Test

Test the database directly:

```sql
-- Test inserting a link attachment
INSERT INTO task_attachments (
  task_id,
  user_id,
  external_url,
  file_name
)
VALUES (
  'YOUR_TASK_ID_HERE',
  'YOUR_USER_ID_HERE',
  'https://drive.google.com/file/d/test123/view',
  'Test Link'
);

-- Verify it was created
SELECT * FROM task_attachments WHERE external_url IS NOT NULL;
```

### Step 7: Verify Query Function

Check that `getTaskAttachments` is selecting `external_url`:

The query should include `external_url` in the SELECT:
```typescript
.select(`
  *,
  user:profiles!user_id(id, full_name, avatar_url)
`)
```

The `*` should select all columns including `external_url`.

## Quick Checklist

- [ ] Migration `033_add_external_url_to_attachments.sql` has been run
- [ ] `external_url` column exists in `task_attachments` table
- [ ] `canManage` prop is `true` in TaskDetailModal
- [ ] Link form appears when clicking "Link" button
- [ ] No console errors when clicking "Link" button
- [ ] URL validation passes (starts with http:// or https://)
- [ ] No database errors when saving link
- [ ] Link appears in attachments list after saving

## Testing Steps

1. Open a task detail modal
2. Scroll to "Attachments" section
3. Click "Link" button (should highlight in white)
4. Verify link form appears (blue border, URL input visible)
5. Enter test URL: `https://example.com/test.pdf`
6. Enter display name: `Test File`
7. Click "Add Link"
8. Verify:
   - Loading spinner appears
   - Form clears
   - Link appears in attachments list
   - Link has blue "Link" badge
   - Link shows external URL below name

## Still Not Working?

If the issue persists:

1. **Check React DevTools:**
   - Inspect `TaskAttachments` component
   - Verify `addMode` state changes to `'link'` when button clicked
   - Check if `canManage` is true

2. **Check Network Tab:**
   - Look for POST request to Supabase
   - Check response for errors
   - Verify request includes `external_url` in body

3. **Check Database:**
   - Verify migration ran successfully
   - Check for constraint violations
   - Verify RLS policies allow inserts

4. **Share Debug Info:**
   - Browser console errors
   - Network request/response
   - Database schema verification
   - Component state from React DevTools
