import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForToken, getGoogleUserInfo } from '@/lib/services/google/oauth';
import { cookies } from 'next/headers';
import { supabase } from '@/lib/supabase';
import { createServerClient } from '@supabase/ssr';

/**
 * GET /api/auth/google/callback
 * Handles Google OAuth callback
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    const requestUrl = new URL(request.url);
    
    // Handle OAuth errors
    if (error) {
      return NextResponse.redirect(
        new URL(`/settings?tab=integrations&error=${encodeURIComponent(error)}`, requestUrl.origin)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/settings?tab=integrations&error=no_code', requestUrl.origin)
      );
    }

    // Verify state
    const cookieStore = await cookies();
    const storedState = cookieStore.get('google_oauth_state')?.value;
    if (!storedState || storedState !== state) {
      return NextResponse.redirect(
        new URL('/settings?tab=integrations&error=invalid_state', requestUrl.origin)
      );
    }

    // Parse state
    const stateData = JSON.parse(state || storedState);
    const { workspaceId, teamId, projectId } = stateData;

    // Build redirect URI
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || requestUrl.origin;
    const redirectUri = `${baseUrl}/api/auth/google/callback`;

    // Exchange code for token
    const tokenResponse = await exchangeCodeForToken(code, redirectUri);

    // Get user info
    const userInfo = await getGoogleUserInfo(tokenResponse.access_token);

    // Get current user from Supabase (reuse existing cookieStore)
    const supabaseClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            cookieStore.set(name, value, options);
          },
          remove(name: string, options: any) {
            cookieStore.delete(name);
          },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
      return NextResponse.redirect(
        new URL('/settings?tab=integrations&error=not_authenticated', requestUrl.origin)
      );
    }

    // Calculate token expiry
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + tokenResponse.expires_in);

    // Check if integration already exists
    const { data: existingIntegration } = await supabase
      .from('external_integrations')
      .select('id')
      .eq('user_id', user.id)
      .eq('platform', 'google_docs')
      .eq('workspace_id', workspaceId || null)
      .single();

    const integrationData = {
      user_id: user.id,
      workspace_id: workspaceId || null,
      team_id: teamId || null,
      platform: 'google_docs' as const,
      access_token: tokenResponse.access_token, // TODO: Encrypt in production
      refresh_token: tokenResponse.refresh_token || null,
      token_expires_at: expiresAt.toISOString(),
      external_user_id: userInfo.id,
      external_username: userInfo.name,
      external_avatar_url: userInfo.picture || null,
      metadata: {
        email: userInfo.email,
        scope: tokenResponse.scope,
      },
      is_active: true,
      sync_status: 'active' as const,
      last_synced_at: new Date().toISOString(),
    };

    // Store integration in database (insert or update)
    let integration;
    let dbError;
    
    if (existingIntegration) {
      // Update existing
      const { data, error } = await supabase
        .from('external_integrations')
        .update(integrationData)
        .eq('id', existingIntegration.id)
        .select()
        .single();
      integration = data;
      dbError = error;
    } else {
      // Insert new
      const { data, error } = await supabase
        .from('external_integrations')
        .insert(integrationData)
        .select()
        .single();
      integration = data;
      dbError = error;
    }

    if (dbError) {
      console.error('Error saving integration:', dbError);
      return NextResponse.redirect(
        new URL('/settings?tab=integrations&error=save_failed', requestUrl.origin)
      );
    }

    // Clear state cookie
    cookieStore.delete('google_oauth_state');

    // Redirect to settings/integrations page
    const redirectUrl = new URL('/settings', requestUrl.origin);
    redirectUrl.searchParams.set('tab', 'integrations');
    redirectUrl.searchParams.set('success', 'google_connected');

    return NextResponse.redirect(redirectUrl);
  } catch (error: any) {
    console.error('Error in Google OAuth callback:', error);
    const requestUrl = new URL(request.url);
    return NextResponse.redirect(
      new URL(`/settings?tab=integrations&error=${encodeURIComponent(error.message)}`, requestUrl.origin)
    );
  }
}
