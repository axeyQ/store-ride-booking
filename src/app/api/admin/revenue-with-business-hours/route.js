import connectDB from '@/lib/db';
import Booking from '@/models/Booking';
import DailyOperations from '@/models/DailyOperations';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const includeBusinessHoursOnly = searchParams.get('businessHoursOnly') === 'true';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    let todayRevenue = 0;
    let todayBookingsCount = 0;
    
    if (includeBusinessHoursOnly) {
      // Get today's operation to check business hours
      const todaysOp = await DailyOperations.findOne({ date: today });
      
      if (todaysOp && todaysOp.dayStarted) {
        const businessStart = todaysOp.startTime;
        const businessEnd = todaysOp.endTime || new Date();
        
        const businessHoursBookings = await Booking.find({
          createdAt: { $gte: businessStart, $lt: businessEnd },
          status: { $in: ['completed', 'active'] }
        });
        
        todayRevenue = businessHoursBookings.reduce((sum, booking) => 
          sum + (booking.finalAmount || booking.baseAmount || 0), 0);
        todayBookingsCount = businessHoursBookings.length;
      }
    } else {
      // Regular calculation (all day)
      const todayBookings = await Booking.find({
        createdAt: { $gte: today, $lt: tomorrow },
        status: { $in: ['completed', 'active'] }
      });
      
      todayRevenue = todayBookings.reduce((sum, booking) => 
        sum + (booking.finalAmount || booking.baseAmount || 0), 0);
      todayBookingsCount = todayBookings.length;
    }
    
    return NextResponse.json({
      success: true,
      data: {
        todayRevenue,
        todayBookingsCount,
        calculationMethod: includeBusinessHoursOnly ? 'business_hours_only' : 'full_day',
        businessHoursActive: includeBusinessHoursOnly
      }
    });
    
  } catch (error) {
    console.error('Enhanced revenue API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}