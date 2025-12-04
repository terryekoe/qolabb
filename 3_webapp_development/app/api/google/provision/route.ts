import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { googleDriveService } from '@/lib/services/google_drive';

// Initialize Supabase Admin client to bypass RLS for admin tasks if needed
// For now, we'll use the user's session from the request headers if possible, 
// or just standard client if we trust the inputs. 
// Ideally, we should verify the user is an instructor.

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectId, teamId, templateUrl, resourceName, autoCreate, title, content } = body;

    if (!projectId || !teamId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 2. Fetch Team Details (to get name)
    // We need a supabase client. Since this is an API route, we can create one.
    // Note: In a real app, use createRouteHandlerClient from @supabase/auth-helpers-nextjs
    // Here we'll use the env vars directly for a service role or just a standard client
    // assuming we are in a trusted environment or just mocking.
    // For this mock, we'll just use the teamId as the name if we can't fetch.
    
    // Let's try to fetch the team name using the public URL and anon key for now, 
    // but typically we'd want the user's context.
    // For simplicity in this mock phase, we'll assume the team name is passed or we fetch it.
    // Let's just use a placeholder name if we can't easily fetch without auth context setup.
    const teamName = `Team ${teamId.substring(0, 4)}`; 

    let result;

    if (autoCreate) {
      // Auto-create doc from content
      if (!title) {
        return NextResponse.json({ error: 'Title is required for auto-creation' }, { status: 400 });
      }
      result = await googleDriveService.createDocWithContent(title, content || '', teamName);
    } else {
      // Create copy from template
      if (!templateUrl) {
        return NextResponse.json({ error: 'Template URL is required' }, { status: 400 });
      }

      // 1. Extract Template ID
      const templateId = googleDriveService.extractFileIdFromUrl(templateUrl);
      if (!templateId) {
        return NextResponse.json({ error: 'Invalid Google Doc URL' }, { status: 400 });
      }

      // 3. Call Mock Service to Provision
      result = await googleDriveService.createTeamCopy(templateId, teamName);
    }

    // 4. Return the new resource details
    return NextResponse.json({
      success: true,
      resource: {
        id: `gdoc_${result.fileId}`,
        type: 'link',
        name: resourceName || result.name,
        url: result.webViewLink,
        addedAt: new Date().toISOString(),
        // In a real app, we might save this to the DB here, 
        // or let the frontend receive it and save it to the project resources.
        // The plan says "Update the project resource", but doing it in the API is safer.
        // However, to keep it simple and flexible with the existing frontend flow,
        // we'll return it and let the frontend add it to the list before creating the project.
      }
    });

  } catch (error: any) {
    console.error('Provisioning error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
