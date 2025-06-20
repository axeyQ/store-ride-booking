'use client';
import { ThemedBadge } from '@/components/themed';

export function BlacklistStatusBadge({ customer, showText = true }) {
  if (!customer?.isBlacklisted || !customer?.blacklistDetails?.isActive) {
    return null;
  }

  const severity = customer.blacklistDetails.severity;
  
  const getConfig = (severity) => {
    switch (severity) {
      case 'warning':
        return {
          color: 'orange',
          icon: '⚠️',
          text: 'Warning'
        };
      case 'temporary_ban':
        return {
          color: 'red',
          icon: '⏳',
          text: 'Temp Ban'
        };
      case 'permanent_ban':
        return {
          color: 'red',
          icon: '🚫',
          text: 'Perm Ban'
        };
      default:
        return {
          color: 'gray',
          icon: '❓',
          text: 'Unknown'
        };
    }
  };

  const config = getConfig(severity);

  return (
    <ThemedBadge color={config.color} className="text-xs">
      {config.icon} {showText && config.text}
    </ThemedBadge>
  );
}