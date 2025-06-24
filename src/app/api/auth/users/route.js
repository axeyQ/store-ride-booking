import { NextResponse } from 'next/server';
import { authenticateToken, requireFirstUser } from '@/middleware/auth';
import connectDB from '@/lib/db';
import User from '@/models/User';

export async function GET(request) {
  const authResult = await authenticateToken(request);
  if (authResult) return authResult;

  const permissionResult = await requireFirstUser(request);
  if (permissionResult) return permissionResult;

  try {
    await connectDB();
    const users = await User.find()
      .select('-password -passwordResetToken -refreshTokens')
      .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      users
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch users'
    }, { status: 500 });
  }
}