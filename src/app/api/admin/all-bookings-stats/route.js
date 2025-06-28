import connectDB from '@/lib/db';
import Booking from '@/models/Booking';
import { NextResponse } from 'next/server';
import { calculateCurrentAmount } from '@/lib/pricing';

// ✅ FIXED: Custom package definitions (should match your main component)
const CUSTOM_PACKAGES = {
  half_day: { 
    label: 'Half Day', 
    price: 800, 
    maxHours: 12, 
    icon: '🌅',
    color: 'orange'
  },
  full_day: { 
    label: 'Full Day', 
    price: 1200, 
    maxHours: 24, 
    icon: '☀️',
    color: 'yellow'
  },
  night: { 
    label: 'Night Package', 
    price: 600, 
    maxHours: 11, 
    icon: '🌙',
    color: 'purple'
  }
};

export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const dateFilter = searchParams.get('dateFilter') || 'all';
    
    console.log('📊 Fetching total stats with filters:', { search, status, dateFilter });
    
    // Build query (same logic as all-bookings API)
    let query = {};
    
    // Status filter
    if (status !== 'all') {
      query.status = status;
    }
    
    // Date filter
    const now = new Date();
    switch (dateFilter) {
      case 'today':
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(todayStart);
        todayEnd.setDate(todayStart.getDate() + 1);
        query.createdAt = { $gte: todayStart, $lt: todayEnd };
        break;
      case 'week':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - 7);
        weekStart.setHours(0, 0, 0, 0);
        query.createdAt = { $gte: weekStart };
        break;
      case 'month':
        const monthStart = new Date(now);
        monthStart.setDate(now.getDate() - 30);
        monthStart.setHours(0, 0, 0, 0);
        query.createdAt = { $gte: monthStart };
        break;
    }
    
    let allBookings;
    
    if (search) {
      // Use aggregation for search across populated fields
      const customerSearchRegex = new RegExp(search, 'i');
      
      const searchPipeline = [
        {
          $lookup: {
            from: 'customers',
            localField: 'customerId',
            foreignField: '_id',
            as: 'customer'
          }
        },
        {
          $lookup: {
            from: 'vehicles',
            localField: 'vehicleId',
            foreignField: '_id',
            as: 'vehicle'
          }
        },
        {
          $unwind: '$customer'
        },
        {
          $unwind: '$vehicle'
        },
        {
          $match: {
            ...query,
            $or: [
              { 'customer.name': customerSearchRegex },
              { 'customer.phone': customerSearchRegex },
              { 'bookingId': customerSearchRegex },
              { 'vehicle.model': customerSearchRegex },
              { 'vehicle.plateNumber': customerSearchRegex }
            ]
          }
        },
        {
          $project: {
            _id: 1,
            bookingId: 1,
            startTime: 1,
            endTime: 1,
            finalAmount: 1,
            status: 1,
            isCustomBooking: 1,
            customBookingType: 1,
            customBookingLabel: 1,
            createdAt: 1
          }
        }
      ];
      
      allBookings = await Booking.aggregate(searchPipeline);
    } else {
      // Simple query without search
      allBookings = await Booking.find(query, {
        _id: 1,
        bookingId: 1,
        startTime: 1,
        endTime: 1,
        finalAmount: 1,
        status: 1,
        isCustomBooking: 1,
        customBookingType: 1,
        customBookingLabel: 1,
        createdAt: 1
      });
    }

    console.log(`📋 Found ${allBookings.length} total bookings matching filters`);

    // ✅ FIXED: Use advanced pricing calculator for all bookings
    let totalRevenue = 0;
    let customBookingCount = 0;
    let advancedBookingCount = 0;
    let customRevenue = 0;
    let advancedRevenue = 0;

    // Process each booking to get correct revenue
    for (const booking of allBookings) {
      // Skip cancelled bookings for revenue calculation
      if (booking.status === 'cancelled') {
        continue;
      }

      // ✅ Check if it's a custom booking
      if (booking.isCustomBooking) {
        customBookingCount++;
        
        // For custom bookings, use package rates
        const packageType = booking.customBookingType || 'half_day';
        const packageInfo = CUSTOM_PACKAGES[packageType];
        
        if (packageInfo) {
          const packageRevenue = packageInfo.price;
          customRevenue += packageRevenue;
          totalRevenue += packageRevenue;
          console.log(`📦 Custom booking ${booking.bookingId}: ${packageType} = ₹${packageRevenue}`);
        } else {
          console.log(`❌ Unknown custom package type for booking ${booking.bookingId}: ${booking.customBookingType}`);
        }
      } else {
        // ✅ For advanced pricing bookings, ALWAYS use the pricing calculator
        advancedBookingCount++;
        
        try {
          const result = await calculateCurrentAmount(booking);
          const bookingRevenue = typeof result === 'number' ? result : result.amount;
          
          advancedRevenue += bookingRevenue;
          totalRevenue += bookingRevenue;
          
          console.log(`⚡ Advanced booking ${booking.bookingId}: ₹${bookingRevenue} (${booking.status}) - calculated`);
        } catch (error) {
          console.error(`❌ Error calculating revenue for booking ${booking.bookingId}:`, error);
          
          // Fallback to simple calculation if advanced pricing fails
          const fallbackRevenue = calculateSimpleAmount(booking);
          advancedRevenue += fallbackRevenue;
          totalRevenue += fallbackRevenue;
          
          console.log(`⚡ Advanced booking ${booking.bookingId}: ₹${fallbackRevenue} (fallback)`);
        }
      }
    }

    // Calculate basic stats
    const stats = {
      totalBookings: allBookings.length,
      activeRentals: allBookings.filter(b => b.status === 'active').length,
      completed: allBookings.filter(b => b.status === 'completed').length,
      cancelled: allBookings.filter(b => b.status === 'cancelled').length,
      totalRevenue: Math.round(totalRevenue),
      customBookings: customBookingCount,
      advancedBookings: advancedBookingCount,
      customRevenue: Math.round(customRevenue),
      advancedRevenue: Math.round(advancedRevenue)
    };

    console.log('✅ Total stats calculated:', {
      totalBookings: stats.totalBookings,
      totalRevenue: stats.totalRevenue,
      customBookings: stats.customBookings,
      advancedBookings: stats.advancedBookings,
      filters: { search, status, dateFilter }
    });

    return NextResponse.json({
      success: true,
      stats,
      filters: { search, status, dateFilter },
      appliedFilters: Object.keys(query).length > 0 || search
    });

  } catch (error) {
    console.error('❌ All bookings stats API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Simple fallback calculation
function calculateSimpleAmount(booking) {
  const startTime = new Date(booking.startTime);
  const endTime = booking.endTime ? new Date(booking.endTime) : new Date();
  const diffMs = endTime - startTime;
  const hours = Math.ceil(diffMs / (1000 * 60 * 60));
  return Math.max(hours * 80, 80); // Minimum ₹80
}