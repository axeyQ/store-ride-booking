import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { verifyRefreshToken, getSecurityHeaders } from '@/lib/auth';

export async function POST(request) {
  try {
    const refreshToken = request.cookies.get('refreshToken')?.value;

    // Clear refresh token cookie regardless
    const response = NextResponse.json(
      { 
        success: true, 
        message: 'Logged out successfully' 
      },
      { status: 200, headers: getSecurityHeaders() }
    );

    response.cookies.delete('refreshToken');

    // If there's a refresh token, remove it from database
    if (refreshToken) {
      try {
        const decoded = verifyRefreshToken(refreshToken);
        await connectDB();
        
        const user = await User.findById(decoded.userId);
        if (user) {
          await user.removeRefreshToken(refreshToken);
        }
      } catch (error) {
        console.error('Error removing refresh token:', error);
        // Don't fail the logout if we can't remove the token
      }
    }

    return response;

  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Logout failed',
        code: 'LOGOUT_ERROR'
      },
      { status: 500, headers: getSecurityHeaders() }
    );
  }
}