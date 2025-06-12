// src/app/api/analytics/route.js
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Booking from '@/models/Booking';
import Vehicle from '@/models/Vehicle';

// GET /api/analytics - Get comprehensive analytics data
export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const startDate = new Date(searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    const endDate = new Date(searchParams.get('endDate') || new Date());
    
    // Set time boundaries
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    // Parallel data fetching for performance
    const [
      revenueData,
      vehicleUtilization,
      customerInsights,
      peakHoursData,
      monthlyTrends,
      profitabilityData,
      recentMetrics
    ] = await Promise.all([
      getRevenueData(startDate, endDate),
      getVehicleUtilization(startDate, endDate),
      getCustomerInsights(startDate, endDate),
      getPeakHoursAnalysis(startDate, endDate),
      getMonthlyTrends(),
      getProfitabilityData(startDate, endDate),
      getRecentMetrics(startDate, endDate)
    ]);

    return NextResponse.json({
      success: true,
      data: {
        revenue: revenueData,
        vehicleUtilization,
        customerInsights,
        peakHours: peakHoursData,
        monthlyTrends,
        profitability: profitabilityData,
        recentMetrics
      }
    });

  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}

// Revenue Analysis Functions
async function getRevenueData(startDate, endDate) {
  const revenueByDay = await Booking.aggregate([
    {
      $match: {
        'booking.status': 'completed',
        'booking.paymentStatus': 'paid',
        updatedAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$updatedAt" }
        },
        amount: { $sum: '$booking.totalAmount' },
        bikeRevenue: {
          $sum: {
            $cond: [
              { $eq: ['$vehicleDetails.type', 'bike'] },
              '$booking.totalAmount',
              0
            ]
          }
        },
        scootyRevenue: {
          $sum: {
            $cond: [
              { $eq: ['$vehicleDetails.type', 'scooty'] },
              '$booking.totalAmount',
              0
            ]
          }
        },
        bookings: { $sum: 1 }
      }
    },
    { $sort: { '_id': 1 } },
    {
      $project: {
        date: '$_id',
        amount: 1,
        bikeRevenue: 1,
        scootyRevenue: 1,
        bookings: 1,
        _id: 0
      }
    }
  ]);

  return revenueByDay;
}

async function getVehicleUtilization(startDate, endDate) {
  const vehicles = await Vehicle.find();
  const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

  const utilizationData = await Promise.all(
    vehicles.map(async (vehicle) => {
      const bookings = await Booking.find({
        'vehicleDetails.vehicleNumber': vehicle.vehicleNumber,
        'booking.status': { $in: ['active', 'completed'] },
        createdAt: { $gte: startDate, $lte: endDate }
      });

      const totalHours = bookings.reduce((sum, booking) => {
        if (booking.enhancedReturn?.totalHours) {
          return sum + booking.enhancedReturn.totalHours;
        }
        // Calculate hours for active bookings
        const pickupTime = new Date(`${booking.vehicleDetails.pickupDate}T${booking.vehicleDetails.pickupTime}`);
        const endTime = booking.vehicleDetails.returnDate 
          ? new Date(`${booking.vehicleDetails.returnDate}T${booking.vehicleDetails.returnTime}`)
          : new Date();
        return sum + Math.ceil((endTime - pickupTime) / (1000 * 60 * 60));
      }, 0);

      const maxPossibleHours = totalDays * 12; // Assuming 12 hours/day operation
      const utilizationPercentage = Math.min((totalHours / maxPossibleHours) * 100, 100);

      return {
        vehicleNumber: vehicle.vehicleNumber,
        type: vehicle.type,
        totalBookings: bookings.length,
        totalHours,
        utilizationPercentage: Math.round(utilizationPercentage),
        revenue: bookings.reduce((sum, b) => sum + (b.booking.totalAmount || 0), 0)
      };
    })
  );

  return utilizationData.sort((a, b) => b.utilizationPercentage - a.utilizationPercentage);
}

async function getCustomerInsights(startDate, endDate) {
  // Get customer statistics
  const customerStats = await Booking.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$customerDetails.mobile',
        name: { $first: '$customerDetails.name' },
        mobile: { $first: '$customerDetails.mobile' },
        bookingCount: { $sum: 1 },
        totalSpent: { $sum: '$booking.totalAmount' },
        avgRating: { $avg: '$enhancedReturn.customerFeedback.rating' },
        lastBooking: { $max: '$createdAt' },
        vehicleTypes: { $addToSet: '$vehicleDetails.type' }
      }
    },
    { $sort: { totalSpent: -1 } }
  ]);

  const totalCustomers = customerStats.length;
  const repeatCustomers = customerStats.filter(c => c.bookingCount > 1).length;
  const avgBookingValue = customerStats.reduce((sum, c) => sum + c.totalSpent, 0) / totalCustomers || 0;
  const retentionRate = (repeatCustomers / totalCustomers) * 100 || 0;

  // Customer segmentation
  const oneTimeCustomers = customerStats.filter(c => c.bookingCount === 1).length;
  const regularCustomers = customerStats.filter(c => c.bookingCount >= 2 && c.bookingCount <= 5).length;
  const frequentCustomers = customerStats.filter(c => c.bookingCount > 5).length;

  // Vehicle preference analysis
  const bikeCustomers = customerStats.filter(c => c.vehicleTypes.includes('bike') && !c.vehicleTypes.includes('scooty')).length;
  const scootyCustomers = customerStats.filter(c => c.vehicleTypes.includes('scooty') && !c.vehicleTypes.includes('bike')).length;
  const bothCustomers = customerStats.filter(c => c.vehicleTypes.includes('bike') && c.vehicleTypes.includes('scooty')).length;

  return {
    totalCustomers,
    repeatCustomers,
    avgBookingValue,
    retentionRate,
    oneTimeCustomers,
    regularCustomers,
    frequentCustomers,
    bikeCustomers,
    scootyCustomers,
    bothCustomers,
    topCustomers: customerStats.slice(0, 10).map(c => ({
      name: c.name,
      mobile: c.mobile,
      bookingCount: c.bookingCount,
      totalSpent: c.totalSpent,
      avgRating: c.avgRating || 5,
      lastBooking: c.lastBooking
    }))
  };
}

