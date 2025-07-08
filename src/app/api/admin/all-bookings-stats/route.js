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
            discountAmount: 1,        // ✅ ADD: Include discount fields
            additionalCharges: 1,     // ✅ ADD: Include additional charges
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
        discountAmount: 1,          // ✅ ADD: Include discount fields
        additionalCharges: 1,       // ✅ ADD: Include additional charges
        createdAt: 1
      });
    }

    console.log(`📋 Found ${allBookings.length} total bookings matching filters`);

    // ✅ CRITICAL FIX: Track raw amounts and adjustments separately
    let totalRevenue = 0;
    let rawTotalRevenue = 0;
    let totalDiscounts = 0;
    let totalAdditionalCharges = 0;
    let customBookingCount = 0;
    let advancedBookingCount = 0;
    let customRevenue = 0;
    let advancedRevenue = 0;
    let rawCustomRevenue = 0;
    let rawAdvancedRevenue = 0;
    let bookingsWithDiscounts = 0;
    let bookingsWithAdditionalCharges = 0;

    // Process each booking to get correct revenue
    for (const booking of allBookings) {
      // Skip cancelled bookings for revenue calculation
      if (booking.status === 'cancelled') {
        continue;
      }

      // ✅ Get stored adjustments
      const discountAmount = booking.discountAmount || 0;
      const additionalCharges = booking.additionalCharges || 0;
      
      if (discountAmount > 0) bookingsWithDiscounts++;
      if (additionalCharges > 0) bookingsWithAdditionalCharges++;
      
      totalDiscounts += discountAmount;
      totalAdditionalCharges += additionalCharges;

      // ✅ Check if it's a custom booking
      if (booking.isCustomBooking) {
        customBookingCount++;
        
        // For custom bookings, use package rates
        const packageType = booking.customBookingType || 'half_day';
        const packageInfo = CUSTOM_PACKAGES[packageType];
        
        if (packageInfo) {
          const rawPackageRevenue = packageInfo.price;
          const adjustedPackageRevenue = Math.max(0, rawPackageRevenue - discountAmount + additionalCharges);
          
          rawCustomRevenue += rawPackageRevenue;
          customRevenue += adjustedPackageRevenue;
          rawTotalRevenue += rawPackageRevenue;
          totalRevenue += adjustedPackageRevenue;
          
          console.log(`📦 Custom booking ${booking.bookingId}: ${packageType} = ₹${rawPackageRevenue} → ₹${adjustedPackageRevenue} (discount: ₹${discountAmount}, additional: ₹${additionalCharges})`);
        } else {
          console.log(`❌ Unknown custom package type for booking ${booking.bookingId}: ${booking.customBookingType}`);
        }
      } else {
        // ✅ For advanced pricing bookings, ALWAYS use the pricing calculator + apply adjustments
        advancedBookingCount++;
        
        try {
          const result = await calculateCurrentAmount(booking);
          const rawBookingRevenue = typeof result === 'number' ? result : result.amount;
          const adjustedBookingRevenue = Math.max(0, rawBookingRevenue - discountAmount + additionalCharges);
          
          rawAdvancedRevenue += rawBookingRevenue;
          advancedRevenue += adjustedBookingRevenue;
          rawTotalRevenue += rawBookingRevenue;
          totalRevenue += adjustedBookingRevenue;
          
          console.log(`⚡ Advanced booking ${booking.bookingId}: ₹${rawBookingRevenue} → ₹${adjustedBookingRevenue} (${booking.status}) - discount: ₹${discountAmount}, additional: ₹${additionalCharges}`);
        } catch (error) {
          console.error(`❌ Error calculating revenue for booking ${booking.bookingId}:`, error);
          
          // Fallback to simple calculation if advanced pricing fails
          const rawFallbackRevenue = calculateSimpleAmount(booking);
          const adjustedFallbackRevenue = Math.max(0, rawFallbackRevenue - discountAmount + additionalCharges);
          
          rawAdvancedRevenue += rawFallbackRevenue;
          advancedRevenue += adjustedFallbackRevenue;
          rawTotalRevenue += rawFallbackRevenue;
          totalRevenue += adjustedFallbackRevenue;
          
          console.log(`⚡ Advanced booking ${booking.bookingId}: ₹${rawFallbackRevenue} → ₹${adjustedFallbackRevenue} (fallback) - discount: ₹${discountAmount}, additional: ₹${additionalCharges}`);
        }
      }
    }

    // Calculate basic stats
    const stats = {
      totalBookings: allBookings.length,
      activeRentals: allBookings.filter(b => b.status === 'active').length,
      completed: allBookings.filter(b => b.status === 'completed').length,
      cancelled: allBookings.filter(b => b.status === 'cancelled').length,
      totalRevenue: Math.round(totalRevenue),               // ✅ Final revenue (with adjustments)
      rawTotalRevenue: Math.round(rawTotalRevenue),         // ✅ Raw revenue (before adjustments)
      totalDiscounts: Math.round(totalDiscounts),           // ✅ Total discounts applied
      totalAdditionalCharges: Math.round(totalAdditionalCharges), // ✅ Total additional charges
      customBookings: customBookingCount,
      advancedBookings: advancedBookingCount,
      customRevenue: Math.round(customRevenue),             // ✅ Adjusted custom revenue
      advancedRevenue: Math.round(advancedRevenue),         // ✅ Adjusted advanced revenue
      rawCustomRevenue: Math.round(rawCustomRevenue),       // ✅ Raw custom revenue
      rawAdvancedRevenue: Math.round(rawAdvancedRevenue),   // ✅ Raw advanced revenue
      bookingsWithDiscounts,                                // ✅ Count of discounted bookings
      bookingsWithAdditionalCharges,                        // ✅ Count of bookings with extra charges
      netAdjustment: Math.round(totalAdditionalCharges - totalDiscounts) // ✅ Net adjustment
    };

    console.log('✅ Total stats calculated with discount adjustments:', {
      totalBookings: stats.totalBookings,
      rawTotalRevenue: stats.rawTotalRevenue,
      totalDiscounts: stats.totalDiscounts,
      totalAdditionalCharges: stats.totalAdditionalCharges,
      finalTotalRevenue: stats.totalRevenue,
      netAdjustment: stats.netAdjustment,
      customBookings: stats.customBookings,
      advancedBookings: stats.advancedBookings,
      bookingsWithDiscounts: stats.bookingsWithDiscounts,
      filters: { search, status, dateFilter }
    });

    return NextResponse.json({
      success: true,
      stats,
      filters: { search, status, dateFilter },
      appliedFilters: Object.keys(query).length > 0 || search,
      debug: {
        calculationMethod: 'advanced_pricing_with_adjustments',
        rawTotal: stats.rawTotalRevenue,
        adjustments: {
          discounts: stats.totalDiscounts,
          additional: stats.totalAdditionalCharges,
          net: stats.netAdjustment
        },
        bookingsWithAdjustments: {
          discounts: stats.bookingsWithDiscounts,
          additional: stats.bookingsWithAdditionalCharges
        }
      }
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