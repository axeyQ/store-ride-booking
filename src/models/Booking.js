import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  bookingId: {
    type: String,
    unique: true,
  },
  vehicleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: true,
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
  },
  startTime: {
    type: Date,
    required: true,
    default: Date.now,
  },
  endTime: {
    type: Date,
    default: null,
  },
  actualDuration: {
    type: Number, // in hours
    default: null,
  },
  finalAmount: {
    type: Number,
    default: null,
  },
  paymentMethod: {
    type: String,
    enum: ['upi', 'cash'],
    default: null, // Set when customer returns
  },
  signature: {
    type: String, // base64 image data
    required: true,
  },
  // Checklist items
  helmetProvided: {
    type: Boolean,
    default: false,
  },
  aadharCardCollected: {
    type: Boolean,
    default: false,
  },
  vehicleInspected: {
    type: Boolean,
    default: false,
  },
  additionalNotes: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    required: true,
    enum: ['active', 'completed', 'cancelled'],
    default: 'active',
  },
}, {
  timestamps: true,
});

// Generate booking ID before saving
bookingSchema.pre('save', async function(next) {
  if (!this.bookingId) {
    // Generate format: MRT-YYYYMMDD-XXX
    const today = new Date();
    const dateStr = today.getFullYear().toString() + 
                   (today.getMonth() + 1).toString().padStart(2, '0') + 
                   today.getDate().toString().padStart(2, '0');
    
    // Find a unique booking ID
    let attempts = 0;
    let isUnique = false;
    let bookingId;
    
    while (!isUnique && attempts < 100) {
      const randomNum = Math.floor(Math.random() * 999).toString().padStart(3, '0');
      bookingId = `MRT-${dateStr}-${randomNum}`;
      
      // Check if this ID already exists
      const existingBooking = await mongoose.models.Booking.findOne({ bookingId });
      if (!existingBooking) {
        isUnique = true;
      }
      attempts++;
    }
    
    if (!isUnique) {
      throw new Error('Unable to generate unique booking ID');
    }
    
    this.bookingId = bookingId;
  }
  next();
});

export default mongoose.models.Booking || mongoose.model('Booking', bookingSchema);