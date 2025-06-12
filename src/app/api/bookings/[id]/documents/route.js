import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Booking from '@/models/Booking';

// POST /api/bookings/[id]/documents - Upload Aadhaar photo AND number
export async function POST(request, { params }) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { aadhaarNumber, aadhaarPhoto, uploadedBy } = body;
    
    if (!aadhaarPhoto) {
      return NextResponse.json(
        { success: false, error: 'Aadhaar photo is required' },
        { status: 400 }
      );
    }
    
    const booking = await Booking.findById(params.id);
    if (!booking) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }
    
    // Update documents with both number and photo
    booking.documents.aadhaarNumber = aadhaarNumber || ''; // Optional number
    booking.documents.aadhaarPhoto = aadhaarPhoto;
    booking.documents.uploadedBy = uploadedBy;
    booking.documents.uploadedAt = new Date();
    
    await booking.save();
    
    return NextResponse.json({
      success: true,
      data: booking,
      message: 'Aadhaar documents uploaded successfully'
    });
    
  } catch (error) {
    console.error('Error uploading document:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload document' },
      { status: 500 }
    );
  }
}
