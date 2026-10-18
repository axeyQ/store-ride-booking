'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import QRCode from 'qrcode';
import { 
  ThemedLayout, 
  ThemedCard, 
  ThemedButton, 
  ThemedInput,
  ThemedSelect,
  ThemedBadge 
} from '@/components/themed';
import { theme } from '@/lib/theme';
import { cn } from '@/lib/utils';

export default function ThemedVehicleReturnPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.bookingId;
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [paymentReceived, setPaymentReceived] = useState(false);
  const [settings, setSettings] = useState({ hourlyRate: 80 });
  const [advancedPricing, setAdvancedPricing] = useState({
    totalAmount: 0,
    breakdown: [],
    totalMinutes: 0,
    summary: ''
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/settings');
        const data = await response.json();
        if (data.success) {
          setSettings(data.settings);
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      }
    };
    fetchSettings();
  }, []);

  const UPI_ID = 'MAB.037327046010001@axisbank';
  const BUSINESS_NAME = 'MR Travels';

  const [returnData, setReturnData] = useState({
    paymentMethod: 'cash',
    vehicleCondition: 'good',
    returnNotes: '',
    damageNotes: '',
    hasOvertimeCharges: false,
    discountAmount: 0,
    additionalCharges: 0
  });

  useEffect(() => {
    if (bookingId) {
      fetchBookingDetails();
    }
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timeInterval);
  }, [bookingId]);

  useEffect(() => {
    if (booking) {
      fetchAdvancedPricing();
      const pricingInterval = setInterval(fetchAdvancedPricing, 60000);
      return () => clearInterval(pricingInterval);
    }
  }, [booking, currentTime]);

  useEffect(() => {
    if (returnData.paymentMethod === 'upi' && booking && advancedPricing.totalAmount > 0) {
      generateUPIQRCode();
    }
  }, [returnData.paymentMethod, booking, advancedPricing.totalAmount, returnData.discountAmount, returnData.additionalCharges]);

  const fetchBookingDetails = async () => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}`);
      const data = await response.json();
      if (data.success) {
        if (data.booking.status !== 'active') {
          setError('This booking is not active and cannot be returned');
          return;
        }
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

  const fetchAdvancedPricing = async () => {
    if (!booking) return;
    
    if (booking.isCustomBooking) {
      const duration = calculateDuration(booking.startTime, currentTime);
      
      setAdvancedPricing({
        totalAmount: booking.finalAmount || 0,
        breakdown: [{
          period: `${booking.customBookingLabel || booking.customBookingType} Package`,
          minutes: duration.totalMinutes,
          rate: booking.finalAmount || 0,
          isCustomPackage: true,
          description: `Fixed rate package - ${booking.customBookingType}`
        }],
        totalMinutes: duration.totalMinutes,
        summary: `${booking.customBookingLabel || booking.customBookingType} - Fixed Rate Package`
      });
      return;
    }
  
    try {
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
        console.error('Error fetching advanced pricing:', data.error);
        const duration = calculateDuration(booking.startTime, currentTime);
        const rate = settings.hourlyRate || 80;
        const baseAmount = duration.totalHours * rate;
        setAdvancedPricing({
          totalAmount: baseAmount,
          breakdown: [],
          totalMinutes: duration.totalMinutes,
          summary: `${duration.hours}h ${duration.minutes}m (simple calculation)`
        });
      }
    } catch (error) {
      console.error('Error fetching advanced pricing:', error);
      const duration = calculateDuration(booking.startTime, currentTime);
      const rate = settings.hourlyRate || 80;
      const baseAmount = duration.totalHours * rate;
      setAdvancedPricing({
        totalAmount: baseAmount,
        breakdown: [],
        totalMinutes: duration.totalMinutes,
        summary: `${duration.hours}h ${duration.minutes}m (simple calculation)`
      });
    }
  };

  const calculateDuration = (startTime, endTime = currentTime) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end - start;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return {
      hours,
      minutes,
      totalHours: Math.ceil(diffMs / (1000 * 60 * 60)),
      totalMinutes: Math.floor(diffMs / (1000 * 60))
    };
  };

  const calculateFinalAmount = () => {
    const discount = returnData.discountAmount || 0;
    const additionalCharges = returnData.additionalCharges || 0;
    return Math.max(0, advancedPricing.totalAmount - discount + additionalCharges);
  };

  const generateUPIQRCode = async () => {
    try {
      const finalAmount = calculateFinalAmount();
      const transactionNote = `Vehicle Return ${booking.bookingId} - ${booking.vehicleId.model}`;
      const upiUrl = `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(BUSINESS_NAME)}&am=${finalAmount}&cu=INR&tn=${encodeURIComponent(transactionNote)}`;
      
      const qrDataUrl = await QRCode.toDataURL(upiUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      setQrCodeUrl(qrDataUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  const copyUPIDetails = () => {
    const finalAmount = calculateFinalAmount();
    const upiDetails = `UPI ID: ${UPI_ID}\nAmount: ₹${finalAmount}\nNote: Vehicle Return ${booking.bookingId}`;
    navigator.clipboard.writeText(upiDetails);
    alert('UPI details copied to clipboard!');
  };

  const handleReturn = async () => {
    if (!booking) return;
    
    if (returnData.paymentMethod === 'upi' && !paymentReceived) {
      alert('Please confirm that UPI payment has been received before completing the return.');
      return;
    }
    
    setProcessing(true);
    try {
      const duration = calculateDuration(booking.startTime, currentTime);
      const finalAmount = calculateFinalAmount();

      const response = await fetch(`/api/bookings/complete/${booking._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endTime: currentTime.toISOString(),
          actualDuration: duration.totalHours,
          finalAmount: finalAmount,
          paymentMethod: returnData.paymentMethod,
          vehicleCondition: returnData.vehicleCondition,
          returnNotes: returnData.returnNotes,
          damageNotes: returnData.damageNotes,
          discountAmount: returnData.discountAmount,
          additionalCharges: returnData.additionalCharges
        })
      });
      const data = await response.json();
      if (data.success) {
        router.push(`/return/confirmation/${booking.bookingId}`);
      } else {
        alert('Error completing return: ' + data.error);
      }
    } catch (error) {
      console.error('Error processing return:', error);
      alert('Error processing return. Please try again.');
    } finally {
      setProcessing(false);
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

  if (loading) {
    return (
      <ThemedLayout>
        <div className="min-h-screen flex items-center justify-center px-4">
          <ThemedCard>
            <div className="flex items-center space-x-3 p-6 sm:p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
              <span className="text-white text-lg sm:text-xl">Loading booking details...</span>
            </div>
          </ThemedCard>
        </div>
      </ThemedLayout>
    );
  }

  if (error) {
    return (
      <ThemedLayout>
        <div className="min-h-screen flex items-center justify-center px-4">
          <ThemedCard className="text-center p-6 sm:p-12">
            <div className="text-red-400 text-5xl sm:text-6xl mb-4">❌</div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">{error}</h2>
            <Link href="/active-bookings">
              <ThemedButton variant="primary" className="w-full sm:w-auto min-h-11">
                ← Back to Active Bookings
              </ThemedButton>
            </Link>
          </ThemedCard>
        </div>
      </ThemedLayout>
    );
  }

  const duration = calculateDuration(booking.startTime, currentTime);
  const finalAmount = calculateFinalAmount();
  const baseRateDisplay = booking.isCustomBooking
    ? `₹${(booking.finalAmount || 0).toLocaleString('en-IN')}`
    : `₹${settings.hourlyRate || 80}`;

  return (
    <ThemedLayout>
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Hero */}
        <div className="text-center mb-6 sm:mb-8 px-1">
          <h2 className={theme.typography.hero}>
            Vehicle <span className={theme.typography.gradient}>Return</span>
          </h2>
          <p className={`${theme.typography.subtitle} max-w-2xl mx-auto mt-2 sm:mt-4 text-sm sm:text-base`}>
            Complete the rental and collect payment
          </p>
        </div>

        {/* Return Summary */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl shadow-lg p-4 sm:p-8 mb-6 sm:mb-8">
          <div className="text-center mb-4 sm:mb-6">
            <h3 className="text-xl sm:text-3xl font-bold mb-1 sm:mb-2">Return Summary</h3>
            <p className="text-green-100 text-sm sm:text-base">
              {booking.customerId.name} - {booking.vehicleId.model}
            </p>
            {booking.isCustomBooking && (
              <div className="mt-2">
                <span className="bg-purple-500/20 text-purple-200 px-3 py-1 rounded-full text-xs sm:text-sm">
                  📦 {booking.customBookingLabel || `${booking.customBookingType} Package`}
                </span>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 text-center">
            <div>
              <div className="text-xl sm:text-3xl font-bold">
                {duration.hours}h {duration.minutes}m
              </div>
              <div className="text-green-100 text-xs sm:text-sm">Duration</div>
              <div className="text-[10px] sm:text-xs text-green-200 mt-1 hidden sm:block">
                {duration.totalMinutes} minutes
              </div>
            </div>
            <div>
              <div className="text-xl sm:text-3xl font-bold">
                ₹{advancedPricing.totalAmount.toLocaleString('en-IN')}
              </div>
              <div className="text-green-100 text-xs sm:text-sm">
                {booking.isCustomBooking ? 'Package' : 'Calculated'}
              </div>
              <div className="text-[10px] sm:text-xs text-green-200 mt-1 hidden sm:block">
                {booking.isCustomBooking ? 'Fixed rate' : 'From system'}
              </div>
            </div>
            <div>
              <div className="text-xl sm:text-3xl font-bold">{baseRateDisplay}</div>
              <div className="text-green-100 text-xs sm:text-sm">
                {booking.isCustomBooking ? 'Package rate' : 'Hourly rate'}
              </div>
              <div className="text-[10px] sm:text-xs text-green-200 mt-1 hidden sm:block">
                {booking.isCustomBooking ? 'Total package' : 'From settings'}
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-4xl font-bold">
                ₹{finalAmount.toLocaleString('en-IN')}
              </div>
              <div className="text-green-100 text-xs sm:text-sm">Final</div>
              <div className="text-[10px] sm:text-xs text-green-200 mt-1 hidden sm:block">
                After adjustments
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
          {/* Customer & Vehicle */}
          <ThemedCard title="Booking Information">
            <div className="space-y-3 sm:space-y-4">
              <div className="bg-gray-800/50 rounded-lg p-3 sm:p-4">
                <h4 className="font-semibold text-white mb-2 sm:mb-3 text-sm sm:text-base">Customer Details</h4>
                <div className="space-y-2 text-sm sm:text-base">
                  <div><span className="text-gray-400">Name:</span> <span className="ml-2 font-semibold text-white">{booking.customerId.name}</span></div>
                  <div>
                    <span className="text-gray-400">Phone:</span>{' '}
                    <a href={`tel:${booking.customerId.phone}`} className="ml-2 font-semibold text-cyan-300 underline">
                      {booking.customerId.phone}
                    </a>
                  </div>
                  <div><span className="text-gray-400">License:</span> <span className="ml-2 font-mono text-white text-xs sm:text-base break-all">{booking.customerId.driverLicense}</span></div>
                  <div><span className="text-gray-400">Booking ID:</span> <span className="ml-2 font-mono font-semibold text-cyan-400 text-xs sm:text-base">{booking.bookingId}</span></div>
                </div>
              </div>
              
              <div className="bg-gray-800/50 rounded-lg p-3 sm:p-4">
                <h4 className="font-semibold text-white mb-2 sm:mb-3 text-sm sm:text-base">Vehicle Details</h4>
                <div className="space-y-2 text-sm sm:text-base">
                  <div><span className="text-gray-400">Vehicle:</span> <span className="ml-2 font-semibold text-white">{booking.vehicleId.model}</span></div>
                  <div><span className="text-gray-400">Plate:</span> <span className="ml-2 font-mono font-semibold text-white">{booking.vehicleId.plateNumber}</span></div>
                  <div><span className="text-gray-400">Started:</span> <span className="ml-2 font-semibold text-white text-xs sm:text-base">{formatDateTime(booking.startTime)}</span></div>
                </div>
              </div>
            </div>
          </ThemedCard>

          {/* Payment Method */}
          <ThemedCard title="Payment Method *">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {[
                { id: 'cash', label: 'Cash', icon: '💵', description: 'Pay with cash' },
                { id: 'upi', label: 'UPI', icon: '📱', description: 'PhonePe, GPay…' }
              ].map((method) => (
                <div
                  key={method.id}
                  onClick={() => setReturnData(prev => ({ ...prev, paymentMethod: method.id }))}
                  className={cn(
                    "p-4 sm:p-6 rounded-lg border-2 cursor-pointer text-center transition-all min-h-[100px] sm:min-h-0",
                    returnData.paymentMethod === method.id
                      ? 'border-green-500 bg-green-500/10'
                      : 'border-gray-600 hover:border-gray-500'
                  )}
                >
                  <div className="text-3xl sm:text-4xl mb-2 sm:mb-3">{method.icon}</div>
                  <h4 className="font-semibold text-white text-sm sm:text-base">{method.label}</h4>
                  <p className="text-xs sm:text-sm text-gray-400">{method.description}</p>
                  {returnData.paymentMethod === method.id && (
                    <div className="mt-2 sm:mt-3">
                      <ThemedBadge color="green">Selected</ThemedBadge>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {returnData.paymentMethod === 'upi' && (
              <div className="mt-6 sm:mt-8 p-4 sm:p-6 bg-gradient-to-r from-blue-900/50 to-blue-800/50 border border-blue-500/50 rounded-xl">
                <h4 className="text-lg sm:text-xl font-bold text-blue-200 mb-4 text-center">
                  📱 UPI — ₹{finalAmount.toLocaleString('en-IN')}
                  {booking.isCustomBooking && (
                    <div className="text-xs sm:text-sm text-purple-300 mt-1">
                      📦 {booking.customBookingLabel || `${booking.customBookingType} Package`}
                    </div>
                  )}
                </h4>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  <div className="text-center">
                    <div className="bg-white p-3 sm:p-4 rounded-xl inline-block mb-3 sm:mb-4 max-w-full">
                      {qrCodeUrl ? (
                        <img src={qrCodeUrl} alt="UPI QR Code" className="w-48 h-48 sm:w-64 sm:h-64 mx-auto" />
                      ) : (
                        <div className="w-48 h-48 sm:w-64 sm:h-64 flex items-center justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                      )}
                    </div>
                    <p className="text-blue-200 text-xs sm:text-sm">Scan with any UPI app</p>
                  </div>

                  <div className="space-y-3 sm:space-y-4">
                    <div className="bg-blue-800/30 rounded-lg p-3 sm:p-4">
                      <h5 className="font-semibold text-blue-200 mb-2 text-sm sm:text-base">Payment Details</h5>
                      <div className="space-y-2 text-xs sm:text-sm">
                        <div className="flex justify-between gap-2">
                          <span className="text-blue-300">Amount:</span>
                          <span className="font-bold text-white">₹{finalAmount.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-blue-300 shrink-0">UPI ID:</span>
                          <span className="font-mono text-white text-right break-all">{UPI_ID}</span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-blue-300">Payee:</span>
                          <span className="text-white">{BUSINESS_NAME}</span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-blue-300">Note:</span>
                          <span className="text-white text-xs">Return {booking.bookingId}</span>
                        </div>
                      </div>
                    </div>

                    <ThemedButton
                      variant="secondary"
                      onClick={copyUPIDetails}
                      className="w-full text-sm min-h-11"
                    >
                      📋 Copy UPI Details
                    </ThemedButton>

                    <label className="flex items-start space-x-3 cursor-pointer mt-2">
                      <input
                        type="checkbox"
                        checked={paymentReceived}
                        onChange={(e) => setPaymentReceived(e.target.checked)}
                        className="w-5 h-5 mt-0.5 text-green-600 border-2 border-gray-300 rounded focus:ring-green-500 shrink-0"
                      />
                      <span className="text-white font-medium text-sm sm:text-base">
                        ✅ UPI payment received (₹{finalAmount.toLocaleString('en-IN')})
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </ThemedCard>

          {/* Vehicle Condition */}
          <ThemedCard title="Vehicle Condition">
            <div className="space-y-2 sm:space-y-4">
              {[
                { id: 'good', label: 'Good Condition', icon: '✅', description: 'No issues found' },
                { id: 'minor_issues', label: 'Minor Issues', icon: '⚠️', description: 'Small scratches or minor wear' },
                { id: 'damage', label: 'Damage Found', icon: '❌', description: 'Significant damage requiring repair' }
              ].map((condition) => (
                <div
                  key={condition.id}
                  onClick={() => setReturnData(prev => ({ ...prev, vehicleCondition: condition.id }))}
                  className={cn(
                    "p-3 sm:p-4 rounded-lg border-2 cursor-pointer transition-all",
                    returnData.vehicleCondition === condition.id
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-gray-600 hover:border-gray-500'
                  )}
                >
                  <div className="flex items-center">
                    <div className="text-xl sm:text-2xl mr-3 shrink-0">{condition.icon}</div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-white text-sm sm:text-base">{condition.label}</h4>
                      <p className="text-xs sm:text-sm text-gray-400">{condition.description}</p>
                    </div>
                    {returnData.vehicleCondition === condition.id && (
                      <div className="text-blue-400 shrink-0 ml-2">
                        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ThemedCard>

          {/* Amount Adjustments */}
          <ThemedCard title="Amount Adjustments">
            <div className="space-y-4 sm:space-y-6">
              <ThemedInput
                label="Discount Amount (₹)"
                type="number"
                min="0"
                value={returnData.discountAmount}
                onChange={(e) => setReturnData(prev => ({ ...prev, discountAmount: parseFloat(e.target.value) || 0 }))}
                placeholder="0"
              />
              
              <ThemedInput
                label="Additional Charges (₹)"
                type="number"
                min="0"
                value={returnData.additionalCharges}
                onChange={(e) => setReturnData(prev => ({ ...prev, additionalCharges: parseFloat(e.target.value) || 0 }))}
                placeholder="0"
                containerClassName="mb-2"
              />
              <p className="text-xs sm:text-sm text-gray-400">Damages, cleaning, late fees, etc.</p>
            </div>
          </ThemedCard>
        </div>

        {/* Notes */}
        <ThemedCard title="Return Notes" className="mt-6 sm:mt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label className="block text-base sm:text-lg font-semibold text-white mb-2">General Notes</label>
              <textarea
                value={returnData.returnNotes}
                onChange={(e) => setReturnData(prev => ({ ...prev, returnNotes: e.target.value }))}
                placeholder="General notes about the return..."
                className={theme.components.input.base + " h-24 resize-none"}
                rows="3"
              />
            </div>
            <div>
              <label className="block text-base sm:text-lg font-semibold text-white mb-2">Damage Notes</label>
              <textarea
                value={returnData.damageNotes}
                onChange={(e) => setReturnData(prev => ({ ...prev, damageNotes: e.target.value }))}
                placeholder="Describe any damages or issues..."
                className={theme.components.input.base + " h-24 resize-none"}
                rows="3"
              />
            </div>
          </div>
        </ThemedCard>

        {/* Payment Breakdown */}
        <div className={cn(
          "border border-opacity-50 rounded-xl p-4 sm:p-8 mt-6 sm:mt-8",
          booking.isCustomBooking 
            ? "bg-gradient-to-r from-purple-900/50 to-purple-800/50 border-purple-700/50"
            : "bg-gradient-to-r from-blue-900/50 to-blue-800/50 border-blue-700/50"
        )}>
          <h3 className={cn(
            "text-lg sm:text-2xl font-bold mb-4 sm:mb-6 text-center",
            booking.isCustomBooking ? "text-purple-200" : "text-blue-200"
          )}>
            {booking.isCustomBooking ? "📦 Package Breakdown" : "📊 Payment Breakdown"}
          </h3>
          
          <div className="space-y-3 sm:space-y-4 text-sm sm:text-lg">
            {booking.isCustomBooking ? (
              <>
                <div className="flex justify-between gap-2">
                  <span className="text-purple-200">Package:</span>
                  <span className="font-semibold text-white text-right capitalize">
                    {booking.customBookingLabel || `${booking.customBookingType} Package`}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-purple-200">Package price:</span>
                  <span className="font-semibold text-white">₹{booking.finalAmount?.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-purple-200">Duration:</span>
                  <span className="font-semibold text-white">{duration.hours}h {duration.minutes}m</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between gap-2">
                  <span className="text-blue-200">Calculated amount:</span>
                  <span className="font-semibold text-white">₹{advancedPricing.totalAmount.toLocaleString('en-IN')}</span>
                </div>
                
                {advancedPricing.breakdown && advancedPricing.breakdown.length > 0 && (
                  <div className="bg-blue-800/30 rounded-lg p-3 sm:p-4">
                    <h5 className="font-semibold text-blue-200 mb-2 sm:mb-3 text-sm">Detailed breakdown</h5>
                    <div className="space-y-2">
                      {advancedPricing.breakdown.map((block, index) => (
                        <div key={index} className="flex justify-between text-xs sm:text-sm text-blue-100 gap-2">
                          <span className="min-w-0">
                            {block.period} ({block.minutes}min)
                            {block.isNightCharge && <span className="ml-1 text-orange-300">🌙</span>}
                          </span>
                          <span className="font-medium shrink-0">₹{block.rate}</span>
                        </div>
                      ))}
                    </div>
                    {advancedPricing.summary && (
                      <div className="mt-3 pt-2 border-t border-blue-600/30">
                        <div className="text-xs text-blue-300">{advancedPricing.summary}</div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
            
            {returnData.discountAmount > 0 && (
              <div className="flex justify-between text-green-400 gap-2">
                <span>Discount:</span>
                <span className="font-semibold">-₹{returnData.discountAmount.toLocaleString('en-IN')}</span>
              </div>
            )}
            {returnData.additionalCharges > 0 && (
              <div className="flex justify-between text-red-400 gap-2">
                <span>Additional:</span>
                <span className="font-semibold">+₹{returnData.additionalCharges.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className={cn(
              "border-t pt-3 sm:pt-4 flex justify-between text-xl sm:text-2xl font-bold gap-2",
              booking.isCustomBooking ? "border-purple-600" : "border-blue-600"
            )}>
              <span className={booking.isCustomBooking ? "text-purple-200" : "text-blue-200"}>
                Final:
              </span>
              <span className="text-white">₹{finalAmount.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Actions — sticky on mobile */}
        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-4 mt-6 sm:mt-8 sticky bottom-0 sm:static bg-gradient-to-t from-gray-950 via-gray-950/95 to-transparent sm:bg-none pt-4 pb-2 sm:p-0 z-20">
          <Link href={`/active-bookings/${bookingId}`} className="flex-1">
            <ThemedButton variant="secondary" className="w-full min-h-11">
              ← Cancel
            </ThemedButton>
          </Link>
          <ThemedButton
            variant="success"
            onClick={handleReturn}
            disabled={processing || (returnData.paymentMethod === 'upi' && !paymentReceived)}
            className={cn(
              "flex-1 min-h-11",
              (processing || (returnData.paymentMethod === 'upi' && !paymentReceived)) && "opacity-50 cursor-not-allowed"
            )}
          >
            {processing ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Processing...
              </div>
            ) : (
              <span className="text-sm sm:text-base">
                Complete · ₹{finalAmount.toLocaleString('en-IN')}
              </span>
            )}
          </ThemedButton>
        </div>
      </div>
    </ThemedLayout>
  );
}