import connectDB from '@/lib/db';
import Customer from '@/models/Customer';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const licenseNumber = searchParams.get('license');
    
    if (!licenseNumber) {
      return NextResponse.json(
        { success: false, error: 'License number is required' },
        { status: 400 }
      );
    }
    
    // Clean and validate license number
    const cleanLicense = licenseNumber.trim().toUpperCase();
    
    // Find customer with this license number
    const existingCustomer = await Customer.findOne({ 
      driverLicense: cleanLicense 
    });
    
    if (existingCustomer) {
      return NextResponse.json({
        success: true,
        exists: true,
        customer: {
          _id: existingCustomer._id,
          name: existingCustomer.name,
          phone: existingCustomer.phone,
          driverLicense: existingCustomer.driverLicense,
          totalBookings: existingCustomer.totalBookings || 0,
          lastVisit: existingCustomer.lastVisit
        }
      });
    } else {
      return NextResponse.json({
        success: true,
        exists: false,
        customer: null
      });
    }
    
  } catch (error) {
    console.error('License check API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}