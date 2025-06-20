import mongoose from 'mongoose';

const blacklistHistorySchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
  },
  action: {
    type: String,
    enum: ['blacklisted', 'unblacklisted', 'updated'],
    required: true,
  },
  reason: {
    type: String,
    enum: [
      'vehicle_damage',
      'late_return',
      'non_payment', 
      'behavioral_issues',
      'violation_of_terms',
      'theft_attempt',
      'fake_documents',
      'reckless_driving',
      'other'
    ],
    required: function() {
      return this.action === 'blacklisted';
    },
  },
  severity: {
    type: String,
    enum: ['warning', 'temporary_ban', 'permanent_ban'],
    required: function() {
      return this.action === 'blacklisted';
    },
  },
  customReason: {
    type: String,
    default: '',
  },
  duration: {
    type: Number, // Days for temporary ban
    default: null,
  },
  performedBy: {
    type: String, // Staff member name/ID
    required: true,
  },
  internalNotes: {
    type: String,
    default: '',
  },
  evidencePhotos: [{
    url: String,
    description: String,
    uploadedAt: {
      type: Date,
      default: Date.now,
    }
  }],
  previousStatus: {
    isBlacklisted: Boolean,
    reason: String,
    severity: String,
  },
  newStatus: {
    isBlacklisted: Boolean,
    reason: String,
    severity: String,
  },
  unblacklistReason: {
    type: String,
    default: '',
  },
  effectiveUntil: {
    type: Date,
    default: null, // For temporary bans
  },
  relatedBookingId: {
    type: String, // If blacklist is related to a specific booking
    default: null,
  },
  notificationSent: {
    type: Boolean,
    default: false,
  },
  ipAddress: {
    type: String,
    default: null,
  }
}, {
  timestamps: true,
});

// Index for efficient queries
blacklistHistorySchema.index({ customerId: 1, createdAt: -1 });
blacklistHistorySchema.index({ action: 1, createdAt: -1 });
blacklistHistorySchema.index({ performedBy: 1, createdAt: -1 });

// Static method to log blacklist action
blacklistHistorySchema.statics.logAction = async function(actionData) {
  const historyEntry = new this(actionData);
  await historyEntry.save();
  return historyEntry;
};

// Static method to get customer blacklist history
blacklistHistorySchema.statics.getCustomerHistory = async function(customerId, limit = 10) {
  return await this.find({ customerId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('customerId', 'name phone driverLicense');
};

// Static method to get recent blacklist activities
blacklistHistorySchema.statics.getRecentActivity = async function(limit = 20) {
  return await this.find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('customerId', 'name phone driverLicense');
};

// Static method to get blacklist statistics
blacklistHistorySchema.statics.getStats = async function(days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const stats = await this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$action',
        count: { $sum: 1 },
        reasons: { $push: '$reason' }
      }
    }
  ]);
  
  // Get reason breakdown
  const reasonStats = await this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate },
        action: 'blacklisted'
      }
    },
    {
      $group: {
        _id: '$reason',
        count: { $sum: 1 }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
  
  return {
    actions: stats,
    reasons: reasonStats,
    period: `${days} days`
  };
};

export default mongoose.models.BlacklistHistory || mongoose.model('BlacklistHistory', blacklistHistorySchema);