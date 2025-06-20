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
import { UnblacklistModal } from '@/components/UnblacklistModal';
import { theme } from '@/lib/theme';
import { cn } from '@/lib/utils';

export default function BlacklistedCustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [reasonFilter, setReasonFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({
    total: 0,
    warnings: 0,
    temporaryBans: 0,
    permanentBans: 0
  });

  // Unblacklist modal state
  const [unblacklistModal, setUnblacklistModal] = useState({
    isOpen: false,
    customer: null
  });

  const itemsPerPage = 20;

  useEffect(() => {
    fetchBlacklistedCustomers();
  }, [searchTerm, severityFilter, reasonFilter, currentPage]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchBlacklistedCustomers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage,
        limit: itemsPerPage,
        search: searchTerm,
        severity: severityFilter,
        reason: reasonFilter
      });

      const response = await fetch(`/api/customers/blacklisted?${params}`);
      const data = await response.json();

      if (data.success) {
        setCustomers(data.customers);
        setTotalPages(data.totalPages);
        updateStatsFromCustomers(data.customers);
      } else {
        console.error('Error fetching blacklisted customers:', data.error);
      }
    } catch (error) {
      console.error('Error fetching blacklisted customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/blacklist-stats');
      const data = await response.json();
      if (data.success) {
        const counts = data.currentCounts.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {});
        
        setStats({
          total: Object.values(counts).reduce((sum, count) => sum + count, 0),
          warnings: counts.warning || 0,
          temporaryBans: counts.temporary_ban || 0,
          permanentBans: counts.permanent_ban || 0
        });
      }
    } catch (error) {
      console.error('Error fetching blacklist stats:', error);
    }
  };

  const updateStatsFromCustomers = (customerList) => {
    const counts = customerList.reduce((acc, customer) => {
      const severity = customer.blacklistDetails?.severity;
      if (severity) {
        acc[severity] = (acc[severity] || 0) + 1;
      }
      return acc;
    }, {});

    setStats(prev => ({
      ...prev,
      warnings: counts.warning || 0,
      temporaryBans: counts.temporary_ban || 0,
      permanentBans: counts.permanent_ban || 0
    }));
  };

  const handleUnblacklist = (customer) => {
    setUnblacklistModal({
      isOpen: true,
      customer
    });
  };

  const onUnblacklistSuccess = (updatedCustomer) => {
    setCustomers(prev => prev.filter(c => c._id !== updatedCustomer._id));
    setStats(prev => ({
      ...prev,
      total: prev.total - 1,
      warnings: prev.warnings - (updatedCustomer.blacklistDetails?.severity === 'warning' ? 1 : 0),
      temporaryBans: prev.temporaryBans - (updatedCustomer.blacklistDetails?.severity === 'temporary_ban' ? 1 : 0),
      permanentBans: prev.permanentBans - (updatedCustomer.blacklistDetails?.severity === 'permanent_ban' ? 1 : 0)
    }));
    setUnblacklistModal({ isOpen: false, customer: null });
  };

  const getReasonLabel = (reason) => {
    const reasonMap = {
      'vehicle_damage': '🚗 Vehicle Damage',
      'late_return': '⏰ Late Return',
      'non_payment': '💳 Non-Payment',
      'behavioral_issues': '😠 Behavioral Issues',
      'violation_of_terms': '📋 Terms Violation',
      'theft_attempt': '🚨 Theft Attempt',
      'fake_documents': '📄 Fake Documents',
      'reckless_driving': '🏍️ Reckless Driving',
      'other': '❓ Other'
    };
    return reasonMap[reason] || reason;
  };

  const getSeverityConfig = (severity) => {
    switch (severity) {
      case 'warning':
        return {
          label: '⚠️ Warning',
          color: 'orange',
          bgClass: 'bg-orange-500/10 border-orange-500/30',
          textClass: 'text-orange-400'
        };
      case 'temporary_ban':
        return {
          label: '⏳ Temporary Ban',
          color: 'red',
          bgClass: 'bg-red-500/10 border-red-500/30',
          textClass: 'text-red-400'
        };
      case 'permanent_ban':
        return {
          label: '🚫 Permanent Ban',
          color: 'red',
          bgClass: 'bg-red-600/10 border-red-600/30',
          textClass: 'text-red-500'
        };
      default:
        return {
          label: severity,
          color: 'gray',
          bgClass: 'bg-gray-500/10 border-gray-500/30',
          textClass: 'text-gray-400'
        };
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading && customers.length === 0) {
    return (
      <ThemedLayout>
        <div className="min-h-screen flex items-center justify-center">
          <ThemedCard>
            <div className="flex items-center space-x-3 p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
              <span className="text-white text-xl">Loading blacklisted customers...</span>
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
            Blacklisted <span className={theme.typography.gradient}>Customers</span>
          </h2>
          <p className={`${theme.typography.subtitle} max-w-2xl mx-auto mt-4`}>
            Manage and monitor customers with restricted access
          </p>
        </div>

        {/* Stats */}
        <div className={theme.layout.grid.stats + " mb-8"}>
          <ThemedStatsCard
            title="Total Blacklisted"
            value={stats.total}
            subtitle="All severity levels"
            colorScheme="customers"
            icon={<div className="text-4xl mb-2">🚫</div>}
            progress={100}
          />
          <ThemedStatsCard
            title="Warnings"
            value={stats.warnings}
            subtitle="Can still book"
            colorScheme="revenue"
            icon={<div className="text-4xl mb-2">⚠️</div>}
            progress={stats.total > 0 ? (stats.warnings / stats.total) * 100 : 0}
          />
          <ThemedStatsCard
            title="Temporary Bans"
            value={stats.temporaryBans}
            subtitle="Time-limited blocks"
            colorScheme="bookings"
            icon={<div className="text-4xl mb-2">⏳</div>}
            progress={stats.total > 0 ? (stats.temporaryBans / stats.total) * 100 : 0}
          />
          <ThemedStatsCard
            title="Permanent Bans"
            value={stats.permanentBans}
            subtitle="Completely blocked"
            colorScheme="vehicles"
            icon={<div className="text-4xl mb-2">🔒</div>}
            progress={stats.total > 0 ? (stats.permanentBans / stats.total) * 100 : 0}
          />
        </div>

        {/* Search and Filters */}
        <ThemedCard className="mb-8">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Blacklist Management</h3>
              <div className="flex gap-3">
                <Link href="/customers">
                  <ThemedButton variant="secondary">
                    👥 All Customers
                  </ThemedButton>
                </Link>
                <ThemedButton
                  variant="primary"
                  onClick={fetchBlacklistedCustomers}
                  className="flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </ThemedButton>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ThemedInput
                label="Search Customers"
                placeholder="Name, phone, or license..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <ThemedSelect
                label="Filter by Severity"
                value={severityFilter}
                onValueChange={setSeverityFilter}
                options={[
                  { value: 'all', label: 'All Severities' },
                  { value: 'warning', label: '⚠️ Warnings' },
                  { value: 'temporary_ban', label: '⏳ Temporary Bans' },
                  { value: 'permanent_ban', label: '🚫 Permanent Bans' }
                ]}
              />
              <ThemedSelect
                label="Filter by Reason"
                value={reasonFilter}
                onValueChange={setReasonFilter}
                options={[
                  { value: 'all', label: 'All Reasons' },
                  { value: 'vehicle_damage', label: '🚗 Vehicle Damage' },
                  { value: 'late_return', label: '⏰ Late Return' },
                  { value: 'non_payment', label: '💳 Non-Payment' },
                  { value: 'behavioral_issues', label: '😠 Behavioral Issues' },
                  { value: 'violation_of_terms', label: '📋 Terms Violation' },
                  { value: 'theft_attempt', label: '🚨 Theft Attempt' },
                  { value: 'fake_documents', label: '📄 Fake Documents' },
                  { value: 'reckless_driving', label: '🏍️ Reckless Driving' },
                  { value: 'other', label: '❓ Other' }
                ]}
              />
            </div>
          </div>
        </ThemedCard>

        {/* Blacklisted Customers List */}
        {customers.length === 0 ? (
          <ThemedCard className="text-center p-12">
            <div className="mb-6">
              <div className="w-24 h-24 bg-gradient-to-r from-green-600 to-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">No Blacklisted Customers</h3>
              <p className="text-gray-400 mb-6">
                {searchTerm || severityFilter !== 'all' || reasonFilter !== 'all'
                  ? 'No customers match your search criteria'
                  : 'Great! No customers are currently blacklisted'
                }
              </p>
              <Link href="/customers">
                <ThemedButton variant="primary">
                  View All Customers
                </ThemedButton>
              </Link>
            </div>
          </ThemedCard>
        ) : (
          <div className="space-y-4 mb-8">
            {customers.map((customer) => {
              const blacklistDetails = customer.blacklistDetails;
              const severityConfig = getSeverityConfig(blacklistDetails?.severity);
              
              return (
                <ThemedCard
                  key={customer._id}
                  className={cn(
                    "transition-all duration-300",
                    severityConfig.bgClass,
                    "border-2"
                  )}
                >
                  <div className="p-6">
                    <div className="flex justify-between items-start">
                      {/* Customer Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-xl font-bold text-white">{customer.name}</h3>
                          <ThemedBadge color={severityConfig.color}>
                            {severityConfig.label}
                          </ThemedBadge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <span className="text-gray-400 text-sm">Contact Info:</span>
                            <p className="text-white">{customer.phone}</p>
                            <p className="text-gray-300 text-sm font-mono">{customer.driverLicense}</p>
                          </div>
                          <div>
                            <span className="text-gray-400 text-sm">Blacklist Reason:</span>
                            <p className="text-white">{getReasonLabel(blacklistDetails.reason)}</p>
                            {blacklistDetails.customReason && (
                              <p className="text-gray-300 text-sm italic">"{blacklistDetails.customReason}"</p>
                            )}
                          </div>
                          <div>
                            <span className="text-gray-400 text-sm">Blacklisted On:</span>
                            <p className="text-white">{formatDate(blacklistDetails.blacklistedAt)}</p>
                            <p className="text-gray-300 text-sm">By: {blacklistDetails.blacklistedBy}</p>
                          </div>
                        </div>

                        {blacklistDetails.unblacklistAt && (
                          <div className="bg-gray-800/50 rounded-lg p-3 mb-4">
                            <span className="text-orange-400 text-sm">
                              {blacklistDetails.severity === 'temporary_ban' ? '⏰ Auto-unblacklist on: ' : '📅 Expires on: '}
                              {formatDate(blacklistDetails.unblacklistAt)}
                            </span>
                          </div>
                        )}

                        {blacklistDetails.internalNotes && (
                          <div className="bg-gray-800/50 rounded-lg p-3">
                            <span className="text-gray-400 text-sm">Internal Notes:</span>
                            <p className="text-gray-300 mt-1">{blacklistDetails.internalNotes}</p>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2 ml-6">
                        <ThemedButton
                          variant="success"
                          onClick={() => handleUnblacklist(customer)}
                          className="text-sm px-4 py-2"
                        >
                          ✅ Unblacklist
                        </ThemedButton>
                        <Link href={`/customers/${customer._id}`}>
                          <ThemedButton variant="secondary" className="text-sm px-4 py-2 w-full">
                            👁️ View Details
                          </ThemedButton>
                        </Link>
                      </div>
                    </div>
                  </div>
                </ThemedCard>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <ThemedCard>
            <div className="flex justify-between items-center p-6">
              <div className="text-gray-400">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex gap-2">
                <ThemedButton
                  variant="secondary"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className={cn(
                    "px-4 py-2 text-sm",
                    currentPage === 1 && "opacity-50 cursor-not-allowed"
                  )}
                >
                  Previous
                </ThemedButton>
                <ThemedButton
                  variant="secondary"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className={cn(
                    "px-4 py-2 text-sm",
                    currentPage === totalPages && "opacity-50 cursor-not-allowed"
                  )}
                >
                  Next
                </ThemedButton>
              </div>
            </div>
          </ThemedCard>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <Link href="/customers">
            <ThemedButton variant="primary" className="w-full flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              👥 All Customers
            </ThemedButton>
          </Link>
          <Link href="/admin/bookings">
            <ThemedButton variant="secondary" className="w-full flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v11a2 2 0 002 2h9.5M15 8v7m0 0l3-3m-3 3l-3-3" />
              </svg>
              📋 All Bookings
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