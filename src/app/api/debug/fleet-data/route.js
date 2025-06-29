// src/app/api/debug/fleet-data/route.js
// Quick debug API to compare data between environments

import connectDB from '@/lib/db';
import Booking from '@/models/Booking';
import { NextResponse } from 'next/server';
import { getCurrentIST, formatIST } from '@/lib/timezone';

export async function GET() {
  try {
    await connectDB();
    
    const now = getCurrentIST();
    const endTime = new Date(now.getTime() + (6 * 60 * 60 * 1000));
    
    console.log('🔍 Debug Fleet Data:');
    console.log('Environment:', process.env.NODE_ENV);
    console.log('Current IST:', formatIST(now));
    console.log('End time IST:', formatIST(endTime));
    
    // Get ALL active bookings for debugging
    const allActiveBookings = await Booking.find({ status: 'active' })
      .populate('customerId', 'name phone')
      .populate('vehicleId', 'model plateNumber type')
      .sort({ startTime: -1 });
    
    console.log('Total active bookings found:', allActiveBookings.length);
    
    // Get bookings with stored estimated return times
    const bookingsWithEstimates = await Booking.find({
      status: 'active',
      estimatedReturnTime: { $exists: true, $ne: null }
    })
    .populate('customerId', 'name')
    .populate('vehicleId', 'model plateNumber');
    
    // Filter for next 6 hours
    const upcomingReturns = bookingsWithEstimates.filter(booking => {
      const returnTime = new Date(booking.estimatedReturnTime);
      return returnTime >= now && returnTime <= endTime;
    });
    
    console.log('Bookings with estimates in next 6 hours:', upcomingReturns.length);
    
    // Calculate estimated returns for bookings without stored estimates
    const bookingsWithoutEstimates = allActiveBookings.filter(booking => 
      !booking.estimatedReturnTime
    );
    
    const calculatedReturns = bookingsWithoutEstimates.map(booking => {
      const startTime = new Date(booking.startTime);
      let estimatedDurationHours = 2; // Default
      
      if (booking.isCustomBooking) {
        switch (booking.customBookingType) {
          case 'half_day': estimatedDurationHours = 4; break;
          case 'full_day': estimatedDurationHours = 8; break;
          case 'night': estimatedDurationHours = 10; break;
        }
      }
      
      const estimatedReturn = new Date(startTime.getTime() + (estimatedDurationHours * 60 * 60 * 1000));
      
      return {
        ...booking.toObject(),
        calculatedReturnTime: estimatedReturn,
        isInNext6Hours: estimatedReturn >= now && estimatedReturn <= endTime
      };
    });
    
    const calculatedInNext6Hours = calculatedReturns.filter(b => b.isInNext6Hours);
    
    console.log('Calculated returns in next 6 hours:', calculatedInNext6Hours.length);
    
    // Combine all data for response
    const debugData = {
      success: true,
      environment: process.env.NODE_ENV || 'unknown',
      currentTime: {
        ist: formatIST(now),
        iso: now.toISOString()
      },
      database: {
        connected: true,
        uri: process.env.MONGODB_URI ? 'Set' : 'Missing'
      },
      bookingCounts: {
        totalActive: allActiveBookings.length,
        withStoredEstimates: bookingsWithEstimates.length,
        withoutEstimates: bookingsWithoutEstimates.length,
        upcomingReturns: upcomingReturns.length,
        calculatedReturns: calculatedInNext6Hours.length,
        totalInNext6Hours: upcomingReturns.length + calculatedInNext6Hours.length
      },
      activeBookings: allActiveBookings.map(booking => ({
        bookingId: booking.bookingId,
        customer: booking.customerId?.name || 'Unknown',
        vehicle: `${booking.vehicleId?.model || 'Unknown'} (${booking.vehicleId?.plateNumber || 'N/A'})`,
        startTime: formatIST(booking.startTime),
        startTimeISO: booking.startTime,
        estimatedReturnTime: booking.estimatedReturnTime ? formatIST(booking.estimatedReturnTime) : null,
        estimatedReturnISO: booking.estimatedReturnTime,
        isCustomBooking: booking.isCustomBooking,
        customBookingType: booking.customBookingType,
        status: booking.status,
        createdAt: formatIST(booking.createdAt)
      })),
      upcomingReturns: [
        ...upcomingReturns.map(b => ({
          bookingId: b.bookingId,
          customer: b.customerId?.name,
          vehicle: b.vehicleId?.model,
          returnTime: formatIST(b.estimatedReturnTime),
          type: 'stored'
        })),
        ...calculatedInNext6Hours.map(b => ({
          bookingId: b.bookingId,
          customer: b.customerId?.name,
          vehicle: b.vehicleId?.model,
          returnTime: formatIST(b.calculatedReturnTime),
          type: 'calculated'
        }))
      ]
    };
    
    return NextResponse.json(debugData);
    
  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      environment: process.env.NODE_ENV || 'unknown',
      database: {
        connected: false,
        error: error.message
      }
    }, { status: 500 });
  }
}