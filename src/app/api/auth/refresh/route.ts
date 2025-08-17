import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/services/auth';

/**
 * POST /api/auth/refresh
 * Refreshes JWT token
 */
export async function POST(request: NextRequest) {
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

    // Refresh token
    const newToken = AuthService.refreshJWT(token);

    // Create response with new token
    const response = NextResponse.json({
      success: true,
      token: newToken,
      message: 'Token refreshed successfully',
    });

    // Update HTTP-only cookie
    response.cookies.set('auth-token', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Token refresh error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to refresh token',
        code: 'REFRESH_FAILED',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 401 }
    );
  }
}