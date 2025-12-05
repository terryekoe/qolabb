import { syncProjectDocuments } from '@/lib/services/google/sync';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Test API route for manual document syncing
 * POST /api/test-sync
 * Body: { projectId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { projectId } = await request.json();

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    const result = await syncProjectDocuments(projectId);

    return NextResponse.json({
      success: result.success,
      contributionsCreated: result.contributionsCreated,
      errors: result.errors,
      message: result.success
        ? `Successfully synced. Created ${result.contributionsCreated} contributions.`
        : `Sync completed with errors: ${result.errors.join(', ')}`,
    });
  } catch (error: any) {
    console.error('Test sync error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync documents' },
      { status: 500 }
    );
  }
}
