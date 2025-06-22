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
    breakdown: [],
    totalMinutes: 0,
    summary: ''
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

  // Fetch advanced pricing from API or calculate for completed bookings
  const fetchAdvancedPricing = async () => {
    if (!booking) return;
    
    // ✅ NEW: Skip pricing calculation for cancelled bookings
    if (booking.status === 'cancelled') {
      setAdvancedPricing({
        totalAmount: 0,
        breakdown: [],
        totalMinutes: 0,
        summary: 'Cancelled - No charge'
      });
      return;
    }
  
    try {
      // For active bookings, use the live API
      if (booking.status === 'active') {
        const response = await fetch(`/api/bookings/current-amount/${booking._id}`);
        const data = await response.json();
        if (data.success) {
          setAdvancedPricing({
            totalAmount: data.currentAmount,
            breakdown: data.breakdown || [],
            totalMinutes: data.totalMinutes || 0,
            summary: data.summary || ''
          });
        } else {
          console.error('Error fetching advanced pricing for active booking:', data.error);
          // Fallback to simple calculation for active bookings
          const duration = calculateDuration(booking.startTime, currentTime, booking.status);
          const baseAmount = duration.totalHours * 80;
          setAdvancedPricing({
            totalAmount: baseAmount,
            breakdown: [],
            totalMinutes: duration.totalMinutes,
            summary: `${duration.hours}h ${duration.minutes}m (simple calculation)`
          });
        }
      } else {
        // For completed bookings, calculate advanced pricing directly
        const advancedAmount = calculateAdvancedPricingForCompleted(booking);
        setAdvancedPricing(advancedAmount);
      }
    } catch (error) {
      console.error('Error fetching advanced pricing:', error);
      // Fallback to simple calculation for non-cancelled bookings
      if (booking.status !== 'cancelled') {
        const duration = calculateDuration(booking.startTime, currentTime, booking.status);
        const baseAmount = duration.totalHours * 80;
        setAdvancedPricing({
          totalAmount: baseAmount,
          breakdown: [],
          totalMinutes: duration.totalMinutes,
          summary: `${duration.hours}h ${duration.minutes}m (error - fallback)`
        });
      }
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
      const duration = calculateDuration(booking.startTime, booking.endTime ? new Date(booking.endTime) : new Date());
      return {
        totalAmount: duration.totalHours * 80,
        breakdown: [],
        totalMinutes: duration.totalMinutes,
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

  const calculateDuration = (startTime, endTime = currentTime, status) => {
    // ✅ NEW: Return special object for cancelled bookings
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

        {/* Real-time Stats Dashboard */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl shadow-lg p-8 mb-8">
          <div className="text-center mb-6">
            <h3 className="text-3xl font-bold mb-2">
              {isActive ? 'Live Rental Status' : 'Completed Rental Summary'}
            </h3>
            <p className="text-blue-100">{booking.vehicleId.model} - {booking.vehicleId.plateNumber}</p>
          </div>
          <div className={theme.layout.grid.stats}>
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">
                {duration.hours}h {duration.minutes}m
              </div>
              <div className="text-blue-100">{isActive ? 'Current Duration' : 'Total Duration'}</div>
              <div className="text-xs text-blue-200 mt-1">
                {duration.totalMinutes.toLocaleString()} minutes total
              </div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">
                ₹{advancedPricing.totalAmount.toLocaleString('en-IN')}
              </div>
              <div className="text-blue-100">Advanced Pricing</div>
              <div className="text-xs text-blue-200 mt-1">
                {isActive ? 'Live calculated' : 'Final amount'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">₹80</div>
              <div className="text-blue-100">Base Rate</div>
              <div className="text-xs text-blue-200 mt-1">First hour + grace</div>
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

        {/* Advanced Pricing Breakdown */}
        {advancedPricing.breakdown && advancedPricing.breakdown.length > 0 && (
          <ThemedCard title="Advanced Pricing Breakdown" description="Detailed billing calculation" className="mb-8">
            <div className="bg-gradient-to-r from-blue-900/50 to-blue-800/50 border border-blue-700/50 rounded-lg p-6">
              <h4 className="text-xl font-bold text-blue-200 mb-4 text-center">
                📊 Pricing Calculation Details
              </h4>
              
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
              
              <div className="border-t border-blue-600/30 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-blue-200 font-medium">Total Amount:</span>
                  <span className="text-2xl font-bold text-white">₹{advancedPricing.totalAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="text-center mt-2">
                  <span className="text-blue-300 text-sm">📈 {advancedPricing.summary}</span>
                </div>
              </div>
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

        {/* Payment Information */}
        <ThemedCard title="Payment Information" description="Billing and payment details" className="mb-8">
          <div className="bg-gradient-to-r from-blue-900/50 to-blue-800/50 border border-blue-700/50 rounded-lg p-8">
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
                <div className="text-blue-200 text-sm">Advanced Total</div>
                <div className="text-xs text-blue-300 mt-1">
                  {isActive ? 'Live calculated' : 'Final calculated'}
                </div>
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