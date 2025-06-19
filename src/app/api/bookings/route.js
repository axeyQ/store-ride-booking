import connectDB from '@/lib/db';
import Booking from '@/models/Booking';
import Customer from '@/models/Customer';
import Vehicle from '@/models/Vehicle';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    
    // Build query based on status filter
    let query = {};
    if (status) {
      query.status = status;
      console.log('Filtering bookings by status:', status);
    }
    
    console.log('Query:', query);
    
    const bookings = await Booking.find(query)
      .populate('vehicleId', 'type model plateNumber')
      .populate('customerId', 'name phone driverLicense')
      .sort({ createdAt: -1 });
    
    console.log(`Found ${bookings.length} bookings with query:`, query);
    
    return NextResponse.json({ success: true, bookings });
  } catch (error) {
    console.error('Bookings API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();
    
    // Validate only essential required fields
    if (!body.vehicleId || !body.customer || !body.signature) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: vehicleId, customer, or signature' },
        { status: 400 }
      );
    }

    // Validate customer has required fields
    if (!body.customer.name || !body.customer.phone || !body.customer.driverLicense) {
      return NextResponse.json(
        { success: false, error: 'Missing required customer fields: name, phone, or driverLicense' },
        { status: 400 }
      );
    }
    
    // Create clean customer object (only include allowed fields)
    const cleanCustomerData = {
      name: body.customer.name,
      phone: body.customer.phone,
      driverLicense: body.customer.driverLicense
    };
    
    // Create or find customer (by driver license only)
    let customer = await Customer.findOne({
      driverLicense: cleanCustomerData.driverLicense
    });
    
    if (!customer) {
      customer = new Customer(cleanCustomerData);
      await customer.save();
    } else {
      // Update customer info and increment booking count
      customer.name = cleanCustomerData.name;
      customer.phone = cleanCustomerData.phone;
      customer.driverLicense = cleanCustomerData.driverLicense;
      customer.totalBookings += 1;
      customer.lastVisit = new Date();
      await customer.save();
    }
    
    // Check if vehicle is available
    const vehicle = await Vehicle.findById(body.vehicleId);
    if (!vehicle) {
      return NextResponse.json(
        { success: false, error: 'Vehicle not found' },
        { status: 404 }
      );
    }
    
    if (vehicle.status !== 'available') {
      return NextResponse.json(
        { success: false, error: 'Vehicle is not available' },
        { status: 400 }
      );
    }
    
    // Update vehicle status to rented
    await Vehicle.findByIdAndUpdate(body.vehicleId, { status: 'rented' });
    
    // Create booking with current time
    const booking = new Booking({
      vehicleId: body.vehicleId,
      customerId: customer._id,
      signature: body.signature,
      helmetProvided: body.helmetProvided || false,
      aadharCardCollected: body.aadharCardCollected || false,
      vehicleInspected: body.vehicleInspected || false,
      additionalNotes: body.additionalNotes || '',
      startTime: new Date() // Always use current time
    });
    
    await booking.save();
    
    // Populate the booking for response
    const populatedBooking = await Booking.findById(booking._id)
      .populate('vehicleId', 'type model plateNumber')
      .populate('customerId', 'name phone driverLicense');
    
    return NextResponse.json({ success: true, booking: populatedBooking });
  } catch (error) {
    console.error('Booking creation error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}