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

  // Advanced pricing state
  const [advancedPricing, setAdvancedPricing] = useState({
    totalAmount: 0,
    breakdown: [],
    totalMinutes: 0,
    summary: ''
  });

  // UPI Configuration
  const UPI_ID = '6261302374@ybl'; // Your test UPI ID
  const BUSINESS_NAME = 'MR Travels';

  // Return form state
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
      // Update pricing every minute
      const pricingInterval = setInterval(fetchAdvancedPricing, 60000);
      return () => clearInterval(pricingInterval);
    }
  }, [booking, currentTime]);

  // Generate UPI QR Code when payment method changes to UPI or amount updates
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

  // Fetch advanced pricing from API
  const fetchAdvancedPricing = async () => {
    if (!booking) return;
    
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
        // Fallback to simple calculation
        const duration = calculateDuration(booking.startTime, currentTime);
        const baseAmount = duration.totalHours * 80;
        setAdvancedPricing({
          totalAmount: baseAmount,
          breakdown: [],
          totalMinutes: duration.totalMinutes,
          summary: `${duration.hours}h ${duration.minutes}m (simple calculation)`
        });
      }
    } catch (error) {
      console.error('Error fetching advanced pricing:', error);
      // Fallback to simple calculation
      const duration = calculateDuration(booking.startTime, currentTime);
      const baseAmount = duration.totalHours * 80;
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
      
      // UPI Payment URL format
      const upiUrl = `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(BUSINESS_NAME)}&am=${finalAmount}&cu=INR&tn=${encodeURIComponent(transactionNote)}`;
      
      // Generate QR Code
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
    
    // For UPI payments, confirm payment received
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

  const duration = calculateDuration(booking.startTime, currentTime);
  const finalAmount = calculateFinalAmount();

  return (
    <ThemedLayout>
      <div className="container mx-auto px-6 py-8">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <h2 className={theme.typography.hero}>
            Vehicle <span className={theme.typography.gradient}>Return</span>
          </h2>
          <p className={`${theme.typography.subtitle} max-w-2xl mx-auto mt-4`}>
            Complete the rental process and collect payment
          </p>
        </div>

        {/* Return Summary Header */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl shadow-lg p-8 mb-8">
          <div className="text-center mb-6">
            <h3 className="text-3xl font-bold mb-2">Return Summary</h3>
            <p className="text-green-100">{booking.customerId.name} - {booking.vehicleId.model}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-3xl font-bold">{duration.hours}h {duration.minutes}m</div>
              <div className="text-green-100">Total Duration</div>
              <div className="text-xs text-green-200 mt-1">{duration.totalMinutes} minutes</div>
            </div>
            <div>
              <div className="text-3xl font-bold">₹{advancedPricing.totalAmount.toLocaleString('en-IN')}</div>
              <div className="text-green-100">Advanced Pricing</div>
              <div className="text-xs text-green-200 mt-1">System calculated</div>
            </div>
            <div>
              <div className="text-3xl font-bold">₹80</div>
              <div className="text-green-100">Base Rate</div>
              <div className="text-xs text-green-200 mt-1">First hour + grace</div>
            </div>
            <div>
              <div className="text-4xl font-bold">₹{finalAmount.toLocaleString('en-IN')}</div>
              <div className="text-green-100">Final Amount</div>
              <div className="text-xs text-green-200 mt-1">After adjustments</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Customer & Vehicle Info */}
          <ThemedCard title="Booking Information">
            <div className="space-y-4">
              <div className="bg-gray-800/50 rounded-lg p-4">
                <h4 className="font-semibold text-white mb-3">Customer Details</h4>
                <div className="space-y-2">
                  <div><span className="text-gray-400">Name:</span> <span className="ml-2 font-semibold text-white">{booking.customerId.name}</span></div>
                  <div><span className="text-gray-400">Phone:</span> <span className="ml-2 font-semibold text-white">{booking.customerId.phone}</span></div>
                  <div><span className="text-gray-400">License:</span> <span className="ml-2 font-mono text-white">{booking.customerId.driverLicense}</span></div>
                  <div><span className="text-gray-400">Booking ID:</span> <span className="ml-2 font-mono font-semibold text-cyan-400">{booking.bookingId}</span></div>
                </div>
              </div>
              
              <div className="bg-gray-800/50 rounded-lg p-4">
                <h4 className="font-semibold text-white mb-3">Vehicle Details</h4>
                <div className="space-y-2">
                  <div><span className="text-gray-400">Vehicle:</span> <span className="ml-2 font-semibold text-white">{booking.vehicleId.model}</span></div>
                  <div><span className="text-gray-400">Plate:</span> <span className="ml-2 font-mono font-semibold text-white">{booking.vehicleId.plateNumber}</span></div>
                  <div><span className="text-gray-400">Started:</span> <span className="ml-2 font-semibold text-white">{formatDateTime(booking.startTime)}</span></div>
                </div>
              </div>
            </div>
          </ThemedCard>

          {/* Payment Method Selection */}
          <ThemedCard title="Payment Method *">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { id: 'cash', label: 'Cash Payment', icon: '💵', description: 'Pay with cash' },
                { id: 'upi', label: 'UPI Payment', icon: '📱', description: 'PhonePe, GPay, etc.' }
              ].map((method) => (
                <div
                  key={method.id}
                  onClick={() => setReturnData(prev => ({ ...prev, paymentMethod: method.id }))}
                  className={cn(
                    "p-6 rounded-lg border-2 cursor-pointer text-center transition-all",
                    returnData.paymentMethod === method.id
                      ? 'border-green-500 bg-green-500/10'
                      : 'border-gray-600 hover:border-gray-500'
                  )}
                >
                  <div className="text-4xl mb-3">{method.icon}</div>
                  <h4 className="font-semibold text-white">{method.label}</h4>
                  <p className="text-sm text-gray-400">{method.description}</p>
                  {returnData.paymentMethod === method.id && (
                    <div className="mt-3">
                      <ThemedBadge color="green">Selected</ThemedBadge>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* UPI QR Code Section */}
            {returnData.paymentMethod === 'upi' && (
              <div className="mt-8 p-6 bg-gradient-to-r from-blue-900/50 to-blue-800/50 border border-blue-500/50 rounded-xl">
                <h4 className="text-xl font-bold text-blue-200 mb-4 text-center">
                  📱 UPI Payment - ₹{finalAmount.toLocaleString('en-IN')}
                </h4>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* QR Code */}
                  <div className="text-center">
                    <div className="bg-white p-4 rounded-xl inline-block mb-4">
                      {qrCodeUrl ? (
                        <img src={qrCodeUrl} alt="UPI QR Code" className="w-64 h-64" />
                      ) : (
                        <div className="w-64 h-64 flex items-center justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                      )}
                    </div>
                    <p className="text-blue-200 text-sm">Scan with any UPI app</p>
                  </div>

                  {/* UPI Details */}
                  <div className="space-y-4">
                    <div className="bg-blue-800/30 rounded-lg p-4">
                      <h5 className="font-semibold text-blue-200 mb-2">Payment Details</h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-blue-300">Amount:</span>
                          <span className="font-bold text-white">₹{finalAmount.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-300">UPI ID:</span>
                          <span className="font-mono text-white">{UPI_ID}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-300">Payee:</span>
                          <span className="text-white">{BUSINESS_NAME}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-300">Note:</span>
                          <span className="text-white text-xs">Return {booking.bookingId}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <ThemedButton
                        variant="secondary"
                        onClick={copyUPIDetails}
                        className="w-full text-sm"
                      >
                        📋 Copy UPI Details
                      </ThemedButton>



                      {/* Payment Confirmation */}
                      <div className="mt-4">
                        <label className="flex items-center space-x-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={paymentReceived}
                            onChange={(e) => setPaymentReceived(e.target.checked)}
                            className="w-5 h-5 text-green-600 border-2 border-gray-300 rounded focus:ring-green-500"
                          />
                          <span className="text-white font-medium">
                            ✅ UPI Payment Received (₹{finalAmount.toLocaleString('en-IN')})
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </ThemedCard>

          {/* Vehicle Condition Assessment */}
          <ThemedCard title="Vehicle Condition Assessment">
            <div className="space-y-4">
              {[
                { id: 'good', label: 'Good Condition', icon: '✅', description: 'No issues found' },
                { id: 'minor_issues', label: 'Minor Issues', icon: '⚠️', description: 'Small scratches or minor wear' },
                { id: 'damage', label: 'Damage Found', icon: '❌', description: 'Significant damage requiring repair' }
              ].map((condition) => (
                <div
                  key={condition.id}
                  onClick={() => setReturnData(prev => ({ ...prev, vehicleCondition: condition.id }))}
                  className={cn(
                    "p-4 rounded-lg border-2 cursor-pointer transition-all",
                    returnData.vehicleCondition === condition.id
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-gray-600 hover:border-gray-500'
                  )}
                >
                  <div className="flex items-center">
                    <div className="text-2xl mr-3">{condition.icon}</div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-white">{condition.label}</h4>
                      <p className="text-sm text-gray-400">{condition.description}</p>
                    </div>
                    {returnData.vehicleCondition === condition.id && (
                      <div className="text-blue-400">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
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
            <div className="space-y-6">
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
              <p className="text-sm text-gray-400">For damages, cleaning, late fees, etc.</p>
            </div>
          </ThemedCard>
        </div>

        {/* Notes Section */}
        <ThemedCard title="Return Notes" className="mt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-lg font-semibold text-white mb-2">General Notes</label>
              <textarea
                value={returnData.returnNotes}
                onChange={(e) => setReturnData(prev => ({ ...prev, returnNotes: e.target.value }))}
                placeholder="General notes about the return..."
                className={theme.components.input.base + " h-24 resize-none"}
                rows="3"
              />
            </div>
            <div>
              <label className="block text-lg font-semibold text-white mb-2">Damage Notes</label>
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

        {/* Advanced Pricing Breakdown */}
        <div className="bg-gradient-to-r from-blue-900/50 to-blue-800/50 border border-blue-700/50 rounded-xl p-8 mt-8">
          <h3 className="text-2xl font-bold text-blue-200 mb-6 text-center">Advanced Payment Breakdown</h3>
          <div className="space-y-4">
            <div className="flex justify-between text-lg">
              <span className="text-blue-200">Advanced Pricing Calculation:</span>
              <span className="font-semibold text-white">₹{advancedPricing.totalAmount.toLocaleString('en-IN')}</span>
            </div>
            
            {/* Show pricing breakdown if available */}
            {advancedPricing.breakdown && advancedPricing.breakdown.length > 0 && (
              <div className="bg-blue-800/30 rounded-lg p-4">
                <h5 className="font-semibold text-blue-200 mb-3">Detailed Breakdown:</h5>
                <div className="space-y-2">
                  {advancedPricing.breakdown.map((block, index) => (
                    <div key={index} className="flex justify-between text-sm text-blue-100">
                      <span>
                        {block.period} ({block.minutes}min)
                        {block.isNightCharge && <span className="ml-1 text-orange-300">🌙</span>}
                      </span>
                      <span className="font-medium">₹{block.rate}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-2 border-t border-blue-600/30">
                  <div className="text-xs text-blue-300">
                    📊 System: {advancedPricing.summary}
                  </div>
                </div>
              </div>
            )}
            
            {returnData.discountAmount > 0 && (
              <div className="flex justify-between text-lg text-green-400">
                <span>Discount:</span>
                <span className="font-semibold">-₹{returnData.discountAmount.toLocaleString('en-IN')}</span>
              </div>
            )}
            {returnData.additionalCharges > 0 && (
              <div className="flex justify-between text-lg text-red-400">
                <span>Additional Charges:</span>
                <span className="font-semibold">+₹{returnData.additionalCharges.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="border-t border-blue-600 pt-4 flex justify-between text-2xl font-bold">
              <span className="text-blue-200">Final Amount:</span>
              <span className="text-white">₹{finalAmount.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mt-8">
          <Link href={`/active-bookings/${bookingId}`} className="flex-1">
            <ThemedButton variant="secondary" className="w-full">
              ← Cancel Return
            </ThemedButton>
          </Link>
          <ThemedButton
            variant="success"
            onClick={handleReturn}
            disabled={processing || (returnData.paymentMethod === 'upi' && !paymentReceived)}
            className={cn(
              "flex-1",
              (processing || (returnData.paymentMethod === 'upi' && !paymentReceived)) && "opacity-50 cursor-not-allowed"
            )}
          >
            {processing ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                Processing...
              </div>
            ) : (
              `Complete Return & Collect ₹${finalAmount.toLocaleString('en-IN')}`
            )}
          </ThemedButton>
        </div>
      </div>
    </ThemedLayout>
  );
}