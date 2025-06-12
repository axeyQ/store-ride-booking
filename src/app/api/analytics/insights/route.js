// src/app/api/analytics/insights/route.js
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Booking from '@/models/Booking';

// GET /api/analytics/insights - Get AI-powered insights and recommendations
export async function GET(request) {
  try {
    await connectDB();
    
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const bookings = await Booking.find({
      createdAt: { $gte: thirtyDaysAgo }
    });

    const insights = generateBusinessInsights(bookings);

    return NextResponse.json({
      success: true,
      data: insights
    });

  } catch (error) {
    console.error('Error generating insights:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate insights' },
      { status: 500 }
    );
  }
}

function generateBusinessInsights(bookings) {
  const insights = [];
  
  // Revenue analysis
  const totalRevenue = bookings
    .filter(b => b.booking.status === 'completed')
    .reduce((sum, b) => sum + (b.booking.totalAmount || 0), 0);
  
  // Peak hours analysis
  const hourCounts = {};
  bookings.forEach(booking => {
    const hour = parseInt(booking.vehicleDetails.pickupTime.split(':')[0]);
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });
  
  const peakHour = Object.keys(hourCounts).reduce((a, b) => 
    hourCounts[a] > hourCounts[b] ? a : b
  );

  // Vehicle type analysis
  const bikeBookings = bookings.filter(b => b.vehicleDetails.type === 'bike').length;
  const scootyBookings = bookings.filter(b => b.vehicleDetails.type === 'scooty').length;

  // Generate insights
  if (totalRevenue > 0) {
    insights.push({
      type: 'revenue',
      title: 'Revenue Performance',
      message: `Generated ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(totalRevenue)} in the last 30 days`,
      priority: 'high',
      actionable: true
    });
  }

  if (peakHour) {
    insights.push({
      type: 'timing',
      title: 'Peak Hours Optimization',
      message: `Peak booking time is ${peakHour}:00. Consider dynamic pricing during peak hours.`,
      priority: 'medium',
      actionable: true
    });
  }

  if (bikeBookings > scootyBookings * 1.5) {
    insights.push({
      type: 'inventory',
      title: 'Fleet Optimization',
      message: `Bikes are in higher demand (${bikeBookings} vs ${scootyBookings} scooties). Consider expanding bike inventory.`,
      priority: 'medium',
      actionable: true
    });
  } else if (scootyBookings > bikeBookings * 1.5) {
    insights.push({
      type: 'inventory',
      title: 'Fleet Optimization',
      message: `Scooties are in higher demand (${scootyBookings} vs ${bikeBookings} bikes). Consider expanding scooty inventory.`,
      priority: 'medium',
      actionable: true
    });
  }

  // Customer retention analysis
  const customerCounts = {};
  bookings.forEach(booking => {
    const mobile = booking.customerDetails.mobile;
    customerCounts[mobile] = (customerCounts[mobile] || 0) + 1;
  });

  const repeatCustomers = Object.values(customerCounts).filter(count => count > 1).length;
  const totalCustomers = Object.keys(customerCounts).length;
  const retentionRate = (repeatCustomers / totalCustomers) * 100;

  if (retentionRate < 30) {
    insights.push({
      type: 'retention',
      title: 'Customer Retention',
      message: `Low customer retention rate (${retentionRate.toFixed(1)}%). Consider loyalty programs or follow-up campaigns.`,
      priority: 'high',
      actionable: true
    });
  }

  return insights;
}