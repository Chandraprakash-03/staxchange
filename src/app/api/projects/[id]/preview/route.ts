import { NextRequest, NextResponse } from 'next/server';
import { PreviewManager } from '../../../../../services/previewManager';
import { ProjectService } from '../../../../../services/project';
import { PreviewConfig, FileTree } from '../../../../../types';

const previewManager = new PreviewManager();
const projectService = new ProjectService();

// GET /api/projects/[id]/preview - Get preview environment for project
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;

    // Get preview environment
    const preview = await previewManager.getProjectPreview(projectId);
    
    if (!preview) {
      return NextResponse.json(
        { success: false, error: 'Preview environment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: preview
    });

  } catch (error) {
    console.error('Failed to get preview environment:', error);
    const err = error as Error;
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

// POST /api/projects/[id]/preview - Create preview environment for project
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    const body = await request.json();
    const { files, config }: { files: FileTree; config?: PreviewConfig } = body;

    // Get project details
    const project = await projectService.getProject(projectId);
    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    // Create preview environment
    const preview = await previewManager.createProjectPreview(project, files);

    return NextResponse.json({
      success: true,
      data: preview
    });

  } catch (error) {
    console.error('Failed to create preview environment:', error);
    const err = error as Error;
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id]/preview - Destroy preview environment for project
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;

    // Destroy preview environment
    await previewManager.destroyProjectPreview(projectId);

    return NextResponse.json({
      success: true,
      message: 'Preview environment destroyed'
    });

  } catch (error) {
    console.error('Failed to destroy preview environment:', error);
    const err = error as Error;
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}