import connectDB from '@/lib/db';
import Customer from '@/models/Customer';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    await connectDB();
    const customers = await Customer.find({}).sort({ lastVisit: -1 });
    return NextResponse.json({ success: true, customers });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
