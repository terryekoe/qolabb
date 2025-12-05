import { NextRequest, NextResponse } from 'next/server';
import { getGoogleAuthUrl } from '@/lib/services/google/oauth';
import { cookies } from 'next/headers';

/**
 * GET /api/auth/google
 * Initiates Google OAuth flow
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const workspaceId = searchParams.get('workspace_id');
    const teamId = searchParams.get('team_id');
    const projectId = searchParams.get('project_id');

    // Build redirect URI
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const redirectUri = `${baseUrl}/api/auth/google/callback`;

    // Create state to track context
    const state = JSON.stringify({
      workspaceId,
      teamId,
      projectId,
      timestamp: Date.now(),
    });

    // Store state in cookie for verification
    const cookieStore = await cookies();
    cookieStore.set('google_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
    });

    // Generate authorization URL
    const authUrl = getGoogleAuthUrl(redirectUri, state);

    // Redirect to Google
    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error('Error initiating Google OAuth:', error);
    return NextResponse.json({ error: 'Failed to initiate Google OAuth' }, { status: 500 });
  }
}
