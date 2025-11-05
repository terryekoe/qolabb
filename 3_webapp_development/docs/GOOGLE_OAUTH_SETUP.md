# Google OAuth Setup Guide - Step by Step

## Prerequisites
- A Google account (Gmail account works)
- Access to Google Cloud Console

## Step 1: Go to Google Cloud Console

1. Open your browser and go to: https://console.cloud.google.com/
2. Sign in with your Google account

## Step 2: Create a New Project (or Use Existing)

1. Click on the **project dropdown** at the top (next to "Google Cloud")
2. Click **"New Project"**
3. Enter project details:
   - **Project name**: "QOLabb Participation Tracker" (or any name you like)
   - **Organization**: Leave as default (or select if you have one)
4. Click **"Create"**
5. Wait a few seconds for the project to be created
6. **Select your new project** from the dropdown at the top

## Step 3: Enable Required APIs

1. In the left sidebar, click **"APIs & Services"** → **"Library"**
2. Search for **"Google Docs API"** and click on it
   - Click **"Enable"** button
3. Go back to Library (or search again)
4. Search for **"Google Drive API"** and click on it
   - Click **"Enable"** button
5. Go back to Library
6. Search for **"Google+ API"** (may be needed for user info)
   - Click **"Enable"** button

> **Note**: Enabling APIs is free and doesn't cost anything!

## Step 4: Create OAuth Consent Screen

1. In the left sidebar, click **"APIs & Services"** → **"OAuth consent screen"**
2. Choose **"External"** (unless you have a Google Workspace account)
   - Click **"Create"**
3. Fill in the required information:

   **App Information:**
   - **App name**: "QOLabb Participation Tracker"
   - **User support email**: Your email address
   - **App logo**: (Optional - can skip)
   - **App domain**: (Optional - can skip)
   - **Application home page**: Your website URL (e.g., `https://your-app.vercel.app`)
   - **Application privacy policy link**: (Optional for now)
   - **Application terms of service link**: (Optional for now)
   - **Authorized domains**: (Optional - can skip)
   - **Developer contact information**: Your email address

4. Click **"Save and Continue"**

5. **Scopes** (Step 2):
   - Click **"Add or Remove Scopes"**
   - Select these scopes:
     - `https://www.googleapis.com/auth/documents.readonly` (Read Google Docs)
     - `https://www.googleapis.com/auth/drive.readonly` (Read Google Drive files)
     - `https://www.googleapis.com/auth/userinfo.email` (See your email)
     - `https://www.googleapis.com/auth/userinfo.profile` (See your profile)
   - Click **"Update"**
   - Click **"Save and Continue"**

6. **Test users** (Step 3):
   - Click **"Add Users"**
   - Add your email address (and any test users)
   - Click **"Add"**
   - Click **"Save and Continue"**

7. **Summary** (Step 4):
   - Review the information
   - Click **"Back to Dashboard"**

## Step 5: Create OAuth Credentials

1. In the left sidebar, click **"APIs & Services"** → **"Credentials"**
2. Click **"+ CREATE CREDENTIALS"** at the top
3. Select **"OAuth client ID"**

4. **Application type**: Select **"Web application"**

5. Fill in the details:
   - **Name**: "QOLabb Web Client" (or any name)
   - **Authorized JavaScript origins**: 
     - For development: `http://localhost:3000`
     - For production: `https://your-domain.com`
     - Click **"+ ADD URI"** for each one
   - **Authorized redirect URIs**:
     - For development: `http://localhost:3000/api/auth/google/callback`
     - For production: `https://your-domain.com/api/auth/google/callback`
     - Click **"+ ADD URI"** for each one

6. Click **"Create"**

7. **IMPORTANT**: A popup will appear with your credentials:
   - **Client ID**: Copy this (looks like: `123456789-abc...xyz.apps.googleusercontent.com`)
   - **Client secret**: Copy this (looks like: `GOCSPX-abc...xyz`)
   - **⚠️ SAVE THESE SECURELY** - You won't be able to see the secret again!

## Step 6: Add Credentials to Your App

1. Open your `.env.local` file in your project
2. Add these lines:

```bash
# Google OAuth Credentials
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

3. Replace `your_client_id_here` and `your_client_secret_here` with the actual values
4. Save the file

## Step 7: Test the Setup

You can test if everything is working by:

1. Starting your development server: `npm run dev`
2. Creating a test page that initiates OAuth flow
3. You should be redirected to Google's consent screen
4. After accepting, you'll be redirected back to your callback URL

## Troubleshooting

### "redirect_uri_mismatch" Error
- Make sure the redirect URI in your `.env.local` exactly matches what you entered in Google Cloud Console
- Check for typos, http vs https, trailing slashes

### "Access blocked" Error
- Make sure you added your email as a test user in Step 4
- If app is in "Testing" mode, only test users can access it

### Can't see "Create Credentials" button
- Make sure you've selected your project in the dropdown at the top
- Make sure OAuth consent screen is configured first

### APIs not showing up
- Make sure you've enabled them in Step 3
- It may take a few minutes for APIs to fully activate

## Production Setup

When you're ready for production:

1. Go back to **OAuth consent screen**
2. Click **"PUBLISH APP"** (if it's still in testing mode)
   - Note: This may require verification for sensitive scopes
3. Update your redirect URIs in credentials to use your production domain
4. Update `.env.local` (or production environment variables) with production redirect URI

## Security Notes

- **Never commit** `.env.local` to git (it should be in `.gitignore`)
- The Client Secret should be kept secure
- In production, use environment variables provided by your hosting platform (Vercel, etc.)

## That's It! 🎉

You now have Google OAuth set up. The credentials are free and the APIs are free within their usage limits (which are more than enough for student teams).

Next steps:
1. Implement the OAuth flow in your app
2. Store tokens securely in the database
3. Use the tokens to access Google Docs API
