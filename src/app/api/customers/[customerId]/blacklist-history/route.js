import connectDB from '@/lib/db';
import BlacklistHistory from '@/models/BlacklistHistory';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
    try {
      await connectDB();
      const { customerId } = params;
      const { searchParams } = new URL(request.url);
      const limit = parseInt(searchParams.get('limit') || '10');
      
      const history = await BlacklistHistory.getCustomerHistory(customerId, limit);
      
      return NextResponse.json({
        success: true,
        history
      });
      
    } catch (error) {
      console.error('Blacklist history API error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  }