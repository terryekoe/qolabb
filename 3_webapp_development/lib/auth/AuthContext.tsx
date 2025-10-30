'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
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
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
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
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadProfile(userId: string) {
    try {
      setLoading(true);
      
      // Get user data from auth for fallback
      const { data: { user } } = await supabase.auth.getUser();
      
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
  }

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

      // Create profile in database
      try {
        await createProfile({
          id: data.user.id,
          full_name: fullName.trim(),
          role: 'student',
        });
        console.log('Profile created successfully for:', data.user.id);
      } catch (profileError: any) {
        console.error('Profile creation error:', profileError);
        // If profile creation fails, we should clean up the auth user
        // But Supabase doesn't allow this from client side
        // The profile will be created on first login via getOrCreateProfile
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

  // Utility function to clear expired auth cookies
  function clearExpiredAuthCookies() {
    if (typeof document !== 'undefined') {
      // Get all cookies
      const cookies = document.cookie.split(';');
      
      // Find and clear Supabase auth token cookies
      cookies.forEach(cookie => {
        const [name] = cookie.trim().split('=');
        if (name.includes('sb-') && name.includes('auth-token') && !name.includes('code-verifier')) {
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
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
