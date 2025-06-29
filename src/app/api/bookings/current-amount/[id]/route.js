// src/app/api/bookings/current-amount/[id]/route.js
import connectDB from '@/lib/db';
import Booking from '@/models/Booking';
import { NextResponse } from 'next/server';

// Advanced pricing calculation function (same as in complete booking)
async function calculateAdvancedPricing(startTime, endTime) {
  try {
    // Get current settings - in a real app, these would be cached
    const settings = {
      hourlyRate: 80,
      graceMinutes: 15,
      blockMinutes: 30,
      nightChargeTime: '22:30',
      nightMultiplier: 2
    };

    const start = new Date(startTime);
    const end = new Date(endTime);
    const totalMinutes = Math.max(0, Math.floor((end - start) / (1000 * 60)));

    if (totalMinutes === 0) return { totalAmount: 0, breakdown: [], totalMinutes: 0 };

    const { hourlyRate, graceMinutes, blockMinutes, nightChargeTime, nightMultiplier } = settings;
    const halfRate = Math.round(hourlyRate / 2);

    let totalAmount = 0;
    let breakdown = [];
    let remainingMinutes = totalMinutes;
    let currentTime = new Date(start);

    // First block: Base hour + grace period
    const firstBlockMinutes = 60 + graceMinutes;
    const firstBlockUsed = Math.min(remainingMinutes, firstBlockMinutes);

    // Check if first block crosses night charge time
    const isFirstBlockNight = isNightCharge(currentTime, firstBlockUsed, nightChargeTime);
    const firstBlockRate = isFirstBlockNight ? hourlyRate * nightMultiplier : hourlyRate;

    breakdown.push({
      period: `First ${Math.floor(firstBlockMinutes/60)}h ${firstBlockMinutes%60}m`,
      minutes: firstBlockUsed,
      rate: firstBlockRate,
      isNightCharge: isFirstBlockNight
    });

    totalAmount += firstBlockRate;
    remainingMinutes -= firstBlockUsed;
    currentTime = new Date(currentTime.getTime() + firstBlockUsed * 60000);

    // Subsequent blocks
    let blockNumber = 2;
    while (remainingMinutes > 0) {
      const blockUsed = Math.min(remainingMinutes, blockMinutes);
      const isNight = isNightCharge(currentTime, blockUsed, nightChargeTime);
      const blockRate = isNight ? halfRate * nightMultiplier : halfRate;

      breakdown.push({
        period: `Block ${blockNumber} (${blockMinutes}min)`,
        minutes: blockUsed,
        rate: blockRate,
        isNightCharge: isNight
      });

      totalAmount += blockRate;
      remainingMinutes -= blockUsed;
      currentTime = new Date(currentTime.getTime() + blockUsed * 60000);
      blockNumber++;
    }

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const nightBlocks = breakdown.filter(b => b.isNightCharge).length;

    let summary = `${hours}h ${minutes}m total`;
    if (nightBlocks > 0) {
      summary += ` (${nightBlocks} night-rate blocks)`;
    }

    return {
      totalAmount,
      breakdown,
      totalMinutes,
      summary
    };

  } catch (error) {
    console.error('Advanced pricing calculation error:', error);
    return { totalAmount: 0, breakdown: [], totalMinutes: 0, summary: 'Calculation error' };
  }
}

// Helper function to check if a time block crosses night charge threshold
function isNightCharge(startTime, durationMinutes, nightChargeTime) {
  try {
    const [nightHour, nightMinute] = nightChargeTime.split(':').map(Number);
    const blockEndTime = new Date(startTime.getTime() + durationMinutes * 60000);
    const nightThreshold = new Date(startTime);
    nightThreshold.setHours(nightHour, nightMinute, 0, 0);
    
    // Check if the block crosses or includes the night threshold
    return blockEndTime > nightThreshold && startTime < new Date(nightThreshold.getTime() + 60000);
  } catch (error) {
    return false;
  }
}

// ✅ FIXED: GET method with proper params awaiting
export async function GET(request, { params }) {
  try {
    await connectDB();
    
    // ✅ FIX: Await params before destructuring (Next.js 15+ requirement)
    const { id } = await params;

    const booking = await Booking.findById(id);
    if (!booking) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    // ✅ Check if booking is cancelled
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

    // ✅ Check if booking is not active
    if (booking.status !== 'active') {
      return NextResponse.json({
        success: false,
        error: `Cannot calculate current amount for ${booking.status} booking. Only active bookings are supported.`,
        status: booking.status
      }, { status: 400 });
    }

    // Calculate advanced pricing for active bookings only
    const pricingResult = await calculateAdvancedPricing(booking.startTime, new Date());
    
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
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}