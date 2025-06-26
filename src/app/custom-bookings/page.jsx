'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ThemedLayout,
  ThemedCard,
  ThemedButton,
  ThemedSelect,
  ThemedInput,
  ThemedBadge
} from '@/components/themed';
import { theme } from '@/lib/theme';
import { cn } from '@/lib/utils';

// Custom booking rates for reference
const CUSTOM_RATES = {
  half_day: { label: 'Half Day', price: 800, icon: '🌅' },
  full_day: { label: 'Full Day', price: 1200, icon: '☀️' },
  night: { label: 'Night Package', price: 600, icon: '🌙' }
};

export default function CustomBookingsManagementPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [packageFilter, setPackageFilter] = useState('all');
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    completed: 0,
    totalRevenue: 0,
    packageStats: {}
  });

  useEffect(() => {
    fetchCustomBookings();
  }, []);

  const fetchCustomBookings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/custom-bookings');
      const data = await response.json();
      
      if (data.success) {
        setBookings(data.bookings);
        calculateStats(data.bookings);
      }
    } catch (error) {
      console.error('Error fetching custom bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (bookingsData) => {
    const stats = {
      total: bookingsData.length,
      active: bookingsData.filter(b => b.status === 'active').length,
      completed: bookingsData.filter(b => b.status === 'completed').length,
      totalRevenue: bookingsData.reduce((sum, b) => sum + (b.finalAmount || 0), 0),
      packageStats: {
        half_day: bookingsData.filter(b => b.customBookingType === 'half_day').length,
        full_day: bookingsData.filter(b => b.customBookingType === 'full_day').length,
        night: bookingsData.filter(b => b.customBookingType === 'night').length
      }
    };
    setStats(stats);
  };

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = !searchTerm || 
      booking.bookingId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.customerId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.customerId?.phone?.includes(searchTerm);
    
    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;
    const matchesPackage = packageFilter === 'all' || booking.customBookingType === packageFilter;
    
    return matchesSearch && matchesStatus && matchesPackage;
  });

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateDuration = (startTime, endTime) => {
    if (!startTime) return 'N/A';
    
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diffMs = end - start;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <ThemedLayout>
        <div className="min-h-screen flex items-center justify-center">
          <ThemedCard>
            <div className="flex items-center space-x-3 p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
              <span className="text-white text-xl">Loading custom bookings...</span>
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
            Custom <span className={theme.typography.gradient}>Bookings</span>
          </h2>
          <p className={`${theme.typography.subtitle} max-w-2xl mx-auto mt-4`}>
            Manage and monitor all fixed-rate package bookings
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <ThemedCard className="p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-cyan-400 mb-2">{stats.total}</div>
              <div className="text-cyan-200 text-sm">Total Custom Bookings</div>
            </div>
          </ThemedCard>
          
          <ThemedCard className="p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-400 mb-2">{stats.active}</div>
              <div className="text-green-200 text-sm">Active Bookings</div>
            </div>
          </ThemedCard>
          
          <ThemedCard className="p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-400 mb-2">{stats.completed}</div>
              <div className="text-blue-200 text-sm">Completed</div>
            </div>
          </ThemedCard>
          
          <ThemedCard className="p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-400 mb-2">
                ₹{stats.totalRevenue.toLocaleString('en-IN')}
              </div>
              <div className="text-purple-200 text-sm">Total Revenue</div>
            </div>
          </ThemedCard>
        </div>

        {/* Package Stats */}
        <ThemedCard title="📦 Package Distribution" className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
            {Object.entries(CUSTOM_RATES).map(([key, packageInfo]) => (
              <div key={key} className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
                <div className="text-center">
                  <div className="text-3xl mb-2">{packageInfo.icon}</div>
                  <div className="text-lg font-bold text-white mb-1">{packageInfo.label}</div>
                  <div className="text-2xl font-bold text-cyan-400 mb-1">
                    {stats.packageStats[key] || 0}
                  </div>
                  <div className="text-sm text-gray-400">bookings</div>
                  <div className="text-xs text-green-400 mt-1">
                    ₹{packageInfo.price.toLocaleString('en-IN')} each
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ThemedCard>

        {/* Filters */}
        <ThemedCard title="🔍 Filters" className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6">
            <ThemedInput
              label="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by booking ID, customer name, or phone"
            />
            
            <ThemedSelect
              label="Status"
              value={statusFilter}
              onValueChange={setStatusFilter}
              options={[
                { value: 'all', label: 'All Statuses' },
                { value: 'active', label: 'Active' },
                { value: 'completed', label: 'Completed' },
                { value: 'cancelled', label: 'Cancelled' }
              ]}
            />
            
            <ThemedSelect
              label="Package Type"
              value={packageFilter}
              onValueChange={setPackageFilter}
              options={[
                { value: 'all', label: 'All Packages' },
                { value: 'half_day', label: 'Half Day' },
                { value: 'full_day', label: 'Full Day' },
                { value: 'night', label: 'Night Package' }
              ]}
            />
            
            <div className="flex items-end">
              <ThemedButton
                variant="primary"
                onClick={fetchCustomBookings}
                className="w-full"
              >
                🔄 Refresh
              </ThemedButton>
            </div>
          </div>
        </ThemedCard>

        {/* Bookings List */}
        <ThemedCard title={`📋 Custom Bookings (${filteredBookings.length})`}>
          {filteredBookings.length === 0 ? (
            <div className="text-center p-12">
              <div className="text-6xl mb-4">📦</div>
              <h3 className="text-2xl font-bold text-white mb-2">No Custom Bookings Found</h3>
              <p className="text-gray-400 mb-6">
                {bookings.length === 0 
                  ? "No custom bookings have been created yet"
                  : "No bookings match your current filters"
                }
              </p>
              <Link href="/custom-booking">
                <ThemedButton variant="primary">
                  Create First Custom Booking
                </ThemedButton>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left p-4 text-gray-300">Booking ID</th>
                    <th className="text-left p-4 text-gray-300">Customer</th>
                    <th className="text-left p-4 text-gray-300">Package</th>
                    <th className="text-left p-4 text-gray-300">Vehicle</th>
                    <th className="text-left p-4 text-gray-300">Duration</th>
                    <th className="text-left p-4 text-gray-300">Amount</th>
                    <th className="text-left p-4 text-gray-300">Status</th>
                    <th className="text-left p-4 text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.map((booking) => {
                    const packageInfo = CUSTOM_RATES[booking.customBookingType] || {};
                    return (
                      <tr key={booking._id} className="border-b border-gray-800 hover:bg-gray-800/30">
                        <td className="p-4">
                          <div className="font-mono text-cyan-400">{booking.bookingId}</div>
                          <div className="text-xs text-gray-400">
                            {formatDateTime(booking.createdAt)}
                          </div>
                        </td>
                        
                        <td className="p-4">
                          <div className="text-white font-medium">{booking.customerId?.name}</div>
                          <div className="text-sm text-gray-400">{booking.customerId?.phone}</div>
                        </td>
                        
                        <td className="p-4">
                          <div className="flex items-center space-x-2">
                            <span className="text-2xl">{packageInfo.icon}</span>
                            <div>
                              <div className="text-white font-medium">{packageInfo.label}</div>
                              <div className="text-xs text-gray-400">{booking.customBookingLabel}</div>
                            </div>
                          </div>
                        </td>
                        
                        <td className="p-4">
                          <div className="text-white">{booking.vehicleId?.model}</div>
                          <div className="text-sm text-gray-400 font-mono">{booking.vehicleId?.plateNumber}</div>
                        </td>
                        
                        <td className="p-4">
                          <div className="text-white">{calculateDuration(booking.startTime, booking.endTime)}</div>
                          <div className="text-xs text-gray-400">
                            {formatDateTime(booking.startTime)}
                          </div>
                        </td>
                        
                        <td className="p-4">
                          <div className="text-lg font-bold text-green-400">
                            ₹{(booking.finalAmount || 0).toLocaleString('en-IN')}
                          </div>
                          <div className="text-xs text-gray-400">{booking.paymentMethod}</div>
                        </td>
                        
                        <td className="p-4">
                          <ThemedBadge
                            status={booking.status}
                            className={cn(
                              booking.status === 'active' && "bg-green-500/20 text-green-400 border-green-500/30",
                              booking.status === 'completed' && "bg-blue-500/20 text-blue-400 border-blue-500/30",
                              booking.status === 'cancelled' && "bg-red-500/20 text-red-400 border-red-500/30"
                            )}
                          >
                            {booking.status.toUpperCase()}
                          </ThemedBadge>
                        </td>
                        
                        <td className="p-4">
                          <div className="flex space-x-2">
                            {booking.status === 'active' && (
                              <Link href={`/active-bookings/${booking.bookingId}`}>
                                <ThemedButton variant="primary" className="text-xs px-3 py-1">
                                  View Live
                                </ThemedButton>
                              </Link>
                            )}
                            {booking.status === 'active' && (
                              <Link href={`/return/${booking.bookingId}`}>
                                <ThemedButton variant="success" className="text-xs px-3 py-1">
                                  Return
                                </ThemedButton>
                              </Link>
                            )}
                            <Link href={`/booking/confirmation/${booking.bookingId}`}>
                              <ThemedButton variant="secondary" className="text-xs px-3 py-1">
                                Receipt
                              </ThemedButton>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </ThemedCard>

        {/* Quick Actions */}
        <div className="flex flex-col md:flex-row gap-4 mt-8">
          <Link href="/custom-booking" className="flex-1">
            <ThemedButton variant="success" className="w-full py-3">
              ➕ New Custom Booking
            </ThemedButton>
          </Link>
          <Link href="/admin/bookings" className="flex-1">
            <ThemedButton variant="secondary" className="w-full py-3">
              📋 All Bookings
            </ThemedButton>
          </Link>
          <Link href="/active-bookings" className="flex-1">
            <ThemedButton variant="primary" className="w-full py-3">
              🔄 Active Bookings
            </ThemedButton>
          </Link>
          <Link href="/admin" className="flex-1">
            <ThemedButton variant="secondary" className="w-full py-3">
              📊 Dashboard
            </ThemedButton>
          </Link>
        </div>
      </div>
    </ThemedLayout>
  );
}