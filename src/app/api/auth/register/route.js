import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { validatePassword, getSecurityHeaders } from '@/lib/auth';
import { authenticateToken, requireFirstUser } from '@/middleware/auth';

export async function POST(request) {
  try {
    // Authenticate the request
    const authResult = await authenticateToken(request);
    if (authResult) {
      return authResult;
    }

    // Check if user has permission to create accounts
    const permissionResult = await requireFirstUser(request);
    if (permissionResult) {
      return permissionResult;
    }

    const { username, password, fullName, email } = await request.json();

    // Validation
    if (!username || !password || !fullName) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Username, password, and full name are required',
          code: 'VALIDATION_ERROR'
        },
        { status: 400, headers: getSecurityHeaders() }
      );
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Password does not meet requirements',
          details: passwordValidation.errors,
          code: 'PASSWORD_WEAK'
        },
        { status: 400, headers: getSecurityHeaders() }
      );
    }

    await connectDB();

    // Check if username already exists
    const existingUser = await User.findOne({ 
      username: username.toLowerCase().trim() 
    });

    if (existingUser) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Username already exists',
          code: 'USERNAME_EXISTS'
        },
        { status: 409, headers: getSecurityHeaders() }
      );
    }

    // Check if email already exists (if provided)
    if (email) {
      const existingEmail = await User.findOne({ email: email.toLowerCase().trim() });
      if (existingEmail) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Email already exists',
            code: 'EMAIL_EXISTS'
          },
          { status: 409, headers: getSecurityHeaders() }
        );
      }
    }

    // Create new user
    const newUser = new User({
      username: username.toLowerCase().trim(),
      password,
      fullName: fullName.trim(),
      email: email ? email.toLowerCase().trim() : undefined,
      isActive: true,
      isFirstUser: false
    });

    await newUser.save();

    // Return user data (exclude password)
    const userData = {
      id: newUser._id,
      username: newUser.username,
      fullName: newUser.fullName,
      email: newUser.email,
      isActive: newUser.isActive,
      isFirstUser: newUser.isFirstUser,
      createdAt: newUser.createdAt
    };

    return NextResponse.json(
      { 
        success: true, 
        message: 'User created successfully',
        user: userData
      },
      { status: 201, headers: getSecurityHeaders() }
    );

  } catch (error) {
    console.error('User registration error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create user',
        code: 'REGISTRATION_ERROR'
      },
      { status: 500, headers: getSecurityHeaders() }
    );
  }
}