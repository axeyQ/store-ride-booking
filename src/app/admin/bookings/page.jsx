'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ThemedLayout,
  ThemedCard,
  ThemedStatsCard,
  ThemedButton,
  ThemedInput,
  ThemedSelect,
  ThemedBadge
} from '@/components/themed';
import { theme } from '@/lib/theme';
import { cn } from '@/lib/utils';

export default function ThemedAllBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showSignatures, setShowSignatures] = useState(true);
  const [selectedSignature, setSelectedSignature] = useState(null);
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

  const calculateDuration = (startTime, endTime) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diffMs = end - start;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return { hours, minutes };
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
    switch (status) {
      case 'active':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'completed':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'cancelled':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const SortIcon = ({ column }) => {
    if (sortBy !== column) return <span className="text-gray-500">↕</span>;
    return <span className="text-cyan-400">{sortOrder === 'asc' ? '↑' : '↓'}</span>;
  };

  // Signature Modal Component - Themed Style
  const SignatureModal = ({ signature, onClose }) => {
    if (!signature) return null;

    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-white">Customer Signature</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-800 transition-all"
            >
              ×
            </button>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-600">
            <img
              src={signature}
              alt="Customer Signature"
              className="w-full h-auto max-h-80 object-contain"
            />
          </div>
          <div className="mt-6 flex justify-end">
            <ThemedButton variant="secondary" onClick={onClose}>
              Close
            </ThemedButton>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <ThemedLayout>
        <div className="min-h-screen flex items-center justify-center">
          <ThemedCard>
            <div className="flex items-center space-x-3 p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
              <span className="text-white text-xl">Loading all bookings...</span>
            </div>
          </ThemedCard>
        </div>
      </ThemedLayout>
    );
  }

  return (
    <ThemedLayout>
      <div className="container mx-auto px-6 py-8">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <h2 className={theme.typography.hero}>
            All <span className={theme.typography.gradient}>Bookings</span>
          </h2>
          <p className={`${theme.typography.subtitle} max-w-2xl mx-auto mt-4`}>
            Complete booking management with signature verification
          </p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <ThemedStatsCard
            title="Total Bookings"
            value={bookings.length}
            subtitle="All time records"
            colorScheme="bookings"
            icon={<div className="text-4xl mb-2">📋</div>}
          />
          
          <ThemedStatsCard
            title="Active Rentals"
            value={bookings.filter(b => b.status === 'active').length}
            subtitle="Currently out"
            colorScheme="revenue"
            icon={<div className="text-4xl mb-2">🚴</div>}
          />
          <ThemedStatsCard
            title="Completed"
            value={bookings.filter(b => b.status === 'completed').length}
            subtitle="Successfully returned"
            colorScheme="customers"
            icon={<div className="text-4xl mb-2">✅</div>}
          />
          <ThemedStatsCard
            title="With Signatures"
            value={bookings.filter(b => b.signature).length}
            subtitle="Verified bookings"
            colorScheme="vehicles"
            icon={<div className="text-4xl mb-2">✍️</div>}
          />
        </div>

        {/* Filters Section */}
        <ThemedCard title="Search & Filters" description="Find specific bookings quickly" className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-4">
            <ThemedInput
              label="Search Bookings"
              placeholder="Booking ID, customer name, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            
            <ThemedSelect
              label="Status Filter"
              value={statusFilter}
              onValueChange={(value) => { setStatusFilter(value); setCurrentPage(1); }}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'active', label: 'Active' },
                { value: 'completed', label: 'Completed' },
                { value: 'cancelled', label: 'Cancelled' }
              ]}
            />

            <ThemedSelect
              label="Date Range"
              value={dateFilter}
              onValueChange={(value) => { setDateFilter(value); setCurrentPage(1); }}
              options={[
                { value: 'all', label: 'All Time' },
                { value: 'today', label: 'Today' },
                { value: 'week', label: 'This Week' },
                { value: 'month', label: 'This Month' }
              ]}
            />

            <div className="space-y-2">
              <label className="block text-lg font-semibold text-white">Options</label>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showSignatures}
                  onChange={(e) => setShowSignatures(e.target.checked)}
                  className="w-5 h-5 text-cyan-600 border-gray-600 rounded focus:ring-cyan-500 bg-gray-800"
                />
                <span className="text-white">Show Signatures</span>
              </label>
            </div>
          </div>

          <div className="flex gap-4">
            <ThemedButton
              variant="secondary"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setDateFilter('all');
                setCurrentPage(1);
              }}
            >
              Clear Filters
            </ThemedButton>
            <ThemedButton variant="primary" onClick={fetchBookings}>
              🔄 Refresh
            </ThemedButton>
          </div>
        </ThemedCard>

        {/* Bookings Table */}
        <ThemedCard title="📋 Booking Records" description={`Showing ${bookings.length} bookings`}>
          {bookings.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-2xl font-bold text-white mb-4">No Bookings Found</h3>
              <p className="text-gray-400 mb-8">
                {searchTerm || statusFilter !== 'all' || dateFilter !== 'all'
                  ? 'Try adjusting your search or filter criteria'
                  : 'No bookings have been created yet'}
              </p>
              <Link href="/booking">
                <ThemedButton variant="primary">
                  ➕ Create First Booking
                </ThemedButton>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th
                      className="text-left py-4 px-4 font-semibold text-gray-400 cursor-pointer hover:text-cyan-400 transition-colors"
                      onClick={() => handleSort('bookingId')}
                    >
                      <div className="flex items-center gap-2">
                        Booking ID <SortIcon column="bookingId" />
                      </div>
                    </th>
                    <th
                      className="text-left py-4 px-4 font-semibold text-gray-400 cursor-pointer hover:text-cyan-400 transition-colors"
                      onClick={() => handleSort('customerId.name')}
                    >
                      <div className="flex items-center gap-2">
                        Customer <SortIcon column="customerId.name" />
                      </div>
                    </th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-400">
                      Vehicle
                    </th>
                    <th
                      className="text-left py-4 px-4 font-semibold text-gray-400 cursor-pointer hover:text-cyan-400 transition-colors"
                      onClick={() => handleSort('startTime')}
                    >
                      <div className="flex items-center gap-2">
                        Start Time <SortIcon column="startTime" />
                      </div>
                    </th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-400">
                      Duration
                    </th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-400">
                      Status
                    </th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-400">
                      Amount
                    </th>
                    {showSignatures && (
                      <th className="text-left py-4 px-4 font-semibold text-gray-400">
                        Signature
                      </th>
                    )}
                    <th className="text-left py-4 px-4 font-semibold text-gray-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {bookings.map((booking) => {
                    const duration = calculateDuration(booking.startTime, booking.endTime);
                    const amount = booking.finalAmount || 0;

                    return (
                      <tr key={booking._id} className="hover:bg-gray-800/30 transition-colors">
                        <td className="py-4 px-4">
                          <div className="font-mono font-bold text-cyan-400">
                            {booking.bookingId}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="font-semibold text-white">
                            {booking.customerId?.name || 'Unknown'}
                          </div>
                          <div className="text-gray-400 text-sm">
                            {booking.customerId?.phone || ''}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-white font-medium">
                            {booking.vehicleId?.model || 'Unknown'}
                          </div>
                          <div className="text-gray-400 text-sm font-mono">
                            {booking.vehicleId?.plateNumber || ''}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-white">
                          {formatDateTime(booking.startTime)}
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-white font-semibold">
                            {duration.hours}h {duration.minutes}m
                          </div>
                          {booking.status === 'active' && (
                            <div className="text-orange-400 text-sm flex items-center gap-1">
                              <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                              Live
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <ThemedBadge className={`${getStatusBadge(booking.status)} border`}>
                            {booking.status.toUpperCase()}
                          </ThemedBadge>
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-white font-bold text-lg">
                            ₹{amount.toLocaleString('en-IN')}
                          </div>
                          {booking.paymentMethod && (
                            <div className="text-gray-400 text-sm capitalize">
                              {booking.paymentMethod}
                            </div>
                          )}
                        </td>
                        {showSignatures && (
                          <td className="py-4 px-4">
                            {booking.signature ? (
                              <div className="flex items-center gap-3">
                                {/* Signature Thumbnail */}
                                <div
                                  className="w-20 h-10 border border-gray-600 rounded-lg cursor-pointer hover:border-cyan-500 bg-white/5 flex items-center justify-center group transition-all"
                                  onClick={() => setSelectedSignature(booking.signature)}
                                  title="Click to view full signature"
                                >
                                  <img
                                    src={booking.signature}
                                    alt="Signature"
                                    className="w-full h-full object-contain p-1"
                                  />
                                  {/* Hover overlay */}
                                  <div className="absolute inset-0 bg-cyan-500/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all rounded-lg">
                                    <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                  </div>
                                </div>
                                {/* View Button */}
                                <ThemedButton
                                  variant="secondary"
                                  className="text-xs px-3 py-1"
                                  onClick={() => setSelectedSignature(booking.signature)}
                                >
                                  View
                                </ThemedButton>
                              </div>
                            ) : (
                              <div className="text-gray-500 text-sm italic">
                                No signature
                              </div>
                            )}
                          </td>
                        )}
                        <td className="py-4 px-4">
                          <div className="flex gap-2">
                            <Link href={`/active-bookings/${booking.bookingId}`}>
                              <ThemedButton variant="secondary" className="text-xs px-3 py-1">
                                View
                              </ThemedButton>
                            </Link>
                            {booking.status === 'active' && (
                              <Link href={`/return/${booking.bookingId}`}>
                                <ThemedButton variant="success" className="text-xs px-3 py-1">
                                  Return
                                </ThemedButton>
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
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-700">
              <div className="text-gray-400">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex gap-2">
                <ThemedButton
                  variant="secondary"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className={currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}
                >
                  Previous
                </ThemedButton>

                {/* Page numbers */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                  return (
                    <ThemedButton
                      key={page}
                      variant={page === currentPage ? "primary" : "secondary"}
                      onClick={() => setCurrentPage(page)}
                      className="px-3"
                    >
                      {page}
                    </ThemedButton>
                  );
                })}

                <ThemedButton
                  variant="secondary"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className={currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''}
                >
                  Next
                </ThemedButton>
              </div>
            </div>
          )}
        </ThemedCard>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
          <Link href="/booking">
            <ThemedButton variant="primary" className="w-full">
              ➕ New Booking
            </ThemedButton>
          </Link>
          
          <Link href="/active-bookings">
            <ThemedButton variant="success" className="w-full">
              🔄 Active Rentals
            </ThemedButton>
          </Link>
          <Link href="/admin">
            <ThemedButton variant="secondary" className="w-full">
              📊 Dashboard
            </ThemedButton>
          </Link>
          <Link href="/customers">
            <ThemedButton variant="secondary" className="w-full">
              👥 Customers
            </ThemedButton>
          </Link>
        </div>
      </div>

      {/* Signature Modal */}
      <SignatureModal
        signature={selectedSignature}
        onClose={() => setSelectedSignature(null)}
      />
    </ThemedLayout>
  );
}