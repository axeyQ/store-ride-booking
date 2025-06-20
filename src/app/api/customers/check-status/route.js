import connectDB from '@/lib/db';
import Customer from '@/models/Customer';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();
    const { driverLicense, phone } = body;
    
    if (!driverLicense && !phone) {
      return NextResponse.json(
        { success: false, error: 'Driver license or phone number required' },
        { status: 400 }
      );
    }
    
    // Find customer by driver license or phone
    let customer;
    if (driverLicense) {
      customer = await Customer.findOne({ driverLicense });
    } else {
      customer = await Customer.findOne({ phone });
    }
    
    if (!customer) {
      return NextResponse.json({
        success: true,
        canBook: true,
        status: 'new_customer',
        message: 'New customer - no previous records'
      });
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
    
    // Check current status
    if (!customer.isBlacklisted || !customer.blacklistDetails?.isActive) {
      return NextResponse.json({
        success: true,
        canBook: true,
        status: 'active_customer',
        customer: {
          _id: customer._id,
          name: customer.name,
          phone: customer.phone,
          driverLicense: customer.driverLicense,
          totalBookings: customer.totalBookings,
          lastVisit: customer.lastVisit
        }
      });
    }
    
    const blacklistDetails = customer.blacklistDetails;
    const severity = blacklistDetails.severity;
    
    // Helper function to get reason display text
    const getReasonText = (reason) => {
      const reasonMap = {
        'vehicle_damage': 'Vehicle Damage',
        'late_return': 'Late Return',
        'non_payment': 'Non-Payment',
        'behavioral_issues': 'Behavioral Issues',
        'violation_of_terms': 'Terms Violation',
        'theft_attempt': 'Theft Attempt',
        'fake_documents': 'Fake Documents',
        'reckless_driving': 'Reckless Driving',
        'other': 'Other'
      };
      return reasonMap[reason] || reason;
    };
    
    if (severity === 'warning') {
      return NextResponse.json({
        success: true,
        canBook: true,
        status: 'warning',
        customer: {
          _id: customer._id,
          name: customer.name,
          phone: customer.phone,
          driverLicense: customer.driverLicense,
          totalBookings: customer.totalBookings,
          lastVisit: customer.lastVisit
        },
        warning: {
          severity: 'warning',
          reason: getReasonText(blacklistDetails.reason),
          customReason: blacklistDetails.customReason,
          blacklistedAt: blacklistDetails.blacklistedAt,
          blacklistedBy: blacklistDetails.blacklistedBy,
          internalNotes: blacklistDetails.internalNotes,
          message: '⚠️ Customer has a warning on their account. Please monitor this booking carefully and ensure all safety protocols are followed.'
        }
      });
    }
    
    if (severity === 'temporary_ban') {
      const daysRemaining = Math.ceil((blacklistDetails.unblacklistAt - new Date()) / (1000 * 60 * 60 * 24));
      return NextResponse.json({
        success: true,
        canBook: false,
        status: 'temporary_ban',
        customer: {
          _id: customer._id,
          name: customer.name,
          phone: customer.phone,
          driverLicense: customer.driverLicense,
          totalBookings: customer.totalBookings,
          lastVisit: customer.lastVisit
        },
        blacklist: {
          severity: 'temporary_ban',
          reason: getReasonText(blacklistDetails.reason),
          customReason: blacklistDetails.customReason,
          blacklistedAt: blacklistDetails.blacklistedAt,
          unblacklistAt: blacklistDetails.unblacklistAt,
          blacklistedBy: blacklistDetails.blacklistedBy,
          internalNotes: blacklistDetails.internalNotes,
          daysRemaining: Math.max(0, daysRemaining),
          message: `⏳ Customer is temporarily banned for ${daysRemaining} more day(s). Reason: ${getReasonText(blacklistDetails.reason)}`
        }
      });
    }
    
    if (severity === 'permanent_ban') {
      return NextResponse.json({
        success: true,
        canBook: false,
        status: 'permanent_ban',
        customer: {
          _id: customer._id,
          name: customer.name,
          phone: customer.phone,
          driverLicense: customer.driverLicense,
          totalBookings: customer.totalBookings,
          lastVisit: customer.lastVisit
        },
        blacklist: {
          severity: 'permanent_ban',
          reason: getReasonText(blacklistDetails.reason),
          customReason: blacklistDetails.customReason,
          blacklistedAt: blacklistDetails.blacklistedAt,
          blacklistedBy: blacklistDetails.blacklistedBy,
          internalNotes: blacklistDetails.internalNotes,
          message: `🚫 Customer is permanently banned. Reason: ${getReasonText(blacklistDetails.reason)}. Contact management for appeal process.`
        }
      });
    }
    
    return NextResponse.json({
      success: true,
      canBook: true,
      status: 'active_customer',
      customer: {
        _id: customer._id,
        name: customer.name,
        phone: customer.phone,
        driverLicense: customer.driverLicense,
        totalBookings: customer.totalBookings,
        lastVisit: customer.lastVisit
      }
    });
    
  } catch (error) {
    console.error('Customer status check API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}