import { NextRequest, NextResponse } from 'next/server';
import { PreviewManager } from '../../../../../../services/previewManager';
import { FileChange } from '../../../../../../types';

const previewManager = new PreviewManager();

// POST /api/projects/[id]/preview/update - Update preview environment with file changes
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    const body = await request.json();
    const { changes }: { changes: FileChange[] } = body;

    if (!changes || !Array.isArray(changes)) {
      return NextResponse.json(
        { success: false, error: 'Invalid changes format' },
        { status: 400 }
      );
    }

    // Update preview environment
    await previewManager.updateProjectPreview(projectId, changes);

    return NextResponse.json({
      success: true,
      message: 'Preview updated successfully'
    });

  } catch (error) {
    console.error('Failed to update preview environment:', error);
    const err = error as Error;
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}