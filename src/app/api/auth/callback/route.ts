import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/services/auth';

/**
 * GET /api/auth/callback
 * Handles GitHub OAuth callback
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const state = searchParams.get('state');

    // Handle OAuth errors
    if (error) {
      return NextResponse.json(
        {
          error: 'GitHub OAuth error',
          code: 'GITHUB_OAUTH_ERROR',
          details: error,
        },
        { status: 400 }
      );
    }

    // Validate required parameters
    if (!code) {
      return NextResponse.json(
        {
          error: 'Authorization code is required',
          code: 'MISSING_AUTH_CODE',
        },
        { status: 400 }
      );
    }

    // Authenticate with GitHub
    const { user, token } = await AuthService.authenticateWithGitHub(code);

    // Create response with token
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl,
        githubId: user.githubId,
      },
      token,
      message: 'Authentication successful',
    });

    // Set HTTP-only cookie for token (optional, for web clients)
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('GitHub OAuth callback error:', error);
    
    return NextResponse.json(
      {
        error: 'Authentication failed',
        code: 'AUTH_FAILED',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}