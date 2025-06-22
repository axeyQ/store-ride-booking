'use client';
import { useState, useEffect } from 'react';
import { ThemedCard, ThemedButton, ThemedBadge } from '@/components/themed';

export function CancelledBookingsList() {
  const [cancelledBookings, setCancelledBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('week'); // week, month, all

  useEffect(() => {
    fetchCancelledBookings();
  }, [dateFilter]);

  const fetchCancelledBookings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/bookings/cancelled?filter=${dateFilter}`);
      const data = await response.json();
      if (data.success) {
        setCancelledBookings(data.bookings);
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
      <ThemedCard>
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
          <span className="text-white text-xl ml-3">Loading cancelled bookings...</span>
        </div>
      </ThemedCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">🚫 Cancelled Bookings</h2>
        <div className="flex gap-2">
          {['week', 'month', 'all'].map((filter) => (
            <button
              key={filter}
              onClick={() => setDateFilter(filter)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                dateFilter === filter
                  ? 'bg-cyan-600 text-white'
                  : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
              }`}
            >
              {filter === 'week' ? 'This Week' : filter === 'month' ? 'This Month' : 'All Time'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <ThemedCard className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-400 mb-2">
              {cancelledBookings.length}
            </div>
            <div className="text-red-200 text-sm">Total Cancelled</div>
          </div>
        </ThemedCard>
        <ThemedCard className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400 mb-2">
              {cancelledBookings.filter(b => b.cancellationDetails?.withinWindow).length}
            </div>
            <div className="text-green-200 text-sm">Within 2 Hours</div>
          </div>
        </ThemedCard>
        <ThemedCard className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-400 mb-2">
              {cancelledBookings.filter(b => b.cancellationDetails?.manualOverride).length}
            </div>
            <div className="text-orange-200 text-sm">Manual Override</div>
          </div>
        </ThemedCard>
        <ThemedCard className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400 mb-2">
              {Math.round((cancelledBookings.length / (cancelledBookings.length + 50)) * 100)}%
            </div>
            <div className="text-purple-200 text-sm">Cancellation Rate</div>
          </div>
        </ThemedCard>
      </div>

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
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Booking Info */}
                <div>
                  <div className="text-white font-mono text-lg mb-1">
                    {booking.bookingId}
                  </div>
                  <div className="text-gray-400 text-sm">
                    {formatDateTime(booking.createdAt)}
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

                  {booking.cancellationDetails?.staffNotes && (
                    <div className="text-gray-400 text-xs bg-gray-800/50 rounded p-2 mt-2">
                      📝 {booking.cancellationDetails.staffNotes}
                    </div>
                  )}
                </div>
              </div>
            </ThemedCard>
          ))}
        </div>
      )}
    </div>
  );
}