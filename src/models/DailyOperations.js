import mongoose from 'mongoose';

const dailyOperationsSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    unique: true, // One record per day
    index: true
  },
  
  // Day start details
  dayStarted: {
    type: Boolean,
    default: false
  },
  startTime: {
    type: Date,
    default: null
  },
  startedBy: {
    type: String, // Staff member name/ID
    default: null
  },
  startNotes: {
    type: String,
    default: ''
  },
  
  // Day end details
  dayEnded: {
    type: Boolean,
    default: false
  },
  endTime: {
    type: Date,
    default: null
  },
  endedBy: {
    type: String, // Staff member name/ID
    default: null
  },
  endNotes: {
    type: String,
    default: ''
  },
  autoEnded: {
    type: Boolean,
    default: false // True if ended automatically at midnight
  },
  
  // Daily summary (calculated when day ends)
  dailySummary: {
    totalRevenue: {
      type: Number,
      default: 0
    },
    totalBookings: {
      type: Number,
      default: 0
    },
    activeBookings: {
      type: Number,
      default: 0
    },
    completedBookings: {
      type: Number,
      default: 0
    },
    cancelledBookings: {
      type: Number,
      default: 0
    },
    newCustomers: {
      type: Number,
      default: 0
    },
    vehiclesRented: {
      type: Number,
      default: 0
    },
    averageBookingValue: {
      type: Number,
      default: 0
    },
    operatingHours: {
      type: Number, // Hours between start and end
      default: 0
    },
    revenuePerHour: {
      type: Number,
      default: 0
    }
  },
  
  // Status tracking
  status: {
    type: String,
    enum: ['not_started', 'in_progress', 'ended'],
    default: 'not_started'
  },
  
  // Restart tracking
  restartCount: {
    type: Number,
    default: 0
  },
  restartHistory: [{
    restartedAt: Date,
    restartedBy: String,
    reason: String
  }]
}, {
  timestamps: true
});

// Static methods
dailyOperationsSchema.statics.getTodaysOperation = async function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let operation = await this.findOne({ date: today });
  
  if (!operation) {
    operation = new this({ date: today });
    await operation.save();
  }
  
  return operation;
};

dailyOperationsSchema.statics.getOperationsInRange = async function(startDate, endDate) {
  return await this.find({
    date: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ date: -1 });
};

// Instance methods
dailyOperationsSchema.methods.startDay = function(staffName, notes = '') {
  this.dayStarted = true;
  this.startTime = new Date();
  this.startedBy = staffName;
  this.startNotes = notes;
  this.status = 'in_progress';
  return this.save();
};

dailyOperationsSchema.methods.endDay = async function(staffName, notes = '', isAuto = false) {
  // Calculate daily summary before ending
  await this.calculateDailySummary();
  
  this.dayEnded = true;
  this.endTime = new Date();
  this.endedBy = staffName;
  this.endNotes = notes;
  this.autoEnded = isAuto;
  this.status = 'ended';
  
  // Calculate operating hours
  if (this.startTime && this.endTime) {
    const diffMs = this.endTime - this.startTime;
    this.dailySummary.operatingHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
    
    if (this.dailySummary.operatingHours > 0) {
      this.dailySummary.revenuePerHour = Math.round((this.dailySummary.totalRevenue / this.dailySummary.operatingHours) * 100) / 100;
    }
  }
  
  return this.save();
};

dailyOperationsSchema.methods.restartDay = function(staffName, reason = '') {
  this.restartCount += 1;
  this.restartHistory.push({
    restartedAt: new Date(),
    restartedBy: staffName,
    reason: reason
  });
  
  this.dayEnded = false;
  this.endTime = null;
  this.endedBy = null;
  this.endNotes = '';
  this.autoEnded = false;
  this.status = 'in_progress';
  
  return this.save();
};

dailyOperationsSchema.methods.calculateDailySummary = async function() {
  const Booking = mongoose.models.Booking;
  const Customer = mongoose.models.Customer;
  
  if (!Booking || !Customer) return;
  
  const dayStart = new Date(this.date);
  const dayEnd = new Date(this.date);
  dayEnd.setDate(dayEnd.getDate() + 1);
  
  // Only count bookings within business hours if day was started
  let bookingQuery = {
    createdAt: { $gte: dayStart, $lt: dayEnd }
  };
  
  if (this.dayStarted && this.startTime) {
    const businessStart = this.startTime;
    const businessEnd = this.endTime || new Date();
    bookingQuery.createdAt = { $gte: businessStart, $lt: businessEnd };
  }
  
  // Get all bookings for the day
  const bookings = await Booking.find(bookingQuery);
  
  // Calculate metrics
  this.dailySummary.totalBookings = bookings.length;
  this.dailySummary.totalRevenue = bookings.reduce((sum, booking) => 
    sum + (booking.finalAmount || booking.baseAmount || 0), 0);
  this.dailySummary.completedBookings = bookings.filter(b => b.status === 'completed').length;
  this.dailySummary.activeBookings = bookings.filter(b => b.status === 'active').length;
  this.dailySummary.cancelledBookings = bookings.filter(b => b.status === 'cancelled').length;
  
  if (this.dailySummary.totalBookings > 0) {
    this.dailySummary.averageBookingValue = Math.round((this.dailySummary.totalRevenue / this.dailySummary.totalBookings) * 100) / 100;
  }
  
  // Get unique vehicles rented
  const vehicleIds = [...new Set(bookings.map(b => b.vehicleId?.toString()).filter(Boolean))];
  this.dailySummary.vehiclesRented = vehicleIds.length;
  
  // Count new customers registered today
  const newCustomers = await Customer.countDocuments({
    createdAt: { $gte: dayStart, $lt: dayEnd }
  });
  this.dailySummary.newCustomers = newCustomers;
};

// Indexes for performance
dailyOperationsSchema.index({ date: 1 });
dailyOperationsSchema.index({ status: 1 });
dailyOperationsSchema.index({ 'dailySummary.totalRevenue': -1 });

export default mongoose.models.DailyOperations || mongoose.model('DailyOperations', dailyOperationsSchema);