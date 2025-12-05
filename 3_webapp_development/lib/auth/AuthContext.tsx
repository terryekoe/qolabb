'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import { Profile } from '../types/database';
import { getOrCreateProfile, createProfile } from '../db/queries';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * AuthProvider component that wraps the app and provides authentication state.
 * Manages user session, profile loading, and auth actions (sign in, sign up, etc.).
 *
 * @param children - Child components to wrap
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session with error handling
    supabase.auth
      .getSession()
      .then(({ data: { session }, error }) => {
        if (error) {
          console.warn('⚠️ Session error:', error.message);
          // If there's a session error, clear any stale data
          if (
            error.message.includes('refresh_token_not_found') ||
            error.message.includes('Invalid Refresh Token')
          ) {
            console.log('🧹 Clearing stale session data');
            clearExpiredAuthCookies();
            setSession(null);
            setUser(null);
            setProfile(null);
            setLoading(false);
            return;
          }
        }

        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          loadProfile(session.user.id);
        } else {
          setLoading(false);
        }
      })
      .catch((error) => {
        console.error('❌ Failed to get session:', error);
        clearExpiredAuthCookies();
        setLoading(false);
      });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state change:', event, session?.user?.id);

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);

        // Clear expired cookies when user is signed out or session is invalid
        if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
          clearExpiredAuthCookies();
        }
      }

      // Handle specific auth events
      if (event === 'TOKEN_REFRESHED') {
        console.log('✅ Token refreshed successfully');
      } else if (event === 'SIGNED_OUT') {
        console.log('👋 User signed out');
        clearExpiredAuthCookies();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = useCallback(async (userId: string) => {
    try {
      setLoading(true);

      // Get user data from auth for fallback
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Get or create profile
      const profileData = await getOrCreateProfile(userId, {
        full_name: user?.user_metadata?.full_name,
        email: user?.email,
      });

      setProfile(profileData);
    } catch (error: any) {
      console.error('Failed to load profile:', error?.message || error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  async function signUp(email: string, password: string, fullName: string) {
    try {
      // Validate inputs
      if (!email || !password || !fullName) {
        throw new Error('All fields are required');
      }

      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      if (fullName.trim().length < 2) {
        throw new Error('Please enter your full name');
      }

      // Create auth user
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
        },
      });

      if (error) {
        console.error('Signup error:', error);
        throw new Error(error.message || 'Failed to create account');
      }

      if (!data.user) {
        throw new Error('Failed to create user account');
      }

      // Create or get profile in database
      try {
        await getOrCreateProfile(data.user.id, {
          full_name: fullName.trim(),
          email: data.user.email,
        });
        console.log('Profile created/retrieved successfully for:', data.user.id);
      } catch (profileError: any) {
        console.error('Profile creation error:', profileError);
        // If profile creation fails, the profile will be created on first login via getOrCreateProfile
        console.warn('Profile will be created on first login');
      }
    } catch (error: any) {
      console.error('signUp error:', error);
      throw error;
    }
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setProfile(null);

    // Clear any expired auth cookies
    clearExpiredAuthCookies();
  }

  async function resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  }

  async function updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) throw error;
  }

  // Utility function to clear expired auth cookies
  function clearExpiredAuthCookies() {
    if (typeof document !== 'undefined') {
      // Get all cookies
      const cookies = document.cookie.split(';');

      // Find and clear Supabase auth token cookies
      cookies.forEach((cookie) => {
        const [name] = cookie.trim().split('=');
        if (
          name.includes('sb-') &&
          name.includes('auth-token') &&
          !name.includes('code-verifier')
        ) {
          console.log('🧹 Clearing expired auth cookie:', name);
          // Set cookie to expire in the past
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname}`;
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        }
      });
    }
  }

  async function refreshProfile() {
    if (user) {
      await loadProfile(user.id);
    }
  }

  const value = {
    user,
    profile,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access the authentication context.
 * @returns AuthContextType containing user, profile, and auth methods
 * @throws Error if used outside of AuthProvider
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
