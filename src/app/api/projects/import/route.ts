import { NextRequest, NextResponse } from 'next/server';
import { GitHubImportService } from '@/services/github';
import { ProjectModel } from '@/models/project';
import { ApiResponse, ImportResult } from '@/types';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<ImportResult>>> {
  try {
    const body = await request.json();
    const { url, accessToken } = body;

    if (!url) {
      return NextResponse.json({
        success: false,
        error: 'GitHub URL is required'
      }, { status: 400 });
    }

    // Initialize GitHub import service
    const githubService = new GitHubImportService();

    // Import the repository
    const importResult = await githubService.importRepository(url, accessToken);

    if (importResult.status === 'error') {
      return NextResponse.json({
        success: false,
        error: importResult.error || 'Import failed'
      }, { status: 400 });
    }

    // TODO: Get user ID from authentication
    // For now, using a valid UUID format for placeholder user ID
    const userId = '00000000-0000-0000-0000-000000000000';

    // Extract repository name from URL
    const repoName = url.split('/').pop()?.replace('.git', '') || 'imported-project';

    // Create project record in database
    try {
      // Ensure placeholder user exists
      await prisma.user.upsert({
        where: { id: userId },
        update: {},
        create: {
          id: userId,
          githubId: 'placeholder',
          username: 'placeholder-user',
          email: 'placeholder@example.com',
        }
      });

      const project = await prisma.project.create({
        data: {
          name: repoName,
          githubUrl: url,
          userId: userId,
          originalTechStack: importResult.detectedTechnologies as any,
          status: 'imported',
          fileStructure: importResult.structure as any,
        }
      });

      // Update import result with the actual project ID from database
      const finalResult: ImportResult = {
        ...importResult,
        projectId: project.id
      };

      return NextResponse.json({
        success: true,
        data: finalResult,
        message: 'Repository imported successfully'
      });

    } catch (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json({
        success: false,
        error: 'Failed to save project to database'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}