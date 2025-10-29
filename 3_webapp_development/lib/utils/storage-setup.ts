import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY! // This would need to be added to env

/**
 * Sets up the avatars storage bucket with proper policies
 * This should be run once during application setup
 */
export async function setupAvatarsStorage() {
  // For now, we'll assume the bucket exists or is created manually
  // In a production environment, you would use the service role key
  // to create buckets and policies programmatically
  
  console.log('Storage setup would be handled by Supabase admin or migrations')
  return true
}

/**
 * Validates if the avatars bucket exists and is accessible
 */
export async function validateStorageSetup(supabase: any) {
  try {
    // Try to list files in the avatars bucket to check if it exists
    const { data, error } = await supabase.storage
      .from('avatars')
      .list('', { limit: 1 })
    
    if (error) {
      console.warn('Avatars storage bucket may not be set up:', error.message)
      return false
    }
    
    return true
  } catch (error) {
    console.warn('Error validating storage setup:', error)
    return false
  }
}