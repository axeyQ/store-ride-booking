'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { calculateAdvancedPricing, formatCurrency } from '@/lib/pricing'; // ✅ Import advanced pricing

export default function ReturnConfirmationPage() {
  const params = useParams();
  const bookingId = params.bookingId;
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // ✅ NEW: Advanced pricing state
  const [advancedPricing, setAdvancedPricing] = useState(null);
  const [pricingCalculating, setPricingCalculating] = useState(false);
  const [pricingError, setPricingError] = useState(null);

  useEffect(() => {
    if (bookingId) {
      fetchBookingDetails();
    }
  }, [bookingId]);

  // ✅ UPDATED: useEffect to handle both custom packages and regular bookings
  useEffect(() => {
    if (booking && booking.startTime && booking.endTime) {
      // ✅ Always call the pricing function, but it will handle custom packages internally
      calculateRealTimeAdvancedPricing();
    }
  }, [booking]);

  const fetchBookingDetails = async () => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}`);
      const data = await response.json();
      
      if (data.success) {
        console.log('Booking data received:', data.booking);
        console.log('Stored pricing breakdown:', data.booking.pricingBreakdown);
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

  // ✅ FIXED: Calculate pricing with Custom Booking support
  const calculateRealTimeAdvancedPricing = async () => {
    setPricingCalculating(true);
    setPricingError(null);
    
    try {
      console.log('🧮 Calculating pricing for return confirmation...');
      
      // ✅ NEW: Handle Custom Bookings with Fixed Pricing
      if (booking.isCustomBooking) {
        console.log('📦 Custom booking detected - using fixed package pricing');
        
        const startTime = new Date(booking.startTime);
        const endTime = new Date(booking.endTime);
        const totalMinutes = Math.floor((endTime - startTime) / (1000 * 60));
        const duration = calculateDuration(booking.startTime, booking.endTime);
        
        setAdvancedPricing({
          totalAmount: booking.finalAmount || 0,
          breakdown: [{
            period: `${booking.customBookingLabel || booking.customBookingType} Package`,
            startTime: startTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
            endTime: endTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
            minutes: totalMinutes,
            rate: booking.finalAmount || 0,
            isCustomPackage: true,
            description: `Fixed rate package - ${booking.customBookingType}`
          }],
          totalMinutes: totalMinutes,
          summary: `${booking.customBookingLabel || booking.customBookingType} - Fixed Rate Package (${duration.hours}h ${duration.minutes}m used)`,
          isCustomPackage: true
        });
        
        console.log('✅ Custom package pricing set:', {
          amount: booking.finalAmount,
          type: booking.customBookingType
        });
        return;
      }
      
      // For regular bookings, use advanced pricing calculation
      console.log('⚡ Regular booking detected - calculating advanced pricing');
      
      const startTime = new Date(booking.startTime);
      const endTime = new Date(booking.endTime);
      
      // Use the advanced pricing calculator
      const pricingResult = await calculateAdvancedPricing(startTime, endTime);
      
      console.log('✅ Advanced pricing calculated:', pricingResult);
      setAdvancedPricing({
        ...pricingResult,
        isCustomPackage: false
      });
      
    } catch (error) {
      console.error('❌ Error calculating pricing:', error);
      setPricingError('Failed to calculate pricing');
      
      // Fallback calculation
      const duration = calculateDuration(booking.startTime, booking.endTime);
      const fallbackAmount = booking.isCustomBooking 
        ? booking.finalAmount || 0
        : Math.max(duration.hours * 80, 80);
        
      setAdvancedPricing({
        totalAmount: fallbackAmount,
        breakdown: [],
        summary: booking.isCustomBooking 
          ? `${booking.customBookingType} package (fallback)`
          : `${duration.hours}h ${duration.minutes}m (fallback calculation)`,
        isCustomPackage: booking.isCustomBooking || false
      });
    } finally {
      setPricingCalculating(false);
    }
  };

  const getVehicleConditionDisplay = (condition) => {
    const normalizedCondition = condition || 'good';
    
    switch (normalizedCondition.toLowerCase()) {
      case 'good':
        return {
          text: 'Good',
          className: 'bg-green-100 text-green-800',
          icon: '✅'
        };
      case 'minor_issues':
        return {
          text: 'Minor Issues',
          className: 'bg-yellow-100 text-yellow-800',
          icon: '⚠️'
        };
      case 'damage':
        return {
          text: 'Damage Found',
          className: 'bg-red-100 text-red-800',
          icon: '❌'
        };
      default:
        return {
          text: 'Good',
          className: 'bg-green-100 text-green-800',
          icon: '✅'
        };
    }
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

  const calculateDuration = (startTime, endTime) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end - start;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return { hours, minutes };
  };

  // ✅ UPDATED: Enhanced pricing breakdown with Custom Package support
  const renderAdvancedPricingBreakdown = () => {
    if (pricingCalculating) {
      return (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <div className="text-sm text-gray-600">🧮 Calculating pricing...</div>
        </div>
      );
    }

    if (pricingError) {
      return (
        <div className="text-center py-4">
          <div className="text-red-600 text-sm">❌ {pricingError}</div>
          <button 
            onClick={calculateRealTimeAdvancedPricing}
            className="mt-2 text-blue-600 hover:text-blue-800 text-sm underline"
          >
            🔄 Retry Calculation
          </button>
        </div>
      );
    }

    if (!advancedPricing) {
      // Fallback to stored breakdown or simple calculation
      if (booking.pricingBreakdown && booking.pricingBreakdown.length > 0) {
        return renderStoredPricingBreakdown();
      }
      
      return renderSimplePricingFallback();
    }

    // ✅ NEW: Handle Custom Package Display
    if (advancedPricing.isCustomPackage || booking.isCustomBooking) {
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-3">
            <div className="font-medium text-gray-800">📦 Custom Package Details:</div>
            <div className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded">
              Fixed Rate Package
            </div>
          </div>
          
          {/* Package Information */}
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-medium text-purple-800">
                  {booking.customBookingLabel || `${booking.customBookingType} Package`}
                </span>
                <span className="font-bold text-purple-900">₹{booking.finalAmount?.toLocaleString('en-IN')}</span>
              </div>
              
              <div className="text-sm text-purple-700 space-y-2">
                <div className="flex justify-between">
                  <span>Package Type:</span>
                  <span className="font-medium capitalize">{booking.customBookingType}</span>
                </div>
                <div className="flex justify-between">
                  <span>Start Time:</span>
                  <span>{formatDateTime(booking.startTime).split(',')[1]}</span>
                </div>
                <div className="flex justify-between">
                  <span>End Time:</span>
                  <span>{formatDateTime(booking.endTime).split(',')[1]}</span>
                </div>
                <div className="flex justify-between">
                  <span>Duration Used:</span>
                  <span>{advancedPricing.breakdown?.[0]?.minutes || 'N/A'} minutes</span>
                </div>
              </div>
              
              <div className="mt-3 pt-2 border-t border-purple-300">
                <div className="text-xs text-purple-600 italic">
                  📦 Fixed rate package - no additional time-based charges
                </div>
              </div>
            </div>
          </div>

          {/* Package Summary */}
          <div className="border-t pt-3 mt-4">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Package Duration:</span>
              <span>{calculateDuration(booking.startTime, booking.endTime).hours}h {calculateDuration(booking.startTime, booking.endTime).minutes}m</span>
            </div>
            {advancedPricing.summary && (
              <div className="text-xs text-purple-600 mt-2 italic">
                📦 {advancedPricing.summary}
              </div>
            )}
          </div>
        </div>
      );
    }

    // ✅ Regular Advanced Pricing Display (unchanged for regular bookings)
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-3">
          <div className="font-medium text-gray-800">🧮 Real-Time Advanced Pricing:</div>
          <div className="text-xs text-cyan-600 bg-cyan-50 px-2 py-1 rounded">
            Live Calculation
          </div>
        </div>
        
        {advancedPricing.breakdown && advancedPricing.breakdown.length > 0 ? (
          // Display detailed breakdown
          <>
            {advancedPricing.breakdown.map((block, index) => (
              <div key={index} className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-blue-800">
                    {block.period || `Block ${index + 1}`}
                    {block.isNightCharge && <span className="ml-2 text-purple-600">🌙 Night</span>}
                  </span>
                  <span className="font-bold text-blue-900">₹{block.rate}</span>
                </div>
                
                <div className="text-sm text-blue-700 space-y-1">
                  <div className="flex justify-between">
                    <span>Time:</span>
                    <span>{block.startTime} - {block.endTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Duration:</span>
                    <span>{block.minutes} minutes</span>
                  </div>
                  {block.description && (
                    <div className="text-xs text-blue-600 italic">{block.description}</div>
                  )}
                </div>
              </div>
            ))}

            {/* Advanced Pricing Summary */}
            <div className="border-t pt-3 mt-4">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Total blocks:</span>
                <span>{advancedPricing.breakdown.length}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Total duration:</span>
                <span>{advancedPricing.totalMinutes || advancedPricing.breakdown.reduce((sum, block) => sum + block.minutes, 0)} minutes</span>
              </div>
              {advancedPricing.summary && (
                <div className="text-xs text-gray-600 mt-2 italic">
                  📊 {advancedPricing.summary}
                </div>
              )}
            </div>
          </>
        ) : (
          // Simple advanced pricing display
          <div className="bg-cyan-50 rounded-lg p-4 border border-cyan-200">
            <div className="flex justify-between items-center">
              <span className="font-medium text-cyan-800">Advanced Pricing Total:</span>
              <span className="font-bold text-cyan-900">₹{advancedPricing.totalAmount.toLocaleString('en-IN')}</span>
            </div>
            {advancedPricing.summary && (
              <div className="text-sm text-cyan-700 mt-2">
                📊 {advancedPricing.summary}
              </div>
            )}
          </div>
        )}
        
        {/* ✅ Comparison with stored amount (only for regular bookings) */}
        {renderPricingComparison()}
      </div>
    );
  };

  // ✅ UPDATED: Compare calculated vs stored pricing (skip for custom packages)
  const renderPricingComparison = () => {
    if (!advancedPricing || !booking.finalAmount) return null;
    
    // ✅ NEW: Skip comparison for custom packages (they have fixed rates)
    if (advancedPricing.isCustomPackage || booking.isCustomBooking) {
      return (
        <div className="mt-3 p-2 bg-purple-50 border border-purple-200 rounded text-sm">
          <span className="text-purple-700">📦 Fixed rate package - no pricing variations</span>
        </div>
      );
    }
    
    const difference = advancedPricing.totalAmount - booking.finalAmount;
    
    if (Math.abs(difference) < 0.01) {
      return (
        <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-sm">
          <span className="text-green-700">✅ Advanced pricing matches stored amount</span>
        </div>
      );
    }
    
    return (
      <div className={`mt-3 p-3 rounded border ${difference > 0 ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200'}`}>
        <div className="text-sm font-medium mb-2">
          {difference > 0 ? '⚠️ Pricing Discrepancy Found:' : 'ℹ️ Pricing Comparison:'}
        </div>
        <div className="text-xs space-y-1">
          <div className="flex justify-between">
            <span>Advanced Calculation:</span>
            <span className="font-medium">₹{advancedPricing.totalAmount.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between">
            <span>Stored Amount:</span>
            <span className="font-medium">₹{booking.finalAmount.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between font-medium">
            <span>Difference:</span>
            <span className={difference > 0 ? 'text-orange-600' : 'text-blue-600'}>
              {difference > 0 ? '+' : ''}₹{difference.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // ✅ Fallback: Render stored pricing breakdown
  const renderStoredPricingBreakdown = () => {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-3">
          <div className="font-medium text-gray-800">📋 Stored Pricing Breakdown:</div>
          <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
            From Database
          </div>
        </div>
        
        {booking.pricingBreakdown.map((block, index) => (
          <div key={index} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium text-gray-700">
                {block.period || `Block ${index + 1}`}
                {block.isNightCharge && <span className="ml-2 text-purple-600">🌙 Night</span>}
              </span>
              <span className="font-bold text-gray-800">₹{block.rate}</span>
            </div>
            
            <div className="text-sm text-gray-600 space-y-1">
              <div className="flex justify-between">
                <span>Time:</span>
                <span>{block.startTime} - {block.endTime}</span>
              </div>
              <div className="flex justify-between">
                <span>Duration:</span>
                <span>{block.minutes} minutes</span>
              </div>
              {block.description && (
                <div className="text-xs text-gray-500 italic">{block.description}</div>
              )}
            </div>
          </div>
        ))}

        <div className="border-t pt-3 mt-4">
          <div className="flex justify-between font-medium text-gray-800">
            <span>Subtotal from stored breakdown:</span>
            <span>₹{booking.pricingBreakdown.reduce((sum, block) => sum + block.rate, 0).toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>
    );
  };

  // ✅ Simple fallback calculation
  const renderSimplePricingFallback = () => {
    const duration = calculateDuration(booking.startTime, booking.endTime);
    return (
      <div className="space-y-2">
        <div className="font-medium text-gray-800 mb-3">📊 Simple Calculation:</div>
        <div className="flex justify-between">
          <span>Rate per hour:</span>
          <span>₹80</span>
        </div>
        <div className="flex justify-between">
          <span>Duration:</span>
          <span>{duration.hours}h {duration.minutes}m</span>
        </div>
        <div className="flex justify-between">
          <span>Base amount:</span>
          <span>₹{(Math.ceil((duration.hours * 60 + duration.minutes) / 60) * 80).toLocaleString('en-IN')}</span>
        </div>
      </div>
    );
  };

  const handlePrint = () => {
    window.print();
  };

  // ✅ NEW: Manual recalculation button
  const handleRecalculatePricing = () => {
    calculateRealTimeAdvancedPricing();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-xl">Loading return details...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">❌ {error}</div>
          <Link href="/active-bookings" className="text-blue-600 hover:text-blue-800 font-medium">
            ← Back to Active Bookings
          </Link>
        </div>
      </div>
    );
  }

  const duration = calculateDuration(booking.startTime, booking.endTime);
  const conditionDisplay = getVehicleConditionDisplay(booking.vehicleCondition);

  // ✅ UPDATED: Calculate displayed amounts with custom package support
  const displayedAmount = booking.isCustomBooking 
    ? booking.finalAmount || 0  // Use fixed package price for custom bookings
    : (advancedPricing?.totalAmount || booking.finalAmount);  // Use calculated or stored amount for regular bookings

  const finalAmountAfterAdjustments = displayedAmount - (booking.discountAmount || 0) + (booking.additionalCharges || 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - No Print */}
      <header className="bg-white shadow-sm border-b no-print">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Link href="/active-bookings" className="text-blue-600 hover:text-blue-800">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">Return Completed</h1>
            </div>
            {/* Updated Header Buttons - Handle custom packages appropriately */}
            <div className="flex gap-3">
              {/* ✅ Updated: Recalculate button - different behavior for custom packages */}
              {booking.isCustomBooking ? (
                <div className="bg-purple-100 text-purple-700 px-4 py-2 rounded-lg font-medium text-sm flex items-center">
                  📦 Fixed Package Rate
                </div>
              ) : (
                <button
                  onClick={handleRecalculatePricing}
                  disabled={pricingCalculating}
                  className="bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium text-sm"
                >
                  {pricingCalculating ? '⏳ Calculating...' : '🧮 Recalculate Pricing'}
                </button>
              )}
              
              <button
                onClick={handlePrint}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold"
              >
                🖨️ Print Receipt
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Updated Success Message - Handles both pricing types */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8 no-print">
          <div className="flex items-center">
            <div className="text-green-600 text-4xl mr-4">✅</div>
            <div>
              <h2 className="text-2xl font-bold text-green-900">Vehicle Return Completed!</h2>
              <p className="text-green-700 text-lg">
                Payment of ₹{finalAmountAfterAdjustments.toLocaleString('en-IN')} has been collected. Vehicle is now available for new bookings.
              </p>
              {booking.isCustomBooking ? (
                <p className="text-purple-600 text-sm mt-1">
                  📦 {booking.customBookingLabel || booking.customBookingType} package completed - Fixed rate pricing applied
                </p>
              ) : (
                advancedPricing && (
                  <p className="text-green-600 text-sm mt-1">
                    🧮 Amount calculated using advanced pricing with grace periods, block rates & night charges
                  </p>
                )
              )}
            </div>
          </div>
        </div>

        {/* Receipt */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 print:shadow-none print:border-none">
          {/* Receipt Header */}
          <div className="text-center border-b pb-6 mb-6">
            <h1 className="text-3xl font-bold text-gray-900">MR TRAVELS</h1>
            <p className="text-lg text-gray-600">Bike & Scooter Rental Service</p>
            <p className="text-sm text-gray-500">Bhopal, Madhya Pradesh</p>
            <div className="mt-4">
              <span className="bg-green-100 text-green-800 px-4 py-2 rounded-full font-bold text-lg">
                RETURN RECEIPT
              </span>
            </div>
          </div>

          {/* Booking Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* Left Column */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Booking Information</h3>
              <div className="space-y-3">
                <div>
                  <span className="font-medium text-gray-700">Booking ID:</span>
                  <span className="ml-2 font-bold text-blue-600">{booking.bookingId}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Start Time:</span>
                  <span className="ml-2">{formatDateTime(booking.startTime)}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">End Time:</span>
                  <span className="ml-2">{formatDateTime(booking.endTime)}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Duration:</span>
                  <span className="ml-2 font-semibold">{duration.hours} hours, {duration.minutes} minutes</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Status:</span>
                  <span className="ml-2 bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-medium">
                    COMPLETED
                  </span>
                </div>
                {booking.isCustomBooking && (
                  <div>
                    <span className="font-medium text-gray-700">Package Type:</span>
                    <span className="ml-2 bg-purple-100 text-purple-800 px-2 py-1 rounded text-sm font-medium">
                      📦 {booking.customBookingLabel || booking.customBookingType}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Vehicle Details</h3>
              <div className="space-y-3">
                <div>
                  <span className="font-medium text-gray-700">Type:</span>
                  <span className="ml-2 capitalize">{booking.vehicleId.type}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Model:</span>
                  <span className="ml-2">{booking.vehicleId.model}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Plate Number:</span>
                  <span className="ml-2 font-mono font-bold">{booking.vehicleId.plateNumber}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Condition:</span>
                  <span className={`ml-2 px-2 py-1 rounded text-sm font-medium ${conditionDisplay.className}`}>
                    {conditionDisplay.icon} {conditionDisplay.text}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Details */}
          <div className="border-t pt-6 mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Customer Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div>
                  <span className="font-medium text-gray-700">Name:</span>
                  <span className="ml-2">{booking.customerId.name}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Phone:</span>
                  <span className="ml-2">{booking.customerId.phone}</span>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <span className="font-medium text-gray-700">License:</span>
                  <span className="ml-2 font-mono">{booking.customerId.driverLicense}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Aadhar Card:</span>
                  <span className="ml-2 text-green-600">✓ Returned to Customer</span>
                </div>
              </div>
            </div>
          </div>

          {/* ✅ UPDATED: Payment Information section with Custom Package support */}
          <div className="border-t pt-6 mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Payment Information</h3>
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* ✅ Left: Pricing Details (Custom Package or Advanced Pricing) */}
                <div className="space-y-2">
                  {renderAdvancedPricingBreakdown()}
                </div>
                
                {/* ✅ Right: Adjustments and Final Payment */}
                <div className="space-y-4">
                  {/* Subtotal */}
                  <div className={`rounded-lg p-4 ${
                    booking.isCustomBooking 
                      ? 'bg-purple-50 border border-purple-200' 
                      : 'bg-blue-50 border border-blue-200'
                  }`}>
                    <div className="flex justify-between font-medium">
                      <span>
                        {booking.isCustomBooking ? 'Package Price:' : 'Pricing Subtotal:'}
                      </span>
                      <span>₹{displayedAmount.toLocaleString('en-IN')}</span>
                    </div>
                    <div className={`text-xs mt-1 ${
                      booking.isCustomBooking ? 'text-purple-600' : 'text-blue-600'
                    }`}>
                      {booking.isCustomBooking 
                        ? `📦 ${booking.customBookingType} package - fixed rate`
                        : '🧮 Advanced pricing applied'
                      }
                    </div>
                  </div>

                  {/* Adjustments */}
                  {booking.discountAmount > 0 && (
                    <div className="flex justify-between text-green-600 bg-green-50 p-2 rounded">
                      <span>Discount Applied:</span>
                      <span>-₹{booking.discountAmount.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  
                  {booking.additionalCharges > 0 && (
                    <div className="flex justify-between text-red-600 bg-red-50 p-2 rounded">
                      <span>Additional Charges:</span>
                      <span>+₹{booking.additionalCharges.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  
                  {/* Final Amount */}
                  <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
                    <div className="flex justify-between font-bold text-lg">
                      <span>Final Amount:</span>
                      <span className="text-green-600">₹{finalAmountAfterAdjustments.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div className="text-center mt-6">
                    <span className="font-medium text-gray-700">Payment Method:</span>
                    <div className="mt-2">
                      <span className={`px-4 py-2 rounded-full font-medium ${
                        booking.paymentMethod === 'cash' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {booking.paymentMethod === 'cash' ? '💵 Cash Payment' : '📱 UPI Payment'}
                      </span>
                    </div>
                    <div className="mt-4 text-2xl font-bold text-green-600">
                      PAID ✅
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Notes Section */}
          {(booking.returnNotes || booking.damageNotes) && (
            <div className="border-t pt-6 mb-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Return Notes</h3>
              <div className="space-y-4">
                {booking.returnNotes && (
                  <div>
                    <span className="font-medium text-gray-700">General Notes:</span>
                    <p className="mt-1 text-gray-600 bg-gray-50 p-3 rounded">{booking.returnNotes}</p>
                  </div>
                )}
                {booking.damageNotes && (
                  <div>
                    <span className="font-medium text-gray-700">Damage Notes:</span>
                    <p className="mt-1 text-gray-600 bg-red-50 p-3 rounded border border-red-200">{booking.damageNotes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Updated Footer - Shows appropriate message for booking type */}
          <div className="border-t pt-6 mt-6 text-center text-sm text-gray-500">
            <p>Thank you for choosing MR Travels!</p>
            <p>Vehicle returned on: {formatDateTime(booking.endTime)} | Return processed by: MR Travels Staff</p>
            {booking.isCustomBooking ? (
              <p className="mt-2 text-purple-600">
                📦 {booking.customBookingLabel || booking.customBookingType} Package - Fixed Rate Pricing
              </p>
            ) : (
              advancedPricing && (
                <p className="mt-2 text-blue-600">⚡ Powered by Advanced Pricing Engine - Real-time calculation</p>
              )
            )}
          </div>
        </div>

        {/* Action Buttons - No Print */}
        <div className="flex gap-4 mt-8 no-print">
          <Link 
            href="/booking" 
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-4 px-6 rounded-lg font-semibold text-center"
          >
            + New Booking
          </Link>
          <Link 
            href="/active-bookings" 
            className="flex-1 bg-green-600 hover:bg-green-700 text-white py-4 px-6 rounded-lg font-semibold text-center"
          >
            View Active Bookings
          </Link>
          <Link 
            href="/" 
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-4 px-6 rounded-lg font-semibold text-center"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}