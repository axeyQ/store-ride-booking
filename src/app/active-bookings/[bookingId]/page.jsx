// src/app/active-bookings/[bookingId]/page.js
'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function BookingDetailsPage() {
  const params = useParams();
  const bookingId = params.bookingId;
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

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

  const calculateDuration = (startTime) => {
    const start = new Date(startTime);
    const diffMs = currentTime - start;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
    return { 
      hours, 
      minutes, 
      seconds,
      totalHours: Math.ceil(diffMs / (1000 * 60 * 60)),
      totalMinutes: Math.floor(diffMs / (1000 * 60))
    };
  };

  const calculateCurrentAmount = (startTime) => {
    const duration = calculateDuration(startTime);
    return duration.totalHours * 80;
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

  const duration = calculateDuration(booking.startTime);
  const currentAmount = calculateCurrentAmount(booking.startTime);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Link href="/active-bookings" className="text-blue-600 hover:text-blue-800">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">Booking Details</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="bg-orange-100 text-orange-800 px-4 py-2 rounded-full font-medium">
                {booking.status.toUpperCase()}
              </span>
              <Link
                href={`/return/${booking.bookingId}`}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold"
              >
                Return Vehicle
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Real-time Stats Card */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl shadow-lg p-8 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-3xl font-bold">
                {duration.hours}h {duration.minutes}m
              </div>
              <div className="text-blue-100">Current Duration</div>
            </div>
            <div>
              <div className="text-3xl font-bold">
                ₹{currentAmount.toLocaleString('en-IN')}
              </div>
              <div className="text-blue-100">Current Amount</div>
            </div>
            <div>
              <div className="text-3xl font-bold">
                {currentTime.toLocaleTimeString('en-IN', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  hour12: true 
                })}
              </div>
              <div className="text-blue-100">Current Time</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Customer Information */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Customer Information</h2>
            <div className="space-y-4">
              <div>
                <label className="text-gray-600">Full Name</label>
                <p className="text-xl font-semibold text-gray-900">{booking.customerId.name}</p>
              </div>
              <div>
                <label className="text-gray-600">Phone Number</label>
                <p className="text-xl font-semibold text-gray-900">{booking.customerId.phone}</p>
              </div>
              <div>
                <label className="text-gray-600">Driver License</label>
                <p className="text-xl font-mono font-semibold text-gray-900">{booking.customerId.driverLicense}</p>
              </div>
              <div>
                <label className="text-gray-600">Booking ID</label>
                <p className="text-xl font-mono font-semibold text-blue-600">{booking.bookingId}</p>
              </div>
            </div>
          </div>

          {/* Vehicle Information */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Vehicle Information</h2>
            <div className="space-y-4">
              <div>
                <label className="text-gray-600">Vehicle Type</label>
                <p className="text-xl font-semibold text-gray-900 capitalize">{booking.vehicleId.type}</p>
              </div>
              <div>
                <label className="text-gray-600">Model</label>
                <p className="text-xl font-semibold text-gray-900">{booking.vehicleId.model}</p>
              </div>
              <div>
                <label className="text-gray-600">Plate Number</label>
                <p className="text-xl font-mono font-semibold text-gray-900">{booking.vehicleId.plateNumber}</p>
              </div>
              <div>
                <label className="text-gray-600">Status</label>
                <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
                  RENTED
                </span>
              </div>
            </div>
          </div>

          {/* Timing Information */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Timing Information</h2>
            <div className="space-y-4">
              <div>
                <label className="text-gray-600">Start Date & Time</label>
                <p className="text-xl font-semibold text-gray-900">{formatDateTime(booking.startTime)}</p>
              </div>
              <div>
                <label className="text-gray-600">Total Duration</label>
                <p className="text-xl font-bold text-blue-600">
                  {duration.hours} hours, {duration.minutes} minutes
                </p>
              </div>
              <div>
                <label className="text-gray-600">Live Timer</label>
                <p className="text-xl font-mono font-bold text-green-600">
                  {duration.totalMinutes.toLocaleString()} minutes
                </p>
              </div>
            </div>
          </div>

          {/* Pre-Rental Checklist */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Pre-Rental Checklist</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-medium">Helmet Provided</span>
                <span className={`text-lg ${booking.helmetProvided ? 'text-green-600' : 'text-red-600'}`}>
                  {booking.helmetProvided ? '✓ Yes' : '❌ No'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-medium">Aadhar Card Collected</span>
                <span className={`text-lg ${booking.aadharCardCollected ? 'text-green-600' : 'text-red-600'}`}>
                  {booking.aadharCardCollected ? '✓ Yes' : '❌ No'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-medium">Vehicle Inspected</span>
                <span className={`text-lg ${booking.vehicleInspected ? 'text-green-600' : 'text-red-600'}`}>
                  {booking.vehicleInspected ? '✓ Yes' : '❌ No'}
                </span>
              </div>
            </div>

            {booking.additionalNotes && (
              <div className="mt-6">
                <label className="text-gray-600">Additional Notes</label>
                <p className="text-gray-900 bg-gray-50 p-3 rounded-lg mt-2">{booking.additionalNotes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Payment Information */}
        <div className="bg-white rounded-xl shadow-lg p-8 mt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Payment Information</h2>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-gray-600 mb-2">Rate per Hour</div>
                <div className="text-2xl font-bold text-blue-600">₹80</div>
              </div>
              <div>
                <div className="text-gray-600 mb-2">Billable Hours</div>
                <div className="text-2xl font-bold text-blue-600">{duration.totalHours}</div>
              </div>
              <div>
                <div className="text-gray-600 mb-2">Current Total</div>
                <div className="text-3xl font-bold text-green-600">₹{currentAmount.toLocaleString('en-IN')}</div>
              </div>
            </div>
            <div className="text-center mt-6">
              <p className="text-blue-800 font-medium">
                Payment will be collected when customer returns the vehicle
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mt-8">
          <Link
            href="/active-bookings"
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-4 px-6 rounded-lg text-center font-semibold text-lg"
          >
            ← Back to Active Bookings
          </Link>
          <Link
            href={`/return/${booking.bookingId}`}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white py-4 px-6 rounded-lg text-center font-semibold text-lg"
          >
            Return Vehicle & Collect Payment →
          </Link>
        </div>
      </div>
    </div>
  );
}