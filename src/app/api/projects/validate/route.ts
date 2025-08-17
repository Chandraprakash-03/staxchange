import { NextRequest, NextResponse } from 'next/server';
import { GitHubImportService } from '@/services/github';
import { ApiResponse, ValidationResult } from '@/types';

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<ValidationResult>>> {
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

    // Validate the repository
    const validationResult = await githubService.validateRepository(url);

    return NextResponse.json({
      success: true,
      data: validationResult,
      message: validationResult.isValid ? 'Repository is valid' : 'Repository validation failed'
    });

  } catch (error) {
    console.error('Validation error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}