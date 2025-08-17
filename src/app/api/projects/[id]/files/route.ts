import { NextRequest, NextResponse } from 'next/server';
import { ProjectService } from '../../../../../services/project';

const projectService = new ProjectService();

// GET /api/projects/[id]/files - Get project files
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;

    // Get project details
    const project = await projectService.getProject(projectId);
    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    // Return file structure
    // In a real implementation, this would fetch the latest converted files
    // or original files if conversion hasn't completed
    const files = project.fileStructure || {
      name: 'project',
      type: 'directory' as const,
      path: '',
      children: [
        {
          name: 'index.js',
          type: 'file' as const,
          path: 'index.js',
          content: '// Sample file content\nconsole.log("Hello, World!");',
          metadata: {
            size: 45,
            lastModified: new Date(),
            mimeType: 'application/javascript'
          }
        },
        {
          name: 'package.json',
          type: 'file' as const,
          path: 'package.json',
          content: JSON.stringify({
            name: 'converted-project',
            version: '1.0.0',
            main: 'index.js',
            scripts: {
              start: 'node index.js'
            }
          }, null, 2),
          metadata: {
            size: 120,
            lastModified: new Date(),
            mimeType: 'application/json'
          }
        }
      ],
      metadata: {
        size: 0,
        lastModified: new Date()
      }
    };

    return NextResponse.json({
      success: true,
      data: files
    });

  } catch (error) {
    console.error('Failed to get project files:', error);
    const err = error as Error;
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}