import { NextResponse } from 'next/server';
import { authenticateToken, requireFirstUser } from '@/middleware/auth';
import connectDB from '@/lib/db';
import User from '@/models/User';

export async function PATCH(request, { params }) {
  const authResult = await authenticateToken(request);
  if (authResult) return authResult;

  const permissionResult = await requireFirstUser(request);
  if (permissionResult) return permissionResult;

  try {
    const { isActive } = await request.json();
    const { userId } = params;

    await connectDB();
    
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    if (user.isFirstUser) {
      return NextResponse.json({
        success: false,
        error: 'Cannot modify first user status'
      }, { status: 403 });
    }

    user.isActive = isActive;
    await user.save();

    return NextResponse.json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to update user status'
    }, { status: 500 });
  }
}