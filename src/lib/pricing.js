// Advanced Pricing Calculation System for MR Travels

/**
 * Calculate sophisticated pricing based on business rules:
 * - First 1 hour 15 minutes: Base rate (₹80)
 * - Subsequent 30-minute blocks: Half rate (₹40)
 * - Night charge: 2x rate for blocks crossing 10:30 PM
 * - All configurable via settings
 */

// Default pricing settings
const DEFAULT_PRICING = {
    baseRate: 80,
    graceMinutes: 15,
    blockMinutes: 30,
    nightChargeTime: '22:30', // 10:30 PM in 24-hour format
    nightMultiplier: 2
  };
  
  /**
   * Get current pricing settings from API or use defaults
   */
  async function getPricingSettings() {
    try {
      const response = await fetch('/api/settings');
      const data = await response.json();
      
      if (data.success) {
        return {
          baseRate: data.settings.hourlyRate || DEFAULT_PRICING.baseRate,
          graceMinutes: data.settings.graceMinutes || DEFAULT_PRICING.graceMinutes,
          blockMinutes: data.settings.blockMinutes || DEFAULT_PRICING.blockMinutes,
          nightChargeTime: data.settings.nightChargeTime || DEFAULT_PRICING.nightChargeTime,
          nightMultiplier: data.settings.nightMultiplier || DEFAULT_PRICING.nightMultiplier
        };
      }
    } catch (error) {
      console.error('Error fetching pricing settings:', error);
    }
    
    return DEFAULT_PRICING;
  }
  
  /**
   * Calculate total amount based on start and end time
   */
  export async function calculateAdvancedPricing(startTime, endTime = new Date()) {
    const settings = await getPricingSettings();
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    // Calculate total minutes
    const totalMinutes = Math.max(0, Math.floor((end - start) / (1000 * 60)));
    
    if (totalMinutes === 0) {
      return {
        totalAmount: 0,
        breakdown: [],
        totalMinutes: 0,
        summary: 'No time elapsed'
      };
    }
    
    return calculatePricingBreakdown(start, totalMinutes, settings);
  }
  
  /**
   * Calculate pricing breakdown with detailed blocks
   */
  function calculatePricingBreakdown(startTime, totalMinutes, settings) {
    const { baseRate, graceMinutes, blockMinutes, nightChargeTime, nightMultiplier } = settings;
    const halfRate = Math.round(baseRate / 2);
    
    let breakdown = [];
    let totalAmount = 0;
    let remainingMinutes = totalMinutes;
    let currentTime = new Date(startTime);
    
    // First block: Base hour + grace period
    const firstBlockMinutes = 60 + graceMinutes; // 75 minutes
    const firstBlockUsed = Math.min(remainingMinutes, firstBlockMinutes);
    
    const firstBlockRate = isNightCharge(currentTime, firstBlockUsed, nightChargeTime) 
      ? baseRate * nightMultiplier 
      : baseRate;
    
    breakdown.push({
      period: `First ${Math.floor(firstBlockMinutes/60)}h ${firstBlockMinutes%60}m`,
      startTime: formatTime(currentTime),
      endTime: formatTime(addMinutes(currentTime, firstBlockUsed)),
      minutes: firstBlockUsed,
      rate: firstBlockRate,
      isNightCharge: firstBlockRate > baseRate,
      description: firstBlockUsed === firstBlockMinutes 
        ? `Full first period (${firstBlockUsed} minutes)` 
        : `Partial first period (${firstBlockUsed} minutes)`
    });
    
    totalAmount += firstBlockRate;
    remainingMinutes -= firstBlockUsed;
    currentTime = addMinutes(currentTime, firstBlockUsed);
    
    // Subsequent blocks: 30-minute increments
    let blockNumber = 2;
    while (remainingMinutes > 0) {
      const blockUsed = Math.min(remainingMinutes, blockMinutes);
      const blockEndTime = addMinutes(currentTime, blockUsed);
      
      const isNight = isNightCharge(currentTime, blockUsed, nightChargeTime);
      const blockRate = isNight ? halfRate * nightMultiplier : halfRate;
      
      breakdown.push({
        period: `Block ${blockNumber} (${blockMinutes}min)`,
        startTime: formatTime(currentTime),
        endTime: formatTime(blockEndTime),
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
      summary: generatePricingSummary(breakdown, totalAmount, totalMinutes)
    };
  }
  
  /**
   * Check if a time block crosses the night charge threshold
   */
  function isNightCharge(startTime, durationMinutes, nightChargeTime) {
    const [nightHour, nightMinute] = nightChargeTime.split(':').map(Number);
    const blockEndTime = addMinutes(startTime, durationMinutes);
    
    const nightThreshold = new Date(startTime);
    nightThreshold.setHours(nightHour, nightMinute, 0, 0);
    
    // If the block crosses or includes the night threshold
    return blockEndTime > nightThreshold && startTime < addMinutes(nightThreshold, 1);
  }
  
  /**
   * Add minutes to a date
   */
  function addMinutes(date, minutes) {
    return new Date(date.getTime() + minutes * 60000);
  }
  
  /**
   * Format time for display
   */
  function formatTime(date) {
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }
  
  /**
   * Generate pricing summary text
   */
  function generatePricingSummary(breakdown, totalAmount, totalMinutes) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const nightBlocks = breakdown.filter(b => b.isNightCharge).length;
    
    let summary = `${hours}h ${minutes}m total`;
    if (nightBlocks > 0) {
      summary += ` (${nightBlocks} night-rate block${nightBlocks > 1 ? 's' : ''})`;
    }
    
    return summary;
  }
  
  /**
   * Calculate pricing for a specific duration in minutes (for preview)
   */
  export async function calculatePricingPreview(durationMinutes, startTime = new Date()) {
    if (durationMinutes <= 0) {
      return { totalAmount: 0, breakdown: [], summary: 'No time selected' };
    }
    
    return calculateAdvancedPricing(startTime, addMinutes(startTime, durationMinutes));
  }
  
  /**
   * Get quick pricing examples for display
   */
  export async function getPricingExamples() {
    const settings = await getPricingSettings();
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
        const result = await calculatePricingPreview(example.minutes, now);
        return {
          ...example,
          amount: result.totalAmount,
          type: 'day'
        };
      })
    );
    
    // Night examples (starting at 9:30 PM)
    const nightTime = new Date();
    nightTime.setHours(21, 30, 0, 0); // 9:30 PM
    
    const nightExamples = await Promise.all(
      examples.slice(1, 4).map(async (example) => {
        const result = await calculatePricingPreview(example.minutes, nightTime);
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
  
  /**
   * Format currency amount
   */
  export function formatCurrency(amount) {
    return `₹${amount.toLocaleString('en-IN')}`;
  }
  
  /**
   * Calculate real-time pricing for active bookings
   */
  export async function calculateCurrentAmount(booking) {
    const startTime = new Date(booking.startTime);
    const endTime = booking.endTime ? new Date(booking.endTime) : new Date();
    
    if (booking.finalAmount) {
      return booking.finalAmount; // Already completed
    }
    
    const result = await calculateAdvancedPricing(startTime, endTime);
    return result.totalAmount;
  }
  
  /**
   * Validate pricing settings
   */
  export function validatePricingSettings(settings) {
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
    
    // Validate night charge time format (HH:MM)
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(settings.nightChargeTime)) {
      errors.push('Night charge time must be in HH:MM format');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }