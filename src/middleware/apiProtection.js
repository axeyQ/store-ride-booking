import { authenticateToken, apiRateLimit } from '@/middleware/auth';
import { NextResponse } from 'next/server';
import { getSecurityHeaders } from '@/lib/auth';

// Wrapper to protect all API routes with authentication
export function protectApiRoute(handler) {
  return async function protectedHandler(request, context) {
    try {
      // Apply rate limiting first
      const rateLimitResult = apiRateLimit(request);
      if (rateLimitResult) {
        return rateLimitResult;
      }

      // Skip authentication for public routes
      const pathname = request.nextUrl.pathname;
      const publicRoutes = [
        '/api/auth/login',
        '/api/auth/refresh',
        '/api/auth/init',
        '/api/health', // Health check endpoint
        '/api/status'  // Status endpoint
      ];

      if (publicRoutes.includes(pathname)) {
        return handler(request, context);
      }

      // Authenticate the request
      const authResult = await authenticateToken(request);
      if (authResult) {
        return authResult; // Return authentication error
      }

      // Add audit logging
      console.log(`API Access: ${request.method} ${pathname} by user ${request.user.username} (${request.user._id})`);

      // Continue to the actual handler
      const response = await handler(request, context);
      
      // Add security headers to response
      const headers = getSecurityHeaders();
      Object.entries(headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      return response;

    } catch (error) {
      console.error('API Route Protection Error:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Internal server error',
          code: 'INTERNAL_ERROR'
        },
        { 
          status: 500,
          headers: getSecurityHeaders()
        }
      );
    }
  };
}

// Enhanced error handler for API routes
export function handleApiError(error, request) {
  console.error('API Error:', {
    error: error.message,
    stack: error.stack,
    url: request.url,
    method: request.method,
    user: request.user?.username || 'anonymous'
  });

  // Don't expose internal errors in production
  const isProduction = process.env.NODE_ENV === 'production';
  const errorMessage = isProduction 
    ? 'An error occurred while processing your request'
    : error.message;

  return NextResponse.json(
    {
      success: false,
      error: errorMessage,
      code: 'API_ERROR'
    },
    { 
      status: 500,
      headers: getSecurityHeaders()
    }
  );
}

// Update all your existing API routes with this pattern:

// Example: src/app/api/bookings/route.js
/*
import { protectApiRoute, handleApiError } from '@/middleware/apiProtection';
import connectDB from '@/lib/db';
import Booking from '@/models/Booking';

async function bookingsHandler(request) {
  try {
    await connectDB();
    
    if (request.method === 'GET') {
      const bookings = await Booking.find()
        .populate('customerId vehicleId')
        .sort({ createdAt: -1 });
      
      return NextResponse.json({
        success: true,
        bookings
      });
    }
    
    if (request.method === 'POST') {
      const data = await request.json();
      const booking = new Booking({
        ...data,
        createdBy: request.user._id // Use authenticated user
      });
      
      await booking.save();
      
      return NextResponse.json({
        success: true,
        booking
      }, { status: 201 });
    }
    
  } catch (error) {
    return handleApiError(error, request);
  }
}

export const GET = protectApiRoute(bookingsHandler);
export const POST = protectApiRoute(bookingsHandler);
*/