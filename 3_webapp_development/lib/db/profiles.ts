// =====================================================
// Profiles Database Functions
// Functions for user profile management
// =====================================================

import { supabase } from '../supabase'
import type { Profile } from '../types/database'

/**
 * Create a new user profile
 * @param profile - Profile data to insert
 * @returns The created profile
 */
export async function createProfile(profile: {
  id: string;
  full_name: string;
  role?: 'student' | 'instructor' | 'both';
  avatar_url?: string | null;
  institution?: string | null;
  goals?: string[] | null;
  email?: string | null;
}) {
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      ...profile,
      role: profile.role || 'student',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) throw error
  return data as Profile
}

/**
 * Get user profile by ID
 * @param userId - User ID
 * @returns User profile or null if not found
 */
export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // Profile not found
      return null
    }
    throw error
  }
  return data as Profile
}

/**
 * Get or create profile - ensures profile exists
 * @param userId - User ID
 * @param defaultData - Default profile data if creating
 * @returns User profile
 */
export async function getOrCreateProfile(
  userId: string,
  defaultData?: { full_name?: string; email?: string }
) {
  // First try to get the existing profile
  const { data: existingProfile, error: selectError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (selectError) {
    console.error('Error fetching profile:', selectError)
    throw selectError
  }

  if (existingProfile) {
    return existingProfile as Profile
  }

  // Profile doesn't exist, create one
  // Get user email from auth if not provided
  let email = defaultData?.email
  let fullName = defaultData?.full_name

  if (!email || !fullName) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      email = email || user.email || null
      fullName = fullName || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
    }
  }

  const { data: newProfile, error: insertError } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      full_name: fullName || 'User',
      email: email,
      role: 'student',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (insertError) {
    // Handle race condition - profile might have been created by trigger
    if (insertError.code === '23505') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      return profile as Profile
    }
    throw insertError
  }

  return newProfile as Profile
}

/**
 * Update user profile
 * @param userId - User ID
 * @param updates - Profile fields to update
 * @returns Updated profile
 */
export async function updateProfile(userId: string, updates: Partial<Profile>) {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single()

  if (error) throw error
  return data as Profile
}
