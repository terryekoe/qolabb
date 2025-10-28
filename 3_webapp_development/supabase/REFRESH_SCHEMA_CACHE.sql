-- =====================================================
-- Refresh PostgREST Schema Cache
-- This forces Supabase to reload its schema cache
-- =====================================================

NOTIFY pgrst, 'reload schema';

-- Confirmation message
SELECT 'Schema cache refresh triggered! Wait 5 seconds then refresh your app.' as status;
