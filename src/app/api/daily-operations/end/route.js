import connectDB from '@/lib/db';
import DailyOperations from '@/models/DailyOperations';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
      await connectDB();
      const body = await request.json();
      const { staffName, notes = '', isAuto = false } = body;
      
      if (!staffName && !isAuto) {
        return NextResponse.json(
          { success: false, error: 'Staff name is required' },
          { status: 400 }
        );
      }
      
      const todaysOperation = await DailyOperations.getTodaysOperation();
      
      if (!todaysOperation.dayStarted) {
        return NextResponse.json(
          { success: false, error: 'Day has not been started yet' },
          { status: 400 }
        );
      }
      
      if (todaysOperation.dayEnded) {
        return NextResponse.json(
          { success: false, error: 'Day has already been ended' },
          { status: 400 }
        );
      }
      
      await todaysOperation.endDay(staffName || 'System Auto-End', notes, isAuto);
      
      return NextResponse.json({
        success: true,
        message: isAuto ? 'Day ended automatically' : 'Day ended successfully',
        operation: todaysOperation,
        summary: todaysOperation.dailySummary
      });
      
    } catch (error) {
      console.error('End day API error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  }