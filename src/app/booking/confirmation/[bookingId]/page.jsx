'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function BookingConfirmationPage() {
  const params = useParams();
  const bookingId = params?.bookingId;
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (bookingId) {
      fetchBookingDetails();
    } else {
      setError('Booking ID not found in URL');
      setLoading(false);
    }
  }, [bookingId]);

  const fetchBookingDetails = async () => {
    try {
      console.log('Fetching booking with ID:', bookingId);
      const response = await fetch(`/api/bookings/${bookingId}`);
      
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers.get('content-type'));
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Received non-JSON response:', text.substring(0, 200));
        throw new Error('API returned non-JSON response');
      }
      
      const data = await response.json();
      console.log('Booking data received:', data);
      
      if (data.success) {
        // Validate booking data structure
        if (!data.booking) {
          throw new Error('Booking data is missing in response');
        }
        setBooking(data.booking);
      } else {
        setError(data.error || 'Booking not found');
      }
    } catch (error) {
      console.error('Error fetching booking:', error);
      setError(`Failed to load booking details: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Invalid Date';
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Helper function to safely get customer name
  const getCustomerName = () => {
    return booking?.customerId?.name || 'Unknown Customer';
  };

  // Helper function to safely get customer phone
  const getCustomerPhone = () => {
    return booking?.customerId?.phone || 'N/A';
  };

  // Helper function to safely get customer license
  const getCustomerLicense = () => {
    return booking?.customerId?.driverLicense || 'N/A';
  };

  // Helper function to safely get vehicle info
  const getVehicleInfo = () => {
    const vehicle = booking?.vehicleId;
    return {
      type: vehicle?.type || 'Unknown',
      model: vehicle?.model || 'Unknown Vehicle',
      plateNumber: vehicle?.plateNumber || 'N/A'
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
          <div className="text-xl text-white">Loading booking details...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center max-w-md">
          <div className="text-red-400 text-6xl mb-4">❌</div>
          <div className="text-red-400 text-xl mb-4">{error}</div>
          <div className="text-gray-400 mb-6">
            Please check the booking ID and try again, or contact support if the problem persists.
          </div>
          <div className="space-y-3">
            <Link href="/booking" className="block">
              <button className="w-full bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors">
                🆕 Create New Booking
              </button>
            </Link>
            <Link href="/" className="block">
              <button className="w-full bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors">
                🏠 Back to Home
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="text-yellow-400 text-6xl mb-4">⚠️</div>
          <div className="text-yellow-400 text-xl mb-4">No booking data found</div>
          <Link href="/" className="text-cyan-400 hover:text-cyan-300 font-medium">
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const vehicleInfo = getVehicleInfo();

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header - No Print */}
      <header className="bg-gray-800 shadow-sm border-b border-gray-700 no-print">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-cyan-400 hover:text-cyan-300">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <h1 className="text-3xl font-bold text-white">Booking Confirmation</h1>
            </div>
            <button
              onClick={handlePrint}
              className="bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              🖨️ Print Receipt
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Success Message - No Print */}
        <div className="bg-green-900/50 border border-green-700/50 rounded-lg p-6 mb-8 no-print">
          <div className="flex items-center">
            <div className="text-green-400 text-4xl mr-4">✅</div>
            <div>
              <h2 className="text-2xl font-bold text-green-300">Booking Successful!</h2>
              <p className="text-green-200 text-lg">
                Vehicle has been assigned to the customer. Please hand over the keys and collect any required deposits.
              </p>
            </div>
          </div>
        </div>

        {/* Receipt Content - For Print */}
        <div className="bg-white rounded-lg shadow-lg p-8 print:shadow-none print:p-0">
          {/* Business Header */}
          <div className="text-center border-b-2 border-gray-200 pb-6 mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">MR Travels</h1>
            <p className="text-gray-600">Bike & Scooter Rental Service</p>
            <p className="text-gray-600">Bhopal, Madhya Pradesh</p>
          </div>

          {/* Booking Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* Booking Details */}
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
                📋 Booking Details
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Booking ID:</span>
                  <span className="font-semibold text-gray-900">{booking.bookingId || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className="font-semibold text-green-600 capitalize">{booking.status || 'active'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Booking Time:</span>
                  <span className="font-semibold text-gray-900">{formatDateTime(booking.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Start Time:</span>
                  <span className="font-semibold text-gray-900">{formatDateTime(booking.startTime)}</span>
                </div>
              </div>
            </div>

            {/* Customer Details */}
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
                👤 Customer Details
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Name:</span>
                  <span className="font-semibold text-gray-900">{getCustomerName()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Phone:</span>
                  <span className="font-semibold text-gray-900">{getCustomerPhone()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">License:</span>
                  <span className="font-semibold text-gray-900">{getCustomerLicense()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Vehicle Details */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
              🚗 Vehicle Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-gray-600 text-sm">Type</div>
                <div className="font-semibold text-gray-900 capitalize">{vehicleInfo.type}</div>
              </div>
              <div className="text-center">
                <div className="text-gray-600 text-sm">Model</div>
                <div className="font-semibold text-gray-900">{vehicleInfo.model}</div>
              </div>
              <div className="text-center">
                <div className="text-gray-600 text-sm">Plate Number</div>
                <div className="font-semibold text-gray-900 font-mono">{vehicleInfo.plateNumber}</div>
              </div>
            </div>
          </div>

          {/* Checklist */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
              ✅ Pre-Rental Checklist
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`p-3 rounded-lg border-2 ${booking.helmetProvided ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
                <div className="flex items-center">
                  <span className="text-2xl mr-2">{booking.helmetProvided ? '✅' : '❌'}</span>
                  <span className="font-medium">Helmet Provided</span>
                </div>
              </div>
              <div className={`p-3 rounded-lg border-2 ${booking.aadharCardCollected ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
                <div className="flex items-center">
                  <span className="text-2xl mr-2">{booking.aadharCardCollected ? '✅' : '❌'}</span>
                  <span className="font-medium">Aadhar Collected</span>
                </div>
              </div>
              <div className={`p-3 rounded-lg border-2 ${booking.vehicleInspected ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
                <div className="flex items-center">
                  <span className="text-2xl mr-2">{booking.vehicleInspected ? '✅' : '❌'}</span>
                  <span className="font-medium">Vehicle Inspected</span>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Notes */}
          {booking.additionalNotes && (
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
                📝 Additional Notes
              </h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700">{booking.additionalNotes}</p>
              </div>
            </div>
          )}

          {/* Terms & Conditions */}
          <div className="border-t-2 border-gray-200 pt-6 mt-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Important Terms & Conditions</h3>
            <div className="text-sm text-gray-600 space-y-2">
              <p>• Hourly rate: ₹80/hour with 15-minute grace period</p>
              <p>• Security deposit: ₹500 (refundable on safe return)</p>
              <p>• Late return after 10:00 PM incurs additional charges</p>
              <p>• Customer is responsible for traffic violations and fines</p>
              <p>• Vehicle must be returned with same fuel level</p>
              <p>• Any damage to vehicle will be charged separately</p>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-gray-500 text-sm mt-8 pt-6 border-t border-gray-200">
            <p>Thank you for choosing MR Travels!</p>
            <p>For support, contact us during business hours: 6:00 AM - 10:00 PM</p>
          </div>
        </div>

        {/* Action Buttons - No Print */}
        <div className="flex flex-col md:flex-row gap-4 mt-8 no-print">
          <Link href="/booking" className="flex-1">
            <button className="w-full bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors">
              🆕 Create New Booking
            </button>
          </Link>
          <Link href="/active-bookings" className="flex-1">
            <button className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors">
              📋 View Active Bookings
            </button>
          </Link>
          <Link href="/" className="flex-1">
            <button className="w-full bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors">
              🏠 Back to Dashboard
            </button>
          </Link>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: white !important;
          }
          .bg-gray-900 {
            background: white !important;
          }
        }
      `}</style>
    </div>
  );
}