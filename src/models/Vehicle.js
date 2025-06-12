
// src/models/Vehicle.js
import mongoose from 'mongoose';

const VehicleSchema = new mongoose.Schema({
  vehicleNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  type: {
    type: String,
    required: true,
    enum: ['bike', 'scooty']
  },
  brand: {
    type: String,
    required: true,
    trim: true
  },
  model: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['available', 'rented', 'maintenance', 'damaged'],
    default: 'available'
  },
  currentBooking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    default: null
  },
  specifications: {
    fuelType: {
      type: String,
      enum: ['petrol', 'electric'],
      default: 'petrol'
    },
    engineCapacity: {
      type: String,
      default: ''
    },
    color: {
      type: String,
      default: ''
    }
  },
  maintenanceHistory: [{
    date: {
      type: Date,
      required: true
    },
    type: {
      type: String,
      enum: ['regular', 'repair', 'inspection'],
      required: true
    },
    description: {
      type: String,
      required: true
    },
    cost: {
      type: Number,
      default: 0
    },
    performedBy: {
      type: String,
      required: true
    }
  }],
  documents: {
    registrationNumber: {
      type: String,
      required: true
    },
    insuranceNumber: {
      type: String,
      required: true
    },
    insuranceExpiry: {
      type: Date,
      required: true
    },
    pucExpiry: {
      type: Date,
      required: true
    }
  }
}, {
  timestamps: true
});

// Create indexes
VehicleSchema.index({ type: 1, status: 1 });
VehicleSchema.index({ vehicleNumber: 1 });

// Static method to get available vehicles by type
VehicleSchema.statics.getAvailableByType = function(type) {
  return this.find({ 
    type: type, 
    status: 'available' 
  }).sort({ vehicleNumber: 1 });
};

// Instance method to update status
VehicleSchema.methods.updateStatus = function(newStatus, bookingId = null) {
  this.status = newStatus;
  this.currentBooking = bookingId;
  return this.save();
};

export default mongoose.models.Vehicle || mongoose.model('Vehicle', VehicleSchema);
