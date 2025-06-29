// src/lib/serviceRegistry.js
import { PricingService } from '@/services/PricingService.js';
import { SettingsService } from '@/services/SettingsService.js';
import { BookingService } from '@/services/BookingService.js';

/**
 * Service Registry - Central access point for all services
 * Provides a clean interface and handles service initialization
 */
export class ServiceRegistry {
  static initialized = false;
  static services = new Map();

  /**
   * Initialize all services
   */
  static async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      console.log('🚀 Initializing MR Travels Services...');
      
      // Register services
      this.services.set('settings', SettingsService);
      this.services.set('pricing', PricingService);
      this.services.set('booking', BookingService);

      // Pre-load critical settings for faster access
      await SettingsService.getSettings();
      
      this.initialized = true;
      console.log('✅ Services initialized successfully');
    } catch (error) {
      console.error('❌ Service initialization failed:', error);
      // Don't throw - allow app to continue with degraded functionality
    }
  }

  /**
   * Get service instance
   */
  static getService(serviceName) {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service '${serviceName}' not found`);
    }
    return service;
  }

  // ===== CONVENIENCE METHODS =====

  /**
   * Pricing Service Access
   */
  static get pricing() {
    return this.getService('pricing');
  }

  /**
   * Settings Service Access
   */
  static get settings() {
    return this.getService('settings');
  }

  /**
   * Booking Service Access
   */
  static get booking() {
    return this.getService('booking');
  }

  // ===== COMMONLY USED METHODS =====

  /**
   * Calculate pricing (most common operation)
   */
  static async calculatePricing(startTime, endTime) {
    await this.ensureInitialized();
    return this.pricing.calculateAdvancedPricing(startTime, endTime);
  }

  /**
   * Get settings (second most common)
   */
  static async getSettings(useCache = true) {
    await this.ensureInitialized();
    return this.settings.getSettings(useCache);
  }

  /**
   * Calculate current booking amount
   */
  static async calculateCurrentAmount(bookingId) {
    await this.ensureInitialized();
    return this.booking.calculateCurrentAmount(bookingId);
  }

  /**
   * Complete booking
   */
  static async completeBooking(bookingId, completionData) {
    await this.ensureInitialized();
    return this.booking.completeBooking(bookingId, completionData);
  }

  /**
   * Get pricing examples
   */
  static async getPricingExamples() {
    await this.ensureInitialized();
    return this.booking.getPricingExamples();
  }

  // ===== UTILITIES =====

  /**
   * Ensure services are initialized
   */
  static async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Health check for all services
   */
  static async healthCheck() {
    const results = {};
    
    try {
      // Check settings service
      const settingsStart = Date.now();
      await SettingsService.getSettings();
      results.settings = {
        status: 'healthy',
        responseTime: Date.now() - settingsStart
      };
    } catch (error) {
      results.settings = {
        status: 'unhealthy',
        error: error.message
      };
    }

    try {
      // Check pricing service
      const pricingStart = Date.now();
      await PricingService.calculateAdvancedPricing(new Date(), new Date());
      results.pricing = {
        status: 'healthy',
        responseTime: Date.now() - pricingStart
      };
    } catch (error) {
      results.pricing = {
        status: 'unhealthy',
        error: error.message
      };
    }

    // Overall health
    const allHealthy = Object.values(results).every(r => r.status === 'healthy');
    
    return {
      overall: allHealthy ? 'healthy' : 'degraded',
      services: results,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get service statistics
   */
  static getStats() {
    return {
      initialized: this.initialized,
      serviceCount: this.services.size,
      services: Array.from(this.services.keys()),
      settingsCache: SettingsService.getCacheStats()
    };
  }

  /**
   * Clear all caches
   */
  static clearCaches() {
    SettingsService.clearCache();
    console.log('🧹 All service caches cleared');
  }

  /**
   * Shutdown services (cleanup)
   */
  static shutdown() {
    this.clearCaches();
    this.services.clear();
    this.initialized = false;
    console.log('🛑 Services shutdown complete');
  }
}

// ===== CONVENIENCE EXPORTS =====

/**
 * Quick access functions for common operations
 * These maintain backward compatibility with existing code
 */

/**
 * Calculate advanced pricing - Drop-in replacement for existing functions
 */
export async function calculateAdvancedPricing(startTime, endTime) {
  return ServiceRegistry.calculatePricing(startTime, endTime);
}

/**
 * Get settings - Drop-in replacement for existing settings calls
 */
export async function getSettings(useCache = true) {
  return ServiceRegistry.getSettings(useCache);
}

/**
 * Calculate current amount - For API routes
 */
export async function calculateCurrentAmount(bookingId) {
  return ServiceRegistry.calculateCurrentAmount(bookingId);
}

/**
 * Get pricing settings - Optimized for frequent access
 */
export async function getPricingSettings() {
  await ServiceRegistry.ensureInitialized();
  return ServiceRegistry.settings.getPricingSettings();
}

/**
 * Format currency
 */
export function formatCurrency(amount) {
  return PricingService.formatCurrency(amount);
}

/**
 * Validate pricing settings
 */
export function validatePricingSettings(settings) {
  return PricingService.validatePricingSettings(settings);
}

// ===== AUTO-INITIALIZATION =====

/**
 * Auto-initialize services when module is imported
 * This ensures services are ready for immediate use
 */
if (typeof window !== 'undefined') {
  // Client-side initialization
  ServiceRegistry.initialize().catch(error => {
    console.warn('Client-side service initialization failed:', error);
  });
} else {
  // Server-side initialization (will be faster due to no network calls)
  ServiceRegistry.initialize().catch(error => {
    console.warn('Server-side service initialization failed:', error);
  });
}

// Default export
export default ServiceRegistry;