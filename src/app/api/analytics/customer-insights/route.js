import connectDB from '@/lib/db';
import Booking from '@/models/Booking';
import Customer from '@/models/Customer';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    await connectDB();
    
    // Get all completed bookings with customer data
    const completedBookings = await Booking.find({ status: 'completed' })
      .populate('customerId', 'name phone driverLicense')
      .populate('vehicleId', 'model type')
      .sort({ endTime: -1 });

    // Calculate customer analytics
    const customerAnalytics = {};
    
    completedBookings.forEach(booking => {
      if (!booking.customerId) return;
      
      const customerId = booking.customerId._id.toString();
      
      if (!customerAnalytics[customerId]) {
        customerAnalytics[customerId] = {
          customer: booking.customerId,
          totalBookings: 0,
          onTimeReturns: 0,
          lateReturns: 0,
          totalRevenue: 0,
          totalLateDuration: 0, // in minutes
          firstBooking: booking.createdAt,
          lastBooking: booking.createdAt,
          bookingHistory: []
        };
      }

      const analytics = customerAnalytics[customerId];
      
      // Update booking count and revenue
      analytics.totalBookings++;
      analytics.totalRevenue += booking.finalAmount || 0;
      
      // Track booking history
      analytics.bookingHistory.push({
        bookingId: booking.bookingId,
        date: booking.createdAt,
        endDate: booking.endTime,
        vehicle: booking.vehicleId?.model,
        amount: booking.finalAmount,
        duration: booking.actualDuration
      });
      
      // Update date range
      if (booking.createdAt < analytics.firstBooking) {
        analytics.firstBooking = booking.createdAt;
      }
      if (booking.createdAt > analytics.lastBooking) {
        analytics.lastBooking = booking.createdAt;
      }
      
      // Calculate punctuality (if we have duration data)
      if (booking.startTime && booking.endTime && booking.actualDuration) {
        const startTime = new Date(booking.startTime);
        const endTime = new Date(booking.endTime);
        const actualDurationMs = endTime - startTime;
        const actualDurationHours = actualDurationMs / (1000 * 60 * 60);
        
        // Expected duration vs actual duration
        const expectedDuration = booking.actualDuration; // This is the final recorded duration
        
        // For now, let's use a simple heuristic: if booking was longer than expected by 1+ hours, consider it late
        // In future, you could add expected return time fields to bookings
        const lateTolerance = 1; // 1 hour tolerance
        
        if (actualDurationHours <= expectedDuration + lateTolerance) {
          analytics.onTimeReturns++;
        } else {
          analytics.lateReturns++;
          analytics.totalLateDuration += (actualDurationHours - expectedDuration) * 60; // convert to minutes
        }
      } else {
        // If no duration data, assume on-time (for existing bookings)
        analytics.onTimeReturns++;
      }
    });

    // Process analytics and create customer insights
    const customerInsights = Object.values(customerAnalytics).map(analytics => {
      const totalReturns = analytics.onTimeReturns + analytics.lateReturns;
      const reliabilityScore = totalReturns > 0 ? (analytics.onTimeReturns / totalReturns * 100) : 100;
      const averageLateDuration = analytics.lateReturns > 0 ? analytics.totalLateDuration / analytics.lateReturns : 0;
      
      // Calculate loyalty metrics
      const daysSinceFirst = Math.floor((new Date() - new Date(analytics.firstBooking)) / (1000 * 60 * 60 * 24));
      const bookingFrequency = daysSinceFirst > 0 ? (analytics.totalBookings / daysSinceFirst * 30) : 0; // bookings per month
      
      // Calculate customer lifetime (in days)
      const customerLifetime = Math.floor((new Date(analytics.lastBooking) - new Date(analytics.firstBooking)) / (1000 * 60 * 60 * 24));
      
      return {
        customerId: analytics.customer._id,
        customerName: analytics.customer.name,
        customerPhone: analytics.customer.phone,
        customerLicense: analytics.customer.driverLicense,
        
        // Loyalty metrics
        totalBookings: analytics.totalBookings,
        totalRevenue: analytics.totalRevenue,
        bookingFrequency: Math.round(bookingFrequency * 100) / 100, // bookings per month
        customerLifetime, // days as customer
        
        // Reliability metrics
        reliabilityScore: Math.round(reliabilityScore),
        onTimeReturns: analytics.onTimeReturns,
        lateReturns: analytics.lateReturns,
        averageLateDuration: Math.round(averageLateDuration), // minutes
        
        // Dates
        firstBooking: analytics.firstBooking,
        lastBooking: analytics.lastBooking,
        
        // History
        recentBookings: analytics.bookingHistory.slice(-3), // last 3 bookings
        
        // Milestones
        milestones: getMilestones(analytics.totalBookings, analytics.firstBooking)
      };
    });

    // Sort by loyalty (total bookings desc)
    customerInsights.sort((a, b) => b.totalBookings - a.totalBookings);

    // Get top performers
    const topLoyalCustomers = customerInsights.slice(0, 10);
    const topReliableCustomers = customerInsights
      .filter(c => c.totalBookings >= 3) // minimum 3 bookings to be considered
      .sort((a, b) => b.reliabilityScore - a.reliabilityScore)
      .slice(0, 10);

    // Calculate overall statistics
    const totalCustomersWithBookings = customerInsights.length;
    const averageReliability = customerInsights.reduce((sum, c) => sum + c.reliabilityScore, 0) / totalCustomersWithBookings;
    const averageBookingsPerCustomer = customerInsights.reduce((sum, c) => sum + c.totalBookings, 0) / totalCustomersWithBookings;
    
    // Find customers with recent milestones (last 7 days)
    const recentMilestones = customerInsights
      .filter(customer => customer.milestones.some(m => m.isRecent))
      .map(customer => ({
        customerId: customer.customerId,
        customerName: customer.customerName,
        milestones: customer.milestones.filter(m => m.isRecent)
      }));

    return NextResponse.json({
      success: true,
      data: {
        topLoyalCustomers,
        topReliableCustomers,
        recentMilestones,
        summary: {
          totalCustomersWithBookings,
          averageReliability: Math.round(averageReliability),
          averageBookingsPerCustomer: Math.round(averageBookingsPerCustomer * 100) / 100
        },
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Customer insights API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Helper function to determine milestones
function getMilestones(totalBookings, firstBookingDate) {
  const milestones = [];
  const now = new Date();
  const firstBooking = new Date(firstBookingDate);
  const daysSinceFirst = Math.floor((now - firstBooking) / (1000 * 60 * 60 * 24));
  
  // Booking count milestones
  const bookingMilestones = [5, 10, 20, 50, 100];
  bookingMilestones.forEach(milestone => {
    if (totalBookings >= milestone) {
      const isRecent = totalBookings === milestone; // Just hit this milestone
      milestones.push({
        type: 'booking_count',
        milestone: `${milestone} Bookings`,
        achieved: true,
        isRecent: isRecent && daysSinceFirst <= 7, // achieved in last 7 days
        icon: '🎯'
      });
    }
  });
  
  // Time-based milestones (customer for X months)
  const monthsSinceFirst = Math.floor(daysSinceFirst / 30);
  const timeMilestones = [
    { months: 1, label: '1 Month Customer', icon: '📅' },
    { months: 3, label: '3 Month Customer', icon: '🗓️' },
    { months: 6, label: '6 Month Customer', icon: '🎉' },
    { months: 12, label: '1 Year Customer', icon: '🏆' }
  ];
  
  timeMilestones.forEach(milestone => {
    if (monthsSinceFirst >= milestone.months) {
      const isRecent = monthsSinceFirst === milestone.months;
      milestones.push({
        type: 'time_based',
        milestone: milestone.label,
        achieved: true,
        isRecent: isRecent,
        icon: milestone.icon
      });
    }
  });
  
  return milestones;
}