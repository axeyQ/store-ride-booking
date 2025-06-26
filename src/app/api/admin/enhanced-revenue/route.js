import connectDB from '@/lib/db';
import Booking from '@/models/Booking';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'today';
    const includeCustomBookings = searchParams.get('includeCustomBookings') !== 'false';
    
    const now = new Date();
    let startDate, endDate;
    
    // Set date ranges based on period
    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        endDate = now;
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        endDate = now;
    }
    
    console.log(`📊 Enhanced revenue calculation for ${period}:`, {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      includeCustomBookings
    });
    
    // Get all bookings in the date range
    const bookings = await Booking.find({
      createdAt: { $gte: startDate, $lte: endDate },
      status: { $in: ['completed', 'active'] }
    }).populate('vehicleId', 'type model')
      .populate('customerId', 'name');
    
    console.log(`📋 Found ${bookings.length} bookings for analysis`);
    
    let totalRevenue = 0;
    let advancedPricingRevenue = 0;
    let customBookingRevenue = 0;
    let advancedPricingCount = 0;
    let customBookingCount = 0;
    
    const revenueBreakdown = {
      advanced: { total: 0, count: 0, avgPerBooking: 0 },
      custom: { 
        total: 0, 
        count: 0, 
        avgPerBooking: 0,
        breakdown: {
          half_day: { count: 0, revenue: 0 },
          full_day: { count: 0, revenue: 0 },
          night: { count: 0, revenue: 0 }
        }
      }
    };
    
    for (const booking of bookings) {
      const amount = booking.finalAmount || 0;
      totalRevenue += amount;
      
      if (booking.isCustomBooking) {
        customBookingRevenue += amount;
        customBookingCount++;
        revenueBreakdown.custom.total += amount;
        revenueBreakdown.custom.count++;
        
        // Track custom booking type breakdown
        if (booking.customBookingType && revenueBreakdown.custom.breakdown[booking.customBookingType]) {
          revenueBreakdown.custom.breakdown[booking.customBookingType].count++;
          revenueBreakdown.custom.breakdown[booking.customBookingType].revenue += amount;
        }
      } else {
        advancedPricingRevenue += amount;
        advancedPricingCount++;
        revenueBreakdown.advanced.total += amount;
        revenueBreakdown.advanced.count++;
      }
    }
    
    // Calculate averages
    revenueBreakdown.advanced.avgPerBooking = advancedPricingCount > 0 
      ? Math.round(advancedPricingRevenue / advancedPricingCount) 
      : 0;
    revenueBreakdown.custom.avgPerBooking = customBookingCount > 0 
      ? Math.round(customBookingRevenue / customBookingCount) 
      : 0;
    
    console.log('💰 Revenue Analysis:', {
      totalRevenue,
      advancedPricingRevenue,
      customBookingRevenue,
      advancedPricingCount,
      customBookingCount
    });
    
    // Calculate revenue distribution
    const customBookingPercentage = totalRevenue > 0 
      ? Math.round((customBookingRevenue / totalRevenue) * 100) 
      : 0;
    const advancedPricingPercentage = 100 - customBookingPercentage;
    
    // Find most popular custom package
    const mostPopularPackage = Object.entries(revenueBreakdown.custom.breakdown)
      .sort(([,a], [,b]) => b.count - a.count)[0];
    
    return NextResponse.json({
      success: true,
      period,
      totalRevenue: Math.round(totalRevenue),
      breakdown: revenueBreakdown,
      summary: {
        totalBookings: bookings.length,
        advancedPricingBookings: advancedPricingCount,
        customBookings: customBookingCount,
        averagePerBooking: bookings.length > 0 ? Math.round(totalRevenue / bookings.length) : 0,
        revenueDistribution: {
          advanced: { percentage: advancedPricingPercentage, amount: Math.round(advancedPricingRevenue) },
          custom: { percentage: customBookingPercentage, amount: Math.round(customBookingRevenue) }
        }
      },
      customBookingAnalysis: {
        mostPopularPackage: mostPopularPackage ? mostPopularPackage[0] : 'none',
        mostPopularPackageCount: mostPopularPackage ? mostPopularPackage[1].count : 0,
        packageBreakdown: revenueBreakdown.custom.breakdown
      },
      metadata: {
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        },
        generatedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Enhanced revenue API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}