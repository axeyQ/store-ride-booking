// src/app/api/bookings/current-amount/[id]/route.js
import connectDB from '@/lib/db';
import Booking from '@/models/Booking';
import { NextResponse } from 'next/server';
import { PricingService } from '@/services/PricingService';

export async function GET(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;

    const booking = await Booking.findById(id);
    if (!booking) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    // ✅ Check if booking is cancelled (unchanged logic)
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

    // ✅ Check if booking is not active (unchanged logic)
    if (booking.status !== 'active') {
      return NextResponse.json({
        success: false,
        error: `Cannot calculate current amount for ${booking.status} booking. Only active bookings are supported.`,
        status: booking.status
      }, { status: 400 });
    }

    // 🚀 NEW: Use PricingService instead of inline calculation
    console.log(`💰 Calculating current amount for booking ${booking.bookingId} using PricingService...`);
    const pricingResult = await PricingService.calculateAdvancedPricing(booking.startTime, new Date());
    
    // ✅ RESPONSE FORMAT UNCHANGED - 100% backward compatibility
    return NextResponse.json({
      success: true,
      currentAmount: pricingResult.totalAmount,
      breakdown: pricingResult.breakdown,
      totalMinutes: pricingResult.totalMinutes,
      totalHours: Math.ceil(pricingResult.totalMinutes / 60),
      summary: pricingResult.summary,
      status: booking.status,
      message: 'Live amount calculation for active booking'
    });

  } catch (error) {
    console.error('Current amount API error:', error);
    
    // 🛡️ Enhanced error handling with fallback
    try {
      // Try fallback calculation if main service fails
      const booking = await Booking.findById(params.id);
      if (booking && booking.status === 'active') {
        const fallbackResult = await PricingService.calculateSimplePricing(booking.startTime, new Date());
        
        return NextResponse.json({
          success: true,
          currentAmount: fallbackResult.totalAmount,
          breakdown: fallbackResult.breakdown,
          totalMinutes: fallbackResult.totalMinutes,
          totalHours: Math.ceil(fallbackResult.totalMinutes / 60),
          summary: fallbackResult.summary + ' (fallback calculation)',
          status: booking.status,
          message: 'Live amount calculation (fallback mode)',
          warning: 'Using simplified calculation due to service error'
        });
      }
    } catch (fallbackError) {
      console.error('Fallback calculation also failed:', fallbackError);
    }
    
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}