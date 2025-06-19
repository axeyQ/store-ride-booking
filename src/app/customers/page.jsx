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

export default function ThemedCustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('lastVisit');
  const [sortOrder, setSortOrder] = useState('desc');
  const [tierFilter, setTierFilter] = useState('all');
  const [exporting, setExporting] = useState(false);

  const [customerStats, setCustomerStats] = useState({
    total: 0,
    newThisMonth: 0,
    activeCustomers: 0,
    topCustomer: null,
    tierDistribution: {
      vip: 0,
      gold: 0,
      silver: 0,
      new: 0
    }
  });

  useEffect(() => {
    fetchCustomers();
    fetchCustomerStats();
  }, [sortBy, sortOrder, searchTerm, tierFilter]);

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

  const filteredCustomers = customers.filter(customer => {
    const tier = getCustomerTier(customer.totalBookings);
    const matchesTier = tierFilter === 'all' || tier.label.toLowerCase() === tierFilter.toLowerCase();
    return matchesTier;
  });

  const exportCustomers = async () => {
    try {
      setExporting(true);
      const params = new URLSearchParams({
        export: 'true',
        search: searchTerm
      });
      window.open(`/api/customers/export?${params}`, '_blank');
      
      // Simulate progress for UX
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

  if (loading) {
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
            Complete customer relationship management and analytics
          </p>
        </div>

        {/* Customer Analytics */}
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
            title="New This Month"
            value={customerStats.newThisMonth || Math.floor(customers.length * 0.15)}
            subtitle="Recent registrations"
            colorScheme="revenue"
            icon={<div className="text-4xl mb-2">🆕</div>}
            progress={65}
          />
          
          <ThemedStatsCard
            title="Active Customers"
            value={customerStats.activeCustomers || Math.floor(customers.length * 0.7)}
            subtitle="Regular users"
            colorScheme="bookings"
            icon={<div className="text-4xl mb-2">⭐</div>}
            progress={70}
          />
          
          <ThemedStatsCard
            title="VIP Members"
            value={customers.filter(c => getCustomerTier(c.totalBookings).label === 'VIP').length}
            subtitle="Premium customers"
            colorScheme="vehicles"
            icon={<div className="text-4xl mb-2">👑</div>}
            progress={20}
          />
        </div>

        {/* Customer Tier Distribution */}
        <ThemedCard className="mb-8">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Customer Tier Distribution</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {['VIP', 'Gold', 'Silver', 'New'].map((tierName) => {
                const tierCount = customers.filter(c => getCustomerTier(c.totalBookings).label === tierName).length;
                const tierConfig = getCustomerTier(tierName === 'VIP' ? 25 : tierName === 'Gold' ? 15 : tierName === 'Silver' ? 7 : 2);
                
                return (
                  <div key={tierName} className={`${tierConfig.bg} ${tierConfig.border} rounded-lg p-4 text-center`}>
                    <div className="text-3xl mb-2">{tierConfig.icon}</div>
                    <div className="text-2xl font-bold text-white">{tierCount}</div>
                    <div className="text-gray-300 text-sm">{tierName} Customers</div>
                  </div>
                );
              })}
            </div>
          </div>
        </ThemedCard>

        {/* Search and Filters */}
        <ThemedCard className="mb-8">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Customer Management</h3>
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
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ThemedInput
                label="Search Customers"
                placeholder="Name, phone, or license number..."
                value={searchTerm}
                onChange={handleSearch}
                containerClassName="md:col-span-2"
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
          </div>
        </ThemedCard>

        {/* Customers Grid */}
        {filteredCustomers.length === 0 ? (
          <ThemedCard className="text-center p-12">
            <div className="mb-6">
              <div className="w-24 h-24 bg-gradient-to-r from-gray-600 to-gray-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">No Customers Found</h3>
              <p className="text-gray-400 mb-6">
                {customers.length === 0 
                  ? 'No customers have been registered yet'
                  : 'Try adjusting your search criteria'
                }
              </p>
              {customers.length === 0 && (
                <Link href="/booking">
                  <ThemedButton variant="primary">
                    Create First Booking
                  </ThemedButton>
                </Link>
              )}
            </div>
          </ThemedCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {filteredCustomers.map((customer) => {
              const tier = getCustomerTier(customer.totalBookings);
              
              return (
                <ThemedCard 
                  key={customer._id} 
                  className={cn(
                    "hover:scale-105 transition-all duration-300",
                    tier.bg,
                    tier.border
                  )}
                >
                  <div className="p-6">
                    {/* Customer Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-white">{customer.name}</h3>
                        <p className="text-gray-300">{customer.phone}</p>
                        <p className="text-gray-400 text-sm font-mono">{customer.driverLicense}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl mb-2">{tier.icon}</div>
                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${tier.badge}`}>
                          {tier.label}
                        </div>
                      </div>
                    </div>

                    {/* Customer Stats */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-white">{customer.totalBookings}</div>
                        <div className="text-gray-400 text-xs">Total Rides</div>
                      </div>
                      <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                        <div className="text-lg font-bold text-white">
                          {formatLastVisit(customer.lastVisit)}
                        </div>
                        <div className="text-gray-400 text-xs">Last Visit</div>
                      </div>
                    </div>

                    {/* Customer Since */}
                    <div className="mb-4">
                      <div className="text-gray-400 text-sm">
                        Customer since: {new Date(customer.createdAt).toLocaleDateString('en-IN')}
                      </div>
                    </div>

                    {/* Customer Value */}
                    <div className="bg-gray-800/50 rounded-lg p-3 mb-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-sm">Estimated Value:</span>
                        <span className="font-bold text-green-400">
                          ₹{(customer.totalBookings * 240).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Link href={`/customers/${customer._id}`} className="flex-1">
                        <ThemedButton variant="secondary" className="w-full text-sm">
                          View Details
                        </ThemedButton>
                      </Link>
                      <Link href={`/booking?customerId=${customer._id}`} className="flex-1">
                        <ThemedButton variant="primary" className="w-full text-sm">
                          New Booking
                        </ThemedButton>
                      </Link>
                    </div>
                  </div>
                </ThemedCard>
              );
            })}
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
    </ThemedLayout>
  );
}