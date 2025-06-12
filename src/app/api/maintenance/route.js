// src/app/api/maintenance/route.js
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Maintenance from '@/models/Maintenance';
import Vehicle from '@/models/Vehicle';

// GET /api/maintenance - Get all maintenance records
export async function GET(request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const vehicleId = searchParams.get('vehicleId');
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit')) || 50;
    
    let query = {};
    if (status) query.status = status;
    if (vehicleId) query.vehicleId = vehicleId;
    if (type) query.type = type;
    
    const maintenanceRecords = await Maintenance.find(query)
      .populate('vehicleId', 'vehicleNumber type brand model')
      .sort({ scheduledDate: -1 })
      .limit(limit);
    
    return NextResponse.json({
      success: true,
      data: maintenanceRecords
    });
    
  } catch (error) {
    console.error('Error fetching maintenance records:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch maintenance records' },
      { status: 500 }
    );
  }
}

// POST /api/maintenance - Create new maintenance record
export async function POST(request) {
  try {
    await connectDB();
    
    const body = await request.json();
    const {
      vehicleId,
      type,
      description,
      cost,
      performedBy,
      scheduledDate,
      status,
      notes,
      nextServiceDate,
      priority,
      parts
    } = body;
    
    // Validate required fields
    if (!vehicleId || !type || !description || !performedBy || !scheduledDate) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Check if vehicle exists
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return NextResponse.json(
        { success: false, error: 'Vehicle not found' },
        { status: 404 }
      );
    }
    
    const maintenanceRecord = new Maintenance({
      vehicleId,
      type,
      description,
      cost: cost || 0,
      performedBy,
      scheduledDate: new Date(scheduledDate),
      status: status || 'scheduled',
      notes: notes || '',
      nextServiceDate: nextServiceDate ? new Date(nextServiceDate) : null,
      priority: priority || 'medium',
      parts: parts || [],
      createdBy: 'staff' // This would be dynamic based on logged-in user
    });
    
    await maintenanceRecord.save();
    
    // Update vehicle status if maintenance is for immediate repair
    if (type === 'repair' || type === 'emergency') {
      await Vehicle.findByIdAndUpdate(vehicleId, { status: 'maintenance' });
    }
    
    return NextResponse.json({
      success: true,
      data: maintenanceRecord,
      message: 'Maintenance record created successfully'
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error creating maintenance record:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create maintenance record' },
      { status: 500 }
    );
  }
}
