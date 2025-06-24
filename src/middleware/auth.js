import { NextResponse } from 'next/server';
import { verifyAccessToken, extractTokenFromHeader, getClientIP, getUserAgent, getSecurityHeaders } from '@/lib/auth';
import connectDB from '@/lib/db';
import User from '@/models/User';

// Authentication middleware for API routes
export async function authenticateToken(request) {
  try {
    // Add security headers
    const headers = getSecurityHeaders();
    
    // Extract token from Authorization header
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);
    
    if (!token) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Access token required',
          code: 'AUTH_TOKEN_MISSING'
        },
        { 
          status: 401,
          headers 
        }
      );
    }
    
    // Verify token
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (error) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid or expired token',
          code: 'AUTH_TOKEN_INVALID'
        },
        { 
          status: 401,
          headers 
        }
      );
    }
    
    // Connect to database and get user
    await connectDB();
    const user = await User.findById(decoded.userId).select('-password -passwordResetToken');
    
    if (!user) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'User not found',
          code: 'AUTH_USER_NOT_FOUND'
        },
        { 
          status: 401,
          headers 
        }
      );
    }
    
    if (!user.isActive) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Account is deactivated',
          code: 'AUTH_ACCOUNT_INACTIVE'
        },
        { 
          status: 403,
          headers 
        }
      );
    }
    
    if (user.isLocked) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Account is locked due to multiple failed login attempts',
          code: 'AUTH_ACCOUNT_LOCKED'
        },
        { 
          status: 423,
          headers 
        }
      );
    }
    
    // Add user to request for use in API route
    request.user = user;
    request.userId = user._id;
    
    return null; // No error, authentication successful
    
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Authentication failed',
        code: 'AUTH_INTERNAL_ERROR'
      },
      { 
        status: 500,
        headers: getSecurityHeaders()
      }
    );
  }
}

// Middleware wrapper for API routes
export function withAuth(handler) {
  return async function authHandler(request, context) {
    // Skip authentication for login and public routes
    const pathname = request.nextUrl.pathname;
    const publicRoutes = ['/api/auth/login', '/api/auth/refresh', '/api/auth/init'];
    
    if (publicRoutes.includes(pathname)) {
      return handler(request, context);
    }
    
    // Authenticate the request
    const authResult = await authenticateToken(request);
    if (authResult) {
      return authResult; // Return error response
    }
    
    // Continue to the actual handler
    return handler(request, context);
  };
}

// Check if user is first user (for registration permissions)
export async function requireFirstUser(request) {
  if (!request.user) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      },
      { status: 401 }
    );
  }
  
  if (!request.user.isFirstUser) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Only the first user can create new accounts',
        code: 'AUTH_INSUFFICIENT_PERMISSIONS'
      },
      { status: 403 }
    );
  }
  
  return null; // Success
}

// Rate limiting middleware
const rateLimitStore = new Map();

export function rateLimit(options = {}) {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100, // limit each IP to 100 requests per windowMs
    message = 'Too many requests from this IP, please try again later.',
    skipSuccessfulRequests = false,
    skipFailedRequests = false
  } = options;
  
  return function rateLimitMiddleware(request) {
    const ip = getClientIP(request);
    const key = `rateLimit:${ip}`;
    const now = Date.now();
    
    // Clean up old entries
    if (rateLimitStore.has(key)) {
      const data = rateLimitStore.get(key);
      data.requests = data.requests.filter(time => now - time < windowMs);
      
      if (data.requests.length >= max) {
        return NextResponse.json(
          { 
            success: false, 
            error: message,
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: Math.ceil(windowMs / 1000)
          },
          { 
            status: 429,
            headers: {
              'Retry-After': Math.ceil(windowMs / 1000).toString(),
              ...getSecurityHeaders()
            }
          }
        );
      }
      
      data.requests.push(now);
    } else {
      rateLimitStore.set(key, { requests: [now] });
    }
    
    return null; // No rate limit exceeded
  };
}

// Login rate limiting (stricter)
export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login attempts per 15 minutes
  message: 'Too many login attempts from this IP, please try again after 15 minutes.'
});

// General API rate limiting
export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per 15 minutes
  message: 'Too many API requests from this IP, please slow down.'
});