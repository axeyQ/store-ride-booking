import dns from 'dns';
import mongoose from 'mongoose';

// Some networks/routers fail SRV lookups required by mongodb+srv:// URIs
if (typeof dns.setServers === 'function') {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
}


const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

// Global mongoose connection cache
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null, resolvedUri: null };
}

async function lookupDnsRecords(name, type) {
  const url = `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${encodeURIComponent(type)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`DNS lookup failed for ${name} (${type}): ${response.status}`);
  }
  const data = await response.json();
  if (!data.Answer?.length) {
    throw new Error(`No ${type} records found for ${name}`);
  }
  return data.Answer;
}

// Convert mongodb+srv:// to mongodb:// using DNS-over-HTTPS.
// Windows and some ISPs return querySrv EBADRESP for Atlas SRV records.
async function toStandardMongoUri(uri) {
  if (!uri.startsWith('mongodb+srv://')) {
    return uri;
  }

  const parsed = new URL(uri);
  const hostname = parsed.hostname;
  const database = parsed.pathname.replace(/^\//, '') || 'test';

  const srvRecords = await lookupDnsRecords(`_mongodb._tcp.${hostname}`, 'SRV');
  const hosts = srvRecords.map((record) => {
    const parts = String(record.data).trim().split(/\s+/);
    const port = parts[2];
    const target = parts[3].replace(/\.$/, '');
    return `${target}:${port}`;
  });

  const params = new URLSearchParams(parsed.search);
  try {
    const txtRecords = await lookupDnsRecords(hostname, 'TXT');
    const txtData = String(txtRecords[0].data).replace(/^"|"$/g, '');
    new URLSearchParams(txtData).forEach((value, key) => {
      if (!params.has(key)) {
        params.set(key, value);
      }
    });
  } catch (error) {
    console.warn('MongoDB TXT lookup failed, using URI query only:', error.message);
  }

  if (!params.has('tls') && !params.has('ssl')) {
    params.set('tls', 'true');
  }
  if (!params.has('authSource')) {
    params.set('authSource', 'admin');
  }
  if (!params.has('retryWrites')) {
    params.set('retryWrites', 'true');
  }

  const auth = `${encodeURIComponent(decodeURIComponent(parsed.username))}:${encodeURIComponent(decodeURIComponent(parsed.password))}`;
  return `mongodb://${auth}@${hosts.join(',')}/${database}?${params.toString()}`;
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
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      family: 4, // Use IPv4, skip trying IPv6
      retryWrites: true,
      retryReads: true,
    };

    console.log('Creating new MongoDB connection...');
    cached.promise = Promise.resolve()
      .then(async () => {
        if (!cached.resolvedUri) {
          cached.resolvedUri = await toStandardMongoUri(MONGODB_URI);
        }
        return mongoose.connect(cached.resolvedUri, opts);
      })
      .then((mongooseInstance) => {
        console.log('✅ MongoDB connected successfully');
        return mongooseInstance;
      })
      .catch((error) => {
        console.error('❌ MongoDB connection error:', error);
        // Reset the promise so we can try again
        cached.promise = null;
        cached.resolvedUri = null;
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