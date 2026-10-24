import mongoose from 'mongoose';

const reservationSchema = new mongoose.Schema({
  reservationId: {
    type: String,
    unique: true,
    default: function () {
      const timestamp = Date.now().toString();
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      return `EQ${timestamp.slice(-8)}${random}`; // Enquiry prefix
    }
  },

  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },

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

  preferredType: {
    type: String,
    enum: ['scooty', 'bike', 'any'],
    default: 'any'
  },

  // When they want a vehicle (still used for "later" / sorting)
  pickupTime: {
    type: Date,
    required: true
  },

  // Need now vs can wait / later
  urgency: {
    type: String,
    enum: ['now', 'later'],
    default: 'now'
  },

  // Optional preferred time when urgency === 'later'
  preferredTime: {
    type: Date,
    default: null
  },

  // Frequent customer — show first in queue
  isPriority: {
    type: Boolean,
    default: false
  },

advanceAmount: {
    type: Number,
    min: 0,
    default: 0
  },
  advancePaymentMethod: {
    type: String,
    enum: ['cash', 'upi'],
    required: false,   // was required — this causes the error
  },

  status: {
    type: String,
    enum: ['reserved', 'converted', 'cancelled', 'no_show'],
    default: 'reserved' // UI will show as "Waiting"
  },

  notes: {
    type: String,
    maxlength: 500,
    default: ''
  },

  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    default: null
  },

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

reservationSchema.index({ status: 1, createdAt: 1 });
reservationSchema.index({ status: 1, isPriority: -1, createdAt: 1 });
reservationSchema.index({ customerId: 1, status: 1 });
reservationSchema.index({ pickupTime: 1 });
reservationSchema.index({ customerPhone: 1 });

export default mongoose.models.Reservation || mongoose.model('Reservation', reservationSchema);