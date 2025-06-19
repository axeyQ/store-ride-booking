// src/app/return/[bookingId]/page.js
'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function VehicleReturnPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.bookingId;
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

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
    if (!booking) return 0;
    
    const duration = calculateDuration(booking.startTime, currentTime);
    const baseAmount = duration.totalHours * 80;
    const discount = returnData.discountAmount || 0;
    const additionalCharges = returnData.additionalCharges || 0;
    
    return Math.max(0, baseAmount - discount + additionalCharges);
  };

  const handleReturn = async () => {
    if (!booking) return;
    
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
        // Redirect to completion confirmation
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-xl">Loading booking details...</div>
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

  const duration = calculateDuration(booking.startTime, currentTime);
  const finalAmount = calculateFinalAmount();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Link href={`/active-bookings/${bookingId}`} className="text-blue-600 hover:text-blue-800">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">Vehicle Return</h1>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Return Time</div>
              <div className="text-lg font-semibold text-gray-900">
                {currentTime.toLocaleString('en-IN', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  hour12: true 
                })}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Final Summary Card */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl shadow-lg p-8 mb-8">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold mb-2">Return Summary</h2>
            <p className="text-green-100">{booking.customerId.name} - {booking.vehicleId.model}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-2xl font-bold">{duration.hours}h {duration.minutes}m</div>
              <div className="text-green-100">Total Duration</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{duration.totalHours} hours</div>
              <div className="text-green-100">Billable Hours</div>
            </div>
            <div>
              <div className="text-2xl font-bold">₹80</div>
              <div className="text-green-100">Rate per Hour</div>
            </div>
            <div>
              <div className="text-3xl font-bold">₹{finalAmount.toLocaleString('en-IN')}</div>
              <div className="text-green-100">Final Amount</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Customer & Vehicle Info */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Booking Information</h3>
            <div className="space-y-3">
              <div>
                <span className="text-gray-600">Customer:</span>
                <span className="ml-2 font-semibold">{booking.customerId.name}</span>
              </div>
              <div>
                <span className="text-gray-600">Phone:</span>
                <span className="ml-2 font-semibold">{booking.customerId.phone}</span>
              </div>
              <div>
                <span className="text-gray-600">Vehicle:</span>
                <span className="ml-2 font-semibold">{booking.vehicleId.model} ({booking.vehicleId.plateNumber})</span>
              </div>
              <div>
                <span className="text-gray-600">Started:</span>
                <span className="ml-2 font-semibold">{formatDateTime(booking.startTime)}</span>
              </div>
              <div>
                <span className="text-gray-600">Booking ID:</span>
                <span className="ml-2 font-mono font-semibold text-blue-600">{booking.bookingId}</span>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Payment Method *</h3>
            <div className="grid grid-cols-2 gap-4">
              <div
                onClick={() => setReturnData(prev => ({ ...prev, paymentMethod: 'cash' }))}
                className={`p-4 rounded-lg border-2 cursor-pointer text-center ${
                  returnData.paymentMethod === 'cash'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl mb-2">💵</div>
                <div className="font-semibold">Cash Payment</div>
                <div className="text-sm text-gray-600">Pay with cash</div>
              </div>
              
              <div
                onClick={() => setReturnData(prev => ({ ...prev, paymentMethod: 'upi' }))}
                className={`p-4 rounded-lg border-2 cursor-pointer text-center ${
                  returnData.paymentMethod === 'upi'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl mb-2">📱</div>
                <div className="font-semibold">UPI Payment</div>
                <div className="text-sm text-gray-600">PhonePe, GPay, etc.</div>
              </div>
            </div>
          </div>

          {/* Vehicle Condition */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Vehicle Condition</h3>
            <div className="space-y-3">
              {['good', 'minor_issues', 'damage'].map((condition) => (
                <div
                  key={condition}
                  onClick={() => setReturnData(prev => ({ ...prev, vehicleCondition: condition }))}
                  className={`p-3 rounded-lg border-2 cursor-pointer ${
                    returnData.vehicleCondition === condition
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center">
                    <div className="text-xl mr-3">
                      {condition === 'good' ? '✅' : condition === 'minor_issues' ? '⚠️' : '❌'}
                    </div>
                    <div>
                      <div className="font-semibold">
                        {condition === 'good' ? 'Good Condition' : 
                         condition === 'minor_issues' ? 'Minor Issues' : 'Damage Found'}
                      </div>
                      <div className="text-sm text-gray-600">
                        {condition === 'good' ? 'No issues found' : 
                         condition === 'minor_issues' ? 'Small scratches or minor wear' : 'Significant damage requiring repair'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Additional Charges & Discounts */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Amount Adjustments</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-md font-medium text-gray-700 mb-2">Discount Amount (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={returnData.discountAmount}
                  onChange={(e) => setReturnData(prev => ({ ...prev, discountAmount: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>
              
              <div>
                <label className="block text-md font-medium text-gray-700 mb-2">Additional Charges (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={returnData.additionalCharges}
                  onChange={(e) => setReturnData(prev => ({ ...prev, additionalCharges: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
                <p className="text-sm text-gray-500 mt-1">For damages, cleaning, etc.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Notes Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mt-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Return Notes</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-md font-medium text-gray-700 mb-2">General Notes</label>
              <textarea
                value={returnData.returnNotes}
                onChange={(e) => setReturnData(prev => ({ ...prev, returnNotes: e.target.value }))}
                placeholder="General notes about the return..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows="3"
              />
            </div>
            
            <div>
              <label className="block text-md font-medium text-gray-700 mb-2">Damage Notes</label>
              <textarea
                value={returnData.damageNotes}
                onChange={(e) => setReturnData(prev => ({ ...prev, damageNotes: e.target.value }))}
                placeholder="Describe any damages or issues..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows="3"
              />
            </div>
          </div>
        </div>

        {/* Final Amount Breakdown */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mt-8">
          <h3 className="text-xl font-bold text-blue-900 mb-4">Payment Breakdown</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Base Amount ({duration.totalHours} hours × ₹80):</span>
              <span className="font-semibold">₹{(duration.totalHours * 80).toLocaleString('en-IN')}</span>
            </div>
            {returnData.discountAmount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount:</span>
                <span className="font-semibold">-₹{returnData.discountAmount.toLocaleString('en-IN')}</span>
              </div>
            )}
            {returnData.additionalCharges > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Additional Charges:</span>
                <span className="font-semibold">+₹{returnData.additionalCharges.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="border-t pt-2 flex justify-between text-xl font-bold text-blue-900">
              <span>Final Amount:</span>
              <span>₹{finalAmount.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mt-8">
          <Link
            href={`/active-bookings/${bookingId}`}
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-4 px-6 rounded-lg text-center font-semibold text-lg"
          >
            ← Cancel Return
          </Link>
          <button
            onClick={handleReturn}
            disabled={processing}
            className={`flex-1 py-4 px-6 rounded-lg text-center font-semibold text-lg ${
              processing
                ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {processing ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                Processing...
              </div>
            ) : (
              `Complete Return & Collect ₹${finalAmount.toLocaleString('en-IN')}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}