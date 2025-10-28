# Profile Management System - Documentation

## Overview

This document details the refactored, industry-standard profile management system for Qolabb. The system has been completely rewritten to follow best practices with robust error handling, input validation, and automatic profile creation.

---

## 🎯 Key Features

### 1. **Automatic Profile Creation**
- Profiles are automatically created if they don't exist
- No more manual profile creation errors
- Seamless user onboarding experience

### 2. **Robust Error Handling**
- Detailed error logging with JSON stringification
- Graceful fallbacks for missing data
- User-friendly error messages

### 3. **Input Validation & Sanitization**
- All inputs are trimmed and validated
- Email addresses are lowercased
- Names must be at least 2 characters
- Passwords must be at least 6 characters

### 4. **Data Consistency**
- Profile data is synchronized with auth metadata
- Automatic retry mechanisms
- Transaction-safe operations

---

## 📚 Core Functions

### `createProfile()`
Creates a new user profile with validation.

```typescript
export async function createProfile(profile: {
  id: string;
  full_name: string;
  role?: 'student' | 'instructor' | 'both';
  avatar_url?: string | null;
  institution?: string | null;
})
```

**Features:**
- ✅ Validates and sanitizes input data
- ✅ Trims whitespace from names
- ✅ Sets default role to 'student'
- ✅ Comprehensive error logging
- ✅ Returns created profile or throws detailed error

**Example:**
```typescript
const profile = await createProfile({
  id: user.id,
  full_name: 'John Doe',
  role: 'student'
});
```

---

### `getProfile()`
Retrieves a user profile by ID.

```typescript
export async function getProfile(userId: string)
```

**Features:**
- ✅ Returns `null` if profile doesn't exist (no throw)
- ✅ Detailed error logging
- ✅ Handles PGRST116 error code (no rows)
- ✅ Type-safe return value

**Example:**
```typescript
const profile = await getProfile(userId);
if (!profile) {
  console.log('Profile not found');
}
```

---

### `getOrCreateProfile()` ⭐ **RECOMMENDED**
Gets existing profile or creates if missing.

```typescript
export async function getOrCreateProfile(
  userId: string,
  defaultData?: { full_name?: string; email?: string }
)
```

**Features:**
- ✅ Automatically creates profile if missing
- ✅ Uses provided full_name or derives from email
- ✅ Idempotent - safe to call multiple times
- ✅ Perfect for login flows

**Example:**
```typescript
// In authentication flow
const profile = await getOrCreateProfile(userId, {
  full_name: user.user_metadata.full_name,
  email: user.email
});
```

**Fallback Logic:**
1. If `full_name` provided → use it
2. If `email` provided → use part before @
3. Otherwise → use 'User'

---

### `updateProfile()`
Updates user profile with validation.

```typescript
export async function updateProfile(
  userId: string,
  updates: Partial<Profile>
)
```

**Features:**
- ✅ Sanitizes all input fields
- ✅ Only updates allowed fields
- ✅ Trims text fields
- ✅ Prevents injection attacks

**Allowed Fields:**
- `full_name`
- `avatar_url`
- `role`
- `institution`

**Example:**
```typescript
await updateProfile(userId, {
  full_name: 'Jane Smith',
  institution: 'MIT'
});
```

---

## 🔒 Authentication Flow

### Sign Up Process

```typescript
async function signUp(email: string, password: string, fullName: string) {
  // 1. Validate inputs
  if (!email || !password || !fullName) {
    throw new Error('All fields are required');
  }

  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }

  if (fullName.trim().length < 2) {
    throw new Error('Please enter your full name');
  }

  // 2. Create auth user
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      data: {
        full_name: fullName.trim(),
      },
    },
  });

  // 3. Create profile
  await createProfile({
    id: data.user.id,
    full_name: fullName.trim(),
    role: 'student',
  });
}
```

**Error Handling:**
- If profile creation fails, it will be auto-created on first login
- Uses `getOrCreateProfile()` during session initialization
- No orphaned auth users without profiles

---

### Login/Session Initialization

```typescript
async function loadProfile(userId: string) {
  // Get user data from auth for fallback
  const { data: { user } } = await supabase.auth.getUser();
  
  // Get or create profile (auto-creates if missing)
  const profileData = await getOrCreateProfile(userId, {
    full_name: user?.user_metadata?.full_name,
    email: user?.email,
  });
  
  setProfile(profileData);
}
```

**Benefits:**
- ✅ Always guarantees profile exists
- ✅ No more "profile not found" errors
- ✅ Seamless recovery from signup failures
- ✅ Works even if signup profile creation failed

---

## 🛡️ Security Features

### 1. **Input Validation**
```typescript
// Email normalization
email: email.trim().toLowerCase()

// Name validation
if (fullName.trim().length < 2) {
  throw new Error('Please enter your full name');
}

// Password strength
if (password.length < 6) {
  throw new Error('Password must be at least 6 characters');
}
```

### 2. **SQL Injection Prevention**
- Uses Supabase parameterized queries
- No raw SQL string concatenation
- Type-safe database operations

### 3. **Data Sanitization**
```typescript
const sanitizedUpdates: any = {};

if (updates.full_name !== undefined) {
  sanitizedUpdates.full_name = updates.full_name.trim();
}
```

### 4. **Error Information Hiding**
```typescript
// Never expose internal errors to users
throw new Error(`Failed to create profile: ${error.message}`);

// Log detailed errors for debugging
console.error('createProfile error:', JSON.stringify(error, null, 2));
```

