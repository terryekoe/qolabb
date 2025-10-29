# Storage Setup Guide for Profile Pictures

## Issue
The storage migration requires elevated permissions that aren't available through the standard database connection. This guide shows how to set up the avatars storage bucket manually through the Supabase dashboard.

## Manual Setup Steps

### 1. Access Supabase Dashboard
1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sign in to your account
3. Select your project: `inwnwvrnprrsdazruruo`

### 2. Create Storage Bucket
1. Navigate to **Storage** in the left sidebar
2. Click **Create a new bucket**
3. Configure the bucket:
   - **Name**: `avatars`
   - **Public bucket**: ✅ **Enabled** (so images can be publicly accessed)
   - **File size limit**: `2097152` (2MB)
   - **Allowed MIME types**: 
     - `image/jpeg`
     - `image/jpg` 
     - `image/png`
     - `image/gif`

### 3. Set Up Storage Policies
After creating the bucket, you need to set up Row Level Security (RLS) policies:

1. Go to **Storage** → **Policies**
2. Create the following policies for the `avatars` bucket:

#### Policy 1: Public Read Access
- **Policy name**: `Public Avatar Access`
- **Allowed operation**: `SELECT`
- **Target roles**: `public`
- **USING expression**: `bucket_id = 'avatars'`

#### Policy 2: Authenticated Upload
- **Policy name**: `Users can upload own avatar`
- **Allowed operation**: `INSERT`
- **Target roles**: `authenticated`
- **WITH CHECK expression**: `bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]`

#### Policy 3: Authenticated Update
- **Policy name**: `Users can update own avatar`
- **Allowed operation**: `UPDATE`
- **Target roles**: `authenticated`
- **USING expression**: `bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]`

#### Policy 4: Authenticated Delete
- **Policy name**: `Users can delete own avatar`
- **Allowed operation**: `DELETE`
- **Target roles**: `authenticated`
- **USING expression**: `bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]`

## Verification

After setup, you can verify the storage is working by:

1. Going to the settings page in your application
2. Trying to upload a profile picture
3. Checking that the image appears correctly
4. Verifying the image URL in the browser

## File Structure

The storage will organize files as:
```
avatars/
├── {user-id-1}-{timestamp}.jpg
├── {user-id-2}-{timestamp}.png
└── ...
```

This ensures each user can only access their own avatar files while allowing public read access for displaying images.

## Troubleshooting

If you encounter issues:

1. **Upload fails**: Check that the bucket is public and policies are correctly set
2. **Images don't display**: Verify the public access policy is enabled
3. **Permission denied**: Ensure the user is authenticated and the file path includes their user ID

## Alternative: Temporary Workaround

If you can't access the Supabase dashboard immediately, the application will gracefully handle storage errors and show appropriate error messages to users. The profile picture functionality will work once the storage is properly configured.