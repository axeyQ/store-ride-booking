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

// ✅ FIXED: Add custom package definitions
const CUSTOM_PACKAGES = {
  half_day: { 
    label: 'Half Day', 
    price: 800, 
    maxHours: 12, 
    icon: '🌅',
    color: 'orange'
  },
  full_day: { 
    label: 'Full Day', 
    price: 1200, 
    maxHours: 24, 
    icon: '☀️',
    color: 'yellow'
  },
  night: { 
    label: 'Night Package', 
    price: 600, 
    maxHours: 11, 
    icon: '🌙',
    color: 'purple'
  }
};

export default function ThemedAllBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showSignatures, setShowSignatures] = useState(true);
  const [selectedSignature, setSelectedSignature] = useState(null);
  const [advancedPricing, setAdvancedPricing] = useState({});
  const [pricingLoading, setPricingLoading] = useState({});
  const itemsPerPage = 20;

  useEffect(() => {
    fetchBookings();
  }, [currentPage, statusFilter, dateFilter, sortBy, sortOrder, searchTerm]);

  // Fetch pricing for all bookings (both advanced and custom)
  useEffect(() => {
    if (bookings.length > 0) {
      fetchPricingForBookings();
    }
  }, [bookings]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage,
        limit: itemsPerPage,
        search: searchTerm,
        status: statusFilter,
        dateFilter: dateFilter,
        sortBy: sortBy,
        sortOrder: sortOrder
      });

      const response = await fetch(`/api/admin/all-bookings?${params}`);
      const data = await response.json();

      if (data.success) {
        setBookings(data.bookings);
        setTotalPages(Math.ceil(data.total / itemsPerPage));
      } else {
        console.error('Error fetching bookings:', data.error);
        // Fallback to basic bookings API
        const fallbackResponse = await fetch('/api/bookings');
        const fallbackData = await fallbackResponse.json();
        if (fallbackData.success) {
          setBookings(fallbackData.bookings);
          setTotalPages(Math.ceil(fallbackData.bookings.length / itemsPerPage));
        }
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIXED: Separate pricing calculation for custom vs advanced bookings
  const fetchPricingForBookings = async () => {
    // Process bookings in batches to avoid overwhelming the API
    const batchSize = 5;
    const batches = [];
    
    for (let i = 0; i < bookings.length; i += batchSize) {
      batches.push(bookings.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      await Promise.all(
        batch.map(async (booking) => {
          await fetchPricingForBooking(booking._id);
        })
      );
      // Small delay between batches to prevent API overload
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  };

  // ✅ FIXED: Handle both custom and advanced pricing bookings
  const fetchPricingForBooking = async (bookingId) => {
    try {
      setPricingLoading(prev => ({ ...prev, [bookingId]: true }));
      
      const booking = bookings.find(b => b._id === bookingId);
      if (!booking) return;

      // ✅ Skip pricing calculation for cancelled bookings
      if (booking.status === 'cancelled') {
        setAdvancedPricing(prev => ({
          ...prev,
          [bookingId]: {
            totalAmount: 0,
            breakdown: [],
            totalMinutes: 0,
            summary: 'Cancelled - No charge',
            isCustomBooking: booking.isCustomBooking || false
          }
        }));
        return;
      }

      // ✅ NEW: Handle custom bookings with fixed package rates
      if (booking.isCustomBooking) {
        const packageInfo = CUSTOM_PACKAGES[booking.customBookingType];
        if (packageInfo) {
          // For custom bookings, use fixed package price + any final amount adjustments
          const basePrice = packageInfo.price;
          const finalAmount = booking.finalAmount || basePrice;
          
          setAdvancedPricing(prev => ({
            ...prev,
            [bookingId]: {
              totalAmount: finalAmount,
              breakdown: [{
                period: `${packageInfo.icon} ${packageInfo.label}`,
                minutes: packageInfo.maxHours * 60,
                rate: basePrice,
                isNightCharge: false,
                description: `Fixed package rate for ${packageInfo.label}`
              }],
              totalMinutes: packageInfo.maxHours * 60,
              summary: `${packageInfo.label} - Fixed Rate`,
              isCustomBooking: true,
              packageType: booking.customBookingType,
              packageInfo: packageInfo
            }
          }));
        } else {
          // Fallback for unknown custom booking types
          setAdvancedPricing(prev => ({
            ...prev,
            [bookingId]: {
              totalAmount: booking.finalAmount || 0,
              breakdown: [],
              totalMinutes: 0,
              summary: 'Custom booking - Unknown type',
              isCustomBooking: true
            }
          }));
        }
        return;
      }

      // ✅ For advanced pricing bookings, use existing logic
      if (booking.status === 'active') {
        const response = await fetch(`/api/bookings/current-amount/${bookingId}`);
        const data = await response.json();

        if (data.success) {
          setAdvancedPricing(prev => ({
            ...prev,
            [bookingId]: {
              totalAmount: data.currentAmount,
              breakdown: data.breakdown || [],
              totalMinutes: data.totalMinutes || 0,
              summary: data.summary || '',
              isCustomBooking: false
            }
          }));
        } else {
          // Fallback for active bookings
          const fallbackAmount = calculateSimpleAmount(booking);
          setAdvancedPricing(prev => ({
            ...prev,
            [bookingId]: {
              totalAmount: fallbackAmount,
              breakdown: [],
              totalMinutes: 0,
              summary: 'API error - simple calc',
              isCustomBooking: false
            }
          }));
        }
      } else if (booking.status === 'completed') {
        // For completed bookings, calculate advanced pricing directly
        const advancedAmount = calculateAdvancedPricingForCompleted(booking);
        advancedAmount.isCustomBooking = false;
        setAdvancedPricing(prev => ({
          ...prev,
          [bookingId]: advancedAmount
        }));
      }
    } catch (error) {
      console.error(`Error fetching pricing for booking ${bookingId}:`, error);
      // Fallback calculation
      const booking = bookings.find(b => b._id === bookingId);
      if (booking) {
        if (booking.status === 'cancelled') {
          setAdvancedPricing(prev => ({
            ...prev,
            [bookingId]: {
              totalAmount: 0,
              breakdown: [],
              totalMinutes: 0,
              summary: 'Cancelled - No charge',
              isCustomBooking: booking.isCustomBooking || false
            }
          }));
        } else {
          const fallbackAmount = calculateSimpleAmount(booking);
          setAdvancedPricing(prev => ({
            ...prev,
            [bookingId]: {
              totalAmount: fallbackAmount,
              breakdown: [],
              totalMinutes: 0,
              summary: 'Error - using fallback',
              isCustomBooking: booking.isCustomBooking || false
            }
          }));
        }
      }
    } finally {
      setPricingLoading(prev => ({ ...prev, [bookingId]: false }));
    }
  };

  const calculateAdvancedPricingForCompleted = (booking) => {
    try {
      // Advanced pricing settings (should match your API)
      const settings = {
        hourlyRate: 80,
        graceMinutes: 15,
        blockMinutes: 30,
        nightChargeTime: '22:30',
        nightMultiplier: 2
      };

      const startTime = new Date(booking.startTime);
      const endTime = booking.endTime ? new Date(booking.endTime) : new Date();
      const totalMinutes = Math.max(0, Math.floor((endTime - startTime) / (1000 * 60)));
      
      if (totalMinutes === 0) {
        return {
          totalAmount: 80, // Minimum charge
          breakdown: [],
          totalMinutes: 0,
          summary: 'No duration - minimum charge'
        };
      }

      const { hourlyRate, graceMinutes, blockMinutes, nightChargeTime, nightMultiplier } = settings;
      const halfRate = Math.round(hourlyRate / 2); // ₹40

      let totalAmount = 0;
      let breakdown = [];
      let remainingMinutes = totalMinutes;
      let currentTime = new Date(startTime);

      // First block: 60 minutes + 15 minutes grace = 75 minutes at ₹80
      const firstBlockMinutes = 60 + graceMinutes; // 75 minutes
      const firstBlockUsed = Math.min(remainingMinutes, firstBlockMinutes);
      
      // Check if first block crosses night charge time (22:30)
      const isFirstBlockNight = isNightCharge(currentTime, firstBlockUsed, nightChargeTime);
      const firstBlockRate = isFirstBlockNight ? hourlyRate * nightMultiplier : hourlyRate;

      breakdown.push({
        period: `First ${Math.floor(firstBlockMinutes/60)}h ${firstBlockMinutes%60}m`,
        minutes: firstBlockUsed,
        rate: firstBlockRate,
        isNightCharge: isFirstBlockNight
      });

      totalAmount += firstBlockRate;
      remainingMinutes -= firstBlockUsed;
      currentTime = new Date(currentTime.getTime() + firstBlockUsed * 60000);

      // Subsequent blocks: 30-minute blocks at ₹40 each
      let blockNumber = 2;
      while (remainingMinutes > 0) {
        const blockUsed = Math.min(remainingMinutes, blockMinutes);
        const isNight = isNightCharge(currentTime, blockUsed, nightChargeTime);
        const blockRate = isNight ? halfRate * nightMultiplier : halfRate;

        breakdown.push({
          period: `Block ${blockNumber} (${blockMinutes}min)`,
          minutes: blockUsed,
          rate: blockRate,
          isNightCharge: isNight
        });

        totalAmount += blockRate;
        remainingMinutes -= blockUsed;
        currentTime = new Date(currentTime.getTime() + blockUsed * 60000);
        blockNumber++;
      }

      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      const nightBlocks = breakdown.filter(b => b.isNightCharge).length;

      let summary = `${hours}h ${minutes}m total`;
      if (nightBlocks > 0) {
        summary += ` (${nightBlocks} night-rate blocks)`;
      }

      return {
        totalAmount,
        breakdown,
        totalMinutes,
        summary
      };

    } catch (error) {
      console.error('Error in advanced pricing calculation:', error);
      return {
        totalAmount: calculateSimpleAmount(booking),
        breakdown: [],
        totalMinutes: 0,
        summary: 'Calculation error - fallback'
      };
    }
  };

  // Helper function to check if a time block crosses night charge threshold
  const isNightCharge = (startTime, durationMinutes, nightChargeTime) => {
    try {
      const [nightHour, nightMinute] = nightChargeTime.split(':').map(Number);
      const blockEndTime = new Date(startTime.getTime() + durationMinutes * 60000);
      const nightThreshold = new Date(startTime);
      nightThreshold.setHours(nightHour, nightMinute, 0, 0);
      
      // Check if the block crosses or includes the night threshold
      return blockEndTime > nightThreshold && startTime < new Date(nightThreshold.getTime() + 60000);
    } catch (error) {
      return false;
    }
  };

  const calculateSimpleAmount = (booking) => {
    const startTime = new Date(booking.startTime);
    const endTime = booking.endTime ? new Date(booking.endTime) : new Date();
    const diffMs = endTime - startTime;
    const hours = Math.ceil(diffMs / (1000 * 60 * 60));
    return Math.max(hours * 80, 80); // Minimum ₹80
  };

  // ✅ FIXED: Get pricing amount based on booking type
  const getPricingAmount = (bookingId) => {
    const pricing = advancedPricing[bookingId];
    return pricing ? pricing.totalAmount : 0;
  };

  const isPricingLoading = (bookingId) => {
    return pricingLoading[bookingId] || false;
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  // ✅ FIXED: Updated calculateDuration to handle cancelled bookings
  const calculateDuration = (startTime, endTime, status) => {
    // ✅ NEW: Return special object for cancelled bookings
    if (status === 'cancelled') {
      return {
        hours: 0,
        minutes: 0,
        isCancelled: true,
        displayText: 'CANCELLED'
      };
    }

    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diffMs = end - start;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return { 
      hours, 
      minutes, 
      isCancelled: false,
      displayText: `${hours}h ${minutes}m`
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
    switch (status) {
      case 'active':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'completed':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'cancelled':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const SortIcon = ({ column }) => {
    if (sortBy !== column) return <span className="text-gray-500">↕</span>;
    return <span className="text-cyan-400">{sortOrder === 'asc' ? '↑' : '↓'}</span>;
  };

  // ✅ FIXED: Calculate stats with separate handling for custom/advanced bookings
  const calculateStats = () => {
    // Filter out cancelled bookings from revenue calculation
    const revenueBookings = bookings.filter(booking => booking.status !== 'cancelled');
    
    const totalAmount = revenueBookings.reduce((sum, booking) => {
      return sum + getPricingAmount(booking._id);
    }, 0);

    // ✅ NEW: Separate stats for booking types
    const customBookings = bookings.filter(b => b.isCustomBooking);
    const advancedBookings = bookings.filter(b => !b.isCustomBooking);

    return {
      totalBookings: bookings.length,
      activeRentals: bookings.filter(b => b.status === 'active').length,
      completed: bookings.filter(b => b.status === 'completed').length,
      cancelled: bookings.filter(b => b.status === 'cancelled').length,
      withSignatures: bookings.filter(b => b.signature).length,
      totalRevenue: totalAmount,
      customBookings: customBookings.length,
      advancedBookings: advancedBookings.length
    };
  };

  const stats = calculateStats();

  // Signature Modal Component - Themed Style
  const SignatureModal = ({ signature, onClose }) => {
    if (!signature) return null;

    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-white">Customer Signature</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-800 transition-all"
            >
              ×
            </button>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-600">
            <img
              src={signature}
              alt="Customer Signature"
              className="w-full h-auto max-h-80 object-contain"
            />
          </div>
          <div className="mt-6 flex justify-end">
            <ThemedButton variant="secondary" onClick={onClose}>
              Close
            </ThemedButton>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <ThemedLayout>
        <div className="min-h-screen flex items-center justify-center">
          <ThemedCard>
            <div className="flex items-center space-x-3 p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
              <span className="text-white text-xl">Loading all bookings...</span>
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
            All <span className={theme.typography.gradient}>Bookings</span>
          </h2>
          <p className={`${theme.typography.subtitle} max-w-2xl mx-auto mt-4`}>
            Complete booking management with dual pricing system (Advanced + Custom Packages)
          </p>
        </div>

        {/* ✅ ENHANCED: Updated Stats Row with booking type breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <ThemedStatsCard
            title="Total Bookings"
            value={stats.totalBookings}
            subtitle={`${stats.advancedBookings} Advanced + ${stats.customBookings} Custom`}
            colorScheme="bookings"
            icon={<div className="text-4xl mb-2">📋</div>}
          />
          
          <ThemedStatsCard
            title="Active Rentals"
            value={stats.activeRentals}
            subtitle="Currently out"
            colorScheme="revenue"
            icon={<div className="text-4xl mb-2">🚴</div>}
          />
          
          <ThemedStatsCard
            title="Completed"
            value={stats.completed}
            subtitle="Successfully returned"
            colorScheme="customers"
            icon={<div className="text-4xl mb-2">✅</div>}
          />

          <ThemedStatsCard
            title="Total Revenue"
            value={`₹${stats.totalRevenue.toLocaleString('en-IN')}`}
            subtitle="Both pricing systems"
            colorScheme="revenue"
            icon={<div className="text-4xl mb-2">💰</div>}
          />
        </div>

        {/* Filters Section */}
        <ThemedCard title="Search & Filters" description="Find specific bookings quickly" className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-4">
            <ThemedInput
              label="Search Bookings"
              placeholder="Booking ID, customer name, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            
            <ThemedSelect
              label="Status Filter"
              value={statusFilter}
              onValueChange={(value) => { setStatusFilter(value); setCurrentPage(1); }}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'active', label: 'Active' },
                { value: 'completed', label: 'Completed' },
                { value: 'cancelled', label: 'Cancelled' }
              ]}
            />

            <ThemedSelect
              label="Date Range"
              value={dateFilter}
              onValueChange={(value) => { setDateFilter(value); setCurrentPage(1); }}
              options={[
                { value: 'all', label: 'All Time' },
                { value: 'today', label: 'Today' },
                { value: 'week', label: 'This Week' },
                { value: 'month', label: 'This Month' }
              ]}
            />

            <div className="space-y-2">
              <label className="block text-lg font-semibold text-white">Options</label>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showSignatures}
                  onChange={(e) => setShowSignatures(e.target.checked)}
                  className="w-5 h-5 text-cyan-600 border-gray-600 rounded focus:ring-cyan-500 bg-gray-800"
                />
                <span className="text-white">Show Signatures</span>
              </label>
            </div>
          </div>

          <div className="flex gap-4">
            <ThemedButton
              variant="secondary"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setDateFilter('all');
                setCurrentPage(1);
              }}
            >
              Clear Filters
            </ThemedButton>
            <ThemedButton variant="primary" onClick={fetchBookings}>
              🔄 Refresh
            </ThemedButton>
          </div>
        </ThemedCard>

        {/* Bookings Table */}
        <ThemedCard title="📋 Booking Records" description={`Showing ${bookings.length} bookings with dual pricing system`}>
          {bookings.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-2xl font-bold text-white mb-4">No Bookings Found</h3>
              <p className="text-gray-400 mb-8">
                {searchTerm || statusFilter !== 'all' || dateFilter !== 'all'
                  ? 'Try adjusting your search or filter criteria'
                  : 'No bookings have been created yet'}
              </p>
              <Link href="/booking">
                <ThemedButton variant="primary">
                  ➕ Create First Booking
                </ThemedButton>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th
                      className="text-left py-4 px-4 font-semibold text-gray-400 cursor-pointer hover:text-cyan-400 transition-colors"
                      onClick={() => handleSort('bookingId')}
                    >
                      <div className="flex items-center gap-2">
                        Booking ID <SortIcon column="bookingId" />
                      </div>
                    </th>
                    <th
                      className="text-left py-4 px-4 font-semibold text-gray-400 cursor-pointer hover:text-cyan-400 transition-colors"
                      onClick={() => handleSort('customerId.name')}
                    >
                      <div className="flex items-center gap-2">
                        Customer <SortIcon column="customerId.name" />
                      </div>
                    </th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-400">
                      Vehicle
                    </th>
                    <th
                      className="text-left py-4 px-4 font-semibold text-gray-400 cursor-pointer hover:text-cyan-400 transition-colors"
                      onClick={() => handleSort('startTime')}
                    >
                      <div className="flex items-center gap-2">
                        Start Time <SortIcon column="startTime" />
                      </div>
                    </th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-400">
                      Duration/Package
                    </th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-400">
                      Status
                    </th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-400">
                      Amount
                    </th>
                    {showSignatures && (
                      <th className="text-left py-4 px-4 font-semibold text-gray-400">
                        Signature
                      </th>
                    )}
                    <th className="text-left py-4 px-4 font-semibold text-gray-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {bookings.map((booking) => {
                    const duration = calculateDuration(booking.startTime, booking.endTime, booking.status);
                    const pricingAmount = getPricingAmount(booking._id);
                    const isLoadingPrice = isPricingLoading(booking._id);
                    const pricingData = advancedPricing[booking._id];

                    return (
                      <tr key={booking._id} className="hover:bg-gray-800/30 transition-colors">
                        <td className="py-4 px-4">
                          <div className="font-mono font-bold text-cyan-400">
                            {booking.bookingId}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="font-semibold text-white">
                            {booking.customerId?.name || 'Unknown'}
                          </div>
                          <div className="text-gray-400 text-sm">
                            {booking.customerId?.phone || ''}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-white font-medium">
                            {booking.vehicleId?.model || 'Unknown'}
                          </div>
                          <div className="text-gray-400 text-sm font-mono">
                            {booking.vehicleId?.plateNumber || ''}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-white">
                          {formatDateTime(booking.startTime)}
                        </td>
                        <td className="py-4 px-4">
                          {/* ✅ ENHANCED: Show package info for custom bookings */}
                          {duration.isCancelled ? (
                            <div className="text-red-400 font-semibold">
                              CANCELLED
                            </div>
                          ) : booking.isCustomBooking ? (
                            <div>
                              <div className="flex items-center gap-2 text-white font-semibold">
                                {pricingData?.packageInfo?.icon} {pricingData?.packageInfo?.label || 'Custom Package'}
                              </div>
                              <div className="text-purple-400 text-sm">
                                Fixed Rate Package
                              </div>
                              {booking.status === 'active' && (
                                <div className="text-orange-400 text-sm flex items-center gap-1">
                                  <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                                  Active
                                </div>
                              )}
                            </div>
                          ) : (
                            <div>
                              <div className="text-white font-semibold">
                                {duration.displayText}
                              </div>
                              <div className="text-cyan-400 text-sm">
                                Advanced Pricing
                              </div>
                              {booking.status === 'active' && (
                                <div className="text-orange-400 text-sm flex items-center gap-1">
                                  <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                                  Live
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <ThemedBadge className={`${getStatusBadge(booking.status)} border`}>
                            {booking.status.toUpperCase()}
                          </ThemedBadge>
                        </td>
                        <td className="py-4 px-4">
                          {booking.status === 'cancelled' ? (
                            <div>
                              <div className="text-red-400 font-bold text-lg">
                                CANCELLED
                              </div>
                              <div className="text-red-300 text-xs">
                                No charge
                              </div>
                            </div>
                          ) : isLoadingPrice ? (
                            <div className="flex items-center gap-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-400"></div>
                              <span className="text-gray-400 text-sm">Calculating...</span>
                            </div>
                          ) : (
                            <div>
                              <div className="text-white font-bold text-lg">
                                ₹{pricingAmount.toLocaleString('en-IN')}
                              </div>
                              {/* ✅ ENHANCED: Different labels for custom vs advanced pricing */}
                              {booking.isCustomBooking ? (
                                <div className="text-purple-400 text-xs">
                                  📦 Fixed Package
                                </div>
                              ) : (
                                <div className="text-cyan-400 text-xs">
                                  {booking.status === 'active' ? '🔄 Live Advanced' : '🧮 Advanced Calc'}
                                </div>
                              )}
                              {booking.paymentMethod && (
                                <div className="text-gray-400 text-sm capitalize">
                                  {booking.paymentMethod}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        {showSignatures && (
                          <td className="py-4 px-4">
                            {booking.signature ? (
                              <div className="flex items-center gap-3">
                                {/* Signature Thumbnail */}
                                <div
                                  className="w-20 h-10 border border-gray-600 rounded-lg cursor-pointer hover:border-cyan-500 bg-white/5 flex items-center justify-center group transition-all relative"
                                  onClick={() => setSelectedSignature(booking.signature)}
                                  title="Click to view full signature"
                                >
                                  <img
                                    src={booking.signature}
                                    alt="Signature"
                                    className="w-full h-full object-contain p-1"
                                  />
                                  {/* Hover overlay */}
                                  <div className="absolute inset-0 bg-cyan-500/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all rounded-lg">
                                    <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                  </div>
                                </div>
                                {/* View Button */}
                                <ThemedButton
                                  variant="secondary"
                                  className="text-xs px-3 py-1"
                                  onClick={() => setSelectedSignature(booking.signature)}
                                >
                                  View
                                </ThemedButton>
                              </div>
                            ) : (
                              <div className="text-gray-500 text-sm italic">
                                No signature
                              </div>
                            )}
                          </td>
                        )}
                        <td className="py-4 px-4">
                          <div className="flex gap-2">
                            <Link href={`/active-bookings/${booking.bookingId}`}>
                              <ThemedButton variant="secondary" className="text-xs px-3 py-1">
                                View
                              </ThemedButton>
                            </Link>
                            {booking.status === 'active' && (
                              <Link href={`/return/${booking.bookingId}`}>
                                <ThemedButton variant="success" className="text-xs px-3 py-1">
                                  Return
                                </ThemedButton>
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-700">
              <div className="text-gray-400">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex gap-2">
                <ThemedButton
                  variant="secondary"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className={currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}
                >
                  Previous
                </ThemedButton>

                {/* Page numbers */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                  return (
                    <ThemedButton
                      key={page}
                      variant={page === currentPage ? "primary" : "secondary"}
                      onClick={() => setCurrentPage(page)}
                      className="px-3"
                    >
                      {page}
                    </ThemedButton>
                  );
                })}

                <ThemedButton
                  variant="secondary"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className={currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''}
                >
                  Next
                </ThemedButton>
              </div>
            </div>
          )}
        </ThemedCard>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
          <Link href="/booking">
            <ThemedButton variant="primary" className="w-full">
              ➕ New Booking
            </ThemedButton>
          </Link>
          
          <Link href="/active-bookings">
            <ThemedButton variant="success" className="w-full">
              🔄 Active Rentals
            </ThemedButton>
          </Link>
          <Link href="/admin">
            <ThemedButton variant="secondary" className="w-full">
              📊 Dashboard
            </ThemedButton>
          </Link>
          <Link href="/customers">
            <ThemedButton variant="secondary" className="w-full">
              👥 Customers
            </ThemedButton>
          </Link>
        </div>
      </div>

      {/* Signature Modal */}
      <SignatureModal
        signature={selectedSignature}
        onClose={() => setSelectedSignature(null)}
      />
    </ThemedLayout>
  );
}