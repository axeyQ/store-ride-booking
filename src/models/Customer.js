// src/models/Customer.js
import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  mobile: {
    type: String,
    required: true,
    match: [/^[6-9]\d{9}$/, 'Please enter a valid mobile number']
  },
  licenseNumber: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  totalBookings: {
    type: Number,
    default: 0
  },
  isBlacklisted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for faster searches
customerSchema.index({ mobile: 1 });
customerSchema.index({ licenseNumber: 1 });

export default mongoose.models.Customer || mongoose.model('Customer', customerSchema);