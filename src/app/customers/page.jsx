'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('lastVisit');
  const [sortOrder, setSortOrder] = useState('desc');
  const [customerStats, setCustomerStats] = useState({
    total: 0,
    newThisMonth: 0,
    activeCustomers: 0,
    topCustomer: null
  });

  useEffect(() => {
    fetchCustomers();
    fetchCustomerStats();
  }, [sortBy, sortOrder, searchTerm]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        search: searchTerm,
        sortBy: sortBy,
        sortOrder: sortOrder
      });

      const response = await fetch(`/api/customers?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setCustomers(data.customers);
      } else {
        console.error('Error fetching customers:', data.error);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerStats = async () => {
    try {
      const response = await fetch('/api/customers/stats');
      const data = await response.json();
      
      if (data.success) {
        setCustomerStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching customer stats:', error);
    }
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const formatLastVisit = (date) => {
    const now = new Date();
    const visitDate = new Date(date);
    const diffTime = Math.abs(now - visitDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays} days ago`;
    if (diffDays <= 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    return visitDate.toLocaleDateString('en-IN');
  };

  const getCustomerTier = (totalBookings) => {
    if (totalBookings >= 20) return { label: 'VIP', color: 'bg-purple-100 text-purple-800' };
    if (totalBookings >= 10) return { label: 'Gold', color: 'bg-yellow-100 text-yellow-800' };
    if (totalBookings >= 5) return { label: 'Silver', color: 'bg-gray-100 text-gray-800' };
    return { label: 'New', color: 'bg-blue-100 text-blue-800' };
  };

  const SortIcon = ({ column }) => {
    if (sortBy !== column) return <span className="text-gray-400">↕️</span>;
    return <span className="text-blue-600">{sortOrder === 'asc' ? '↑' : '↓'}</span>;
  };

  const exportCustomers = async () => {
    try {
      const params = new URLSearchParams({
        export: 'true',
        search: searchTerm
      });
      
      window.open(`/api/customers/export?${params}`, '_blank');
    } catch (error) {
      console.error('Error exporting customers:', error);
      alert('Export failed. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-xl">Loading customers...</div>
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
              <Link href="/" className="text-blue-600 hover:text-blue-800">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">Customer Database</h1>
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                {customers.length} customers
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={exportCustomers}
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
        {/* Customer Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-6 rounded-xl shadow-lg text-center">
            <div className="text-3xl font-bold text-blue-600">{customerStats.total}</div>
            <div className="text-gray-600">Total Customers</div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-lg text-center">
            <div className="text-3xl font-bold text-green-600">{customerStats.newThisMonth}</div>
            <div className="text-gray-600">New This Month</div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-lg text-center">
            <div className="text-3xl font-bold text-orange-600">{customerStats.activeCustomers}</div>
            <div className="text-gray-600">Active Customers</div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-lg text-center">
            <div className="text-2xl font-bold text-purple-600">
              {customerStats.topCustomer?.name || 'N/A'}
            </div>
            <div className="text-gray-600">Top Customer</div>
            {customerStats.topCustomer && (
              <div className="text-sm text-gray-500">{customerStats.topCustomer.totalBookings} bookings</div>
            )}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Search Customers</label>
              <input
                type="text"
                placeholder="Search by name, phone, or license number..."
                value={searchTerm}
                onChange={handleSearch}
                className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="flex items-end">
              <button
                onClick={() => setSearchTerm('')}
                className="w-full bg-gray-500 hover:bg-gray-600 text-white px-4 py-3 rounded-lg font-medium"
              >
                Clear Search
              </button>
            </div>
          </div>
        </div>

        {/* Customers Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    className="px-4 py-3 text-left text-sm font-medium text-gray-500 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-1">
                      Customer <SortIcon column="name" />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Contact Info</th>
                  <th 
                    className="px-4 py-3 text-left text-sm font-medium text-gray-500 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('totalBookings')}
                  >
                    <div className="flex items-center gap-1">
                      Bookings <SortIcon column="totalBookings" />
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-sm font-medium text-gray-500 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('lastVisit')}
                  >
                    <div className="flex items-center gap-1">
                      Last Visit <SortIcon column="lastVisit" />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Tier</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {customers.map((customer) => {
                  const tier = getCustomerTier(customer.totalBookings);
                  
                  return (
                    <tr key={customer._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                          <div className="text-sm text-gray-500 font-mono">{customer.driverLicense}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <div className="text-sm text-gray-900">{customer.phone}</div>
                          <div className="text-xs text-gray-500">
                            Joined {new Date(customer.createdAt).toLocaleDateString('en-IN')}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-lg font-bold text-blue-600">{customer.totalBookings}</div>
                        <div className="text-xs text-gray-500">total rides</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900">
                          {formatLastVisit(customer.lastVisit)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${tier.color}`}>
                          {tier.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Link
                            href={`/customers/${customer._id}`}
                            className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                          >
                            View Details
                          </Link>
                          <Link
                            href={`/booking?customerId=${customer._id}`}
                            className="text-green-600 hover:text-green-800 font-medium text-sm"
                          >
                            New Booking
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {customers.length === 0 && (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="text-gray-500 text-xl mb-4">No customers found</div>
            <p className="text-gray-400 mb-6">
              {searchTerm ? 'Try adjusting your search criteria' : 'No customers have been registered yet'}
            </p>
            <Link
              href="/booking"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold"
            >
              Create First Booking
            </Link>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/admin/bookings"
              className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg text-center font-medium"
            >
              📋 View All Bookings
            </Link>
            <Link
              href="/active-bookings"
              className="bg-orange-600 hover:bg-orange-700 text-white p-4 rounded-lg text-center font-medium"
            >
              ⏰ Active Bookings
            </Link>
            <Link
              href="/admin"
              className="bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-lg text-center font-medium"
            >
              📊 Admin Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}