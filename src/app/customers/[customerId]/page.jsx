'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ThemedLayout,
  ThemedCard,
  ThemedButton,
  ThemedBadge,
  ThemedStatsCard
} from '@/components/themed';
import { theme } from '@/lib/theme';
import { cn } from '@/lib/utils';

export default function ThemedCustomerDetailsPage() {
  const params = useParams();
  const customerId = params.customerId;
  const [customer, setCustomer] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (customerId) {
      fetchCustomerDetails();
      fetchCustomerBookings();
    }
  }, [customerId]);

  const fetchCustomerDetails = async () => {
    try {
      const response = await fetch(`/api/customers/${customerId}`);
      const data = await response.json();
      if (data.success) {
        setCustomer(data.customer);
      } else {
        setError(data.error || 'Customer not found');
      }
    } catch (error) {
      console.error('Error fetching customer:', error);
      setError('Failed to load customer details');
    }
  };

  const fetchCustomerBookings = async () => {
    try {
      const response = await fetch(`/api/customers/${customerId}/bookings`);
      const data = await response.json();
      if (data.success) {
        setBookings(data.bookings);
      }
    } catch (error) {
      console.error('Error fetching customer bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    if (!bookings.length) return { totalSpent: 0, avgPerBooking: 0, totalHours: 0 };
    
    const totalSpent = bookings.reduce((sum, booking) => sum + (booking.finalAmount || 0), 0);
    const avgPerBooking = Math.round(totalSpent / bookings.length);
    const totalHours = bookings.reduce((sum, booking) => sum + (booking.actualDuration || 0), 0);
    
    return { totalSpent, avgPerBooking, totalHours };
  };

  const getCustomerTier = (totalBookings) => {
    if (totalBookings >= 20) return { 
      label: 'VIP', 
      color: 'purple', 
      icon: '👑',
      bg: 'bg-gradient-to-r from-purple-900/50 to-purple-800/50',
      border: 'border-purple-500/50'
    };
    if (totalBookings >= 10) return { 
      label: 'Gold', 
      color: 'orange', 
      icon: '🥇',
      bg: 'bg-gradient-to-r from-orange-900/50 to-orange-800/50',
      border: 'border-orange-500/50'
    };
    if (totalBookings >= 5) return { 
      label: 'Silver', 
      color: 'gray', 
      icon: '🥈',
      bg: 'bg-gradient-to-r from-gray-700/50 to-gray-600/50',
      border: 'border-gray-500/50'
    };
    return { 
      label: 'New', 
      color: 'cyan', 
      icon: '🆕',
      bg: 'bg-gradient-to-r from-cyan-900/50 to-cyan-800/50',
      border: 'border-cyan-500/50'
    };
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

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: 'bg-orange-100 text-orange-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return statusConfig[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <ThemedLayout>
        <div className="min-h-screen flex items-center justify-center">
          <ThemedCard>
            <div className="flex items-center space-x-3 p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
              <span className="text-white text-xl">Loading customer details...</span>
            </div>
          </ThemedCard>
        </div>
      </ThemedLayout>
    );
  }

  if (error) {
    return (
      <ThemedLayout>
        <div className="min-h-screen flex items-center justify-center">
          <ThemedCard className="text-center p-12">
            <div className="text-red-400 text-6xl mb-4">❌</div>
            <h2 className="text-2xl font-bold text-white mb-4">{error}</h2>
            <Link href="/customers">
              <ThemedButton variant="primary">
                ← Back to Customers
              </ThemedButton>
            </Link>
          </ThemedCard>
        </div>
      </ThemedLayout>
    );
  }

  const stats = calculateStats();
  const tier = getCustomerTier(customer?.totalBookings || 0);

  return (
    <ThemedLayout>
      <div className="container mx-auto px-6 py-8">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <h2 className={theme.typography.hero}>
            Customer <span className={theme.typography.gradient}>Profile</span>
          </h2>
          <p className={`${theme.typography.subtitle} max-w-2xl mx-auto mt-4`}>
            Complete customer information and rental history
          </p>
        </div>

        {/* Navigation Breadcrumb */}
        <ThemedCard className="mb-8">
          <div className="flex items-center justify-between p-6">
            <div className="flex items-center space-x-4">
              <Link href="/customers" className="text-cyan-400 hover:text-cyan-300 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-white">{customer?.name}</h1>
                <p className="text-gray-400">Customer Profile & History</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <ThemedBadge color={tier.color} className="text-lg px-4 py-2 flex items-center gap-2">
                <span>{tier.icon}</span>
                {tier.label} Customer
              </ThemedBadge>
              <Link href={`/booking?customerId=${customerId}`}>
                <ThemedButton variant="primary">
                  + New Booking
                </ThemedButton>
              </Link>
            </div>
          </div>
        </ThemedCard>

        {/* Customer Overview Stats */}
        <div className={theme.layout.grid.stats + " mb-8"}>
          <ThemedStatsCard
            title="Total Bookings"
            value={customer?.totalBookings || 0}
            subtitle="Rental history"
            colorScheme="bookings"
            icon={<div className="text-4xl mb-2">📋</div>}
            progress={100}
          />
          <ThemedStatsCard
            title="Total Spent"
            value={`₹${stats.totalSpent.toLocaleString('en-IN')}`}
            subtitle="Lifetime value"
            colorScheme="revenue"
            icon={<div className="text-4xl mb-2">💰</div>}
            progress={75}
          />
          <ThemedStatsCard
            title="Avg per Booking"
            value={`₹${stats.avgPerBooking.toLocaleString('en-IN')}`}
            subtitle="Average spending"
            colorScheme="vehicles"
            icon={<div className="text-4xl mb-2">📊</div>}
            progress={60}
          />
          <ThemedStatsCard
            title="Total Hours"
            value={stats.totalHours}
            subtitle="Hours rented"
            colorScheme="customers"
            icon={<div className="text-4xl mb-2">⏱️</div>}
            progress={85}
          />
        </div>

        {/* Customer Tier Card */}
        <ThemedCard className={cn("mb-8", tier.bg, tier.border)}>
          <div className="p-6 text-center">
            <div className="text-6xl mb-4">{tier.icon}</div>
            <h3 className="text-3xl font-bold text-white mb-2">{tier.label} Customer</h3>
            <p className="text-gray-300 text-lg">
              {tier.label === 'VIP' && 'Premium customer with exceptional loyalty'}
              {tier.label === 'Gold' && 'Valued customer with regular bookings'}
              {tier.label === 'Silver' && 'Loyal customer with multiple rentals'}
              {tier.label === 'New' && 'Welcome to MR Travels family'}
            </p>
            <div className="mt-4 text-sm text-gray-400">
              Customer since: {customer?.createdAt ? formatDateTime(customer.createdAt) : 'N/A'}
            </div>
          </div>
        </ThemedCard>

        {/* Tabs Navigation */}
        <ThemedCard className="mb-6">
          <div className="border-b border-gray-700">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'overview', label: '📋 Overview', icon: '📋' },
                { id: 'bookings', label: `🚴 Booking History (${bookings.length})`, icon: '🚴' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors",
                    activeTab === tab.id
                      ? "border-cyan-500 text-cyan-400"
                      : "border-transparent text-gray-400 hover:text-gray-300"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-8">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Customer Information */}
                <div>
                  <h3 className="text-2xl font-bold text-white mb-6">Customer Information</h3>
                  <div className="space-y-6">
                    <div className="bg-gray-800/50 rounded-lg p-4">
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <span className="text-gray-400 text-sm">Full Name</span>
                          <p className="text-lg font-semibold text-white">{customer?.name}</p>
                        </div>
                        <div>
                          <span className="text-gray-400 text-sm">Phone Number</span>
                          <p className="text-lg font-semibold text-white">{customer?.phone}</p>
                        </div>
                        <div>
                          <span className="text-gray-400 text-sm">Driver License</span>
                          <p className="text-lg font-mono font-semibold text-white">{customer?.driverLicense}</p>
                        </div>
                        <div>
                          <span className="text-gray-400 text-sm">Customer Since</span>
                          <p className="text-lg text-white">
                            {customer?.createdAt ? formatDateTime(customer.createdAt) : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-400 text-sm">Last Visit</span>
                          <p className="text-lg text-white">
                            {customer?.lastVisit ? formatDateTime(customer.lastVisit) : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Customer Analytics */}
                <div>
                  <h3 className="text-2xl font-bold text-white mb-6">Customer Analytics</h3>
                  <div className="space-y-6">
                    <div className="bg-gradient-to-r from-blue-900/50 to-blue-800/50 border border-blue-700/50 rounded-lg p-6 text-center">
                      <div className="text-3xl mb-2">🎯</div>
                      <div className="text-xl font-bold text-blue-400 mb-2">
                        {bookings.length > 0 ? 'Regular Customer' : 'New Customer'}
                      </div>
                      <div className="text-blue-200 text-sm">Booking Frequency</div>
                    </div>

                    <div className="bg-gradient-to-r from-green-900/50 to-green-800/50 border border-green-700/50 rounded-lg p-6 text-center">
                      <div className="text-3xl mb-2">🚴</div>
                      <div className="text-xl font-bold text-green-400 mb-2">
                        {bookings.length > 0 ? 'Various Vehicles' : 'None yet'}
                      </div>
                      <div className="text-green-200 text-sm">Preferred Vehicle</div>
                    </div>

                    <div className="bg-gradient-to-r from-purple-900/50 to-purple-800/50 border border-purple-700/50 rounded-lg p-6 text-center">
                      <div className="text-3xl mb-2">⚡</div>
                      <div className="text-xl font-bold text-purple-400 mb-2">Active</div>
                      <div className="text-purple-200 text-sm">Customer Status</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Bookings Tab */}
            {activeTab === 'bookings' && (
              <div>
                <h3 className="text-2xl font-bold text-white mb-6">Booking History</h3>
                {bookings.length === 0 ? (
                  <ThemedCard className="text-center p-12">
                    <div className="text-gray-400 text-6xl mb-4">📋</div>
                    <h3 className="text-2xl font-bold text-white mb-2">No bookings yet</h3>
                    <p className="text-gray-400 mb-6">This customer hasn't made any bookings</p>
                    <Link href={`/booking?customerId=${customerId}`}>
                      <ThemedButton variant="primary">
                        Create First Booking
                      </ThemedButton>
                    </Link>
                  </ThemedCard>
                ) : (
                  <div className="space-y-4">
                    {bookings.map((booking) => (
                      <ThemedCard 
                        key={booking._id} 
                        className="hover:scale-102 transition-all duration-200"
                      >
                        <div className="p-6">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h4 className="text-lg font-bold text-white mb-1">
                                Booking #{booking.bookingId}
                              </h4>
                              <p className="text-gray-400">
                                {booking.vehicleId?.model || 'Unknown'} - {booking.vehicleId?.plateNumber || 'N/A'}
                              </p>
                            </div>
                            <ThemedBadge status={booking.status}>
                              {booking.status.toUpperCase()}
                            </ThemedBadge>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div className="text-center">
                              <div className="text-lg font-bold text-white">
                                {formatDateTime(booking.startTime)}
                              </div>
                              <div className="text-gray-400 text-sm">Start Time</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-bold text-white">
                                {booking.actualDuration || 0}h
                              </div>
                              <div className="text-gray-400 text-sm">Duration</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-bold text-green-400">
                                ₹{(booking.finalAmount || 0).toLocaleString('en-IN')}
                              </div>
                              <div className="text-gray-400 text-sm">Amount</div>
                            </div>
                            <div className="text-center">
                              <Link href={`/active-bookings/${booking.bookingId}`}>
                                <ThemedButton variant="secondary" className="text-sm">
                                  View Details
                                </ThemedButton>
                              </Link>
                            </div>
                          </div>
                        </div>
                      </ThemedCard>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </ThemedCard>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/customers">
            <ThemedButton variant="secondary" className="w-full">
              ← Back to Customers
            </ThemedButton>
          </Link>
          <Link href={`/booking?customerId=${customerId}`}>
            <ThemedButton variant="primary" className="w-full">
              + Create New Booking
            </ThemedButton>
          </Link>
          <Link href="/admin/bookings">
            <ThemedButton variant="secondary" className="w-full">
              📋 All Bookings
            </ThemedButton>
          </Link>
        </div>
      </div>
    </ThemedLayout>
  );
}