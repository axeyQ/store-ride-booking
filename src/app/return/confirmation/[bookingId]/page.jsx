// src/app/return/confirmation/[bookingId]/page.js
'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function ReturnConfirmationPage() {
  const params = useParams();
  const bookingId = params.bookingId;
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (bookingId) {
      fetchBookingDetails();
    }
  }, [bookingId]);

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

  const handlePrint = () => {
    window.print();
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
            <button
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold"
            >
              🖨️ Print Receipt
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Success Message - No Print */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8 no-print">
          <div className="flex items-center">
            <div className="text-green-600 text-4xl mr-4">✅</div>
            <div>
              <h2 className="text-2xl font-bold text-green-900">Vehicle Return Completed!</h2>
              <p className="text-green-700 text-lg">
                Payment of ₹{booking.finalAmount.toLocaleString('en-IN')} has been collected. Vehicle is now available for new bookings.
              </p>
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
                  <span className={`ml-2 px-2 py-1 rounded text-sm font-medium ${
                    booking.vehicleCondition === 'good' ? 'bg-green-100 text-green-800' :
                    booking.vehicleCondition === 'minor_issues' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {booking.vehicleCondition === 'good' ? 'Good' :
                     booking.vehicleCondition === 'minor_issues' ? 'Minor Issues' :
                     'Damage Found'}
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

          {/* Payment Details */}
          <div className="border-t pt-6 mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Payment Information</h3>
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Rate per hour:</span>
                    <span>₹80</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Billable hours:</span>
                    <span>{booking.actualDuration}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Base amount:</span>
                    <span>₹{(booking.actualDuration * 80).toLocaleString('en-IN')}</span>
                  </div>
                  
                  {booking.discountAmount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount:</span>
                      <span>-₹{booking.discountAmount.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  
                  {booking.additionalCharges > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Additional charges:</span>
                      <span>+₹{booking.additionalCharges.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Final Amount:</span>
                    <span className="text-green-600">₹{booking.finalAmount.toLocaleString('en-IN')}</span>
                  </div>
                </div>
                
                <div>
                  <div className="text-center">
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
                      PAID
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

          {/* Footer */}
          <div className="border-t pt-6 mt-6 text-center text-sm text-gray-500">
            <p>Thank you for choosing MR Travels!</p>
            <p>Vehicle returned on: {formatDateTime(booking.endTime)} | Return processed by: MR Travels Staff</p>
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