// File: /api/analytics/multiple-drivers/route.js

import connectDB from '@/lib/db';
import Booking from '@/models/Booking';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const includeDetails = searchParams.get('includeDetails') === 'true';
    
    // Build date filter
    let dateFilter = {};
    if (dateFrom) {
      dateFilter.$gte = new Date(dateFrom);
    }
    if (dateTo) {
      dateFilter.$lte = new Date(dateTo);
    }
    
    // Base query for multiple driver bookings
    const baseQuery = { 'actualDriver.isSameAsLicenseHolder': false };
    if (Object.keys(dateFilter).length > 0) {
      baseQuery.createdAt = dateFilter;
    }
    
    // Get overall statistics
    const totalMultipleDriverBookings = await Booking.countDocuments(baseQuery);
    const totalAllBookings = await Booking.countDocuments(
      Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}
    );
    
    // Calculate percentage
    const multipleDriverPercentage = totalAllBookings > 0 ? 
      (totalMultipleDriverBookings / totalAllBookings) * 100 : 0;
    
    // Relationship breakdown analytics
    const relationshipAnalytics = await Booking.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: '$actualDriver.relationToLicenseHolder',
          count: { $sum: 1 },
          averageDeposit: { $avg: '$securityDepositAmount' },
          totalRevenue: { $sum: { $ifNull: ['$finalAmount', 0] } },
          avgDuration: { $avg: { $ifNull: ['$actualDuration', 0] } }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    // Risk assessment analytics
    const riskAnalytics = await Booking.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: '$riskAssessment.level',
          count: { $sum: 1 },
          avgDeposit: { $avg: '$securityDepositAmount' }
        }
      }
    ]);
    
    // Monthly trend analysis
    const monthlyTrends = await Booking.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 },
          totalRevenue: { $sum: { $ifNull: ['$finalAmount', 0] } },
          avgDeposit: { $avg: '$securityDepositAmount' }
        }
      },
      {
        $sort: { '_id.year': -1, '_id.month': -1 }
      },
      { $limit: 12 }
    ]);
    
    // Enhanced security usage
    const enhancedSecurityStats = await Booking.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: '$enhancedSecurity.reason',
          count: { $sum: 1 },
          avgAdditionalDeposit: { $avg: '$enhancedSecurity.additionalDepositAmount' }
        }
      }
    ]);
    
    // Vehicle type preferences for multiple drivers
    const vehicleTypeAnalytics = await Booking.aggregate([
      { $match: baseQuery },
      {
        $lookup: {
          from: 'vehicles',
          localField: 'vehicleId',
          foreignField: '_id',
          as: 'vehicle'
        }
      },
      { $unwind: '$vehicle' },
      {
        $group: {
          _id: '$vehicle.type',
          count: { $sum: 1 },
          avgDeposit: { $avg: '$securityDepositAmount' }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    // Incident analysis for multiple driver bookings
    const incidentAnalysis = await Booking.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: '$vehicleCondition',
          count: { $sum: 1 },
          avgDamageCharges: { 
            $avg: { 
              $cond: [
                { $eq: ['$vehicleCondition', 'damage'] },
                '$additionalCharges',
                0
              ]
            }
          }
        }
      }
    ]);
    
    // Detailed bookings if requested
    let detailedBookings = null;
    if (includeDetails) {
      detailedBookings = await Booking.findMultipleDriverBookings({
        dateFrom,
        dateTo
      }).limit(100); // Limit to prevent large responses
    }
    
    // Compliance tracking
    const complianceStats = await Booking.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: null,
          totalBookings: { $sum: 1 },
          staffVerified: {
            $sum: {
              $cond: ['$staffNotes.multipleDriverVerified', 1, 0]
            }
          },
          bothPartiesPresent: {
            $sum: {
              $cond: ['$staffNotes.bothPartiesPresent', 1, 0]
            }
          },
          actualDriverSigned: {
            $sum: {
              $cond: ['$actualDriver.hasSigned', 1, 0]
            }
          }
        }
      }
    ]);
    
    const compliance = complianceStats[0] || {
      totalBookings: 0,
      staffVerified: 0,
      bothPartiesPresent: 0,
      actualDriverSigned: 0
    };
    
    // Prepare response
    const analytics = {
      overview: {
        totalMultipleDriverBookings,
        totalAllBookings,
        multipleDriverPercentage: parseFloat(multipleDriverPercentage.toFixed(2)),
        dateRange: {
          from: dateFrom || 'All time',
          to: dateTo || 'Present'
        }
      },
      
      relationshipBreakdown: relationshipAnalytics.map(item => ({
        relationship: item._id || 'Unknown',
        count: item.count,
        percentage: parseFloat(((item.count / totalMultipleDriverBookings) * 100).toFixed(2)),
        averageDeposit: Math.round(item.averageDeposit || 0),
        totalRevenue: Math.round(item.totalRevenue || 0),
        averageDuration: parseFloat((item.avgDuration || 0).toFixed(2))
      })),
      
      riskAssessment: riskAnalytics.map(item => ({
        riskLevel: item._id || 'Unknown',
        count: item.count,
        averageDeposit: Math.round(item.avgDeposit || 0)
      })),
      
      monthlyTrends: monthlyTrends.map(item => ({
        year: item._id.year,
        month: item._id.month,
        monthName: new Date(item._id.year, item._id.month - 1).toLocaleString('en-US', { month: 'long' }),
        count: item.count,
        totalRevenue: Math.round(item.totalRevenue || 0),
        averageDeposit: Math.round(item.avgDeposit || 0)
      })),
      
      enhancedSecurity: enhancedSecurityStats.map(item => ({
        reason: item._id || 'Not specified',
        count: item.count,
        averageAdditionalDeposit: Math.round(item.avgAdditionalDeposit || 0)
      })),
      
      vehiclePreferences: vehicleTypeAnalytics.map(item => ({
        vehicleType: item._id,
        count: item.count,
        averageDeposit: Math.round(item.avgDeposit || 0)
      })),
      
      incidentAnalysis: incidentAnalysis.map(item => ({
        condition: item._id,
        count: item.count,
        averageDamageCharges: Math.round(item.avgDamageCharges || 0)
      })),
      
      compliance: {
        totalBookings: compliance.totalBookings,
        staffVerificationRate: compliance.totalBookings > 0 ? 
          parseFloat(((compliance.staffVerified / compliance.totalBookings) * 100).toFixed(2)) : 0,
        bothPartiesPresentRate: compliance.totalBookings > 0 ? 
          parseFloat(((compliance.bothPartiesPresent / compliance.totalBookings) * 100).toFixed(2)) : 0,
        actualDriverSignatureRate: compliance.totalBookings > 0 ? 
          parseFloat(((compliance.actualDriverSigned / compliance.totalBookings) * 100).toFixed(2)) : 0
      },
      
      recommendations: generateRecommendations(relationshipAnalytics, compliance, totalMultipleDriverBookings)
    };
    
    // Include detailed bookings if requested
    if (detailedBookings) {
      analytics.detailedBookings = detailedBookings;
    }
    
    return NextResponse.json({
      success: true,
      data: analytics
    });
    
  } catch (error) {
    console.error('Multiple driver analytics API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Helper function to generate business recommendations
function generateRecommendations(relationshipData, compliance, totalBookings) {
  const recommendations = [];
  
  // Check compliance rates
  if (compliance.staffVerified / compliance.totalBookings < 0.8) {
    recommendations.push({
      type: 'compliance',
      priority: 'high',
      message: 'Staff verification rate is below 80%. Implement mandatory verification checklist.',
      action: 'Train staff on multiple driver verification procedures'
    });
  }
  
  if (compliance.bothPartiesPresent / compliance.totalBookings < 0.9) {
    recommendations.push({
      type: 'policy',
      priority: 'high',
      message: 'Both parties not always present during handover. Enforce strict presence policy.',
      action: 'Update booking process to require both parties'
    });
  }
  
  // Check relationship patterns
  const topRelationship = relationshipData[0];
  if (topRelationship && topRelationship.count > totalBookings * 0.4) {
    recommendations.push({
      type: 'business',
      priority: 'medium',
      message: `${topRelationship._id} relationships account for ${((topRelationship.count / totalBookings) * 100).toFixed(1)}% of multiple driver bookings.`,
      action: 'Consider special packages for family/friend groups'
    });
  }
  
  // Check if multiple driver bookings are growing
  if (totalBookings > 50) {
    recommendations.push({
      type: 'growth',
      priority: 'medium',
      message: 'Multiple driver bookings are significant. Consider dedicated multiple driver packages.',
      action: 'Develop targeted marketing for group rentals'
    });
  }
  
  return recommendations;
}

// POST endpoint for updating multiple driver booking verification
export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();
    
    const { bookingId, action, staffMember, data } = body;
    
    if (!bookingId || !action || !staffMember) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: bookingId, action, staffMember' },
        { status: 400 }
      );
    }
    
    const booking = await Booking.findOne({ bookingId });
    if (!booking) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }
    
    if (!booking.hasMultipleDrivers) {
      return NextResponse.json(
        { success: false, error: 'This booking does not have multiple drivers' },
        { status: 400 }
      );
    }
    
    switch (action) {
      case 'verify_staff':
        await booking.addStaffVerification(
          staffMember,
          data?.bothPartiesPresent ?? true,
          data?.notes || ''
        );
        break;
        
      case 'mark_driver_signed':
        booking.actualDriver.hasSigned = true;
        booking.actualDriver.signedAt = new Date();
        await booking.save();
        break;
        
      case 'add_risk_factor':
        if (!booking.riskAssessment.factors) {
          booking.riskAssessment.factors = [];
        }
        booking.riskAssessment.factors.push({
          factor: data.factor,
          weight: data.weight
        });
        await booking.save();
        break;
        
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Booking updated successfully',
      booking: {
        bookingId: booking.bookingId,
        staffVerified: booking.staffNotes?.multipleDriverVerified || false,
        actualDriverSigned: booking.actualDriver?.hasSigned || false
      }
    });
    
  } catch (error) {
    console.error('Multiple driver update API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}