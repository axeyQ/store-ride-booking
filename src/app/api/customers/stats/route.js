import connectDB from '@/lib/db';
import Customer from '@/models/Customer';
import Booking from '@/models/Booking';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    await connectDB();
    
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Total customers
    const totalCustomers = await Customer.countDocuments();
    
    // New customers this month
    const newThisMonth = await Customer.countDocuments({
      createdAt: { $gte: monthStart }
    });
    
    // Active customers (had a booking in last 30 days)
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);
    
    const activeCustomerIds = await Booking.distinct('customerId', {
      createdAt: { $gte: thirtyDaysAgo }
    });
    const activeCustomers = activeCustomerIds.length;
    
    // Top customer (most bookings)
    const topCustomerAgg = await Customer.aggregate([
      {
        $sort: { totalBookings: -1 }
      },
      {
        $limit: 1
      }
    ]);
    
    const topCustomer = topCustomerAgg.length > 0 ? topCustomerAgg[0] : null;
    
    return NextResponse.json({
      success: true,
      stats: {
        total: totalCustomers,
        newThisMonth,
        activeCustomers,
        topCustomer: topCustomer ? {
          name: topCustomer.name,
          totalBookings: topCustomer.totalBookings
        } : null
      }
    });
  } catch (error) {
    console.error('Customer stats API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}