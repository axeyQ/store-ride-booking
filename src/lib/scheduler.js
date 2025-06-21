import cron from 'node-cron';

export function initializeDailyOperationsScheduler() {
  // Run at 12:00 AM every day (midnight)
  cron.schedule('0 0 * * *', async () => {
    console.log('🌙 Running auto-end daily operations check...');
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/daily-operations/auto-end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      console.log('Auto-end result:', data);
      
    } catch (error) {
      console.error('Auto-end scheduler error:', error);
    }
  }, {
    timezone: "Asia/Kolkata" // IST timezone
  });
  
  console.log('📅 Daily operations auto-end scheduler initialized');
}
