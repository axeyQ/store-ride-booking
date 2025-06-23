'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { calculateCurrentAmount } from '@/lib/pricing';

// Day Operations Control Component (inline for easy integration)
function DayOperationsControl({ onStatusChange }) {
  const [operation, setOperation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [showModal, setShowModal] = useState(null);
  const [staffName, setStaffName] = useState('');
  const [notes, setNotes] = useState('');
  const [reason, setReason] = useState('');

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
    if (!operation) return { color: 'gray', icon: '❓', text: 'Loading...', bgColor: 'bg-gray-900/20', borderColor: 'border-gray-700/30' };
    
    switch (operation.status) {
      case 'not_started':
        return { color: 'orange', icon: '🌅', text: 'Day Not Started', bgColor: 'bg-orange-900/20', borderColor: 'border-orange-700/30' };
      case 'in_progress':
        return { color: 'green', icon: '🏃', text: 'Day In Progress', bgColor: 'bg-green-900/20', borderColor: 'border-green-700/30' };
      case 'ended':
        return { color: 'blue', icon: '🌙', text: 'Day Ended', bgColor: 'bg-blue-900/20', borderColor: 'border-blue-700/30' };
      default:
        return { color: 'gray', icon: '❓', text: 'Unknown Status', bgColor: 'bg-gray-900/20', borderColor: 'border-gray-700/30' };
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

  if (loading) {
    return (
      <Card className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 border-gray-700 hover:scale-105 transition-transform">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-400"></div>
            <span className="ml-3 text-gray-400">Loading day status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const statusConfig = getStatusConfig();

  return (
    <>
      <Card className={`${statusConfig.bgColor} ${statusConfig.borderColor} hover:scale-105 transition-all duration-300`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="text-2xl">{statusConfig.icon}</div>
              <div>
                <div className="text-white font-bold text-lg">Day Operations</div>
                <Badge className={`text-xs text-${statusConfig.color}-400 bg-${statusConfig.color}-500/20 border-${statusConfig.color}-500/30`}>
                  {statusConfig.text}
                </Badge>
              </div>
            </div>
            
            {/* Operating Hours Display */}
            {operation?.dailySummary?.operatingHours > 0 && (
              <div className="text-right">
                <div className="text-white font-bold text-xl">
                  {operation.dailySummary.operatingHours}h
                </div>
                <div className="text-gray-400 text-xs">Operating Hours</div>
              </div>
            )}
          </div>

          {/* Time Details */}
          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
            <div>
              <div className="text-gray-400">Start</div>
              <div className="text-white font-medium">{formatTime(operation?.startTime)}</div>
            </div>
            <div>
              <div className="text-gray-400">End</div>
              <div className="text-white font-medium">{formatTime(operation?.endTime)}</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {operation?.status === 'not_started' && (
              <Button
                onClick={() => setShowModal('start')}
                disabled={actionLoading === 'starting'}
                className="bg-green-600 hover:bg-green-700 text-white w-full"
              >
                {actionLoading === 'starting' ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Starting...
                  </div>
                ) : (
                  <>🌅 Start Day</>
                )}
              </Button>
            )}

            {operation?.status === 'in_progress' && (
              <Button
                onClick={() => setShowModal('end')}
                disabled={actionLoading === 'ending'}
                className="bg-red-600 hover:bg-red-700 text-white w-full"
              >
                {actionLoading === 'ending' ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Ending...
                  </div>
                ) : (
                  <>🌙 End Day</>
                )}
              </Button>
            )}

            {operation?.status === 'ended' && (
              <Button
                onClick={() => setShowModal('restart')}
                disabled={actionLoading === 'restarting'}
                className="bg-blue-600 hover:bg-blue-700 text-white w-full"
              >
                {actionLoading === 'restarting' ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Restarting...
                  </div>
                ) : (
                  <>🔄 Restart Day</>
                )}
              </Button>
            )}

            <Link href="/daily-operations" className={operation?.status === 'not_started' ? 'md:col-span-3' : ''}>
              <Button variant="outline" className="w-full border-gray-600 text-gray-300 hover:bg-gray-800">
                📅 View History
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-white mb-4">
              {showModal === 'start' && '🌅 Start Day'}
              {showModal === 'end' && '🌙 End Day'}
              {showModal === 'restart' && '🔄 Restart Day'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-white text-sm font-medium mb-2">Your Name</label>
                <input
                  type="text"
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                  required
                />
              </div>
              
              {showModal === 'restart' ? (
                <div>
                  <label className="block text-white text-sm font-medium mb-2">Reason for Restart</label>
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Why are you restarting the day?"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                    required
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-white text-sm font-medium mb-2">Notes (Optional)</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any additional notes..."
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowModal(null);
                  setStaffName('');
                  setNotes('');
                  setReason('');
                }}
                className="flex-1 border-gray-600 text-gray-300"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (showModal === 'start') handleStartDay();
                  else if (showModal === 'end') handleEndDay();
                  else if (showModal === 'restart') handleRestartDay();
                }}
                disabled={!staffName.trim() || (showModal === 'restart' && !reason.trim())}
                className={`flex-1 ${showModal === 'end' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {showModal === 'start' && '🌅 Start Day'}
                {showModal === 'end' && '🌙 End Day'}
                {showModal === 'restart' && '🔄 Restart Day'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function ModernHomePage() {
  const [stats, setStats] = useState({
    todayRevenue: 0,
    activeBookings: 0,
    availableVehicles: 0,
    totalCustomers: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [advancedRevenue, setAdvancedRevenue] = useState(0);
  const [calculatingRevenue, setCalculatingRevenue] = useState(false);
  const [dayOperation, setDayOperation] = useState(null);
  const [businessHoursRevenue, setBusinessHoursRevenue] = useState(0);

  useEffect(() => {
    fetchStats();
  }, []);

  // Handle day operation status changes
  const handleDayOperationChange = (operation) => {
    setDayOperation(operation);
    // Recalculate revenue based on business hours if day is active
    if (operation?.status === 'in_progress') {
      fetchBusinessHoursRevenue();
    }
  };

  // Fetch revenue during business hours only
  const fetchBusinessHoursRevenue = async () => {
    try {
      const response = await fetch('/api/admin/revenue-with-business-hours?businessHoursOnly=true');
      const data = await response.json();
      if (data.success) {
        setBusinessHoursRevenue(data.data.todayRevenue);
      }
    } catch (error) {
      console.error('Error fetching business hours revenue:', error);
    }
  };

  const fetchStats = async () => {
    try {
      // Fetch basic stats first
      const response = await fetch('/api/stats');
      const data = await response.json();
      if (data.success && data.stats) {
        setStats({
          todayRevenue: data.stats.todayRevenue || 0,
          activeBookings: data.stats.activeBookings || 0,
          availableVehicles: data.stats.availableVehicles || 0,
          totalCustomers: data.stats.totalCustomers || 0
        });

        // Then calculate advanced pricing for today's revenue
        await calculateAdvancedTodayRevenue();
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      setError('Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  const calculateAdvancedTodayRevenue = async () => {
    try {
      setCalculatingRevenue(true);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
  
      const response = await fetch('/api/bookings');
      const data = await response.json();
      
      if (data.success) {
        // ✅ FIXED: Exclude cancelled bookings
        const todayBookings = data.bookings.filter(booking => {
          const bookingDate = new Date(booking.createdAt);
          return bookingDate >= today && 
                 bookingDate < tomorrow && 
                 booking.status !== 'cancelled'; // 🔥 KEY FIX
        });
  
        let totalAdvancedRevenue = 0;
        
        for (const booking of todayBookings) {
          const result = await calculateCurrentAmount(booking);
          totalAdvancedRevenue += typeof result === 'number' ? result : result.amount;
        }
  
        setAdvancedRevenue(totalAdvancedRevenue);
      }
    } catch (error) {
      console.error('Error calculating advanced revenue:', error);
      setAdvancedRevenue(stats.todayRevenue);
    } finally {
      setCalculatingRevenue(false);
    }
  };

  // Determine which revenue to show based on day operations
  const getDisplayRevenue = () => {
    if (dayOperation?.status === 'in_progress' && businessHoursRevenue > 0) {
      return businessHoursRevenue;
    }
    return advancedRevenue || stats.todayRevenue;
  };

  const getRevenueLabel = () => {
    if (dayOperation?.status === 'in_progress') {
      return 'Business Hours Revenue';
    }
    return 'Today\'s Revenue';
  };

  const getRevenueSubtext = () => {
    if (dayOperation?.status === 'in_progress') {
      return 'Since day started';
    }
    if (calculatingRevenue) {
      return 'Calculating advanced pricing...';
    }
    return '🧮 Advanced Pricing';
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex flex-col">
        <header className="border-b border-gray-800 bg-black/50 backdrop-blur-sm">
          <div className="container mx-auto px-6 py-4">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-white">MR Travels</h1>
              <Badge variant="outline" className="text-cyan-400 border-cyan-400">
                Bike & Scooter Rentals
              </Badge>
            </div>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center">
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-6 text-center">
              <div className="text-red-400 text-xl mb-4">⚠️ {error}</div>
              <Button onClick={() => {
                setError(null);
                setLoading(true);
                fetchStats();
              }} className="bg-cyan-600 hover:bg-cyan-700">
                Retry
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Modern Header with Business Status */}
      <header className="border-b border-gray-800 bg-black/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">MR</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">MR Travels</h1>
                <p className="text-gray-400 text-sm">Rental Management System</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Business Status Indicator */}
              {dayOperation && (
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${
                    dayOperation.status === 'in_progress' ? 'bg-green-400 animate-pulse' : 
                    dayOperation.status === 'ended' ? 'bg-blue-400' : 'bg-orange-400'
                  }`}></div>
                  <span className={`text-sm font-medium ${
                    dayOperation.status === 'in_progress' ? 'text-green-400' : 
                    dayOperation.status === 'ended' ? 'text-blue-400' : 'text-orange-400'
                  }`}>
                    {dayOperation.status === 'in_progress' && 'Business Open'}
                    {dayOperation.status === 'ended' && 'Business Closed'}
                    {dayOperation.status === 'not_started' && 'Business Not Started'}
                  </span>
                </div>
              )}
              <Badge variant="outline" className="text-cyan-400 border-cyan-400 bg-cyan-400/10">
                Bike & Scooter Rentals
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-white mb-4">
            Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">MR Travels</span>
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Professional rental management system for bikes and scooters
          </p>
        </div>

        {/* Day Operations Control */}
        <div className="mb-8">
          <DayOperationsControl onStatusChange={handleDayOperationChange} />
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
          <Card className="bg-gradient-to-r from-green-900/50 to-green-800/50 border-green-700/50 hover:scale-105 transition-transform">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-green-400 mb-2">
                {calculatingRevenue ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-400"></div>
                  </div>
                ) : (
                  `₹${getDisplayRevenue().toLocaleString('en-IN')}`
                )}
              </div>
              <div className="text-green-200 text-sm">{getRevenueLabel()}</div>
              <div className="text-xs text-green-300 mt-1">{getRevenueSubtext()}</div>
              <div className="w-full bg-green-900/30 rounded-full h-2 mt-3">
                <div className="bg-green-400 h-2 rounded-full w-3/4"></div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-blue-900/50 to-blue-800/50 border-blue-700/50 hover:scale-105 transition-transform">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-blue-400 mb-2">{stats.activeBookings || 0}</div>
              <div className="text-blue-200 text-sm">Active Bookings</div>
              <div className="w-full bg-blue-900/30 rounded-full h-2 mt-3">
                <div className="bg-blue-400 h-2 rounded-full w-2/3"></div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-900/50 to-purple-800/50 border-purple-700/50 hover:scale-105 transition-transform">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-purple-400 mb-2">{stats.availableVehicles || 0}</div>
              <div className="text-purple-200 text-sm">Available Vehicles</div>
              <div className="w-full bg-purple-900/30 rounded-full h-2 mt-3">
                <div className="bg-purple-400 h-2 rounded-full w-4/5"></div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-900/50 to-orange-800/50 border-orange-700/50 hover:scale-105 transition-transform">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-orange-400 mb-2">{stats.totalCustomers || 0}</div>
              <div className="text-orange-200 text-sm">Total Customers</div>
              <div className="w-full bg-orange-900/30 rounded-full h-2 mt-3">
                <div className="bg-orange-400 h-2 rounded-full w-3/5"></div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Business Hours Performance (only show if day is active/ended) */}
        {dayOperation && (dayOperation.status === 'in_progress' || dayOperation.status === 'ended') && (
          <div className="mb-12">
            <Card className="bg-gradient-to-r from-cyan-900/50 to-cyan-800/50 border-cyan-700/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  ⏰ Business Hours Performance
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Revenue and metrics during operating hours
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">
                      ₹{dayOperation.dailySummary?.revenuePerHour || 0}/hr
                    </div>
                    <div className="text-gray-400 text-sm">Revenue Rate</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">
                      {dayOperation.dailySummary?.operatingHours || 0}h
                    </div>
                    <div className="text-gray-400 text-sm">Operating Hours</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-400">
                      {dayOperation.dailySummary?.totalBookings || 0}
                    </div>
                    <div className="text-gray-400 text-sm">Total Bookings</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-400">
                      {dayOperation.dailySummary?.vehiclesRented || 0}
                    </div>
                    <div className="text-gray-400 text-sm">Vehicles Used</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Navigation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {/* New Booking */}
          <Link href="/booking" className="group">
            <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 hover:border-green-500/50 transition-all duration-300 hover:scale-105 h-full">
              <CardContent className="p-8 text-center h-full flex flex-col justify-center">
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-green-400 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <CardTitle className="text-2xl font-bold text-white mb-3 group-hover:text-green-400 transition-colors">
                  New Booking
                </CardTitle>
                <CardDescription className="text-gray-400 text-lg">
                  Start a new bike or scooter rental
                </CardDescription>
                <Badge className="mt-4 bg-green-500/20 text-green-400 border-green-500/30">
                  Primary Action
                </Badge>
              </CardContent>
            </Card>
          </Link>

          {/* Active Bookings */}
          <Link href="/active-bookings" className="group">
            <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 hover:border-orange-500/50 transition-all duration-300 hover:scale-105 h-full">
              <CardContent className="p-8 text-center h-full flex flex-col justify-center">
                <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-orange-400 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <CardTitle className="text-2xl font-bold text-white mb-3 group-hover:text-orange-400 transition-colors">
                  Active Bookings
                </CardTitle>
                <CardDescription className="text-gray-400 text-lg">
                  Manage ongoing rentals
                </CardDescription>
                {stats.activeBookings > 0 && (
                  <Badge className="mt-4 bg-orange-500/20 text-orange-400 border-orange-500/30">
                    {stats.activeBookings} active
                  </Badge>
                )}
              </CardContent>
            </Card>
          </Link>

          {/* Vehicle Management */}
          <Link href="/vehicles" className="group">
            <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 hover:border-purple-500/50 transition-all duration-300 hover:scale-105 h-full">
              <CardContent className="p-8 text-center h-full flex flex-col justify-center">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-purple-400 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <CardTitle className="text-2xl font-bold text-white mb-3 group-hover:text-purple-400 transition-colors">
                  Vehicles
                </CardTitle>
                <CardDescription className="text-gray-400 text-lg">
                  Manage bikes & scooters
                </CardDescription>
                {stats.availableVehicles > 0 && (
                  <Badge className="mt-4 bg-purple-500/20 text-purple-400 border-purple-500/30">
                    {stats.availableVehicles} available
                  </Badge>
                )}
              </CardContent>
            </Card>
          </Link>

          {/* Admin Dashboard */}
          <Link href="/admin" className="group">
            <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 hover:border-blue-500/50 transition-all duration-300 hover:scale-105 h-full">
              <CardContent className="p-8 text-center h-full flex flex-col justify-center">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <CardTitle className="text-2xl font-bold text-white mb-3 group-hover:text-blue-400 transition-colors">
                  Dashboard
                </CardTitle>
                <CardDescription className="text-gray-400 text-lg">
                  Analytics & reports
                </CardDescription>
                <Badge className="mt-4 bg-blue-500/20 text-blue-400 border-blue-500/30">
                  Analytics
                </Badge>
              </CardContent>
            </Card>
          </Link>

          {/* All Bookings Dashboard */}
          <Link href="/admin/bookings" className="group">
            <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 hover:border-blue-500/50 transition-all duration-300 hover:scale-105 h-full">
              <CardContent className="p-8 text-center h-full flex flex-col justify-center">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <CardTitle className="text-2xl font-bold text-white mb-3 group-hover:text-blue-400 transition-colors">
                  All Bookings
                </CardTitle>
                <CardDescription className="text-gray-400 text-lg">
                  Analytics & reports
                </CardDescription>
                <Badge className="mt-4 bg-blue-500/20 text-blue-400 border-blue-500/30">
                  Analytics
                </Badge>
              </CardContent>
            </Card>
          </Link>

          {/* Customer Database */}
          <Link href="/customers" className="group">
            <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 hover:border-cyan-500/50 transition-all duration-300 hover:scale-105 h-full">
              <CardContent className="p-8 text-center h-full flex flex-col justify-center">
                <div className="w-16 h-16 bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <CardTitle className="text-2xl font-bold text-white mb-3 group-hover:text-cyan-400 transition-colors">
                  Customers
                </CardTitle>
                <CardDescription className="text-gray-400 text-lg">
                  Customer database
                </CardDescription>
                {stats.totalCustomers > 0 && (
                  <Badge className="mt-4 bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                    {stats.totalCustomers} customers
                  </Badge>
                )}
              </CardContent>
            </Card>
          </Link>

          {/* Settings */}
          <Link href="/settings" className="group">
            <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 hover:border-gray-500/50 transition-all duration-300 hover:scale-105 h-full">
              <CardContent className="p-8 text-center h-full flex flex-col justify-center">
                <div className="w-16 h-16 bg-gradient-to-r from-gray-500 to-gray-400 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <CardTitle className="text-2xl font-bold text-white mb-3 group-hover:text-gray-400 transition-colors">
                  Settings
                </CardTitle>
                <CardDescription className="text-gray-400 text-lg">
                  System configuration
                </CardDescription>
                <Badge className="mt-4 bg-gray-500/20 text-gray-400 border-gray-500/30">
                  Configuration
                </Badge>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Today's Summary */}
        <Card className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 border-gray-700 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              Today&apos;s Business Summary
            </CardTitle>
            <CardDescription className="text-gray-400">
              Real-time overview with advanced pricing calculations and day operations tracking
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
                  <span className="text-gray-400 text-lg">Loading business metrics...</span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="bg-green-900/20 border border-green-700/30 rounded-xl p-6 text-center">
                  <div className="text-3xl font-bold text-green-400 mb-2">
                    {calculatingRevenue ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-400"></div>
                      </div>
                    ) : (
                      `₹${getDisplayRevenue().toLocaleString('en-IN')}`
                    )}
                  </div>
                  <div className="text-green-200 text-sm">{getRevenueLabel()}</div>
                  <div className="text-xs text-green-300 mt-1">{getRevenueSubtext()}</div>
                </div>

                <div className="bg-blue-900/20 border border-blue-700/30 rounded-xl p-6 text-center">
                  <div className="text-3xl font-bold text-blue-400 mb-2">{stats.activeBookings || 0}</div>
                  <div className="text-blue-200 text-sm">Active Bookings</div>
                  <div className="text-xs text-blue-300 mt-1">
                    {stats.activeBookings > 0 ? 'Live rentals' : 'All vehicles available'}
                  </div>
                </div>

                <div className="bg-purple-900/20 border border-purple-700/30 rounded-xl p-6 text-center">
                  <div className="text-3xl font-bold text-purple-400 mb-2">{stats.availableVehicles || 0}</div>
                  <div className="text-purple-200 text-sm">Available Vehicles</div>
                  <div className="text-xs text-purple-300 mt-1">Ready for rental</div>
                </div>

                <div className="bg-orange-900/20 border border-orange-700/30 rounded-xl p-6 text-center">
                  <div className="text-3xl font-bold text-orange-400 mb-2">
                    {dayOperation?.dailySummary?.operatingHours || 0}h
                  </div>
                  <div className="text-orange-200 text-sm">Operating Hours</div>
                  <div className="text-xs text-orange-300 mt-1">
                    {dayOperation?.status === 'in_progress' ? 'So far today' : 'Today total'}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Modern Footer */}
      <footer className="border-t border-gray-800 bg-black/30 backdrop-blur-sm mt-12">
        <div className="container mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-4 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">MR</span>
              </div>
              <div>
                <div className="text-white font-semibold">MR Travels</div>
                <div className="text-gray-400 text-sm">Professional Rental Management</div>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <Badge variant="outline" className="text-gray-400 border-gray-600">
                System Status: Online
              </Badge>
              <div className="text-gray-400 text-sm">
                © 2025 MR Travels. All rights reserved.
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}