'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function BookingConfirmationPage() {
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
      console.log('Fetching booking with ID:', bookingId);
      const response = await fetch(`/api/bookings/${bookingId}`);
      
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers.get('content-type'));
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
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
    return new Date(dateString).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handlePrint = () => {
    window.print();
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
          <Link href="/" className="text-blue-600 hover:text-blue-800 font-medium">
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - No Print */}
      <header className="bg-white shadow-sm border-b no-print">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-blue-600 hover:text-blue-800">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">Booking Confirmation</h1>
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
              <h2 className="text-2xl font-bold text-green-900">Booking Successful!</h2>
              <p className="text-green-700 text-lg">
                Vehicle has been assigned to the customer. Please hand over the keys and collect payment.
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
              <span className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full font-bold text-lg">
                BOOKING RECEIPT
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
                  <span className="font-medium text-gray-700">Date & Time:</span>
                  <span className="ml-2">{formatDateTime(booking.startTime)}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Status:</span>
                  <span className="ml-2 bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-medium">
                    {booking.status.toUpperCase()}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Payment:</span>
                  <span className="ml-2">On Return (₹80/hour)</span>
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
                  <span className="ml-2 text-green-600">✓ Collected Physically</span>
                </div>
              </div>
            </div>
          </div>

          {/* Pre-Rental Checklist */}
          <div className="border-t pt-6 mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Pre-Rental Checklist</h3>
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center">
                    <span className={`text-lg mr-2 ${booking.helmetProvided ? 'text-green-600' : 'text-red-600'}`}>
                      {booking.helmetProvided ? '✓' : '❌'}
                    </span>
                    <span>Helmet Provided</span>
                  </div>
                  <div className="flex items-center">
                    <span className={`text-lg mr-2 ${booking.aadharCardCollected ? 'text-green-600' : 'text-red-600'}`}>
                      {booking.aadharCardCollected ? '✓' : '❌'}
                    </span>
                    <span>Aadhar Card Collected</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <span className={`text-lg mr-2 ${booking.vehicleInspected ? 'text-green-600' : 'text-red-600'}`}>
                      {booking.vehicleInspected ? '✓' : '❌'}
                    </span>
                    <span>Vehicle Inspected</span>
                  </div>
                </div>
              </div>
              {booking.additionalNotes && (
                <div className="mt-4 pt-4 border-t">
                  <span className="font-medium text-gray-700">Additional Notes:</span>
                  <p className="mt-1 text-gray-600">{booking.additionalNotes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Payment Details */}
          <div className="border-t pt-6 mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Payment Information</h3>
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 mb-2">₹80 per hour</div>
                <div className="text-gray-600 mb-4">Payment will be collected when customer returns</div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800 text-sm">
                    <strong>Note:</strong> Final amount will be calculated based on actual usage time. 
                    Payment method will be recorded at the time of return.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Digital Signature */}
          {booking.signature && (
            <div className="border-t pt-6 mb-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Customer Signature</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <img 
                  src={booking.signature} 
                  alt="Customer Signature"
                  className="max-w-full h-32 object-contain border border-gray-300 rounded bg-white"
                />
              </div>
            </div>
          )}

          {/* Important Notes */}
          <div className="border-t pt-6 text-sm text-gray-600">
            <h4 className="font-bold text-gray-900 mb-2">Important Instructions:</h4>
            <ul className="space-y-1">
              <li>• Vehicle handed over at: <span className="font-medium">{formatDateTime(booking.startTime)}</span></li>
              <li>• Billing rate: ₹80 per hour or part thereof</li>
              <li>• Payment will be collected when customer returns the vehicle</li>
              <li>• Customer is responsible for vehicle safety and any damages</li>
              <li>• Valid driving license must be carried while riding</li>
              <li>• Helmet must be worn at all times (provided to customer)</li>
              <li>• Aadhar card collected and stored securely</li>
            </ul>
          </div>

          {/* Footer */}
          <div className="border-t pt-6 mt-6 text-center text-sm text-gray-500">
            <p>Thank you for choosing MR Travels!</p>
            <p>For support: Contact store | Generated on: {formatDateTime(new Date())}</p>
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