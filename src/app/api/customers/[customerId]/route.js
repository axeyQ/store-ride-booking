import connectDB from '@/lib/db';
import Customer from '@/models/Customer';
import Booking from '@/models/Booking';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  try {
    await connectDB();
    const { customerId } = params;
    
    const customer = await Customer.findById(customerId);
    
    if (!customer) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, customer });
  } catch (error) {
    console.error('Customer detail API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    await connectDB();
    const { customerId } = params;
    const body = await request.json();
    
    // Check if updating phone or license number that might conflict with existing customers
    if (body.phone || body.driverLicense) {
      const conflictQuery = { _id: { $ne: customerId } };
      
      if (body.phone) {
        conflictQuery.phone = body.phone;
      }
      
      if (body.driverLicense) {
        conflictQuery.driverLicense = body.driverLicense.toUpperCase();
      }
      
      const existingCustomer = await Customer.findOne(conflictQuery);
      if (existingCustomer) {
        const conflictField = body.phone && existingCustomer.phone === body.phone ? 'phone number' : 'license number';
        return NextResponse.json(
          { success: false, error: `A customer with this ${conflictField} already exists` },
          { status: 409 }
        );
      }
    }
    
    // Normalize license number to uppercase
    if (body.driverLicense) {
      body.driverLicense = body.driverLicense.toUpperCase();
    }
    
    const customer = await Customer.findByIdAndUpdate(
      customerId,
      { ...body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    if (!customer) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      customer,
      message: 'Customer updated successfully'
    });
  } catch (error) {
    console.error('Customer update API error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return NextResponse.json(
        { success: false, error: `Validation error: ${validationErrors.join(', ')}` },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    await connectDB();
    const { customerId } = params;
    
    // First, check if customer exists
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }
    
    // Check for active bookings - prevent deletion if customer has active bookings
    const activeBookings = await Booking.find({
      customerId: customerId,
      status: 'active'
    });
    
    if (activeBookings.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Cannot delete customer with ${activeBookings.length} active booking(s). Please complete or cancel active bookings first.`,
          activeBookingsCount: activeBookings.length
        },
        { status: 409 }
      );
    }
    
    // Get booking count for the response
    const totalBookings = await Booking.countDocuments({ customerId: customerId });
    
    // Option 1: Delete customer but keep booking history (recommended for audit trail)
    const deletedCustomer = await Customer.findByIdAndDelete(customerId);
    
    // Option 2: If you want to delete all bookings as well, uncomment the line below:
    // await Booking.deleteMany({ customerId: customerId });
    
    console.log(`Customer ${customer.name} (${customer.phone}) deleted successfully. Had ${totalBookings} total bookings.`);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Customer deleted successfully',
      deletedCustomer: {
        id: deletedCustomer._id,
        name: deletedCustomer.name,
        phone: deletedCustomer.phone,
        driverLicense: deletedCustomer.driverLicense,
        totalBookings: totalBookings
      },
      bookingsAction: 'preserved' // Change to 'deleted' if you enable booking deletion
    });
    
  } catch (error) {
    console.error('Customer deletion API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}