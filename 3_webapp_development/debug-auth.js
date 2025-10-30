// Debug Authentication Flow
// This script helps trace authentication issues

console.log('🔍 Starting Authentication Debug...');

// Check if we're in browser environment
if (typeof window !== 'undefined') {
  console.log('🌐 Browser Environment Detected');
  
  // 1. Check cookies
  console.log('🍪 All Cookies:', document.cookie);
  
  // 2. Check for Supabase auth cookies specifically
  const authCookies = document.cookie.split(';').filter(cookie => 
    cookie.includes('sb-') && cookie.includes('auth-token')
  );
  console.log('🔐 Auth Cookies Found:', authCookies);
  
  // 3. Check localStorage for any auth data
  console.log('💾 LocalStorage Keys:', Object.keys(localStorage));
  const authKeys = Object.keys(localStorage).filter(key => 
    key.includes('supabase') || key.includes('auth')
  );
  console.log('🔑 Auth-related LocalStorage:', authKeys.map(key => ({
    key,
    value: localStorage.getItem(key)?.substring(0, 100) + '...'
  })));
  
  // 4. Check sessionStorage
  console.log('📝 SessionStorage Keys:', Object.keys(sessionStorage));
  const sessionAuthKeys = Object.keys(sessionStorage).filter(key => 
    key.includes('supabase') || key.includes('auth')
  );
  console.log('🔐 Auth-related SessionStorage:', sessionAuthKeys.map(key => ({
    key,
    value: sessionStorage.getItem(key)?.substring(0, 100) + '...'
  })));
  
  // 5. Test Supabase client if available
  if (window.supabase) {
    console.log('✅ Supabase client found');
    window.supabase.auth.getSession().then(({ data, error }) => {
      console.log('🔍 Current Session:', {
        session: data.session ? {
          user: data.session.user?.email,
          expires_at: data.session.expires_at,
          access_token: data.session.access_token?.substring(0, 20) + '...'
        } : null,
        error: error?.message
      });
    });
    
    window.supabase.auth.getUser().then(({ data, error }) => {
      console.log('👤 Current User:', {
        user: data.user ? {
          id: data.user.id,
          email: data.user.email,
          created_at: data.user.created_at
        } : null,
        error: error?.message
      });
    });
  } else {
    console.log('❌ Supabase client not found on window');
  }
  
  // 6. Check for React context if available
  if (window.React) {
    console.log('⚛️ React detected');
  }
  
} else {
  console.log('🖥️ Server Environment Detected');
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    debugAuth: () => console.log('Auth debug function called')
  };
}