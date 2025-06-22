import mongoose from 'mongoose';

// Vehicle Change History Schema
const vehicleChangeHistorySchema = new mongoose.Schema({
  changedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  previousVehicleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: true
  },
  previousVehicleDetails: {
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
  },
  newVehicleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: true
  },
  newVehicleDetails: {
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
  },
  minutesSinceStart: {
    type: Number,
    required: true
  },
  reason: {
    type: String,
    default: 'Customer request'
  }
});

// Main Booking Schema
const bookingSchema = new mongoose.Schema({
  bookingId: {
    type: String,
    unique: true
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
  signature: {
    type: String,
    required: true
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date
  },
  actualDuration: {
    type: Number // in hours
  },
  finalAmount: {
    type: Number
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'upi'],
    default: 'cash'
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled'],
    default: 'active'
  },
  
  // Safety checklist
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
  
  // Return details
  vehicleCondition: {
    type: String,
    enum: ['good', 'minor_issues', 'damage'],
    default: 'good'
  },
  returnNotes: {
    type: String
  },
  damageNotes: {
    type: String
  },
  discountAmount: {
    type: Number,
    default: 0
  },
  additionalCharges: {
    type: Number,
    default: 0
  },
  
  // Advanced pricing
  pricingBreakdown: [{
    period: String,
    startTime: String,
    endTime: String,
    minutes: Number,
    rate: Number,
    isNightCharge: Boolean,
    description: String
  }],
  
  // ✅ NEW: Vehicle Change History
  vehicleChangeHistory: [vehicleChangeHistorySchema],
  
  additionalNotes: {
    type: String
  },
  securityDepositCollected: {
  type: Boolean,
  default: false
},
  securityDepositAmount: {
  type: Number,
  default: 0
},
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
      'duplicate_booking',
      'other'
    ]
  },
  customReason: {
    type: String
  },
  staffNotes: {
    type: String
  },
  withinWindow: {
    type: Boolean,
    default: false
  },
  manualOverride: {
    type: Boolean,
    default: false
  }
}

}, {
  timestamps: true
});

// Generate booking ID before saving
bookingSchema.pre('save', async function(next) {
  if (!this.bookingId) {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    
    // Find the highest booking number for today
    const lastBooking = await this.constructor
      .findOne({ bookingId: new RegExp(`^MRT-${dateStr}-`) })
      .sort({ bookingId: -1 });
    
    let nextNumber = 1;
    if (lastBooking) {
      const lastNumber = parseInt(lastBooking.bookingId.split('-').pop());
      nextNumber = lastNumber + 1;
    }
    
    this.bookingId = `MRT-${dateStr}-${nextNumber.toString().padStart(3, '0')}`;
  }
  next();
});

// Instance methods for vehicle change functionality
bookingSchema.methods.canChangeVehicle = function() {
  if (this.status !== 'active') {
    return { allowed: false, reason: 'Booking is not active' };
  }
  
  const now = new Date();
  const startTime = new Date(this.startTime);
  const minutesSinceStart = Math.floor((now - startTime) / (1000 * 60));
  
  if (minutesSinceStart > 15) {
    return { 
      allowed: false, 
      reason: 'Vehicle changes only allowed within 15 minutes of start',
      minutesSinceStart 
    };
  }
  
  return { 
    allowed: true, 
    minutesSinceStart,
    timeRemaining: 15 - minutesSinceStart
  };
};

bookingSchema.methods.addVehicleChange = function(changeData) {
  if (!this.vehicleChangeHistory) {
    this.vehicleChangeHistory = [];
  }
  
  this.vehicleChangeHistory.push({
    changedAt: new Date(),
    ...changeData
  });
  
  return this.vehicleChangeHistory.length;
};

// Static methods for analytics
bookingSchema.statics.getVehicleChangeStats = async function(dateRange = {}) {
  const pipeline = [
    {
      $match: {
        vehicleChangeHistory: { $exists: true, $ne: [] },
        ...dateRange
      }
    },
    {
      $project: {
        bookingId: 1,
        customerId: 1,
        changeCount: { $size: '$vehicleChangeHistory' },
        vehicleChangeHistory: 1
      }
    },
    {
      $group: {
        _id: null,
        totalBookingsWithChanges: { $sum: 1 },
        totalChanges: { $sum: '$changeCount' },
        averageChangesPerBooking: { $avg: '$changeCount' },
        maxChangesInSingleBooking: { $max: '$changeCount' }
      }
    }
  ];
  
  const result = await this.aggregate(pipeline);
  return result[0] || {
    totalBookingsWithChanges: 0,
    totalChanges: 0,
    averageChangesPerBooking: 0,
    maxChangesInSingleBooking: 0
  };
};

// Indexes for better performance
bookingSchema.index({ bookingId: 1 });
bookingSchema.index({ vehicleId: 1 });
bookingSchema.index({ customerId: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ startTime: 1 });
bookingSchema.index({ 'vehicleChangeHistory.changedAt': 1 });

const Booking = mongoose.models.Booking || mongoose.model('Booking', bookingSchema);

export default Booking;