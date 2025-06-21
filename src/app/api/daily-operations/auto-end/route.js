import connectDB from '@/lib/db';
import DailyOperations from '@/models/DailyOperations';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
      await connectDB();
      
      // This endpoint is called by a cron job or scheduler at midnight
      const now = new Date();
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      
      // Find today's operation that hasn't been ended
      const todaysOperation = await DailyOperations.findOne({
        date: today,
        dayStarted: true,
        dayEnded: false
      });
      
      if (!todaysOperation) {
        return NextResponse.json({
          success: true,
          message: 'No active day to end'
        });
      }
      
      await todaysOperation.endDay('System Auto-End', 'Automatically ended at midnight', true);
      
      return NextResponse.json({
        success: true,
        message: 'Day ended automatically',
        operation: todaysOperation
      });
      
    } catch (error) {
      console.error('Auto-end day API error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  }