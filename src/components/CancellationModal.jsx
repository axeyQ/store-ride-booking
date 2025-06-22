'use client';
import { useState } from 'react';
import {
  ThemedCard,
  ThemedButton,
  ThemedSelect,
  ThemedInput
} from '@/components/themed';
import { cn } from '@/lib/utils';

export function CancellationModal({
  isOpen,
  onClose,
  booking,
  onCancel
}) {
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    reason: '',
    customReason: '',
    staffNotes: '',
    manualOverride: false
  });

  // Check if booking is within 2-hour window
  const isWithinCancellationWindow = () => {
    if (!booking?.createdAt) return false;
    const bookingTime = new Date(booking.createdAt);
    const twoHoursLater = new Date(bookingTime.getTime() + (2 * 60 * 60 * 1000));
    return new Date() <= twoHoursLater;
  };

  // Calculate remaining time in 2-hour window
  const getRemainingTime = () => {
    if (!booking?.createdAt) return null;
    const bookingTime = new Date(booking.createdAt);
    const twoHoursLater = new Date(bookingTime.getTime() + (2 * 60 * 60 * 1000));
    const now = new Date();
    
    if (now > twoHoursLater) return null;
    
    const remainingMs = twoHoursLater - now;
    const remainingMinutes = Math.ceil(remainingMs / (1000 * 60));
    
    if (remainingMinutes > 60) {
      const hours = Math.floor(remainingMinutes / 60);
      const mins = remainingMinutes % 60;
      return `${hours}h ${mins}m`;
    }
    return `${remainingMinutes}m`;
  };

  const cancellationReasons = [
    { value: 'customer_changed_mind', label: '🤔 Customer Changed Mind' },
    { value: 'emergency', label: '🚨 Emergency' },
    { value: 'vehicle_issue', label: '🔧 Vehicle Issue Discovered' },
    { value: 'weather_conditions', label: '🌧️ Weather Conditions' },
    { value: 'customer_no_show', label: '👻 Customer No-Show' },
    { value: 'staff_error', label: '📋 Staff Booking Error' },
    { value: 'duplicate_booking', label: '📝 Duplicate Booking' },
    { value: 'other', label: '❓ Other Reason' }
  ];

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.reason) return;
  
    // ✅ NEW: Additional validation
    if (!booking || booking.status !== 'active') {
      alert('This booking is no longer active and cannot be cancelled.');
      onClose();
      return;
    }
  
    // Check if manual override is needed
    const withinWindow = isWithinCancellationWindow();
    if (!withinWindow && !formData.manualOverride) {
      alert('This booking is outside the 2-hour cancellation window. Please check "Manual Override" to proceed.');
      return;
    }
  
    setSubmitting(true);
    try {
      const response = await fetch(`/api/bookings/cancel/${booking._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          reason: formData.reason === 'other' ? formData.customReason : formData.reason,
          cancelledBy: 'Staff User', // TODO: Get from auth context
          withinWindow,
          manualOverride: formData.manualOverride
        })
      });
  
      const data = await response.json();
      if (data.success) {
        onCancel(data.booking);
        onClose();
        // Reset form
        setFormData({
          reason: '',
          customReason: '',
          staffNotes: '',
          manualOverride: false
        });
      } else {
        alert('Error cancelling booking: ' + data.error);
      }
    } catch (error) {
      console.error('Error cancelling booking:', error);
      alert('Error cancelling booking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const withinWindow = isWithinCancellationWindow();
  const remainingTime = getRemainingTime();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <ThemedCard className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">
              🚫 Cancel Booking
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Booking Details */}
          <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
            <h3 className="text-white font-semibold mb-3">Booking Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Booking ID:</span>
                <p className="text-white font-mono">{booking?.bookingId}</p>
              </div>
              <div>
                <span className="text-gray-400">Customer:</span>
                <p className="text-white">{booking?.customerId?.name}</p>
              </div>
              <div>
                <span className="text-gray-400">Vehicle:</span>
                <p className="text-white">{booking?.vehicleId?.type} - {booking?.vehicleId?.model}</p>
              </div>
              <div>
                <span className="text-gray-400">Created:</span>
                <p className="text-white">{formatDateTime(booking?.createdAt)}</p>
              </div>
            </div>
          </div>

          {/* Cancellation Window Status */}
          <div className={`rounded-lg p-4 mb-6 ${
            withinWindow 
              ? 'bg-green-800/30 border border-green-700/50' 
              : 'bg-orange-800/30 border border-orange-700/50'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <h4 className={`font-semibold ${withinWindow ? 'text-green-200' : 'text-orange-200'}`}>
                  {withinWindow ? '✅ Within Cancellation Window' : '⚠️ Outside Cancellation Window'}
                </h4>
                <p className={`text-sm ${withinWindow ? 'text-green-300' : 'text-orange-300'}`}>
                  {withinWindow 
                    ? `Time remaining: ${remainingTime}` 
                    : 'Manual override required for cancellation'
                  }
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Cancellation Reason */}
            <ThemedSelect
              label="Cancellation Reason *"
              value={formData.reason}
              onValueChange={(value) => setFormData({ ...formData, reason: value })}
              options={cancellationReasons}
              required
            />

            {/* Custom Reason */}
            {formData.reason === 'other' && (
              <ThemedInput
                label="Custom Reason *"
                value={formData.customReason}
                onChange={(e) => setFormData({ ...formData, customReason: e.target.value })}
                placeholder="Please specify the reason for cancellation"
                required
              />
            )}

            {/* Manual Override Checkbox */}
            {!withinWindow && (
              <div className="bg-red-800/30 border border-red-700/50 rounded-lg p-4">
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.manualOverride}
                    onChange={(e) => setFormData({ ...formData, manualOverride: e.target.checked })}
                    className="w-5 h-5 text-red-600 border-2 border-gray-300 rounded focus:ring-red-500 mt-1"
                  />
                  <div className="text-red-200">
                    <span className="font-medium">Manual Override Required</span>
                    <p className="text-sm text-red-300 mt-1">
                      This booking is outside the 2-hour cancellation window. 
                      Check this box to proceed with cancellation.
                    </p>
                  </div>
                </label>
              </div>
            )}

            {/* Staff Notes */}
            <div>
              <label className="block text-white font-medium mb-2">
                Staff Notes
              </label>
              <textarea
                value={formData.staffNotes}
                onChange={(e) => setFormData({ ...formData, staffNotes: e.target.value })}
                placeholder="Additional notes about this cancellation (optional)"
                className="w-full bg-gray-800/50 border border-gray-600 text-white placeholder:text-gray-400 p-3 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                rows={3}
              />
            </div>

            {/* Important Reminders */}
            <div className="bg-blue-800/30 border border-blue-700/50 rounded-lg p-4">
              <h4 className="text-blue-200 font-semibold mb-2">📋 Staff Reminders</h4>
              <ul className="text-sm text-blue-300 space-y-1">
                <li>• Return customer's Aadhar card if collected</li>
                <li>• Manually return security deposit if taken</li>
                <li>• Vehicle will automatically become available for new bookings</li>
                <li>• This action cannot be undone</li>
              </ul>
            </div>

            {/* Summary */}
            {formData.reason && (
              <div className="bg-gray-800/50 rounded-lg p-4">
                <h4 className="text-white font-semibold mb-3">Cancellation Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Reason:</span>
                    <span className="text-white">
                      {formData.reason === 'other' 
                        ? formData.customReason 
                        : cancellationReasons.find(r => r.value === formData.reason)?.label
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Status After:</span>
                    <span className="text-red-400 font-semibold">🚫 Cancelled</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Vehicle Status:</span>
                    <span className="text-green-400 font-semibold">✅ Available</span>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <ThemedButton
                type="button"
                variant="secondary"
                onClick={onClose}
                className="flex-1"
              >
                Cancel
              </ThemedButton>
              <ThemedButton
                type="submit"
                variant="danger"
                disabled={!formData.reason || (!withinWindow && !formData.manualOverride) || submitting}
                className={cn(
                  "flex-1",
                  (!formData.reason || (!withinWindow && !formData.manualOverride) || submitting) && "opacity-50 cursor-not-allowed"
                )}
              >
                {submitting ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                    Cancelling...
                  </div>
                ) : (
                  '🚫 Cancel Booking'
                )}
              </ThemedButton>
            </div>
          </form>
        </div>
      </ThemedCard>
    </div>
  );
}