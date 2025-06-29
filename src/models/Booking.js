import mongoose from 'mongoose';

// Vehicle change history schema (existing)
const vehicleInfoSchema = new mongoose.Schema({
  vehicleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: true
  },
  type: {
    type: String,
    required: true
  },
  model: {
    type: String,
    required: true
  },
  plateNumber: {
    type: String,
    required: true
  }
}, { _id: false }); // Important: disable _id for subdocuments

// ✅ FIXED: Vehicle Change History Schema with proper nesting
const vehicleChangeHistorySchema = new mongoose.Schema({
  changedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  changedBy: {
    type: String,
    required: true,
    default: 'System'
  },
  fromVehicle: {
    type: vehicleInfoSchema,  // Use the defined schema
    required: true
  },
  toVehicle: {
    type: vehicleInfoSchema,  // Use the defined schema
    required: true
  },
  minutesSinceStart: {
    type: Number,
    required: true
  },
  minutesSinceCreation: {
    type: Number,
    required: true,
    default: 0
  },
  reason: {
    type: String,
    default: 'Customer request'
  },
  eligibilityReason: {
    type: String,
    required: true
  },
  timeframe: {
    type: String,
    enum: ['pre-start', 'early-rental', 'recent-booking', 'first-hour'],
    required: true
  }
}, { _id: false });

// NEW: Enhanced security schema for multiple drivers and special cases
const enhancedSecuritySchema = new mongoose.Schema({
  isRequired: {
    type: Boolean,
    default: false
  },
  reason: {
    type: String,
    enum: ['multiple_driver', 'high_risk_customer', 'management_decision', 'previous_incident'],
    required: function() { return this.isRequired; }
  },
  additionalDepositAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  requiredAt: {
    type: Date,
    required: function() { return this.isRequired; }
  },
  notes: {
    type: String,
    maxlength: 500
  },
  approvedBy: {
    type: String // Staff member who approved the enhanced security
  }
}, { _id: false });

// NEW: Actual driver schema for multiple driver bookings
const actualDriverSchema = new mongoose.Schema({
  isSameAsLicenseHolder: {
    type: Boolean,
    default: true
  },
  name: {
    type: String,
    required: function() { return !this.isSameAsLicenseHolder; },
    trim: true,
    maxlength: 100
  },
  phone: {
    type: String,
    required: function() { return !this.isSameAsLicenseHolder; },
    validate: {
      validator: function(v) {
        if (this.isSameAsLicenseHolder) return true;
        return /^[6-9]\d{9}$/.test(v);
      },
      message: 'Please provide a valid 10-digit phone number starting with 6-9'
    }
  },
  relationToLicenseHolder: {
    type: String,
    enum: ['brother', 'sister', 'friend', 'spouse', 'father', 'mother', 'cousin', 'colleague', 'other'],
    required: function() { return !this.isSameAsLicenseHolder; }
  },
  alternateId: {
    type: String,
    required: function() { return !this.isSameAsLicenseHolder; },
    trim: true,
    uppercase: true,
    validate: {
      validator: function(v) {
        if (this.isSameAsLicenseHolder) return true;
        // Validate Aadhar (1234 5678 9012 or 123456789012) or PAN (ABCDE1234F)
        const aadharPattern = /^\d{4}\s?\d{4}\s?\d{4}$/;
        const panPattern = /^[A-Z]{5}\d{4}[A-Z]$/;
        return aadharPattern.test(v) || panPattern.test(v);
      },
      message: 'Please provide a valid Aadhar number (1234 5678 9012) or PAN (ABCDE1234F)'
    }
  },
  // Track if actual driver has signed (for compliance)
  hasSigned: {
    type: Boolean,
    default: false
  },
  signedAt: {
    type: Date
  }
}, { _id: false });

