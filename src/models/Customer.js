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
}, {
  timestamps: true,
});

export default mongoose.models.Customer || mongoose.model('Customer', customerSchema);