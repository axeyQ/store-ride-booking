// src/app/api/analytics/fleet-forecast/route.js
// Error-safe version with robust timezone handling

import connectDB from '@/lib/db';
import Booking from '@/models/Booking';
import { NextResponse } from 'next/server';
import { getCurrentIST, formatIST, createSafeDate } from '@/lib/timezone';

export async function GET() {
  try {
    await connectDB();

    // ✅ FIXED: Use safer date creation with validation
    const nowIST = getCurrentIST();
    
    // Validate the current time
    if (!nowIST || isNaN(nowIST.getTime())) {
      throw new Error('Failed to get valid current IST time');
    }

    const endTimeIST = new Date(nowIST.getTime() + (6 * 60 * 60 * 1000)); // Next 6 hours in IST

    console.log('🕐 Fleet Forecast - IST Times (Safe Version):');
    console.log('Now IST:', nowIST.toISOString());
    console.log('End IST:', endTimeIST.toISOString());

    // Get active bookings with stored estimated return times
    let upcomingReturns = [];
    try {
      upcomingReturns = await Booking.find({
        status: 'active',
        estimatedReturnTime: {
          $gte: nowIST,
          $lte: endTimeIST
        }
      })
      .populate('vehicleId', 'model plateNumber type')
      .populate('customerId', 'name')
      .sort({ estimatedReturnTime: 1 });
    } catch (dbError) {
      console.log('No bookings with stored estimated return times, continuing...');
      upcomingReturns = [];
    }

    // ✅ ENHANCED: Get active bookings without estimated return times
    let activeBookingsWithoutEstimate = [];
    try {
      activeBookingsWithoutEstimate = await Booking.find({
        status: 'active',
        $or: [
          { estimatedReturnTime: { $exists: false } },
          { estimatedReturnTime: null }
        ]
      })
      .populate('vehicleId', 'model plateNumber type')
      .populate('customerId', 'name');
    } catch (dbError) {
      console.log('Error fetching active bookings without estimates:', dbError.message);
      activeBookingsWithoutEstimate = [];
    }

    // Calculate estimated return times for bookings without them
    const estimatedReturns = activeBookingsWithoutEstimate
      .map(booking => {
        try {
          const startTime = createSafeDate(booking.startTime);
          
          if (isNaN(startTime.getTime())) {
            console.log(`Invalid start time for booking ${booking.bookingId}`);
            return null;
          }
          
          // Business logic for estimated duration based on booking type
          let estimatedDurationHours = 2; // Default 2 hours
          
          if (booking.isCustomBooking) {
            // Custom booking estimated durations
            switch (booking.customBookingType) {
              case 'half_day':
                estimatedDurationHours = 4;
                break;
              case 'full_day':
                estimatedDurationHours = 8;
                break;
              case 'night':
                estimatedDurationHours = 10;
                break;
              default:
                estimatedDurationHours = 2;
            }
          } else {
            // Advanced pricing bookings - estimate based on time of day
            const startHour = startTime.getHours();
            if (startHour >= 9 && startHour <= 11) {
              estimatedDurationHours = 3; // Morning rentals tend to be longer
            } else if (startHour >= 18 && startHour <= 20) {
              estimatedDurationHours = 1.5; // Evening rentals tend to be shorter
            }
          }
          
          const estimatedReturnTime = new Date(startTime.getTime() + (estimatedDurationHours * 60 * 60 * 1000));
          
          if (isNaN(estimatedReturnTime.getTime())) {
            console.log(`Invalid estimated return time calculated for booking ${booking.bookingId}`);
            return null;
          }
          
          return {
            ...booking.toObject(),
            estimatedReturnTime,
            isEstimated: true // Flag to indicate this was calculated
          };
        } catch (error) {
          console.log(`Error processing booking ${booking.bookingId}:`, error.message);
          return null;
        }
      })
      .filter(booking => booking !== null); // Remove failed calculations

    // Combine bookings with actual and estimated return times
    const allUpcomingReturns = [
      ...upcomingReturns.map(b => ({ ...b.toObject(), isEstimated: false })),
      ...estimatedReturns.filter(booking => {
        try {
          const returnTime = createSafeDate(booking.estimatedReturnTime);
          return returnTime >= nowIST && returnTime <= endTimeIST;
        } catch (error) {
          console.log('Error filtering estimated return:', error.message);
          return false;
        }
      })
    ].sort((a, b) => {
      try {
        return new Date(a.estimatedReturnTime) - new Date(b.estimatedReturnTime);
      } catch (error) {
        return 0; // Keep original order if sorting fails
      }
    });

    // ✅ FIXED: Group returns by hour using safe date operations
    const forecast = [];
    for (let i = 0; i < 6; i++) {
      try {
        const slotStartIST = new Date(nowIST.getTime() + (i * 60 * 60 * 1000));
        const slotEndIST = new Date(nowIST.getTime() + ((i + 1) * 60 * 60 * 1000));
        
        // Validate slot times
        if (isNaN(slotStartIST.getTime()) || isNaN(slotEndIST.getTime())) {
          console.log(`Invalid slot times for hour ${i}, skipping...`);
          continue;
        }
        
        const returnsInSlot = allUpcomingReturns.filter(booking => {
          try {
            const returnTime = createSafeDate(booking.estimatedReturnTime);
            return returnTime >= slotStartIST && returnTime < slotEndIST;
          } catch (error) {
            return false;
          }
        });
        
        // ✅ SAFE: Format time with error handling
        let hourDisplay;
        try {
          hourDisplay = formatIST(slotStartIST, { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
          });
        } catch (error) {
          hourDisplay = `Hour ${i + 1}`;
        }
        
        const forecastSlot = {
          hour: hourDisplay,
          slotStart: slotStartIST.toISOString(),
          slotEnd: slotEndIST.toISOString(),
          expectedReturns: returnsInSlot.length,
          vehicles: returnsInSlot.map(b => 
            `${b.vehicleId?.model || 'Unknown'} (${b.vehicleId?.plateNumber || 'N/A'})`
          ),
          bookings: returnsInSlot.map(b => {
            try {
              return {
                bookingId: b.bookingId,
                customerName: b.customerId?.name,
                vehicleModel: b.vehicleId?.model,
                plateNumber: b.vehicleId?.plateNumber,
                estimatedReturn: formatIST(b.estimatedReturnTime),
                estimatedReturnISO: b.estimatedReturnTime,
                isCustomBooking: b.isCustomBooking,
                customBookingType: b.customBookingType,
                isEstimated: b.isEstimated,
                currentDuration: calculateCurrentDuration(b.startTime)
              };
            } catch (error) {
              console.log('Error formatting booking data:', error.message);
              return {
                bookingId: b.bookingId || 'Unknown',
                customerName: 'Unknown',
                vehicleModel: 'Unknown',
                isEstimated: true,
                error: 'Formatting error'
              };
            }
          })
        };
        
        forecast.push(forecastSlot);
        
      } catch (error) {
        console.log(`Error creating forecast slot ${i}:`, error.message);
        // Continue with next slot
      }
    }

    // Calculate summary statistics
    const totalReturns = allUpcomingReturns.length;
    const estimatedCount = allUpcomingReturns.filter(b => b.isEstimated).length;
    const confirmedCount = totalReturns - estimatedCount;

    return NextResponse.json({
      success: true,
      forecast: forecast.filter(slot => slot.expectedReturns > 0), // Only return slots with returns
      summary: {
        totalUpcomingReturns: totalReturns,
        confirmedReturns: confirmedCount,
        estimatedReturns: estimatedCount,
        timeWindow: '6 hours',
        timezone: 'Asia/Kolkata'
      },
      generatedAt: nowIST.toISOString(),
      generatedAtIST: formatIST(nowIST),
      debug: {
        serverTime: new Date().toISOString(),
        istTime: formatIST(new Date()),
        queryStart: nowIST.toISOString(),
        queryEnd: endTimeIST.toISOString(),
        processedBookings: {
          withStoredEstimates: upcomingReturns.length,
          withCalculatedEstimates: estimatedReturns.length,
          total: allUpcomingReturns.length
        }
      }
    });

  } catch (error) {
    console.error('Fleet forecast API error:', error);
    
    // Return a safe error response
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate fleet forecast',
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Helper function to calculate current rental duration with error handling
function calculateCurrentDuration(startTime) {
  try {
    const start = createSafeDate(startTime);
    const now = getCurrentIST();
    
    if (isNaN(start.getTime()) || isNaN(now.getTime())) {
      return 'Unknown';
    }
    
    const durationMs = now - start;
    if (durationMs < 0) {
      return 'Future booking';
    }
    
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  } catch (error) {
    console.log('Error calculating duration:', error.message);
    return 'Unknown';
  }
}