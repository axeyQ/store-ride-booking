// src/services/PricingService.js
import { SettingsService } from './SettingsService.js';

/**
 * Centralized Pricing Service
 * Handles all pricing calculations with caching and fallback mechanisms
 */
export class PricingService {
  static DEFAULT_PRICING = {
    baseRate: 80,
    graceMinutes: 15,
    blockMinutes: 30,
    nightChargeTime: '22:30',
    nightMultiplier: 2
  };

  /**
   * Get pricing settings with caching
   */
  static async getPricingSettings() {
    try {
      const settings = await SettingsService.getSettings();
      return {
        baseRate: settings.hourlyRate || this.DEFAULT_PRICING.baseRate,
        graceMinutes: settings.graceMinutes || this.DEFAULT_PRICING.graceMinutes,
        blockMinutes: settings.blockMinutes || this.DEFAULT_PRICING.blockMinutes,
        nightChargeTime: settings.nightChargeTime || this.DEFAULT_PRICING.nightChargeTime,
        nightMultiplier: settings.nightMultiplier || this.DEFAULT_PRICING.nightMultiplier
      };
    } catch (error) {
      console.error('Error fetching pricing settings, using defaults:', error);
      return this.DEFAULT_PRICING;
    }
  }

  /**
   * MAIN PRICING CALCULATION - Single source of truth
   * Replaces all duplicated pricing logic across the app
   */
  static async calculateAdvancedPricing(startTime, endTime = new Date()) {
    try {
      const settings = await this.getPricingSettings();
      const start = new Date(startTime);
      const end = new Date(endTime);
      
      // Handle future start times
      if (end < start) {
        const minutesUntilStart = Math.ceil((start - end) / (1000 * 60));
        return {
          totalAmount: 0,
          breakdown: [],
          totalMinutes: 0,
          status: 'pre-start',
          summary: `Rental starts in ${minutesUntilStart} minute${minutesUntilStart === 1 ? '' : 's'}`,
          minutesUntilStart
        };
      }
      
      const totalMinutes = Math.max(0, Math.floor((end - start) / (1000 * 60)));
      
      // Just started case
      if (totalMinutes === 0) {
        return {
          totalAmount: 0,
          breakdown: [],
          totalMinutes: 0,
          status: 'just-started',
          summary: 'Rental just started'
        };
      }
      
      // Calculate detailed breakdown
      return this.calculatePricingBreakdown(start, totalMinutes, settings);
      
    } catch (error) {
      console.error('Pricing calculation error:', error);
      // Fallback calculation
      return this.calculateFallbackPricing(startTime, endTime);
    }
  }

  /**
   * DETAILED PRICING BREAKDOWN
   * Enhanced version with night charge support
   */
  static calculatePricingBreakdown(startTime, totalMinutes, settings) {
    const { baseRate, graceMinutes, blockMinutes, nightChargeTime, nightMultiplier } = settings;
    const halfRate = Math.round(baseRate / 2);
    
    let breakdown = [];
    let totalAmount = 0;
    let remainingMinutes = totalMinutes;
    let currentTime = new Date(startTime);
    
    // First block: Base hour + grace period (75 minutes default)
    const firstBlockMinutes = 60 + graceMinutes;
    const firstBlockUsed = Math.min(remainingMinutes, firstBlockMinutes);
    
    const firstBlockRate = this.isNightCharge(currentTime, firstBlockUsed, nightChargeTime) 
      ? baseRate * nightMultiplier 
      : baseRate;
    
    breakdown.push({
      period: `First ${Math.floor(firstBlockMinutes/60)}h ${firstBlockMinutes%60}m`,
      startTime: this.formatTime(currentTime),
      endTime: this.formatTime(this.addMinutes(currentTime, firstBlockUsed)),
      minutes: firstBlockUsed,
      rate: firstBlockRate,
      isNightCharge: firstBlockRate > baseRate,
      description: firstBlockUsed === firstBlockMinutes 
        ? `Full first period (${firstBlockUsed} minutes)` 
        : `Partial first period (${firstBlockUsed} minutes)`
    });
    
    totalAmount += firstBlockRate;
    remainingMinutes -= firstBlockUsed;
    currentTime = this.addMinutes(currentTime, firstBlockUsed);
    
    // Subsequent blocks: 30-minute increments (default)
    let blockNumber = 2;
    while (remainingMinutes > 0) {
      const blockUsed = Math.min(remainingMinutes, blockMinutes);
      const blockEndTime = this.addMinutes(currentTime, blockUsed);
      
      const isNight = this.isNightCharge(currentTime, blockUsed, nightChargeTime);
      const blockRate = isNight ? halfRate * nightMultiplier : halfRate;
      
      breakdown.push({
        period: `Block ${blockNumber} (${blockMinutes}min)`,
        startTime: this.formatTime(currentTime),
        endTime: this.formatTime(blockEndTime),
        minutes: blockUsed,
        rate: blockRate,
        isNightCharge: isNight,
        description: blockUsed === blockMinutes 
          ? `Full ${blockMinutes}-minute block` 
          : `Partial block (${blockUsed} minutes)`
      });
      
      totalAmount += blockRate;
      remainingMinutes -= blockUsed;
      currentTime = blockEndTime;
      blockNumber++;
    }
    
    return {
      totalAmount,
      breakdown,
      totalMinutes,
      summary: this.generatePricingSummary(breakdown, totalAmount, totalMinutes)
    };
  }

