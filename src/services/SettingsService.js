// src/services/SettingsService.js

/**
 * Centralized Settings Service with Caching
 * Replaces direct API calls and provides efficient settings access
 */
export class SettingsService {
    static cache = null;
    static lastFetch = null;
    static CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  
    static DEFAULT_SETTINGS = {
      // Business settings
      businessName: 'MR Travels',
      businessAddress: 'Bhopal, Madhya Pradesh',
      businessPhone: '',
      businessEmail: '',
      gstNumber: '',
      
      // Pricing settings
      hourlyRate: 80,
      minimumHours: 1,
      lateFeePerHour: 20,
      securityDeposit: 500,
      graceMinutes: 15,
      blockMinutes: 30,
      nightChargeTime: '22:30',
      nightMultiplier: 2,
      
      // Start delay settings
      startDelayMinutes: 5,
      roundToNearestMinutes: 5,
      
      // Operating settings
      operatingHours: { start: '06:00', end: '22:00' },
      maxAdvanceBookingDays: 7,
      reminderTimeBeforeReturn: 30,
      
      // Notification settings
      smsNotifications: true,
      emailNotifications: false,
      whatsappNotifications: false,
      
      // System settings
      autoBackup: true,
      backupFrequency: 'daily',
      dataRetentionMonths: 12,
      requireAadharPhoto: true,
      requireSignature: true,
      requireLicenseVerification: true
    };
  
    /**
     * Get settings with intelligent caching
     * Automatically falls back to defaults if API fails
     */
    static async getSettings(useCache = true) {
      const now = Date.now();
      
      // Return cached settings if still valid
      if (useCache && this.cache && this.lastFetch && (now - this.lastFetch < this.CACHE_DURATION)) {
        return this.cache;
      }
      
      try {
        // Try to fetch from API (for server-side calls, this will be fast)
        const settings = await this.fetchFromAPI();
        
        // Update cache
        this.cache = { ...this.DEFAULT_SETTINGS, ...settings };
        this.lastFetch = now;
        
        return this.cache;
      } catch (error) {
        console.error('Error fetching settings, using cache/defaults:', error);
        
        // Return cached settings if available, otherwise defaults
        return this.cache || this.DEFAULT_SETTINGS;
      }
    }
  
    /**
     * Get specific setting value with fallback
     */
    static async getSetting(key, defaultValue = null) {
      try {
        const settings = await this.getSettings();
        return settings[key] ?? defaultValue;
      } catch (error) {
        console.error(`Error getting setting ${key}:`, error);
        return this.DEFAULT_SETTINGS[key] ?? defaultValue;
      }
    }
  
    /**
     * Update settings and clear cache
     */
    static async updateSettings(newSettings) {
      try {
        const response = await fetch('/api/settings', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newSettings),
        });
  
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
  
        const data = await response.json();
        
