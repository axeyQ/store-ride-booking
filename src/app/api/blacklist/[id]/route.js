// src/app/api/blacklist/[id]/route.js
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Blacklist from '@/models/Blacklist';

// PUT /api/blacklist/[id] - Update blacklist entry
export async function PUT(request, { params }) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { severity, reason, notes } = body;
    
    const blacklistEntry = await Blacklist.findByIdAndUpdate(
      params.id,
      { severity, reason, notes, updatedAt: new Date() },
      { new: true }
    ).populate('customerId', 'customerDetails');
    
    if (!blacklistEntry) {
      return NextResponse.json(
        { success: false, error: 'Blacklist entry not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: {
        ...blacklistEntry.toObject(),
        customerDetails: blacklistEntry.customerId?.customerDetails || null
      },
      message: 'Blacklist entry updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating blacklist entry:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update blacklist entry' },
      { status: 500 }
    );
  }
}

// DELETE /api/blacklist/[id] - Remove customer from blacklist
export async function DELETE(request, { params }) {
  try {
    await connectDB();
    
    const blacklistEntry = await Blacklist.findByIdAndDelete(params.id);
    
    if (!blacklistEntry) {
      return NextResponse.json(
        { success: false, error: 'Blacklist entry not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Customer removed from blacklist successfully'
    });
    
  } catch (error) {
    console.error('Error removing from blacklist:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove from blacklist' },
      { status: 500 }
    );
  }
}
