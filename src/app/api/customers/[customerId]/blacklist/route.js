import connectDB from '@/lib/db';
import Customer from '@/models/Customer';
import BlacklistHistory from '@/models/BlacklistHistory';
import { NextResponse } from 'next/server';

export async function POST(request, { params }) {
  try {
    await connectDB();
    const { customerId } = params;
    const body = await request.json();
    
    const {
      reason,
      severity,
      customReason,
      duration, // days for temporary ban
      performedBy,
      internalNotes,
      evidencePhotos,
      relatedBookingId,
      ipAddress
    } = body;
    
    // Validate required fields
    if (!reason || !severity || !performedBy) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: reason, severity, performedBy' },
        { status: 400 }
      );
    }
    
    // Find customer
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }
    
    // Check if already blacklisted
    if (customer.isCurrentlyBlacklisted) {
      return NextResponse.json(
        { success: false, error: 'Customer is already blacklisted' },
        { status: 400 }
      );
    }
    
    // Store previous status for history
    const previousStatus = {
      isBlacklisted: customer.isBlacklisted,
      reason: customer.blacklistDetails?.reason,
      severity: customer.blacklistDetails?.severity,
    };
    
    // Blacklist customer
    const blacklistData = {
      reason,
      severity,
      customReason: customReason || '',
      duration: severity === 'temporary_ban' ? duration : null,
      blacklistedBy: performedBy,
      internalNotes: internalNotes || '',
      evidencePhotos: evidencePhotos || [],
    };
    
    customer.blacklist(blacklistData);
    await customer.save();
    
    // Log action in history
    await BlacklistHistory.logAction({
      customerId: customer._id,
      action: 'blacklisted',
      reason,
      severity,
      customReason: customReason || '',
      duration: severity === 'temporary_ban' ? duration : null,
      performedBy,
      internalNotes: internalNotes || '',
      evidencePhotos: evidencePhotos || [],
      previousStatus,
      newStatus: {
        isBlacklisted: true,
        reason,
        severity,
      },
      effectiveUntil: customer.blacklistDetails.unblacklistAt,
      relatedBookingId,
      ipAddress,
    });
    
    // TODO: Send notification to customer (SMS/Email)
    // await sendBlacklistNotification(customer);
    
    return NextResponse.json({
      success: true,
      message: 'Customer blacklisted successfully',
      customer: {
        _id: customer._id,
        name: customer.name,
        phone: customer.phone,
        isBlacklisted: customer.isBlacklisted,
        blacklistDetails: customer.blacklistDetails,
      }
    });
    
  } catch (error) {
    console.error('Blacklist API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}