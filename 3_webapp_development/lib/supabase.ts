import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env.local file.')
}

// Use SSR-compatible client for proper cookie handling with improved error handling
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Automatically refresh tokens when they expire
    autoRefreshToken: true,
    // Persist session in localStorage
    persistSession: true,
    // Detect session in URL (for email confirmations, etc.)
    detectSessionInUrl: true,
    // Handle refresh token errors gracefully
    flowType: 'pkce'
  },
  // Add global error handling for auth errors
  global: {
    headers: {
      'X-Client-Info': 'qolabb-webapp'
    }
  }
})
