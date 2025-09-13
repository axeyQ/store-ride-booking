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

// ✅ NEW: Custom package definitions
const CUSTOM_PACKAGES = {
  half_day: { 
    label: 'Half Day (up to 12 hours)',
    price: 800, 
    maxHours: 12, 
    icon: '🌅',
    color: 'orange'
  },
  full_day: { 
    label: 'Full Day (up to 24 hours)',
    price: 1200, 
    maxHours: 24, 
    icon: '☀️',
    color: 'yellow'
  },
  night: { 
    label: 'Night Package (10 PM to 9 AM)',
    price: 600, 
    maxHours: 11, 
    icon: '🌙',
    color: 'purple'
  }
};

export default function EnhancedActiveBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVehicle, setFilterVehicle] = useState('all');
  const [filterBookingType, setFilterBookingType] = useState('all');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentAmounts, setCurrentAmounts] = useState({});
  const [extraCharges, setExtraCharges] = useState({});

  // 🔒 Revenue Visibility Toggle State (only for main stats)
  const [showRevenue, setShowRevenue] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mr-travels-show-revenue');
      return saved === 'true';
    }
    return false;
  });

  // NEW: Fleet forecast state
  const [forecastData, setForecastData] = useState([]);
  const [forecastLoading, setForecastLoading] = useState(false);

  const [vehicleChangeModal, setVehicleChangeModal] = useState({
    isOpen: false,
    booking: null
  });

  const [cancellationModal, setCancellationModal] = useState({
    isOpen: false,
    booking: null
  });

  // Save revenue visibility preference
  useEffect(() => {
    localStorage.setItem('mr-travels-show-revenue', showRevenue.toString());
  }, [showRevenue]);

  // 🔒 Revenue formatting helper (only for main stats)
  const formatRevenue = (amount) => showRevenue ? `₹${amount.toLocaleString('en-IN')}` : "₹●●●●●";

  // 🔒 Eye toggle button component (only for main stats)
  const RevenueToggleButton = ({ size = "w-5 h-5" }) => (
    <button
      onClick={(e) => {
        e.stopPropagation();
        setShowRevenue(!showRevenue);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          setShowRevenue(!showRevenue);
        }
      }}
      className="p-1 hover:bg-green-500/20 rounded-full transition-all duration-200 group ml-2 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-50"
      title={showRevenue ? "Hide revenue" : "Show revenue"}
      aria-label={showRevenue ? "Hide revenue amounts" : "Show revenue amounts"}
    >
      {showRevenue ? (
        <svg 
          className={`${size} text-green-400 group-hover:text-green-300`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" 
          />
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" 
          />
        </svg>
      ) : (
        <svg 
          className={`${size} text-green-400 group-hover:text-green-300`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" 
          />
        </svg>
      )}
    </button>
  );

  useEffect(() => {
    fetchActiveBookings();
    fetchFleetForecast();
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    
    const forecastInterval = setInterval(fetchFleetForecast, 5 * 60 * 1000);
    
    return () => {
      clearInterval(timeInterval);
      clearInterval(forecastInterval);
    };
  }, []);

  useEffect(() => {
    if (bookings.length > 0) {
      updateCurrentAmounts();
      const amountInterval = setInterval(updateCurrentAmounts, 60000);
      return () => clearInterval(amountInterval);
    }
  }, [bookings]);

  const fetchFleetForecast = async () => {
    try {
      setForecastLoading(true);
      const response = await fetch('/api/analytics/fleet-forecast');
      const data = await response.json();
      if (data.success) {
        setForecastData(data.forecast || []);
      }
    } catch (error) {
      console.error('Error fetching fleet forecast:', error);
    } finally {
      setForecastLoading(false);
    }
  };

  const logCustomBookingDebug = (booking) => {
    if (booking.isCustomBooking && process.env.NODE_ENV === 'development') {
      console.group(`🐛 Custom Booking Debug: ${booking.bookingId}`);
      console.log('Booking data:', {
        bookingId: booking.bookingId,
        customBookingType: booking.customBookingType,
        startTime: booking.startTime,
        endTime: booking.endTime,
        finalAmount: booking.finalAmount,
        isCustomBooking: booking.isCustomBooking
      });
      
      const packageInfo = CUSTOM_PACKAGES[booking.customBookingType];
      console.log('Package info:', packageInfo);
      
      const calculatedEndTime = calculateEndTime(booking);
      console.log('Calculated end time:', calculatedEndTime);
      
      const progress = calculatePackageProgress(booking);
      console.log('Progress:', progress);
      
      console.groupEnd();
    }
  };
  
  useEffect(() => {
    if (bookings.length > 0 && process.env.NODE_ENV === 'development') {
      const customBookings = bookings.filter(b => b.isCustomBooking);
      console.log(`🔍 Found ${customBookings.length} custom bookings out of ${bookings.length} total`);
      
      customBookings.forEach(booking => {
        logCustomBookingDebug(booking);
      });
    }
  }, [bookings]);

  const fetchActiveBookings = async () => {
    try {
      console.log('Fetching active bookings...');
      const response = await fetch('/api/bookings?status=active');
      const data = await response.json();
      console.log('API response:', data);
      if (data.success) {
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

  // NEW: Estimated Return Status Component
  const EstimatedReturnStatus = ({ booking, currentTime }) => {
    if (!booking.estimatedReturnTime) {
      return (
        <div className="text-gray-500 text-sm">
          📅 No estimate set
        </div>
      );
    }

    const estimatedTime = new Date(booking.estimatedReturnTime);
    const current = new Date(currentTime);
    const diffMinutes = Math.floor((estimatedTime - current) / (1000 * 60));
    
    if (diffMinutes > 60) {
      const hours = Math.floor(diffMinutes / 60);
      return (
        <div className="text-green-400 text-sm">
          ✅ {hours}h remaining
        </div>
      );
    } else if (diffMinutes > 30) {
      return (
        <div className="text-yellow-400 text-sm">
          ⏳ {diffMinutes}m remaining
        </div>
      );
    } else if (diffMinutes > 0) {
      return (
        <div className="text-amber-400 text-sm animate-pulse font-medium">
          ⏰ Due in {diffMinutes}m
        </div>
      );
    } else {
      const overdueMinutes = Math.abs(diffMinutes);
      const overdueHours = Math.floor(overdueMinutes / 60);
      const remainingMinutes = overdueMinutes % 60;
      
      return (
        <div className="text-red-400 text-sm font-bold animate-pulse">
          🔴 {overdueHours > 0 ? `${overdueHours}h ${remainingMinutes}m` : `${overdueMinutes}m`} overdue
        </div>
      );
    }
  };

  // Direct call handling (no modal)
  const handleDirectCall = (booking, reason = 'follow_up') => {
    const phoneNumber = booking.customer?.phone || booking.customerId?.phone;
    if (!phoneNumber) {
      alert('Phone number not available for this customer');
      return;
    }

    // Open phone dialer directly
    window.location.href = `tel:${phoneNumber}`;
  };

  const calculateEndTime = (booking) => {
    console.log('Calculating end time for booking:', booking.bookingId, {
      isCustomBooking: booking.isCustomBooking,
      hasEndTime: !!booking.endTime,
      customBookingType: booking.customBookingType
    });
  
    if (booking.endTime) {
      try {
        const endTime = new Date(booking.endTime);
        if (!isNaN(endTime.getTime())) {
          console.log('✅ Using existing endTime from booking:', endTime);
          return endTime;
        } else {
          console.warn('⚠️ Booking has invalid endTime, calculating fallback:', booking.endTime);
        }
      } catch (error) {
        console.error('❌ Error parsing booking.endTime:', error);
      }
    }
  
    if (!booking.isCustomBooking) {
      console.log('📋 Not a custom booking, no end time calculation needed');
      return null;
    }
    
    const startTime = new Date(booking.startTime);
    const packageInfo = CUSTOM_PACKAGES[booking.customBookingType];
    
    if (!packageInfo) {
      console.error('❌ Package info not found for type:', booking.customBookingType);
      return null;
    }
  
    if (isNaN(startTime.getTime())) {
      console.error('❌ Invalid startTime:', booking.startTime);
      return null;
    }
    
    let calculatedEndTime;
    
    if (booking.customBookingType === 'night') {
      calculatedEndTime = new Date(startTime);
      calculatedEndTime.setDate(calculatedEndTime.getDate() + 1);
      calculatedEndTime.setHours(9, 0, 0, 0);
    } else {
      calculatedEndTime = new Date(startTime.getTime() + (packageInfo.maxHours * 60 * 60 * 1000));
    }
  
    console.log('🔄 Calculated fallback endTime:', calculatedEndTime);
    return calculatedEndTime;
  };

  const calculatePackageProgress = (booking) => {
    if (!booking.isCustomBooking) {
      return null;
    }
    
    console.log('📊 Calculating package progress for:', booking.bookingId);
    
    const startTime = new Date(booking.startTime);
    const endTime = calculateEndTime(booking);
    const now = new Date(currentTime);
    
    if (!endTime) {
      console.error('❌ Cannot calculate progress: endTime is null');
      return null;
    }
  
    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime()) || isNaN(now.getTime())) {
      console.error('❌ Invalid dates detected:', { startTime, endTime, now });
      return null;
    }
    
    const totalDuration = endTime.getTime() - startTime.getTime();
    const elapsed = now.getTime() - startTime.getTime();
    const remaining = endTime.getTime() - now.getTime();
    
    if (totalDuration <= 0) {
      console.warn('⚠️ Invalid duration: endTime is before startTime');
      return null;
    }
    
    const elapsedHours = Math.floor(Math.max(0, elapsed) / (1000 * 60 * 60));
    const elapsedMinutes = Math.floor((Math.max(0, elapsed) % (1000 * 60 * 60)) / (1000 * 60));
    
    const remainingHours = Math.floor(Math.max(0, remaining) / (1000 * 60 * 60));
    const remainingMinutes = Math.floor((Math.max(0, remaining) % (1000 * 60 * 60)) / (1000 * 60));
    
    const progressPercentage = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
    const isOvertime = now > endTime;
    
    const overtimeMs = isOvertime ? (now.getTime() - endTime.getTime()) : 0;
    const overtimeHours = isOvertime ? Math.floor(overtimeMs / (1000 * 60 * 60)) : 0;
    const overtimeMinutes = isOvertime ? Math.floor((overtimeMs % (1000 * 60 * 60)) / (1000 * 60)) : 0;
    
    const packageInfo = CUSTOM_PACKAGES[booking.customBookingType];
    
    const result = {
      startTime,
      endTime,
      elapsed: { hours: elapsedHours, minutes: elapsedMinutes },
      remaining: { hours: remainingHours, minutes: remainingMinutes },
      progressPercentage,
      isOvertime,
      overtimeHours,
      overtimeMinutes,
      packageInfo
    };
  
    console.log('✅ Package progress calculated:', result);
    return result;
  };

  const fetchCurrentAmount = async (bookingId) => {
    try {
      const booking = bookings.find(b => b._id === bookingId);
      
      if (!booking || booking.status === 'cancelled') {
        console.warn(`Skipping amount calculation for cancelled/missing booking: ${bookingId}`);
        return 0;
      }
  
      if (booking.isCustomBooking) {
        const packageInfo = CUSTOM_PACKAGES[booking.customBookingType];
        const basePrice = packageInfo ? packageInfo.price : (booking.finalAmount || 0);
        const extra = extraCharges[bookingId] || 0;
        
        const progress = calculatePackageProgress(booking);
        let overtimePenalty = 0;
        
        if (progress && progress.isOvertime) {
          const overtimeHours = progress.overtimeHours + (progress.overtimeMinutes / 60);
          overtimePenalty = Math.ceil(overtimeHours) * 50;
          console.log(`💰 Overtime penalty calculated: ${overtimeHours.toFixed(1)}h = ₹${overtimePenalty}`);
        }
        
        const totalAmount = basePrice + extra + overtimePenalty;
        console.log(`💰 Custom booking amount: Base(₹${basePrice}) + Extra(₹${extra}) + Overtime(₹${overtimePenalty}) = ₹${totalAmount}`);
        
        return totalAmount;
      }
  
      const response = await fetch(`/api/bookings/current-amount/${bookingId}`);
      const data = await response.json();
      if (data.success) {
        return data.currentAmount;
      } else {
        console.error('Error fetching current amount for booking:', bookingId, data.error);
        if (booking.status === 'active') {
          const duration = calculateDuration(booking.startTime);
          return Math.max(duration.totalHours * 80, 80);
        }
        return 0;
      }
    } catch (error) {
      console.error('Error fetching current amount:', error);
      const booking = bookings.find(b => b._id === bookingId);
      if (booking && booking.status === 'active') {
        if (booking.isCustomBooking) {
          const packageInfo = CUSTOM_PACKAGES[booking.customBookingType];
          return packageInfo ? packageInfo.price : (booking.finalAmount || 0);
        }
        const duration = calculateDuration(booking.startTime);
        return Math.max(duration.totalHours * 80, 80);
      }
      return 0;
    }
  };

  const updateCurrentAmounts = async () => {
    const amounts = {};
    for (const booking of bookings) {
      amounts[booking._id] = await fetchCurrentAmount(booking._id);
    }
    setCurrentAmounts(amounts);
  };

  const handleExtraChargeChange = (bookingId, amount) => {
    setExtraCharges(prev => ({
      ...prev,
      [bookingId]: parseFloat(amount) || 0
    }));
    
    setTimeout(() => {
      updateCurrentAmounts();
    }, 100);
  };

  const calculateDuration = (startTime) => {
    try {
      const start = new Date(startTime);
      const current = new Date(currentTime);
      
      if (isNaN(start.getTime()) || isNaN(current.getTime())) {
        console.error('Invalid date detected:', { startTime, currentTime });
        return { hours: 0, minutes: 0, totalHours: 1 };
      }
      
      const diffMs = current.getTime() - start.getTime();
      
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
      const totalHours = Math.max(1, Math.ceil(totalMinutes / 60));
      
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

  const SafePackageProgressBar = ({ booking }) => {
    try {
      return <PackageProgressBar booking={booking} />;
    } catch (error) {
      console.error('Error rendering PackageProgressBar:', error);
      return (
        <div className="text-xs text-red-400">
          ⚠️ Progress calculation error
        </div>
      );
    }
  };
  
  const SafeBookingTypeBadge = ({ booking }) => {
    try {
      return <BookingTypeBadge booking={booking} />;
    } catch (error) {
      console.error('Error rendering BookingTypeBadge:', error);
      return (
        <ThemedBadge className="bg-gray-500/20 text-gray-400 border-gray-500/30">
          📋 Booking
        </ThemedBadge>
      );
    }
  };

  const BookingTypeBadge = ({ booking }) => {
    if (booking.isCustomBooking) {
      const packageInfo = CUSTOM_PACKAGES[booking.customBookingType];
      
      if (!packageInfo) {
        return (
          <div className="flex items-center gap-2">
            <ThemedBadge className="bg-gray-500/20 text-gray-400 border-gray-500/30">
              📦 Custom Package
            </ThemedBadge>
            <span className="text-xl">❓</span>
          </div>
        );
      }
      
      return (
        <div className="flex items-center gap-2">
          <ThemedBadge className={`bg-${packageInfo.color}-500/20 text-${packageInfo.color}-400 border-${packageInfo.color}-500/30`}>
            📦 {packageInfo.label.split(' (')[0]}
          </ThemedBadge>
          <span className="text-2xl">{packageInfo.icon}</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-2">
          <ThemedBadge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
            ⚡ Advanced Pricing
          </ThemedBadge>
        </div>
      );
    }
  };

  const PackageProgressBar = ({ booking }) => {
    const progress = calculatePackageProgress(booking);
    
    if (!progress) {
      if (booking.isCustomBooking) {
        return (
          <div className="space-y-2">
            <div className="text-xs text-gray-400">Package Progress</div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div className="bg-gray-500 h-2 rounded-full w-0"></div>
            </div>
            <div className="text-xs text-red-400">
              ⚠️ Unable to calculate progress
            </div>
          </div>
        );
      }
      return null;
    }
    
    const { progressPercentage, isOvertime, packageInfo, remaining, overtimeHours, overtimeMinutes } = progress;
    
    return (
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-gray-400">Package Progress</span>
          <span className={isOvertime ? "text-red-400" : "text-gray-400"}>
            {Math.round(progressPercentage)}%
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div 
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              isOvertime ? "bg-red-500" : `bg-${packageInfo.color}-500`
            )}
            style={{ width: `${Math.min(100, progressPercentage)}%` }}
          />
        </div>
        {isOvertime ? (
          <div className="text-xs text-red-400 font-medium">
            ⚠️ Package expired - {overtimeHours}h {overtimeMinutes}m overtime
          </div>
        ) : (
          <div className="text-xs text-green-400">
            ⏳ {remaining.hours}h {remaining.minutes}m remaining
          </div>
        )}
      </div>
    );
  };

  // ✅ ENHANCED: Booking card with simplified actions and always visible prices
  const EnhancedBookingCard = ({ booking }) => {
    const duration = calculateDuration(booking.startTime);
    const currentAmount = currentAmounts[booking._id] || 0;
    const progress = calculatePackageProgress(booking);
    const eligibility = getChangeEligibilityReason(booking);
    const withinCancellationWindow = isWithinCancellationWindow(booking);

    // 🚀 NEW: Multiple driver detection
    const hasMultipleDrivers = booking.actualDriver && !booking.actualDriver.isSameAsLicenseHolder;
    const driverName = hasMultipleDrivers ? booking.actualDriver.name : booking.customerId.name;
    const driverPhone = hasMultipleDrivers ? booking.actualDriver.phone : booking.customerId.phone;
    const licenseHolderName = booking.customerId.name;
    const licenseHolderPhone = booking.customerId.phone;

    const cardClassName = cn(
      "hover:scale-105 transition-all duration-300 border-2",
      hasMultipleDrivers
        ? "border-orange-600/50 hover:border-orange-500/70 bg-gradient-to-br from-orange-900/10 to-red-800/5"
        : booking.isCustomBooking 
          ? "border-purple-600/50 hover:border-purple-500/70 bg-gradient-to-br from-purple-900/10 to-purple-800/5"
          : "border-blue-600/50 hover:border-blue-500/70 bg-gradient-to-br from-blue-900/10 to-blue-800/5"
    );

    return (
      <ThemedCard className={cardClassName}>
        <div className="p-6">
          {/* Header - UPDATED to show actual driver */}
          <div className="flex justify-between items-start mb-6">
            <div>
              {/* 🚀 NEW: Show actual driver prominently */}
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-xl font-bold text-white">
                  {driverName}
                </h3>
                {hasMultipleDrivers && (
                  <div className="flex items-center gap-1">
                    <ThemedBadge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                      🚗 Actual Driver
                    </ThemedBadge>
                  </div>
                )}
              </div>

              {/* 🚀 NEW: Driver contact info with quick call */}
              <div className="flex items-center gap-2 mb-2">
                <p className="text-gray-400">{driverPhone}</p>
                <button
                  onClick={() => handleDirectCall({ customer: { phone: driverPhone } }, 'quick_call')}
                  className="text-green-400 hover:text-green-300 transition-colors"
                  title={`Call ${hasMultipleDrivers ? 'actual driver' : 'customer'}`}
                >
                  📞
                </button>
                {hasMultipleDrivers && (
                  <span className="text-orange-300 text-sm">
                    ({booking.actualDriver.relationToLicenseHolder})
                  </span>
                )}
              </div>

              {/* 🚀 NEW: License holder info when different */}
              {hasMultipleDrivers && (
                <div className="bg-amber-900/20 border border-amber-700/30 rounded-lg p-3 mb-2">
                  <div className="text-amber-200 text-sm font-medium mb-1">
                    📋 License Holder (Legal Responsibility)
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-amber-300">{licenseHolderName}</span>
                    <span className="text-amber-400">•</span>
                    <span className="text-amber-400">{licenseHolderPhone}</span>
                    <button
                      onClick={() => handleDirectCall({ customer: { phone: licenseHolderPhone } }, 'license_holder_call')}
                      className="text-amber-400 hover:text-amber-300 transition-colors ml-1"
                      title="Call license holder"
                    >
                      📞
                    </button>
                  </div>
                </div>
              )}

              <p className="text-sm text-gray-500 font-mono">ID: {booking.bookingId}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <ThemedBadge status="active">
                🔴 LIVE
              </ThemedBadge>
              
              {/* 🚀 NEW: Multiple driver indicator */}
              {hasMultipleDrivers && (
                <ThemedBadge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                  👥 Multiple Driver
                </ThemedBadge>
              )}
              
              <SafeBookingTypeBadge booking={booking} />
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

          {/* 🚀 NEW: Multiple Driver Warning Section */}
          {hasMultipleDrivers && (
            <div className="bg-orange-900/20 border border-orange-700/30 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-orange-400">⚠️</span>
                <span className="text-orange-300 font-semibold">Multiple Driver Active</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-orange-200 font-medium">🚗 Who Has Vehicle:</div>
                  <div className="text-orange-100">{booking.actualDriver.name}</div>
                  <div className="text-orange-300">📞 {booking.actualDriver.phone}</div>
                </div>
                <div>
                  <div className="text-orange-200 font-medium">📋 Legal Responsibility:</div>
                  <div className="text-orange-100">{licenseHolderName}</div>
                  <div className="text-orange-300">📞 {licenseHolderPhone}</div>
                </div>
              </div>
              <div className="mt-3 text-xs text-orange-400">
                💰 Enhanced security: ₹{booking.securityDepositAmount} deposit collected
              </div>
            </div>
          )}

          {/* Estimated Return Time Section */}
          <div className="bg-amber-900/20 border border-amber-700/30 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-amber-200 text-sm font-medium mb-1">📅 Estimated Return</div>
                <div className="text-amber-400 font-bold">
                  {booking.estimatedReturnTime 
                    ? new Date(booking.estimatedReturnTime).toLocaleString('en-IN', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : 'Not set'
                  }
                </div>
                {booking.isCustomBooking && (
                  <div className="text-amber-300 text-xs mt-1">
                    📦 Package end time
                  </div>
                )}
              </div>
              
              <div className="text-right">
                <EstimatedReturnStatus booking={booking} currentTime={currentTime} />
                
                <div className="mt-2 flex gap-2">
                  {/* 🚀 NEW: Smart call button - calls actual driver */}
                  <button
                    onClick={() => handleDirectCall({ customer: { phone: driverPhone } })}
                    className="inline-flex items-center px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors"
                    title={`Call ${hasMultipleDrivers ? 'actual driver' : 'customer'}`}
                  >
                    📞 Call {hasMultipleDrivers ? 'Driver' : 'Customer'}
                  </button>
                  
                  {/* 🚀 NEW: Additional call license holder button for multiple drivers */}
                  {hasMultipleDrivers && (
                    <button
                      onClick={() => handleDirectCall({ customer: { phone: licenseHolderPhone } })}
                      className="inline-flex items-center px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white text-sm rounded-lg transition-colors"
                      title="Call license holder"
                    >
                      📞 License Holder
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            {/* Progress Bar for Custom Bookings */}
            {booking.isCustomBooking && booking.estimatedReturnTime && (
              <div className="mt-3">
                <div className="flex justify-between text-xs text-amber-300 mb-1">
                  <span>Package Progress</span>
                  <span>{calculatePackageProgress(booking) ? Math.round(calculatePackageProgress(booking).progressPercentage) : 0}%</span>
                </div>
                <div className="w-full bg-amber-900/30 rounded-full h-2">
                  <div 
                    className="bg-amber-400 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${Math.min(calculatePackageProgress(booking)?.progressPercentage || 0, 100)}%` 
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Dual metrics for different booking types - ALWAYS VISIBLE PRICES */}
          {booking.isCustomBooking ? (
            <>
              {/* Custom Package Metrics */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-purple-900/20 border border-purple-700/30 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-purple-400">
                    {progress ? `${progress.elapsed.hours}h ${progress.elapsed.minutes}m` : '0h 0m'}
                  </div>
                  <div className="text-purple-200 text-sm">Time Elapsed</div>
                  {progress && (
                    <div className="text-xs text-purple-300 mt-1">
                      of {progress.packageInfo.maxHours}h package
                    </div>
                  )}
                </div>
                <div className="bg-green-900/20 border border-green-700/30 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-400 mb-2">
                    ₹{currentAmount.toLocaleString('en-IN')}
                  </div>
                  <div className="text-green-200 text-sm">Package Price</div>
                  {extraCharges[booking._id] > 0 && (
                    <div className="text-xs text-green-300 mt-1">
                      +₹{extraCharges[booking._id]} extra
                    </div>
                  )}
                </div>
              </div>

              {/* Package Progress Bar */}
              <div className="mb-6">
                <SafePackageProgressBar booking={booking} />
              </div>

              {/* Time Remaining */}
              {progress && !progress.isOvertime && (
                <div className="bg-orange-900/20 border border-orange-700/30 rounded-lg p-3 mb-6 text-center">
                  <div className="text-lg font-bold text-orange-400">
                    {progress.remaining.hours}h {progress.remaining.minutes}m
                  </div>
                  <div className="text-orange-200 text-sm">Time Remaining</div>
                  <div className="text-xs text-orange-300 mt-1">
                    Until {progress.endTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              )}

              {/* Overdue Alert */}
              {progress && progress.isOvertime && (
                <div className="bg-red-900/20 border border-red-700/30 rounded-lg p-3 mb-6">
                  <div className="text-center mb-3">
                    <div className="text-lg font-bold text-red-400">
                      ⚠️ OVERDUE
                    </div>
                    <div className="text-red-200 text-sm">
                      {progress.overtimeHours}h {progress.overtimeMinutes}m past deadline
                    </div>
                  </div>
                  {/* 🚀 NEW: Smart overdue calling for multiple drivers */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDirectCall({ customer: { phone: driverPhone } }, 'overdue_reminder')}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      📞 Call {hasMultipleDrivers ? 'Driver' : 'Customer'} (Overdue)
                    </button>
                    {hasMultipleDrivers && (
                      <button
                        onClick={() => handleDirectCall({ customer: { phone: licenseHolderPhone } }, 'overdue_reminder')}
                        className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        📞 Call License Holder
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Extra Charges Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Extra Charges (Optional)
                </label>
                <ThemedInput
                  type="number"
                  placeholder="0"
                  value={extraCharges[booking._id] || ''}
                  onChange={(e) => handleExtraChargeChange(booking._id, e.target.value)}
                  className="text-center"
                />
                <div className="text-xs text-gray-500 mt-1 text-center">
                  Add any additional charges beyond the package price
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Advanced Pricing Metrics */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-400">
                    {duration.hours}h {duration.minutes}m
                  </div>
                  <div className="text-blue-200 text-sm">Live Duration</div>
                </div>
                <div className="bg-green-900/20 border border-green-700/30 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-400 mb-2">
                    ₹{currentAmount.toLocaleString('en-IN')}
                  </div>
                  <div className="text-green-200 text-sm">Advanced Pricing</div>
                </div>
              </div>
            </>
          )}

          {/* Timing Info */}
          <div className="space-y-3 mb-6">
            <div className="flex justify-between">
              <span className="text-gray-400">Started:</span>
              <span className="font-medium text-white">{formatTime(booking.startTime)}</span>
            </div>
            {booking.isCustomBooking && progress && (
              <div className="flex justify-between">
                <span className="text-gray-400">Expected End:</span>
                <span className="font-medium text-white">{formatTime(progress.endTime)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-400">Created:</span>
              <span className="font-medium text-white">{formatTime(booking.createdAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Rate:</span>
              <span className="font-medium text-white">
                {booking.isCustomBooking 
                  ? `₹${progress?.packageInfo.price || 0} fixed`
                  : '₹80/hour'
                }
              </span>
            </div>
          </div>

          {/* 🚀 NEW: Enhanced Safety Checklist Status with Multiple Driver Info */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-400 mb-3">Safety Checklist</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="space-y-2">
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
              {hasMultipleDrivers && (
                <div className="space-y-2">
                  <span className="flex items-center gap-1 text-orange-400">
                    👥 Multiple Drivers
                  </span>
                  <span className="flex items-center gap-1 text-orange-400">
                    💰 Enhanced Deposit
                  </span>
                  <span className="flex items-center gap-1 text-orange-400">
                    🆔 {booking.actualDriver.alternateId ? 'Alt ID Collected' : 'Alt ID Missing'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Simplified Action Buttons - Only show available actions */}
          {renderSimplifiedActionButtons(booking, {
            openVehicleChange: handleOpenVehicleChange,
            openCancellation: handleOpenCancellation
          })}
        </div>
      </ThemedCard>
    );
  };

  // Enhanced stats with booking type breakdown (with revenue toggle)
  const customBookings = bookings.filter(b => b.isCustomBooking);
  const advancedBookings = bookings.filter(b => !b.isCustomBooking);
  const totalCurrentRevenue = Object.values(currentAmounts).reduce((sum, amount) => sum + amount, 0);

  const getChangeEligibilityReason = (booking) => {
    try {
      const now = new Date();
      const startTime = new Date(booking.startTime);
      const createdAt = new Date(booking.createdAt);
      
      const minutesSinceStart = Math.floor((now - startTime) / (1000 * 60));
      const minutesSinceCreation = Math.floor((now - createdAt) / (1000 * 60));
      
      if (now < startTime) {
        const minutesToStart = Math.floor((startTime - now) / (1000 * 60));
        return {
          canChange: true,
          reason: `Rental starts in ${minutesToStart}m`,
          timeframe: 'pre-start'
        };
      }
      
      if (minutesSinceStart <= 30) {
        return {
          canChange: true,
          reason: `Within 30min of start (${minutesSinceStart}m ago)`,
          timeframe: 'early-rental'
        };
      }
      
      if (minutesSinceCreation <= 45) {
        return {
          canChange: true,
          reason: `Within 45min of booking (${minutesSinceCreation}m ago)`,
          timeframe: 'recent-booking'
        };
      }
      
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

  const isWithinCancellationWindow = (booking) => {
    if (!booking?.createdAt) return false;
    const bookingTime = new Date(booking.createdAt);
    const twoHoursLater = new Date(bookingTime.getTime() + (2 * 60 * 60 * 1000));
    return new Date() <= twoHoursLater;
  };

  // Simplified action buttons - only show when available
  const renderSimplifiedActionButtons = (booking, handlers) => {
    const eligibility = getChangeEligibilityReason(booking);
    const cancellationEligibility = isWithinCancellationWindow(booking);
    
    return (
      <div className="space-y-3">
        {/* Always show these buttons */}
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

        {/* Only show available actions */}
        <div className="flex gap-2">
          {eligibility.canChange && (
            <ThemedButton 
              variant="warning"
              onClick={() => handlers.openVehicleChange(booking)}
              className="flex-1 text-sm bg-orange-600 hover:bg-orange-700 text-white"
            >
              🔄 Change Vehicle
            </ThemedButton>
          )}
          
          {cancellationEligibility && (
            <ThemedButton 
              variant="danger" 
              onClick={() => handlers.openCancellation(booking)}
              className="flex-1 text-sm"
            >
              🚫 Cancel (Free)
            </ThemedButton>
          )}
        </div>
      </div>
    );
  };

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
    setBookings(prevBookings => 
      prevBookings.map(booking => 
        booking._id === updatedBooking._id ? updatedBooking : booking
      )
    );
    
    alert(`Vehicle changed successfully to ${updatedBooking.vehicleId.model} (${updatedBooking.vehicleId.plateNumber})`);
    updateCurrentAmounts();
  };

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
    setBookings(prevBookings => 
      prevBookings.filter(booking => booking._id !== cancelledBooking._id)
    );
    
    setCurrentAmounts(prevAmounts => {
      const newAmounts = { ...prevAmounts };
      delete newAmounts[cancelledBooking._id];
      return newAmounts;
    });
    
    alert(`Booking ${cancelledBooking.bookingId} has been cancelled successfully. Vehicle is now available.`);
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
    const matchesVehicleFilter = filterVehicle === 'all' || vehicle.type === filterVehicle;
    const matchesBookingTypeFilter = filterBookingType === 'all' || 
      (filterBookingType === 'custom' && booking.isCustomBooking) ||
      (filterBookingType === 'advanced' && !booking.isCustomBooking);
    
    return matchesSearch && matchesVehicleFilter && matchesBookingTypeFilter;
  });

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
            Real-time monitoring with estimated return times + customer calling + fleet forecasting
          </p>
        </div>

        {/* Stats with booking type breakdown + REVENUE TOGGLE (only here) */}
        <div className={theme.layout.grid.stats + " mb-8"}>
          <ThemedStatsCard
            title="Total Active"
            value={bookings.length}
            subtitle={`${advancedBookings.length} advanced + ${customBookings.length} custom`}
            colorScheme="bookings"
            icon={<div className="text-4xl mb-2">🚴</div>}
            progress={Math.min((bookings.length / 10) * 100, 100)}
          />
          <ThemedStatsCard
            title="Current Revenue"
            value={formatRevenue(totalCurrentRevenue)}
            subtitle="Dual pricing applied"
            colorScheme="revenue"
            icon={
              <div className="flex items-center justify-center mb-2">
                <div className="text-4xl">💰</div>
                <RevenueToggleButton />
              </div>
            }
            progress={75}
          />
          <ThemedStatsCard
            title="Advanced Pricing"
            value={advancedBookings.length}
            subtitle="⚡ Time-based pricing"
            colorScheme="vehicles"
            icon={<div className="text-4xl mb-2">⚡</div>}
            progress={bookings.length > 0 ? (advancedBookings.length / bookings.length) * 100 : 0}
          />
          <ThemedStatsCard
            title="Custom Packages"
            value={customBookings.length}
            subtitle="📦 Fixed rate packages"
            colorScheme="customers"
            icon={<div className="text-4xl mb-2">📦</div>}
            progress={bookings.length > 0 ? (customBookings.length / bookings.length) * 100 : 0}
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
                <h3 className="text-lg font-semibold text-white">Enhanced Live Dashboard</h3>
                <p className="text-gray-400">Estimated return times + customer calling + fleet intelligence</p>
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <ThemedInput
                label="Search Bookings"
                placeholder="Name, phone, license, or plate number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                containerClassName="md:col-span-2"
              />
              <ThemedSelect
                label="Vehicle Type"
                value={filterVehicle}
                onValueChange={setFilterVehicle}
                options={[
                  { value: 'all', label: 'All Vehicles' },
                  { value: 'bike', label: 'Bikes Only' },
                  { value: 'scooter', label: 'Scooters Only' }
                ]}
              />
              <ThemedSelect
                label="Booking Type"
                value={filterBookingType}
                onValueChange={setFilterBookingType}
                options={[
                  { value: 'all', label: 'All Types' },
                  { value: 'advanced', label: '⚡ Advanced Pricing' },
                  { value: 'custom', label: '📦 Custom Packages' }
                ]}
              />
            </div>
          </div>
        </ThemedCard>

        {/* Active Bookings */}
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
                <div className="flex gap-3 justify-center">
                  <Link href="/booking">
                    <ThemedButton variant="primary">
                      ⚡ Advanced Booking
                    </ThemedButton>
                  </Link>
                  <Link href="/custom-booking">
                    <ThemedButton variant="success">
                      📦 Custom Booking
                    </ThemedButton>
                  </Link>
                </div>
              )}
            </div>
          </ThemedCard>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {filteredBookings.map((booking) => (
              <EnhancedBookingCard key={booking._id} booking={booking} />
            ))}
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
            <ThemedButton variant="primary" className="w-full">
              ⚡ Advanced Booking
            </ThemedButton>
          </Link>
          <Link href="/custom-booking" className="flex-1 md:flex-initial">
            <ThemedButton variant="success" className="w-full">
              📦 Custom Booking
            </ThemedButton>
          </Link>
          <Link href="/custom-bookings" className="flex-1 md:flex-initial">
            <ThemedButton variant="secondary" className="w-full">
              📋 Custom Bookings
            </ThemedButton>
          </Link>
          <Link href="/admin" className="flex-1 md:flex-initial">
            <ThemedButton variant="secondary" className="w-full">
              📊 Dashboard
            </ThemedButton>
          </Link>
        </div>
      </div>

      {/* Modals */}
      <VehicleChangeModal
        isOpen={vehicleChangeModal.isOpen}
        onClose={handleCloseVehicleChange}
        booking={vehicleChangeModal.booking}
        onVehicleChanged={handleVehicleChanged}
      />

      <CancellationModal
        isOpen={cancellationModal.isOpen}
        onClose={handleCloseCancellation}
        booking={cancellationModal.booking}
        onCancel={handleBookingCancelled}
      />
    </ThemedLayout>
  );
}