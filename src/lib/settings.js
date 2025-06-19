let cachedSettings = null;
let lastFetch = null;

// Default settings fallback
const defaultSettings = {
  businessName: 'MR Travels',
  businessAddress: 'Bhopal, Madhya Pradesh',
  businessPhone: '',
  businessEmail: '',
  gstNumber: '',
  hourlyRate: 80,
  minimumHours: 1,
  lateFeePerHour: 20,
  securityDeposit: 500,
  operatingHours: { start: '06:00', end: '22:00' },
  maxAdvanceBookingDays: 7,
  reminderTimeBeforeReturn: 30,
  smsNotifications: true,
  emailNotifications: false,
  whatsappNotifications: false,
  autoBackup: true,
  backupFrequency: 'daily',
  dataRetentionMonths: 12,
  requireAadharPhoto: true,
  requireSignature: true,
  requireLicenseVerification: true
};

// Fetch settings from API with caching
export async function getSettings() {
  const now = Date.now();
  
  // Cache for 5 minutes
  if (cachedSettings && lastFetch && (now - lastFetch < 5 * 60 * 1000)) {
    return cachedSettings;
  }
  
  try {
    const response = await fetch('/api/settings');
    const data = await response.json();
    
    if (data.success) {
      cachedSettings = { ...defaultSettings, ...data.settings };
      lastFetch = now;
      return cachedSettings;
    }
  } catch (error) {
    console.error('Error fetching settings:', error);
  }
  
  // Return cached settings or defaults if fetch fails
  return cachedSettings || defaultSettings;
}

// Get specific setting value
export async function getSetting(key, defaultValue = null) {
  const settings = await getSettings();
  return settings[key] ?? defaultValue;
}

// Get hourly rate specifically (most commonly used)
export async function getHourlyRate() {
  return await getSetting('hourlyRate', 80);
}

// Calculate booking amount using current settings
export async function calculateBookingAmount(hours) {
  const hourlyRate = await getHourlyRate();
  const minimumHours = await getSetting('minimumHours', 1);
  const billableHours = Math.max(hours, minimumHours);
  return Math.ceil(billableHours) * hourlyRate;
}

// Calculate late fee
export async function calculateLateFee(overHours) {
  const lateFeePerHour = await getSetting('lateFeePerHour', 20);
  return Math.ceil(overHours) * lateFeePerHour;
}

// Get business information
export async function getBusinessInfo() {
  const settings = await getSettings();
  return {
    name: settings.businessName,
    address: settings.businessAddress,
    phone: settings.businessPhone,
    email: settings.businessEmail,
    gstNumber: settings.gstNumber
  };
}

// Check operating hours
export async function isWithinOperatingHours(time = new Date()) {
  const settings = await getSettings();
  const { start, end } = settings.operatingHours;
  
  const currentTime = time.toTimeString().slice(0, 5); // HH:MM format
  return currentTime >= start && currentTime <= end;
}

// Clear cache (useful when settings are updated)
export function clearSettingsCache() {
  cachedSettings = null;
  lastFetch = null;
}

// Client-side only functions
export function useSettings() {
  if (typeof window === 'undefined') {
    return defaultSettings; // Server-side fallback
  }
  
  // This would typically use React state/context in a full implementation
  return cachedSettings || defaultSettings;
}

// Format currency using business locale
export function formatCurrency(amount) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

// Validate settings before saving
export function validateSettings(settings) {
  const errors = [];
  
  if (!settings.businessName?.trim()) {
    errors.push('Business name is required');
  }
  
  if (!settings.hourlyRate || settings.hourlyRate <= 0) {
    errors.push('Hourly rate must be greater than 0');
  }
  
  if (!settings.minimumHours || settings.minimumHours <= 0) {
    errors.push('Minimum hours must be greater than 0');
  }
  
  if (settings.lateFeePerHour < 0) {
    errors.push('Late fee cannot be negative');
  }
  
  if (settings.securityDeposit < 0) {
    errors.push('Security deposit cannot be negative');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}