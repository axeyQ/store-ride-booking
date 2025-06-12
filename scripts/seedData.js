// scripts/seedData.js (Fixed CommonJS version)
const mongoose = require('mongoose');

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://mrtravels1817:XkEcgIoL32s0tHXy@mrt.6xpir01.mongodb.net/UserData?retryWrites=true&w=majority&appName=MRT';

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

// Vehicle Schema
const VehicleSchema = new mongoose.Schema({
  vehicleNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  type: {
    type: String,
    required: true,
    enum: ['bike', 'scooty']
  },
  brand: {
    type: String,
    required: true,
    trim: true
  },
  model: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['available', 'rented', 'maintenance', 'damaged'],
    default: 'available'
  },
  currentBooking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    default: null
  },
  specifications: {
    fuelType: {
      type: String,
      enum: ['petrol', 'electric'],
      default: 'petrol'
    },
    engineCapacity: {
      type: String,
      default: ''
    },
    color: {
      type: String,
      default: ''
    }
  },
  documents: {
    registrationNumber: {
      type: String,
      required: true
    },
    insuranceNumber: {
      type: String,
      required: true
    },
    insuranceExpiry: {
      type: Date,
      required: true
    },
    pucExpiry: {
      type: Date,
      required: true
    }
  }
}, {
  timestamps: true
});

// Create indexes
VehicleSchema.index({ type: 1, status: 1 });
VehicleSchema.index({ vehicleNumber: 1 });

const Vehicle = mongoose.models.Vehicle || mongoose.model('Vehicle', VehicleSchema);

// Sample vehicle data
const vehicles = [
  // Bikes
  {
    vehicleNumber: 'BK001',
    type: 'bike',
    brand: 'Honda',
    model: 'Shine',
    specifications: {
      fuelType: 'petrol',
      engineCapacity: '125cc',
      color: 'Black'
    },
    documents: {
      registrationNumber: 'MP04AB1234',
      insuranceNumber: 'INS001',
      insuranceExpiry: new Date('2025-12-31'),
      pucExpiry: new Date('2025-06-30')
    }
  },
  {
    vehicleNumber: 'BK002',
    type: 'bike',
    brand: 'Hero',
    model: 'Splendor Plus',
    specifications: {
      fuelType: 'petrol',
      engineCapacity: '97cc',
      color: 'Red'
    },
    documents: {
      registrationNumber: 'MP04AB1235',
      insuranceNumber: 'INS002',
      insuranceExpiry: new Date('2025-11-30'),
      pucExpiry: new Date('2025-05-31')
    }
  },
  {
    vehicleNumber: 'BK003',
    type: 'bike',
    brand: 'Bajaj',
    model: 'Platina',
    specifications: {
      fuelType: 'petrol',
      engineCapacity: '100cc',
      color: 'Blue'
    },
    documents: {
      registrationNumber: 'MP04AB1236',
      insuranceNumber: 'INS003',
      insuranceExpiry: new Date('2026-01-31'),
      pucExpiry: new Date('2025-07-31')
    }
  },
  {
    vehicleNumber: 'BK004',
    type: 'bike',
    brand: 'TVS',
    model: 'Star City',
    specifications: {
      fuelType: 'petrol',
      engineCapacity: '110cc',
      color: 'White'
    },
    documents: {
      registrationNumber: 'MP04AB1237',
      insuranceNumber: 'INS004',
      insuranceExpiry: new Date('2025-10-31'),
      pucExpiry: new Date('2025-04-30')
    }
  },
  {
    vehicleNumber: 'BK005',
    type: 'bike',
    brand: 'Royal Enfield',
    model: 'Classic 350',
    specifications: {
      fuelType: 'petrol',
      engineCapacity: '350cc',
      color: 'Black'
    },
    documents: {
      registrationNumber: 'MP04AB1238',
      insuranceNumber: 'INS005',
      insuranceExpiry: new Date('2026-02-28'),
      pucExpiry: new Date('2025-08-31')
    }
  },

  // Scooties
  {
    vehicleNumber: 'SC001',
    type: 'scooty',
    brand: 'Honda',
    model: 'Activa 6G',
    specifications: {
      fuelType: 'petrol',
      engineCapacity: '110cc',
      color: 'Pearl White'
    },
    documents: {
      registrationNumber: 'MP04SC1234',
      insuranceNumber: 'INS006',
      insuranceExpiry: new Date('2025-12-31'),
      pucExpiry: new Date('2025-06-30')
    }
  },
  {
    vehicleNumber: 'SC002',
    type: 'scooty',
    brand: 'TVS',
    model: 'Jupiter',
    specifications: {
      fuelType: 'petrol',
      engineCapacity: '110cc',
      color: 'Mystic Gold'
    },
    documents: {
      registrationNumber: 'MP04SC1235',
      insuranceNumber: 'INS007',
      insuranceExpiry: new Date('2025-11-30'),
      pucExpiry: new Date('2025-05-31')
    }
  },
  {
    vehicleNumber: 'SC003',
    type: 'scooty',
    brand: 'Suzuki',
    model: 'Access 125',
    specifications: {
      fuelType: 'petrol',
      engineCapacity: '125cc',
      color: 'Metallic Silver'
    },
    documents: {
      registrationNumber: 'MP04SC1236',
      insuranceNumber: 'INS008',
      insuranceExpiry: new Date('2026-01-31'),
      pucExpiry: new Date('2025-07-31')
    }
  },
  {
    vehicleNumber: 'SC004',
    type: 'scooty',
    brand: 'Yamaha',
    model: 'Fascino 125',
    specifications: {
      fuelType: 'petrol',
      engineCapacity: '125cc',
      color: 'Cyan Blue'
    },
    documents: {
      registrationNumber: 'MP04SC1237',
      insuranceNumber: 'INS009',
      insuranceExpiry: new Date('2025-10-31'),
      pucExpiry: new Date('2025-04-30')
    }
  }
];

