'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ThemedLayout,
  ThemedCard,
  ThemedStatsCard,
  ThemedButton,
  ThemedInput,
  ThemedSelect,
  ThemedBadge
} from '@/components/themed';
import { theme } from '@/lib/theme';
import { cn } from '@/lib/utils';

export default function ThemedActiveBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVehicle, setFilterVehicle] = useState('all');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentAmounts, setCurrentAmounts] = useState({});

  useEffect(() => {
    fetchActiveBookings();
    // Update current time every minute for real-time duration calculation
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timeInterval);
  }, []);

  // Update current amounts when bookings change
  useEffect(() => {
    if (bookings.length > 0) {
      updateCurrentAmounts();
      // Update amounts every minute
      const amountInterval = setInterval(updateCurrentAmounts, 60000);
      return () => clearInterval(amountInterval);
    }
  }, [bookings]);

  const fetchActiveBookings = async () => {
    try {
      console.log('Fetching active bookings...');
      const response = await fetch('/api/bookings?status=active');
      const data = await response.json();
      console.log('API response:', data);
      if (data.success) {
        console.log(`Received ${data.bookings.length} active bookings`);
        setBookings(data.bookings);
      } else {
        console.error('API error:', data.error);
      }
    } catch (error) {
      console.error('Error fetching active bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch advanced pricing for a specific booking
  const fetchCurrentAmount = async (bookingId) => {
    try {
      const response = await fetch(`/api/bookings/current-amount/${bookingId}`);
      const data = await response.json();
      if (data.success) {
        return data.currentAmount;
      } else {
        console.error('Error fetching current amount for booking:', bookingId, data.error);
        // Fallback to simple calculation
        const booking = bookings.find(b => b._id === bookingId);
        if (booking) {
          const duration = calculateDuration(booking.startTime);
          return duration.totalHours * 80;
        }
        return 0;
      }
    } catch (error) {
      console.error('Error fetching current amount:', error);
      // Fallback to simple calculation
      const booking = bookings.find(b => b._id === bookingId);
      if (booking) {
        const duration = calculateDuration(booking.startTime);
        return duration.totalHours * 80;
      }
      return 0;
    }
  };

  // Update current amounts for all active bookings
  const updateCurrentAmounts = async () => {
    const amounts = {};
    for (const booking of bookings) {
      amounts[booking._id] = await fetchCurrentAmount(booking._id);
    }
    setCurrentAmounts(amounts);
  };

  const calculateDuration = (startTime) => {
    const start = new Date(startTime);
    const diffMs = currentTime - start;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return { 
      hours, 
      minutes, 
      totalHours: Math.ceil(diffMs / (1000 * 60 * 60)) 
    };
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredBookings = bookings.filter(booking => {
    const customer = booking.customerId;
    const vehicle = booking.vehicleId;
    const matchesSearch = searchTerm === '' ||
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm) ||
      customer.driverLicense.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.plateNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterVehicle === 'all' || vehicle.type === filterVehicle;
    return matchesSearch && matchesFilter;
  });

  // Calculate total current revenue using advanced pricing
  const totalCurrentRevenue = Object.values(currentAmounts).reduce((sum, amount) => sum + amount, 0);

  if (loading) {
    return (
      <ThemedLayout>
        <div className="min-h-screen flex items-center justify-center">
          <ThemedCard>
            <div className="flex items-center space-x-3 p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
              <span className="text-white text-xl">Loading active bookings...</span>
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
            Active <span className={theme.typography.gradient}>Bookings</span>
          </h2>
          <p className={`${theme.typography.subtitle} max-w-2xl mx-auto mt-4`}>
            Real-time monitoring and management of ongoing rentals
          </p>
        </div>

        {/* Real-time Stats */}
        <div className={theme.layout.grid.stats + " mb-8"}>
          <ThemedStatsCard
            title="Active Rentals"
            value={bookings.length}
            subtitle={bookings.length > 0 ? 'Live bookings' : 'All vehicles available'}
            colorScheme="bookings"
            icon={<div className="text-4xl mb-2">🚴</div>}
            progress={Math.min((bookings.length / 10) * 100, 100)}
          />
          <ThemedStatsCard
            title="Current Revenue"
            value={`₹${totalCurrentRevenue.toLocaleString('en-IN')}`}
            subtitle={bookings.length > 0 ? 'Advanced pricing applied' : 'No active revenue'}
            colorScheme="revenue"
            icon={<div className="text-4xl mb-2">💰</div>}
            progress={75}
          />
          <ThemedStatsCard
            title="Bikes Out"
            value={bookings.filter(b => b.vehicleId.type === 'bike').length}
            subtitle="Two-wheelers"
            colorScheme="vehicles"
            icon={<div className="text-4xl mb-2">🏍</div>}
            progress={(bookings.filter(b => b.vehicleId.type === 'bike').length / Math.max(bookings.length, 1)) * 100}
          />
          <ThemedStatsCard
            title="Scooters Out"
            value={bookings.filter(b => b.vehicleId.type === 'scooter').length}
            subtitle="Family vehicles"
            colorScheme="customers"
            icon={<div className="text-4xl mb-2">🛵</div>}
            progress={(bookings.filter(b => b.vehicleId.type === 'scooter').length / Math.max(bookings.length, 1)) * 100}
          />
        </div>

        {/* Live Time Display */}
        <ThemedCard className="mb-8">
          <div className="flex items-center justify-between p-6">
            <div className="flex items-center space-x-4">
              <div className={`${theme.components.icon.small} ${theme.colors.primary.cyan.bg}`}>
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Live Dashboard</h3>
                <p className="text-gray-400">Real-time rental monitoring with advanced pricing</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400">Current Time</div>
              <div className="text-2xl font-bold text-cyan-400">
                {currentTime.toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true
                })}
              </div>
            </div>
          </div>
        </ThemedCard>

        {/* Search and Filter */}
        <ThemedCard className="mb-8">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Search & Filter</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ThemedInput
                label="Search Bookings"
                placeholder="Name, phone, license, or plate number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                containerClassName="md:col-span-2"
              />
              <ThemedSelect
                label="Filter by Vehicle Type"
                value={filterVehicle}
                onValueChange={setFilterVehicle}
                options={[
                  { value: 'all', label: 'All Vehicles' },
                  { value: 'bike', label: 'Bikes Only' },
                  { value: 'scooter', label: 'Scooters Only' }
                ]}
              />
            </div>
          </div>
        </ThemedCard>

        {/* Active Bookings Grid */}
        {filteredBookings.length === 0 ? (
          <ThemedCard className="text-center p-12">
            <div className="mb-6">
              <div className="w-24 h-24 bg-gradient-to-r from-gray-600 to-gray-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v11a2 2 0 002 2h9.5M15 8v7m0 0l3-3m-3 3l-3-3" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">
                {bookings.length === 0 ? 'No Active Bookings' : 'No Bookings Match Your Search'}
              </h3>
              <p className="text-gray-400 mb-6">
                {bookings.length === 0
                  ? 'All vehicles are currently available for rental'
                  : 'Try adjusting your search or filter criteria'
                }
              </p>
              {bookings.length === 0 && (
                <Link href="/booking">
                  <ThemedButton variant="primary">
                    Create First Booking
                  </ThemedButton>
                </Link>
              )}
            </div>
          </ThemedCard>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {filteredBookings.map((booking) => {
              const duration = calculateDuration(booking.startTime);
              const currentAmount = currentAmounts[booking._id] || 0;

              return (
                <ThemedCard
                  key={booking._id}
                  className="hover:scale-105 transition-all duration-300 border-gray-600 hover:border-orange-500/50"
                >
                  <div className="p-6">
                    {/* Booking Header */}
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h3 className="text-xl font-bold text-white">
                          {booking.customerId.name}
                        </h3>
                        <p className="text-gray-400">{booking.customerId.phone}</p>
                        <p className="text-sm text-gray-500 font-mono">ID: {booking.bookingId}</p>
                      </div>
                      <ThemedBadge status="active">
                        🔴 LIVE
                      </ThemedBadge>
                    </div>

                    {/* Vehicle Info */}
                    <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-gray-400">Vehicle:</span>
                          <p className="font-medium text-white capitalize">
                            {booking.vehicleId.type} - {booking.vehicleId.model}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-400">Plate:</span>
                          <p className="font-mono font-bold text-white">
                            {booking.vehicleId.plateNumber}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Live Metrics */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-blue-400">
                          {duration.hours}h {duration.minutes}m
                        </div>
                        <div className="text-blue-200 text-sm">Live Duration</div>
                      </div>
                      <div className="bg-green-900/20 border border-green-700/30 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-green-400">
                          ₹{currentAmount.toLocaleString('en-IN')}
                        </div>
                        <div className="text-green-200 text-sm">Advanced Pricing</div>
                      </div>
                    </div>

                    {/* Timing Info */}
                    <div className="space-y-3 mb-6">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Started:</span>
                        <span className="font-medium text-white">{formatTime(booking.startTime)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Base Rate:</span>
                        <span className="font-medium text-white">₹80/hour</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Pricing:</span>
                        <span className="font-bold text-cyan-400">Advanced System</span>
                      </div>
                    </div>

                    {/* Safety Checklist Status */}
                    <div className="mb-6">
                      <h4 className="text-sm font-medium text-gray-400 mb-3">Safety Checklist</h4>
                      <div className="flex items-center justify-between text-sm">
                        <span className={`flex items-center gap-1 ${booking.helmetProvided ? 'text-green-400' : 'text-red-400'}`}>
                          {booking.helmetProvided ? '✅' : '❌'} Helmet
                        </span>
                        <span className={`flex items-center gap-1 ${booking.aadharCardCollected ? 'text-green-400' : 'text-red-400'}`}>
                          {booking.aadharCardCollected ? '✅' : '❌'} Aadhar
                        </span>
                        <span className={`flex items-center gap-1 ${booking.vehicleInspected ? 'text-green-400' : 'text-red-400'}`}>
                          {booking.vehicleInspected ? '✅' : '❌'} Inspected
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <Link href={`/active-bookings/${booking.bookingId}`} className="flex-1">
                        <ThemedButton variant="secondary" className="w-full">
                          View Details
                        </ThemedButton>
                      </Link>
                      <Link href={`/return/${booking.bookingId}`} className="flex-1">
                        <ThemedButton variant="success" className="w-full">
                          Return Vehicle
                        </ThemedButton>
                      </Link>
                    </div>
                  </div>
                </ThemedCard>
              );
            })}
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex flex-col md:flex-row gap-4">
          <ThemedButton
            variant="primary"
            onClick={fetchActiveBookings}
            className="flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh Bookings
          </ThemedButton>
          <Link href="/booking" className="flex-1 md:flex-initial">
            <ThemedButton variant="success" className="w-full">
              + New Booking
            </ThemedButton>
          </Link>
          <Link href="/admin" className="flex-1 md:flex-initial">
            <ThemedButton variant="secondary" className="w-full">
              📊 Dashboard
            </ThemedButton>
          </Link>
        </div>
      </div>
    </ThemedLayout>
  );
}