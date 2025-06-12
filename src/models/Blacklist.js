// src/models/Blacklist.js - New model for blacklist management
import mongoose from 'mongoose';

const BlacklistSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },
  reason: {
    type: String,
    required: true,
    trim: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  notes: {
    type: String,
    default: ''
  },
  addedBy: {
    type: String,
    required: true,
    default: 'staff'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Create indexes
BlacklistSchema.index({ customerId: 1 });
BlacklistSchema.index({ severity: 1 });
BlacklistSchema.index({ isActive: 1 });

export default mongoose.models.Blacklist || mongoose.model('Blacklist', BlacklistSchema);