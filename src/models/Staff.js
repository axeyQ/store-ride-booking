
// src/models/Staff.js (Optional for future user management)
import mongoose from 'mongoose';

const StaffSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  mobile: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^[6-9]\d{9}$/.test(v);
      },
      message: 'Invalid mobile number format'
    }
  },
  role: {
    type: String,
    enum: ['admin', 'staff'],
    default: 'staff'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  permissions: {
    canCreateBooking: {
      type: Boolean,
      default: true
    },
    canEditBooking: {
      type: Boolean,
      default: true
    },
    canViewReports: {
      type: Boolean,
      default: false
    },
    canManageVehicles: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true
});

export default mongoose.models.Staff || mongoose.model('Staff', StaffSchema);