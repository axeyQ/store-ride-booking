// scripts/seedAdmin.js
const fs = require('fs');
const path = require('path');
const dns = require('dns');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

if (typeof dns.setServers === 'function') {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
}

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;

  const contents = fs.readFileSync(envPath, 'utf8');
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
    } else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

function validatePassword(password) {
  const errors = [];
  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  if (!/[A-Z]/.test(password || '')) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password || '')) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/\d/.test(password || '')) {
    errors.push('Password must contain at least one number');
  }
  if (!/[@$!%*?&]/.test(password || '')) {
    errors.push('Password must contain at least one special character (@$!%*?&)');
  }
  return { isValid: errors.length === 0, errors };
}

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 20,
    match: /^[a-zA-Z0-9_]+$/,
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
  },
  fullName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50,
  },
  email: {
    type: String,
    required: false,
    unique: true,
    sparse: true,
  },
  isActive: { type: Boolean, default: true },
  isFirstUser: { type: Boolean, default: false },
  loginAttempts: { type: Number, default: 0 },
  lockUntil: Date,
  lastLogin: Date,
  refreshTokens: [{
    token: String,
    createdAt: { type: Date, default: Date.now },
    userAgent: String,
    ipAddress: String,
  }],
}, { timestamps: true });

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

async function seedAdmin() {
  loadEnvLocal();

  const args = parseArgs(process.argv.slice(2));
  const mongodbUri = process.env.MONGODB_URI;
  const username = (args.username || process.env.ADMIN_USERNAME || 'admin').toLowerCase().trim();
  const password = args.password || process.env.ADMIN_PASSWORD || 'Admin@1234';
  const fullName = (args.name || process.env.ADMIN_FULL_NAME || 'System Administrator').trim();
  const email = args.email || process.env.ADMIN_EMAIL;

  if (!mongodbUri) {
    console.error('❌ MONGODB_URI is not set. Add it to .env.local');
    process.exit(1);
  }

  const passwordCheck = validatePassword(password);
  if (!passwordCheck.isValid) {
    console.error('❌ Password does not meet requirements:');
    passwordCheck.errors.forEach((error) => console.error(`   - ${error}`));
    process.exit(1);
  }

  try {
    await mongoose.connect(mongodbUri, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000,
      family: 4,
    });
    console.log('Connected to MongoDB');

    const existingUsers = await User.countDocuments();
    if (existingUsers > 0) {
      console.error('❌ Users already exist. This script only creates the first admin user.');
      await mongoose.connection.close();
      process.exit(1);
    }

    const firstUser = new User({
      username,
      password,
      fullName,
      email: email ? email.toLowerCase().trim() : undefined,
      isActive: true,
      isFirstUser: true,
    });

    await firstUser.save();

    console.log('\n✅ First admin user created successfully');
    console.log(`   Username: ${firstUser.username}`);
    console.log(`   Full name: ${firstUser.fullName}`);
    if (firstUser.email) {
      console.log(`   Email: ${firstUser.email}`);
    }
    console.log('   Role: first user (admin)');
    console.log('\nYou can now log in with this username and password.');

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    process.exit(1);
  }
}

seedAdmin();
