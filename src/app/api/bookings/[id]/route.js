// src/app/api/bookings/[id]/route.js
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Booking from '@/models/Booking';
import Vehicle from '@/models/Vehicle';

// GET /api/bookings/[id] - Get specific booking
export async function GET(request, { params }) {
  try {
    await connectDB();
    
    const booking = await Booking.findById(params.id);
    
    if (!booking) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: booking
    });
    
  } catch (error) {
    console.error('Error fetching booking:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch booking' },
      { status: 500 }
    );
  }
}

// PUT /api/bookings/[id] - Update booking (for return process)
export async function PUT(request, { params }) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { action, returnDate, returnTime, paymentStatus, staffMember } = body;
    
    const booking = await Booking.findById(params.id);
    if (!booking) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }
    
    if (action === 'return') {
      // Handle vehicle return
      booking.vehicleDetails.returnDate = new Date(returnDate);
      booking.vehicleDetails.returnTime = returnTime;
      booking.booking.status = 'completed';
      booking.booking.totalAmount = booking.calculateAmount();
      booking.booking.paymentStatus = paymentStatus || 'pending';
      
      await booking.save();
      
      // Update vehicle status
      await Vehicle.findOneAndUpdate(
        { vehicleNumber: booking.vehicleDetails.vehicleNumber },
        { 
          status: 'available',
          currentBooking: null
        }
      );
      
      return NextResponse.json({
        success: true,
        data: booking,
        message: 'Vehicle returned successfully'
      });
    }
    
    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('Error updating booking:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update booking' },
      { status: 500 }
    );
  }
}