async function getPeakHoursAnalysis(startDate, endDate) {
  const hourlyData = await Booking.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $project: {
        hour: { $toInt: { $substr: ['$vehicleDetails.pickupTime', 0, 2] } }
      }
    },
    {
      $group: {
        _id: '$hour',
        bookings: { $sum: 1 }
      }
    },
    { $sort: { '_id': 1 } },
    {
      $project: {
        hour: { $concat: [{ $toString: '$_id' }, ':00'] },
        bookings: 1,
        _id: 0
      }
    }
  ]);

  // Fill missing hours with 0 bookings
  const completeHourlyData = [];
  for (let i = 0; i < 24; i++) {
    const existingData = hourlyData.find(d => d.hour === `${i}:00`);
    completeHourlyData.push({
      hour: `${i.toString().padStart(2, '0')}:00`,
      bookings: existingData ? existingData.bookings : 0
    });
  }

  return completeHourlyData;
}

async function getMonthlyTrends() {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const monthlyData = await Booking.aggregate([
    {
      $match: {
        'booking.status': 'completed',
        'booking.paymentStatus': 'paid',
        updatedAt: { $gte: sixMonthsAgo }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$updatedAt' },
          month: { $month: '$updatedAt' }
        },
        revenue: { $sum: '$booking.totalAmount' },
        bookings: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
    {
      $project: {
        month: {
          $concat: [
            { $toString: '$_id.year' },
            '-',
            { $toString: '$_id.month' }
          ]
        },
        revenue: 1,
        bookings: 1,
        _id: 0
      }
    }
  ]);

  return monthlyData;
}

async function getProfitabilityData(startDate, endDate) {
  const completedBookings = await Booking.find({
    'booking.status': 'completed',
    'booking.paymentStatus': 'paid',
    updatedAt: { $gte: startDate, $lte: endDate }
  });

  const totalRevenue = completedBookings.reduce((sum, b) => sum + (b.booking.totalAmount || 0), 0);
  
  const bikeRevenue = completedBookings
    .filter(b => b.vehicleDetails.type === 'bike')
    .reduce((sum, b) => sum + (b.booking.totalAmount || 0), 0);
  
  const scootyRevenue = completedBookings
    .filter(b => b.vehicleDetails.type === 'scooty')
    .reduce((sum, b) => sum + (b.booking.totalAmount || 0), 0);

  const penaltyRevenue = completedBookings
    .reduce((sum, b) => sum + (b.enhancedReturn?.amountBreakdown?.latePenalty || 0), 0);

  const damageRevenue = completedBookings
    .reduce((sum, b) => sum + (b.enhancedReturn?.amountBreakdown?.damageCharges || 0), 0);

  // Estimated costs (these would come from a separate costs tracking system in real implementation)
  const operatingCosts = totalRevenue * 0.3; // 30% of revenue as operating costs
  const maintenanceCosts = totalRevenue * 0.15; // 15% of revenue as maintenance costs
  const netProfit = totalRevenue - operatingCosts - maintenanceCosts;

  return {
    totalRevenue,
    bikeRevenue,
    scootyRevenue,
    penaltyRevenue,
    damageRevenue,
    operatingCosts,
    maintenanceCosts,
    netProfit
  };
}

async function getRecentMetrics(startDate, endDate) {
  const currentPeriodBookings = await Booking.find({
    createdAt: { $gte: startDate, $lte: endDate }
  });

  const currentRevenue = currentPeriodBookings
    .filter(b => b.booking.status === 'completed' && b.booking.paymentStatus === 'paid')
    .reduce((sum, b) => sum + (b.booking.totalAmount || 0), 0);

  // Calculate previous period for comparison
  const periodLength = endDate - startDate;
  const previousStartDate = new Date(startDate.getTime() - periodLength);
  const previousEndDate = new Date(startDate.getTime());

  const previousPeriodBookings = await Booking.find({
    createdAt: { $gte: previousStartDate, $lte: previousEndDate }
  });

  const previousRevenue = previousPeriodBookings
    .filter(b => b.booking.status === 'completed' && b.booking.paymentStatus === 'paid')
    .reduce((sum, b) => sum + (b.booking.totalAmount || 0), 0);

  const revenueGrowth = previousRevenue > 0 
    ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 
    : 0;

  const bookingGrowth = previousPeriodBookings.length > 0
    ? ((currentPeriodBookings.length - previousPeriodBookings.length) / previousPeriodBookings.length) * 100
    : 0;

  const activeDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
  const avgRevenuePerDay = currentRevenue / activeDays;

  // Unique customers count
  const uniqueCustomers = new Set(currentPeriodBookings.map(b => b.customerDetails.mobile)).size;
  const repeatCustomers = currentPeriodBookings.length - uniqueCustomers;

  return {
    totalRevenue: currentRevenue,
    totalBookings: currentPeriodBookings.length,
    revenueGrowth: Math.round(revenueGrowth * 100) / 100,
    bookingGrowth: Math.round(bookingGrowth * 100) / 100,
    avgRevenuePerDay,
    activeDays,
    uniqueCustomers,
    repeatCustomers
  };
}