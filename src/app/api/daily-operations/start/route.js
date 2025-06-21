import connectDB from '@/lib/db';
import DailyOperations from '@/models/DailyOperations';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
      await connectDB();
      const body = await request.json();
      const { staffName, notes = '' } = body;
      
      if (!staffName) {
        return NextResponse.json(
          { success: false, error: 'Staff name is required' },
          { status: 400 }
        );
      }
      
      const todaysOperation = await DailyOperations.getTodaysOperation();
      
      if (todaysOperation.dayStarted && todaysOperation.status === 'in_progress') {
        return NextResponse.json(
          { success: false, error: 'Day has already been started' },
          { status: 400 }
        );
      }
      
      await todaysOperation.startDay(staffName, notes);
      
      return NextResponse.json({
        success: true,
        message: 'Day started successfully',
        operation: todaysOperation
      });
      
    } catch (error) {
      console.error('Start day API error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  }