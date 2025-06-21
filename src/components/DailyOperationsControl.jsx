'use client';
import { useState, useEffect } from 'react';
import {
  ThemedCard,
  ThemedButton,
  ThemedInput,
  ThemedBadge
} from '@/components/themed';
import { theme } from '@/lib/theme';
import { cn } from '@/lib/utils';

export function DayOperationsControl({ onStatusChange }) {
  const [operation, setOperation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [showModal, setShowModal] = useState(null);
  const [staffName, setStaffName] = useState('');
  const [notes, setNotes] = useState('');
  const [reason, setReason] = useState('');

  // Fetch today's operation status
  const fetchTodaysOperation = async () => {
    try {
      const response = await fetch('/api/daily-operations?range=today');
      const data = await response.json();
      if (data.success) {
        setOperation(data.operation);
        onStatusChange?.(data.operation);
      }
    } catch (error) {
      console.error('Error fetching daily operation:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodaysOperation();
    // Refresh every 30 seconds
    const interval = setInterval(fetchTodaysOperation, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleStartDay = async () => {
    if (!staffName.trim()) {
      alert('Please enter your name');
      return;
    }

    setActionLoading('starting');
    try {
      const response = await fetch('/api/daily-operations/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffName: staffName.trim(), notes: notes.trim() })
      });

      const data = await response.json();
      if (data.success) {
        setOperation(data.operation);
        setShowModal(null);
        setStaffName('');
        setNotes('');
        onStatusChange?.(data.operation);
        alert('Day started successfully! 🌅');
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error starting day:', error);
      alert('Error starting day. Please try again.');
    } finally {
      setActionLoading('');
    }
  };

  const handleEndDay = async () => {
    if (!staffName.trim()) {
      alert('Please enter your name');
      return;
    }

    setActionLoading('ending');
    try {
      const response = await fetch('/api/daily-operations/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffName: staffName.trim(), notes: notes.trim() })
      });

      const data = await response.json();
      if (data.success) {
        setOperation(data.operation);
        setShowModal(null);
        setStaffName('');
        setNotes('');
        onStatusChange?.(data.operation);
        
        // Show daily summary
        alert(`Day ended successfully! 🌙\n\nDaily Summary:\n• Revenue: ₹${data.summary.totalRevenue.toLocaleString('en-IN')}\n• Bookings: ${data.summary.totalBookings}\n• Operating Hours: ${data.summary.operatingHours}h\n• Revenue/Hour: ₹${data.summary.revenuePerHour}`);
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error ending day:', error);
      alert('Error ending day. Please try again.');
    } finally {
      setActionLoading('');
    }
  };

  const handleRestartDay = async () => {
    if (!staffName.trim() || !reason.trim()) {
      alert('Please enter your name and reason for restart');
      return;
    }

    setActionLoading('restarting');
    try {
      const response = await fetch('/api/daily-operations/restart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          staffName: staffName.trim(), 
          reason: reason.trim() 
        })
      });

      const data = await response.json();
      if (data.success) {
        setOperation(data.operation);
        setShowModal(null);
        setStaffName('');
        setReason('');
        onStatusChange?.(data.operation);
        alert('Day restarted successfully! 🔄');
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error restarting day:', error);
      alert('Error restarting day. Please try again.');
    } finally {
      setActionLoading('');
    }
  };

  const getStatusConfig = () => {
    if (!operation) return { color: 'gray', icon: '❓', text: 'Loading...' };
    
    switch (operation.status) {
      case 'not_started':
        return { color: 'orange', icon: '🌅', text: 'Day Not Started' };
      case 'in_progress':
        return { color: 'green', icon: '🏃', text: 'Day In Progress' };
      case 'ended':
        return { color: 'blue', icon: '🌙', text: 'Day Ended' };
      default:
        return { color: 'gray', icon: '❓', text: 'Unknown Status' };
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'Not set';
    return new Date(timeString).toLocaleString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <ThemedCard title="📅 Day Operations">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
          <span className="ml-3 text-gray-400">Loading day status...</span>
        </div>
      </ThemedCard>
    );
  }

  const statusConfig = getStatusConfig();

  return (
    <>
      <ThemedCard 
        title="📅 Day Operations" 
        description={operation ? formatDate(operation.date) : 'Today'}
      >
        <div className="space-y-6">
          {/* Current Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-2xl">{statusConfig.icon}</div>
              <div>
                <ThemedBadge color={statusConfig.color} className="text-sm">
                  {statusConfig.text}
                </ThemedBadge>
                {operation?.restartCount > 0 && (
                  <div className="text-xs text-orange-400 mt-1">
                    Restarted {operation.restartCount} time(s)
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Time Details */}
          {operation && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-400">Start Time</div>
                <div className="text-white font-medium">
                  {formatTime(operation.startTime)}
                </div>
                {operation.startedBy && (
                  <div className="text-xs text-gray-500">by {operation.startedBy}</div>
                )}
              </div>
              <div>
                <div className="text-gray-400">End Time</div>
                <div className="text-white font-medium">
                  {formatTime(operation.endTime)}
                </div>
                {operation.endedBy && (
                  <div className="text-xs text-gray-500">
                    by {operation.endedBy}
                    {operation.autoEnded && ' (Auto)'}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Operating Hours */}
          {operation?.dailySummary?.operatingHours > 0 && (
            <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-3">
              <div className="text-sm text-blue-200">Operating Hours Today</div>
              <div className="text-xl font-bold text-blue-400">
                {operation.dailySummary.operatingHours}h
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {operation?.status === 'not_started' && (
              <ThemedButton
                variant="success"
                onClick={() => setShowModal('start')}
                disabled={actionLoading === 'starting'}
                className="w-full"
              >
                {actionLoading === 'starting' ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Starting...
                  </div>
                ) : (
                  <>🌅 Start Day</>
                )}
              </ThemedButton>
            )}

            {operation?.status === 'in_progress' && (
              <ThemedButton
                variant="danger"
                onClick={() => setShowModal('end')}
                disabled={actionLoading === 'ending'}
                className="w-full"
              >
                {actionLoading === 'ending' ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Ending...
                  </div>
                ) : (
                  <>🌙 End Day</>
                )}
              </ThemedButton>
            )}

            {operation?.status === 'ended' && (
              <ThemedButton
                variant="primary"
                onClick={() => setShowModal('restart')}
                disabled={actionLoading === 'restarting'}
                className="w-full"
              >
                {actionLoading === 'restarting' ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Restarting...
                  </div>
                ) : (
                  <>🔄 Restart Day</>
                )}
              </ThemedButton>
            )}
          </div>

          {/* Quick Stats */}
          {operation?.dailySummary && operation.status === 'ended' && (
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
              <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                📊 Daily Summary
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="text-center">
                  <div className="text-green-400 font-bold text-lg">
                    ₹{operation.dailySummary.totalRevenue.toLocaleString('en-IN')}
                  </div>
                  <div className="text-gray-400">Revenue</div>
                </div>
                <div className="text-center">
                  <div className="text-blue-400 font-bold text-lg">
                    {operation.dailySummary.totalBookings}
                  </div>
                  <div className="text-gray-400">Bookings</div>
                </div>
                <div className="text-center">
                  <div className="text-purple-400 font-bold text-lg">
                    {operation.dailySummary.vehiclesRented}
                  </div>
                  <div className="text-gray-400">Vehicles</div>
                </div>
                <div className="text-center">
                  <div className="text-orange-400 font-bold text-lg">
                    ₹{operation.dailySummary.revenuePerHour}
                  </div>
                  <div className="text-gray-400">Per Hour</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </ThemedCard>

      {/* Confirmation Modals */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-white mb-4">
              {showModal === 'start' && '🌅 Start Day'}
              {showModal === 'end' && '🌙 End Day'}
              {showModal === 'restart' && '🔄 Restart Day'}
            </h3>
            
            <div className="space-y-4">
              <ThemedInput
                label="Your Name"
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                placeholder="Enter your name"
                required
              />
              
              {showModal === 'restart' ? (
                <ThemedInput
                  label="Reason for Restart"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Why are you restarting the day?"
                  required
                />
              ) : (
                <ThemedInput
                  label="Notes (Optional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional notes..."
                />
              )}

              {showModal === 'end' && (
                <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-3">
                  <p className="text-blue-200 text-sm">
                    📊 Ending the day will calculate and save your daily summary including revenue, bookings, and operating hours.
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <ThemedButton
                variant="secondary"
                onClick={() => {
                  setShowModal(null);
                  setStaffName('');
                  setNotes('');
                  setReason('');
                }}
                className="flex-1"
              >
                Cancel
              </ThemedButton>
              <ThemedButton
                variant={showModal === 'end' ? 'danger' : 'primary'}
                onClick={() => {
                  if (showModal === 'start') handleStartDay();
                  else if (showModal === 'end') handleEndDay();
                  else if (showModal === 'restart') handleRestartDay();
                }}
                disabled={!staffName.trim() || (showModal === 'restart' && !reason.trim())}
                className="flex-1"
              >
                {showModal === 'start' && '🌅 Start Day'}
                {showModal === 'end' && '🌙 End Day'}
                {showModal === 'restart' && '🔄 Restart Day'}
              </ThemedButton>
            </div>
          </div>
        </div>
      )}
    </>
  );
}