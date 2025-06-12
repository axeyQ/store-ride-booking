import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Blacklist from '@/models/Blacklist';
import Booking from '@/models/Booking';

// POST /api/bookings/check-blacklist - Check if customer is blacklisted (mobile only)
export async function POST(request) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { mobile } = body; // Only using mobile, no aadhaar
    
    if (!mobile) {
      return NextResponse.json(
        { success: false, error: 'Mobile number is required' },
        { status: 400 }
      );
    }
    
    // Find customer by mobile from previous bookings
    const customerBooking = await Booking.findOne({ 
      'customerDetails.mobile': mobile 
    }).select('_id customerDetails');
    
    if (customerBooking) {
      // Check if this customer is blacklisted
      const blacklistEntry = await Blacklist.findOne({ 
        customerId: customerBooking._id,
        isActive: true 
      });
      
      if (blacklistEntry) {
        return NextResponse.json({
          success: true,
          isBlacklisted: true,
          blacklistInfo: {
            reason: blacklistEntry.reason,
            severity: blacklistEntry.severity,
            addedDate: blacklistEntry.createdAt,
            notes: blacklistEntry.notes
          },
          customerDetails: customerBooking.customerDetails
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      isBlacklisted: false,
      customerDetails: customerBooking?.customerDetails || null
    });
    
  } catch (error) {
    console.error('Error checking blacklist:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check blacklist' },
      { status: 500 }
    );
  }
}