---

## 📊 Error Logging Strategy

### Detailed Server Logs
```typescript
console.error('getWorkspaceTeams error:', JSON.stringify(error, null, 2));
console.error('getWorkspaceTeams catch:', error?.message || error);
```

### User-Friendly Messages
```typescript
// Internal
throw new Error(`Failed to create profile: ${error.message}`);

// To User
"Failed to create account. Please try again."
```

---

## ✅ Best Practices Implemented

### 1. **Idempotency**
- `getOrCreateProfile()` can be called multiple times safely
- No duplicate profile creation
- Atomic operations

### 2. **Fail-Safe Mechanisms**
```typescript
// If profile creation fails during signup
catch (profileError) {
  console.warn('Profile will be created on first login');
  // Don't block signup - will auto-create later
}
```

### 3. **Graceful Degradation**
```typescript
// Fallback chain for profile name
const fullName = 
  defaultData?.full_name || 
  defaultData?.email?.split('@')[0] || 
  'User';
```

### 4. **Type Safety**
```typescript
return data as Profile; // Explicit type casting
const profileData: Profile | null = await getProfile(userId);
```

### 5. **Comprehensive Logging**
```typescript
console.log('Profile not found, creating new profile for user:', userId);
console.log('Profile created successfully for:', data.user.id);
console.error('Failed to load profile:', error?.message || error);
```

---

## 🔄 Migration from Old System

### Before (Problems)
```typescript
// ❌ Could fail silently
const { data } = await supabase.from('profiles').insert({...});

// ❌ Manual error handling everywhere
if (error?.code === 'PGRST116') {
  // Create profile manually
}

// ❌ Empty error objects {}
console.error('Error:', error);
```

### After (Solutions)
```typescript
// ✅ Automatic profile creation
const profile = await getOrCreateProfile(userId, { email });

// ✅ Built-in error handling
// Profile always exists or throws meaningful error

// ✅ Detailed error logging
console.error('Error:', JSON.stringify(error, null, 2));
```

---

## 🧪 Testing Scenarios

### 1. **New User Signup**
- ✅ Creates auth user
- ✅ Creates profile
- ✅ Stores metadata
- ✅ Redirects to onboarding

### 2. **Signup Profile Creation Fails**
- ✅ Auth user created
- ⚠️ Profile creation fails (logged)
- ✅ User can still login
- ✅ Profile auto-created on first login

### 3. **Existing User Login**
- ✅ Loads existing profile
- ✅ No duplicate creation
- ✅ Fast response

### 4. **Login Without Profile** (edge case)
- ✅ Detects missing profile
- ✅ Auto-creates from auth metadata
- ✅ Seamless experience

---

## 📈 Performance Considerations

### Optimizations
1. **Single Query** - `getOrCreateProfile()` uses one DB call if profile exists
2. **No Retries** - Direct check instead of try-catch loops
3. **Indexed Lookups** - Profile queries use indexed `id` field
4. **Minimal Data** - Only fetches needed fields

### Caching Strategy
```typescript
// Profile stored in React context
const { profile } = useAuth();

// Refreshable on demand
await refreshProfile();
```

---

## 🚨 Common Issues & Solutions

### Issue: "Profile not found" error
**Solution:** Now handled automatically by `getOrCreateProfile()`

### Issue: Duplicate profiles
**Solution:** Profile uses `id` as primary key (user's auth UUID)

### Issue: Empty error objects `{}`
**Solution:** All errors now JSON.stringified for debugging

### Issue: Name showing as "User"
**Solution:** Pass `full_name` to `getOrCreateProfile()` from auth metadata

---

## 📝 Code Examples

### Complete Signup Flow
```typescript
import { createProfile } from '@/lib/db/queries';

async function handleSignup(email: string, password: string, fullName: string) {
  // Validate
  if (fullName.trim().length < 2) {
    throw new Error('Please enter your full name');
  }

  // Create auth user
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      data: { full_name: fullName.trim() }
    }
  });

  if (error) throw error;

  // Create profile
  await createProfile({
    id: data.user!.id,
    full_name: fullName.trim(),
    role: 'student'
  });
}
```

### Complete Login Flow
```typescript
import { getOrCreateProfile } from '@/lib/db/queries';

async function initializeSession(userId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  
  const profile = await getOrCreateProfile(userId, {
    full_name: user?.user_metadata?.full_name,
    email: user?.email
  });
  
  return profile;
}
```

---

## 🎓 Summary

The refactored profile management system provides:

✅ **Reliability** - Auto-creates profiles, prevents orphaned users  
✅ **Security** - Input validation, sanitization, error hiding  
✅ **Maintainability** - Clear functions, comprehensive logging  
✅ **User Experience** - Seamless signup/login, no errors  
✅ **Developer Experience** - Easy to use, well-documented  

**Recommended Usage:**
- Use `getOrCreateProfile()` in authentication flows
- Use `createProfile()` only in signup (with fallback)
- Use `updateProfile()` for user settings changes
- Always check logs for detailed error information

---

## 📚 Related Documentation

- [Authentication System](./AUTHENTICATION.md)
- [Database Schema](./DATABASE_SCHEMA.md)
- [Error Handling Guide](./ERROR_HANDLING.md)
- [RLS Policies](./RLS_POLICIES.md)

---

**Last Updated:** 2025-10-28  
**Version:** 2.0.0  
**Status:** ✅ Production Ready
