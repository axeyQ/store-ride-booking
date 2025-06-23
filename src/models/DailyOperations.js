import mongoose from 'mongoose';

const dailyOperationsSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    unique: true, // ✅ CRITICAL: One record per day
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
    type: String,
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
    type: String,
    default: null
  },
  endNotes: {
    type: String,
    default: ''
  },
  autoEnded: {
    type: Boolean,
    default: false
  },
  // Daily summary
  dailySummary: {
    totalRevenue: { type: Number, default: 0 },
    totalBookings: { type: Number, default: 0 },
    activeBookings: { type: Number, default: 0 },
    completedBookings: { type: Number, default: 0 },
    cancelledBookings: { type: Number, default: 0 },
    newCustomers: { type: Number, default: 0 },
    vehiclesRented: { type: Number, default: 0 },
    averageBookingValue: { type: Number, default: 0 },
    operatingHours: { type: Number, default: 0 },
    revenuePerHour: { type: Number, default: 0 }
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

// ✅ FIXED: Race-condition safe method using upsert
dailyOperationsSchema.statics.getTodaysOperation = async function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  try {
    // Use findOneAndUpdate with upsert to prevent race conditions
    const operation = await this.findOneAndUpdate(
      { date: today },
      { 
        $setOnInsert: { 
          date: today,
          dayStarted: false,
          status: 'not_started',
          dailySummary: {
            totalRevenue: 0,
            totalBookings: 0,
            activeBookings: 0,
            completedBookings: 0,
            cancelledBookings: 0,
            newCustomers: 0,
            vehiclesRented: 0,
            averageBookingValue: 0,
            operatingHours: 0,
            revenuePerHour: 0
          },
          restartCount: 0,
          restartHistory: []
        }
      },
      { 
        upsert: true, 
        new: true,
        setDefaultsOnInsert: true
      }
    );
    
    return operation;
  } catch (error) {
    // Handle duplicate key error (race condition)
    if (error.code === 11000) {
      // If duplicate, just find and return the existing record
      return await this.findOne({ date: today });
    }
    throw error;
  }
};

// ✅ NEW: Method to clean up duplicate records
dailyOperationsSchema.statics.cleanupDuplicates = async function() {
  console.log('🧹 Cleaning up duplicate daily operations...');
  
  const pipeline = [
    {
      $group: {
        _id: {
          year: { $year: '$date' },
          month: { $month: '$date' },
          day: { $dayOfMonth: '$date' }
        },
        docs: { $push: '$$ROOT' },
        count: { $sum: 1 }
      }
    },
    {
      $match: { count: { $gt: 1 } }
    }
  ];
  
  const duplicateGroups = await this.aggregate(pipeline);
  let cleanedCount = 0;
  
  for (const group of duplicateGroups) {
    const docs = group.docs;
    
    // Keep the record with the most complete data (ended > in_progress > not_started)
    const priority = { 'ended': 3, 'in_progress': 2, 'not_started': 1 };
    docs.sort((a, b) => {
      const aPriority = priority[a.status] || 0;
      const bPriority = priority[b.status] || 0;
      if (aPriority !== bPriority) return bPriority - aPriority;
      
      // If same status, keep the one with more data
      const aScore = (a.dayStarted ? 1 : 0) + (a.dayEnded ? 1 : 0) + (a.dailySummary?.totalRevenue || 0);
      const bScore = (b.dayStarted ? 1 : 0) + (b.dayEnded ? 1 : 0) + (b.dailySummary?.totalRevenue || 0);
      return bScore - aScore;
    });
    
    const keepDoc = docs[0];
    const removeIds = docs.slice(1).map(doc => doc._id);
    
    console.log(`📅 ${new Date(keepDoc.date).toDateString()}: Keeping ${keepDoc.status}, removing ${removeIds.length} duplicates`);
    
    // Remove duplicates
    await this.deleteMany({ _id: { $in: removeIds } });
    cleanedCount += removeIds.length;
  }
  
  console.log(`✅ Cleanup complete: Removed ${cleanedCount} duplicate records`);
  return cleanedCount;
};

