import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key-change-this-in-production';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '1h';
const JWT_REFRESH_EXPIRE = process.env.JWT_REFRESH_EXPIRE || '30d';

// Generate Access Token
export const generateAccessToken = (userId) => {
  return jwt.sign(
    { 
      userId,
      type: 'access',
      iat: Math.floor(Date.now() / 1000)
    },
    JWT_SECRET,
    { 
      expiresIn: JWT_EXPIRE,
      issuer: 'mr-travels',
      audience: 'mr-travels-app'
    }
  );
};

// Generate Refresh Token
export const generateRefreshToken = (userId) => {
  return jwt.sign(
    { 
      userId,
      type: 'refresh',
      jti: crypto.randomUUID(), // Unique token ID
      iat: Math.floor(Date.now() / 1000)
    },
    JWT_REFRESH_SECRET,
    { 
      expiresIn: JWT_REFRESH_EXPIRE,
      issuer: 'mr-travels',
      audience: 'mr-travels-app'
    }
  );
};

// Verify Access Token
export const verifyAccessToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'mr-travels',
      audience: 'mr-travels-app'
    });
    
    if (decoded.type !== 'access') {
      throw new Error('Invalid token type');
    }
    
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

// Verify Refresh Token
export const verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET, {
      issuer: 'mr-travels',
      audience: 'mr-travels-app'
    });
    
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }
    
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
};

// Extract token from Authorization header
export const extractTokenFromHeader = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
};

// Get client IP address
export const getClientIP = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.connection?.remoteAddress || 
         req.socket?.remoteAddress || 
         req.connection?.socket?.remoteAddress || 
         'unknown';
};

// Get user agent
export const getUserAgent = (req) => {
  return req.headers['user-agent'] || 'Unknown';
};

// Password validation utility
export const validatePassword = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[@$!%*?&]/.test(password);
  
  const errors = [];
  
  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long`);
  }
  
  if (!hasUpperCase) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!hasLowerCase) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!hasNumbers) {
    errors.push('Password must contain at least one number');
  }
  
  if (!hasSpecialChar) {
    errors.push('Password must contain at least one special character (@$!%*?&)');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Generate secure random string
export const generateSecureRandom = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

// Hash sensitive data
export const hashData = (data) => {
  return crypto.createHash('sha256').update(data).digest('hex');
};

// Cookie configuration
export const getCookieOptions = (rememberMe = false) => {
  const baseOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/'
  };
  
  if (rememberMe) {
    baseOptions.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
  } else {
    baseOptions.maxAge = 24 * 60 * 60 * 1000; // 1 day
  }
  
  return baseOptions;
};

// Rate limiting helper
export const isRateLimited = (attempts, timeWindow = 15 * 60 * 1000) => {
  // Simple rate limiting: max 10 attempts per 15 minutes
  const maxAttempts = 10;
  const now = Date.now();
  
  // Filter attempts within time window
  const recentAttempts = attempts.filter(attempt => 
    now - attempt.timestamp < timeWindow
  );
  
  return recentAttempts.length >= maxAttempts;
};

// Security headers
export const getSecurityHeaders = () => {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
  };
};