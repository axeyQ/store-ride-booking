// lib/timezone.js
// Robust timezone utilities with error handling

/**
 * Get current time in Indian Standard Time
 * Works consistently on localhost (any timezone) and Vercel (UTC)
 */
export function getCurrentIST() {
    try {
      const now = new Date();
      // Use Intl.DateTimeFormat for more reliable timezone conversion
      const istFormatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      
      const parts = istFormatter.formatToParts(now);
      const istDateString = `${parts.find(p => p.type === 'year').value}-${parts.find(p => p.type === 'month').value}-${parts.find(p => p.type === 'day').value}T${parts.find(p => p.type === 'hour').value}:${parts.find(p => p.type === 'minute').value}:${parts.find(p => p.type === 'second').value}`;
      
      return new Date(istDateString);
    } catch (error) {
      console.error('Error in getCurrentIST:', error);
      // Fallback: use current time with manual offset
      const now = new Date();
      return new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
    }
  }
  
  /**
   * Convert any date to IST timezone - More reliable version
   */
  export function toIST(date) {
    try {
      if (!date || isNaN(new Date(date).getTime())) {
        throw new Error('Invalid date provided to toIST');
      }
      
      const inputDate = new Date(date);
      
      // Use Intl.DateTimeFormat for reliable conversion
      const istFormatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      
      const parts = istFormatter.formatToParts(inputDate);
      const istDateString = `${parts.find(p => p.type === 'year').value}-${parts.find(p => p.type === 'month').value}-${parts.find(p => p.type === 'day').value}T${parts.find(p => p.type === 'hour').value}:${parts.find(p => p.type === 'minute').value}:${parts.find(p => p.type === 'second').value}`;
      
      const istDate = new Date(istDateString);
      
      if (isNaN(istDate.getTime())) {
        throw new Error('Failed to create valid IST date');
      }
      
      return istDate;
    } catch (error) {
      console.error('Error converting to IST:', error, 'Input date:', date);
      // Fallback: use manual offset calculation
      const inputDate = new Date(date);
      const utc = inputDate.getTime() + (inputDate.getTimezoneOffset() * 60000);
      return new Date(utc + (5.5 * 60 * 60 * 1000));
    }
  }
  
  /**
   * Get today's start (00:00:00) in IST
   */
  export function getTodayStartIST() {
    try {
      const now = getCurrentIST();
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      
      if (isNaN(todayStart.getTime())) {
        throw new Error('Invalid date created in getTodayStartIST');
      }
      
      return todayStart;
    } catch (error) {
      console.error('Error in getTodayStartIST:', error);
      // Fallback
      const now = new Date();
      const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
      const ist = new Date(utc + (5.5 * 60 * 60 * 1000));
      ist.setHours(0, 0, 0, 0);
      return ist;
    }
  }
  
  /**
   * Get tomorrow's start in IST
   */
  export function getTomorrowStartIST() {
    try {
      const todayStart = getTodayStartIST();
      const tomorrow = new Date(todayStart);
      tomorrow.setDate(todayStart.getDate() + 1);
      
      if (isNaN(tomorrow.getTime())) {
        throw new Error('Invalid date created in getTomorrowStartIST');
      }
      
      return tomorrow;
    } catch (error) {
      console.error('Error in getTomorrowStartIST:', error);
      // Fallback
      const today = getTodayStartIST();
      return new Date(today.getTime() + (24 * 60 * 60 * 1000));
    }
  }
  
  /**
   * Format date/time consistently in IST with error handling
   */
  export function formatIST(date, options = {}) {
    try {
      if (!date || isNaN(new Date(date).getTime())) {
        return 'Invalid Date';
      }
      
      const defaultOptions = {
        timeZone: "Asia/Kolkata",
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      };
      
      return new Date(date).toLocaleString('en-IN', {
        ...defaultOptions,
        ...options
      });
    } catch (error) {
      console.error('Error formatting IST date:', error, 'Input:', date);
      return 'Invalid Date';
    }
  }
  
  /**
   * Safe date creation with validation
   */
  export function createSafeDate(input) {
    try {
      const date = new Date(input);
      if (isNaN(date.getTime())) {
        throw new Error(`Invalid date input: ${input}`);
      }
      return date;
    } catch (error) {
      console.error('Error creating safe date:', error);
      return new Date(); // Return current date as fallback
    }
  }
  
  /**
   * Debug function with error handling
   */
  export function debugTimezone() {
    try {
      const now = new Date();
      console.log('🕐 Timezone Debug Info:');
      console.log('System timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);
      console.log('Raw Date:', now.toString());
      console.log('UTC:', now.toISOString());
      console.log('IST (formatted):', formatIST(now));
      
      const todayStart = getTodayStartIST();
      const tomorrowStart = getTomorrowStartIST();
      
      console.log('Today Start IST:', todayStart.toISOString());
      console.log('Tomorrow Start IST:', tomorrowStart.toISOString());
      console.log('Date validation passed ✅');
    } catch (error) {
      console.error('❌ Timezone debug failed:', error);
    }
  }
  
  // Export all functions
  export default {
    getCurrentIST,
    getTodayStartIST,
    getTomorrowStartIST,
    formatIST,
    toIST,
    createSafeDate,
    debugTimezone
  };