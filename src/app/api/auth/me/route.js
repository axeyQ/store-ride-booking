import { NextResponse } from 'next/server';
import { authenticateToken } from '@/middleware/auth';
import { getSecurityHeaders } from '@/lib/auth';

export async function GET(request) {
  try {
    // Authenticate the request
    const authResult = await authenticateToken(request);
    if (authResult) {
      return authResult;
    }

    // Return user data (already attached by middleware)
    const userData = {
      id: request.user._id,
      username: request.user.username,
      fullName: request.user.fullName,
      email: request.user.email,
      isFirstUser: request.user.isFirstUser,
      lastLogin: request.user.lastLogin,
      createdAt: request.user.createdAt,
      isActive: request.user.isActive
    };

    return NextResponse.json(
      { 
        success: true, 
        user: userData 
      },
      { status: 200, headers: getSecurityHeaders() }
    );

  } catch (error) {
    console.error('Get user profile error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get user profile',
        code: 'PROFILE_ERROR'
      },
      { status: 500, headers: getSecurityHeaders() }
    );
  }
}