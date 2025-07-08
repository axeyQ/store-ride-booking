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

export default function ThemedBookingDetailsPage() {
  const params = useParams();
  const bookingId = params.bookingId;
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Advanced pricing state
  const [advancedPricing, setAdvancedPricing] = useState({
    totalAmount: 0,
    rawAmount: 0,
    discountAmount: 0,
    additionalCharges: 0,
    breakdown: [],
    totalMinutes: 0,
    summary: '',
    hasAdjustments: false
  });

  useEffect(() => {
    if (bookingId) {
      fetchBookingDetails();
    }
    // Update current time every minute
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timeInterval);
  }, [bookingId]);

  // Fetch advanced pricing when booking is loaded or time updates
  useEffect(() => {
    if (booking) {
      fetchAdvancedPricing();
      // Only update pricing every minute for active bookings
      if (booking.status === 'active') {
        const pricingInterval = setInterval(fetchAdvancedPricing, 60000);
        return () => clearInterval(pricingInterval);
      }
    }
  }, [booking, currentTime]);

  const fetchBookingDetails = async () => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}`);
      const data = await response.json();

      if (data.success) {
        setBooking(data.booking);
      } else {
        setError(data.error || 'Booking not found');
      }
    } catch (error) {
      console.error('Error fetching booking:', error);
      setError('Failed to load booking details');
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIXED: Fetch advanced pricing with discount adjustments
  const fetchAdvancedPricing = async () => {
    if (!booking) return;
    
    // ✅ Skip pricing calculation for cancelled bookings
    if (booking.status === 'cancelled') {
      setAdvancedPricing({
        totalAmount: 0,
        rawAmount: 0,
        discountAmount: 0,
        additionalCharges: 0,
        breakdown: [],
        totalMinutes: 0,
        summary: 'Cancelled - No charge',
        hasAdjustments: false
      });
      return;
    }
  
    // ✅ Handle Custom Bookings with Fixed Pricing + Adjustments
    if (booking.isCustomBooking) {
      const duration = calculateDuration(booking.startTime, 
        booking.status === 'active' ? currentTime : 
        (booking.endTime ? new Date(booking.endTime) : new Date()), 
        booking.status
      );
      
      // Get package base rate and apply adjustments
      const packageRates = { half_day: 800, full_day: 1200, night: 600 };
      const basePackageRate = packageRates[booking.customBookingType] || 800;
      const discountAmount = booking.discountAmount || 0;
      const additionalCharges = booking.additionalCharges || 0;
      const finalPackageAmount = Math.max(0, basePackageRate - discountAmount + additionalCharges);
      
      setAdvancedPricing({
        totalAmount: finalPackageAmount,
        rawAmount: basePackageRate,
        discountAmount: discountAmount,
        additionalCharges: additionalCharges,
        breakdown: [{
          period: `${booking.customBookingLabel || booking.customBookingType} Package`,
          minutes: duration.totalMinutes,
          rate: basePackageRate,
          isCustomPackage: true,
          description: `Fixed rate package - ${booking.customBookingType}`
        }],
        totalMinutes: duration.totalMinutes,
        summary: `${booking.customBookingLabel || booking.customBookingType} - Fixed Rate Package${discountAmount > 0 || additionalCharges > 0 ? ' (adjusted)' : ''}`,
        hasAdjustments: discountAmount > 0 || additionalCharges > 0
      });
      return;
    }
  
    try {
      // ✅ CRITICAL FIX: Only call current-amount API for ACTIVE bookings
      if (booking.status === 'active') {
        console.log(`🔄 Fetching live pricing for active booking ${booking.bookingId}`);
        const response = await fetch(`/api/bookings/current-amount/${booking._id}`);
        const data = await response.json();
        
        if (data.success) {
          // ✅ Apply stored adjustments to active booking pricing
          const rawAmount = data.currentAmount;
          const discountAmount = booking.discountAmount || 0;
          const additionalCharges = booking.additionalCharges || 0;
          const adjustedAmount = Math.max(0, rawAmount - discountAmount + additionalCharges);
          
          console.log(`✅ Active booking pricing:`, {
            rawAmount,
            discountAmount,
            additionalCharges,
            adjustedAmount
          });
          
          setAdvancedPricing({
            totalAmount: adjustedAmount,
            rawAmount: rawAmount,
            discountAmount: discountAmount,
            additionalCharges: additionalCharges,
            breakdown: data.breakdown || [],
            totalMinutes: data.totalMinutes || 0,
            summary: `${data.summary || ''}${discountAmount > 0 || additionalCharges > 0 ? ' (adjusted)' : ''}`,
            hasAdjustments: discountAmount > 0 || additionalCharges > 0
          });
        } else {
          console.error('❌ Error fetching live pricing:', data.error);
          // Fallback to simple calculation for active bookings
          const duration = calculateDuration(booking.startTime, currentTime, booking.status);
          const baseAmount = duration.totalHours * 80;
          const discountAmount = booking.discountAmount || 0;
          const additionalCharges = booking.additionalCharges || 0;
          const adjustedAmount = Math.max(0, baseAmount - discountAmount + additionalCharges);
          
          setAdvancedPricing({
            totalAmount: adjustedAmount,
            rawAmount: baseAmount,
            discountAmount: discountAmount,
            additionalCharges: additionalCharges,
            breakdown: [],
            totalMinutes: duration.totalMinutes,
            summary: `${duration.hours}h ${duration.minutes}m (API error - fallback${discountAmount > 0 || additionalCharges > 0 ? ' + adjustments' : ''})`,
            hasAdjustments: discountAmount > 0 || additionalCharges > 0
          });
        }
      } else {
        // ✅ For completed/other status bookings, calculate advanced pricing with adjustments
        console.log(`📊 Calculating completed booking pricing for ${booking.bookingId} (status: ${booking.status})`);
        const advancedAmount = calculateAdvancedPricingForCompleted(booking);
        setAdvancedPricing(advancedAmount);
      }
    } catch (error) {
      console.error('Error fetching advanced pricing:', error);
      // Fallback to simple calculation for non-cancelled bookings
      if (booking.status !== 'cancelled') {
        const duration = calculateDuration(booking.startTime, currentTime, booking.status);
        const baseAmount = duration.totalHours * 80;
        const discountAmount = booking.discountAmount || 0;
        const additionalCharges = booking.additionalCharges || 0;
        const adjustedAmount = Math.max(0, baseAmount - discountAmount + additionalCharges);
        
        setAdvancedPricing({
          totalAmount: adjustedAmount,
          rawAmount: baseAmount,
          discountAmount: discountAmount,
          additionalCharges: additionalCharges,
          breakdown: [],
          totalMinutes: duration.totalMinutes,
          summary: `${duration.hours}h ${duration.minutes}m (error - fallback${discountAmount > 0 || additionalCharges > 0 ? ' + adjustments' : ''})`,
          hasAdjustments: discountAmount > 0 || additionalCharges > 0
        });
      }
    }
  };

  // ✅ FIXED: Advanced pricing calculation that applies stored discounts
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
      
      // ✅ Get stored adjustments
      const discountAmount = booking.discountAmount || 0;
      const additionalCharges = booking.additionalCharges || 0;
      
      if (totalMinutes === 0) {
        const rawAmount = 80;
        const finalAmount = Math.max(0, rawAmount - discountAmount + additionalCharges);
        return {
          totalAmount: finalAmount,
          rawAmount: rawAmount,
          discountAmount: discountAmount,
          additionalCharges: additionalCharges,
          breakdown: [],
          totalMinutes: 0,
          summary: `No duration - minimum charge${discountAmount > 0 || additionalCharges > 0 ? ' (adjusted)' : ''}`,
          hasAdjustments: discountAmount > 0 || additionalCharges > 0
        };
      }

      const { hourlyRate, graceMinutes, blockMinutes, nightChargeTime, nightMultiplier } = settings;
      const halfRate = Math.round(hourlyRate / 2); // ₹40

      let rawTotalAmount = 0;
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

      rawTotalAmount += firstBlockRate;
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

        rawTotalAmount += blockRate;
        remainingMinutes -= blockUsed;
        currentTime = new Date(currentTime.getTime() + blockUsed * 60000);
        blockNumber++;
      }

      // ✅ CRITICAL FIX: Apply stored discounts and additional charges
      const finalTotalAmount = Math.max(0, rawTotalAmount - discountAmount + additionalCharges);

      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      const nightBlocks = breakdown.filter(b => b.isNightCharge).length;

      let summary = `${hours}h ${minutes}m total`;
      if (nightBlocks > 0) {
        summary += ` (${nightBlocks} night-rate blocks)`;
      }
      
      // ✅ Add adjustment summary
      if (discountAmount > 0 || additionalCharges > 0) {
        const adjustments = [];
        if (discountAmount > 0) adjustments.push(`-₹${discountAmount} discount`);
        if (additionalCharges > 0) adjustments.push(`+₹${additionalCharges} additional`);
        summary += ` • ${adjustments.join(', ')}`;
      }

      return {
        totalAmount: finalTotalAmount,  // ✅ Final amount after adjustments
        rawAmount: rawTotalAmount,      // ✅ Raw calculated amount
        discountAmount: discountAmount, // ✅ Applied discount
        additionalCharges: additionalCharges, // ✅ Additional charges
        breakdown: breakdown,
        totalMinutes: totalMinutes,
        summary: summary,
        hasAdjustments: discountAmount > 0 || additionalCharges > 0
      };

    } catch (error) {
      console.error('Error in advanced pricing calculation:', error);
      
      // ✅ Even in fallback, apply adjustments
      const duration = calculateDuration(booking.startTime, booking.endTime ? new Date(booking.endTime) : new Date());
      const fallbackAmount = duration.totalHours * 80;
      const discountAmount = booking.discountAmount || 0;
      const additionalCharges = booking.additionalCharges || 0;
      const finalAmount = Math.max(0, fallbackAmount - discountAmount + additionalCharges);
      
      return {
        totalAmount: finalAmount,
        rawAmount: fallbackAmount,
        discountAmount: discountAmount,
        additionalCharges: additionalCharges,
        breakdown: [],
        totalMinutes: duration.totalMinutes,
        summary: 'Calculation error - fallback with adjustments',
        hasAdjustments: discountAmount > 0 || additionalCharges > 0
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

  const calculateDuration = (startTime, endTime = currentTime, status) => {
    // ✅ Return special object for cancelled bookings
    if (status === 'cancelled') {
      return {
        hours: 0,
        minutes: 0,
        seconds: 0,
        totalHours: 0,
        totalMinutes: 0,
        isCancelled: true,
        displayText: 'CANCELLED'
      };
    }
  
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end - start;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
    
    return {
      hours,
      minutes,
      seconds,
      totalHours: Math.ceil(diffMs / (1000 * 60 * 60)),
      totalMinutes: Math.floor(diffMs / (1000 * 60)),
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

  if (loading) {
    return (
      <ThemedLayout>
        <div className="min-h-screen flex items-center justify-center">
          <ThemedCard>
            <div className="flex items-center space-x-3 p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
              <span className="text-white text-xl">Loading booking details...</span>
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
            <Link href="/active-bookings">
              <ThemedButton variant="primary">
                ← Back to Active Bookings
              </ThemedButton>
            </Link>
          </ThemedCard>
        </div>
      </ThemedLayout>
    );
  }

  // Calculate duration based on booking status
  const duration = booking.status === 'cancelled' 
  ? calculateDuration(booking.startTime, booking.endTime, 'cancelled')
  : booking.status === 'active'
    ? calculateDuration(booking.startTime, currentTime, booking.status)
    : calculateDuration(booking.startTime, booking.endTime ? new Date(booking.endTime) : new Date(), booking.status);

const isActive = booking.status === 'active';
const isCancelled = booking.status === 'cancelled';
  const statusBadge = isActive ? '🔴 LIVE' : `✅ ${booking.status.toUpperCase()}`;

  return (
    <ThemedLayout>
      <div className="container mx-auto px-6 py-8">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <h2 className={theme.typography.hero}>
            Booking <span className={theme.typography.gradient}>Details</span>
          </h2>
          <p className={`${theme.typography.subtitle} max-w-2xl mx-auto mt-4`}>
            {isActive ? 'Live monitoring and management' : 'Completed booking details'} of rental #{booking.bookingId}
          </p>
        </div>

        {/* Navigation Breadcrumb */}
        <ThemedCard className="mb-8">
          <div className="flex items-center justify-between p-6">
            <div className="flex items-center space-x-4">
              <Link href="/active-bookings" className="text-cyan-400 hover:text-cyan-300 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  {isActive ? 'Live' : 'Completed'} Booking #{booking.bookingId}
                </h1>
                <p className="text-gray-400">Customer: {booking.customerId.name}</p>
              </div>
            </div>
            <ThemedBadge 
              status={booking.status} 
              className={cn(
                "text-lg px-4 py-2",
                isActive ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-green-500/20 text-green-400 border-green-500/30"
              )}
            >
              {statusBadge}
            </ThemedBadge>
          </div>
        </ThemedCard>

        {/* ✅ FIXED: Real-time Stats Dashboard with discount adjustments */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl shadow-lg p-8 mb-8">
          <div className="text-center mb-6">
            <h3 className="text-3xl font-bold mb-2">
              {isActive ? 'Live Rental Status' : 'Completed Rental Summary'}
            </h3>
            <p className="text-blue-100">{booking.vehicleId.model} - {booking.vehicleId.plateNumber}</p>
            {booking.isCustomBooking && (
              <div className="mt-2">
                <span className="bg-purple-500/20 text-purple-200 px-3 py-1 rounded-full text-sm">
                  📦 {booking.customBookingLabel || `${booking.customBookingType} Package`}
                </span>
              </div>
            )}
          </div>
          <div className={theme.layout.grid.stats}>
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">
                {isCancelled ? 'CANCELLED' : `${duration.hours}h ${duration.minutes}m`}
              </div>
              <div className="text-blue-100">{isActive ? 'Current Duration' : 'Total Duration'}</div>
              <div className="text-xs text-blue-200 mt-1">
                {isCancelled ? 'No charge applied' : `${duration.totalMinutes.toLocaleString()} minutes total`}
              </div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">
                ₹{isCancelled ? 0 : advancedPricing.totalAmount.toLocaleString('en-IN')}
              </div>
              <div className="text-blue-100">
                {isCancelled ? 'No Charge' : booking.isCustomBooking ? 'Package Price' : 'Advanced Pricing'}
              </div>
              <div className="text-xs text-blue-200 mt-1">
                {isCancelled ? 'Booking cancelled' : booking.isCustomBooking ? 'Fixed rate package' : isActive ? 'Live calculated' : 'Final amount'}
                {/* ✅ NEW: Show adjustment indicator */}
                {!isCancelled && advancedPricing.hasAdjustments && (
                  <span className="ml-2 text-yellow-300">• Adjusted</span>
                )}
              </div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">
                {booking.isCustomBooking ? `₹${advancedPricing.rawAmount?.toLocaleString('en-IN')}` : '₹80'}
              </div>
              <div className="text-blue-100">
                {booking.isCustomBooking ? 'Package Rate' : 'Base Rate'}
              </div>
              <div className="text-xs text-blue-200 mt-1">
                {booking.isCustomBooking ? 'Before adjustments' : 'First hour + grace'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">
                {isActive ? currentTime.toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true
                }) : formatDateTime(booking.endTime || booking.createdAt).split(',')[1]}
              </div>
              <div className="text-blue-100">{isActive ? 'Current Time' : 'End Time'}</div>
              <div className="text-xs text-blue-200 mt-1">{isActive ? 'Live clock' : 'Completed'}</div>
            </div>
          </div>
          
          {/* ✅ NEW: Show discount breakdown in header if adjustments exist */}
          {!isCancelled && advancedPricing.hasAdjustments && (
            <div className="mt-6 pt-4 border-t border-blue-400/30">
              <div className="text-center">
                <h4 className="text-lg font-semibold text-blue-100 mb-3">Applied Adjustments</h4>
                <div className="flex justify-center gap-6 text-sm">
                  {advancedPricing.discountAmount > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-green-300">Discount:</span>
                      <span className="font-semibold text-green-200">-₹{advancedPricing.discountAmount.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {advancedPricing.additionalCharges > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-red-300">Additional:</span>
                      <span className="font-semibold text-red-200">+₹{advancedPricing.additionalCharges.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-blue-200">Raw Amount:</span>
                    <span className="font-semibold text-blue-100">₹{advancedPricing.rawAmount?.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Customer Information */}
          <ThemedCard title="Customer Information" description="Verified customer details">
            <div className="space-y-6">
              <div className="bg-gray-800/50 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-gray-400 text-sm">Full Name</span>
                    <p className="text-xl font-semibold text-white">{booking.customerId.name}</p>
                  </div>
                  <div>
                    <span className="text-gray-400 text-sm">Phone Number</span>
                    <p className="text-xl font-semibold text-white">{booking.customerId.phone}</p>
                  </div>
                  <div>
                    <span className="text-gray-400 text-sm">Driver License</span>
                    <p className="text-xl font-mono font-semibold text-white">{booking.customerId.driverLicense}</p>
                  </div>
                  <div>
                    <span className="text-gray-400 text-sm">Booking ID</span>
                    <p className="text-xl font-mono font-semibold text-cyan-400">{booking.bookingId}</p>
                  </div>
                </div>
              </div>
            </div>
          </ThemedCard>

          {/* Vehicle Information */}
          <ThemedCard title="Vehicle Information" description="Assigned vehicle details">
            <div className="space-y-6">
              <div className="bg-gray-800/50 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-gray-400 text-sm">Vehicle Type</span>
                    <p className="text-xl font-semibold text-white capitalize">{booking.vehicleId.type}</p>
                  </div>
                  <div>
                    <span className="text-gray-400 text-sm">Model</span>
                    <p className="text-xl font-semibold text-white">{booking.vehicleId.model}</p>
                  </div>
                  <div>
                    <span className="text-gray-400 text-sm">Plate Number</span>
                    <p className="text-xl font-mono font-semibold text-white">{booking.vehicleId.plateNumber}</p>
                  </div>
                  <div>
                    <span className="text-gray-400 text-sm">Status</span>
                    <ThemedBadge 
                      status={isActive ? "rented" : "available"} 
                      className="mt-1"
                    >
                      {isActive ? '🔄 RENTED' : '✅ AVAILABLE'}
                    </ThemedBadge>
                  </div>
                </div>
              </div>
            </div>
          </ThemedCard>
        </div>

        {/* Timing Information */}
        <ThemedCard title="Timing Information" description="Rental duration and billing details" className="mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-gradient-to-r from-green-900/50 to-green-800/50 border border-green-700/50 rounded-lg p-6 text-center">
              <div className="text-2xl font-bold text-green-400 mb-2">
                {formatDateTime(booking.startTime)}
              </div>
              <div className="text-green-200 text-sm">Start Time</div>
            </div>
            <div className="bg-gradient-to-r from-blue-900/50 to-blue-800/50 border border-blue-700/50 rounded-lg p-6 text-center">
              <div className="text-2xl font-bold text-blue-400 mb-2">
                {duration.hours}h {duration.minutes}m
              </div>
              <div className="text-blue-200 text-sm">{isActive ? 'Live Duration' : 'Total Duration'}</div>
            </div>
            <div className="bg-gradient-to-r from-purple-900/50 to-purple-800/50 border border-purple-700/50 rounded-lg p-6 text-center">
              <div className="text-2xl font-bold text-purple-400 mb-2">
                {duration.totalMinutes.toLocaleString()} min
              </div>
              <div className="text-purple-200 text-sm">Total Minutes</div>
            </div>
          </div>
        </ThemedCard>

        {/* ✅ ENHANCED: Advanced Pricing Breakdown with discount details */}
        {advancedPricing.breakdown && advancedPricing.breakdown.length > 0 && (
          <ThemedCard 
            title={booking.isCustomBooking ? "Custom Package Details" : "Advanced Pricing Breakdown"} 
            description={booking.isCustomBooking ? "Fixed rate package information" : "Detailed billing calculation with adjustments"} 
            className="mb-8"
          >
            <div className={cn(
              "border border-opacity-50 rounded-lg p-6",
              booking.isCustomBooking 
                ? "bg-gradient-to-r from-purple-900/50 to-purple-800/50 border-purple-700/50"
                : "bg-gradient-to-r from-blue-900/50 to-blue-800/50 border-blue-700/50"
            )}>
              <h4 className={cn(
                "text-xl font-bold mb-4 text-center",
                booking.isCustomBooking ? "text-purple-200" : "text-blue-200"
              )}>
                {booking.isCustomBooking ? "📦 Custom Package Information" : "📊 Pricing Calculation Details"}
              </h4>
              
              {booking.isCustomBooking ? (
                /* Custom Package Display with adjustments */
                <div className="space-y-4">
                  <div className="text-center p-6 bg-purple-800/30 rounded-lg">
                    <div className="text-3xl font-bold text-purple-300 mb-2">
                      {booking.customBookingLabel || `${booking.customBookingType} Package`}
                    </div>
                    <div className="text-purple-100 text-lg mb-4">
                      {advancedPricing.hasAdjustments ? (
                        <div>
                          <div className="text-sm text-purple-200 mb-1">Final Rate (after adjustments):</div>
                          <div className="text-2xl font-bold">₹{advancedPricing.totalAmount.toLocaleString('en-IN')}</div>
                          <div className="text-sm text-purple-300 mt-1">
                            Base: ₹{advancedPricing.rawAmount.toLocaleString('en-IN')}
                            {advancedPricing.discountAmount > 0 && ` - ₹${advancedPricing.discountAmount} discount`}
                            {advancedPricing.additionalCharges > 0 && ` + ₹${advancedPricing.additionalCharges} additional`}
                          </div>
                        </div>
                      ) : (
                        <>Fixed Rate: ₹{advancedPricing.totalAmount.toLocaleString('en-IN')}</>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="bg-purple-700/30 p-3 rounded">
                        <div className="text-purple-200">Package Type</div>
                        <div className="text-white font-semibold capitalize">
                          {booking.customBookingType}
                        </div>
                      </div>
                      <div className="bg-purple-700/30 p-3 rounded">
                        <div className="text-purple-200">Duration Used</div>
                        <div className="text-white font-semibold">
                          {duration.hours}h {duration.minutes}m
                        </div>
                      </div>
                      <div className="bg-purple-700/30 p-3 rounded">
                        <div className="text-purple-200">Total Minutes</div>
                        <div className="text-white font-semibold">
                          {duration.totalMinutes.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-t border-purple-600/30 pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-purple-200 font-medium">Final Package Total:</span>
                      <span className="text-2xl font-bold text-white">
                        ₹{advancedPricing.totalAmount.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="text-center mt-2">
                      <span className="text-purple-300 text-sm">
                        📦 {advancedPricing.summary}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Advanced Pricing Display with adjustments */
                <>
                  <div className="space-y-3 mb-6">
                    {advancedPricing.breakdown.map((block, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-blue-800/30 rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="text-blue-300 font-medium">{block.period}</span>
                          <span className="text-blue-100 text-sm">({block.minutes} minutes)</span>
                          {block.isNightCharge && (
                            <span className="text-orange-300 text-sm">🌙 Night Rate</span>
                          )}
                        </div>
                        <span className="text-white font-bold">₹{block.rate}</span>
                      </div>
                    ))}
                  </div>
                  
                  {/* ✅ NEW: Show adjustments section if they exist */}
                  {advancedPricing.hasAdjustments && (
                    <div className="mb-6 p-4 bg-blue-700/20 rounded-lg border border-blue-600/30">
                      <h5 className="text-blue-200 font-semibold mb-3">Applied Adjustments:</h5>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-blue-100">Raw Advanced Pricing:</span>
                          <span className="text-white font-semibold">₹{advancedPricing.rawAmount.toLocaleString('en-IN')}</span>
                        </div>
                        {advancedPricing.discountAmount > 0 && (
                          <div className="flex justify-between text-green-300">
                            <span>Discount Applied:</span>
                            <span className="font-semibold">-₹{advancedPricing.discountAmount.toLocaleString('en-IN')}</span>
                          </div>
                        )}
                        {advancedPricing.additionalCharges > 0 && (
                          <div className="flex justify-between text-red-300">
                            <span>Additional Charges:</span>
                            <span className="font-semibold">+₹{advancedPricing.additionalCharges.toLocaleString('en-IN')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="border-t border-blue-600/30 pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-blue-200 font-medium">
                        {advancedPricing.hasAdjustments ? 'Final Amount (after adjustments):' : 'Total Amount:'}
                      </span>
                      <span className="text-2xl font-bold text-white">
                        ₹{advancedPricing.totalAmount.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="text-center mt-2">
                      <span className="text-blue-300 text-sm">📈 {advancedPricing.summary}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </ThemedCard>
        )}

        {/* Pre-Rental Checklist */}
        <ThemedCard title="Pre-Rental Checklist" description="Safety and compliance verification" className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className={cn(
              "p-6 rounded-lg border-2 text-center",
              booking.helmetProvided 
                ? "border-green-500/50 bg-green-500/10" 
                : "border-red-500/50 bg-red-500/10"
            )}>
              <div className="text-4xl mb-3">
                {booking.helmetProvided ? '✅' : '❌'}
              </div>
              <h4 className="font-semibold text-white mb-2">Helmet Provided</h4>
              <p className={cn(
                "text-sm",
                booking.helmetProvided ? "text-green-400" : "text-red-400"
              )}>
                {booking.helmetProvided ? 'Provided to customer' : 'Not provided'}
              </p>
            </div>

            <div className={cn(
              "p-6 rounded-lg border-2 text-center",
              booking.aadharCardCollected 
                ? "border-green-500/50 bg-green-500/10" 
                : "border-red-500/50 bg-red-500/10"
            )}>
              <div className="text-4xl mb-3">
                {booking.aadharCardCollected ? '✅' : '❌'}
              </div>
              <h4 className="font-semibold text-white mb-2">Aadhar Card</h4>
              <p className={cn(
                "text-sm",
                booking.aadharCardCollected ? "text-green-400" : "text-red-400"
              )}>
                {booking.aadharCardCollected ? 'Collected securely' : 'Not collected'}
              </p>
            </div>

            <div className={cn(
              "p-6 rounded-lg border-2 text-center",
              booking.vehicleInspected 
                ? "border-green-500/50 bg-green-500/10" 
                : "border-red-500/50 bg-red-500/10"
            )}>
              <div className="text-4xl mb-3">
                {booking.vehicleInspected ? '✅' : '❌'}
              </div>
              <h4 className="font-semibold text-white mb-2">Vehicle Inspected</h4>
              <p className={cn(
                "text-sm",
                booking.vehicleInspected ? "text-green-400" : "text-red-400"
              )}>
                {booking.vehicleInspected ? 'Pre-rental inspection done' : 'Not inspected'}
              </p>
            </div>
          </div>

          {booking.additionalNotes && (
            <div className="mt-6 p-4 bg-gray-800/50 rounded-lg">
              <h4 className="font-semibold text-white mb-2">Additional Notes</h4>
              <p className="text-gray-300">{booking.additionalNotes}</p>
            </div>
          )}
        </ThemedCard>

        {/* ✅ ENHANCED: Payment Information with discount details */}
        <ThemedCard title="Payment Information" description="Billing and payment details with adjustments" className="mb-8">
          <div className={cn(
            "border border-opacity-50 rounded-lg p-8",
            booking.isCustomBooking 
              ? "bg-gradient-to-r from-purple-900/50 to-purple-800/50 border-purple-700/50"
              : "bg-gradient-to-r from-blue-900/50 to-blue-800/50 border-blue-700/50"
          )}>
            {booking.isCustomBooking ? (
              /* Custom Package Payment Display with adjustments */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-center mb-6">
                <div>
                  <div className="text-2xl font-bold text-purple-400 mb-2">
                    {booking.customBookingLabel || `${booking.customBookingType} Package`}
                  </div>
                  <div className="text-purple-200 text-sm">Package Type</div>
                  <div className="text-xs text-purple-300 mt-1">
                    {advancedPricing.hasAdjustments ? 'With adjustments applied' : 'Fixed rate booking'}
                  </div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-white mb-2">
                    ₹{advancedPricing.totalAmount.toLocaleString('en-IN')}
                  </div>
                  <div className="text-purple-200 text-sm">
                    {advancedPricing.hasAdjustments ? 'Final Package Cost' : 'Total Package Cost'}
                  </div>
                  <div className="text-xs text-purple-300 mt-1">
                    {advancedPricing.hasAdjustments 
                      ? `Base: ₹${advancedPricing.rawAmount.toLocaleString('en-IN')}` 
                      : 'No additional charges'
                    }
                  </div>
                </div>
              </div>
            ) : (
              /* Advanced Pricing Payment Display with adjustments */
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center mb-6">
                <div>
                  <div className="text-2xl font-bold text-blue-400 mb-2">₹80</div>
                  <div className="text-blue-200 text-sm">Base Rate</div>
                  <div className="text-xs text-blue-300 mt-1">First hour + grace</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-400 mb-2">{duration.totalHours}</div>
                  <div className="text-blue-200 text-sm">Billable Hours</div>
                  <div className="text-xs text-blue-300 mt-1">Rounded up</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-white mb-2">
                    ₹{advancedPricing.totalAmount.toLocaleString('en-IN')}
                  </div>
                  <div className="text-blue-200 text-sm">
                    {advancedPricing.hasAdjustments ? 'Final Total' : 'Advanced Total'}
                  </div>
                  <div className="text-xs text-blue-300 mt-1">
                    {isActive ? 'Live calculated' : 'Final calculated'}
                    {advancedPricing.hasAdjustments && ' with adjustments'}
                  </div>
                </div>
              </div>
            )}
            
            {/* ✅ NEW: Show adjustment details if they exist */}
            {advancedPricing.hasAdjustments && (
              <div className="mb-6 p-4 bg-black/20 rounded-lg">
                <h5 className={cn(
                  "font-semibold mb-3 text-center",
                  booking.isCustomBooking ? "text-purple-200" : "text-blue-200"
                )}>
                  Payment Adjustments Applied
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center text-sm">
                  <div>
                    <div className="text-lg font-bold text-white">₹{advancedPricing.rawAmount.toLocaleString('en-IN')}</div>
                    <div className="text-gray-300">Original Amount</div>
                  </div>
                  {advancedPricing.discountAmount > 0 && (
                    <div>
                      <div className="text-lg font-bold text-green-400">-₹{advancedPricing.discountAmount.toLocaleString('en-IN')}</div>
                      <div className="text-green-300">Discount Applied</div>
                    </div>
                  )}
                  {advancedPricing.additionalCharges > 0 && (
                    <div>
                      <div className="text-lg font-bold text-red-400">+₹{advancedPricing.additionalCharges.toLocaleString('en-IN')}</div>
                      <div className="text-red-300">Additional Charges</div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Payment Status Indicator */}
            <div className="text-center">
              <div className={cn(
                "inline-flex items-center px-4 py-2 rounded-full text-sm font-medium",
                booking.isCustomBooking 
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                  : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
              )}>
                {booking.isCustomBooking ? '📦 Custom Package' : '⚡ Advanced Pricing'}
                {isActive && ' - Live Calculation'}
                {advancedPricing.hasAdjustments && ' with Adjustments'}
              </div>
            </div>
          </div>
        </ThemedCard>

        {/* Action Buttons */}
        <div className="flex flex-col md:flex-row gap-4">
          <Link href="/active-bookings" className="flex-1">
            <ThemedButton variant="secondary" className="w-full">
              ← Back to Active Bookings
            </ThemedButton>
          </Link>
          {isActive && (
            <Link href={`/return/${booking.bookingId}`} className="flex-1">
              <ThemedButton variant="success" className="w-full">
                🏁 Complete Return & Collect Payment →
              </ThemedButton>
            </Link>
          )}
        </div>
      </div>
    </ThemedLayout>
  );
}