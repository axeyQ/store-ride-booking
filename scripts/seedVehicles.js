// scripts/seedVehicles.js
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bike-booking';

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

const Vehicle = mongoose.models.Vehicle || mongoose.model('Vehicle', vehicleSchema);

const sampleVehicles = [
  // Bikes
  { type: 'bike', model: 'Hero Splendor Plus', plateNumber: 'MP09AB1234', status: 'available' },
  { type: 'bike', model: 'Bajaj Platina', plateNumber: 'MP09CD5678', status: 'available' },
  { type: 'bike', model: 'TVS Sport', plateNumber: 'MP09EF9012', status: 'available' },
  { type: 'bike', model: 'Hero HF Deluxe', plateNumber: 'MP09GH3456', status: 'maintenance' },
  { type: 'bike', model: 'Bajaj CT 100', plateNumber: 'MP09IJ7890', status: 'available' },
  { type: 'bike', model: 'TVS Radeon', plateNumber: 'MP09KL2345', status: 'available' },
  
  // Scooters
  { type: 'scooter', model: 'Honda Activa 6G', plateNumber: 'MP09MN6789', status: 'available' },
  { type: 'scooter', model: 'TVS Jupiter', plateNumber: 'MP09OP0123', status: 'available' },
  { type: 'scooter', model: 'Suzuki Access 125', plateNumber: 'MP09QR4567', status: 'rented' },
  { type: 'scooter', model: 'Hero Maestro Edge', plateNumber: 'MP09ST8901', status: 'available' },
  { type: 'scooter', model: 'Yamaha Fascino', plateNumber: 'MP09UV2345', status: 'available' },
  { type: 'scooter', model: 'Honda Dio', plateNumber: 'MP09WX6789', status: 'maintenance' },
  { type: 'scooter', model: 'TVS Ntorq 125', plateNumber: 'MP09YZ0123', status: 'available' },
  { type: 'scooter', model: 'Bajaj Chetak', plateNumber: 'MP09AA4567', status: 'available' },
];

async function seedVehicles() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing vehicles
    await Vehicle.deleteMany({});
    console.log('Cleared existing vehicles');

    // Insert sample vehicles
    const insertedVehicles = await Vehicle.insertMany(sampleVehicles);
    console.log(`✅ Successfully seeded ${insertedVehicles.length} vehicles:`);
    
    insertedVehicles.forEach(vehicle => {
      console.log(`   ${vehicle.type.toUpperCase()}: ${vehicle.model} (${vehicle.plateNumber}) - ${vehicle.status}`);
    });

    await mongoose.connection.close();
    console.log('\n🎉 Vehicle seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding vehicles:', error);
    process.exit(1);
  }
}

seedVehicles();