async function seedVehicles() {
  try {
    console.log('🔄 Connecting to database...');
    await connectDB();

    console.log('🗑️ Clearing existing vehicles...');
    await Vehicle.deleteMany({});

    console.log('🚲 Adding vehicles...');
    const createdVehicles = await Vehicle.insertMany(vehicles);

    console.log(`✅ Successfully added ${createdVehicles.length} vehicles to the database!`);
    
    // Display created vehicles
    console.log('\n📋 Created Vehicles:');
    createdVehicles.forEach(vehicle => {
      console.log(`   ${vehicle.vehicleNumber} - ${vehicle.brand} ${vehicle.model} (${vehicle.type})`);
    });

    console.log('\n🎉 Database seeding completed successfully!');
    
    // Close connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed.');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run the seeding function
seedVehicles();

// Alternative simple seeding script (scripts/simpleSeed.js)
// If the above still has issues, use this simpler version:

/*
const mongoose = require('mongoose');

async function seed() {
  try {
    await mongoose.connect('mongodb+srv://mrtravels1817:XkEcgIoL32s0tHXy@mrt.6xpir01.mongodb.net/UserData?retryWrites=true&w=majority&appName=MRT');
    
    const Vehicle = mongoose.model('Vehicle', {
      vehicleNumber: String,
      type: String,
      brand: String,
      model: String,
      status: { type: String, default: 'available' }
    });

    await Vehicle.deleteMany({});
    
    await Vehicle.create([
      { vehicleNumber: 'BK001', type: 'bike', brand: 'Honda', model: 'Shine' },
      { vehicleNumber: 'BK002', type: 'bike', brand: 'Hero', model: 'Splendor' },
      { vehicleNumber: 'BK003', type: 'bike', brand: 'Bajaj', model: 'Platina' },
      { vehicleNumber: 'SC001', type: 'scooty', brand: 'Honda', model: 'Activa' },
      { vehicleNumber: 'SC002', type: 'scooty', brand: 'TVS', model: 'Jupiter' },
      { vehicleNumber: 'SC003', type: 'scooty', brand: 'Suzuki', model: 'Access' }
    ]);

    console.log('✅ Vehicles seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

seed();
*/