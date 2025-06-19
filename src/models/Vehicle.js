import mongoose from 'mongoose';

const vehicleSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['bike', 'scooter'],
  },
  model: {
    type: String,
    required: true,
  },
  plateNumber: {
    type: String,
    required: true,
    unique: true,
  },
  status: {
    type: String,
    required: true,
    enum: ['available', 'rented', 'maintenance'],
    default: 'available',
  },
  addedDate: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

export default mongoose.models.Vehicle || mongoose.model('Vehicle', vehicleSchema);