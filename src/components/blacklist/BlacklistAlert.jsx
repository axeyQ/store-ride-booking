'use client';
import { useState } from 'react';
import {
  ThemedCard,
  ThemedButton,
  ThemedBadge
} from '@/components/themed';
import { cn } from '@/lib/utils';

export function BlacklistAlert({ 
  type, // 'warning', 'temporary_ban', 'permanent_ban'
  customer, 
  blacklistInfo, 
  onContinue, 
  onCancel,
  showActions = true 
}) {
  const [acknowledged, setAcknowledged] = useState(false);

  const getAlertConfig = (type) => {
    switch (type) {
      case 'warning':
        return {
          title: '⚠️ Customer Warning',
          bgClass: 'bg-orange-900/20 border-orange-700/50',
          titleClass: 'text-orange-400',
          textClass: 'text-orange-300',
          canContinue: true,
          severity: 'Warning'
        };
      case 'temporary_ban':
        return {
          title: '⏳ Customer Temporarily Banned',
          bgClass: 'bg-red-900/20 border-red-700/50',
          titleClass: 'text-red-400',
          textClass: 'text-red-300',
          canContinue: false,
          severity: 'Temporary Ban'
        };
      case 'permanent_ban':
        return {
          title: '🚫 Customer Permanently Banned',
          bgClass: 'bg-red-900/30 border-red-600/50',
          titleClass: 'text-red-500',
          textClass: 'text-red-300',
          canContinue: false,
          severity: 'Permanent Ban'
        };
      default:
        return {
          title: '❓ Unknown Status',
          bgClass: 'bg-gray-900/20 border-gray-700/50',
          titleClass: 'text-gray-400',
          textClass: 'text-gray-300',
          canContinue: false,
          severity: 'Unknown'
        };
    }
  };

  const config = getAlertConfig(type);
  
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <ThemedCard className={cn(config.bgClass, "border-2")}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className={cn("text-xl font-bold", config.titleClass)}>
            {config.title}
          </h3>
          <ThemedBadge 
            color={type === 'warning' ? 'orange' : 'red'}
            className="text-sm px-3 py-1"
          >
            {config.severity}
          </ThemedBadge>
        </div>

        {/* Customer Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <span className="text-gray-400 text-sm">Customer:</span>
            <p className="text-white font-semibold text-lg">{customer?.name}</p>
            <p className="text-gray-300">{customer?.phone}</p>
            <p className="text-gray-400 font-mono text-sm">{customer?.driverLicense}</p>
          </div>
          <div>
            <span className="text-gray-400 text-sm">Previous Activity:</span>
            <p className="text-white">{customer?.totalBookings || 0} total bookings</p>
            <p className="text-gray-300">
              Last visit: {customer?.lastVisit ? formatDate(customer.lastVisit) : 'Never'}
            </p>
          </div>
        </div>

        {/* Blacklist Details */}
        <div className="space-y-4 mb-6">
          <div>
            <span className="text-gray-400 text-sm">Reason for {config.severity}:</span>
            <p className={cn("font-medium text-lg", config.textClass)}>
              {blacklistInfo?.reason}
            </p>
            {blacklistInfo?.customReason && (
              <p className="text-gray-300 italic mt-1">
                "{blacklistInfo.customReason}"
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-gray-400 text-sm">Date Applied:</span>
              <p className="text-white">
                {blacklistInfo?.blacklistedAt ? formatDate(blacklistInfo.blacklistedAt) : 'Unknown'}
              </p>
            </div>
            <div>
              <span className="text-gray-400 text-sm">Applied By:</span>
              <p className="text-white">{blacklistInfo?.blacklistedBy || 'Unknown'}</p>
            </div>
          </div>

          {/* Temporary Ban specific info */}
          {type === 'temporary_ban' && blacklistInfo?.unblacklistAt && (
            <div className="bg-red-800/30 rounded-lg p-4">
              <span className="text-red-300 text-sm">Ban expires on:</span>
              <p className="text-red-200 font-semibold text-lg">
                {formatDate(blacklistInfo.unblacklistAt)}
              </p>
              {blacklistInfo.daysRemaining && (
                <p className="text-red-300 text-sm">
                  ({blacklistInfo.daysRemaining} day{blacklistInfo.daysRemaining !== 1 ? 's' : ''} remaining)
                </p>
              )}
            </div>
          )}

          {/* Internal Notes */}
          {blacklistInfo?.internalNotes && (
            <div>
              <span className="text-gray-400 text-sm">Internal Notes:</span>
              <p className="text-gray-300 bg-gray-800/50 rounded p-3 mt-1">
                {blacklistInfo.internalNotes}
              </p>
            </div>
          )}
        </div>

        {/* Warning Message */}
        <div className={cn("rounded-lg p-4 mb-6", 
          type === 'warning' ? 'bg-orange-800/30' : 'bg-red-800/30'
        )}>
          <p className={cn("font-medium", config.textClass)}>
            {blacklistInfo?.message}
          </p>
        </div>

        {/* Acknowledgment for warnings */}
        {type === 'warning' && showActions && (
          <div className="mb-6">
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                className="w-5 h-5 text-orange-600 border-2 border-gray-300 rounded focus:ring-orange-500 mt-1"
              />
              <div className="text-orange-200">
                <span className="font-medium">I acknowledge this warning</span>
                <p className="text-sm text-orange-300 mt-1">
                  I understand that this customer has a warning on their account and will monitor this booking carefully, 
                  ensuring all safety protocols are followed and equipment is thoroughly checked.
                </p>
              </div>
            </label>
          </div>
        )}

        {/* Action Buttons */}
        {showActions && (
          <div className="flex gap-4">
            {onCancel && (
              <ThemedButton
                variant="secondary"
                onClick={onCancel}
                className="flex-1"
              >
                Cancel Booking
              </ThemedButton>
            )}
            {config.canContinue && onContinue && (
              <ThemedButton
                variant={type === 'warning' ? 'primary' : 'danger'}
                onClick={onContinue}
                disabled={type === 'warning' && !acknowledged}
                className={cn(
                  "flex-1",
                  type === 'warning' && !acknowledged && "opacity-50 cursor-not-allowed"
                )}
              >
                {type === 'warning' ? 'Continue with Caution' : 'Continue Anyway'}
              </ThemedButton>
            )}
            {!config.canContinue && (
              <div className="flex-1 text-center">
                <p className={cn("text-sm", config.textClass)}>
                  Booking cannot proceed. Customer must be unblacklisted by management.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </ThemedCard>
  );
}