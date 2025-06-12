import mongoose from 'mongoose';

const BookingSchema = new mongoose.Schema({
  customerDetails: {
    name: {
      type: String,
      required: true,
      trim: true
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
    dlNumber: {
      type: String,
      required: true,
      trim: true
    },
    // REMOVED: aadhaarNumber - will be added later via documents
  },
  
  vehicleDetails: {
    type: {
      type: String,
      required: true,
      enum: ['bike', 'scooty']
    },
    vehicleNumber: {
      type: String,
      required: true
    },
    pickupDate: {
      type: Date,
      required: true
    },
    pickupTime: {
      type: String,
      required: true
    },
    returnDate: {
      type: Date,
      default: null
    },
    returnTime: {
      type: String,
      default: null
    }
  },
  
  digitalSignature: {
    signatureImage: {
      type: String,
      required: true // base64 encoded signature
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    ipAddress: {
      type: String,
      default: 'store-terminal'
    }
  },
  
  verification: {
    otpGenerated: {
      type: String,
      required: true
    },
    otpVerified: {
      type: Boolean,
      default: false
    },
    verificationTime: {
      type: Date,
      default: Date.now
    }
  },
  
  documents: {
    aadhaarNumber: {
      type: String,
      default: null // Will be added later
    },
    aadhaarPhoto: {
      type: String,
      default: null // File path or base64
    },
    uploadedBy: {
      type: String,
      default: null // Staff member name
    },
    uploadedAt: {
      type: Date,
      default: null
    }
  },
  
  booking: {
    status: {
      type: String,
      enum: ['active', 'completed', 'cancelled'],
      default: 'active'
    },
    createdBy: {
      type: String,
      required: true,
      default: 'staff'
    },
    totalAmount: {
      type: Number,
      default: 0
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid'],
      default: 'pending'
    },
    ratePerHour: {
      type: Number,
      default: 80
    }
  },

  // Enhanced return data (from Phase 2)
  enhancedReturn: {
    customerPhoto: {
      type: String,
      default: null
    },
    vehiclePhotos: {
      front: { type: String, default: null },
      back: { type: String, default: null },
      left: { type: String, default: null },
      right: { type: String, default: null }
    },
    damagePhotos: [{
      type: String
    }],
    vehicleCondition: {
      bodyCondition: {
        type: String,
        enum: ['excellent', 'good', 'fair', 'poor'],
        default: 'good'
      },
      tyreCondition: {
        type: String,
        enum: ['excellent', 'good', 'fair', 'poor'],
        default: 'good'
      },
      lightsWorking: {
        type: Boolean,
        default: true
      },
      hornWorking: {
        type: Boolean,
        default: true
      },
      brakesWorking: {
        type: Boolean,
        default: true
      },
      fuelLevel: {
        type: String,
        enum: ['full', 'three-quarter', 'half', 'quarter', 'empty'],
        default: 'full'
      }
    },
    damageAssessment: {
      hasDamage: {
        type: Boolean,
        default: false
      },
      damageDescription: {
        type: String,
        default: ''
      },
      estimatedCost: {
        type: Number,
        default: 0
      }
    },
    customerFeedback: {
      rating: {
        type: Number,
        min: 1,
        max: 5,
        default: 5
      },
      comments: {
        type: String,
        default: ''
      }
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'upi', 'card'],
      default: 'cash'
    },
    staffNotes: {
      type: String,
      default: ''
    },
    amountBreakdown: {
      baseAmount: { type: Number, default: 0 },
      latePenalty: { type: Number, default: 0 },
      damageCharges: { type: Number, default: 0 },
      totalAmount: { type: Number, default: 0 }
    },
    totalHours: {
      type: Number,
      default: 0
    },
    processedBy: {
      type: String,
      default: 'staff'
    },
    processedAt: {
      type: Date,
      default: null
    }
  }
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

// Create indexes for better query performance
BookingSchema.index({ 'customerDetails.mobile': 1 });
BookingSchema.index({ 'vehicleDetails.vehicleNumber': 1 });
BookingSchema.index({ 'booking.status': 1 });
BookingSchema.index({ createdAt: -1 });

// Instance method to calculate total rental amount
BookingSchema.methods.calculateAmount = function() {
  if (this.vehicleDetails.returnDate) {
    const pickupDateTime = new Date(`${this.vehicleDetails.pickupDate}T${this.vehicleDetails.pickupTime}`);
    const returnDateTime = new Date(`${this.vehicleDetails.returnDate}T${this.vehicleDetails.returnTime}`);
    const durationHours = Math.ceil((returnDateTime - pickupDateTime) / (1000 * 60 * 60));
    return durationHours * this.booking.ratePerHour;
  }
  return 0;
};

// Static method to get active bookings
BookingSchema.statics.getActiveBookings = function() {
  return this.find({ 'booking.status': 'active' })
    .sort({ createdAt: -1 });
};

// Static method to check vehicle availability
BookingSchema.statics.isVehicleAvailable = function(vehicleNumber, date) {
  return this.findOne({
    'vehicleDetails.vehicleNumber': vehicleNumber,
    'vehicleDetails.pickupDate': {
      $gte: new Date(date),
      $lt: new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000)
    },
    'booking.status': 'active'
  });
};

export default mongoose.models.Booking || mongoose.model('Booking', BookingSchema);