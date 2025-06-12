// src/models/Maintenance.js - New Maintenance Model
import mongoose from 'mongoose';

const MaintenanceSchema = new mongoose.Schema({
  vehicleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: true
  },
  type: {
    type: String,
    enum: ['regular', 'repair', 'inspection', 'emergency'],
    required: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  cost: {
    type: Number,
    default: 0,
    min: 0
  },
  performedBy: {
    type: String,
    required: true,
    trim: true
  },
  scheduledDate: {
    type: Date,
    required: true
  },
  completedDate: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['scheduled', 'in-progress', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  notes: {
    type: String,
    default: '',
    trim: true
  },
  nextServiceDate: {
    type: Date,
    default: null
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  parts: [{
    name: String,
    cost: Number,
    quantity: Number
  }],
  photos: [{
    type: String // Base64 or file paths
  }],
  createdBy: {
    type: String,
    default: 'staff'
  }
}, {
  timestamps: true
});

// Indexes for better performance
MaintenanceSchema.index({ vehicleId: 1, status: 1 });
MaintenanceSchema.index({ scheduledDate: 1 });
MaintenanceSchema.index({ status: 1 });
MaintenanceSchema.index({ type: 1 });

export default mongoose.models.Maintenance || mongoose.model('Maintenance', MaintenanceSchema);