// src/app/api/maintenance/[id]/route.js
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Maintenance from '@/models/Maintenance';
import Vehicle from '@/models/Vehicle';

// GET /api/maintenance/[id] - Get specific maintenance record
export async function GET(request, { params }) {
  try {
    await connectDB();
    
    const maintenanceRecord = await Maintenance.findById(params.id)
      .populate('vehicleId', 'vehicleNumber type brand model');
    
    if (!maintenanceRecord) {
      return NextResponse.json(
        { success: false, error: 'Maintenance record not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: maintenanceRecord
    });
    
  } catch (error) {
    console.error('Error fetching maintenance record:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch maintenance record' },
      { status: 500 }
    );
  }
}

// PUT /api/maintenance/[id] - Update maintenance record
export async function PUT(request, { params }) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { status, completedDate, cost, notes, parts } = body;
    
    const maintenanceRecord = await Maintenance.findById(params.id);
    if (!maintenanceRecord) {
      return NextResponse.json(
        { success: false, error: 'Maintenance record not found' },
        { status: 404 }
      );
    }
    
    // Update fields
    if (status) maintenanceRecord.status = status;
    if (completedDate) maintenanceRecord.completedDate = new Date(completedDate);
    if (cost !== undefined) maintenanceRecord.cost = cost;
    if (notes !== undefined) maintenanceRecord.notes = notes;
    if (parts) maintenanceRecord.parts = parts;
    
    await maintenanceRecord.save();
    
    // Update vehicle status based on maintenance completion
    if (status === 'completed') {
      const vehicle = await Vehicle.findById(maintenanceRecord.vehicleId);
      if (vehicle && vehicle.status === 'maintenance') {
        // Check if there are other pending maintenance for this vehicle
        const pendingMaintenance = await Maintenance.countDocuments({
          vehicleId: maintenanceRecord.vehicleId,
          status: { $in: ['scheduled', 'in-progress'] },
          _id: { $ne: params.id }
        });
        
        if (pendingMaintenance === 0) {
          await Vehicle.findByIdAndUpdate(maintenanceRecord.vehicleId, { 
            status: 'available' 
          });
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      data: maintenanceRecord,
      message: 'Maintenance record updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating maintenance record:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update maintenance record' },
      { status: 500 }
    );
  }
}

// DELETE /api/maintenance/[id] - Delete maintenance record
export async function DELETE(request, { params }) {
  try {
    await connectDB();
    
    const maintenanceRecord = await Maintenance.findByIdAndDelete(params.id);
    
    if (!maintenanceRecord) {
      return NextResponse.json(
        { success: false, error: 'Maintenance record not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Maintenance record deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting maintenance record:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete maintenance record' },
      { status: 500 }
    );
  }
}