  /**
   * FALLBACK PRICING - Simple calculation when detailed fails
   * Matches your current booking completion API logic
   */
  static calculateFallbackPricing(startTime, endTime) {
    try {
      const start = new Date(startTime);
      const end = new Date(endTime);
      const totalMinutes = Math.max(0, Math.floor((end - start) / (1000 * 60)));
      
      if (totalMinutes === 0) {
        return { totalAmount: 80, breakdown: [], totalMinutes: 0 };
      }
      
      const hours = Math.ceil(totalMinutes / 60);
      const totalAmount = Math.max(hours * 80, 80);
      
      return {
        totalAmount,
        breakdown: [{ period: `${hours} hour(s)`, minutes: totalMinutes, rate: totalAmount }],
        totalMinutes,
        summary: `${hours}h fallback calculation`
      };
    } catch (error) {
      console.error('Fallback pricing failed:', error);
      return { totalAmount: 80, breakdown: [], totalMinutes: 0, summary: 'Minimum charge' };
    }
  }

  /**
   * SIMPLIFIED PRICING - For API routes that need basic calculation
   * Maintains compatibility with existing booking completion API
   */
  static async calculateSimplePricing(startTime, endTime) {
    try {
      const settings = await this.getPricingSettings();
      const start = new Date(startTime);
      const end = new Date(endTime);
      const totalMinutes = Math.max(0, Math.floor((end - start) / (1000 * 60)));

      if (totalMinutes === 0) {
        return { totalAmount: settings.baseRate, breakdown: [], totalMinutes: 0 };
      }

      const hours = Math.ceil(totalMinutes / 60);
      const totalAmount = Math.max(hours * settings.baseRate, settings.baseRate);

      return {
        totalAmount,
        breakdown: [{ period: `${hours} hour(s)`, minutes: totalMinutes, rate: totalAmount }],
        totalMinutes,
        summary: `${hours}h rental completed`
      };
    } catch (error) {
      console.error('Simple pricing calculation error:', error);
      return this.calculateFallbackPricing(startTime, endTime);
    }
  }

  /**
   * CURRENT AMOUNT CALCULATION - For live booking tracking
   */
  static async calculateCurrentAmount(booking) {
    const startTime = new Date(booking.startTime);
    const endTime = booking.endTime ? new Date(booking.endTime) : new Date();
    
    const result = await this.calculateAdvancedPricing(startTime, endTime);
    
    return {
      amount: result.totalAmount,
      status: result.status || (booking.status === 'completed' ? 'completed' : 'active'),
      summary: result.summary,
      minutesUntilStart: result.minutesUntilStart || 0,
      breakdown: result.breakdown || []
    };
  }

  /**
   * PRICING PREVIEW - For UI previews (duration in minutes)
   */
  static async calculatePricingPreview(durationMinutes, startTime = new Date()) {
    if (durationMinutes <= 0) {
      return { totalAmount: 0, breakdown: [], summary: 'No time selected' };
    }
    
    const endTime = this.addMinutes(startTime, durationMinutes);
    return this.calculateAdvancedPricing(startTime, endTime);
  }

  /**
   * PRICING EXAMPLES - For settings page and UI displays
   */
  static async getPricingExamples() {
    const settings = await this.getPricingSettings();
    const now = new Date();
    now.setHours(14, 0, 0, 0); // 2 PM for day examples
    
    const examples = [
      { label: '30 minutes', minutes: 30 },
      { label: '1 hour', minutes: 60 },
      { label: '1.5 hours', minutes: 90 },
      { label: '2 hours', minutes: 120 },
      { label: '3 hours', minutes: 180 }
    ];
    
    const dayExamples = await Promise.all(
      examples.map(async (example) => {
        const result = await this.calculatePricingPreview(example.minutes, now);
        return {
          ...example,
          amount: result.totalAmount,
          type: 'day'
        };
      })
    );
    
    // Night examples (starting at 9:30 PM)
    const nightTime = new Date();
    nightTime.setHours(21, 30, 0, 0);
    
    const nightExamples = await Promise.all(
      examples.slice(1, 4).map(async (example) => {
        const result = await this.calculatePricingPreview(example.minutes, nightTime);
        return {
          ...example,
          amount: result.totalAmount,
          type: 'night'
        };
      })
    );
    
    return {
      day: dayExamples,
      night: nightExamples,
      settings
    };
  }

  // ===== UTILITY METHODS =====

  static isNightCharge(startTime, durationMinutes, nightChargeTime) {
    try {
      const [nightHour, nightMinute] = nightChargeTime.split(':').map(Number);
      const blockEndTime = this.addMinutes(startTime, durationMinutes);
      
      const nightThreshold = new Date(startTime);
      nightThreshold.setHours(nightHour, nightMinute, 0, 0);
      
      return blockEndTime > nightThreshold && startTime < this.addMinutes(nightThreshold, 1);
    } catch (error) {
      return false;
    }
  }

  static addMinutes(date, minutes) {
    return new Date(date.getTime() + minutes * 60000);
  }

  static formatTime(date) {
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  static generatePricingSummary(breakdown, totalAmount, totalMinutes) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const nightBlocks = breakdown.filter(b => b.isNightCharge).length;
    
    let summary = `${hours}h ${minutes}m total`;
    if (nightBlocks > 0) {
      summary += ` (${nightBlocks} night-rate block${nightBlocks > 1 ? 's' : ''})`;
    }
    
    return summary;
  }

  static formatCurrency(amount) {
    return `₹${amount.toLocaleString('en-IN')}`;
  }

  /**
   * VALIDATION
   */
  static validatePricingSettings(settings) {
    const errors = [];
    
    if (!settings.hourlyRate || settings.hourlyRate <= 0) {
      errors.push('Hourly rate must be greater than 0');
    }
    
    if (settings.graceMinutes < 0 || settings.graceMinutes > 60) {
      errors.push('Grace period must be between 0 and 60 minutes');
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
}