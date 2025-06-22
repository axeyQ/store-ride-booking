'use client';
import { useState, useEffect } from 'react';
import { ThemedLayout, ThemedCard, ThemedButton, ThemedSelect, ThemedBadge } from '@/components/themed';
import { theme } from '@/lib/theme';

export default function CancelledBookingsPage() {
  const [cancelledBookings, setCancelledBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('month');
  const [summary, setSummary] = useState({});
  const [pagination, setPagination] = useState({});

  useEffect(() => {
    fetchCancelledBookings();
  }, [filter]);

  const fetchCancelledBookings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/bookings/cancelled?filter=${filter}`);
      const data = await response.json();
      
      if (data.success) {
        setCancelledBookings(data.bookings);
        setSummary(data.summary);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error fetching cancelled bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getReasonLabel = (reason) => {
    const reasonMap = {
      'customer_changed_mind': '🤔 Customer Changed Mind',
      'emergency': '🚨 Emergency',
      'vehicle_issue': '🔧 Vehicle Issue',
      'weather_conditions': '🌧️ Weather Conditions',
      'customer_no_show': '👻 Customer No-Show',
      'staff_error': '📋 Staff Error',
      'duplicate_booking': '📝 Duplicate Booking'
    };
    return reasonMap[reason] || reason;
  };

  if (loading) {
    return (
      <ThemedLayout>
        <div className="min-h-screen flex items-center justify-center">
          <ThemedCard>
            <div className="flex items-center space-x-3 p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
              <span className="text-white text-xl">Loading cancelled bookings...</span>
            </div>
          </ThemedCard>
        </div>
      </ThemedLayout>
    );
  }

  return (
    <ThemedLayout>
      <div className="container mx-auto px-6 py-8">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <h2 className={theme.typography.hero}>
            Cancelled <span className={theme.typography.gradient}>Bookings</span>
          </h2>
          <p className={`${theme.typography.subtitle} max-w-2xl mx-auto mt-4`}>
            Track and analyze booking cancellations
          </p>
        </div>

        {/* Filter and Summary */}
        <ThemedCard className="mb-8">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-white">Cancellation Overview</h3>
              <ThemedSelect
                value={filter}
                onValueChange={setFilter}
                options={[
                  { value: 'week', label: 'This Week' },
                  { value: 'month', label: 'This Month' },
                  { value: 'quarter', label: 'Last 3 Months' },
                  { value: 'all', label: 'All Time' }
                ]}
              />
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 rounded-lg bg-red-900/20 border border-red-700/30">
                <div className="text-2xl font-bold text-red-400 mb-2">
                  {summary.totalCancellations || 0}
                </div>
                <div className="text-red-200 text-sm">Total Cancelled</div>
              </div>
              
              <div className="text-center p-4 rounded-lg bg-green-900/20 border border-green-700/30">
                <div className="text-2xl font-bold text-green-400 mb-2">
                  {summary.withinWindow || 0}
                </div>
                <div className="text-green-200 text-sm">Within 2 Hours</div>
              </div>
              
              <div className="text-center p-4 rounded-lg bg-orange-900/20 border border-orange-700/30">
                <div className="text-2xl font-bold text-orange-400 mb-2">
                  {summary.manualOverride || 0}
                </div>
                <div className="text-orange-200 text-sm">Manual Override</div>
              </div>
              
              <div className="text-center p-4 rounded-lg bg-purple-900/20 border border-purple-700/30">
                <div className="text-2xl font-bold text-purple-400 mb-2">
                  {Math.round(summary.avgTimeToCancellation || 0)}h
                </div>
                <div className="text-purple-200 text-sm">Avg Time to Cancel</div>
              </div>
            </div>
          </div>
        </ThemedCard>

        {/* Bookings List */}
        {cancelledBookings.length === 0 ? (
          <ThemedCard className="text-center p-12">
            <div className="text-gray-400 text-6xl mb-4">📋</div>
            <h3 className="text-xl font-semibold text-white mb-2">No Cancelled Bookings</h3>
            <p className="text-gray-400">No cancelled bookings found for the selected period.</p>
          </ThemedCard>
        ) : (
          <div className="space-y-4">
            {cancelledBookings.map((booking) => (
              <ThemedCard key={booking._id} className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  {/* Booking Info */}
                  <div>
                    <div className="text-white font-mono text-lg mb-1">
                      {booking.bookingId}
                    </div>
                    <div className="text-gray-400 text-sm">
                      Created: {formatDateTime(booking.createdAt)}
                    </div>
                    <ThemedBadge variant="danger" className="mt-2">
                      🚫 Cancelled
                    </ThemedBadge>
                  </div>

                  {/* Customer & Vehicle */}
                  <div>
                    <div className="text-white font-medium mb-1">
                      {booking.customerId?.name || 'Unknown Customer'}
                    </div>
                    <div className="text-gray-400 text-sm">
                      📱 {booking.customerId?.phone || 'No phone'}
                    </div>
                    <div className="text-gray-400 text-sm mt-1">
                      🚗 {booking.vehicleId?.type} - {booking.vehicleId?.model}
                    </div>
                    <div className="text-gray-400 text-sm font-mono">
                      {booking.vehicleId?.plateNumber}
                    </div>
                  </div>

                  {/* Cancellation Details */}
                  <div>
                    <div className="text-cyan-400 font-medium mb-1">
                      {getReasonLabel(booking.cancellationDetails?.reason)}
                    </div>
                    <div className="text-gray-400 text-sm">
                      📅 {formatDateTime(booking.cancellationDetails?.cancelledAt)}
                    </div>
                    <div className="text-gray-400 text-sm">
                      👤 {booking.cancellationDetails?.cancelledBy || 'Unknown'}
                    </div>
                  </div>

                  {/* Status Indicators */}
                  <div className="space-y-2">
                    {booking.cancellationDetails?.withinWindow ? (
                      <div className="text-green-400 text-sm flex items-center">
                        ✅ Within 2 Hours
                      </div>
                    ) : (
                      <div className="text-orange-400 text-sm flex items-center">
                        ⚠️ Outside Window
                      </div>
                    )}
                    
                    {booking.cancellationDetails?.manualOverride && (
                      <div className="text-red-400 text-sm flex items-center">
                        🔐 Manual Override
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  <div>
                    {booking.cancellationDetails?.staffNotes && (
                      <div className="text-gray-400 text-xs bg-gray-800/50 rounded p-2">
                        📝 {booking.cancellationDetails.staffNotes}
                      </div>
                    )}
                    {booking.cancellationDetails?.customReason && (
                      <div className="text-gray-400 text-xs bg-gray-800/50 rounded p-2 mt-2">
                        💬 {booking.cancellationDetails.customReason}
                      </div>
                    )}
                  </div>
                </div>
              </ThemedCard>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex justify-center mt-8">
            <div className="flex items-center space-x-2">
              {pagination.hasPrev && (
                <ThemedButton variant="secondary" onClick={() => {}}>
                  Previous
                </ThemedButton>
              )}
              <span className="text-white">
                Page {pagination.currentPage} of {pagination.totalPages}
              </span>
              {pagination.hasNext && (
                <ThemedButton variant="secondary" onClick={() => {}}>
                  Next
                </ThemedButton>
              )}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex flex-col md:flex-row gap-4 mt-8">
          <ThemedButton
            variant="primary"
            onClick={fetchCancelledBookings}
            className="flex items-center justify-center gap-2"
          >
            🔄 Refresh
          </ThemedButton>
          <ThemedButton variant="secondary" onClick={() => window.location.href = '/active-bookings'}>
            🔄 Active Bookings
          </ThemedButton>
          <ThemedButton variant="secondary" onClick={() => window.location.href = '/admin'}>
            📊 Dashboard
          </ThemedButton>
        </div>
      </div>
    </ThemedLayout>
  );
}