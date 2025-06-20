'use client';
import { useState } from 'react';
import {
  ThemedCard,
  ThemedButton,
  ThemedInput,
  ThemedSelect,
  ThemedBadge
} from '@/components/themed';
import { theme } from '@/lib/theme';
import { cn } from '@/lib/utils';

export function BlacklistModal({ 
  isOpen, 
  onClose, 
  customer, 
  onBlacklist,
  relatedBookingId = null 
}) {
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    reason: '',
    severity: '',
    customReason: '',
    duration: 7, // Default 7 days for temporary ban
    internalNotes: '',
    evidencePhotos: []
  });

  const blacklistReasons = [
    { value: 'vehicle_damage', label: '🚗 Vehicle Damage' },
    { value: 'late_return', label: '⏰ Late Return' },
    { value: 'non_payment', label: '💳 Non-Payment' },
    { value: 'behavioral_issues', label: '😠 Behavioral Issues' },
    { value: 'violation_of_terms', label: '📋 Terms Violation' },
    { value: 'theft_attempt', label: '🚨 Theft Attempt' },
    { value: 'fake_documents', label: '📄 Fake Documents' },
    { value: 'reckless_driving', label: '🏍️ Reckless Driving' },
    { value: 'other', label: '❓ Other' }
  ];

  const severityLevels = [
    { 
      value: 'warning', 
      label: '⚠️ Warning',
      description: 'Customer can still book but will see warnings',
      color: 'orange'
    },
    { 
      value: 'temporary_ban', 
      label: '⏳ Temporary Ban',
      description: 'Customer blocked for specified duration',
      color: 'red'
    },
    { 
      value: 'permanent_ban', 
      label: '🚫 Permanent Ban',
      description: 'Customer permanently blocked from service',
      color: 'red'
    }
  ];

  const durationOptions = [
    { value: 1, label: '1 Day' },
    { value: 3, label: '3 Days' },
    { value: 7, label: '1 Week' },
    { value: 14, label: '2 Weeks' },
    { value: 30, label: '1 Month' },
    { value: 90, label: '3 Months' },
    { value: 365, label: '1 Year' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.reason || !formData.severity) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/customers/${customer._id}/blacklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          performedBy: 'Staff User', // TODO: Get from auth context
          relatedBookingId,
          ipAddress: null // TODO: Get client IP
        })
      });

      const data = await response.json();
      if (data.success) {
        onBlacklist(data.customer);
        onClose();
        // Reset form
        setFormData({
          reason: '',
          severity: '',
          customReason: '',
          duration: 7,
          internalNotes: '',
          evidencePhotos: []
        });
      } else {
        alert('Error blacklisting customer: ' + data.error);
      }
    } catch (error) {
      console.error('Error blacklisting customer:', error);
      alert('Error blacklisting customer. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <ThemedCard className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Blacklist Customer</h2>
              <p className="text-gray-400">
                {customer?.name} • {customer?.phone}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Warning */}
          <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3">
              <span className="text-red-400 text-2xl">⚠️</span>
              <div>
                <h3 className="text-red-400 font-semibold">Important Warning</h3>
                <p className="text-red-300 text-sm">
                  Blacklisting will prevent this customer from making new bookings. 
                  This action will be logged and the customer will be notified.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Reason */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ThemedSelect
                label="Blacklist Reason *"
                value={formData.reason}
                onValueChange={(value) => setFormData(prev => ({ ...prev, reason: value }))}
                options={blacklistReasons}
                placeholder="Select reason for blacklisting"
              />

              {/* Custom Reason */}
              {formData.reason === 'other' && (
                <ThemedInput
                  label="Custom Reason *"
                  value={formData.customReason}
                  onChange={(e) => setFormData(prev => ({ ...prev, customReason: e.target.value }))}
                  placeholder="Specify the reason"
                  required
                />
              )}
            </div>

            {/* Severity */}
            <div>
              <label className="block text-lg font-semibold text-white mb-4">
                Severity Level *
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {severityLevels.map((level) => (
                  <ThemedCard
                    key={level.value}
                    className={cn(
                      "cursor-pointer transition-all",
                      formData.severity === level.value
                        ? 'border-red-500 bg-red-500/10'
                        : 'border-gray-600 hover:border-gray-500'
                    )}
                    onClick={() => setFormData(prev => ({ ...prev, severity: level.value }))}
                  >
                    <div className="p-4 text-center">
                      <h4 className="font-semibold text-white mb-2">{level.label}</h4>
                      <p className="text-sm text-gray-400">{level.description}</p>
                      {formData.severity === level.value && (
                        <ThemedBadge color="red" className="mt-2">Selected</ThemedBadge>
                      )}
                    </div>
                  </ThemedCard>
                ))}
              </div>
            </div>

            {/* Duration for Temporary Ban */}
            {formData.severity === 'temporary_ban' && (
              <ThemedSelect
                label="Ban Duration *"
                value={formData.duration.toString()}
                onValueChange={(value) => setFormData(prev => ({ ...prev, duration: parseInt(value) }))}
                options={durationOptions}
              />
            )}

            {/* Internal Notes */}
            <div>
              <label className="block text-lg font-semibold text-white mb-2">
                Internal Notes
              </label>
              <textarea
                value={formData.internalNotes}
                onChange={(e) => setFormData(prev => ({ ...prev, internalNotes: e.target.value }))}
                placeholder="Add internal notes about this blacklist decision..."
                className={`${theme.components.input.base} h-24 resize-none`}
                rows="3"
              />
            </div>

            {/* Evidence Photos Section */}
            <div>
              <label className="block text-lg font-semibold text-white mb-2">
                Evidence Photos (Optional)
              </label>
              <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-gray-400 mb-2">Upload evidence photos</p>
                <p className="text-gray-500 text-sm">Vehicle damage, violations, etc. (Max 5 photos)</p>
                <ThemedButton type="button" variant="secondary" className="mt-4">
                  Choose Files
                </ThemedButton>
              </div>
            </div>

            {/* Related Booking */}
            {relatedBookingId && (
              <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
                <h4 className="text-blue-300 font-semibold mb-2">Related Booking</h4>
                <p className="text-blue-200">This blacklist will be linked to booking: {relatedBookingId}</p>
              </div>
            )}

            {/* Summary */}
            {formData.reason && formData.severity && (
              <div className="bg-gray-800/50 rounded-lg p-4">
                <h4 className="text-white font-semibold mb-3">Blacklist Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Customer:</span>
                    <span className="text-white">{customer?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Reason:</span>
                    <span className="text-white">
                      {blacklistReasons.find(r => r.value === formData.reason)?.label}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Severity:</span>
                    <span className="text-white">
                      {severityLevels.find(s => s.value === formData.severity)?.label}
                    </span>
                  </div>
                  {formData.severity === 'temporary_ban' && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Duration:</span>
                      <span className="text-white">
                        {durationOptions.find(d => d.value === formData.duration)?.label}
                      </span>
                    </div>
                  )}
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
                disabled={!formData.reason || !formData.severity || submitting}
                className={cn(
                  "flex-1",
                  (!formData.reason || !formData.severity || submitting) && "opacity-50 cursor-not-allowed"
                )}
              >
                {submitting ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                    Blacklisting...
                  </div>
                ) : (
                  '🚫 Blacklist Customer'
                )}
              </ThemedButton>
            </div>
          </form>
        </div>
      </ThemedCard>
    </div>
  );
}