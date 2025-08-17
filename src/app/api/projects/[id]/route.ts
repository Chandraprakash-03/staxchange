import { NextRequest, NextResponse } from 'next/server';
import { projectService } from '@/services/project';
import { ApiResponse } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Project ID is required',
      }, { status: 400 });
    }

    const project = await projectService.getProject(id);

    if (!project) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Project not found',
      }, { status: 404 });
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: project,
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    if (!id) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Project ID is required',
      }, { status: 400 });
    }

    if (!body.targetTechStack) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Target tech stack is required',
      }, { status: 400 });
    }

    const updatedProject = await projectService.updateTargetTechStack(id, body.targetTechStack);

    if (!updatedProject) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Project not found',
      }, { status: 404 });
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: updatedProject,
    });
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}