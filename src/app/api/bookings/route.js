// src/app/api/bookings/route.js
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Booking from '@/models/Booking';
import Vehicle from '@/models/Vehicle';

// GET /api/bookings - Get all bookings with filters
export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit')) || 50;
    const page = parseInt(searchParams.get('page')) || 1;
    const skip = (page - 1) * limit;
    
    // Build query
    let query = {};
    if (status) {
      query['booking.status'] = status;
    }
    
    const bookings = await Booking.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);
    
    const total = await Booking.countDocuments(query);
    
    return NextResponse.json({
      success: true,
      data: bookings,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}

// POST /api/bookings - Create new booking
export async function POST(request) {
    try {
      await connectDB();
      
      const body = await request.json();
      const {
        name,
        mobile,
        dlNumber,
        // REMOVED: aadhaarNumber - will be added later
        vehicleType,
        vehicleNumber,
        pickupDate,
        pickupTime,
        signature,
        otp
      } = body;
      
      // Validate required fields (removed aadhaar validation)
      if (!name || !mobile || !dlNumber || !vehicleNumber || !signature || !otp) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields' },
          { status: 400 }
        );
      }
      
      // Check if vehicle is available
      const existingBooking = await Booking.isVehicleAvailable(vehicleNumber, pickupDate);
      if (existingBooking) {
        return NextResponse.json(
          { success: false, error: 'Vehicle not available for selected date' },
          { status: 409 }
        );
      }
      
      // Create booking
      const booking = new Booking({
        customerDetails: {
          name,
          mobile,
          dlNumber
          // aadhaarNumber will be added later via documents endpoint
        },
        vehicleDetails: {
          type: vehicleType,
          vehicleNumber,
          pickupDate: new Date(pickupDate),
          pickupTime
        },
        digitalSignature: {
          signatureImage: signature,
          timestamp: new Date(),
          ipAddress: request.ip || 'store-terminal'
        },
        verification: {
          otpGenerated: otp,
          otpVerified: true,
          verificationTime: new Date()
        },
        booking: {
          status: 'active',
          createdBy: 'staff', // This can be dynamic based on logged-in user
          ratePerHour: 80
        }
      });
      
      await booking.save();
      
      // Update vehicle status
      await Vehicle.findOneAndUpdate(
        { vehicleNumber },
        { 
          status: 'rented',
          currentBooking: booking._id
        }
      );
      
      return NextResponse.json({
        success: true,
        data: booking,
        message: 'Booking created successfully'
      }, { status: 201 });
      
    } catch (error) {
      console.error('Error creating booking:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create booking' },
        { status: 500 }
      );
    }
  }