// src/app/api/admin/cleanup-duplicates/route.js
import connectDB from '@/lib/db';
import DailyOperations from '@/models/DailyOperations';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    console.log('🔧 Starting daily operations cleanup...');
    await connectDB();
    
    // Step 1: Find all duplicate groups using simpler aggregation
    console.log('📊 Finding duplicate groups...');
    const allOperations = await DailyOperations.find({}).sort({ date: 1, createdAt: 1 });
    
    // Group by date string to find duplicates
    const dateGroups = {};
    allOperations.forEach(op => {
      const dateKey = op.date.toISOString().split('T')[0]; // YYYY-MM-DD format
      if (!dateGroups[dateKey]) {
        dateGroups[dateKey] = [];
      }
      dateGroups[dateKey].push(op);
    });
    
    // Find groups with duplicates
    const duplicateGroups = Object.entries(dateGroups).filter(([date, ops]) => ops.length > 1);
    
    console.log(`📋 Found ${duplicateGroups.length} duplicate groups out of ${Object.keys(dateGroups).length} total dates`);
    
    let totalRemoved = 0;
    const cleanupResults = [];
    
    // Step 2: Process each duplicate group
    for (const [dateKey, operations] of duplicateGroups) {
      console.log(`🗓️ Processing date: ${dateKey} (${operations.length} records)`);
      
      try {
        // Sort operations by priority: ended > in_progress > not_started
        const priorityOrder = { 'ended': 3, 'in_progress': 2, 'not_started': 1 };
        
        operations.sort((a, b) => {
          // Primary: Status priority
          const aPriority = priorityOrder[a.status] || 0;
          const bPriority = priorityOrder[b.status] || 0;
          if (aPriority !== bPriority) return bPriority - aPriority;
          
          // Secondary: Most data (revenue, bookings, etc.)
          const aData = (a.dailySummary?.totalRevenue || 0) + (a.dailySummary?.totalBookings || 0);
          const bData = (b.dailySummary?.totalRevenue || 0) + (b.dailySummary?.totalBookings || 0);
          if (aData !== bData) return bData - aData;
          
          // Tertiary: Most recent creation
          return new Date(b.createdAt) - new Date(a.createdAt);
        });
        
        const keepOperation = operations[0];
        const removeOperations = operations.slice(1);
        
        console.log(`  ✅ Keeping: ${keepOperation._id} (${keepOperation.status})`);
        console.log(`  ❌ Removing: ${removeOperations.length} operations`);
        
        // Remove duplicate operations one by one
        for (const removeOp of removeOperations) {
          try {
            await DailyOperations.findByIdAndDelete(removeOp._id);
            totalRemoved++;
            console.log(`    🗑️ Removed: ${removeOp._id} (${removeOp.status})`);
          } catch (deleteError) {
            console.error(`    ❌ Failed to delete ${removeOp._id}:`, deleteError.message);
          }
        }
        
        cleanupResults.push({
          date: dateKey,
          kept: keepOperation._id,
          removed: removeOperations.length,
          status: 'success'
        });
        
      } catch (groupError) {
        console.error(`❌ Error processing group ${dateKey}:`, groupError.message);
        cleanupResults.push({
          date: dateKey,
          error: groupError.message,
          status: 'error'
        });
      }
    }
    
    // Step 3: Verify cleanup
    console.log('🔍 Verifying cleanup...');
    const finalCount = await DailyOperations.countDocuments();
    
    // Check for remaining duplicates
    const finalOperations = await DailyOperations.find({});
    const finalDateGroups = {};
    finalOperations.forEach(op => {
      const dateKey = op.date.toISOString().split('T')[0];
      if (!finalDateGroups[dateKey]) {
        finalDateGroups[dateKey] = [];
      }
      finalDateGroups[dateKey].push(op);
    });
    
    const remainingDuplicates = Object.entries(finalDateGroups).filter(([date, ops]) => ops.length > 1);
    
    // Step 4: Try to ensure unique index (non-blocking)
    try {
      await DailyOperations.collection.createIndex({ date: 1 }, { unique: true });
      console.log('✅ Unique index ensured');
    } catch (indexError) {
      console.log('⚠️ Index creation skipped:', indexError.message);
    }
    
    const response = {
      success: true,
      message: `Cleanup completed successfully`,
      details: {
        duplicateGroupsFound: duplicateGroups.length,
        totalOperationsRemoved: totalRemoved,
        finalRecordCount: finalCount,
        remainingDuplicateGroups: remainingDuplicates.length,
        cleanupResults: cleanupResults
      }
    };
    
    if (remainingDuplicates.length > 0) {
      response.warning = `${remainingDuplicates.length} duplicate groups still exist`;
      response.details.remainingDuplicates = remainingDuplicates.map(([date, ops]) => ({
        date,
        count: ops.length,
        ids: ops.map(op => op._id)
      }));
    }
    
    console.log('✅ Cleanup completed:', response.details);
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    await connectDB();
    
    // Simple duplicate check using basic queries
    const allOperations = await DailyOperations.find({}).sort({ date: 1 });
    
    // Group by date
    const dateGroups = {};
    allOperations.forEach(op => {
      const dateKey = op.date.toISOString().split('T')[0];
      if (!dateGroups[dateKey]) {
        dateGroups[dateKey] = [];
      }
      dateGroups[dateKey].push({
        _id: op._id,
        status: op.status,
        date: op.date,
        createdAt: op.createdAt
      });
    });
    
    // Find duplicates
    const duplicates = Object.entries(dateGroups)
      .filter(([date, ops]) => ops.length > 1)
      .map(([date, ops]) => ({
        date: new Date(date).toDateString(),
        count: ops.length,
        records: ops
      }));
    
    return NextResponse.json({
      success: true,
      totalRecords: allOperations.length,
      uniqueDates: Object.keys(dateGroups).length,
      duplicateGroups: duplicates.length,
      duplicates: duplicates
    });
    
  } catch (error) {
    console.error('❌ Duplicate check failed:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}