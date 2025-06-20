import connectDB from '@/lib/db';
import Booking from '@/models/Booking';
import Customer from '@/models/Customer';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    await connectDB();
    
    // Get recent completed bookings (last 7 days) to check for new milestones
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentBookings = await Booking.find({
      status: 'completed',
      endTime: { $gte: sevenDaysAgo }
    }).populate('customerId', 'name phone');
    
    // Check each customer for milestone achievements
    const milestoneAlerts = [];
    
    for (const booking of recentBookings) {
      if (!booking.customerId) continue;
      
      const customerId = booking.customerId._id;
      
      // Count total bookings for this customer
      const totalBookings = await Booking.countDocuments({
        customerId: customerId,
        status: 'completed'
      });
      
      // Get first booking date
      const firstBooking = await Booking.findOne({
        customerId: customerId
      }).sort({ createdAt: 1 });
      
      // Check for booking count milestones
      const bookingMilestones = [5, 10, 20, 50, 100];
      if (bookingMilestones.includes(totalBookings)) {
        milestoneAlerts.push({
          customerId: customerId,
          customerName: booking.customerId.name,
          customerPhone: booking.customerId.phone,
          type: 'booking_count',
          milestone: totalBookings,
          message: `🎯 ${booking.customerId.name} completed their ${totalBookings}${getOrdinalSuffix(totalBookings)} booking!`,
          achievedAt: booking.endTime,
          icon: '🎯'
        });
      }
      
      // Check for time-based milestones
      if (firstBooking) {
        const daysSinceFirst = Math.floor((new Date() - new Date(firstBooking.createdAt)) / (1000 * 60 * 60 * 24));
        const monthsSinceFirst = Math.floor(daysSinceFirst / 30);
        
        const timeMilestones = [
          { months: 1, label: '1 Month' },
          { months: 3, label: '3 Months' },
          { months: 6, label: '6 Months' },
          { months: 12, label: '1 Year' }
        ];
        
        timeMilestones.forEach(tm => {
          if (monthsSinceFirst === tm.months) {
            milestoneAlerts.push({
              customerId: customerId,
              customerName: booking.customerId.name,
              customerPhone: booking.customerId.phone,
              type: 'time_based',
              milestone: tm.label,
              message: `🎉 ${booking.customerId.name} is now a ${tm.label} customer!`,
              achievedAt: new Date(),
              icon: '🎉'
            });
          }
        });
      }
    }
    
    // Remove duplicates and sort by achievement date
    const uniqueAlerts = milestoneAlerts.filter((alert, index, self) => 
      index === self.findIndex((a) => 
        a.customerId.toString() === alert.customerId.toString() && 
        a.type === alert.type && 
        a.milestone === alert.milestone
      )
    ).sort((a, b) => new Date(b.achievedAt) - new Date(a.achievedAt));
    
    return NextResponse.json({
      success: true,
      data: {
        milestoneAlerts: uniqueAlerts,
        totalAlerts: uniqueAlerts.length,
        lastChecked: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Customer milestones API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Helper function for ordinal suffixes
function getOrdinalSuffix(number) {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const value = number % 100;
  return suffixes[(value - 20) % 10] || suffixes[value] || suffixes[0];
}