const bookingSchema = new mongoose.Schema({
  bookingId: {
    type: String,
    unique: true,
    default: function() {
      const timestamp = Date.now().toString();
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      return `BK${timestamp.slice(-8)}${random}`;
    }
  },
  vehicleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  startTime: {
    type: Date,
    required: true,
    default: Date.now
  },
  estimatedReturnTime: {
  type: Date,
  required: true,
  default: function() {
    // Default to 2 hours from start time for new bookings
    return new Date(this.startTime.getTime() + (2 * 60 * 60 * 1000));
  }
},
  endTime: {
    type: Date
  },
  actualDuration: {
    type: Number // in hours
  },
  finalAmount: {
    type: Number,
    min: 0
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled'],
    default: 'active'
  },

  // Custom booking fields (existing)
  isCustomBooking: {
    type: Boolean,
    default: false
  },
  customBookingType: {
    type: String,
    enum: ['half_day', 'full_day', 'night'],
    default: null
  },
  customBookingLabel: {
    type: String,
    default: null
  },
  
  // Safety checklist (existing)
  helmetProvided: {
    type: Boolean,
    default: false
  },
  aadharCardCollected: {
    type: Boolean,
    default: false
  },
  vehicleInspected: {
    type: Boolean,
    default: false
  },
  
  // Security deposit (existing)
  securityDepositCollected: {
    type: Boolean,
    default: false
  },
  securityDepositAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Return details (existing)
  vehicleCondition: {
    type: String,
    enum: ['good', 'minor_issues', 'damage'],
    default: 'good'
  },
  returnNotes: {
    type: String,
    maxlength: 1000
  },
  damageNotes: {
    type: String,
    maxlength: 1000
  },
  discountAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  additionalCharges: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Advanced pricing (existing)
  pricingBreakdown: [{
    period: String,
    startTime: String,
    endTime: String,
    minutes: Number,
    rate: Number,
    isNightCharge: Boolean,
    description: String
  }],
  
  // Vehicle change history (existing)
  vehicleChangeHistory: [vehicleChangeHistorySchema],
  
  // Digital signature (existing)
  signature: {
    type: String,
    required: true
  },
  
  // Additional notes (existing)
  additionalNotes: {
    type: String,
    maxlength: 1000
  },
  
  // Cancellation details (existing)
  cancellationDetails: {
    cancelledAt: {
      type: Date
    },
    cancelledBy: {
      type: String
    },
    reason: {
      type: String,
      enum: [
        'customer_changed_mind',
        'emergency', 
        'vehicle_issue',
        'weather_conditions',
        'customer_no_show',
        'staff_error',
        'payment_issue',
        'other'
      ]
    },
    refundAmount: {
      type: Number,
      min: 0
    },
    notes: {
      type: String,
      maxlength: 500
    }
  },

  // NEW: Multiple driver support
  actualDriver: actualDriverSchema,
  
  // NEW: Enhanced security for special cases
  enhancedSecurity: enhancedSecuritySchema,
  
  // NEW: Staff notes for multiple driver bookings
  staffNotes: {
    multipleDriverVerified: {
      type: Boolean,
      default: false
    },
    bothPartiesPresent: {
      type: Boolean,
      default: false
    },
    verifiedBy: {
      type: String // Staff member who verified
    },
    verifiedAt: {
      type: Date
    },
    additionalNotes: {
      type: String,
      maxlength: 500
    }
  },
  
  // NEW: Risk assessment for analytics
  riskAssessment: {
    level: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'low'
    },
    factors: [{
      factor: {
        type: String,
        enum: ['multiple_driver', 'new_customer', 'previous_incident', 'high_value_vehicle', 'long_duration']
      },
      weight: {
        type: Number,
        min: 1,
        max: 5
      }
    }],
    calculatedAt: {
      type: Date,
      default: Date.now
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for checking if booking has multiple drivers
bookingSchema.virtual('hasMultipleDrivers').get(function() {
  return this.actualDriver && !this.actualDriver.isSameAsLicenseHolder;
});

// Virtual for total security amount
bookingSchema.virtual('totalSecurityAmount').get(function() {
  const baseAmount = this.securityDepositAmount || 0;
  const enhancedAmount = this.enhancedSecurity?.additionalDepositAmount || 0;
  return baseAmount + enhancedAmount;
});

// Virtual for driver display name
bookingSchema.virtual('driverDisplayName').get(function() {
  if (this.actualDriver && !this.actualDriver.isSameAsLicenseHolder) {
    return this.actualDriver.name;
  }
  // If customer is populated
  if (this.customerId && typeof this.customerId === 'object') {
    return this.customerId.name;
  }
  return 'License Holder';
});

// Index for efficient queries
bookingSchema.index({ customerId: 1, createdAt: -1 });
bookingSchema.index({ vehicleId: 1, status: 1 });
bookingSchema.index({ status: 1, startTime: 1 });
// bookingSchema.index({ bookingId: 1 });
bookingSchema.index({ 'actualDriver.isSameAsLicenseHolder': 1 }); // For multiple driver analytics
bookingSchema.index({ 'enhancedSecurity.isRequired': 1 }); // For enhanced security tracking

// Pre-save middleware to calculate risk assessment
bookingSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('actualDriver') || this.isModified('enhancedSecurity')) {
    const riskFactors = [];
    let totalRisk = 0;

    // Multiple driver risk
    if (this.actualDriver && !this.actualDriver.isSameAsLicenseHolder) {
      riskFactors.push({ factor: 'multiple_driver', weight: 3 });
      totalRisk += 3;
    }

    // Enhanced security requirement risk
    if (this.enhancedSecurity && this.enhancedSecurity.isRequired) {
      riskFactors.push({ factor: 'previous_incident', weight: 4 });
      totalRisk += 4;
    }

    // Determine risk level
    let riskLevel = 'low';
    if (totalRisk >= 7) {
      riskLevel = 'high';
    } else if (totalRisk >= 4) {
      riskLevel = 'medium';
    }

    this.riskAssessment = {
      level: riskLevel,
      factors: riskFactors,
      calculatedAt: new Date()
    };
  }
  next();
});

// Static method to find multiple driver bookings
bookingSchema.statics.findMultipleDriverBookings = function(options = {}) {
  const query = { 'actualDriver.isSameAsLicenseHolder': false };
  
  if (options.status) {
    query.status = options.status;
  }
  
  if (options.dateFrom) {
    query.createdAt = { $gte: new Date(options.dateFrom) };
  }
  
  if (options.dateTo) {
    query.createdAt = { ...query.createdAt, $lte: new Date(options.dateTo) };
  }
  
  return this.find(query)
    .populate('vehicleId', 'type model plateNumber')
    .populate('customerId', 'name phone driverLicense')
    .sort({ createdAt: -1 });
};

// Static method to get multiple driver analytics
bookingSchema.statics.getMultipleDriverAnalytics = function() {
  return this.aggregate([
    {
      $match: { 'actualDriver.isSameAsLicenseHolder': false }
    },
    {
      $group: {
        _id: '$actualDriver.relationToLicenseHolder',
        count: { $sum: 1 },
        averageDeposit: { $avg: '$securityDepositAmount' },
        totalRevenue: { $sum: '$finalAmount' }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
};

// Method to add staff verification for multiple driver bookings
bookingSchema.methods.addStaffVerification = function(staffMember, bothPresent = true, notes = '') {
  this.staffNotes = {
    multipleDriverVerified: true,
    bothPartiesPresent: bothPresent,
    verifiedBy: staffMember,
    verifiedAt: new Date(),
    additionalNotes: notes
  };
  return this.save();
};

const Booking = mongoose.models.Booking || mongoose.model('Booking', bookingSchema);

export default Booking;