'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function CustomerDetailsPage() {
  const params = useParams();
  const customerId = params.customerId;
  const [customer, setCustomer] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (customerId) {
      fetchCustomerDetails();
      fetchCustomerBookings();
    }
  }, [customerId]);

  const fetchCustomerDetails = async () => {
    try {
      const response = await fetch(`/api/customers/${customerId}`);
      const data = await response.json();
      
      if (data.success) {
        setCustomer(data.customer);
      } else {
        setError(data.error || 'Customer not found');
      }
    } catch (error) {
      console.error('Error fetching customer:', error);
      setError('Failed to load customer details');
    }
  };

  const fetchCustomerBookings = async () => {
    try {
      const response = await fetch(`/api/customers/${customerId}/bookings`);
      const data = await response.json();
      
      if (data.success) {
        setBookings(data.bookings);
      }
    } catch (error) {
      console.error('Error fetching customer bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    if (!bookings.length) return { totalSpent: 0, avgPerBooking: 0, totalHours: 0 };
    
    const totalSpent = bookings.reduce((sum, booking) => sum + (booking.finalAmount || 0), 0);
    const avgPerBooking = Math.round(totalSpent / bookings.length);
    const totalHours = bookings.reduce((sum, booking) => sum + (booking.actualDuration || 0), 0);
    
    return { totalSpent, avgPerBooking, totalHours };
  };

  const getCustomerTier = (totalBookings) => {
    if (totalBookings >= 20) return { label: 'VIP', color: 'bg-purple-100 text-purple-800', icon: '👑' };
    if (totalBookings >= 10) return { label: 'Gold', color: 'bg-yellow-100 text-yellow-800', icon: '🥇' };
    if (totalBookings >= 5) return { label: 'Silver', color: 'bg-gray-100 text-gray-800', icon: '🥈' };
    return { label: 'New', color: 'bg-blue-100 text-blue-800', icon: '🆕' };
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

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: 'bg-orange-100 text-orange-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return statusConfig[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-xl">Loading customer details...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">❌ {error}</div>
          <Link href="/customers" className="text-blue-600 hover:text-blue-800 font-medium">
            ← Back to Customers
          </Link>
        </div>
      </div>
    );
  }

  const stats = calculateStats();
  const tier = getCustomerTier(customer?.totalBookings || 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Link href="/customers" className="text-blue-600 hover:text-blue-800">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{customer?.name}</h1>
                <p className="text-gray-600">Customer Details & History</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`px-3 py-2 rounded-full text-sm font-medium ${tier.color} flex items-center gap-1`}>
                <span>{tier.icon}</span>
                {tier.label} Customer
              </span>
              <Link
                href={`/booking?customerId=${customerId}`}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
              >
                + New Booking
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Customer Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-lg text-center">
            <div className="text-3xl font-bold text-blue-600">{customer?.totalBookings || 0}</div>
            <div className="text-gray-600">Total Bookings</div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-lg text-center">
            <div className="text-3xl font-bold text-green-600">₹{stats.totalSpent.toLocaleString('en-IN')}</div>
            <div className="text-gray-600">Total Spent</div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-lg text-center">
            <div className="text-3xl font-bold text-orange-600">₹{stats.avgPerBooking.toLocaleString('en-IN')}</div>
            <div className="text-gray-600">Avg per Booking</div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-lg text-center">
            <div className="text-3xl font-bold text-purple-600">{stats.totalHours}</div>
            <div className="text-gray-600">Total Hours</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-lg mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('bookings')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'bookings'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Booking History ({bookings.length})
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Customer Information */}
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Customer Information</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Full Name</label>
                      <p className="text-lg text-gray-900">{customer?.name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                      <p className="text-lg text-gray-900">{customer?.phone}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Driver License</label>
                      <p className="text-lg font-mono text-gray-900">{customer?.driverLicense}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Customer Since</label>
                      <p className="text-lg text-gray-900">
                        {customer?.createdAt ? formatDateTime(customer.createdAt) : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Last Visit</label>
                      <p className="text-lg text-gray-900">
                        {customer?.lastVisit ? formatDateTime(customer.lastVisit) : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Customer Analytics</h3>
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm text-gray-600">Booking Frequency</div>
                      <div className="text-xl font-bold text-gray-900">
                        {bookings.length > 0 ? 'Regular Customer' : 'New Customer'}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm text-gray-600">Preferred Vehicle</div>
                      <div className="text-xl font-bold text-gray-900">
                        {bookings.length > 0 ? 'Various' : 'None yet'}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm text-gray-600">Customer Status</div>
                      <div className="text-xl font-bold text-gray-900">Active</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'bookings' && (
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Booking History</h3>
                
                {bookings.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-gray-500 text-xl mb-4">No bookings yet</div>
                    <p className="text-gray-400 mb-6">This customer hasn't made any bookings</p>
                    <Link
                      href={`/booking?customerId=${customerId}`}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold"
                    >
                      Create First Booking
                    </Link>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Booking ID</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Vehicle</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Date</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Duration</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Amount</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {bookings.map((booking) => (
                          <tr key={booking._id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-mono text-blue-600">
                              {booking.bookingId}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <div>
                                <div className="font-medium text-gray-900">
                                  {booking.vehicleId?.model || 'Unknown'}
                                </div>
                                <div className="text-gray-500 font-mono text-xs">
                                  {booking.vehicleId?.plateNumber || 'N/A'}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {formatDateTime(booking.startTime)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {booking.actualDuration || 0} hours
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                              ₹{(booking.finalAmount || 0).toLocaleString('en-IN')}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(booking.status)}`}>
                                {booking.status.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <Link
                                href={`/active-bookings/${booking.bookingId}`}
                                className="text-blue-600 hover:text-blue-800 font-medium"
                              >
                                View
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}