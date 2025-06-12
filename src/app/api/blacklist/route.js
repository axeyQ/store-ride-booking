// src/app/api/blacklist/route.js
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Blacklist from '@/models/Blacklist';

// GET /api/blacklist - Get all blacklisted customers
export async function GET(request) {
  try {
    await connectDB();
    
    const blacklist = await Blacklist.find()
      .populate('customerId', 'customerDetails')
      .sort({ createdAt: -1 });
    
    // Transform data to include customer details
    const transformedBlacklist = blacklist.map(entry => ({
      ...entry.toObject(),
      customerDetails: entry.customerId?.customerDetails || null
    }));
    
    return NextResponse.json({
      success: true,
      data: transformedBlacklist
    });
    
  } catch (error) {
    console.error('Error fetching blacklist:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch blacklist' },
      { status: 500 }
    );
  }
}

// POST /api/blacklist - Add customer to blacklist
export async function POST(request) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { customerId, reason, severity, notes, addedBy } = body;
    
    if (!customerId || !reason) {
      return NextResponse.json(
        { success: false, error: 'Customer ID and reason are required' },
        { status: 400 }
      );
    }
    
    // Check if customer is already blacklisted
    const existingEntry = await Blacklist.findOne({ customerId });
    if (existingEntry) {
      return NextResponse.json(
        { success: false, error: 'Customer is already blacklisted' },
        { status: 409 }
      );
    }
    
    const blacklistEntry = new Blacklist({
      customerId,
      reason,
      severity: severity || 'medium',
      notes,
      addedBy: addedBy || 'staff'
    });
    
    await blacklistEntry.save();
    
    // Populate customer details for response
    await blacklistEntry.populate('customerId', 'customerDetails');
    
    return NextResponse.json({
      success: true,
      data: {
        ...blacklistEntry.toObject(),
        customerDetails: blacklistEntry.customerId?.customerDetails || null
      },
      message: 'Customer added to blacklist successfully'
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error adding to blacklist:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add to blacklist' },
      { status: 500 }
    );
  }
}
