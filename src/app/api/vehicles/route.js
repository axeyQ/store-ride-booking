import connectDB from '@/lib/db';
import Vehicle from '@/models/Vehicle';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    await connectDB();
    const vehicles = await Vehicle.find({}).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, vehicles });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();
    const vehicle = new Vehicle(body);
    await vehicle.save();
    return NextResponse.json({ success: true, vehicle });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}