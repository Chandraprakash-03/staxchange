import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/services/auth';

/**
 * GET /api/auth/me
 * Returns current user information
 */
export async function GET(request: NextRequest) {
  try {
    // Get token from Authorization header or cookie
    const authHeader = request.headers.get('authorization');
    const cookieToken = request.cookies.get('auth-token')?.value;
    const token = authHeader?.split(' ')[1] || cookieToken;

    if (!token) {
      return NextResponse.json(
        {
          error: 'Access token required',
          code: 'MISSING_TOKEN',
        },
        { status: 401 }
      );
    }

    // Get user from token
    const user = await AuthService.getUserFromToken(token);

    if (!user) {
      return NextResponse.json(
        {
          error: 'Invalid or expired token',
          code: 'INVALID_TOKEN',
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl,
        githubId: user.githubId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error('Get current user error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to get user information',
        code: 'GET_USER_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}