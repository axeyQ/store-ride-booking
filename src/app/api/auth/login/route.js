import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { generateAccessToken, generateRefreshToken, getCookieOptions, getClientIP, getUserAgent, getSecurityHeaders, validatePassword } from '@/lib/auth';
import { loginRateLimit } from '@/middleware/auth';

export async function POST(request) {
  try {
    // Apply rate limiting
    const rateLimitResult = loginRateLimit(request);
    if (rateLimitResult) {
      return rateLimitResult;
    }

    const { username, password, rememberMe = false } = await request.json();

    // Validation
    if (!username || !password) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Username and password are required',
          code: 'VALIDATION_ERROR'
        },
        { status: 400, headers: getSecurityHeaders() }
      );
    }

    await connectDB();

    // Find user by username
    const user = await User.findOne({ username: username.toLowerCase().trim() });

    if (!user) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid username or password',
          code: 'INVALID_CREDENTIALS'
        },
        { status: 401, headers: getSecurityHeaders() }
      );
    }

    // Check if account is locked
    if (user.isLocked) {
      const lockTimeRemaining = Math.ceil((user.lockUntil - Date.now()) / 1000 / 60);
      return NextResponse.json(
        { 
          success: false, 
          error: `Account is locked. Please try again in ${lockTimeRemaining} minutes.`,
          code: 'ACCOUNT_LOCKED',
          lockTimeRemaining
        },
        { status: 423, headers: getSecurityHeaders() }
      );
    }

    // Check if account is active
    if (!user.isActive) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Account is deactivated. Please contact administrator.',
          code: 'ACCOUNT_INACTIVE'
        },
        { status: 403, headers: getSecurityHeaders() }
      );
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      // Increment login attempts
      await user.incLoginAttempts();
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid username or password',
          code: 'INVALID_CREDENTIALS'
        },
        { status: 401, headers: getSecurityHeaders() }
      );
    }

    // Reset login attempts on successful login
    if (user.loginAttempts > 0) {
      await user.resetLoginAttempts();
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Store refresh token
    await user.addRefreshToken(
      refreshToken, 
      getUserAgent(request), 
      getClientIP(request)
    );

    // Prepare user data for response (exclude sensitive fields)
    const userData = {
      id: user._id,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      isFirstUser: user.isFirstUser,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt
    };

    // Create response
    const response = NextResponse.json(
      { 
        success: true, 
        message: 'Login successful',
        user: userData,
        accessToken
      },
      { status: 200, headers: getSecurityHeaders() }
    );

    // Set refresh token as HTTP-only cookie
    response.cookies.set(
      'refreshToken', 
      refreshToken, 
      getCookieOptions(rememberMe)
    );

    return response;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      },
      { status: 500, headers: getSecurityHeaders() }
    );
  }
}