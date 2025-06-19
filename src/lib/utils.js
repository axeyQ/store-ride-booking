import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"
export function generateBookingId() {
    const today = new Date();
    const dateStr = today.getFullYear().toString() + 
                   (today.getMonth() + 1).toString().padStart(2, '0') + 
                   today.getDate().toString().padStart(2, '0');
    const randomNum = Math.floor(Math.random() * 999).toString().padStart(3, '0');
    return `MRT-${dateStr}-${randomNum}`;
  }
  
  export function calculateAmount(hours, ratePerHour = 80) {
    return hours * ratePerHour;
  }
  
  export function formatCurrency(amount) {
    return `₹${amount.toLocaleString('en-IN')}`;
  }
  
  export function calculateDuration(startTime, endTime) {
    const diffMs = new Date(endTime) - new Date(startTime);
    return Math.ceil(diffMs / (1000 * 60 * 60)); // Convert to hours and round up
  }
  
  export function formatDateTime(date) {
    return new Date(date).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }



export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
