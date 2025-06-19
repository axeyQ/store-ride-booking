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
        period: `Block ${blockNumber}`,
        minutes: blockUsed,
        rate: blockRate,
        isNightCharge: isNight
      });
      
      totalAmount += blockRate;
      remainingMinutes -= blockUsed;
      currentTime = new Date(currentTime.getTime() + blockUsed * 60000);
      blockNumber++;
    }
    
    return { totalAmount, breakdown, totalMinutes };
  } catch (error) {
    console.error('Error calculating advanced pricing:', error);
    // Fallback to simple calculation
    const diffMs = new Date(endTime) - new Date(startTime);
    const hours = Math.ceil(diffMs / (1000 * 60 * 60));
    return { totalAmount: hours * 80, breakdown: [], totalMinutes: Math.floor(diffMs / (1000 * 60)) };
  }
}

function isNightCharge(startTime, durationMinutes, nightChargeTime) {
  try {
    const [nightHour, nightMinute] = nightChargeTime.split(':').map(Number);
    const blockEndTime = new Date(startTime.getTime() + durationMinutes * 60000);
    
    const nightThreshold = new Date(startTime);
    nightThreshold.setHours(nightHour, nightMinute, 0, 0);
    
    return blockEndTime > nightThreshold && startTime < new Date(nightThreshold.getTime() + 60000);
  } catch (error) {
    return false;
  }
}

export async function GET(request, { params }) {
  try {
    await connectDB();
    const { id } = params;
    
    const booking = await Booking.findById(id);
    if (!booking) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }
    
    if (booking.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'Booking is not active' },
        { status: 400 }
      );
    }
    
    // Calculate current amount using advanced pricing
    const pricingResult = await calculateAdvancedPricing(booking.startTime, new Date());
    
    return NextResponse.json({
      success: true,
      currentAmount: pricingResult.totalAmount,
      breakdown: pricingResult.breakdown,
      totalMinutes: pricingResult.totalMinutes,
      totalHours: Math.ceil(pricingResult.totalMinutes / 60)
    });
  } catch (error) {
    console.error('Current amount API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}