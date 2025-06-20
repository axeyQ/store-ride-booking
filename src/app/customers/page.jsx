'use client';
import { useState, useEffect, useCallback } from 'react';
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
import { BlacklistModal } from '@/components/BlacklistModal';
import { UnblacklistModal } from '@/components/UnblacklistModal';
import { theme } from '@/lib/theme';
import { cn } from '@/lib/utils';

export default function OptimizedThemedCustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('lastVisit');
  const [sortOrder, setSortOrder] = useState('desc');
  const [tierFilter, setTierFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all'); // New: all, active, blacklisted
  const [exporting, setExporting] = useState(false);
  
  // Blacklist modal states
  const [blacklistModal, setBlacklistModal] = useState({
    isOpen: false,
    customer: null
  });
  const [unblacklistModal, setUnblacklistModal] = useState({
    isOpen: false,
    customer: null
  });
  
  const [customerStats, setCustomerStats] = useState({
    total: 0,
    newThisMonth: 0,
    activeCustomers: 0,
    blacklistedCustomers: 0,
    tierDistribution: {
      vip: 0,
      gold: 0,
      silver: 0,
      new: 0
    }
  });

  // Debounce search term to prevent excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Only trigger API calls when debounced search term changes
  useEffect(() => {
    fetchCustomers();
  }, [sortBy, sortOrder, debouncedSearchTerm, tierFilter, statusFilter]);

  // Fetch stats only once on component mount
  useEffect(() => {
    fetchCustomerStats();
  }, []);

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        search: debouncedSearchTerm,
        sortBy: sortBy,
        sortOrder: sortOrder
      });
      const response = await fetch(`/api/customers?${params}`);
      const data = await response.json();
      if (data.success) {
        setCustomers(data.customers);
        updateCustomerStats(data.customers);
      } else {
        console.error('Error fetching customers:', data.error);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearchTerm, sortBy, sortOrder]);

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

  const updateCustomerStats = (customerList) => {
    const stats = {
      total: customerList.length,
      blacklistedCustomers: customerList.filter(c => c.isBlacklisted && c.blacklistDetails?.isActive).length,
      activeCustomers: customerList.filter(c => !c.isBlacklisted || !c.blacklistDetails?.isActive).length,
      newThisMonth: customerList.filter(c => {
        const createdDate = new Date(c.createdAt);
        const now = new Date();
        const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1);
        return createdDate >= monthAgo;
      }).length
    };
    
    setCustomerStats(prev => ({ ...prev, ...stats }));
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

  const handleBlacklist = (customer) => {
    setBlacklistModal({
      isOpen: true,
      customer
    });
  };

  const handleUnblacklist = (customer) => {
    setUnblacklistModal({
      isOpen: true,
      customer
    });
  };

  const onBlacklistSuccess = (updatedCustomer) => {
    setCustomers(prev => prev.map(c => 
      c._id === updatedCustomer._id ? updatedCustomer : c
    ));
    setBlacklistModal({ isOpen: false, customer: null });
    updateCustomerStats(customers);
  };

  const onUnblacklistSuccess = (updatedCustomer) => {
    setCustomers(prev => prev.map(c => 
      c._id === updatedCustomer._id ? updatedCustomer : c
    ));
    setUnblacklistModal({ isOpen: false, customer: null });
    updateCustomerStats(customers);
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
    if (totalBookings >= 20) return {
      label: 'VIP',
      color: 'purple',
      icon: '👑',
      bg: 'bg-gradient-to-r from-purple-900/50 to-purple-800/50',
      border: 'border-purple-500/50',
      badge: 'bg-purple-500/20 text-purple-400 border-purple-500/30'
    };
    if (totalBookings >= 10) return {
      label: 'Gold',
      color: 'orange',
      icon: '🥇',
      bg: 'bg-gradient-to-r from-orange-900/50 to-orange-800/50',
      border: 'border-orange-500/50',
      badge: 'bg-orange-500/20 text-orange-400 border-orange-500/30'
    };
    if (totalBookings >= 5) return {
      label: 'Silver',
      color: 'gray',
      icon: '🥈',
      bg: 'bg-gradient-to-r from-gray-700/50 to-gray-600/50',
      border: 'border-gray-500/50',
      badge: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    };
    return {
      label: 'New',
      color: 'cyan',
      icon: '🆕',
      bg: 'bg-gradient-to-r from-cyan-900/50 to-cyan-800/50',
      border: 'border-cyan-500/50',
      badge: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
    };
  };

  const getBlacklistStatusConfig = (customer) => {
    if (!customer.isBlacklisted || !customer.blacklistDetails?.isActive) {
      return null;
    }
    
    const severity = customer.blacklistDetails.severity;
    switch (severity) {
      case 'warning':
        return {
          label: '⚠️ Warning',
          color: 'orange',
          bgClass: 'bg-orange-500/10 border-orange-500/50',
          textClass: 'text-orange-400',
          canBook: true
        };
      case 'temporary_ban':
        return {
          label: '⏳ Temp Ban',
          color: 'red',
          bgClass: 'bg-red-500/10 border-red-500/50',
          textClass: 'text-red-400',
          canBook: false
        };
      case 'permanent_ban':
        return {
          label: '🚫 Perm Ban',
          color: 'red',
          bgClass: 'bg-red-600/10 border-red-600/50',
          textClass: 'text-red-500',
          canBook: false
        };
      default:
        return null;
    }
  };

  const isCustomerBlacklisted = (customer) => {
    return customer.isBlacklisted && customer.blacklistDetails?.isActive;
  };

  const filteredCustomers = customers.filter(customer => {
    const tier = getCustomerTier(customer.totalBookings);
    const matchesTier = tierFilter === 'all' || tier.label.toLowerCase() === tierFilter.toLowerCase();
    
    // Status filter
    let matchesStatus = true;
    if (statusFilter === 'active') {
      matchesStatus = !isCustomerBlacklisted(customer);
    } else if (statusFilter === 'blacklisted') {
      matchesStatus = isCustomerBlacklisted(customer);
    }
    
    return matchesTier && matchesStatus;
  });

  const exportCustomers = async () => {
    try {
      setExporting(true);
      const params = new URLSearchParams({
        export: 'true',
        search: debouncedSearchTerm
      });
      window.open(`/api/customers/export?${params}`, '_blank');
      setTimeout(() => setExporting(false), 2000);
    } catch (error) {
      console.error('Error exporting customers:', error);
      alert('Export failed. Please try again.');
      setExporting(false);
    }
  };

  const SortIcon = ({ column }) => {
    if (sortBy !== column) return <span className="text-gray-400">↕</span>;
    return <span className="text-cyan-400">{sortOrder === 'asc' ? '↑' : '↓'}</span>;
  };

  if (loading && customers.length === 0) {
    return (
      <ThemedLayout>
        <div className="min-h-screen flex items-center justify-center">
          <ThemedCard>
            <div className="flex items-center space-x-3 p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
              <span className="text-white text-xl">Loading customers...</span>
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
            Customer <span className={theme.typography.gradient}>Database</span>
          </h2>
          <p className={`${theme.typography.subtitle} max-w-2xl mx-auto mt-4`}>
            Complete customer relationship management and blacklist control
          </p>
        </div>

        {/* Customer Analytics with Blacklist Stats */}
        <div className={theme.layout.grid.stats + " mb-8"}>
          <ThemedStatsCard
            title="Total Customers"
            value={customers.length}
            subtitle="Registered users"
            colorScheme="customers"
            icon={<div className="text-4xl mb-2">👥</div>}
            progress={100}
          />
          <ThemedStatsCard
            title="Active Customers"
            value={customerStats.activeCustomers}
            subtitle="Can make bookings"
            colorScheme="revenue"
            icon={<div className="text-4xl mb-2">✅</div>}
            progress={customers.length > 0 ? (customerStats.activeCustomers / customers.length) * 100 : 0}
          />
          <ThemedStatsCard
            title="Blacklisted"
            value={customerStats.blacklistedCustomers}
            subtitle="Restricted access"
            colorScheme="vehicles"
            icon={<div className="text-4xl mb-2">🚫</div>}
            progress={customers.length > 0 ? (customerStats.blacklistedCustomers / customers.length) * 100 : 0}
          />
          <ThemedStatsCard
            title="VIP Members"
            value={customers.filter(c => getCustomerTier(c.totalBookings).label === 'VIP').length}
            subtitle="Premium customers"
            colorScheme="bookings"
            icon={<div className="text-4xl mb-2">👑</div>}
            progress={20}
          />
        </div>

        {/* Search and Filters */}
        <ThemedCard className="mb-8">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Customer Management</h3>
              <div className="flex items-center gap-3">
                <Link href="/customers/blacklisted">
                  <ThemedButton variant="danger" className="flex items-center gap-2">
                    🚫 View Blacklisted ({customerStats.blacklistedCustomers})
                  </ThemedButton>
                </Link>
                <ThemedButton
                  variant="success"
                  onClick={exportCustomers}
                  disabled={exporting}
                  className="flex items-center gap-2"
                >
                  {exporting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Exporting...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Export CSV
                    </>
                  )}
                </ThemedButton>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <ThemedInput
                label="Search Customers"
                placeholder="Name, phone, or license number..."
                value={searchTerm}
                onChange={handleSearch}
                containerClassName="md:col-span-2"
              />
              <ThemedSelect
                label="Filter by Status"
                value={statusFilter}
                onValueChange={setStatusFilter}
                options={[
                  { value: 'all', label: 'All Customers' },
                  { value: 'active', label: '✅ Active Only' },
                  { value: 'blacklisted', label: '🚫 Blacklisted Only' }
                ]}
              />
              <ThemedSelect
                label="Filter by Tier"
                value={tierFilter}
                onValueChange={setTierFilter}
                options={[
                  { value: 'all', label: 'All Tiers' },
                  { value: 'vip', label: '👑 VIP' },
                  { value: 'gold', label: '🥇 Gold' },
                  { value: 'silver', label: '🥈 Silver' },
                  { value: 'new', label: '🆕 New' }
                ]}
              />
            </div>
            {/* Search Status Indicator */}
            <div className="flex justify-between items-center mt-4">
              <div className="text-gray-400 text-sm">
                {loading && debouncedSearchTerm !== searchTerm ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-400"></div>
                    Searching...
                  </span>
                ) : (
                  `Showing ${filteredCustomers.length} of ${customers.length} customers`
                )}
              </div>
              {searchTerm && (
                <ThemedButton
                  variant="secondary"
                  onClick={() => setSearchTerm('')}
                  className="text-sm px-3 py-1"
                >
                  Clear Search
                </ThemedButton>
              )}
            </div>
          </div>
        </ThemedCard>

        {/* Customers Table */}
        <ThemedCard title="Customer Database" description="Complete customer records with blacklist management">
          {filteredCustomers.length === 0 ? (
            <div className="text-center p-12">
              <div className="w-24 h-24 bg-gradient-to-r from-gray-600 to-gray-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">No Customers Found</h3>
              <p className="text-gray-400 mb-6">
                {customers.length === 0
                  ? 'No customers have been registered yet'
                  : searchTerm ? `No customers match "${searchTerm}"` : 'Try adjusting your filter criteria'
                }
              </p>
              {customers.length === 0 && (
                <Link href="/booking">
                  <ThemedButton variant="primary">Create First Booking</ThemedButton>
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-700">
                  <tr>
                    <th
                      className="px-4 py-3 text-left text-sm font-medium text-gray-400 cursor-pointer hover:text-gray-300 transition-colors"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center gap-1">
                        Customer <SortIcon column="name" />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">
                      Contact Info
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">
                      Status & Tier
                    </th>
                    <th
                      className="px-4 py-3 text-left text-sm font-medium text-gray-400 cursor-pointer hover:text-gray-300 transition-colors"
                      onClick={() => handleSort('totalBookings')}
                    >
                      <div className="flex items-center gap-1">
                        Bookings <SortIcon column="totalBookings" />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">
                      Value
                    </th>
                    <th
                      className="px-4 py-3 text-left text-sm font-medium text-gray-400 cursor-pointer hover:text-gray-300 transition-colors"
                      onClick={() => handleSort('lastVisit')}
                    >
                      <div className="flex items-center gap-1">
                        Last Visit <SortIcon column="lastVisit" />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {filteredCustomers.map((customer) => {
                    const tier = getCustomerTier(customer.totalBookings);
                    const blacklistStatus = getBlacklistStatusConfig(customer);
                    const isBlacklisted = isCustomerBlacklisted(customer);
                    
                    return (
                      <tr key={customer._id} className={cn(
                        "hover:bg-gray-800/50 transition-colors",
                        isBlacklisted && "bg-red-900/10"
                      )}>
                        <td className="px-4 py-3">
                          <div>
                            <div className="font-medium text-white text-lg flex items-center gap-2">
                              {customer.name}
                              {isBlacklisted && (
                                <span className="text-red-400 text-sm">🚫</span>
                              )}
                            </div>
                            <div className="text-gray-400 text-sm font-mono">{customer.driverLicense}</div>
                            <div className="text-gray-500 text-xs">
                              Since: {new Date(customer.createdAt).toLocaleDateString('en-IN')}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <div className="text-white font-medium">{customer.phone}</div>
                            <div className="text-gray-400 text-sm">Phone Number</div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-2">
                            {/* Customer Tier */}
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">{tier.icon}</span>
                              <ThemedBadge color={tier.color} className="text-xs">
                                {tier.label}
                              </ThemedBadge>
                            </div>
                            {/* Blacklist Status */}
                            {blacklistStatus && (
                              <ThemedBadge color={blacklistStatus.color} className="text-xs">
                                {blacklistStatus.label}
                              </ThemedBadge>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-white">{customer.totalBookings}</div>
                            <div className="text-gray-400 text-xs">Total Rides</div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-center">
                            <div className="text-lg font-bold text-green-400">
                              ₹{(customer.totalBookings * 240).toLocaleString('en-IN')}
                            </div>
                            <div className="text-gray-400 text-xs">Estimated</div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <div className="text-white font-medium">
                              {formatLastVisit(customer.lastVisit)}
                            </div>
                            <div className="text-gray-400 text-xs">Last Activity</div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-2">
                            {/* Primary Actions */}
                            <div className="flex gap-2">
                              <Link href={`/customers/${customer._id}`}>
                                <ThemedButton variant="secondary" className="text-xs px-3 py-1">
                                  👁️ View
                                </ThemedButton>
                              </Link>
                              {!isBlacklisted && (
                                <Link href={`/booking?customerId=${customer._id}`}>
                                  <ThemedButton variant="primary" className="text-xs px-3 py-1">
                                    📋 Book
                                  </ThemedButton>
                                </Link>
                              )}
                            </div>
                            {/* Blacklist Actions */}
                            <div className="flex gap-2">
                              {isBlacklisted ? (
                                <ThemedButton
                                  variant="success"
                                  onClick={() => handleUnblacklist(customer)}
                                  className="text-xs px-3 py-1 w-full"
                                >
                                  ✅ Unblock
                                </ThemedButton>
                              ) : (
                                <ThemedButton
                                  variant="danger"
                                  onClick={() => handleBlacklist(customer)}
                                  className="text-xs px-3 py-1 w-full"
                                >
                                  🚫 Blacklist
                                </ThemedButton>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </ThemedCard>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
          <Link href="/customers/blacklisted">
            <ThemedButton variant="danger" className="w-full flex items-center justify-center gap-2">
              🚫 Blacklisted Customers ({customerStats.blacklistedCustomers})
            </ThemedButton>
          </Link>
          <Link href="/admin/bookings">
            <ThemedButton variant="primary" className="w-full flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v11a2 2 0 002 2h9.5M15 8v7m0 0l3-3m-3 3l-3-3" />
              </svg>
              📋 View All Bookings
            </ThemedButton>
          </Link>
          <Link href="/active-bookings">
            <ThemedButton variant="success" className="w-full flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              ⏰ Active Bookings
            </ThemedButton>
          </Link>
          <Link href="/admin">
            <ThemedButton variant="secondary" className="w-full flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              📊 Admin Dashboard
            </ThemedButton>
          </Link>
        </div>
      </div>

      {/* Blacklist Modal */}
      <BlacklistModal
        isOpen={blacklistModal.isOpen}
        onClose={() => setBlacklistModal({ isOpen: false, customer: null })}
        customer={blacklistModal.customer}
        onBlacklist={onBlacklistSuccess}
      />

      {/* Unblacklist Modal */}
      <UnblacklistModal
        isOpen={unblacklistModal.isOpen}
        onClose={() => setUnblacklistModal({ isOpen: false, customer: null })}
        customer={unblacklistModal.customer}
        onUnblacklist={onUnblacklistSuccess}
      />
    </ThemedLayout>
  );
}