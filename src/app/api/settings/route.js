import { NextResponse } from 'next/server';

let settings = {
  // Business settings
  businessName: 'MR Travels',
  businessAddress: 'Bhopal, Madhya Pradesh',
  businessPhone: '',
  businessEmail: '',
  gstNumber: '',
  
  // Pricing settings
  hourlyRate: 80,
  minimumHours: 1,
  lateFeePerHour: 20,
  securityDeposit: 500,
  graceMinutes: 15,
  blockMinutes: 30,
  nightChargeTime: '22:30',
  nightMultiplier: 2,
  
  // NEW: Start delay settings
  startDelayMinutes: 5,
  roundToNearestMinutes: 5,
  
  // Operating settings
  operatingHours: { start: '06:00', end: '22:00' },
  maxAdvanceBookingDays: 7,
  reminderTimeBeforeReturn: 30,
  
  // Notification settings
  smsNotifications: true,
  emailNotifications: false,
  whatsappNotifications: false,
  
  // System settings
  autoBackup: true,
  backupFrequency: 'daily',
  dataRetentionMonths: 12,
  requireAadharPhoto: true,
  requireSignature: true,
  requireLicenseVerification: true,
  
  // Metadata
  version: '1.0.0',
  lastUpdated: new Date().toISOString()
};

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      settings,
      message: 'Settings retrieved successfully'
    });
  } catch (error) {
    console.error('Settings GET API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.businessName || !body.hourlyRate) {
      return NextResponse.json(
        { success: false, error: 'Business name and hourly rate are required' },
        { status: 400 }
      );
    }
    
    // Validate pricing fields
    if (body.hourlyRate <= 0 || body.minimumHours <= 0) {
      return NextResponse.json(
        { success: false, error: 'Pricing values must be greater than 0' },
        { status: 400 }
      );
    }
    
    // Validate advanced pricing fields
    if (body.graceMinutes < 0 || body.graceMinutes > 60) {
      return NextResponse.json(
        { success: false, error: 'Grace period must be between 0 and 60 minutes' },
        { status: 400 }
      );
    }
    
    // NEW: Validate start delay settings
    if (body.startDelayMinutes < 0 || body.startDelayMinutes > 60) {
      return NextResponse.json(
        { success: false, error: 'Start delay must be between 0 and 60 minutes' },
        { status: 400 }
      );
    }
    
    if (body.roundToNearestMinutes && ![1, 5, 10, 15, 30].includes(body.roundToNearestMinutes)) {
      return NextResponse.json(
        { success: false, error: 'Round to nearest must be 1, 5, 10, 15, or 30 minutes' },
        { status: 400 }
      );
    }
    
    if (body.blockMinutes <= 0 || body.blockMinutes > 120) {
      return NextResponse.json(
        { success: false, error: 'Block duration must be between 1 and 120 minutes' },
        { status: 400 }
      );
    }
    
    if (body.nightMultiplier < 1 || body.nightMultiplier > 5) {
      return NextResponse.json(
        { success: false, error: 'Night multiplier must be between 1 and 5' },
        { status: 400 }
      );
    }
    
    // Validate night charge time format
    if (body.nightChargeTime && !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(body.nightChargeTime)) {
      return NextResponse.json(
        { success: false, error: 'Night charge time must be in HH:MM format' },
        { status: 400 }
      );
    }
    
    // Update settings
    settings = {
      ...settings,
      ...body,
      lastUpdated: new Date().toISOString(),
      version: settings.version // Preserve version
    };
    
    return NextResponse.json({
      success: true,
      settings,
      message: 'Settings updated successfully'
    });
  } catch (error) {
    console.error('Settings PUT API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Export current settings for use in other parts of the application
export function getCurrentSettings() {
  return settings;
}

// NEW: Helper function to calculate rental start time
export function calculateRentalStartTime(bookingTime = new Date(), delayMinutes = 5, roundToMinutes = 5) {
  const startTime = new Date(bookingTime.getTime() + (delayMinutes * 60 * 1000));
  
  if (roundToMinutes > 1) {
    const minutes = startTime.getMinutes();
    const roundedMinutes = Math.ceil(minutes / roundToMinutes) * roundToMinutes;
    startTime.setMinutes(roundedMinutes, 0, 0); // Set seconds and milliseconds to 0
    
    // Handle hour overflow
    if (roundedMinutes >= 60) {
      startTime.setHours(startTime.getHours() + Math.floor(roundedMinutes / 60));
      startTime.setMinutes(roundedMinutes % 60);
    }
  }
  
  return startTime;
}