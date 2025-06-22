export function calculateDuration(startTime, endTime, status) {
    // Handle cancelled bookings
    if (status === 'cancelled') {
      return {
        hours: 0,
        minutes: 0,
        seconds: 0,
        totalHours: 0,
        totalMinutes: 0,
        isCancelled: true,
        displayText: 'CANCELLED',
        exportText: 'CANCELLED'
      };
    }
  
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diffMs = Math.max(0, end - start);
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
    
    return {
      hours,
      minutes,
      seconds,
      totalHours: Math.ceil(diffMs / (1000 * 60 * 60)),
      totalMinutes: Math.floor(diffMs / (1000 * 60)),
      isCancelled: false,
      displayText: `${hours}h ${minutes}m`,
      exportText: Math.ceil(diffMs / (1000 * 60 * 60)).toString()
    };
  }
  
  export function formatDurationForDisplay(duration) {
    if (duration.isCancelled) {
      return {
        text: 'CANCELLED',
        className: 'text-red-400 font-semibold'
      };
    }
    
    return {
      text: duration.displayText,
      className: 'text-white font-semibold'
    };
  }