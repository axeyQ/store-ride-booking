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
import { VehicleChangeModal } from '@/components/VehicleChangeModal';
import { CancellationModal } from '@/components/CancellationModal';
import { theme } from '@/lib/theme';
import { cn } from '@/lib/utils';

export default function ThemedActiveBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVehicle, setFilterVehicle] = useState('all');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentAmounts, setCurrentAmounts] = useState({});

  const [vehicleChangeModal, setVehicleChangeModal] = useState({
    isOpen: false,
    booking: null
  });

  const [cancellationModal, setCancellationModal] = useState({
    isOpen: false,
    booking: null
  });

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
        // ✅ DOUBLE-CHECK: Filter out any non-active bookings that might slip through
        const activeBookings = data.bookings.filter(booking => 
          booking.status === 'active' && booking.status !== 'cancelled'
        );
        console.log(`Received ${activeBookings.length} active bookings`);
        setBookings(activeBookings);
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
      const booking = bookings.find(b => b._id === bookingId);
      
      // ✅ NEW: Skip calculation if booking is somehow cancelled
      if (!booking || booking.status === 'cancelled') {
        console.warn(`Skipping amount calculation for cancelled/missing booking: ${bookingId}`);
        return 0;
      }
  
      const response = await fetch(`/api/bookings/current-amount/${bookingId}`);
      const data = await response.json();
      if (data.success) {
        return data.currentAmount;
      } else {
        console.error('Error fetching current amount for booking:', bookingId, data.error);
        // Fallback to simple calculation only for active bookings
        if (booking.status === 'active') {
          const duration = calculateDuration(booking.startTime);
          return Math.max(duration.totalHours * 80, 80); // Minimum 1 hour charge
        }
        return 0;
      }
    } catch (error) {
      console.error('Error fetching current amount:', error);
      // Fallback calculation only for active bookings
      const booking = bookings.find(b => b._id === bookingId);
      if (booking && booking.status === 'active') {
        const duration = calculateDuration(booking.startTime);
        return Math.max(duration.totalHours * 80, 80); // Minimum 1 hour charge
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

  // ✅ FIXED: Improved duration calculation to handle negative durations
  const calculateDuration = (startTime) => {
    try {
      const start = new Date(startTime);
      const current = new Date(currentTime);
      
      // Validate dates
      if (isNaN(start.getTime()) || isNaN(current.getTime())) {
        console.error('Invalid date detected:', { startTime, currentTime });
        return { hours: 0, minutes: 0, totalHours: 1 };
      }
      
      const diffMs = current.getTime() - start.getTime();
      
      // If negative (booking in future), return minimal values
      if (diffMs < 0) {
        console.warn('Booking is in future:', {
          start: start.toLocaleString('en-IN'),
          current: current.toLocaleString('en-IN')
        });
        return { hours: 0, minutes: 0, totalHours: 1 };
      }
      
      const totalMinutes = Math.floor(diffMs / (1000 * 60));
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      const totalHours = Math.max(1, Math.ceil(totalMinutes / 60)); // Minimum 1 hour
      
      return {
        hours,
        minutes,
        totalHours,
        totalMinutes
      };
    } catch (error) {
      console.error('Duration calculation error:', error);
      return { hours: 0, minutes: 0, totalHours: 1 };
    }
  };

  // ✅ ENHANCED: New vehicle change eligibility logic
  const getChangeEligibilityReason = (booking) => {
    try {
      const now = new Date();
      const startTime = new Date(booking.startTime);
      const createdAt = new Date(booking.createdAt);
      
      const minutesSinceStart = Math.floor((now - startTime) / (1000 * 60));
      const minutesSinceCreation = Math.floor((now - createdAt) / (1000 * 60));
      
      // If rental hasn't started yet
      if (now < startTime) {
        const minutesToStart = Math.floor((startTime - now) / (1000 * 60));
        return {
          canChange: true,
          reason: `Rental starts in ${minutesToStart}m`,
          timeframe: 'pre-start'
        };
      }
      
      // Within 30 minutes of rental start
      if (minutesSinceStart <= 30) {
        return {
          canChange: true,
          reason: `Within 30min of start (${minutesSinceStart}m ago)`,
          timeframe: 'early-rental'
        };
      }
      
      // Within 45 minutes of booking creation
      if (minutesSinceCreation <= 45) {
        return {
          canChange: true,
          reason: `Within 45min of booking (${minutesSinceCreation}m ago)`,
          timeframe: 'recent-booking'
        };
      }
      
      // Within first hour of rental
      if (minutesSinceStart <= 60) {
        return {
          canChange: true,
          reason: `Within first hour (${minutesSinceStart}m into rental)`,
          timeframe: 'first-hour'
        };
      }
      
      return {
        canChange: false,
        reason: `Too late (${minutesSinceStart}m into rental, ${minutesSinceCreation}m since booking)`,
        timeframe: 'expired'
      };
    } catch (error) {
      console.error('Error getting change eligibility reason:', error);
      return {
        canChange: false,
        reason: 'Error checking eligibility',
        timeframe: 'error'
      };
    }
  };

  // ✅ ENHANCED: Enhanced remaining time calculation
  const getChangeTimeRemaining = (booking) => {
    try {
      const now = new Date();
      const startTime = new Date(booking.startTime);
      const createdAt = new Date(booking.createdAt);
      
      const minutesSinceStart = Math.floor((now - startTime) / (1000 * 60));
      const minutesSinceCreation = Math.floor((now - createdAt) / (1000 * 60));
      
      // If rental hasn't started yet
      if (now < startTime) {
        const minutesToStart = Math.floor((startTime - now) / (1000 * 60));
        return Math.max(0, minutesToStart + 30); // 30 min grace after start
      }
      
      // Multiple time windows for flexibility
      const remainingFromStart = Math.max(0, 30 - minutesSinceStart); // 30 min from start
      const remainingFromCreation = Math.max(0, 45 - minutesSinceCreation); // 45 min from creation
      const remainingFirstHour = Math.max(0, 60 - minutesSinceStart); // 60 min from start
      
      // Return the maximum remaining time from any valid window
      return Math.max(remainingFromStart, remainingFromCreation, remainingFirstHour);
    } catch (error) {
      console.error('Error calculating remaining change time:', error);
      return 0;
    }
  };

  // ✅ NEW: Cancellation window check (2 hours from booking creation)
  const isWithinCancellationWindow = (booking) => {
    if (!booking?.createdAt) return false;
    const bookingTime = new Date(booking.createdAt);
    const twoHoursLater = new Date(bookingTime.getTime() + (2 * 60 * 60 * 1000));
    return new Date() <= twoHoursLater;
  };

  // ✅ NEW: Get remaining cancellation time
  const getCancellationTimeRemaining = (booking) => {
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

  // ✅ NEW: Vehicle Change Status Component
  const VehicleChangeStatus = ({ booking, detailed = false }) => {
    const eligibility = getChangeEligibilityReason(booking);
    const timeRemaining = getChangeTimeRemaining(booking);
    
    if (!eligibility.canChange) {
      return null;
    }
    
    const getStatusColor = (timeframe) => {
      switch (timeframe) {
        case 'pre-start': return 'blue';
        case 'early-rental': return 'green';
        case 'recent-booking': return 'yellow';
        case 'first-hour': return 'orange';
        default: return 'gray';
      }
    };
    
    const color = getStatusColor(eligibility.timeframe);
    
    if (detailed) {
      return (
        <div className={`text-xs bg-${color}-900/30 border border-${color}-700/50 text-${color}-300 px-3 py-2 rounded-lg`}>
          <div className="font-medium">✨ Vehicle change available</div>
          <div className="text-xs opacity-80">{eligibility.reason}</div>
          {timeRemaining > 0 && (
            <div className="text-xs opacity-60">{timeRemaining}min remaining</div>
          )}
        </div>
      );
    }
    
    return (
      <span className={`text-xs bg-${color}-900/30 border border-${color}-700/50 text-${color}-300 px-2 py-1 rounded`}>
        ✨ Change available ({timeRemaining}min left)
      </span>
    );
  };

  // ✅ NEW: Enhanced Vehicle Change Section
  const renderEnhancedVehicleChangeSection = (booking) => {
    const eligibility = getChangeEligibilityReason(booking);
    
    return (
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center justify-between">
          <span>Vehicle Change Status</span>
          {eligibility.canChange && (
            <span className="text-green-400 text-xs">✅ Eligible</span>
          )}
        </h4>
        
        {eligibility.canChange ? (
          <VehicleChangeStatus booking={booking} detailed={true} />
        ) : (
          <div className="text-xs bg-red-900/30 border border-red-700/50 text-red-300 px-3 py-2 rounded-lg">
            <div className="font-medium">❌ Vehicle change not available</div>
            <div className="text-xs opacity-80">{eligibility.reason}</div>
            <div className="text-xs opacity-60 mt-1">
              Changes allowed within first hour of rental or 45min of booking
            </div>
          </div>
        )}
      </div>
    );
  };

  // ✅ NEW: Enhanced Action Buttons
  const renderActionButtons = (booking, handlers) => {
    const eligibility = getChangeEligibilityReason(booking);
    const cancellationEligibility = isWithinCancellationWindow(booking);
    
    return (
      <div className="space-y-3">
        {/* Primary Action Row */}
        <div className="flex gap-3">
          <Link href={`/active-bookings/${booking.bookingId}`} className="flex-1">
            <ThemedButton variant="secondary" className="w-full">
              👁️ View Details
            </ThemedButton>
          </Link>
          
          <Link href={`/return/${booking.bookingId}`} className="flex-1">
            <ThemedButton variant="success" className="w-full">
              ✅ Process Return
            </ThemedButton>
          </Link>
        </div>

        {/* Secondary Action Row */}
        <div className="flex gap-2">
          {/* Enhanced Vehicle Change Button */}
          <ThemedButton 
            variant={eligibility.canChange ? "warning" : "secondary"}
            onClick={() => {
              if (eligibility.canChange) {
                handlers.openVehicleChange(booking);
              } else {
                alert(`Vehicle change not available: ${eligibility.reason}\n\nChanges are allowed:\n• Within 30 minutes of rental start\n• Within 45 minutes of booking creation\n• Within first hour of rental\n• Before rental starts`);
              }
            }}
            disabled={!eligibility.canChange}
            className={cn(
              "flex-1 text-sm",
              eligibility.canChange 
                ? "bg-orange-600 hover:bg-orange-700 text-white" 
                : "opacity-50 cursor-not-allowed bg-gray-600"
            )}
            title={eligibility.reason}
          >
            🔄 {eligibility.canChange ? "Change Vehicle" : "Change Unavailable"}
          </ThemedButton>
          
          {/* Cancellation Button */}
          <ThemedButton 
            variant="danger" 
            onClick={() => handlers.openCancellation(booking)}
            className="flex-1 text-sm"
          >
            {cancellationEligibility 
              ? "🚫 Cancel (Free)" 
              : "🚫 Cancel (Override)"
            }
          </ThemedButton>
        </div>
        
        {/* Debug info in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="text-xs text-gray-500 bg-gray-800/30 p-2 rounded">
            <div>Debug: {eligibility.reason}</div>
            <div>Timeframe: {eligibility.timeframe}</div>
            <div>Can change: {eligibility.canChange ? 'Yes' : 'No'}</div>
          </div>
        )}
      </div>
    );
  };

  // ✅ Vehicle change handlers
  const handleOpenVehicleChange = (booking) => {
    setVehicleChangeModal({
      isOpen: true,
      booking: booking
    });
  };

  const handleCloseVehicleChange = () => {
    setVehicleChangeModal({
      isOpen: false,
      booking: null
    });
  };

  const handleVehicleChanged = (updatedBooking) => {
    // Update the bookings list with the new vehicle information
    setBookings(prevBookings => 
      prevBookings.map(booking => 
        booking._id === updatedBooking._id ? updatedBooking : booking
      )
    );
    
    // Show success message
    alert(`Vehicle changed successfully to ${updatedBooking.vehicleId.model} (${updatedBooking.vehicleId.plateNumber})`);
    
    // Refresh amounts after vehicle change
    updateCurrentAmounts();
  };

  // ✅ NEW: Cancellation handlers
  const handleOpenCancellation = (booking) => {
    setCancellationModal({
      isOpen: true,
      booking: booking
    });
  };

  const handleCloseCancellation = () => {
    setCancellationModal({
      isOpen: false,
      booking: null
    });
  };

  const handleBookingCancelled = (cancelledBooking) => {
    // ✅ IMPROVED: Remove cancelled booking from active list immediately
    setBookings(prevBookings => 
      prevBookings.filter(booking => booking._id !== cancelledBooking._id)
    );
    
    // ✅ NEW: Also remove its revenue from current amounts
    setCurrentAmounts(prevAmounts => {
      const newAmounts = { ...prevAmounts };
      delete newAmounts[cancelledBooking._id];
      return newAmounts;
    });
    
    // Show success message
    alert(`Booking ${cancelledBooking.bookingId} has been cancelled successfully. Vehicle is now available.`);
    
    // Refresh amounts for remaining bookings
    updateCurrentAmounts();
  };

  const formatTime = (dateString) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      
      return date.toLocaleString('en-IN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Kolkata'
      });
    } catch (error) {
      console.error('Error formatting time:', error);
      return 'Invalid Date';
    }
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
                <p className="text-gray-400">Real-time rental monitoring with enhanced vehicle change options</p>
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

        {/* ✅ ENHANCED: Active Bookings Grid with new vehicle change logic */}
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
              
              // ✅ ENHANCED: Use the new vehicle change logic
              const eligibility = getChangeEligibilityReason(booking);
              const timeRemaining = getChangeTimeRemaining(booking);
              
              // Cancellation status (keep existing logic)
              const withinCancellationWindow = isWithinCancellationWindow(booking);
              const cancellationTimeRemaining = getCancellationTimeRemaining(booking);

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
                      <div className="flex flex-col items-end gap-2">
                        <ThemedBadge status="active">
                          🔴 LIVE
                        </ThemedBadge>
                        
                        {/* ✅ ENHANCED: Vehicle Change Status with better logic */}
                        {eligibility.canChange && timeRemaining > 0 && (
                          <VehicleChangeStatus booking={booking} />
                        )}
                        
                        {/* Cancellation Status (unchanged) */}
                        {withinCancellationWindow && cancellationTimeRemaining && (
                          <span className="text-xs text-blue-400 bg-blue-900/30 px-2 py-1 rounded border border-blue-700/50">
                            🚫 Free cancel ({cancellationTimeRemaining} left)
                          </span>
                        )}
                      </div>
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
                        <span className="text-gray-400">Created:</span>
                        <span className="font-medium text-white">{formatTime(booking.createdAt)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Base Rate:</span>
                        <span className="font-medium text-white">₹80/hour</span>
                      </div>
                    </div>

                    {/* ✅ NEW: Enhanced Vehicle Change Status Section */}
                    {renderEnhancedVehicleChangeSection(booking)}

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

                    {/* ✅ ENHANCED: Action Buttons with improved logic */}
                    {renderActionButtons(booking, {
                      openVehicleChange: handleOpenVehicleChange,
                      openCancellation: handleOpenCancellation
                    })}
                  </div>
                </ThemedCard>
              );
            })}
          </div>
        )}

        {/* Enhanced Quick Actions */}
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
          <Link href="/bookings/cancelled" className="flex-1 md:flex-initial">
            <ThemedButton variant="secondary" className="w-full">
              🚫 View Cancelled
            </ThemedButton>
          </Link>
          <Link href="/admin" className="flex-1 md:flex-initial">
            <ThemedButton variant="secondary" className="w-full">
              📊 Dashboard
            </ThemedButton>
          </Link>
        </div>
      </div>

      {/* ✅ Vehicle Change Modal */}
      <VehicleChangeModal
        isOpen={vehicleChangeModal.isOpen}
        onClose={handleCloseVehicleChange}
        booking={vehicleChangeModal.booking}
        onVehicleChanged={handleVehicleChanged}
      />

      {/* ✅ NEW: Cancellation Modal */}
      <CancellationModal
        isOpen={cancellationModal.isOpen}
        onClose={handleCloseCancellation}
        booking={cancellationModal.booking}
        onCancel={handleBookingCancelled}
      />
    </ThemedLayout>
  );
}