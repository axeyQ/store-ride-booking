// Replace your existing src/app/api/custom-bookings/route.js with this version
import connectDB from '@/lib/db';
import Booking from '@/models/Booking';
import Vehicle from '@/models/Vehicle';
import Customer from '@/models/Customer';
import { NextResponse } from 'next/server';

// Helper function to calculate endTime for custom packages
function calculateEndTimeForPackage(startTime, packageType) {
  const PACKAGE_DURATIONS = {
    half_day: 12, // 12 hours
    full_day: 24, // 24 hours  
    night: 11     // 11 hours (10 PM to 9 AM)
  };

  const start = new Date(startTime);
  const hours = PACKAGE_DURATIONS[packageType] || 12;

  if (packageType === 'night') {
    // Night package: Set end time to 9 AM next day
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    end.setHours(9, 0, 0, 0);
    return end;
  } else {
    // Add hours for half day or full day
    return new Date(start.getTime() + (hours * 60 * 60 * 1000));
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();
    
    console.log('📝 Creating custom booking with data:', {
      vehicleId: body.vehicleId,
      customerId: body.customerId,
      hasCustomerData: !!body.customer,
      packageType: body.customBookingType,
      amount: body.finalAmount,
      startTime: body.startTime,
      endTime: body.endTime
    });
    
    // FIXED: Updated validation - customerId OR customer data is required
    if (!body.vehicleId || !body.signature || !body.startTime) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: vehicleId, signature, or startTime' },
        { status: 400 }
      );
    }

    // FIXED: Check if we have either existing customer ID or new customer data
    if (!body.customerId && (!body.customer || !body.customer.name || !body.customer.phone || !body.customer.driverLicense)) {
      return NextResponse.json(
        { success: false, error: 'Either customerId or complete customer information (name, phone, driverLicense) is required' },
        { status: 400 }
      );
    }

    if (!body.customBookingType || !body.finalAmount) {
      return NextResponse.json(
        { success: false, error: 'Missing custom booking details: type or amount' },
        { status: 400 }
      );
    }

    // FIXED: Handle customer - either existing or create new
    let customer;
    let customerId = body.customerId;

    if (customerId) {
      // Use existing customer
      customer = await Customer.findById(customerId);
      if (!customer) {
        return NextResponse.json(
          { success: false, error: 'Customer not found' },
          { status: 404 }
        );
      }
      console.log('👤 Using existing customer:', customer.name);
    } else {
      // Create new customer or find existing by license
      const existingCustomer = await Customer.findOne({ 
        driverLicense: body.customer.driverLicense.trim().toUpperCase()
      });

      if (existingCustomer) {
        customer = existingCustomer;
        customerId = existingCustomer._id;
        console.log('👤 Found existing customer by license:', customer.name);
      } else {
        // Create new customer
        customer = new Customer({
          name: body.customer.name.trim(),
          phone: body.customer.phone.trim(),
          driverLicense: body.customer.driverLicense.trim().toUpperCase(),
          totalBookings: 0,
          createdAt: new Date()
        });
        await customer.save();
        customerId = customer._id;
        console.log('👤 Created new customer:', customer.name);
      }
    }

    // Check if customer is blacklisted (but allow warnings)
    if (customer.isBlacklisted && 
        customer.blacklistDetails && 
        customer.blacklistDetails.isActive && 
        customer.blacklistDetails.severity !== 'warning') {
      return NextResponse.json(
        { success: false, error: 'Customer is blacklisted and cannot make bookings' },
        { status: 403 }
      );
    }

    // Calculate endTime if not provided
    let calculatedEndTime;
    if (body.endTime && body.endTime !== '' && body.endTime !== 'undefined') {
      calculatedEndTime = new Date(body.endTime);
      console.log('✅ Using provided endTime:', calculatedEndTime);
    } else {
      calculatedEndTime = calculateEndTimeForPackage(body.startTime, body.customBookingType);
      console.log('⚠️ EndTime was missing, calculated:', calculatedEndTime);
    }

    // Verify vehicle exists and is available
    const vehicle = await Vehicle.findById(body.vehicleId);
    if (!vehicle) {
      return NextResponse.json(
        { success: false, error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    if (vehicle.status !== 'available') {
      return NextResponse.json(
        { success: false, error: 'Vehicle is not available for booking' },
        { status: 400 }
      );
    }

    // Check for active bookings for this customer
    const activeBooking = await Booking.findOne({
      customerId: customerId,
      status: 'active'
    });

    if (activeBooking) {
      return NextResponse.json(
        { success: false, error: 'Customer already has an active booking' },
        { status: 400 }
      );
    }

    // Generate unique booking ID
    const bookingId = `BK${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    // Create custom booking with all the data
    const bookingData = {
      bookingId,
      vehicleId: body.vehicleId,
      customerId: customerId, // FIXED: Use the resolved customerId
      signature: body.signature,
      startTime: new Date(body.startTime),
      endTime: calculatedEndTime,
      estimatedReturnTime: calculatedEndTime,
      finalAmount: body.finalAmount,
      paymentMethod: body.paymentMethod || 'cash',
      status: 'active',
      
      // Safety checklist
      helmetProvided: body.helmetProvided || false,
      aadharCardCollected: body.aadharCardCollected || false,
      vehicleInspected: body.vehicleInspected || false,
      securityDepositCollected: body.securityDepositCollected || false,
      securityDepositAmount: body.securityDepositAmount || 0,
      
      // Multiple driver support
      actualDriver: body.actualDriver || {
        isSameAsLicenseHolder: true,
        name: null,
        phone: null,
        relationToLicenseHolder: null,
        alternateId: null
      },
      
      // Enhanced security
      enhancedSecurity: body.enhancedSecurity || {
        isRequired: false,
        reason: null,
        additionalDepositAmount: 0
      },
      
      // Custom booking specific fields
      isCustomBooking: true,
      customBookingType: body.customBookingType,
      customBookingLabel: body.customBookingLabel || `${body.customBookingType} package`,
      
      // Add custom pricing breakdown for analytics
      pricingBreakdown: [{
        period: body.customBookingLabel || `${body.customBookingType} package`,
        startTime: new Date(body.startTime).toLocaleTimeString('en-IN'),
        endTime: calculatedEndTime.toLocaleTimeString('en-IN'),
        minutes: Math.floor((calculatedEndTime - new Date(body.startTime)) / (1000 * 60)),
        rate: body.finalAmount,
        isNightCharge: body.customBookingType === 'night',
        description: `Custom booking - ${body.customBookingLabel || body.customBookingType}`
      }],
      
      additionalNotes: body.additionalNotes || `Custom booking: ${body.customBookingLabel || body.customBookingType} - Fixed rate ₹${body.finalAmount}`,
      createdAt: new Date()
    };

    console.log('💾 Creating booking with data:', {
      bookingId: bookingData.bookingId,
      vehicleId: bookingData.vehicleId,
      customerId: bookingData.customerId,
      startTime: bookingData.startTime.toISOString(),
      endTime: bookingData.endTime.toISOString(),
      finalAmount: bookingData.finalAmount
    });
    
    const booking = new Booking(bookingData);
    await booking.save();

    // Update vehicle status to rented
    await Vehicle.findByIdAndUpdate(body.vehicleId, { 
      status: 'rented',
      lastUpdated: new Date()
    });

    // Update customer stats
    await Customer.findByIdAndUpdate(customerId, {
      $inc: { totalBookings: 1 },
      lastVisit: new Date()
    });

    // Populate the booking with related data
    const populatedBooking = await Booking.findById(booking._id)
      .populate('vehicleId', 'type model plateNumber')
      .populate('customerId', 'name phone driverLicense');

    console.log('✅ Custom booking created successfully:', booking.bookingId);

    // Check for customer warnings
    let warningInfo = null;
    if (customer.isBlacklisted && 
        customer.blacklistDetails?.isActive && 
        customer.blacklistDetails.severity === 'warning') {
      warningInfo = {
        reason: customer.blacklistDetails.reason,
        customReason: customer.blacklistDetails.customReason,
        blacklistedAt: customer.blacklistDetails.blacklistedAt,
        blacklistedBy: customer.blacklistDetails.blacklistedBy,
        message: 'Customer has a warning on their account. Please monitor this booking carefully.'
      };
    }

    return NextResponse.json({
      success: true,
      booking: populatedBooking,
      estimatedReturnTime: calculatedEndTime.toISOString(),
      calculatedEndTime: calculatedEndTime.toISOString(),
      warning: warningInfo,
      message: `Custom booking created successfully with fixed rate of ₹${body.finalAmount}`,
      packageInfo: {
        type: body.customBookingType,
        label: body.customBookingLabel || body.customBookingType,
        duration: Math.floor((calculatedEndTime - new Date(body.startTime)) / (1000 * 60 * 60))
      }
    });

  } catch (error) {
    console.error('❌ Custom booking creation error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// GET method unchanged
export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const customerId = searchParams.get('customerId');
    const vehicleId = searchParams.get('vehicleId');
    
    // Build query for custom bookings only
    const query = { isCustomBooking: true };
    
    if (status && status !== 'all') {
      query.status = status;
    }
    if (customerId) {
      query.customerId = customerId;
    }
    if (vehicleId) {
      query.vehicleId = vehicleId;
    }
    
    const customBookings = await Booking.find(query)
      .populate('vehicleId', 'type model plateNumber status')
      .populate('customerId', 'name phone driverLicense isBlacklisted')
      .sort({ createdAt: -1 })
      .limit(100);
    
    // Filter out bookings with blacklisted customers unless specifically requested
    const filteredBookings = customBookings.filter(booking => 
      booking.customerId && !booking.customerId.isBlacklisted
    );
    
    console.log(`Found ${filteredBookings.length} custom bookings with query:`, query);
    
    return NextResponse.json({ 
      success: true, 
      bookings: filteredBookings,
      isCustomBookingsOnly: true
    });
    
  } catch (error) {
    console.error('Custom bookings API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}