// src/app/api/settings/route.js
import { NextResponse } from 'next/server';
import { SettingsService } from '@/services/SettingsService';

// 🎯 In-memory settings storage (can be moved to database later)
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
  
  // Start delay settings
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
    // 🚀 NEW: Use SettingsService for consistency (but still return current settings)
    const mergedSettings = { ...SettingsService.DEFAULT_SETTINGS, ...settings };
    
    return NextResponse.json({
      success: true,
      settings: mergedSettings,
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
    
    // 🚀 NEW: Use SettingsService validation instead of inline validation
    const validation = SettingsService.validateSettings(body);
    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, error: validation.errors.join(', ') },
        { status: 400 }
      );
    }
    
    // Update settings with validation passed
    settings = {
      ...settings,
      ...body,
      lastUpdated: new Date().toISOString(),
      version: settings.version // Preserve version
    };
    
    // 🧹 Clear SettingsService cache when settings are updated
    SettingsService.clearCache();
    
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

// 📤 Export current settings for use in other parts of the application
export function getCurrentSettings() {
  return settings;
}

// 🔄 Update internal settings (for SettingsService to use)
export function updateInternalSettings(newSettings) {
  settings = { ...settings, ...newSettings };
  return settings;
}