// src/app/api/admin/recalculate-revenue/route.js
import connectDB from '@/lib/db';
import DailyOperations from '@/models/DailyOperations';
import Booking from '@/models/Booking';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    await connectDB();
    
    // Simple analysis - check recent operations for revenue issues
    const recentOps = await DailyOperations.find({
      'dailySummary.totalBookings': { $gt: 0 }
    }).sort({ date: -1 }).limit(10);
    
    const analysis = [];
    
    for (const op of recentOps) {
      // Get bookings for this day
      const dayStart = new Date(op.date);
      const dayEnd = new Date(op.date);
      dayEnd.setDate(dayEnd.getDate() + 1);
      
      const allBookings = await Booking.find({
        createdAt: { $gte: dayStart, $lt: dayEnd }
      });
      
      const completedBookings = allBookings.filter(b => b.status === 'completed');
      const cancelledBookings = allBookings.filter(b => b.status === 'cancelled');
      
      // Calculate correct revenue (completed only)
      const correctRevenue = completedBookings.reduce((sum, booking) => 
        sum + (booking.finalAmount || booking.baseAmount || 0), 0);
      
      // Calculate cancelled revenue (the problem)
      const cancelledRevenue = cancelledBookings.reduce((sum, booking) => 
        sum + (booking.finalAmount || booking.baseAmount || 0), 0);
      
      const currentRevenue = op.dailySummary?.totalRevenue || 0;
      const difference = currentRevenue - correctRevenue;
      
      analysis.push({
        date: op.date.toISOString().split('T')[0],
        currentRevenue,
        correctRevenue,
        difference,
        cancelledRevenue,
        totalBookings: allBookings.length,
        completedBookings: completedBookings.length,
        cancelledBookings: cancelledBookings.length,
        needsFix: Math.abs(difference) > 0.01
      });
    }
    
    const totalDifference = analysis.reduce((sum, a) => sum + a.difference, 0);
    const needsFixCount = analysis.filter(a => a.needsFix).length;
    
    return NextResponse.json({
      success: true,
      summary: {
        operationsChecked: analysis.length,
        operationsNeedingFix: needsFixCount,
        totalOverstatement: Math.round(totalDifference * 100) / 100
      },
      details: analysis
    });
    
  } catch (error) {
    console.error('Revenue analysis error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    await connectDB();
    
    console.log('🔧 Starting revenue recalculation...');
    
    // Get all daily operations with bookings
    const operations = await DailyOperations.find({
      'dailySummary.totalBookings': { $gt: 0 }
    }).sort({ date: 1 });
    
    console.log(`📊 Found ${operations.length} operations to check`);
    
    let fixedCount = 0;
    let totalAdjustment = 0;
    const results = [];
    
    for (const op of operations) {
      try {
        const dateStr = op.date.toISOString().split('T')[0];
        
        // Get bookings for this day
        const dayStart = new Date(op.date);
        const dayEnd = new Date(op.date);
        dayEnd.setDate(dayEnd.getDate() + 1);
        
        const allBookings = await Booking.find({
          createdAt: { $gte: dayStart, $lt: dayEnd }
        });
        
        // Separate by status
        const completedBookings = allBookings.filter(b => b.status === 'completed');
        const activeBookings = allBookings.filter(b => b.status === 'active');
        const cancelledBookings = allBookings.filter(b => b.status === 'cancelled');
        
        // Calculate correct revenue (completed bookings only)
        const newRevenue = completedBookings.reduce((sum, booking) => 
          sum + (booking.finalAmount || booking.baseAmount || 0), 0);
        
        const oldRevenue = op.dailySummary.totalRevenue || 0;
        const adjustment = newRevenue - oldRevenue;
        
        // Update the daily summary with correct values
        op.dailySummary.totalRevenue = newRevenue;
        op.dailySummary.totalBookings = allBookings.length;
        op.dailySummary.completedBookings = completedBookings.length;
        op.dailySummary.activeBookings = activeBookings.length;
        op.dailySummary.cancelledBookings = cancelledBookings.length;
        
        // Recalculate average booking value (based on completed bookings only)
        if (completedBookings.length > 0) {
          op.dailySummary.averageBookingValue = 
            Math.round((newRevenue / completedBookings.length) * 100) / 100;
        } else {
          op.dailySummary.averageBookingValue = 0;
        }
        
        // Save changes
        await op.save();
        
        if (Math.abs(adjustment) > 0.01) {
          fixedCount++;
          totalAdjustment += adjustment;
          console.log(`📅 ${dateStr}: ₹${oldRevenue} → ₹${newRevenue} (${adjustment >= 0 ? '+' : ''}₹${Math.round(adjustment)})`);
        }
        
        results.push({
          date: dateStr,
          oldRevenue,
          newRevenue,
          adjustment,
          completedBookings: completedBookings.length,
          cancelledBookings: cancelledBookings.length,
          status: 'success'
        });
        
      } catch (error) {
        console.error(`❌ Error fixing ${op.date}:`, error.message);
        results.push({
          date: op.date.toISOString().split('T')[0],
          error: error.message,
          status: 'error'
        });
      }
    }
    
    console.log(`✅ Recalculation completed!`);
    console.log(`🔧 Fixed operations: ${fixedCount}`);
    console.log(`💰 Total adjustment: ₹${Math.round(totalAdjustment)}`);
    
    return NextResponse.json({
      success: true,
      message: 'Revenue recalculation completed',
      summary: {
        totalOperationsProcessed: operations.length,
        operationsWithChanges: fixedCount,
        totalRevenueAdjustment: Math.round(totalAdjustment * 100) / 100
      },
      results: results.slice(-5) // Show last 5 for brevity
    });
    
  } catch (error) {
    console.error('❌ Revenue recalculation failed:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}