        if (data.success) {
          // Update cache immediately
          this.cache = { ...this.DEFAULT_SETTINGS, ...data.settings };
          this.lastFetch = Date.now();
          
          return { success: true, settings: this.cache };
        } else {
          throw new Error(data.error || 'Failed to update settings');
        }
      } catch (error) {
        console.error('Error updating settings:', error);
        return { success: false, error: error.message };
      }
    }
  
    /**
     * Fetch settings from API
     * Works both client-side and server-side
     */
    static async fetchFromAPI() {
      try {
        // Determine the correct base URL
        const baseUrl = this.getBaseUrl();
        const response = await fetch(`${baseUrl}/api/settings`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
          return data.settings;
        } else {
          throw new Error(data.error || 'Failed to fetch settings');
        }
      } catch (error) {
        // Don't log as error since this is expected fallback behavior
        console.warn('API fetch failed, will use defaults:', error.message);
        throw error;
      }
    }
  
    /**
     * Get appropriate base URL for API calls
     */
    static getBaseUrl() {
      // Server-side
      if (typeof window === 'undefined') {
        return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      }
      // Client-side
      return '';
    }
  
    /**
     * Clear cache (useful when settings are updated externally)
     */
    static clearCache() {
      this.cache = null;
      this.lastFetch = null;
    }
  
    /**
     * Force refresh settings (bypass cache)
     */
    static async refreshSettings() {
      return this.getSettings(false);
    }
  
    /**
     * Get business information
     */
    static async getBusinessInfo() {
      const settings = await this.getSettings();
      return {
        name: settings.businessName,
        address: settings.businessAddress,
        phone: settings.businessPhone,
        email: settings.businessEmail,
        gstNumber: settings.gstNumber
      };
    }
  
    /**
     * Check if current time is within operating hours
     */
    static async isWithinOperatingHours(time = new Date()) {
      try {
        const settings = await this.getSettings();
        const { start, end } = settings.operatingHours;
        
        const currentTime = time.toTimeString().slice(0, 5); // HH:MM format
        return currentTime >= start && currentTime <= end;
      } catch (error) {
        console.error('Error checking operating hours:', error);
        // Default to open during day hours
        const hour = time.getHours();
        return hour >= 6 && hour <= 22;
      }
    }
  
    /**
     * Get pricing-specific settings (optimized for frequent access)
     */
    static async getPricingSettings() {
      const settings = await this.getSettings();
      return {
        hourlyRate: settings.hourlyRate,
        graceMinutes: settings.graceMinutes,
        blockMinutes: settings.blockMinutes,
        nightChargeTime: settings.nightChargeTime,
        nightMultiplier: settings.nightMultiplier,
        minimumHours: settings.minimumHours,
        lateFeePerHour: settings.lateFeePerHour
      };
    }
  
    /**
     * Calculate rental start time based on settings
     */
    static async calculateRentalStartTime(bookingTime = new Date()) {
      try {
        const settings = await this.getSettings();
        const delayMinutes = settings.startDelayMinutes || 5;
        const roundToMinutes = settings.roundToNearestMinutes || 5;
        
        // Add delay to booking time
        const startTime = new Date(bookingTime.getTime() + (delayMinutes * 60 * 1000));
        
        // Round to nearest specified minutes if requested
        if (roundToMinutes > 1) {
          const minutes = startTime.getMinutes();
          const roundedMinutes = Math.ceil(minutes / roundToMinutes) * roundToMinutes;
          
          // Handle hour overflow
          if (roundedMinutes >= 60) {
            startTime.setHours(startTime.getHours() + Math.floor(roundedMinutes / 60));
            startTime.setMinutes(roundedMinutes % 60, 0, 0);
          } else {
            startTime.setMinutes(roundedMinutes, 0, 0);
          }
        } else {
          startTime.setSeconds(0, 0);
        }
        
        return startTime;
      } catch (error) {
        console.error('Error calculating rental start time:', error);
        // Fallback: add 5 minutes and round to nearest 5
        const fallbackStart = new Date(bookingTime.getTime() + (5 * 60 * 1000));
        const minutes = fallbackStart.getMinutes();
        const roundedMinutes = Math.ceil(minutes / 5) * 5;
        fallbackStart.setMinutes(roundedMinutes, 0, 0);
        return fallbackStart;
      }
    }
  
    /**
     * Validate settings before saving
     */
    static validateSettings(settings) {
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
  
      if (settings.graceMinutes < 0 || settings.graceMinutes > 60) {
        errors.push('Grace period must be between 0 and 60 minutes');
      }
  
      if (settings.startDelayMinutes < 0 || settings.startDelayMinutes > 60) {
        errors.push('Start delay must be between 0 and 60 minutes');
      }
  
      if (settings.roundToNearestMinutes && ![1, 5, 10, 15, 30].includes(settings.roundToNearestMinutes)) {
        errors.push('Round to nearest must be 1, 5, 10, 15, or 30 minutes');
      }
      
      return {
        isValid: errors.length === 0,
        errors
      };
    }
  
    /**
     * Format currency using business locale
     */
    static formatCurrency(amount) {
      return `₹${amount.toLocaleString('en-IN')}`;
    }
  
    /**
     * Get cache statistics (for debugging)
     */
    static getCacheStats() {
      return {
        hasCache: !!this.cache,
        lastFetch: this.lastFetch ? new Date(this.lastFetch).toISOString() : null,
        cacheAge: this.lastFetch ? Date.now() - this.lastFetch : null,
        cacheValid: this.lastFetch && (Date.now() - this.lastFetch < this.CACHE_DURATION)
      };
    }
  }