import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { getSecurityHeaders } from '@/lib/auth';

export async function POST(request) {
  try {
    await connectDB();

    // Check if any users exist
    const existingUsers = await User.countDocuments();
    
    if (existingUsers > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Users already exist. Initialization not needed.',
          code: 'ALREADY_INITIALIZED'
        },
        { status: 409, headers: getSecurityHeaders() }
      );
    }

    // Create the first user with predefined credentials
    const firstUser = await User.createFirstUser({
      username: 'axeyq',
      password: 'Rakshit@2806',
      fullName: 'System Administrator',
      isActive: true,
      isFirstUser: true
    });

    return NextResponse.json(
      { 
        success: true, 
        message: 'System initialized successfully. First user created.',
        user: {
          id: firstUser._id,
          username: firstUser.username,
          fullName: firstUser.fullName,
          isFirstUser: firstUser.isFirstUser
        }
      },
      { status: 201, headers: getSecurityHeaders() }
    );

  } catch (error) {
    console.error('System initialization error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to initialize system',
        code: 'INITIALIZATION_ERROR'
      },
      { status: 500, headers: getSecurityHeaders() }
    );
  }
}