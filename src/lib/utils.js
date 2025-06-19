import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

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

// Theme utilities
export function getThemeColor(colorName, opacity = 1) {
  const colors = {
    cyan: `rgba(6, 182, 212, ${opacity})`,
    blue: `rgba(59, 130, 246, ${opacity})`,
    green: `rgba(34, 197, 94, ${opacity})`,
    orange: `rgba(249, 115, 22, ${opacity})`,
    purple: `rgba(168, 85, 247, ${opacity})`,
    red: `rgba(239, 68, 68, ${opacity})`
  };
  return colors[colorName] || colors.cyan;
}

export function getStatusColor(status) {
  const statusColors = {
    active: 'orange',
    completed: 'green',
    available: 'green',
    rented: 'orange',
    maintenance: 'red',
    cancelled: 'red'
  };
  return statusColors[status] || 'gray';
}