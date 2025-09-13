/**
 * Calculate rental start time - UPDATED: Round to next 5-minute interval
 * @param {Date} bookingTime - The time when booking was created (defaults to now)
 * @param {number} delayMinutes - DEPRECATED: No longer used (kept for compatibility)
 * @param {number} roundToMinutes - Round to nearest X minutes (1, 5, 10, 15, 30)
 * @returns {Date} Calculated start time
 */
export function calculateRentalStartTime(
  bookingTime = new Date(), 
  delayMinutes = 5, // DEPRECATED - no longer used
  roundToMinutes = 5
) {
  // 🚀 NEW LOGIC: Just round UP to next interval, no delay added
  const startTime = new Date(bookingTime);
  
  if (roundToMinutes > 1) {
    const minutes = startTime.getMinutes();
    const seconds = startTime.getSeconds();
    const milliseconds = startTime.getMilliseconds();
    
    // If we're exactly on the interval mark, go to next interval
    let roundedMinutes;
    if (minutes % roundToMinutes === 0 && seconds === 0 && milliseconds === 0) {
      // Exactly on the mark - go to next interval  
      roundedMinutes = minutes + roundToMinutes;
    } else {
      // Not exactly on mark - round up to next interval
      roundedMinutes = Math.ceil(minutes / roundToMinutes) * roundToMinutes;
    }
    
    // Handle hour overflow
    if (roundedMinutes >= 60) {
      startTime.setHours(startTime.getHours() + Math.floor(roundedMinutes / 60));
      startTime.setMinutes(roundedMinutes % 60, 0, 0);
    } else {
      startTime.setMinutes(roundedMinutes, 0, 0);
    }
  } else {
    // No rounding - just clean up seconds and milliseconds
    startTime.setSeconds(0, 0);
  }
  
  return startTime;
}
  
  /**
   * Get start time configuration from settings API
   * @returns {Promise<{delayMinutes: number, roundToMinutes: number}>}
   */
  export async function getStartTimeSettings() {
    try {
      const response = await fetch('/api/settings');
      const data = await response.json();
      
      if (data.success && data.settings) {
        return {
          delayMinutes: data.settings.startDelayMinutes || 5,
          roundToMinutes: data.settings.roundToNearestMinutes || 5
        };
      }
    } catch (error) {
      console.error('Error fetching start time settings:', error);
    }
    
    // Fallback to defaults
    return {
      delayMinutes: 5,
      roundToMinutes: 5
    };
  }
  
  /**
   * Calculate rental start time using current settings
   * @param {Date} bookingTime - The time when booking was created (defaults to now)
   * @returns {Promise<Date>} Calculated start time
   */
  export async function calculateRentalStartTimeWithSettings(bookingTime = new Date()) {
    const settings = await getStartTimeSettings();
    return calculateRentalStartTime(bookingTime, settings.delayMinutes, settings.roundToMinutes);
  }
  
  /**
   * Format time for display in Indian locale
   * @param {Date} date - Date to format
   * @param {boolean} includeDate - Whether to include date in output
   * @returns {string} Formatted time string
   */
  export function formatTimeForDisplay(date, includeDate = false) {
    const options = {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    };
    
    if (includeDate) {
      options.weekday = 'short';
      options.day = 'numeric';
      options.month = 'short';
    }
    
    return date.toLocaleString('en-IN', options);
  }
  
  /**
   * Get examples of how booking times would be converted to start times
   * @param {number} delayMinutes - Delay setting
   * @param {number} roundToMinutes - Rounding setting
   * @param {number} exampleCount - Number of examples to generate
   * @returns {Array<{bookingTime: string, startTime: string}>}
   */
  export function getStartTimeExamples(delayMinutes = 5, roundToMinutes = 5, exampleCount = 3) {
    const now = new Date();
    const examples = [];
    
    for (let i = 0; i < exampleCount; i++) {
      // Create test booking times with 2-minute intervals for variety
      const testBookingTime = new Date(now.getTime() + (i * 2 * 60 * 1000));
      const calculatedStartTime = calculateRentalStartTime(testBookingTime, delayMinutes, roundToMinutes);
      
      examples.push({
        bookingTime: formatTimeForDisplay(testBookingTime),
        startTime: formatTimeForDisplay(calculatedStartTime),
        bookingTimeRaw: testBookingTime,
        startTimeRaw: calculatedStartTime
      });
    }
    
    return examples;
  }
  
  /**
   * Calculate time difference in minutes between two dates
   * @param {Date} startTime - Start time
   * @param {Date} endTime - End time (defaults to now)
   * @returns {number} Difference in minutes
   */
  export function getMinutesDifference(startTime, endTime = new Date()) {
    return Math.floor((endTime - startTime) / (1000 * 60));
  }
  
  /**
   * Check if a rental start time is in the future
   * @param {Date} startTime - Rental start time
   * @param {number} bufferMinutes - Buffer time in minutes (default 1)
   * @returns {boolean} True if start time is in the future
   */
  export function isStartTimeInFuture(startTime, bufferMinutes = 1) {
    const now = new Date();
    const bufferTime = new Date(now.getTime() + (bufferMinutes * 60 * 1000));
    return startTime > bufferTime;
  }
  
  /**
   * Get countdown string until rental start time
   * @param {Date} startTime - Rental start time
   * @returns {string} Human readable countdown
   */
  export function getCountdownToStart(startTime) {
    const now = new Date();
    const diffMinutes = Math.floor((startTime - now) / (1000 * 60));
    
    if (diffMinutes <= 0) {
      return 'Rental has started';
    } else if (diffMinutes === 1) {
      return '1 minute until start';
    } else if (diffMinutes < 60) {
      return `${diffMinutes} minutes until start`;
    } else {
      const hours = Math.floor(diffMinutes / 60);
      const remainingMinutes = diffMinutes % 60;
      
      if (remainingMinutes === 0) {
        return `${hours} hour${hours === 1 ? '' : 's'} until start`;
      } else {
        return `${hours}h ${remainingMinutes}m until start`;
      }
    }
  }
  
  /**
   * Validate start time settings
   * @param {number} delayMinutes - Delay in minutes
   * @param {number} roundToMinutes - Rounding in minutes
   * @returns {{isValid: boolean, errors: string[]}}
   */
  export function validateStartTimeSettings(delayMinutes, roundToMinutes) {
    const errors = [];
    
    if (typeof delayMinutes !== 'number' || delayMinutes < 0 || delayMinutes > 60) {
      errors.push('Start delay must be between 0 and 60 minutes');
    }
    
    if (typeof roundToMinutes !== 'number' || ![1, 5, 10, 15, 30].includes(roundToMinutes)) {
      errors.push('Round to nearest must be 1, 5, 10, 15, or 30 minutes');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }