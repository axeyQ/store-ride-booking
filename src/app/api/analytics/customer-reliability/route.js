import connectDB from '@/lib/db';
import Booking from '@/models/Booking';
import Customer from '@/models/Customer';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const limit = parseInt(searchParams.get('limit')) || 50;
    
    let query = { status: 'completed' };
    if (customerId) {
      query.customerId = customerId;
    }
    
    const completedBookings = await Booking.find(query)
      .populate('customerId', 'name phone driverLicense')
      .populate('vehicleId', 'model type plateNumber')
      .sort({ endTime: -1 })
      .limit(limit);
    
    // Calculate reliability scores for each customer
    const customerReliability = {};
    
    completedBookings.forEach(booking => {
      if (!booking.customerId) return;
      
      const customerId = booking.customerId._id.toString();
      
      if (!customerReliability[customerId]) {
        customerReliability[customerId] = {
          customer: booking.customerId,
          bookings: [],
          onTimeCount: 0,
          lateCount: 0,
          totalLateDuration: 0
        };
      }
      
      const reliability = customerReliability[customerId];
      
      // Add booking to history
      reliability.bookings.push({
        bookingId: booking.bookingId,
        startTime: booking.startTime,
        endTime: booking.endTime,
        vehicle: booking.vehicleId,
        actualDuration: booking.actualDuration,
        amount: booking.finalAmount
      });
      
      // Calculate if booking was on time
      // For now, assume all completed bookings were returned (could be enhanced with expected return time)
      if (booking.startTime && booking.endTime && booking.actualDuration) {
        const startTime = new Date(booking.startTime);
        const endTime = new Date(booking.endTime);
        const actualDurationMs = endTime - startTime;
        const actualDurationHours = actualDurationMs / (1000 * 60 * 60);
        
        // Simple heuristic: if actual duration is within 10% of recorded duration, it's on time
        const tolerance = 0.1; // 10% tolerance
        const expectedDuration = booking.actualDuration;
        
        if (actualDurationHours <= expectedDuration * (1 + tolerance)) {
          reliability.onTimeCount++;
        } else {
          reliability.lateCount++;
          reliability.totalLateDuration += (actualDurationHours - expectedDuration) * 60; // minutes
        }
      } else {
        // Default to on-time if no duration data
        reliability.onTimeCount++;
      }
    });
    
    // Process reliability data
    const reliabilityScores = Object.values(customerReliability).map(rel => {
      const totalBookings = rel.onTimeCount + rel.lateCount;
      const reliabilityPercentage = totalBookings > 0 ? (rel.onTimeCount / totalBookings * 100) : 100;
      const averageLateDuration = rel.lateCount > 0 ? rel.totalLateDuration / rel.lateCount : 0;
      
      return {
        customerId: rel.customer._id,
        customerName: rel.customer.name,
        customerPhone: rel.customer.phone,
        customerLicense: rel.customer.driverLicense,
        totalBookings,
        onTimeBookings: rel.onTimeCount,
        lateBookings: rel.lateCount,
        reliabilityScore: Math.round(reliabilityPercentage),
        averageLateDuration: Math.round(averageLateDuration),
        recentBookings: rel.bookings.slice(0, 5), // 5 most recent
        lastBooking: rel.bookings[0]?.endTime
      };
    });
    
    // Sort by reliability score (highest first)
    reliabilityScores.sort((a, b) => b.reliabilityScore - a.reliabilityScore);
    
    // Calculate summary statistics
    const summary = {
      totalCustomers: reliabilityScores.length,
      averageReliability: reliabilityScores.length > 0 
        ? Math.round(reliabilityScores.reduce((sum, c) => sum + c.reliabilityScore, 0) / reliabilityScores.length)
        : 0,
      excellentCustomers: reliabilityScores.filter(c => c.reliabilityScore >= 95).length,
      goodCustomers: reliabilityScores.filter(c => c.reliabilityScore >= 80 && c.reliabilityScore < 95).length,
      needsAttentionCustomers: reliabilityScores.filter(c => c.reliabilityScore < 80).length
    };
    
    return NextResponse.json({
      success: true,
      data: {
        customers: reliabilityScores,
        summary,
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Customer reliability API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}