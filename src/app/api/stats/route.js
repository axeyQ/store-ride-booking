import connectDB from '@/lib/db';
import Booking from '@/models/Booking';
import Vehicle from '@/models/Vehicle';
import Customer from '@/models/Customer';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    await connectDB();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Today's revenue
    const todayBookings = await Booking.find({
      createdAt: { $gte: today, $lt: tomorrow },
      status: { $in: ['completed', 'active'] }
    });
    
    const todayRevenue = todayBookings.reduce((sum, booking) => {
      return sum + (booking.finalAmount || booking.baseAmount);
    }, 0);
    
    // Active bookings count
    const activeBookings = await Booking.countDocuments({ status: 'active' });
    
    // Available vehicles count
    const availableVehicles = await Vehicle.countDocuments({ status: 'available' });
    
    // Total customers
    const totalCustomers = await Customer.countDocuments();
    
    // Total vehicles
    const totalVehicles = await Vehicle.countDocuments();
    
    return NextResponse.json({
      success: true,
      stats: {
        todayRevenue,
        activeBookings,
        availableVehicles,
        totalCustomers,
        totalVehicles
      }
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}