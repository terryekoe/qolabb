# Deployment Instructions

## Prerequisites

1. **Docker Desktop** - Required for local Supabase development
   - Install from: https://docs.docker.com/desktop
   - Start Docker Desktop before running Supabase commands

2. **Supabase CLI** - Already installed in your project

## Database Setup & RLS Fix

### 1. Apply the Corrected RLS Policies

Once Docker is running, execute these commands:

```bash
# Reset the database with the latest migrations
npx supabase db reset

# Apply the corrected RLS policies
npx supabase db push
```

### 2. Alternative: Manual RLS Fix (Production)

If you're working directly with a production Supabase instance, run the `FIX_RLS_CORRECTED.sql` file in your Supabase SQL editor:

1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `supabase/FIX_RLS_CORRECTED.sql`
4. Execute the query

## Environment Variables

Ensure these environment variables are set:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Development Server

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

## Production Deployment

### Vercel (Recommended)

1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Manual Deployment

```bash
# Build the application
npm run build

# Start production server
npm start
```

## Key Improvements Applied

### 1. RLS Policy Fix
- ✅ Fixed circular dependency in workspace creation
- ✅ Corrected INSERT policies for workspaces and workspace_members
- ✅ Added proper ownership checks

### 2. Enhanced Error Handling
- ✅ Added ErrorBoundary component
- ✅ Implemented toast notifications
- ✅ Added loading states

### 3. Input Validation
- ✅ Added Zod schemas for all forms
- ✅ Client-side and server-side validation
- ✅ Proper error messages

### 4. Performance Optimizations
- ✅ Added React Query for data fetching
- ✅ Implemented caching strategies
- ✅ Added loading skeletons

### 5. UI/UX Improvements
- ✅ Enhanced form components
- ✅ Better loading states
- ✅ Consistent design system

## Testing the RLS Fix

After applying the corrected RLS policies, test workspace creation:

1. Sign up/in to the application
2. Try creating a new workspace
3. Verify the workspace appears in your dashboard
4. Test joining a workspace with an invite code

## Troubleshooting

### Common Issues

1. **Docker not running**: Start Docker Desktop
2. **Supabase connection issues**: Check environment variables
3. **RLS policy errors**: Ensure the corrected policies are applied
4. **Build errors**: Run `npm install` to ensure all dependencies are installed

### Logs

Check these locations for debugging:
- Browser console for client-side errors
- Terminal for server-side errors
- Supabase dashboard for database errors

## Next Steps

1. Apply the RLS fix when Docker is available
2. Test all functionality thoroughly
3. Consider adding more comprehensive tests
4. Set up CI/CD pipeline for automated deployments