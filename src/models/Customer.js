import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },
  driverLicense: {
    type: String,
    required: true,
  },
  aadharCardPhoto: {
    type: String, // URL or file path to uploaded Aadhar card image
    default: '',
  },
  totalBookings: {
    type: Number,
    default: 0,
  },
  lastVisit: {
    type: Date,
    default: Date.now,
  },
  // Blacklist functionality
  isBlacklisted: {
    type: Boolean,
    default: false,
  },
  blacklistDetails: {
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
      default: null,
    },
    severity: {
      type: String,
      enum: ['warning', 'temporary_ban', 'permanent_ban'],
      default: null,
    },
    customReason: {
      type: String,
      default: '',
    },
    blacklistedBy: {
      type: String, // Staff member name/ID
      default: null,
    },
    blacklistedAt: {
      type: Date,
      default: null,
    },
    unblacklistAt: {
      type: Date, // For temporary bans
      default: null,
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
    isActive: {
      type: Boolean,
      default: true, // False when manually unblacklisted
    }
  }
}, {
  timestamps: true,
});

// Virtual to check if blacklist is currently active
customerSchema.virtual('isCurrentlyBlacklisted').get(function() {
  if (!this.isBlacklisted || !this.blacklistDetails.isActive) {
    return false;
  }
  
  // Check if temporary ban has expired
  if (this.blacklistDetails.severity === 'temporary_ban' && 
      this.blacklistDetails.unblacklistAt && 
      new Date() > this.blacklistDetails.unblacklistAt) {
    return false;
  }
  
  return true;
});

// Method to blacklist customer
customerSchema.methods.blacklist = function(blacklistData) {
  this.isBlacklisted = true;
  this.blacklistDetails = {
    ...blacklistData,
    blacklistedAt: new Date(),
    isActive: true,
  };
  
  // Set unblacklist date for temporary bans
  if (blacklistData.severity === 'temporary_ban' && blacklistData.duration) {
    const unblacklistDate = new Date();
    unblacklistDate.setDate(unblacklistDate.getDate() + blacklistData.duration);
    this.blacklistDetails.unblacklistAt = unblacklistDate;
  }
};

// Method to unblacklist customer
customerSchema.methods.unblacklist = function(unblacklistedBy, reason = '') {
  this.blacklistDetails.isActive = false;
  this.blacklistDetails.unblacklistedBy = unblacklistedBy;
  this.blacklistDetails.unblacklistedAt = new Date();
  this.blacklistDetails.unblacklistReason = reason;
};

// Static method to auto-unblacklist expired temporary bans
customerSchema.statics.autoUnblacklistExpired = async function() {
  const now = new Date();
  const result = await this.updateMany(
    {
      isBlacklisted: true,
      'blacklistDetails.severity': 'temporary_ban',
      'blacklistDetails.unblacklistAt': { $lt: now },
      'blacklistDetails.isActive': true
    },
    {
      $set: {
        'blacklistDetails.isActive': false,
        'blacklistDetails.unblacklistedAt': now,
        'blacklistDetails.unblacklistedBy': 'system',
        'blacklistDetails.unblacklistReason': 'Temporary ban expired automatically'
      }
    }
  );
  
  return result;
};

export default mongoose.models.Customer || mongoose.model('Customer', customerSchema);