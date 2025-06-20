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
      // **BLACKLIST VALIDATION**
      if (customer.isBlacklisted && customer.blacklistDetails?.isActive) {
        const severity = customer.blacklistDetails.severity;
        const reason = customer.blacklistDetails.reason;
        
        // Check if temporary ban has expired
        if (severity === 'temporary_ban' && customer.blacklistDetails.unblacklistAt) {
          const now = new Date();
          if (now > customer.blacklistDetails.unblacklistAt) {
            // Auto-unblacklist expired temporary ban
            customer.blacklistDetails.isActive = false;
            customer.blacklistDetails.unblacklistedAt = now;
            customer.blacklistDetails.unblacklistedBy = 'system';
            customer.blacklistDetails.unblacklistReason = 'Temporary ban expired automatically';
            await customer.save();
          } else {
            // Still under temporary ban
            return NextResponse.json({
              success: false,
              error: 'Customer is temporarily blacklisted',
              blacklist: {
                reason: reason,
                severity: severity,
                customReason: customer.blacklistDetails.customReason,
                blacklistedAt: customer.blacklistDetails.blacklistedAt,
                unblacklistAt: customer.blacklistDetails.unblacklistAt,
                blacklistedBy: customer.blacklistDetails.blacklistedBy,
                isTemporary: true,
                canBook: false
              }
            }, { status: 403 });
          }
        } else if (severity === 'permanent_ban') {
          // Permanent ban - completely blocked
          return NextResponse.json({
            success: false,
            error: 'Customer is permanently blacklisted',
            blacklist: {
              reason: reason,
              severity: severity,
              customReason: customer.blacklistDetails.customReason,
              blacklistedAt: customer.blacklistDetails.blacklistedAt,
              blacklistedBy: customer.blacklistDetails.blacklistedBy,
              isPermanent: true,
              canBook: false
            }
          }, { status: 403 });
        } else if (severity === 'warning') {
          // Warning - can book but show warning
          // Continue with booking but return warning info
        }
      }
      
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
    
    return NextResponse.json({ 
      success: true, 
      booking: populatedBooking,
      warning: warningInfo
    });
    
  } catch (error) {
    console.error('Booking creation error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// New endpoint to check customer blacklist status
export async function checkCustomerStatus(driverLicense) {
  try {
    await connectDB();
    
    const customer = await Customer.findOne({ driverLicense });
    if (!customer) {
      return { canBook: true, status: 'new_customer' };
    }
    
    // Auto-unblacklist expired temporary bans
    if (customer.isBlacklisted && 
        customer.blacklistDetails?.isActive && 
        customer.blacklistDetails.severity === 'temporary_ban' && 
        customer.blacklistDetails.unblacklistAt) {
      const now = new Date();
      if (now > customer.blacklistDetails.unblacklistAt) {
        customer.blacklistDetails.isActive = false;
        customer.blacklistDetails.unblacklistedAt = now;
        customer.blacklistDetails.unblacklistedBy = 'system';
        customer.blacklistDetails.unblacklistReason = 'Temporary ban expired automatically';
        await customer.save();
      }
    }
    
    if (!customer.isBlacklisted || !customer.blacklistDetails?.isActive) {
      return { 
        canBook: true, 
        status: 'active_customer',
        totalBookings: customer.totalBookings,
        lastVisit: customer.lastVisit
      };
    }
    
    const blacklistDetails = customer.blacklistDetails;
    const severity = blacklistDetails.severity;
    
    if (severity === 'warning') {
      return {
        canBook: true,
        status: 'warning',
        warning: {
          reason: blacklistDetails.reason,
          customReason: blacklistDetails.customReason,
          blacklistedAt: blacklistDetails.blacklistedAt,
          blacklistedBy: blacklistDetails.blacklistedBy,
          message: 'Customer has a warning. Monitor booking carefully.'
        }
      };
    }
    
    if (severity === 'temporary_ban') {
      return {
        canBook: false,
        status: 'temporary_ban',
        blacklist: {
          reason: blacklistDetails.reason,
          customReason: blacklistDetails.customReason,
          blacklistedAt: blacklistDetails.blacklistedAt,
          unblacklistAt: blacklistDetails.unblacklistAt,
          blacklistedBy: blacklistDetails.blacklistedBy,
          daysRemaining: Math.ceil((blacklistDetails.unblacklistAt - new Date()) / (1000 * 60 * 60 * 24))
        }
      };
    }
    
    if (severity === 'permanent_ban') {
      return {
        canBook: false,
        status: 'permanent_ban',
        blacklist: {
          reason: blacklistDetails.reason,
          customReason: blacklistDetails.customReason,
          blacklistedAt: blacklistDetails.blacklistedAt,
          blacklistedBy: blacklistDetails.blacklistedBy
        }
      };
    }
    
    return { canBook: true, status: 'active_customer' };
    
  } catch (error) {
    console.error('Error checking customer status:', error);
    return { canBook: true, status: 'error', error: error.message };
  }
}