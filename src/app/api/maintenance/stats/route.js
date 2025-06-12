// src/app/api/maintenance/stats/route.js
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Maintenance from '@/models/Maintenance';
import Vehicle from '@/models/Vehicle';

// GET /api/maintenance/stats - Get maintenance statistics
export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const startDate = new Date(searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    const endDate = new Date(searchParams.get('endDate') || new Date());
    
    // Parallel queries for performance
    const [
      totalRecords,
      completedMaintenance,
      pendingMaintenance,
      totalCost,
      averageCost,
      maintenanceByType,
      maintenanceByVehicle,
      overdueMaintenance
    ] = await Promise.all([
      Maintenance.countDocuments({
        createdAt: { $gte: startDate, $lte: endDate }
      }),
      Maintenance.countDocuments({
        status: 'completed',
        completedDate: { $gte: startDate, $lte: endDate }
      }),
      Maintenance.countDocuments({
        status: { $in: ['scheduled', 'in-progress'] }
      }),
      Maintenance.aggregate([
        {
          $match: {
            status: 'completed',
            completedDate: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$cost' }
          }
        }
      ]),
      Maintenance.aggregate([
        {
          $match: {
            status: 'completed',
            completedDate: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: null,
            average: { $avg: '$cost' }
          }
        }
      ]),
      Maintenance.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            totalCost: { $sum: '$cost' }
          }
        }
      ]),
      Maintenance.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate }
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
          $unwind: '$vehicle'
        },
        {
          $group: {
            _id: '$vehicle.vehicleNumber',
            count: { $sum: 1 },
            totalCost: { $sum: '$cost' }
          }
        },
        { $sort: { totalCost: -1 } },
        { $limit: 10 }
      ]),
      Maintenance.countDocuments({
        status: { $in: ['scheduled', 'in-progress'] },
        scheduledDate: { $lt: new Date() }
      })
    ]);
    
    return NextResponse.json({
      success: true,
      data: {
        totalRecords,
        completedMaintenance,
        pendingMaintenance,
        overdueMaintenance,
        totalCost: totalCost[0]?.total || 0,
        averageCost: averageCost[0]?.average || 0,
        maintenanceByType: maintenanceByType.map(item => ({
          type: item._id,
          count: item.count,
          totalCost: item.totalCost
        })),
        maintenanceByVehicle: maintenanceByVehicle.map(item => ({
          vehicleNumber: item._id,
          count: item.count,
          totalCost: item.totalCost
        }))
      }
    });
    
  } catch (error) {
    console.error('Error fetching maintenance stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch maintenance statistics' },
      { status: 500 }
    );
  }
}