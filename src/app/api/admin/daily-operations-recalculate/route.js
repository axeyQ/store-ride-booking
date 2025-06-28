import connectDB from '@/lib/db';
import DailyOperations from '@/models/DailyOperations';
import Booking from '@/models/Booking';
import { NextResponse } from 'next/server';
import { calculateCurrentAmount } from '@/lib/pricing';

// ✅ Custom package definitions
const CUSTOM_PACKAGES = {
  half_day: { 
    label: 'Half Day', 
    price: 800, 
    maxHours: 12, 
    icon: '🌅',
    color: 'orange'
  },
  full_day: { 
    label: 'Full Day', 
    price: 1200, 
    maxHours: 24, 
    icon: '☀️',
    color: 'yellow'
  },
  night: { 
    label: 'Night Package', 
    price: 600, 
    maxHours: 11, 
    icon: '🌙',
    color: 'purple'
  }
};

export async function POST(request) {
  try {
    await connectDB();
    
    const { dryRun = false } = await request.json();
    
    console.log(`🔧 Starting daily operations revenue recalculation ${dryRun ? '(DRY RUN)' : ''}...`);
    
    // Get all daily operations that have ended
    const operations = await DailyOperations.find({
      status: 'ended',
      'dailySummary.totalBookings': { $gt: 0 }
    }).sort({ date: 1 });
    
    console.log(`📊 Found ${operations.length} completed operations to recalculate`);
    
    let recalculatedCount = 0;
    let totalOldRevenue = 0;
    let totalNewRevenue = 0;
    const results = [];
    
    for (const operation of operations) {
      try {
        const dateStr = operation.date.toISOString().split('T')[0];
        
        // Get bookings for this day within business hours if available
        let bookingQuery = {
          status: { $ne: 'cancelled' } // Exclude cancelled bookings
        };
        
        if (operation.startTime && operation.endTime) {
          // Use business hours
          bookingQuery.createdAt = { 
            $gte: operation.startTime, 
            $lt: operation.endTime 
          };
        } else {
          // Fallback to entire day
          const dayStart = new Date(operation.date);
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(dayStart);
          dayEnd.setDate(dayEnd.getDate() + 1);
          bookingQuery.createdAt = { $gte: dayStart, $lt: dayEnd };
        }
        
        const dayBookings = await Booking.find(bookingQuery);
        
        console.log(`📅 ${dateStr}: Processing ${dayBookings.length} bookings`);
        
        // ✅ Calculate revenue using advanced pricing calculator
        let newTotalRevenue = 0;
        let customRevenue = 0;
        let advancedRevenue = 0;
        let customCount = 0;
        let advancedCount = 0;
        
        for (const booking of dayBookings) {
          let bookingRevenue = 0;
          
          if (booking.isCustomBooking) {
            // Custom booking: use package rates
            customCount++;
            const packageType = booking.customBookingType || 'half_day';
            const packageInfo = CUSTOM_PACKAGES[packageType];
            
            if (packageInfo) {
              bookingRevenue = packageInfo.price;
              customRevenue += bookingRevenue;
              console.log(`📦 Custom ${booking.bookingId}: ₹${bookingRevenue} (${packageType})`);
            } else {
              console.log(`❌ Unknown package type for booking ${booking.bookingId}: ${booking.customBookingType}`);
            }
          } else {
            // Advanced pricing booking: use calculator
            advancedCount++;
            try {
              const result = await calculateCurrentAmount(booking);
              bookingRevenue = typeof result === 'number' ? result : result.amount;
              advancedRevenue += bookingRevenue;
              console.log(`⚡ Advanced ${booking.bookingId}: ₹${bookingRevenue} (calculated)`);
            } catch (error) {
              console.error(`❌ Error calculating revenue for booking ${booking.bookingId}:`, error);
              // Fallback to simple calculation
              bookingRevenue = calculateSimpleAmount(booking);
              advancedRevenue += bookingRevenue;
              console.log(`⚡ Advanced ${booking.bookingId}: ₹${bookingRevenue} (fallback)`);
            }
          }
          
          newTotalRevenue += bookingRevenue;
        }
        
        const oldRevenue = operation.dailySummary?.totalRevenue || 0;
        const difference = newTotalRevenue - oldRevenue;
        
        totalOldRevenue += oldRevenue;
        totalNewRevenue += newTotalRevenue;
        
        // Update if there's a significant difference
        if (Math.abs(difference) > 0.01) {
          if (!dryRun) {
            // Update the daily summary with corrected values
            operation.dailySummary.totalRevenue = Math.round(newTotalRevenue);
            
            // Recalculate revenue per hour
            if (operation.dailySummary.operatingHours > 0) {
              operation.dailySummary.revenuePerHour = 
                Math.round((newTotalRevenue / operation.dailySummary.operatingHours) * 100) / 100;
            }
            
            // Recalculate average booking value
            if (dayBookings.length > 0) {
              operation.dailySummary.averageBookingValue = 
                Math.round((newTotalRevenue / dayBookings.length) * 100) / 100;
            }
            
            // Mark as recalculated
            operation.advancedPricingRecalculatedAt = new Date();
            await operation.save();
            recalculatedCount++;
          }
          
          console.log(`${dryRun ? '📊 DRY RUN' : '✅ UPDATED'} ${dateStr}: ₹${oldRevenue} → ₹${Math.round(newTotalRevenue)} (${difference >= 0 ? '+' : ''}₹${Math.round(difference)})`);
        }
        
        results.push({
          date: dateStr,
          oldRevenue: Math.round(oldRevenue),
          newRevenue: Math.round(newTotalRevenue),
          difference: Math.round(difference),
          customBookings: customCount,
          advancedBookings: advancedCount,
          customRevenue: Math.round(customRevenue),
          advancedRevenue: Math.round(advancedRevenue),
          totalBookings: dayBookings.length,
          updated: !dryRun && Math.abs(difference) > 0.01
        });
        
      } catch (error) {
        console.error(`❌ Error processing operation ${operation.date}:`, error);
        results.push({
          date: operation.date.toISOString().split('T')[0],
          error: error.message,
          status: 'error'
        });
      }
    }
    
    const totalDifference = totalNewRevenue - totalOldRevenue;
    
    console.log(`${dryRun ? '📊 DRY RUN COMPLETED' : '✅ RECALCULATION COMPLETED'}!`);
    console.log(`📅 Operations processed: ${operations.length}`);
    console.log(`🔧 Operations ${dryRun ? 'needing update' : 'updated'}: ${recalculatedCount}`);
    console.log(`💰 Total revenue change: ₹${Math.round(totalDifference)}`);
    
    return NextResponse.json({
      success: true,
      dryRun,
      message: dryRun 
        ? 'Dry run completed - no data was modified'
        : 'Daily operations revenue recalculation completed',
      summary: {
        operationsProcessed: operations.length,
        operationsUpdated: dryRun ? 0 : recalculatedCount,
        operationsNeedingUpdate: recalculatedCount,
        oldTotalRevenue: Math.round(totalOldRevenue),
        newTotalRevenue: Math.round(totalNewRevenue),
        totalRevenueDifference: Math.round(totalDifference)
      },
      results: results.slice(-10) // Show last 10 for brevity
    });
    
  } catch (error) {
    console.error('❌ Daily operations recalculation failed:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Helper function for simple fallback calculation
function calculateSimpleAmount(booking) {
  const startTime = new Date(booking.startTime);
  const endTime = booking.endTime ? new Date(booking.endTime) : new Date();
  const diffMs = endTime - startTime;
  const hours = Math.ceil(diffMs / (1000 * 60 * 60));
  return Math.max(hours * 80, 80); // Minimum ₹80
}