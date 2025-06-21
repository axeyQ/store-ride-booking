import connectDB from '@/lib/db';
import DailyOperations from '@/models/DailyOperations';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || 'today';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    
    if (range === 'today') {
      const todaysOperation = await DailyOperations.getTodaysOperation();
      return NextResponse.json({
        success: true,
        operation: todaysOperation
      });
    }
    
    // Get historical operations
    const skip = (page - 1) * limit;
    let query = {};
    
    const now = new Date();
    switch (range) {
      case 'week':
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        query.date = { $gte: weekAgo };
        break;
      case 'month':
        const monthAgo = new Date(now);
        monthAgo.setDate(now.getDate() - 30);
        query.date = { $gte: monthAgo };
        break;
      case 'all':
        // No date filter
        break;
    }
    
    const [operations, total] = await Promise.all([
      DailyOperations.find(query)
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit),
      DailyOperations.countDocuments(query)
    ]);
    
    return NextResponse.json({
      success: true,
      operations,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
    
  } catch (error) {
    console.error('Daily operations GET error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}






