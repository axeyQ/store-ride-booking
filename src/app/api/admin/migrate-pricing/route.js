// /src/app/api/admin/migrate-pricing/route.js
import connectDB from '@/lib/db';
import Booking from '@/models/Booking';
import DailyOperations from '@/models/DailyOperations';
import { calculateAdvancedPricing } from '@/lib/pricing';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const dryRun = searchParams.get('dryRun') === 'true';
    const onlyCompleted = searchParams.get('onlyCompleted') !== 'false';
    
    console.log(`🔄 Starting pricing migration ${dryRun ? '(DRY RUN)' : '(LIVE)'}`);
    
    // Get all bookings that need recalculation
    const query = onlyCompleted 
      ? { status: 'completed', startTime: { $exists: true }, endTime: { $exists: true } }
      : { startTime: { $exists: true }, $or: [{ endTime: { $exists: true } }, { status: 'active' }] };
    
    const bookings = await Booking.find(query).sort({ createdAt: 1 });
    
    console.log(`📊 Found ${bookings.length} bookings to process`);
    
    let updated = 0;
    let errors = 0;
    let totalOldAmount = 0;
    let totalNewAmount = 0;
    let changes = [];
    
    // Process each booking
    for (const booking of bookings) {
      try {
        const startTime = new Date(booking.startTime);
        const endTime = booking.endTime ? new Date(booking.endTime) : new Date();
        
        // Skip bookings with invalid times
        if (endTime <= startTime) {
          console.log(`⚠️ Skipping ${booking.bookingId}: Invalid time range`);
          continue;
        }
        
        // Calculate new amount using advanced pricing
        const advancedResult = await calculateAdvancedPricing(startTime, endTime);
        const newAmount = advancedResult.totalAmount;
        const oldAmount = booking.finalAmount || booking.baseAmount || 0;
        
        // Track totals
        totalOldAmount += oldAmount;
        totalNewAmount += newAmount;
        
        // Only update if there's a difference
        if (Math.abs(newAmount - oldAmount) > 0.01) {
          const change = {
            bookingId: booking.bookingId,
            customerId: booking.customerId,
            vehicleId: booking.vehicleId,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            duration: `${advancedResult.totalMinutes} minutes`,
            oldAmount,
            newAmount,
            difference: newAmount - oldAmount,
            breakdown: advancedResult.breakdown || [],
            summary: advancedResult.summary || '',
            date: new Date(booking.createdAt).toISOString().split('T')[0]
          };
          
          changes.push(change);
          
          // Update the booking if not dry run
          if (!dryRun) {
            booking.finalAmount = newAmount;
            booking.baseAmount = newAmount; // Also update baseAmount for consistency
            
            // Store the pricing breakdown for future reference
            booking.pricingBreakdown = advancedResult.breakdown;
            booking.advancedPricingSummary = advancedResult.summary;
            booking.pricingMigratedAt = new Date();
            
            await booking.save();
            updated++;
          }
          
          console.log(`📝 ${booking.bookingId}: ₹${oldAmount} → ₹${newAmount} (${newAmount > oldAmount ? '+' : ''}₹${(newAmount - oldAmount).toFixed(2)})`);
        }
        
      } catch (error) {
        console.error(`❌ Error processing ${booking.bookingId}:`, error);
        errors++;
      }
    }
    
    // Now recalculate daily operations summaries
    const dailyOpsUpdated = await recalculateDailyOperations(dryRun);
    
    // Prepare response
    const response = {
      success: true,
      migration: {
        dryRun,
        processedBookings: bookings.length,
        updatedBookings: dryRun ? changes.length : updated,
        errors,
        totalChanges: changes.length,
        financial: {
          oldTotal: totalOldAmount,
          newTotal: totalNewAmount,
          difference: totalNewAmount - totalOldAmount,
          percentageChange: totalOldAmount > 0 ? ((totalNewAmount - totalOldAmount) / totalOldAmount * 100) : 0
        },
        dailyOperations: dailyOpsUpdated
      },
      changes: changes.slice(0, 100), // Limit response size, send first 100 changes
      summary: {
        message: dryRun 
          ? `DRY RUN: Found ${changes.length} bookings that would be updated`
          : `Successfully updated ${updated} bookings and ${dailyOpsUpdated.updated} daily operations`,
        biggestIncrease: changes.reduce((max, change) => 
          change.difference > (max?.difference || 0) ? change : max, null),
        biggestDecrease: changes.reduce((min, change) => 
          change.difference < (min?.difference || 0) ? change : min, null),
        totalRevenueDifference: totalNewAmount - totalOldAmount
      }
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

// Helper function to recalculate daily operations summaries
async function recalculateDailyOperations(dryRun = false) {
  try {
    const operations = await DailyOperations.find({ status: 'ended' });
    let updated = 0;
    let totalOldRevenue = 0;
    let totalNewRevenue = 0;
    
    for (const operation of operations) {
      // Get bookings for this day
      const dayStart = new Date(operation.date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);
      
      // Only count bookings within business hours if available
      let bookingQuery = {
        createdAt: { $gte: dayStart, $lt: dayEnd },
        status: 'completed'
      };
      
      if (operation.startTime && operation.endTime) {
        bookingQuery.createdAt = { 
          $gte: operation.startTime, 
          $lt: operation.endTime 
        };
      }
      
      const dayBookings = await Booking.find(bookingQuery);
      
      // Calculate new totals
      const newTotalRevenue = dayBookings.reduce((sum, booking) => 
        sum + (booking.finalAmount || booking.baseAmount || 0), 0);
      
      const oldRevenue = operation.dailySummary?.totalRevenue || 0;
      
      totalOldRevenue += oldRevenue;
      totalNewRevenue += newTotalRevenue;
      
      // Update if there's a difference
      if (Math.abs(newTotalRevenue - oldRevenue) > 0.01) {
        if (!dryRun) {
          operation.dailySummary.totalRevenue = newTotalRevenue;
          
          // Recalculate revenue per hour
          if (operation.dailySummary.operatingHours > 0) {
            operation.dailySummary.revenuePerHour = 
              Math.round((newTotalRevenue / operation.dailySummary.operatingHours) * 100) / 100;
          }
          
          operation.pricingMigratedAt = new Date();
          await operation.save();
          updated++;
        }
        
        console.log(`📅 ${operation.date.toISOString().split('T')[0]}: ₹${oldRevenue} → ₹${newTotalRevenue}`);
      }
    }
    
    return {
      processed: operations.length,
      updated: dryRun ? -1 : updated, // -1 indicates dry run
      oldTotal: totalOldRevenue,
      newTotal: totalNewRevenue,
      difference: totalNewRevenue - totalOldRevenue
    };
    
  } catch (error) {
    console.error('Error recalculating daily operations:', error);
    return { error: error.message };
  }
}

// GET endpoint to check migration status
export async function GET() {
  try {
    await connectDB();
    
    // Check how many bookings have been migrated
    const totalBookings = await Booking.countDocuments({ 
      status: 'completed',
      startTime: { $exists: true },
      endTime: { $exists: true }
    });
    
    const migratedBookings = await Booking.countDocuments({ 
      pricingMigratedAt: { $exists: true }
    });
    
    const totalOperations = await DailyOperations.countDocuments({ 
      status: 'ended' 
    });
    
    const migratedOperations = await DailyOperations.countDocuments({ 
      pricingMigratedAt: { $exists: true }
    });
    
    return NextResponse.json({
      success: true,
      status: {
        bookings: {
          total: totalBookings,
          migrated: migratedBookings,
          pending: totalBookings - migratedBookings,
          percentage: totalBookings > 0 ? Math.round((migratedBookings / totalBookings) * 100) : 0
        },
        operations: {
          total: totalOperations,
          migrated: migratedOperations,
          pending: totalOperations - migratedOperations,
          percentage: totalOperations > 0 ? Math.round((migratedOperations / totalOperations) * 100) : 0
        },
        lastMigration: await getLastMigrationDate()
      }
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

async function getLastMigrationDate() {
  try {
    const lastMigratedBooking = await Booking.findOne(
      { pricingMigratedAt: { $exists: true } },
      { pricingMigratedAt: 1 }
    ).sort({ pricingMigratedAt: -1 });
    
    return lastMigratedBooking?.pricingMigratedAt || null;
  } catch (error) {
    return null;
  }
}