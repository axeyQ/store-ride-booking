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
import { validatePhoneNumber, validateDrivingLicense } from '@/lib/validations';
import { theme } from '@/lib/theme';
import { cn } from '@/lib/utils';

// Custom package definitions
const CUSTOM_PACKAGES = {
  half_day: { 
    label: 'Half Day', 
    price: 800, 
    maxHours: 12, 
    icon: '🌅',
    color: 'orange'
  },
  full_day: { 
    label: 'Full Day', 
    price: 1200, 
    maxHours: 24, 
    icon: '☀️',
    color: 'yellow'
  },
  night: { 
    label: 'Night Package', 
    price: 600, 
    maxHours: 11, 
    icon: '🌙',
    color: 'purple'
  }
};

// Edit Customer Modal Component
function EditCustomerModal({ isOpen, onClose, customer, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    driverLicense: ''
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || '',
        phone: customer.phone || '',
        driverLicense: customer.driverLicense || ''
      });
      setErrors({});
    }
  }, [customer]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!validatePhoneNumber(formData.phone)) {
      newErrors.phone = 'Please enter a valid 10-digit phone number';
    }
    
    if (!formData.driverLicense.trim()) {
      newErrors.driverLicense = 'Driver license is required';
    } else if (!validateDrivingLicense(formData.driverLicense)) {
      newErrors.driverLicense = 'Please enter a valid driving license number';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    
    setSaving(true);
    try {
      const response = await fetch(`/api/customers/${customer._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      if (data.success) {
        onSave(data.customer);
        onClose();
      } else {
        alert('Error updating customer: ' + data.error);
      }
    } catch (error) {
      console.error('Error updating customer:', error);
      alert('Error updating customer. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <ThemedCard className="w-full max-w-md">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">Edit Customer</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            <ThemedInput
              label="Full Name *"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter customer's full name"
              error={errors.name}
            />
            
            <ThemedInput
              label="Phone Number *"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="Enter 10-digit phone number"
              maxLength="10"
              error={errors.phone}
            />
            
            <ThemedInput
              label="Driver License Number *"
              value={formData.driverLicense}
              onChange={(e) => setFormData(prev => ({ ...prev, driverLicense: e.target.value.toUpperCase() }))}
              placeholder="e.g., MP1420110012345"
              error={errors.driverLicense}
            />
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <ThemedButton
              variant="secondary"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </ThemedButton>
            <ThemedButton
              variant="success"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Saving...
                </div>
              ) : (
                'Save Changes'
              )}
            </ThemedButton>
          </div>
        </div>
      </ThemedCard>
    </div>
  );
}

// Delete Confirmation Modal Component
function DeleteCustomerModal({ isOpen, onClose, customer, onDelete }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/customers/${customer._id}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      if (data.success) {
        onDelete(customer._id);
        onClose();
      } else {
        alert('Error deleting customer: ' + data.error);
      }
    } catch (error) {
      console.error('Error deleting customer:', error);
      alert('Error deleting customer. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <ThemedCard className="w-full max-w-md">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-red-400">Delete Customer</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mb-6">
            <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-3">
                <span className="text-red-400 text-2xl">⚠️</span>
                <div>
                  <h3 className="text-red-300 font-semibold">Permanent Deletion</h3>
                  <p className="text-red-200 text-sm">This action cannot be undone</p>
                </div>
              </div>
            </div>

            <p className="text-white mb-4">
              Are you sure you want to delete <strong>{customer?.name}</strong>?
            </p>
            
            <div className="bg-gray-800 rounded-lg p-3 text-sm">
              <div className="text-gray-300">Customer Details:</div>
              <div className="text-gray-400 space-y-1">
                <div>📞 {customer?.phone}</div>
                <div>🆔 {customer?.driverLicense}</div>
                <div>📅 Member since: {customer?.createdAt && new Date(customer.createdAt).toLocaleDateString('en-IN')}</div>
              </div>
            </div>

            <div className="mt-4 bg-orange-900/30 border border-orange-700/50 rounded-lg p-3">
              <p className="text-orange-200 text-sm">
                <strong>Note:</strong> Deleting this customer will also remove all associated booking history and data.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <ThemedButton
              variant="secondary"
              onClick={onClose}
              disabled={deleting}
            >
              Cancel
            </ThemedButton>
            <ThemedButton
              variant="danger"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Deleting...
                </div>
              ) : (
                'Delete Customer'
              )}
            </ThemedButton>
          </div>
        </div>
      </ThemedCard>
    </div>
  );
}

export default function OptimizedThemedCustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [enrichedCustomers, setEnrichedCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('lastVisit');
  const [sortOrder, setSortOrder] = useState('desc');
  const [tierFilter, setTierFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [exporting, setExporting] = useState(false);
  
  // Modal states
  const [blacklistModal, setBlacklistModal] = useState({
    isOpen: false,
    customer: null
  });
  const [unblacklistModal, setUnblacklistModal] = useState({
    isOpen: false,
    customer: null
  });
  const [editModal, setEditModal] = useState({
    isOpen: false,
    customer: null
  });
  const [deleteModal, setDeleteModal] = useState({
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

  // Revenue calculation function
  const calculateBookingRevenue = useCallback((booking) => {
    try {
      if (booking.status === 'cancelled') {
        return 0;
      }

      if (booking.isCustomBooking) {
        const packageInfo = CUSTOM_PACKAGES[booking.customBookingType];
        if (packageInfo) {
          return booking.finalAmount || packageInfo.price;
        }
        return booking.finalAmount || 0;
      }

      return calculateAdvancedPricingForBooking(booking);
    } catch (error) {
      console.error('Error calculating booking revenue:', error);
      return 0;
    }
  }, []);

  // Advanced pricing calculation function
  const calculateAdvancedPricingForBooking = useCallback((booking) => {
    try {
      const settings = {
        hourlyRate: 80,
        graceMinutes: 15,
        blockMinutes: 30,
        nightChargeTime: '22:30',
        nightMultiplier: 2
      };

      const startTime = new Date(booking.startTime);
      const endTime = booking.endTime ? new Date(booking.endTime) : new Date();
      const totalMinutes = Math.max(0, Math.floor((endTime - startTime) / (1000 * 60)));
      
      if (totalMinutes === 0) {
        return 80;
      }

      const { hourlyRate, graceMinutes, blockMinutes, nightChargeTime, nightMultiplier } = settings;
      const halfRate = Math.round(hourlyRate / 2);

      let totalAmount = 0;
      let remainingMinutes = totalMinutes;
      let currentTime = new Date(startTime);

      const firstBlockMinutes = 60 + graceMinutes;
      const firstBlockUsed = Math.min(remainingMinutes, firstBlockMinutes);
      
      const isFirstBlockNight = isNightCharge(currentTime, firstBlockUsed, nightChargeTime);
      const firstBlockRate = isFirstBlockNight ? hourlyRate * nightMultiplier : hourlyRate;

      totalAmount += firstBlockRate;
      remainingMinutes -= firstBlockUsed;
      currentTime = new Date(currentTime.getTime() + firstBlockUsed * 60000);

      while (remainingMinutes > 0) {
        const blockUsed = Math.min(remainingMinutes, blockMinutes);
        const isNight = isNightCharge(currentTime, blockUsed, nightChargeTime);
        const blockRate = isNight ? halfRate * nightMultiplier : halfRate;

        totalAmount += blockRate;
        remainingMinutes -= blockUsed;
        currentTime = new Date(currentTime.getTime() + blockUsed * 60000);
      }

      return totalAmount;
    } catch (error) {
      console.error('Error in advanced pricing calculation:', error);
      const startTime = new Date(booking.startTime);
      const endTime = booking.endTime ? new Date(booking.endTime) : new Date();
      const diffMs = endTime - startTime;
      const hours = Math.ceil(diffMs / (1000 * 60 * 60));
      return Math.max(hours * 80, 80);
    }
  }, []);

  const isNightCharge = useCallback((startTime, durationMinutes, nightChargeTime) => {
    try {
      const [nightHour, nightMinute] = nightChargeTime.split(':').map(Number);
      const blockEndTime = new Date(startTime.getTime() + durationMinutes * 60000);
      const nightThreshold = new Date(startTime);
      nightThreshold.setHours(nightHour, nightMinute, 0, 0);
      
      return blockEndTime > nightThreshold && startTime < new Date(nightThreshold.getTime() + 60000);
    } catch (error) {
      return false;
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    fetchCustomersAndBookings();
  }, []);

  useEffect(() => {
    if (customers.length > 0 && bookings.length >= 0) {
      enrichCustomersWithBookingData();
    }
  }, [customers, bookings, calculateBookingRevenue]);

  useEffect(() => {
    if (enrichedCustomers.length > 0) {
      updateCustomerStats(enrichedCustomers);
    }
  }, [enrichedCustomers, debouncedSearchTerm, tierFilter, statusFilter]);

  const fetchCustomersAndBookings = async () => {
    try {
      setLoading(true);
      
      const [customersResponse, bookingsResponse] = await Promise.all([
        fetch('/api/customers'),
        fetch('/api/bookings')
      ]);

      const customersData = await customersResponse.json();
      const bookingsData = await bookingsResponse.json();

      if (customersData.success) {
        setCustomers(customersData.customers);
      } else {
        console.error('Error fetching customers:', customersData.error);
      }

      if (bookingsData.success) {
        setBookings(bookingsData.bookings);
      } else {
        console.error('Error fetching bookings:', bookingsData.error);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const enrichCustomersWithBookingData = () => {
    const enriched = customers.map(customer => {
      const customerBookings = bookings.filter(booking => 
        booking.customerId && 
        (booking.customerId._id === customer._id || booking.customerId === customer._id)
      );

      const totalRevenue = customerBookings.reduce((sum, booking) => {
        return sum + calculateBookingRevenue(booking);
      }, 0);

      const totalBookings = customerBookings.length;
      const completedBookings = customerBookings.filter(b => b.status === 'completed').length;
      const activeBookings = customerBookings.filter(b => b.status === 'active').length;
      const cancelledBookings = customerBookings.filter(b => b.status === 'cancelled').length;
      
      const customBookings = customerBookings.filter(b => b.isCustomBooking).length;
      const advancedBookings = customerBookings.filter(b => !b.isCustomBooking).length;
      
      const mostRecentBooking = customerBookings
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
      
      const lastVisit = mostRecentBooking ? mostRecentBooking.createdAt : customer.createdAt;

      return {
        ...customer,
        totalBookings,
        completedBookings,
        activeBookings,
        cancelledBookings,
        customBookings,
        advancedBookings,
        totalRevenue,
        lastVisit,
        avgBookingValue: totalBookings > 0 ? Math.round(totalRevenue / totalBookings) : 0,
        hasActiveBooking: activeBookings > 0,
        customerLifetimeValue: totalRevenue,
        bookingHistory: customerBookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      };
    });

    const sorted = enriched.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'totalBookings':
          aValue = a.totalBookings;
          bValue = b.totalBookings;
          break;
        case 'lastVisit':
          aValue = new Date(a.lastVisit);
          bValue = new Date(b.lastVisit);
          break;
        case 'totalRevenue':
          aValue = a.totalRevenue;
          bValue = b.totalRevenue;
          break;
        default:
          aValue = new Date(a.lastVisit);
          bValue = new Date(b.lastVisit);
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setEnrichedCustomers(sorted);
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
      }).length,
      tierDistribution: {
        vip: customerList.filter(c => getCustomerTier(c.totalBookings).label === 'VIP').length,
        gold: customerList.filter(c => getCustomerTier(c.totalBookings).label === 'Gold').length,
        silver: customerList.filter(c => getCustomerTier(c.totalBookings).label === 'Silver').length,
        new: customerList.filter(c => getCustomerTier(c.totalBookings).label === 'New').length
      }
    };
    
    setCustomerStats(stats);
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

  // Action handlers
  const handleEdit = (customer) => {
    setEditModal({
      isOpen: true,
      customer
    });
  };

  const handleDelete = (customer) => {
    setDeleteModal({
      isOpen: true,
      customer
    });
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

  // Success handlers
  const onEditSuccess = (updatedCustomer) => {
    setCustomers(prev => prev.map(c => 
      c._id === updatedCustomer._id ? updatedCustomer : c
    ));
    setEditModal({ isOpen: false, customer: null });
  };

  const onDeleteSuccess = (deletedCustomerId) => {
    setCustomers(prev => prev.filter(c => c._id !== deletedCustomerId));
    setDeleteModal({ isOpen: false, customer: null });
  };

  const onBlacklistSuccess = (updatedCustomer) => {
    setCustomers(prev => prev.map(c => 
      c._id === updatedCustomer._id ? updatedCustomer : c
    ));
    setBlacklistModal({ isOpen: false, customer: null });
  };

  const onUnblacklistSuccess = (updatedCustomer) => {
    setCustomers(prev => prev.map(c => 
      c._id === updatedCustomer._id ? updatedCustomer : c
    ));
    setUnblacklistModal({ isOpen: false, customer: null });
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

  const filteredCustomers = enrichedCustomers.filter(customer => {
    const searchMatch = !debouncedSearchTerm || 
      customer.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      customer.phone.includes(debouncedSearchTerm) ||
      customer.driverLicense.toLowerCase().includes(debouncedSearchTerm.toLowerCase());

    if (!searchMatch) return false;

    const tier = getCustomerTier(customer.totalBookings);
    const matchesTier = tierFilter === 'all' || tier.label.toLowerCase() === tierFilter.toLowerCase();
    
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

  if (loading) {
    return (
      <ThemedLayout>
        <div className="min-h-screen flex items-center justify-center">
          <ThemedCard>
            <div className="flex items-center space-x-3 p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
              <span className="text-white text-xl">Loading customer data...</span>
            </div>
          </ThemedCard>
        </div>
      </ThemedLayout>
    );
  };

  return (
    <ThemedLayout>
      <div className="container mx-auto px-6 py-8">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <h2 className={theme.typography.hero}>
            Customer <span className={theme.typography.gradient}>Database</span>
          </h2>
          <p className={`${theme.typography.subtitle} max-w-2xl mx-auto mt-4`}>
            Complete customer relationship management with edit, delete, and dual pricing analytics
          </p>
        </div>

        {/* Customer Analytics */}
        <div className={theme.layout.grid.stats + " mb-8"}>
          <ThemedStatsCard
            title="Total Customers"
            value={enrichedCustomers.length}
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
            progress={enrichedCustomers.length > 0 ? (customerStats.activeCustomers / enrichedCustomers.length) * 100 : 0}
          />
          <ThemedStatsCard
            title="Blacklisted"
            value={customerStats.blacklistedCustomers}
            subtitle="Restricted access"
            colorScheme="vehicles"
            icon={<div className="text-4xl mb-2">🚫</div>}
            progress={enrichedCustomers.length > 0 ? (customerStats.blacklistedCustomers / enrichedCustomers.length) * 100 : 0}
          />
          <ThemedStatsCard
            title="VIP Members"
            value={customerStats.tierDistribution.vip}
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
            <div className="flex justify-between items-center mt-4">
              <div className="text-gray-400 text-sm">
                {loading && debouncedSearchTerm !== searchTerm ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-400"></div>
                    Searching...
                  </span>
                ) : (
                  `Showing ${filteredCustomers.length} of ${enrichedCustomers.length} customers`
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
        <ThemedCard title="Customer Database" description="Complete customer records with edit, delete, and dual pricing analytics">
          {filteredCustomers.length === 0 ? (
            <div className="text-center p-12">
              <div className="w-24 h-24 bg-gradient-to-r from-gray-600 to-gray-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">No Customers Found</h3>
              <p className="text-gray-400 mb-6">
                {enrichedCustomers.length === 0
                  ? 'No customers have been registered yet'
                  : searchTerm ? `No customers match "${searchTerm}"` : 'Try adjusting your filter criteria'
                }
              </p>
              {enrichedCustomers.length === 0 && (
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
                    <th
                      className="px-4 py-3 text-left text-sm font-medium text-gray-400 cursor-pointer hover:text-gray-300 transition-colors"
                      onClick={() => handleSort('totalRevenue')}
                    >
                      <div className="flex items-center gap-1">
                        Revenue <SortIcon column="totalRevenue" />
                      </div>
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
                              {customer.hasActiveBooking && (
                                <span className="text-orange-400 text-sm">🔄</span>
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
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">{tier.icon}</span>
                              <ThemedBadge color={tier.color} className="text-xs">
                                {tier.label}
                              </ThemedBadge>
                            </div>
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
                            <div className="text-gray-400 text-xs space-y-1">
                              {customer.activeBookings > 0 && (
                                <div className="text-orange-400">{customer.activeBookings} active</div>
                              )}
                              {customer.completedBookings > 0 && (
                                <div className="text-green-400">{customer.completedBookings} completed</div>
                              )}
                              {customer.totalBookings > 0 && (
                                <div className="flex gap-1 text-xs justify-center">
                                  {customer.advancedBookings > 0 && (
                                    <span className="text-cyan-400">⚡{customer.advancedBookings}</span>
                                  )}
                                  {customer.customBookings > 0 && (
                                    <span className="text-purple-400">📦{customer.customBookings}</span>
                                  )}
                                </div>
                              )}
                              {customer.totalBookings === 0 && "No bookings"}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-center">
                            <div className="text-lg font-bold text-green-400">
                              ₹{customer.totalRevenue.toLocaleString('en-IN')}
                            </div>
                            <div className="text-gray-400 text-xs">
                              {customer.totalBookings > 0 ? 
                                `₹${customer.avgBookingValue}/avg` : 
                                'No revenue'
                              }
                            </div>
                            {customer.totalBookings > 0 && (
                              <div className="text-xs mt-1">
                                {customer.customBookings > 0 && customer.advancedBookings > 0 ? (
                                  <span className="text-gray-500">⚡📦 Mixed</span>
                                ) : customer.customBookings > 0 ? (
                                  <span className="text-purple-400">📦 Packages</span>
                                ) : (
                                  <span className="text-cyan-400">⚡ Advanced</span>
                                )}
                              </div>
                            )}
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
                            <div className="flex gap-1">
                              <Link href={`/customers/${customer._id}`}>
                                <ThemedButton variant="secondary" className="text-xs px-2 py-1">
                                  👁️
                                </ThemedButton>
                              </Link>
                              <ThemedButton
                                variant="primary"
                                onClick={() => handleEdit(customer)}
                                className="text-xs px-2 py-1"
                              >
                                ✏️
                              </ThemedButton>
                              <ThemedButton
                                variant="danger"
                                onClick={() => handleDelete(customer)}
                                className="text-xs px-2 py-1"
                              >
                                🗑️
                              </ThemedButton>
                            </div>
                            
                            {/* Booking Action */}
                            {!isBlacklisted && (
                              <Link href={`/booking?customerId=${customer._id}`}>
                                <ThemedButton variant="success" className="text-xs px-3 py-1 w-full">
                                  📋 Book
                                </ThemedButton>
                              </Link>
                            )}
                            
                            {/* Blacklist Actions */}
                            <div>
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
              📋 View All Bookings
            </ThemedButton>
          </Link>
          <Link href="/active-bookings">
            <ThemedButton variant="success" className="w-full flex items-center justify-center gap-2">
              ⏰ Active Bookings
            </ThemedButton>
          </Link>
          <Link href="/admin">
            <ThemedButton variant="secondary" className="w-full flex items-center justify-center gap-2">
              📊 Admin Dashboard
            </ThemedButton>
          </Link>
        </div>
      </div>

      {/* Edit Customer Modal */}
      <EditCustomerModal
        isOpen={editModal.isOpen}
        onClose={() => setEditModal({ isOpen: false, customer: null })}
        customer={editModal.customer}
        onSave={onEditSuccess}
      />

      {/* Delete Customer Modal */}
      <DeleteCustomerModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, customer: null })}
        customer={deleteModal.customer}
        onDelete={onDeleteSuccess}
      />

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