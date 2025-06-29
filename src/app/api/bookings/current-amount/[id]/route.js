// src/app/api/bookings/current-amount/[id]/route.js
import connectDB from '@/lib/db';
import { NextResponse } from 'next/server';
import { BookingService } from '@/services/BookingService';
import { PricingService } from '@/services/PricingService';

export async function GET(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;

    console.log(`💰 Calculating current amount for booking ${id} using BookingService...`);

    // 🚀 NEW: Use BookingService.calculateCurrentAmount() - Single method handles everything!
    const result = await BookingService.calculateCurrentAmount(id);
    
    // ✅ BookingService already handles all the logic:
    // - Booking not found
    // - Cancelled bookings
    // - Non-active bookings  
    // - Advanced pricing calculation
    // - Proper error handling
    
    if (result.success) {
      console.log(`✅ Current amount calculated successfully: ₹${result.currentAmount}`);
      return NextResponse.json(result);
    } else {
      // Handle service-level errors
      const statusCode = result.error === 'Booking not found' ? 404 : 
                         result.status === 'completed' || result.status === 'cancelled' ? 400 : 500;
      
      return NextResponse.json(result, { status: statusCode });
    }

  } catch (error) {
    console.error('❌ Current amount API error:', error);
    
    // 🛡️ Enhanced fallback with multiple strategies
    try {
      console.log('🔄 Attempting fallback calculation...');
      
      // Strategy 1: Try direct PricingService calculation
      const booking = await BookingService.getBookingById(id);
      if (booking) {
        console.log(`📋 Found booking ${booking.bookingId}, attempting direct pricing calculation...`);
        
        // Handle cancelled bookings in fallback
        if (booking.status === 'cancelled') {
          return NextResponse.json({
            success: true,
            currentAmount: 0,
            breakdown: [],
            totalMinutes: 0,
            totalHours: 0,
            summary: 'Cancelled - No charge applied',
            status: 'cancelled',
            message: 'This booking has been cancelled. No amount calculation is applicable.'
          });
        }

        // Handle non-active bookings in fallback
        if (booking.status !== 'active') {
          return NextResponse.json({
            success: false,
            error: `Cannot calculate current amount for ${booking.status} booking. Only active bookings are supported.`,
            status: booking.status
          }, { status: 400 });
        }

        // Try advanced pricing first, then simple pricing
        let pricingResult;
        try {
          pricingResult = await PricingService.calculateAdvancedPricing(booking.startTime, new Date());
          console.log('✅ Advanced pricing fallback successful');
        } catch (advancedError) {
          console.log('⚠️ Advanced pricing failed, trying simple pricing...');
          pricingResult = await PricingService.calculateSimplePricing(booking.startTime, new Date());
          console.log('✅ Simple pricing fallback successful');
        }
        
        return NextResponse.json({
          success: true,
          currentAmount: pricingResult.totalAmount,
          breakdown: pricingResult.breakdown || [],
          totalMinutes: pricingResult.totalMinutes || 0,
          totalHours: Math.ceil((pricingResult.totalMinutes || 0) / 60),
          summary: (pricingResult.summary || 'Fallback calculation') + ' (fallback mode)',
          status: booking.status,
          message: 'Live amount calculation (fallback mode)',
          warning: 'Using fallback calculation due to service error'
        });
      }
    } catch (fallbackError) {
      console.error('❌ All fallback strategies failed:', fallbackError);
    }
    
    // Final fallback - return error
    return NextResponse.json(
      { 
        success: false, 
        error: 'Unable to calculate current amount. Please try again.',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// 🚀 NEW: Optional health check endpoint for monitoring
export async function HEAD(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    
    // Quick booking existence check
    const booking = await BookingService.getBookingById(id);
    if (!booking) {
      return new NextResponse(null, { status: 404 });
    }
    
    return new NextResponse(null, { 
      status: 200,
      headers: {
        'X-Booking-Status': booking.status,
        'X-Service-Health': 'healthy'
      }
    });
  } catch (error) {
    return new NextResponse(null, { status: 500 });
  }
}