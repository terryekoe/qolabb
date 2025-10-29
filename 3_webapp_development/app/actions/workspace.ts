'use server'

import { joinWorkspaceByCode } from '@/lib/db/queries'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function joinWorkspaceByInviteCode(inviteCode: string) {
  try {
    // Get the current user
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return { 
        success: false, 
        error: 'You must be logged in to join a workspace.' 
      }
    }

    // Use the existing joinWorkspaceByCode function
    const result = await joinWorkspaceByCode(inviteCode, user.id)
    
    // Revalidate the workspace page to show updated data
    revalidatePath('/workspace')
    revalidatePath('/dashboard')
    
    return { 
      success: true, 
      workspace: result,
      message: `Successfully joined workspace: ${result.name}` 
    }
  } catch (error: any) {
    console.error('Error joining workspace:', error)
    
    // Handle specific error cases
    if (error.message?.includes('Invalid invite code') || error.message?.includes('Cannot find workspace')) {
      return { 
        success: false, 
        error: 'Invalid invite code. Please check and try again.' 
      }
    }
    
    if (error.message?.includes('already a member')) {
      return { 
        success: false, 
        error: 'You are already a member of this workspace.' 
      }
    }
    
    if (error.message?.includes('not authenticated')) {
      return { 
        success: false, 
        error: 'You must be logged in to join a workspace.' 
      }
    }
    
    return { 
      success: false, 
      error: 'Failed to join workspace. Please try again.' 
    }
  }
}