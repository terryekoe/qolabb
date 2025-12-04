
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Create a client with service key to bypass RLS for setup
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function testVisibility() {
  console.log('--- Testing Team Member Visibility ---');

  // 1. Find a workspace and a student user
  const { data: workspaces } = await supabaseAdmin
    .from('workspaces')
    .select('id, name')
    .limit(1);
  
  if (!workspaces || workspaces.length === 0) {
    console.error('No workspaces found');
    return;
  }
  const workspaceId = workspaces[0].id;
  console.log(`Workspace: ${workspaces[0].name} (${workspaceId})`);

  // Get a student in this workspace
  const { data: members } = await supabaseAdmin
    .from('workspace_members')
    .select('user_id, role')
    .eq('workspace_id', workspaceId)
    .eq('role', 'member')
    .limit(1);

  if (!members || members.length === 0) {
    console.error('No student members found in workspace');
    return;
  }
  const studentId = members[0].user_id;
  console.log(`Student ID: ${studentId}`);

  // 2. Impersonate the student
  const supabaseStudent = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: {
      headers: {
        Authorization: `Bearer ${await generateUserToken(studentId)}` // We can't easily generate a token without signing in.
        // Alternative: Use postgres RLS testing or just check policies.
        // Actually, we can use the service role to fetch what the user *would* see if we simulate the query? No.
        // Let's just check the policies directly via SQL inspection or assume the user report is correct and fix the policy.
      }
    }
  });

  // Since generating a token is hard without password, let's look at the policies.
  // I'll write a SQL script to inspect policies instead.
}

// Helper to "simulate" auth is hard. 
// Let's switch to checking policies via SQL.
