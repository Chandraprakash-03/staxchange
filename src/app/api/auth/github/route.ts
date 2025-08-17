import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/services/auth';

/**
 * GET /api/auth/github
 * Returns GitHub OAuth authorization URL
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const state = searchParams.get('state') || undefined;

    const authUrl = AuthService.getGitHubAuthUrl(state);

    return NextResponse.json({
      authUrl,
      message: 'Redirect to this URL to authenticate with GitHub',
    });
  } catch (error) {
    console.error('GitHub auth URL generation error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to generate GitHub auth URL',
        code: 'GITHUB_AUTH_URL_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}