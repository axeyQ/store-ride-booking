import mongoose from 'mongoose';

const reservationSchema = new mongoose.Schema({
  reservationId: {
    type: String,
    unique: true,
    default: function () {
      const timestamp = Date.now().toString();
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      return `RS${timestamp.slice(-8)}${random}`;
    }
  },

  // Customer (existing or newly created)
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },

  // Denormalized for list view (avoid extra populate sometimes)
  customerName: {
    type: String,
    required: true,
    trim: true
  },
  customerPhone: {
    type: String,
    required: true,
    trim: true
  },

  // Preferred vehicle type (assigned only at pickup)
  preferredType: {
    type: String,
    enum: ['scooty', 'bike', 'any'],
    default: 'any'
  },

  // Pickup time — same day only
  pickupTime: {
    type: Date,
    required: true
  },

  // Advance = first hour payment
  advanceAmount: {
    type: Number,
    required: true,
    min: 0
  },
  advancePaymentMethod: {
    type: String,
    enum: ['cash', 'upi'],
    required: true
  },

  status: {
    type: String,
    enum: ['reserved', 'converted', 'cancelled', 'no_show'],
    default: 'reserved'
  },

  notes: {
    type: String,
    maxlength: 500,
    default: ''
  },

  // Set when converted to a real booking
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    default: null
  },

  // Staff actions
  cancelledAt: Date,
  cancelledBy: String,
  cancelReason: String,

  noShowAt: Date,
  noShowBy: String,
  noShowNotes: String,

  convertedAt: Date,

  createdBy: {
    type: String,
    default: 'staff'
  }
}, {
  timestamps: true
});

// Indexes
reservationSchema.index({ status: 1, pickupTime: 1 });
reservationSchema.index({ customerId: 1, status: 1 });
reservationSchema.index({ pickupTime: 1 });
reservationSchema.index({ customerPhone: 1 });

export default mongoose.models.Reservation || mongoose.model('Reservation', reservationSchema);