// ✅ NEW: Ensure database indexes exist
dailyOperationsSchema.statics.ensureIndexes = async function() {
  try {
    // Ensure unique index on date field
    await this.collection.createIndex({ date: 1 }, { unique: true });
    console.log('✅ Daily operations indexes verified');
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
  }
};

// Other existing methods...
dailyOperationsSchema.statics.getOperationsInRange = async function(startDate, endDate) {
  return await this.find({
    date: { $gte: startDate, $lte: endDate }
  }).sort({ date: -1 });
};

dailyOperationsSchema.methods.startDay = function(staffName, notes = '') {
  this.dayStarted = true;
  this.startTime = new Date();
  this.startedBy = staffName;
  this.startNotes = notes;
  this.status = 'in_progress';
  return this.save();
};

dailyOperationsSchema.methods.endDay = async function(staffName, notes = '', isAuto = false) {
  await this.calculateDailySummary();
  this.dayEnded = true;
  this.endTime = new Date();
  this.endedBy = staffName;
  this.endNotes = notes;
  this.autoEnded = isAuto;
  this.status = 'ended';
  
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
  const allBookings = await Booking.find(bookingQuery);
  
  // ✅ FIXED: Separate bookings by status for accurate calculations
  const completedBookings = allBookings.filter(b => b.status === 'completed');
  const activeBookings = allBookings.filter(b => b.status === 'active');
  const cancelledBookings = allBookings.filter(b => b.status === 'cancelled');
  
  // ✅ FIXED: Revenue only from COMPLETED bookings (payment collected)
  this.dailySummary.totalRevenue = completedBookings.reduce((sum, booking) => 
    sum + (booking.finalAmount || booking.baseAmount || 0), 0);
  
  // Booking counts
  this.dailySummary.totalBookings = allBookings.length;
  this.dailySummary.completedBookings = completedBookings.length;
  this.dailySummary.activeBookings = activeBookings.length;
  this.dailySummary.cancelledBookings = cancelledBookings.length;
  
  // ✅ FIXED: Average booking value based on completed bookings only
  if (completedBookings.length > 0) {
    this.dailySummary.averageBookingValue = 
      Math.round((this.dailySummary.totalRevenue / completedBookings.length) * 100) / 100;
  } else {
    this.dailySummary.averageBookingValue = 0;
  }
  
  // ✅ FIXED: Vehicle count based on ALL bookings (including active and completed)
  // but excluding cancelled ones since they never actually used vehicles
  const actualRentalBookings = allBookings.filter(b => b.status !== 'cancelled');
  const vehicleIds = [...new Set(actualRentalBookings.map(b => 
    b.vehicleId?.toString()).filter(Boolean))];
  this.dailySummary.vehiclesRented = vehicleIds.length;
  
  // Count new customers registered today
  const newCustomers = await Customer.countDocuments({
    createdAt: { $gte: dayStart, $lt: dayEnd }
  });
  this.dailySummary.newCustomers = newCustomers;
  
  console.log(`📊 Daily Summary Calculated:
    📋 Total Bookings: ${this.dailySummary.totalBookings}
    ✅ Completed: ${this.dailySummary.completedBookings}
    🔄 Active: ${this.dailySummary.activeBookings}
    ❌ Cancelled: ${this.dailySummary.cancelledBookings}
    💰 Revenue (Completed Only): ₹${this.dailySummary.totalRevenue}
    📊 Avg Value: ₹${this.dailySummary.averageBookingValue}
    🚗 Vehicles Used: ${this.dailySummary.vehiclesRented}`);
};

// Indexes for performance
dailyOperationsSchema.index({ date: 1 });
dailyOperationsSchema.index({ status: 1 });
dailyOperationsSchema.index({ 'dailySummary.totalRevenue': -1 });

export default mongoose.models.DailyOperations || mongoose.model('DailyOperations', dailyOperationsSchema);