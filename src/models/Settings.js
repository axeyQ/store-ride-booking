import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    default: 'app',
  },
  businessName: { type: String, default: 'MR Travels' },
  businessAddress: { type: String, default: 'Bhopal, Madhya Pradesh' },
  businessPhone: { type: String, default: '' },
  businessEmail: { type: String, default: '' },
  gstNumber: { type: String, default: '' },
  branchName: {
      type: String,
      default: 'MR Travels',
    },
  otherBranchName: {
      type: String,
      default: '',
    },
  otherBranchUrl: {
      type: String,
      default: '',
    },
  hourlyRate: { type: Number, default: 80 },
  minimumHours: { type: Number, default: 1 },
  lateFeePerHour: { type: Number, default: 20 },
  securityDeposit: { type: Number, default: 500 },
  graceMinutes: { type: Number, default: 15 },
  blockMinutes: { type: Number, default: 30 },
  nightChargeTime: { type: String, default: '22:30' },
  nightMultiplier: { type: Number, default: 2 },
  startDelayMinutes: { type: Number, default: 5 },
  roundToNearestMinutes: { type: Number, default: 5 },
  operatingHours: {
    start: { type: String, default: '06:00' },
    end: { type: String, default: '22:00' },
  },
  maxAdvanceBookingDays: { type: Number, default: 7 },
  reminderTimeBeforeReturn: { type: Number, default: 30 },
  smsNotifications: { type: Boolean, default: true },
  emailNotifications: { type: Boolean, default: false },
  whatsappNotifications: { type: Boolean, default: false },
  autoBackup: { type: Boolean, default: true },
  backupFrequency: { type: String, default: 'daily' },
  dataRetentionMonths: { type: Number, default: 12 },
  requireAadharPhoto: { type: Boolean, default: true },
  requireSignature: { type: Boolean, default: true },
  requireLicenseVerification: { type: Boolean, default: true },
  version: { type: String, default: '1.0.0' },
  lastUpdated: { type: Date, default: Date.now },
}, {
  timestamps: true,
});

export default mongoose.models.Settings || mongoose.model('Settings', settingsSchema);
