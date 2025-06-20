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

export function UnblacklistModal({ 
  isOpen, 
  onClose, 
  customer, 
  onUnblacklist 
}) {
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    reason: '',
    customReason: '',
    internalNotes: ''
  });

  const unblacklistReasons = [
    { value: 'issue_resolved', label: '✅ Issue Resolved' },
    { value: 'payment_completed', label: '💳 Payment Completed' },
    { value: 'apology_accepted', label: '🤝 Apology Accepted' },
    { value: 'administrative_error', label: '📋 Administrative Error' },
    { value: 'good_behavior', label: '👍 Demonstrated Good Behavior' },
    { value: 'management_decision', label: '👔 Management Decision' },
    { value: 'customer_appeal', label: '📝 Customer Appeal Approved' },
    { value: 'other', label: '❓ Other' }
  ];

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getReasonLabel = (reason) => {
    const reasonMap = {
      'vehicle_damage': '🚗 Vehicle Damage',
      'late_return': '⏰ Late Return',
      'non_payment': '💳 Non-Payment',
      'behavioral_issues': '😠 Behavioral Issues',
      'violation_of_terms': '📋 Terms Violation',
      'theft_attempt': '🚨 Theft Attempt',
      'fake_documents': '📄 Fake Documents',
      'reckless_driving': '🏍️ Reckless Driving',
      'other': '❓ Other'
    };
    return reasonMap[reason] || reason;
  };

  const getSeverityLabel = (severity) => {
    const severityMap = {
      'warning': '⚠️ Warning',
      'temporary_ban': '⏳ Temporary Ban',
      'permanent_ban': '🚫 Permanent Ban'
    };
    return severityMap[severity] || severity;
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'warning': return 'text-orange-400';
      case 'temporary_ban': return 'text-red-400';
      case 'permanent_ban': return 'text-red-500';
      default: return 'text-gray-400';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.reason) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/customers/${customer._id}/unblacklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          reason: formData.reason === 'other' ? formData.customReason : formData.reason,
          performedBy: 'Staff User', // TODO: Get from auth context
          ipAddress: null // TODO: Get client IP
        })
      });

      const data = await response.json();
      if (data.success) {
        onUnblacklist(data.customer);
        onClose();
        // Reset form
        setFormData({
          reason: '',
          customReason: '',
          internalNotes: ''
        });
      } else {
        alert('Error unblacklisting customer: ' + data.error);
      }
    } catch (error) {
      console.error('Error unblacklisting customer:', error);
      alert('Error unblacklisting customer. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const blacklistDetails = customer?.blacklistDetails;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <ThemedCard className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Unblacklist Customer</h2>
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

          {/* Current Blacklist Status */}
          {blacklistDetails && (
            <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-6 mb-6">
              <h3 className="text-red-400 font-semibold mb-4">Current Blacklist Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <span className="text-gray-400 text-sm">Reason:</span>
                    <p className="text-white font-medium">
                      {getReasonLabel(blacklistDetails.reason)}
                    </p>
                    {blacklistDetails.customReason && (
                      <p className="text-gray-300 text-sm italic">
                        "{blacklistDetails.customReason}"
                      </p>
                    )}
                  </div>
                  <div>
                    <span className="text-gray-400 text-sm">Severity:</span>
                    <p className={`font-medium ${getSeverityColor(blacklistDetails.severity)}`}>
                      {getSeverityLabel(blacklistDetails.severity)}
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <span className="text-gray-400 text-sm">Blacklisted On:</span>
                    <p className="text-white">
                      {formatDate(blacklistDetails.blacklistedAt)}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-400 text-sm">Blacklisted By:</span>
                    <p className="text-white">{blacklistDetails.blacklistedBy}</p>
                  </div>
                  {blacklistDetails.unblacklistAt && (
                    <div>
                      <span className="text-gray-400 text-sm">
                        {blacklistDetails.severity === 'temporary_ban' ? 'Auto-Unblacklist:' : 'Expires:'}
                      </span>
                      <p className="text-orange-400">
                        {formatDate(blacklistDetails.unblacklistAt)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              {blacklistDetails.internalNotes && (
                <div className="mt-4 pt-4 border-t border-red-700/30">
                  <span className="text-gray-400 text-sm">Internal Notes:</span>
                  <p className="text-gray-300 mt-1">{blacklistDetails.internalNotes}</p>
                </div>
              )}
            </div>
          )}

          {/* Success Message */}
          <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3">
              <span className="text-green-400 text-2xl">✅</span>
              <div>
                <h3 className="text-green-400 font-semibold">Unblacklist Customer</h3>
                <p className="text-green-300 text-sm">
                  This customer will be able to make new bookings after unblacklisting. 
                  This action will be logged and the customer will be notified.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Unblacklist Reason */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ThemedSelect
                label="Reason for Unblacklisting *"
                value={formData.reason}
                onValueChange={(value) => setFormData(prev => ({ ...prev, reason: value }))}
                options={unblacklistReasons}
                placeholder="Select reason for unblacklisting"
              />

              {/* Custom Reason */}
              {formData.reason === 'other' && (
                <ThemedInput
                  label="Custom Reason *"
                  value={formData.customReason}
                  onChange={(e) => setFormData(prev => ({ ...prev, customReason: e.target.value }))}
                  placeholder="Specify the reason for unblacklisting"
                  required
                />
              )}
            </div>

            {/* Internal Notes */}
            <div>
              <label className="block text-lg font-semibold text-white mb-2">
                Internal Notes
              </label>
              <textarea
                value={formData.internalNotes}
                onChange={(e) => setFormData(prev => ({ ...prev, internalNotes: e.target.value }))}
                placeholder="Add internal notes about this unblacklist decision..."
                className={`${theme.components.input.base} h-24 resize-none`}
                rows="3"
              />
            </div>

            {/* Summary */}
            {formData.reason && (
              <div className="bg-green-800/30 rounded-lg p-4">
                <h4 className="text-green-300 font-semibold mb-3">Unblacklist Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Customer:</span>
                    <span className="text-white">{customer?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Reason:</span>
                    <span className="text-white">
                      {formData.reason === 'other' 
                        ? formData.customReason 
                        : unblacklistReasons.find(r => r.value === formData.reason)?.label
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Status After:</span>
                    <span className="text-green-400 font-semibold">✅ Active Customer</span>
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
                variant="success"
                disabled={!formData.reason || submitting}
                className={cn(
                  "flex-1",
                  (!formData.reason || submitting) && "opacity-50 cursor-not-allowed"
                )}
              >
                {submitting ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                    Unblacklisting...
                  </div>
                ) : (
                  '✅ Unblacklist Customer'
                )}
              </ThemedButton>
            </div>
          </form>
        </div>
      </ThemedCard>
    </div>
  );
}