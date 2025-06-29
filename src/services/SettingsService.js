// src/services/SettingsService.js

/**
 * Centralized Settings Service with Caching
 * ✅ FULLY INTEGRATED with your /api/settings route
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
     * ✅ INTEGRATED: Works with your /api/settings route
     */
    static async getSettings(useCache = true) {
      const now = Date.now();
      
      // Return cached settings if still valid
      if (useCache && this.cache && this.lastFetch && (now - this.lastFetch < this.CACHE_DURATION)) {
        return this.cache;
      }
      
      try {
        // Try to fetch from your API route
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
     * ✅ INTEGRATED: Uses your /api/settings PUT route
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
     * Fetch settings from your API route
     * ✅ INTEGRATED: Works with your existing API structure
     */
    static async fetchFromAPI() {
      try {
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
     * ✅ MOVED: From your settings API route to here for centralized logic
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
     * ✅ USED BY: Your updated settings API route
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

      if (settings.blockMinutes <= 0 || settings.blockMinutes > 120) {
        errors.push('Block duration must be between 1 and 120 minutes');
      }

      if (settings.nightMultiplier < 1 || settings.nightMultiplier > 5) {
        errors.push('Night multiplier must be between 1 and 5');
      }

      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(settings.nightChargeTime)) {
        errors.push('Night charge time must be in HH:MM format');
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

    // ===== ADVANCED SETTINGS MANAGEMENT =====

    /**
     * Get start time settings for booking creation
     * ✅ NEW: Optimized for booking creation workflow
     */
    static async getStartTimeSettings() {
      try {
        const settings = await this.getSettings();
        return {
          delayMinutes: settings.startDelayMinutes || 5,
          roundToMinutes: settings.roundToNearestMinutes || 5,
          examples: this.generateStartTimeExamples(settings.startDelayMinutes, settings.roundToNearestMinutes)
        };
      } catch (error) {
        console.error('Error fetching start time settings:', error);
        return {
          delayMinutes: 5,
          roundToMinutes: 5,
          examples: this.generateStartTimeExamples(5, 5)
        };
      }
    }

    /**
     * Generate start time examples for UI display
     * ✅ NEW: Helper for settings page
     */
    static generateStartTimeExamples(delayMinutes = 5, roundToMinutes = 5) {
      const examples = [];
      const baseTimes = ['09:23', '14:47', '18:12', '21:38'];
      
      for (const timeStr of baseTimes) {
        const [hour, minute] = timeStr.split(':').map(Number);
        const testTime = new Date();
        testTime.setHours(hour, minute, 0, 0);
        
        // Add delay
        const startTime = new Date(testTime.getTime() + (delayMinutes * 60 * 1000));
        
        // Round
        if (roundToMinutes > 1) {
          const minutes = startTime.getMinutes();
          const roundedMinutes = Math.ceil(minutes / roundToMinutes) * roundToMinutes;
          
          if (roundedMinutes >= 60) {
            startTime.setHours(startTime.getHours() + Math.floor(roundedMinutes / 60));
            startTime.setMinutes(roundedMinutes % 60, 0, 0);
          } else {
            startTime.setMinutes(roundedMinutes, 0, 0);
          }
        }
        
        examples.push({
          bookingTime: testTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          startTime: startTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
        });
      }
      
      return examples;
    }

    /**
     * Get notification settings
     * ✅ NEW: For future notification features
     */
    static async getNotificationSettings() {
      const settings = await this.getSettings();
      return {
        sms: settings.smsNotifications,
        email: settings.emailNotifications,
        whatsapp: settings.whatsappNotifications,
        reminderTime: settings.reminderTimeBeforeReturn
      };
    }

    /**
     * Get operational constraints
     * ✅ NEW: Business rules for booking validation
     */
    static async getOperationalConstraints() {
      const settings = await this.getSettings();
      return {
        operatingHours: settings.operatingHours,
        maxAdvanceBookingDays: settings.maxAdvanceBookingDays,
        securityDeposit: settings.securityDeposit,
        documentRequirements: {
          aadharPhoto: settings.requireAadharPhoto,
          signature: settings.requireSignature,
          licenseVerification: settings.requireLicenseVerification
        }
      };
    }

    /**
     * Check if a time is within operating hours
     * ✅ NEW: Enhanced operating hours check
     */
    static async isTimeWithinOperatingHours(time = new Date()) {
      try {
        const settings = await this.getSettings();
        const { start, end } = settings.operatingHours;
        
        const timeStr = time.toTimeString().slice(0, 5); // HH:MM
        
        // Handle case where end time is before start time (overnight operation)
        if (end < start) {
          return timeStr >= start || timeStr <= end;
        } else {
          return timeStr >= start && timeStr <= end;
        }
      } catch (error) {
        console.error('Error checking operating hours:', error);
        // Conservative default: 6 AM to 10 PM
        const hour = time.getHours();
        return hour >= 6 && hour <= 22;
      }
    }

    /**
     * Get minimum booking requirements
     * ✅ NEW: For booking validation
     */
    static async getBookingRequirements() {
      const settings = await this.getSettings();
      return {
        minimumHours: settings.minimumHours,
        securityDeposit: settings.securityDeposit,
        documentsRequired: {
          aadhar: settings.requireAadharPhoto,
          license: settings.requireLicenseVerification,
          signature: settings.requireSignature
        },
        advanceBookingLimit: settings.maxAdvanceBookingDays
      };
    }

    /**
     * Calculate business hours between two dates
     * ✅ NEW: For reporting and analytics
     */
    static async calculateBusinessHours(startDate, endDate) {
      try {
        const settings = await this.getSettings();
        const { start, end } = settings.operatingHours;
        
        const [startHour, startMinute] = start.split(':').map(Number);
        const [endHour, endMinute] = end.split(':').map(Number);
        
        const dailyBusinessMinutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
        
        let totalMinutes = 0;
        const current = new Date(startDate);
        
        while (current < endDate) {
          // Check if current day is within business hours
          const dayStart = new Date(current);
          dayStart.setHours(startHour, startMinute, 0, 0);
          
          const dayEnd = new Date(current);
          dayEnd.setHours(endHour, endMinute, 0, 0);
          
          const periodStart = Math.max(current.getTime(), dayStart.getTime());
          const periodEnd = Math.min(endDate.getTime(), dayEnd.getTime());
          
          if (periodEnd > periodStart) {
            totalMinutes += (periodEnd - periodStart) / (1000 * 60);
          }
          
          // Move to next day
          current.setDate(current.getDate() + 1);
          current.setHours(0, 0, 0, 0);
        }
        
        return {
          totalMinutes: Math.round(totalMinutes),
          totalHours: Math.round(totalMinutes / 60 * 100) / 100,
          dailyBusinessHours: dailyBusinessMinutes / 60
        };
      } catch (error) {
        console.error('Error calculating business hours:', error);
        // Fallback: assume 16 hours per day (6 AM to 10 PM)
        const diffMs = endDate - startDate;
        const totalHours = diffMs / (1000 * 60 * 60);
        return {
          totalMinutes: Math.round(totalHours * 60),
          totalHours: Math.round(totalHours * 100) / 100,
          dailyBusinessHours: 16
        };
      }
    }

    /**
     * Export settings for backup
     * ✅ NEW: Settings backup functionality
     */
    static async exportSettings() {
      try {
        const settings = await this.getSettings();
        return {
          settings,
          exportedAt: new Date().toISOString(),
          version: settings.version || '1.0.0',
          systemInfo: {
            cache: this.getCacheStats(),
            defaults: this.DEFAULT_SETTINGS
          }
        };
      } catch (error) {
        console.error('Error exporting settings:', error);
        return {
          error: error.message,
          exportedAt: new Date().toISOString()
        };
      }
    }

    /**
     * Import settings from backup
     * ✅ NEW: Settings restore functionality
     */
    static async importSettings(settingsData) {
      try {
        if (!settingsData.settings) {
          throw new Error('Invalid settings data format');
        }

        // Validate imported settings
        const validation = this.validateSettings(settingsData.settings);
        if (!validation.isValid) {
          throw new Error(`Invalid settings: ${validation.errors.join(', ')}`);
        }

        // Update settings
        const result = await this.updateSettings(settingsData.settings);
        
        if (result.success) {
          return {
            success: true,
            message: 'Settings imported successfully',
            importedAt: new Date().toISOString(),
            originalExportDate: settingsData.exportedAt
          };
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        console.error('Error importing settings:', error);
        return {
          success: false,
          error: error.message
        };
      }
    }

    /**
     * Reset settings to defaults
     * ✅ NEW: Factory reset functionality
     */
    static async resetToDefaults() {
      try {
        const result = await this.updateSettings(this.DEFAULT_SETTINGS);
        
        if (result.success) {
          return {
            success: true,
            message: 'Settings reset to defaults successfully',
            resetAt: new Date().toISOString()
          };
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        console.error('Error resetting settings:', error);
        return {
          success: false,
          error: error.message
        };
      }
    }
}