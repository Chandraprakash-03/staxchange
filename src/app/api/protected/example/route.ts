import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/services/auth';

/**
 * GET /api/protected/example
 * Example of a protected route that requires authentication
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

    // Return protected data
    return NextResponse.json({
      message: 'This is protected data',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Protected route error:', error);
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}