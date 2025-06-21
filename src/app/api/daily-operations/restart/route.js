import connectDB from '@/lib/db';
import DailyOperations from '@/models/DailyOperations';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
      await connectDB();
      const body = await request.json();
      const { staffName, reason = '' } = body;
      
      if (!staffName) {
        return NextResponse.json(
          { success: false, error: 'Staff name is required' },
          { status: 400 }
        );
      }
      
      const todaysOperation = await DailyOperations.getTodaysOperation();
      
      if (!todaysOperation.dayEnded) {
        return NextResponse.json(
          { success: false, error: 'Day has not been ended yet' },
          { status: 400 }
        );
      }
      
      await todaysOperation.restartDay(staffName, reason);
      
      return NextResponse.json({
        success: true,
        message: 'Day restarted successfully',
        operation: todaysOperation
      });
      
    } catch (error) {
      console.error('Restart day API error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  }
  