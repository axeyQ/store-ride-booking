import connectDB from '@/lib/db';
import Booking from '@/models/Booking';
import Customer from '@/models/Customer';
import Vehicle from '@/models/Vehicle';
import { NextResponse } from 'next/server';

// Helper function to calculate rental start time with settings
async function calculateRentalStartTime() {
  try {
    // Get current settings
    const settingsResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/settings`);
    const settingsData = await settingsResponse.json();
    
    const settings = settingsData.success ? settingsData.settings : {
      startDelayMinutes: 5,
      roundToNearestMinutes: 5
    };
    
    const bookingTime = new Date();
    const delayMinutes = settings.startDelayMinutes || 5;
    const roundToMinutes = settings.roundToNearestMinutes || 5;
    
    // Add delay to current time
    const startTime = new Date(bookingTime.getTime() + (delayMinutes * 60 * 1000));
    
    // Round to nearest specified minutes
    if (roundToMinutes > 1) {
      const minutes = startTime.getMinutes();
      const roundedMinutes = Math.ceil(minutes / roundToMinutes) * roundToMinutes;
      
      if (roundedMinutes >= 60) {
        startTime.setHours(startTime.getHours() + Math.floor(roundedMinutes / 60));
        startTime.setMinutes(roundedMinutes % 60, 0, 0);
      } else {
        startTime.setMinutes(roundedMinutes, 0, 0);
      }
    }
    
    return startTime;
  } catch (error) {
    console.error('Error calculating rental start time:', error);
    // Fallback to 5 minutes from now, rounded to nearest 5 minutes
    const fallbackTime = new Date(Date.now() + 5 * 60 * 1000);
    const minutes = fallbackTime.getMinutes();
    const roundedMinutes = Math.ceil(minutes / 5) * 5;
    
    if (roundedMinutes >= 60) {
      fallbackTime.setHours(fallbackTime.getHours() + 1);
      fallbackTime.setMinutes(0, 0, 0);
    } else {
      fallbackTime.setMinutes(roundedMinutes, 0, 0);
    }
    
    return fallbackTime;
  }
}

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
    
    console.log('📝 Creating booking with data:', {
      vehicleId: body.vehicleId,
      customer: body.customer,
      hasSignature: !!body.signature
    });
    
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
        { success: false, error: 'Missing customer details: name, phone, or driverLicense' },
        { status: 400 }
      );
    }
    
    // Clean customer data
    const cleanCustomerData = {
      name: body.customer.name.trim(),
      phone: body.customer.phone.trim(),
      driverLicense: body.customer.driverLicense.trim().toUpperCase()
    };
    
    console.log('🔍 Looking for existing customer with license:', cleanCustomerData.driverLicense);
    
    // Find or create customer with better error handling
    let customer = await Customer.findOne({ 
      driverLicense: cleanCustomerData.driverLicense 
    });
    
    if (!customer) {
      console.log('🆕 Creating new customer:', cleanCustomerData.name);
      // Create new customer
      customer = new Customer({
        ...cleanCustomerData,
        totalBookings: 0,
        lastVisit: new Date()
      });
      
      try {
        await customer.save();
        console.log('✅ New customer created with ID:', customer._id);
      } catch (customerSaveError) {
        console.error('❌ Error saving new customer:', customerSaveError);
        return NextResponse.json(
          { success: false, error: 'Failed to create customer: ' + customerSaveError.message },
          { status: 500 }
        );
      }
    } else {
      console.log('👤 Found existing customer:', customer.name, 'ID:', customer._id);
      
      // Check blacklist status
      if (customer.isBlacklisted && customer.blacklistDetails?.isActive) {
        const blacklistDetails = customer.blacklistDetails;
        const severity = blacklistDetails.severity;
        
        // Auto-unblacklist expired temporary bans
        if (severity === 'temporary_ban' && blacklistDetails.unblacklistAt) {
          const now = new Date();
          if (now > blacklistDetails.unblacklistAt) {
            customer.blacklistDetails.isActive = false;
            customer.blacklistDetails.unblacklistedAt = now;
            customer.blacklistDetails.unblacklistedBy = 'system';
            customer.blacklistDetails.unblacklistReason = 'Temporary ban expired automatically';
            await customer.save();
            console.log('✅ Auto-unblacklisted expired temporary ban for customer:', customer.name);
          }
        }
        
        // Check current status after auto-unblacklist
        if (customer.isBlacklisted && customer.blacklistDetails?.isActive) {
          if (severity === 'permanent_ban') {
            return NextResponse.json({ 
              success: false, 
              error: 'Customer is permanently banned from service',
              blacklist: {
                reason: customer.blacklistDetails.reason,
                customReason: customer.blacklistDetails.customReason,
                blacklistedAt: customer.blacklistDetails.blacklistedAt,
                blacklistedBy: customer.blacklistDetails.blacklistedBy,
                isPermanent: true,
                canBook: false
              }
            }, { status: 403 });
          } else if (severity === 'temporary_ban') {
            const daysRemaining = Math.ceil((customer.blacklistDetails.unblacklistAt - new Date()) / (1000 * 60 * 60 * 24));
            return NextResponse.json({ 
              success: false, 
              error: `Customer is temporarily banned for ${daysRemaining} more day(s)`,
              blacklist: {
                reason: customer.blacklistDetails.reason,
                customReason: customer.blacklistDetails.customReason,
                blacklistedAt: customer.blacklistDetails.blacklistedAt,
                unblacklistAt: customer.blacklistDetails.unblacklistAt,
                blacklistedBy: customer.blacklistDetails.blacklistedBy,
                daysRemaining: Math.max(0, daysRemaining),
                canBook: false
              }
            }, { status: 403 });
          }
          // For warnings, continue with booking but add warning
        }
      }
      
      // Update customer info and increment booking count
      customer.name = cleanCustomerData.name;
      customer.phone = cleanCustomerData.phone;
      customer.driverLicense = cleanCustomerData.driverLicense;
      customer.totalBookings += 1;
      customer.lastVisit = new Date();
      
      try {
        await customer.save();
        console.log('✅ Customer updated successfully:', customer.name);
      } catch (customerUpdateError) {
        console.error('❌ Error updating customer:', customerUpdateError);
        return NextResponse.json(
          { success: false, error: 'Failed to update customer: ' + customerUpdateError.message },
          { status: 500 }
        );
      }
    }
    
    // Verify customer has valid _id
    if (!customer._id) {
      console.error('❌ Customer ID is missing after save operation');
      return NextResponse.json(
        { success: false, error: 'Customer creation failed - missing ID' },
        { status: 500 }
      );
    }
    
    console.log('✅ Customer ready for booking. Customer ID:', customer._id);
    
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
    
    console.log('🚗 Vehicle available:', vehicle.model, vehicle.plateNumber);
    
    // Calculate rental start time with delay and rounding
    const rentalStartTime = await calculateRentalStartTime();
    console.log('⏰ Calculated start time:', rentalStartTime);
    
    // Create booking with calculated start time
    const bookingData = {
      vehicleId: body.vehicleId,
      customerId: customer._id, // Ensure we use the saved customer's ID
      signature: body.signature,
      helmetProvided: body.helmetProvided || false,
      aadharCardCollected: body.aadharCardCollected || false,
      vehicleInspected: body.vehicleInspected || false,
      additionalNotes: body.additionalNotes || '',
      securityDepositCollected: body.securityDepositCollected || false,  // NEW
      securityDepositAmount: body.securityDepositAmount || 0,  // NEW
      startTime: rentalStartTime,
      createdAt: new Date()
    };
    
    console.log('📋 Creating booking with data:', {
      ...bookingData,
      signature: '[SIGNATURE_DATA]' // Don't log the actual signature
    });
    
    const booking = new Booking(bookingData);
    
    try {
      await booking.save();
      console.log('✅ Booking created with ID:', booking._id, 'Booking ID:', booking.bookingId);
    } catch (bookingSaveError) {
      console.error('❌ Error saving booking:', bookingSaveError);
      return NextResponse.json(
        { success: false, error: 'Failed to create booking: ' + bookingSaveError.message },
        { status: 500 }
      );
    }
    
    // Update vehicle status to rented
    try {
      await Vehicle.findByIdAndUpdate(body.vehicleId, { status: 'rented' });
      console.log('✅ Vehicle status updated to rented');
    } catch (vehicleUpdateError) {
      console.error('❌ Error updating vehicle status:', vehicleUpdateError);
      // This is not critical enough to fail the booking, but log it
    }
    
    // Populate the booking for response with error handling
    let populatedBooking;
    try {
      populatedBooking = await Booking.findById(booking._id)
        .populate('vehicleId', 'type model plateNumber')
        .populate('customerId', 'name phone driverLicense');
      
      console.log('✅ Booking populated successfully');
      
      // Verify population worked
      if (!populatedBooking) {
        throw new Error('Booking not found after creation');
      }
      
      if (!populatedBooking.customerId) {
        console.error('❌ Customer population failed');
        // Manually attach customer data if population failed
        populatedBooking = {
          ...booking.toObject(),
          customerId: {
            _id: customer._id,
            name: customer.name,
            phone: customer.phone,
            driverLicense: customer.driverLicense
          },
          vehicleId: vehicle
        };
      }
      
      if (!populatedBooking.vehicleId) {
        console.error('❌ Vehicle population failed');
        populatedBooking.vehicleId = vehicle;
      }
      
    } catch (populationError) {
      console.error('❌ Error populating booking:', populationError);
      // Return booking with manually attached data
      populatedBooking = {
        ...booking.toObject(),
        customerId: {
          _id: customer._id,
          name: customer.name,
          phone: customer.phone,
          driverLicense: customer.driverLicense
        },
        vehicleId: {
          _id: vehicle._id,
          type: vehicle.type,
          model: vehicle.model,
          plateNumber: vehicle.plateNumber
        }
      };
    }
    
    // Include warning if customer has warning status
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
    
    console.log('✅ Booking creation completed successfully');
    
    return NextResponse.json({
      success: true,
      booking: populatedBooking,
      warning: warningInfo,
      rentalStartTime: rentalStartTime.toISOString(),
      message: `Booking created successfully. Rental starts at ${rentalStartTime.toLocaleString('en-IN')}`
    });
    
  } catch (error) {
    console.error('❌ Booking creation error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}