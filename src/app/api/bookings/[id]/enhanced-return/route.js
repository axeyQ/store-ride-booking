// src/app/api/bookings/[id]/enhanced-return/route.js
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Booking from '@/models/Booking';
import Vehicle from '@/models/Vehicle';

// PUT /api/bookings/[id]/enhanced-return - Process enhanced return with photos and condition check
export async function PUT(request, { params }) {
  try {
    await connectDB();
    
    const body = await request.json();
    const {
      returnDate,
      returnTime,
      customerPhoto,
      vehiclePhotos,
      damagePhotos,
      vehicleCondition,
      damageAssessment,
      customerFeedback,
      paymentMethod,
      staffNotes,
      totalAmount,
      baseAmount,
      latePenalty,
      damageCharges,
      totalHours,
      processedBy
    } = body;
    
    const booking = await Booking.findById(params.id);
    if (!booking) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }
    
    if (booking.booking.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'Booking is not active' },
        { status: 400 }
      );
    }
    
    // Update booking with enhanced return data
    booking.vehicleDetails.returnDate = new Date(returnDate);
    booking.vehicleDetails.returnTime = returnTime;
    booking.booking.status = 'completed';
    booking.booking.totalAmount = totalAmount;
    booking.booking.paymentStatus = 'paid';
    
    // Add enhanced return data
    booking.enhancedReturn = {
      customerPhoto,
      vehiclePhotos,
      damagePhotos,
      vehicleCondition,
      damageAssessment,
      customerFeedback,
      paymentMethod,
      staffNotes,
      amountBreakdown: {
        baseAmount,
        latePenalty,
        damageCharges,
        totalAmount
      },
      totalHours,
      processedBy,
      processedAt: new Date()
    };
    
    await booking.save();
    
    // Update vehicle status
    await Vehicle.findOneAndUpdate(
      { vehicleNumber: booking.vehicleDetails.vehicleNumber },
      { 
        status: damageAssessment.hasDamage ? 'maintenance' : 'available',
        currentBooking: null
      }
    );
    
    return NextResponse.json({
      success: true,
      data: booking,
      message: 'Enhanced return processed successfully'
    });
    
  } catch (error) {
    console.error('Error processing enhanced return:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process enhanced return' },
      { status: 500 }
    );
  }
}
