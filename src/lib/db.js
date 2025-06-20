import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

// Global mongoose connection cache
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  // Return existing connection if available
  if (cached.conn) {
    console.log('Using existing MongoDB connection');
    return cached.conn;
  }

  // Return existing promise if connection is in progress
  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4, // Use IPv4, skip trying IPv6
      retryWrites: true,
      retryReads: true,
    };

    console.log('Creating new MongoDB connection...');
    cached.promise = mongoose.connect(MONGODB_URI, opts)
      .then((mongoose) => {
        console.log('✅ MongoDB connected successfully');
        return mongoose;
      })
      .catch((error) => {
        console.error('❌ MongoDB connection error:', error);
        // Reset the promise so we can try again
        cached.promise = null;
        throw error;
      });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    cached.promise = null;
    cached.conn = null;
    console.error('Failed to establish MongoDB connection:', error);
    throw new Error(`Database connection failed: ${error.message}`);
  }
}

// Connection event handlers
mongoose.connection.on('connected', () => {
  console.log('📡 Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('📡 Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('📡 Mongoose disconnected from MongoDB');
  cached.conn = null;
  cached.promise = null;
});

// Graceful shutdown
process.on('SIGINT', async () => {
  if (cached.conn) {
    await mongoose.connection.close();
    console.log('📡 MongoDB connection closed through app termination');
  }
  process.exit(0);
});

export default connectDB;