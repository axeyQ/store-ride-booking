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
        performedBy,
        reason,
        internalNotes,
        ipAddress
      } = body;
      
      // Validate required fields
      if (!performedBy || !reason) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields: performedBy, reason' },
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
      
      // Check if blacklisted
      if (!customer.isBlacklisted) {
        return NextResponse.json(
          { success: false, error: 'Customer is not blacklisted' },
          { status: 400 }
        );
      }
      
      // Store previous status for history
      const previousStatus = {
        isBlacklisted: customer.isBlacklisted,
        reason: customer.blacklistDetails?.reason,
        severity: customer.blacklistDetails?.severity,
      };
      
      // Unblacklist customer
      customer.unblacklist(performedBy, reason);
      await customer.save();
      
      // Log action in history
      await BlacklistHistory.logAction({
        customerId: customer._id,
        action: 'unblacklisted',
        performedBy,
        internalNotes: internalNotes || '',
        unblacklistReason: reason,
        previousStatus,
        newStatus: {
          isBlacklisted: true, // Still technically blacklisted but inactive
          reason: customer.blacklistDetails.reason,
          severity: customer.blacklistDetails.severity,
        },
        ipAddress,
      });
      
      // TODO: Send notification to customer
      // await sendUnblacklistNotification(customer);
      
      return NextResponse.json({
        success: true,
        message: 'Customer unblacklisted successfully',
        customer: {
          _id: customer._id,
          name: customer.name,
          phone: customer.phone,
          isBlacklisted: customer.isBlacklisted,
          blacklistDetails: customer.blacklistDetails,
        }
      });
      
    } catch (error) {
      console.error('Unblacklist API error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  }