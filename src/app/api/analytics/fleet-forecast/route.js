import connectDB from '@/lib/db';
import Booking from '@/models/Booking';
import Customer from '@/models/Customer';
import Vehicle from '@/models/Vehicle';
import { NextResponse } from 'next/server';
import { getCurrentIST, formatIST, createSafeDate } from '@/lib/timezone';

export async function GET() {
  try {
    await connectDB();
    
    console.log('📋 Models registered:', Object.keys(require('mongoose').models));

    const nowIST = getCurrentIST();
    
    if (!nowIST || isNaN(nowIST.getTime())) {
      throw new Error('Failed to get valid current IST time');
    }

    const endTimeIST = new Date(nowIST.getTime() + (6 * 60 * 60 * 1000));

    console.log('🕐 Fleet Forecast - Time Window:');
    console.log('Now IST:', formatIST(nowIST));
    console.log('End IST:', formatIST(endTimeIST));
    console.log('Now ISO:', nowIST.toISOString());
    console.log('End ISO:', endTimeIST.toISOString());

    // ✅ FIXED: Get ALL active bookings first, then filter properly
    let allActiveBookings = [];
    try {
      allActiveBookings = await Booking.find({ status: 'active' })
        .populate({
          path: 'vehicleId',
          model: Vehicle,
          select: 'model plateNumber type'
        })
        .populate({
          path: 'customerId',
          model: Customer,
          select: 'name phone'
        })
        .sort({ startTime: 1 });
        
      console.log(`📊 Found ${allActiveBookings.length} active bookings total`);
    } catch (dbError) {
      console.log('Error fetching active bookings:', dbError.message);
      allActiveBookings = [];
    }

    // ✅ ENHANCED: Process all bookings to ensure they have return times
    const processedBookings = allActiveBookings.map(booking => {
      try {
        let estimatedReturnTime = booking.estimatedReturnTime;
        let isEstimated = false;

        // If no stored estimated return time, calculate one
        if (!estimatedReturnTime) {
          const startTime = createSafeDate(booking.startTime);
          let estimatedDurationHours = 2; // Default

          if (booking.isCustomBooking) {
            switch (booking.customBookingType) {
              case 'half_day': estimatedDurationHours = 4; break;
              case 'full_day': estimatedDurationHours = 8; break;
              case 'night': estimatedDurationHours = 10; break;
            }
          } else {
            const startHour = startTime.getHours();
            if (startHour >= 9 && startHour <= 11) estimatedDurationHours = 3;
            else if (startHour >= 18 && startHour <= 20) estimatedDurationHours = 1.5;
          }

          estimatedReturnTime = new Date(startTime.getTime() + (estimatedDurationHours * 60 * 60 * 1000));
          isEstimated = true;
        }

        return {
          ...booking.toObject(),
          estimatedReturnTime,
          isEstimated
        };
      } catch (error) {
        console.log(`Error processing booking ${booking.bookingId}:`, error.message);
        return null;
      }
    }).filter(booking => booking !== null);

    console.log(`📋 Processed ${processedBookings.length} bookings with return times`);

    // ✅ CRITICAL FIX: Filter for 6-hour window with proper timezone handling
    const upcomingReturns = processedBookings.filter(booking => {
      try {
        // Convert stored return time to proper Date object
        const returnTime = new Date(booking.estimatedReturnTime);
        
        // Debug log each booking's filtering
        console.log(`🔍 Checking booking ${booking.bookingId}:`);
        console.log(`  - Return time: ${formatIST(returnTime)} (${returnTime.toISOString()})`);
        console.log(`  - Now: ${formatIST(nowIST)} (${nowIST.toISOString()})`);
        console.log(`  - End window: ${formatIST(endTimeIST)} (${endTimeIST.toISOString()})`);
        console.log(`  - Is valid date: ${!isNaN(returnTime.getTime())}`);
        console.log(`  - Is after now: ${returnTime >= nowIST}`);
        console.log(`  - Is before end: ${returnTime <= endTimeIST}`);
        
        const isValid = !isNaN(returnTime.getTime());
        const isAfterNow = returnTime >= nowIST;
        const isBeforeEnd = returnTime <= endTimeIST;
        const isInWindow = isValid && isAfterNow && isBeforeEnd;
        
        console.log(`  - Included in forecast: ${isInWindow}`);
        
        return isInWindow;
      } catch (error) {
        console.log(`Error filtering booking ${booking.bookingId}:`, error.message);
        return false;
      }
    });

    console.log(`✅ ${upcomingReturns.length} bookings in 6-hour window`);

    // Sort by return time
    upcomingReturns.sort((a, b) => {
      try {
        return new Date(a.estimatedReturnTime) - new Date(b.estimatedReturnTime);
      } catch (error) {
        return 0;
      }
    });

    // ✅ FIXED: Group returns by hour with proper timezone handling
    const forecast = [];
    for (let i = 0; i < 6; i++) {
      try {
        const slotStartIST = new Date(nowIST.getTime() + (i * 60 * 60 * 1000));
        const slotEndIST = new Date(nowIST.getTime() + ((i + 1) * 60 * 60 * 1000));
        
        console.log(`📅 Slot ${i}: ${formatIST(slotStartIST)} - ${formatIST(slotEndIST)}`);
        
        const returnsInSlot = upcomingReturns.filter(booking => {
          try {
            const returnTime = new Date(booking.estimatedReturnTime);
            const isInSlot = returnTime >= slotStartIST && returnTime < slotEndIST;
            
            if (isInSlot) {
              console.log(`  ✅ ${booking.bookingId} (${booking.customerId?.name}) fits in slot ${i}`);
            }
            
            return isInSlot;
          } catch (error) {
            return false;
          }
        });
        
        console.log(`📊 Slot ${i} has ${returnsInSlot.length} returns`);
        
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
                customerName: b.customerId?.name || 'Unknown Customer',
                vehicleModel: b.vehicleId?.model || 'Unknown Vehicle',
                plateNumber: b.vehicleId?.plateNumber || 'N/A',
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
      }
    }

    // Calculate summary statistics
    const totalReturns = upcomingReturns.length;
    const estimatedCount = upcomingReturns.filter(b => b.isEstimated).length;
    const confirmedCount = totalReturns - estimatedCount;

    const result = {
      success: true,
      forecast: forecast.filter(slot => slot.expectedReturns > 0),
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
        modelsRegistered: Object.keys(require('mongoose').models),
        processedBookings: {
          totalActive: allActiveBookings.length,
          withProcessedTimes: processedBookings.length,
          inTimeWindow: upcomingReturns.length,
          totalSlots: forecast.length,
          slotsWithReturns: forecast.filter(s => s.expectedReturns > 0).length
        }
      }
    };
    
    console.log('🎯 Final result summary:', {
      totalBookings: allActiveBookings.length,
      upcomingReturns: totalReturns,
      forecastSlots: forecast.filter(s => s.expectedReturns > 0).length
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ Fleet forecast API error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate fleet forecast',
        details: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        modelsRegistered: Object.keys(require('mongoose').models || {})
      },
      { status: 500 }
    );
  }
}

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