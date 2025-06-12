'use client';

import { useState, useEffect } from 'react';
import EnhancedReturnProcess from './EnhancedReturnProcess';
import AadhaarUploadSystem from './AadhaarUploadSystem';
import BlacklistManagement from './BlacklistManagement';

const AdminDashboard = () => {
  // State management
  const [bookings, setBookings] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedBookingForReturn, setSelectedBookingForReturn] = useState(null);

  // Load data on component mount
  useEffect(() => {
    loadDashboardData();
    loadBookings();
    loadVehicles();
  }, []);

  const loadDashboardData = async () => {
    try {
      const response = await fetch('/api/dashboard');
      const result = await response.json();
      if (result.success) {
        setDashboardStats(result.data.stats);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    }
  };

  const loadBookings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/bookings');
      const result = await response.json();
      if (result.success) {
        setBookings(result.data);
      }
    } catch (error) {
      console.error('Error loading bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadVehicles = async () => {
    try {
      const response = await fetch('/api/vehicles');
      const result = await response.json();
      if (result.success) {
        setVehicles(result.data);
      }
    } catch (error) {
      console.error('Error loading vehicles:', error);
    }
  };

  // Enhanced return processing
  const handleEnhancedReturn = async (returnData) => {
    try {
      const response = await fetch(`/api/bookings/${selectedBookingForReturn._id}/enhanced-return`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(returnData)
      });
      
      const result = await response.json();
      if (result.success) {
        alert(`Vehicle returned successfully!\nTotal Amount: ₹${returnData.totalAmount}\nPayment Method: ${returnData.paymentMethod}`);
        setSelectedBookingForReturn(null);
        loadBookings();
        loadDashboardData();
        loadVehicles();
      } else {
        alert('Error processing return: ' + result.error);
      }
    } catch (error) {
      console.error('Error processing return:', error);
      alert('Error processing return');
    }
  };

  // Quick return (old method)
  const handleQuickReturn = async (bookingId) => {
    const returnDate = new Date().toISOString().split('T')[0];
    const returnTime = new Date().toTimeString().split(' ')[0].substring(0, 5);
    
    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'return',
          returnDate,
          returnTime,
          paymentStatus: 'paid'
        })
      });
      
      const result = await response.json();
      if (result.success) {
        alert(`Vehicle returned successfully! Total Amount: ₹${result.data.booking.totalAmount}`);
        loadBookings();
        loadDashboardData();
        loadVehicles();
      } else {
        alert('Error processing return: ' + result.error);
      }
    } catch (error) {
      console.error('Error processing return:', error);
      alert('Error processing return');
    }
  };

  // Filter bookings based on search and status
  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = booking.customerDetails.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         booking.customerDetails.mobile.includes(searchTerm) ||
                         booking.vehicleDetails.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || booking.booking.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Format date for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  // Format time for display
  const formatTime = (timeString) => {
    return timeString ? timeString.substring(0, 5) : '';
  };

  // Calculate hours from pickup to now
  const calculateCurrentHours = (booking) => {
    const pickupDateTime = new Date(`${booking.vehicleDetails.pickupDate}T${booking.vehicleDetails.pickupTime}`);
    const now = new Date();
    const diffMs = now - pickupDateTime;
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
    return Math.max(1, diffHours);
  };

  const DashboardOverview = () => (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-blue-100 p-6 rounded-lg border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">Active Bookings</h3>
          <p className="text-3xl font-bold text-blue-600">{dashboardStats.activeBookings || 0}</p>
          <p className="text-blue-600 text-sm mt-1">Currently rented vehicles</p>
        </div>
        
        <div className="bg-green-100 p-6 rounded-lg border border-green-200">
          <h3 className="text-lg font-semibold text-green-800 mb-2">Available Vehicles</h3>
          <p className="text-3xl font-bold text-green-600">{dashboardStats.availableVehicles || 0}</p>
          <p className="text-green-600 text-sm mt-1">Ready for rental</p>
        </div>
        
        <div className="bg-purple-100 p-6 rounded-lg border border-purple-200">
          <h3 className="text-lg font-semibold text-purple-800 mb-2">Today's Bookings</h3>
          <p className="text-3xl font-bold text-purple-600">{dashboardStats.todayBookings || 0}</p>
          <p className="text-purple-600 text-sm mt-1">New bookings today</p>
        </div>

        <div className="bg-yellow-100 p-6 rounded-lg border border-yellow-200">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">Today's Revenue</h3>
          <p className="text-3xl font-bold text-yellow-600">₹{dashboardStats.todayRevenue || 0}</p>
          <p className="text-yellow-600 text-sm mt-1">Completed payments</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => setActiveTab('bookings')}
            className="p-4 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors"
          >
            <div className="text-center">
              <div className="text-2xl mb-2">📋</div>
              <div className="text-sm font-medium text-blue-800">View All Bookings</div>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('documents')}
            className="p-4 bg-green-50 rounded-lg border border-green-200 hover:bg-green-100 transition-colors"
          >
            <div className="text-center">
              <div className="text-2xl mb-2">📄</div>
              <div className="text-sm font-medium text-green-800">Manage Documents</div>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('vehicles')}
            className="p-4 bg-purple-50 rounded-lg border border-purple-200 hover:bg-purple-100 transition-colors"
          >
            <div className="text-center">
              <div className="text-2xl mb-2">🚲</div>
              <div className="text-sm font-medium text-purple-800">Vehicle Status</div>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('blacklist')}
            className="p-4 bg-red-50 rounded-lg border border-red-200 hover:bg-red-100 transition-colors"
          >
            <div className="text-center">
              <div className="text-2xl mb-2">🚫</div>
              <div className="text-sm font-medium text-red-800">Blacklist Management</div>
            </div>
          </button>
        </div>
      </div>

      {/* Recent Bookings Preview */}
      <BookingsTable isPreview={true} />
    </div>
  );

  const BookingsTable = ({ isPreview = false }) => {
    const displayBookings = isPreview ? filteredBookings.slice(0, 5) : filteredBookings;
    
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <h2 className="text-xl font-semibold text-gray-800">
              {isPreview ? 'Recent Bookings' : 'All Bookings'}
            </h2>
            
            {!isPreview && (
              <div className="flex gap-4">
                <input
                  type="text"
                  placeholder="Search by name, mobile, or vehicle..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            )}
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pickup</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {displayBookings.map((booking) => (
                <tr key={booking._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{booking.customerDetails.name}</div>
                      <div className="text-sm text-gray-500">{booking.customerDetails.mobile}</div>
                      {/* Document Status Indicator */}
                      <div className="flex items-center mt-1">
                        {booking.documents?.aadhaarPhoto ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            ✓ Doc
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                            ✗ Doc
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{booking.vehicleDetails.vehicleNumber}</div>
                      <div className="text-sm text-gray-500 capitalize">{booking.vehicleDetails.type}</div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm text-gray-900">{formatDate(booking.vehicleDetails.pickupDate)}</div>
                      <div className="text-sm text-gray-500">{formatTime(booking.vehicleDetails.pickupTime)}</div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      booking.booking.status === 'active' 
                        ? 'bg-green-100 text-green-800'
                        : booking.booking.status === 'completed'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {booking.booking.status}
                    </span>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {booking.booking.status === 'active' 
                      ? `${calculateCurrentHours(booking)} hrs (ongoing)`
                      : booking.vehicleDetails.returnDate 
                      ? `${Math.ceil((new Date(booking.vehicleDetails.returnDate) - new Date(booking.vehicleDetails.pickupDate)) / (1000 * 60 * 60))} hrs`
                      : '-'
                    }
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {booking.booking.status === 'active' 
                      ? `₹${calculateCurrentHours(booking) * 80} (current)`
                      : `₹${booking.booking.totalAmount || 0}`
                    }
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {booking.booking.status === 'active' ? (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setSelectedBookingForReturn(booking)}
                          className="text-green-600 hover:text-green-900 bg-green-100 hover:bg-green-200 px-3 py-1 rounded-md transition-colors"
                        >
                          Enhanced Return
                        </button>
                        <button
                          onClick={() => handleQuickReturn(booking._id)}
                          className="text-blue-600 hover:text-blue-900 bg-blue-100 hover:bg-blue-200 px-3 py-1 rounded-md transition-colors"
                        >
                          Quick Return
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-400">Completed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {displayBookings.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {loading ? 'Loading...' : 'No bookings found'}
            </div>
          )}
        </div>

        {isPreview && filteredBookings.length > 5 && (
          <div className="p-4 border-t border-gray-200 text-center">
            <button
              onClick={() => setActiveTab('bookings')}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              View All {filteredBookings.length} Bookings →
            </button>
          </div>
        )}
      </div>
    );
  };

  const VehiclesTable = () => (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800">Vehicle Status</h2>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle Number</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brand/Model</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Booking</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {vehicles.map((vehicle) => (
              <tr key={vehicle._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {vehicle.vehicleNumber}
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                  {vehicle.type}
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {vehicle.brand} {vehicle.model}
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    vehicle.status === 'available' 
                      ? 'bg-green-100 text-green-800'
                      : vehicle.status === 'rented'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {vehicle.status}
                  </span>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {vehicle.currentBooking ? (
                    <span className="text-blue-600">
                      {vehicle.currentBooking.customerDetails?.name || 'Booked'}
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Handle enhanced return completion
  if (selectedBookingForReturn) {
    return (
      <EnhancedReturnProcess
        booking={selectedBookingForReturn}
        onReturnComplete={handleEnhancedReturn}
        onCancel={() => setSelectedBookingForReturn(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">MR Travels Admin</h1>
              <p className="text-gray-600">Enhanced Bike Rental Management System</p>
            </div>
            <div className="text-sm text-gray-500">
              {new Date().toLocaleDateString('en-IN', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="flex space-x-1 bg-white rounded-lg p-1 shadow overflow-x-auto">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
            { id: 'bookings', label: 'All Bookings', icon: '📋' },
            { id: 'vehicles', label: 'Vehicles', icon: '🚲' },
            { id: 'documents', label: 'Documents', icon: '📄' },
            { id: 'blacklist', label: 'Blacklist', icon: '🚫' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 py-2 px-4 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && <DashboardOverview />}
        {activeTab === 'bookings' && <BookingsTable />}
        {activeTab === 'vehicles' && <VehiclesTable />}
        {activeTab === 'documents' && <AadhaarUploadSystem />}
        {activeTab === 'blacklist' && <BlacklistManagement />}
      </div>
    </div>
  );
};

export default AdminDashboard;