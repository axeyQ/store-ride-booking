// src/lib/utils/smsHelpers.js
import smsService from '@/lib/smsService';

export const formatDateTime = (date) => {
  return new Date(date).toLocaleString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const sendBookingNotifications = async (booking) => {
  try {
    const pickupTime = formatDateTime(booking.pickupDateTime);
    
    // Send booking confirmation
    await smsService.sendBookingConfirmation(
      booking.customer.mobile,
      booking.customer.name,
      booking.bookingId,
      booking.vehicle.vehicleNumber,
      pickupTime
    );
    
    return { success: true };
  } catch (error) {
    console.error('Error sending booking notifications:', error);
    return { success: false };
  }
};

export const sendReturnReminders = async () => {
  try {
    // This would be called by a cron job to send return reminders
    // Get active bookings that are due for return
    const response = await fetch('/api/bookings/overdue');
    const overdueBookings = await response.json();
    
    for (const booking of overdueBookings) {
      await smsService.sendReturnReminder(
        booking.customer.mobile,
        booking.customer.name,
        booking.vehicle.vehicleNumber,
        formatDateTime(booking.expectedReturn)
      );
    }
    
    return { success: true, sent: overdueBookings.length };
  } catch (error) {
    console.error('Error sending return reminders:', error);
    return { success: false };
  }
};