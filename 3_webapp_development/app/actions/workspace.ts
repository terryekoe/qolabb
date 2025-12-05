'use server';

import { createClient } from '@/lib/supabase/server';
import { joinWorkspaceByCode, createWorkspace } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function joinWorkspaceByInviteCode(inviteCode: string) {
  try {
    console.log('🔍 Starting joinWorkspaceByInviteCode with code:', inviteCode);

    const supabase = await createClient();

    console.log('✅ Created Supabase client');

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    console.log('🔐 Auth check result:', {
      user: user ? { id: user.id, email: user.email } : null,
      authError: authError?.message,
    });

    if (authError || !user) {
      console.error('❌ Authentication failed:', authError?.message || 'No user found');
      throw new Error('You must be logged in to join a workspace');
    }

    console.log('👤 User authenticated, calling joinWorkspaceByCode...');

    // Join the workspace
    const result = await joinWorkspaceByCode(inviteCode, user.id);
    console.log('✅ Successfully joined workspace:', {
      workspaceId: result.id,
      workspaceName: result.name,
    });

    revalidatePath('/workspace');
    revalidatePath('/dashboard');

    return {
      success: true,
      workspaceId: result.id,
      workspaceName: result.name,
    };
  } catch (error) {
    console.error('❌ Error joining workspace:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to join workspace',
    };
  }
}

export async function createTestWorkspace() {
  try {
    console.log('🔍 Starting createTestWorkspace');

    // Debug: Check what cookies are available
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    console.log(
      '🍪 Available cookies:',
      allCookies.map((c) => ({ name: c.name, hasValue: !!c.value }))
    );

    const supabase = await createClient();

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    console.log('🔐 Auth check result:', {
      user: user ? { id: user.id, email: user.email } : null,
      authError: authError?.message,
    });

    if (authError || !user) {
      console.error('❌ Authentication failed:', authError?.message || 'No user found');
      throw new Error('You must be logged in to create a workspace');
    }

    // Create test workspace
    const result = await createWorkspace(
      {
        name: 'Test Workspace',
        description: 'A test workspace for debugging invite codes',
        owner_id: user.id,
        icon_url: null,
        settings: {},
      },
      user.id
    );

    console.log('✅ Successfully created test workspace:', {
      workspaceId: result.id,
      workspaceName: result.name,
      inviteCode: result.invite_code,
    });

    revalidatePath('/workspace');
    revalidatePath('/dashboard');

    return {
      success: true,
      workspaceId: result.id,
      workspaceName: result.name,
      inviteCode: result.invite_code,
    };
  } catch (error) {
    console.error('❌ Error creating test workspace:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create workspace',
    };
  }
}
