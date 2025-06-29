// src/app/api/debug/fleet-data/route.js
// Fixed version with proper model imports for Vercel

import connectDB from '@/lib/db';
// ✅ CRITICAL: Import ALL models explicitly for serverless environments
import Booking from '@/models/Booking';
import Customer from '@/models/Customer';  // Must import explicitly
import Vehicle from '@/models/Vehicle';    // Must import explicitly
import { NextResponse } from 'next/server';
import { getCurrentIST, formatIST } from '@/lib/timezone';

export async function GET() {
  try {
    // ✅ FIXED: Connect to database and ensure models are registered
    await connectDB();
    
    // Verify models are registered (helps with debugging)
    console.log('📋 Registered models:', Object.keys(require('mongoose').models));
    
    const now = getCurrentIST();
    const endTime = new Date(now.getTime() + (6 * 60 * 60 * 1000));
    
    console.log('🔍 Debug Fleet Data:');
    console.log('Environment:', process.env.NODE_ENV);
    console.log('Current IST:', formatIST(now));
    console.log('End time IST:', formatIST(endTime));
    
    // ✅ FIXED: Get ALL active bookings with explicit model references
    const allActiveBookings = await Booking.find({ status: 'active' })
      .populate({
        path: 'customerId',
        model: Customer,  // Explicit model reference
        select: 'name phone'
      })
      .populate({
        path: 'vehicleId', 
        model: Vehicle,   // Explicit model reference
        select: 'model plateNumber type'
      })
      .sort({ startTime: -1 });
    
    console.log('Total active bookings found:', allActiveBookings.length);
    
    // Get bookings with stored estimated return times
    const bookingsWithEstimates = await Booking.find({
      status: 'active',
      estimatedReturnTime: { $exists: true, $ne: null }
    })
    .populate({
      path: 'customerId',
      model: Customer,
      select: 'name phone'
    })
    .populate({
      path: 'vehicleId',
      model: Vehicle, 
      select: 'model plateNumber'
    });
    
    // Filter for next 6 hours
    const upcomingReturns = bookingsWithEstimates.filter(booking => {
      try {
        const returnTime = new Date(booking.estimatedReturnTime);
        return returnTime >= now && returnTime <= endTime;
      } catch (error) {
        console.log('Error filtering booking:', error);
        return false;
      }
    });
    
    console.log('Bookings with estimates in next 6 hours:', upcomingReturns.length);
    
    // Calculate estimated returns for bookings without stored estimates
    const bookingsWithoutEstimates = allActiveBookings.filter(booking => 
      !booking.estimatedReturnTime
    );
    
    const calculatedReturns = bookingsWithoutEstimates.map(booking => {
      try {
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
      } catch (error) {
        console.log('Error calculating return for booking:', booking.bookingId, error);
        return null;
      }
    }).filter(booking => booking !== null);
    
    const calculatedInNext6Hours = calculatedReturns.filter(b => b.isInNext6Hours);
    
    console.log('Calculated returns in next 6 hours:', calculatedInNext6Hours.length);
    
    // ✅ SAFE: Build response with error handling
    const debugData = {
      success: true,
      environment: process.env.NODE_ENV || 'unknown',
      currentTime: {
        ist: formatIST(now),
        iso: now.toISOString()
      },
      database: {
        connected: true,
        uri: process.env.MONGODB_URI ? 'Set' : 'Missing',
        modelsRegistered: Object.keys(require('mongoose').models)
      },
      bookingCounts: {
        totalActive: allActiveBookings.length,
        withStoredEstimates: bookingsWithEstimates.length,
        withoutEstimates: bookingsWithoutEstimates.length,
        upcomingReturns: upcomingReturns.length,
        calculatedReturns: calculatedInNext6Hours.length,
        totalInNext6Hours: upcomingReturns.length + calculatedInNext6Hours.length
      },
      activeBookings: allActiveBookings.map(booking => {
        try {
          return {
            bookingId: booking.bookingId,
            customer: booking.customerId?.name || 'Unknown',
            customerPhone: booking.customerId?.phone || 'N/A',
            vehicle: `${booking.vehicleId?.model || 'Unknown'} (${booking.vehicleId?.plateNumber || 'N/A'})`,
            startTime: formatIST(booking.startTime),
            startTimeISO: booking.startTime,
            estimatedReturnTime: booking.estimatedReturnTime ? formatIST(booking.estimatedReturnTime) : null,
            estimatedReturnISO: booking.estimatedReturnTime,
            isCustomBooking: booking.isCustomBooking,
            customBookingType: booking.customBookingType,
            status: booking.status,
            createdAt: formatIST(booking.createdAt)
          };
        } catch (error) {
          console.log('Error formatting booking:', booking.bookingId, error);
          return {
            bookingId: booking.bookingId || 'Unknown',
            customer: 'Error loading customer',
            vehicle: 'Error loading vehicle',
            error: error.message
          };
        }
      }),
      upcomingReturns: [
        ...upcomingReturns.map(b => ({
          bookingId: b.bookingId,
          customer: b.customerId?.name || 'Unknown',
          vehicle: b.vehicleId?.model || 'Unknown',
          returnTime: formatIST(b.estimatedReturnTime),
          type: 'stored'
        })),
        ...calculatedInNext6Hours.map(b => ({
          bookingId: b.bookingId,
          customer: b.customerId?.name || 'Unknown', 
          vehicle: b.vehicleId?.model || 'Unknown',
          returnTime: formatIST(b.calculatedReturnTime),
          type: 'calculated'
        }))
      ]
    };
    
    return NextResponse.json(debugData);
    
  } catch (error) {
    console.error('❌ Debug API error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
      environment: process.env.NODE_ENV || 'unknown',
      database: {
        connected: false,
        error: error.message,
        modelsRegistered: Object.keys(require('mongoose').models || {})
      }
    }, { status: 500 });
  }
}