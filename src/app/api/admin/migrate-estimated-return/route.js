import connectDB from '@/lib/db';
import Booking from '@/models/Booking';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const dryRun = searchParams.get('dryRun') === 'true';
    
    console.log(`🔄 Starting estimated return time migration ${dryRun ? '(DRY RUN)' : '(LIVE)'}`);
    
    const bookingsToUpdate = await Booking.find({ 
      estimatedReturnTime: { $exists: false }
    });
    
    console.log(`📊 Found ${bookingsToUpdate.length} bookings to migrate`);
    
    if (dryRun) {
      // Analyze what would be updated
      let customCount = 0;
      let regularCount = 0;
      
      for (const booking of bookingsToUpdate) {
        if (booking.isCustomBooking && booking.endTime) {
          customCount++;
        } else {
          regularCount++;
        }
      }
      
      return NextResponse.json({
        success: true,
        message: `DRY RUN: Would update ${bookingsToUpdate.length} bookings`,
        breakdown: {
          total: bookingsToUpdate.length,
          customBookings: customCount,
          regularBookings: regularCount
        }
      });
    }
    
    let updated = 0;
    let customBookings = 0;
    let regularBookings = 0;
    let errors = 0;
    
    for (const booking of bookingsToUpdate) {
      try {
        let estimatedReturn;
        
        if (booking.isCustomBooking && booking.endTime) {
          // For custom bookings: use the package end time
          estimatedReturn = new Date(booking.endTime);
          customBookings++;
        } else {
          // For regular bookings: 2 hours from start time
          estimatedReturn = new Date(booking.startTime.getTime() + (2 * 60 * 60 * 1000));
          regularBookings++;
        }
        
        await Booking.findByIdAndUpdate(booking._id, {
          estimatedReturnTime: estimatedReturn
        });
        
        updated++;
        
        if (updated % 50 === 0) {
          console.log(`✅ Migrated ${updated} bookings...`);
        }
        
      } catch (error) {
        console.error(`❌ Error updating booking ${booking.bookingId}:`, error);
        errors++;
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Migration completed! Updated: ${updated}, Errors: ${errors}`,
      breakdown: {
        updated,
        customBookings,
        regularBookings,
        errors
      }
    });
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// GET endpoint to check migration status
export async function GET() {
  try {
    await connectDB();
    
    const totalBookings = await Booking.countDocuments();
    const bookingsWithEstimatedReturn = await Booking.countDocuments({
      estimatedReturnTime: { $exists: true }
    });
    const bookingsNeedingMigration = await Booking.countDocuments({
      estimatedReturnTime: { $exists: false }
    });
    
    return NextResponse.json({
      success: true,
      status: {
        totalBookings,
        migrated: bookingsWithEstimatedReturn,
        needsMigration: bookingsNeedingMigration,
        migrationComplete: bookingsNeedingMigration === 0
      }
    });
    
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}