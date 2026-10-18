// src/app/api/bookings/route.js
import connectDB from '@/lib/db';
import Booking from '@/models/Booking';
import Customer from '@/models/Customer';
import Vehicle from '@/models/Vehicle';
import { NextResponse } from 'next/server';
import { SettingsService } from '@/services/SettingsService';
import { BookingService } from '@/services/BookingService';

// Helper function to validate phone number
function validatePhoneNumber(phone) {
  return /^[6-9]\d{9}$/.test(phone);
}

// Helper function to validate driving license
function validateDrivingLicense(license) {
  return /^[A-Z]{2}\d{2}[A-Z0-9]{11}$/.test(license);
}

// Helper function to validate Aadhar number
function validateAadharNumber(aadhar) {
  return /^\d{4}\s?\d{4}\s?\d{4}$/.test(aadhar);
}

// Helper function to validate PAN number
function validatePanNumber(pan) {
  return /^[A-Z]{5}\d{4}[A-Z]$/.test(pan);
}

export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    
    let query = {};
    if (status === 'active') {
      query.status = 'active';
    }
    
    const bookings = await Booking.find(query)
      .populate('vehicleId', 'type model plateNumber')
      .populate('customerId', 'name phone driverLicense')
      .sort({ createdAt: -1 });

    const filteredBookings = bookings.filter(booking => 
      booking.status !== 'cancelled'
    );
    
    return NextResponse.json({ success: true, bookings: filteredBookings });
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
      hasSignature: !!body.signature,
      hasMultipleDriver: body.actualDriver && !body.actualDriver.isSameAsLicenseHolder,
      estimatedReturnTime: body.estimatedReturnTime
    });

    // Validate estimated return time
    if (!body.estimatedReturnTime) {
      return NextResponse.json(
        { success: false, error: 'Estimated return time is required' },
        { status: 400 }
      );
    }
    
    const startTime = new Date(body.startTime || new Date());
    const estimatedReturn = new Date(body.estimatedReturnTime);
    
    if (isNaN(estimatedReturn.getTime())) {
      return NextResponse.json(
        { success: false, error: 'Invalid estimated return time' },
        { status: 400 }
      );
    }
    
    if (estimatedReturn <= startTime) {
      return NextResponse.json(
        { success: false, error: 'Estimated return time must be after start time' },
        { status: 400 }
      );
    }
    
    // Validate required fields
    if (!body.vehicleId || !body.customer || !body.signature) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: vehicleId, customer, or signature' },
        { status: 400 }
      );
    }
    
    if (!body.customer.name || !body.customer.phone || !body.customer.driverLicense) {
      return NextResponse.json(
        { success: false, error: 'Missing customer details: name, phone, or driverLicense' },
        { status: 400 }
      );
    }

    // Multiple driver validation
    const actualDriver = body.actualDriver || { isSameAsLicenseHolder: true };
    
    if (!actualDriver.isSameAsLicenseHolder) {
      if (!actualDriver.name || !actualDriver.phone || !actualDriver.relationToLicenseHolder || !actualDriver.alternateId) {
        return NextResponse.json({
          success: false,
          error: 'Complete actual driver information is required when different from license holder'
        }, { status: 400 });
      }

      if (!validatePhoneNumber(actualDriver.phone)) {
        return NextResponse.json({
          success: false,
          error: 'Please provide a valid phone number for the actual driver'
        }, { status: 400 });
      }

      const isValidAadhar = validateAadharNumber(actualDriver.alternateId);
      const isValidPan = validatePanNumber(actualDriver.alternateId);
      
      if (!isValidAadhar && !isValidPan) {
        return NextResponse.json({
          success: false,
          error: 'Please provide a valid Aadhar number (1234 5678 9012) or PAN (ABCDE1234F) for the actual driver'
        }, { status: 400 });
      }

      const hasEnhancedSecurity = body.aadharCardCollected || 
        (body.securityDepositCollected && body.securityDepositAmount >= 1000);

      if (!hasEnhancedSecurity) {
        return NextResponse.json({
          success: false,
          error: 'Enhanced security required for multiple drivers: Either collect both Aadhar cards OR ₹1000 security deposit'
        }, { status: 400 });
      }
    }

    // Optional passenger information
    let passengerInfo = null;
    if (body.passengerInfo?.name || body.passengerInfo?.phone) {
      const passengerName = body.passengerInfo.name?.trim();
      const passengerPhone = body.passengerInfo.phone?.trim();

      if (!passengerName || !passengerPhone) {
        return NextResponse.json({
          success: false,
          error: 'Both passenger name and phone are required when passenger information is provided',
        }, { status: 400 });
      }

      if (!validatePhoneNumber(passengerPhone)) {
        return NextResponse.json({
          success: false,
          error: 'Please provide a valid phone number for the passenger',
        }, { status: 400 });
      }

      passengerInfo = {
        name: passengerName,
        phone: passengerPhone,
      };
    }
    
    // Clean customer data
    const cleanCustomerData = {
      name: body.customer.name.trim(),
      phone: body.customer.phone.trim(),
      driverLicense: body.customer.driverLicense.trim().toUpperCase()
    };
    
    // Find or create customer
    let customer = await Customer.findOne({ 
      driverLicense: cleanCustomerData.driverLicense 
    });
    
    if (!customer) {
      customer = new Customer({
        ...cleanCustomerData,
        totalBookings: 0,
        lastVisit: new Date()
      });
      
      try {
        await customer.save();
      } catch (customerSaveError) {
        return NextResponse.json(
          { success: false, error: 'Failed to create customer: ' + customerSaveError.message },
          { status: 500 }
        );
      }
    } else {
      // Check blacklist
      if (customer.isBlacklisted && customer.blacklistDetails?.isActive) {
        const blacklistDetails = customer.blacklistDetails;
        const severity = blacklistDetails.severity;
        
        if (severity === 'temporary_ban' && blacklistDetails.unblacklistAt) {
          const now = new Date();
          if (now > blacklistDetails.unblacklistAt) {
            customer.blacklistDetails.isActive = false;
            customer.blacklistDetails.unblacklistedAt = now;
            customer.blacklistDetails.unblacklistedBy = 'system';
            customer.blacklistDetails.unblacklistReason = 'Temporary ban expired automatically';
            await customer.save();
          }
        }
        
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
        }
      }
      
      // Update customer
      customer.name = cleanCustomerData.name;
      customer.phone = cleanCustomerData.phone;
      customer.driverLicense = cleanCustomerData.driverLicense;
      customer.totalBookings += 1;
      customer.lastVisit = new Date();
      
      try {
        await customer.save();
      } catch (customerUpdateError) {
        return NextResponse.json(
          { success: false, error: 'Failed to update customer: ' + customerUpdateError.message },
          { status: 500 }
        );
      }
    }
    
    if (!customer._id) {
      return NextResponse.json(
        { success: false, error: 'Customer creation failed - missing ID' },
        { status: 500 }
      );
    }

    // NEW: Block if customer already has an active booking
    const existingActiveBooking = await Booking.findOne({
      customerId: customer._id,
      status: 'active'
    }).populate('vehicleId', 'model plateNumber');

    if (existingActiveBooking) {
      return NextResponse.json({
        success: false,
        error: `This customer already has an active booking (${existingActiveBooking.bookingId}) on ${existingActiveBooking.vehicleId?.model || 'a vehicle'}. Please complete or cancel it first.`,
        activeBooking: {
          bookingId: existingActiveBooking.bookingId,
          vehicle: existingActiveBooking.vehicleId
            ? `${existingActiveBooking.vehicleId.model} (${existingActiveBooking.vehicleId.plateNumber})`
            : 'Unknown',
          startTime: existingActiveBooking.startTime
        }
      }, { status: 400 });
    }
    
    // Check vehicle availability
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
    
    // Calculate rental start time from settings
    const rentalStartTime = await SettingsService.calculateRentalStartTime();
    
    // Enhanced security
    const enhancedSecurity = body.enhancedSecurity || {};
    if (!actualDriver.isSameAsLicenseHolder) {
      enhancedSecurity.isRequired = true;
      enhancedSecurity.reason = 'multiple_driver';
      enhancedSecurity.additionalDepositAmount = body.securityDepositAmount > 500 
        ? body.securityDepositAmount - 500 
        : 0;
    }
    
    // Create booking
    const bookingData = {
      vehicleId: body.vehicleId,
      customerId: customer._id,
      signature: body.signature,
      helmetProvided: body.helmetProvided || false,
      aadharCardCollected: body.aadharCardCollected || false,
      vehicleInspected: body.vehicleInspected || false,
      additionalNotes: body.additionalNotes || '',
      securityDepositCollected: body.securityDepositCollected || false,
      securityDepositAmount: body.securityDepositAmount || 0,
      startTime: rentalStartTime,
      estimatedReturnTime: estimatedReturn,   // ← correctly uses the declared variable
      createdAt: new Date(),
      
      actualDriver: {
        isSameAsLicenseHolder: actualDriver.isSameAsLicenseHolder,
        name: actualDriver.isSameAsLicenseHolder ? null : actualDriver.name?.trim(),
        phone: actualDriver.isSameAsLicenseHolder ? null : actualDriver.phone?.trim(),
        relationToLicenseHolder: actualDriver.isSameAsLicenseHolder ? null : actualDriver.relationToLicenseHolder,
        alternateId: actualDriver.isSameAsLicenseHolder ? null : actualDriver.alternateId?.trim().toUpperCase()
      },
      
      enhancedSecurity: enhancedSecurity.isRequired ? {
        isRequired: true,
        reason: enhancedSecurity.reason || 'multiple_driver',
        additionalDepositAmount: enhancedSecurity.additionalDepositAmount || 0,
        requiredAt: new Date(),
        notes: !actualDriver.isSameAsLicenseHolder 
          ? `Multiple driver booking: ${actualDriver.name} (${actualDriver.relationToLicenseHolder})` 
          : null
      } : {
        isRequired: false
      },

      ...(passengerInfo ? { passengerInfo } : {}),
    };
    
    const booking = new Booking(bookingData);
    
    try {
      await booking.save();
    } catch (bookingSaveError) {
      console.error('❌ Error saving booking:', bookingSaveError);
      return NextResponse.json(
        { success: false, error: 'Failed to create booking: ' + bookingSaveError.message },
        { status: 500 }
      );
    }
    
    // Update vehicle status
    try {
      const vehicleUpdateResult = await BookingService.updateVehicleStatusSafely(
        body.vehicleId, 
        'rented', 
        `new booking ${booking.bookingId}`
      );
      
      if (!vehicleUpdateResult.success) {
        console.error('❌ Vehicle status update failed:', vehicleUpdateResult.error);
      }
    } catch (vehicleUpdateError) {
      console.error('❌ Error updating vehicle status:', vehicleUpdateError);
      try {
        await Vehicle.findByIdAndUpdate(body.vehicleId, { status: 'rented' });
      } catch (fallbackError) {
        console.error('❌ Fallback vehicle update also failed:', fallbackError);
      }
    }
    
    // Populate booking for response
    let populatedBooking;
    try {
      populatedBooking = await Booking.findById(booking._id)
        .populate('vehicleId', 'type model plateNumber')
        .populate('customerId', 'name phone driverLicense');
      
      if (!populatedBooking) {
        throw new Error('Booking not found after creation');
      }
      
      if (!populatedBooking.customerId) {
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
        populatedBooking.vehicleId = vehicle;
      }
      
    } catch (populationError) {
      console.error('❌ Error populating booking:', populationError);
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
    
    // Warning info
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
    
    // Multiple driver info
    let multipleDriverInfo = null;
    if (!actualDriver.isSameAsLicenseHolder) {
      multipleDriverInfo = {
        actualDriverName: actualDriver.name,
        relationship: actualDriver.relationToLicenseHolder,
        enhancedSecurity: true,
        message: `Multiple driver booking: ${actualDriver.name} (${actualDriver.relationToLicenseHolder}) will be driving. Enhanced security measures are in effect.`
      };
    }
    
    const response = {
      success: true,
      booking: populatedBooking,
      warning: warningInfo,
      multipleDriverInfo: multipleDriverInfo,
      rentalStartTime: rentalStartTime.toISOString(),
      estimatedReturnTime: estimatedReturn.toISOString(),
      message: `Booking created successfully. Rental starts at ${rentalStartTime.toLocaleString('en-IN')}`
    };
    
    if (enhancedSecurity.isRequired) {
      response.securityInfo = {
        enhancedSecurityRequired: true,
        reason: enhancedSecurity.reason,
        depositAmount: bookingData.securityDepositAmount,
        additionalAmount: enhancedSecurity.additionalDepositAmount,
        message: 'Enhanced security measures are in effect for this booking.'
      };
    }

    // Auto-convert today's open reservation for this customer (if any)
try {
  const Reservation = (await import('@/models/Reservation')).default;

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  const openReservation = await Reservation.findOne({
    customerId: booking.customerId, // or customerDoc._id — same id used on the booking
    status: 'reserved',
    pickupTime: { $gte: startOfToday, $lte: endOfToday }
  });

  if (openReservation) {
    openReservation.status = 'converted';
    openReservation.bookingId = booking._id;
    openReservation.convertedAt = new Date();
    await openReservation.save();
    console.log(`✅ Auto-converted reservation ${openReservation.reservationId} → booking ${booking.bookingId}`);
  }
} catch (resErr) {
  console.error('Could not auto-convert reservation:', resErr);
  // Do not fail the booking — rental already created
}
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('❌ Booking creation error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}