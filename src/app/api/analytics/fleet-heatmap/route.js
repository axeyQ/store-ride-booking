import connectDB from '@/lib/db';
import Vehicle from '@/models/Vehicle';
import Booking from '@/models/Booking';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    await connectDB();

    const [vehicles, activeBookings] = await Promise.all([
      Vehicle.find({}),
      Booking.find({ status: 'active' }).populate('vehicleId')
    ]);

    // Create heatmap data for each vehicle
    const heatmapData = vehicles.map(vehicle => {
      const activeBooking = activeBookings.find(booking => 
        booking.vehicleId?._id.toString() === vehicle._id.toString()
      );

      let utilizationScore = 0;
      let statusColor = '#10B981'; // Green for available
      
      switch (vehicle.status) {
        case 'rented':
          utilizationScore = 100;
          statusColor = '#F59E0B'; // Orange for rented
          break;
        case 'maintenance':
          utilizationScore = 0;
          statusColor = '#EF4444'; // Red for maintenance
          break;
        case 'available':
          utilizationScore = 20;
          statusColor = '#10B981'; // Green for available
          break;
      }

      return {
        id: vehicle._id,
        model: vehicle.model,
        plateNumber: vehicle.plateNumber,
        type: vehicle.type,
        status: vehicle.status,
        utilizationScore,
        statusColor,
        currentBooking: activeBooking ? {
          customerId: activeBooking.customerId,
          startTime: activeBooking.startTime,
          duration: activeBooking.startTime ? 
            Math.floor((new Date() - new Date(activeBooking.startTime)) / (1000 * 60)) : 0
        } : null
      };
    });

    // Calculate fleet summary
    const fleetStats = {
      total: vehicles.length,
      available: vehicles.filter(v => v.status === 'available').length,
      rented: vehicles.filter(v => v.status === 'rented').length,
      maintenance: vehicles.filter(v => v.status === 'maintenance').length,
      utilizationRate: vehicles.length > 0 ? 
        (vehicles.filter(v => v.status === 'rented').length / vehicles.length * 100) : 0
    };

    return NextResponse.json({
      success: true,
      data: {
        heatmapData,
        fleetStats,
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Fleet heatmap API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}