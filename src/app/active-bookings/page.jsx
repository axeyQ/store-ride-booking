// src/app/active-bookings/page.js
'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function ActiveBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVehicle, setFilterVehicle] = useState('all');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    fetchActiveBookings();
    
    // Update current time every minute for real-time duration calculation
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timeInterval);
  }, []);

  const fetchActiveBookings = async () => {
    try {
      console.log('Fetching active bookings...');
      const response = await fetch('/api/bookings?status=active');
      const data = await response.json();
      console.log('API response:', data);
      
      if (data.success) {
        console.log(`Received ${data.bookings.length} active bookings`);
        setBookings(data.bookings);
      } else {
        console.error('API error:', data.error);
      }
    } catch (error) {
      console.error('Error fetching active bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDuration = (startTime) => {
    const start = new Date(startTime);
    const diffMs = currentTime - start;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return { hours, minutes, totalHours: Math.ceil(diffMs / (1000 * 60 * 60)) };
  };

  const calculateCurrentAmount = (startTime) => {
    const duration = calculateDuration(startTime);
    return duration.totalHours * 80; // ₹80 per hour
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredBookings = bookings.filter(booking => {
    const customer = booking.customerId;
    const vehicle = booking.vehicleId;
    
    const matchesSearch = searchTerm === '' || 
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm) ||
      customer.driverLicense.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.plateNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterVehicle === 'all' || vehicle.type === filterVehicle;
    
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading active bookings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-blue-600 hover:text-blue-800">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">Active Bookings</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm text-gray-500">Current Time</div>
                <div className="text-lg font-semibold text-gray-900">
                  {currentTime.toLocaleTimeString('en-IN', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: true 
                  })}
                </div>
              </div>
              <Link 
                href="/booking" 
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold"
              >
                + New Booking
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-6 rounded-xl shadow-lg text-center">
            <div className="text-3xl font-bold text-orange-600">{bookings.length}</div>
            <div className="text-gray-600">Active Rentals</div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-lg text-center">
            <div className="text-3xl font-bold text-green-600">
              ₹{bookings.reduce((sum, booking) => sum + calculateCurrentAmount(booking.startTime), 0).toLocaleString('en-IN')}
            </div>
            <div className="text-gray-600">Current Revenue</div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-lg text-center">
            <div className="text-3xl font-bold text-blue-600">
              {bookings.filter(b => b.vehicleId.type === 'bike').length}
            </div>
            <div className="text-gray-600">Bikes Out</div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-lg text-center">
            <div className="text-3xl font-bold text-purple-600">
              {bookings.filter(b => b.vehicleId.type === 'scooter').length}
            </div>
            <div className="text-gray-600">Scooters Out</div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-lg font-semibold text-gray-700 mb-2">Search Bookings</label>
              <input
                type="text"
                placeholder="Search by name, phone, license, or plate number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-lg font-semibold text-gray-700 mb-2">Filter by Vehicle Type</label>
              <select
                value={filterVehicle}
                onChange={(e) => setFilterVehicle(e.target.value)}
                className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="all">All Vehicles</option>
                <option value="bike">Bikes Only</option>
                <option value="scooter">Scooters Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* Active Bookings List */}
        {filteredBookings.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="text-gray-500 text-xl mb-4">
              {bookings.length === 0 ? 'No active bookings' : 'No bookings match your search'}
            </div>
            <p className="text-gray-400 mb-6">
              {bookings.length === 0 
                ? 'All vehicles are currently available for rental'
                : 'Try adjusting your search or filter criteria'
              }
            </p>
            {bookings.length === 0 && (
              <Link 
                href="/booking" 
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-semibold text-lg"
              >
                Create First Booking
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredBookings.map((booking) => {
              const duration = calculateDuration(booking.startTime);
              const currentAmount = calculateCurrentAmount(booking.startTime);
              
              return (
                <div key={booking._id} className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow">
                  {/* Booking Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        {booking.customerId.name}
                      </h3>
                      <p className="text-gray-600">{booking.customerId.phone}</p>
                      <p className="text-sm text-gray-500">ID: {booking.bookingId}</p>
                    </div>
                    <div className="text-right">
                      <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
                        ACTIVE
                      </span>
                    </div>
                  </div>

                  {/* Vehicle Info */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-gray-600">Vehicle:</span>
                        <p className="font-medium capitalize">
                          {booking.vehicleId.type} - {booking.vehicleId.model}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600">Plate:</span>
                        <p className="font-mono font-bold">{booking.vehicleId.plateNumber}</p>
                      </div>
                    </div>
                  </div>

                  {/* Timing Info */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <span className="text-gray-600">Started:</span>
                      <p className="font-medium">{formatTime(booking.startTime)}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Duration:</span>
                      <p className="font-bold text-blue-600">
                        {duration.hours}h {duration.minutes}m
                      </p>
                    </div>
                  </div>

                  {/* Amount Info */}
                  <div className="bg-blue-50 rounded-lg p-4 mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-blue-800 font-medium">Current Amount:</span>
                      <span className="text-2xl font-bold text-blue-600">
                        ₹{currentAmount.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="text-sm text-blue-600 mt-1">
                      {duration.totalHours} hours × ₹80/hour
                    </div>
                  </div>

                  {/* Safety Checklist Status */}
                  <div className="mb-4">
                    <div className="flex items-center space-x-4 text-sm">
                      <span className={`flex items-center ${booking.helmetProvided ? 'text-green-600' : 'text-red-600'}`}>
                        {booking.helmetProvided ? '✓' : '❌'} Helmet
                      </span>
                      <span className={`flex items-center ${booking.aadharCardCollected ? 'text-green-600' : 'text-red-600'}`}>
                        {booking.aadharCardCollected ? '✓' : '❌'} Aadhar
                      </span>
                      <span className={`flex items-center ${booking.vehicleInspected ? 'text-green-600' : 'text-red-600'}`}>
                        {booking.vehicleInspected ? '✓' : '❌'} Inspected
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <Link
                      href={`/active-bookings/${booking.bookingId}`}
                      className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 px-4 rounded-lg text-center font-medium"
                    >
                      View Details
                    </Link>
                    <Link
                      href={`/return/${booking.bookingId}`}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg text-center font-medium"
                    >
                      Return Vehicle
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Refresh Button */}
        <div className="mt-8 text-center">
          <button
            onClick={fetchActiveBookings}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold"
          >
            🔄 Refresh Bookings
          </button>
        </div>
      </div>
    </div>
  );
}