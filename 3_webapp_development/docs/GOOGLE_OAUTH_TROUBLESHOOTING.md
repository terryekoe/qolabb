# Google OAuth Troubleshooting Guide

## Error: "Access blocked: qolabb has not completed the Google verification process"

This error occurs because your Google OAuth app is in **Testing** mode. Google restricts access to only approved test users when an app is not published.

### Solution: Add Test Users

You need to add your email address (and any other users who need access) as test users in Google Cloud Console.

#### Step-by-Step Instructions:

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Select your project (the one where you created the OAuth credentials)

2. **Navigate to OAuth Consent Screen**
   - In the left sidebar, go to **APIs & Services** → **OAuth consent screen**
   - Or visit: https://console.cloud.google.com/apis/credentials/consent

3. **Add Test Users**
   - Scroll down to the **"Test users"** section
   - Click **"+ ADD USERS"** button
   - Enter the email address: `terryaziaba83@gmail.com`
   - Click **"ADD"**
   - You can add multiple test users (one per line or separate additions)

4. **Save Changes**
   - Make sure to save any changes

5. **Try Again**
   - Go back to your app and try connecting Google again
   - The error should be resolved

### Alternative: Publish the App (Not Recommended for Development)

If you want to make the app available to everyone without adding test users, you can publish it, but this requires:
- Google verification process (can take weeks)
- Privacy policy URL
- Terms of service URL
- App verification for sensitive scopes

**For development/testing, adding test users is the recommended approach.**

### Quick Checklist

- [ ] Google Cloud Console project selected
- [ ] OAuth consent screen configured
- [ ] Test users section found
- [ ] Your email added as test user
- [ ] Changes saved
- [ ] Tried connecting again

### Common Issues

**Issue:** "I added myself but still getting the error"
- **Solution:** Wait a few minutes for changes to propagate, then try again
- Make sure you're using the exact email address that's added

**Issue:** "I want to add multiple users"
- **Solution:** You can add up to 100 test users in testing mode
- Each user needs to be added individually or via the bulk add feature

**Issue:** "The app is for internal use only"
- **Solution:** If this is for a Google Workspace organization, you can set the app to "Internal" which allows all users in your organization without verification

### Need Help?

If you continue to have issues:
1. Check that your OAuth credentials (Client ID) match in both Google Cloud Console and your `.env.local` file
2. Verify the redirect URI is correctly configured
3. Make sure you're signed in to Google with the email you added as a test user
