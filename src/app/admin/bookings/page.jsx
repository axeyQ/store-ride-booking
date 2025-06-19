'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AdminAllBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all'); // all, today, week, month
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  
  const itemsPerPage = 20;

  useEffect(() => {
    fetchBookings();
  }, [currentPage, statusFilter, dateFilter, sortBy, sortOrder, searchTerm]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage,
        limit: itemsPerPage,
        search: searchTerm,
        status: statusFilter,
        dateFilter: dateFilter,
        sortBy: sortBy,
        sortOrder: sortOrder
      });

      const response = await fetch(`/api/admin/all-bookings?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setBookings(data.bookings);
        setTotalPages(Math.ceil(data.total / itemsPerPage));
      } else {
        console.error('Error fetching bookings:', data.error);
        // Fallback to basic bookings API
        const fallbackResponse = await fetch('/api/bookings');
        const fallbackData = await fallbackResponse.json();
        if (fallbackData.success) {
          setBookings(fallbackData.bookings);
          setTotalPages(Math.ceil(fallbackData.bookings.length / itemsPerPage));
        }
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const calculateDuration = (startTime, endTime) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diffMs = end - start;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return { hours, minutes, totalHours: Math.ceil(diffMs / (1000 * 60 * 60)) };
  };

  const calculateCurrentAmount = (booking) => {
    if (booking.finalAmount) return booking.finalAmount;
    const duration = calculateDuration(booking.startTime, booking.endTime);
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

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: 'bg-orange-100 text-orange-800',
      completed: 'bg-green-100 text-green-800', 
      cancelled: 'bg-red-100 text-red-800'
    };
    return statusConfig[status] || 'bg-gray-100 text-gray-800';
  };

  const exportBookings = async () => {
    try {
      const params = new URLSearchParams({
        export: 'true',
        search: searchTerm,
        status: statusFilter,
        dateFilter: dateFilter
      });
      
      window.open(`/api/admin/export-bookings?${params}`, '_blank');
    } catch (error) {
      console.error('Error exporting bookings:', error);
      alert('Export failed. Please try again.');
    }
  };

  const SortIcon = ({ column }) => {
    if (sortBy !== column) return <span className="text-gray-400">↕️</span>;
    return <span className="text-blue-600">{sortOrder === 'asc' ? '↑' : '↓'}</span>;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-xl">Loading all bookings...</div>
        </div>
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
              <Link href="/admin" className="text-blue-600 hover:text-blue-800">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">All Bookings</h1>
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                {bookings.length} results
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={exportBookings}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2"
              >
                📊 Export CSV
              </button>
              <Link
                href="/booking"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
              >
                + New Booking
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <input
                type="text"
                placeholder="Customer name, phone, booking ID..."
                value={searchTerm}
                onChange={handleSearch}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
              <select
                value={dateFilter}
                onChange={(e) => { setDateFilter(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setDateFilter('all');
                  setCurrentPage(1);
                }}
                className="w-full bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Bookings Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    className="px-4 py-3 text-left text-sm font-medium text-gray-500 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('bookingId')}
                  >
                    <div className="flex items-center gap-1">
                      Booking ID <SortIcon column="bookingId" />
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-sm font-medium text-gray-500 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('customerId.name')}
                  >
                    <div className="flex items-center gap-1">
                      Customer <SortIcon column="customerId.name" />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Vehicle</th>
                  <th 
                    className="px-4 py-3 text-left text-sm font-medium text-gray-500 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('startTime')}
                  >
                    <div className="flex items-center gap-1">
                      Start Time <SortIcon column="startTime" />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Duration</th>
                  <th 
                    className="px-4 py-3 text-left text-sm font-medium text-gray-500 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center gap-1">
                      Status <SortIcon column="status" />
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-sm font-medium text-gray-500 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('finalAmount')}
                  >
                    <div className="flex items-center gap-1">
                      Amount <SortIcon column="finalAmount" />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {bookings.map((booking) => {
                  const duration = calculateDuration(booking.startTime, booking.endTime);
                  const amount = calculateCurrentAmount(booking);
                  
                  return (
                    <tr key={booking._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-mono font-medium text-blue-600">
                        {booking.bookingId}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div>
                          <div className="font-medium text-gray-900">{booking.customerId?.name || 'Unknown'}</div>
                          <div className="text-gray-500">{booking.customerId?.phone || 'N/A'}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div>
                          <div className="font-medium text-gray-900">
                            {booking.vehicleId?.model || 'Unknown'}
                          </div>
                          <div className="text-gray-500 font-mono">
                            {booking.vehicleId?.plateNumber || 'N/A'}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {formatDateTime(booking.startTime)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="text-gray-900 font-medium">
                          {duration.hours}h {duration.minutes}m
                        </div>
                        {booking.status === 'active' && (
                          <div className="text-xs text-orange-600">🔴 Live</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(booking.status)}`}>
                          {booking.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                        ₹{amount.toLocaleString('en-IN')}
                        {booking.paymentMethod && (
                          <div className="text-xs text-gray-500 capitalize">
                            {booking.paymentMethod}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex gap-2">
                          <Link
                            href={`/active-bookings/${booking.bookingId}`}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            View
                          </Link>
                          {booking.status === 'active' && (
                            <Link
                              href={`/return/${booking.bookingId}`}
                              className="text-green-600 hover:text-green-800 font-medium"
                            >
                              Return
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-gray-50 px-4 py-3 border-t flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                >
                  Previous
                </button>
                
                {/* Page numbers */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1 border rounded text-sm ${
                        page === currentPage
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {bookings.length === 0 && (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="text-gray-500 text-xl mb-4">No bookings found</div>
            <p className="text-gray-400 mb-6">
              {searchTerm || statusFilter !== 'all' || dateFilter !== 'all'
                ? 'Try adjusting your search or filter criteria'
                : 'No bookings have been created yet'
              }
            </p>
            <Link
              href="/booking"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold"
            >
              Create First Booking
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}