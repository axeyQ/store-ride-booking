import connectDB from '@/lib/db';
import Vehicle from '@/models/Vehicle';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    await connectDB();
    const availableVehicles = await Vehicle.find({ status: 'available' }).sort({ type: 1, model: 1 });
    return NextResponse.json({ success: true, vehicles: availableVehicles });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}