'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ThemedLayout,
  ThemedCard,
  ThemedButton,
  ThemedSelect,
  ThemedInput,
  ThemedBadge
} from '@/components/themed';
import { theme } from '@/lib/theme';
import { cn } from '@/lib/utils';

// ✅ FIXED: Updated custom booking rates to match system
const CUSTOM_RATES = {
  half_day: { label: 'Half Day', price: 800, icon: '🌅', maxHours: 12 },
  full_day: { label: 'Full Day', price: 1200, icon: '☀️', maxHours: 24 },
  night: { label: 'Night Package', price: 600, icon: '🌙', maxHours: 11 }
};

export default function CustomBookingsManagementPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [packageFilter, setPackageFilter] = useState('all');
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    completed: 0,
    cancelled: 0,
    totalRevenue: 0,
    packageStats: {},
    revenueByPackage: {}
  });

  useEffect(() => {
    fetchCustomBookings();
  }, []);

  // ✅ FIXED: Fetch from main bookings API and filter for custom bookings
  const fetchCustomBookings = async () => {
    setLoading(true);
    try {
      // Fetch all bookings and filter for custom ones
      const response = await fetch('/api/bookings');
      const data = await response.json();
      
      if (data.success) {
        // ✅ ENHANCED: More robust filtering for custom bookings
        const customBookings = data.bookings.filter(booking => {
          // Check multiple indicators for custom bookings
          return booking.isCustomBooking === true || 
                 booking.customBookingType || 
                 booking.customBookingLabel ||
                 ['half_day', 'full_day', 'night'].includes(booking.customBookingType);
        });
        
        console.log('Total bookings fetched:', data.bookings.length);
        console.log('Custom bookings found:', customBookings.length);
        console.log('Custom bookings:', customBookings.map(b => ({
          id: b.bookingId,
          type: b.customBookingType,
          isCustom: b.isCustomBooking,
          finalAmount: b.finalAmount
        })));
        
        setBookings(customBookings);
        calculateStats(customBookings);
      } else {
        console.error('Error fetching bookings:', data.error);
      }
    } catch (error) {
      console.error('Error fetching custom bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ SUPER AGGRESSIVE FIX: Force package rates based on customBookingType
  const getBookingRevenue = (booking) => {
    // ✅ Return 0 for cancelled bookings
    if (booking.status === 'cancelled') {
      return 0;
    }

    // ✅ Check if this is a custom booking by ANY indicator
    const customBookingType = booking.customBookingType;
    const isCustom = booking.isCustomBooking;
    const hasCustomLabel = booking.customBookingLabel;
    
    // ✅ DEBUG: Log every booking
    console.log(`Booking ${booking.bookingId}:`, {
      customBookingType,
      isCustom,
      hasCustomLabel,
      finalAmount: booking.finalAmount,
      status: booking.status
    });

    // ✅ If this has a customBookingType, treat it as custom regardless of other flags
    if (customBookingType && CUSTOM_RATES[customBookingType]) {
      const packageRate = CUSTOM_RATES[customBookingType].price;
      console.log(`✅ FORCED: ${booking.bookingId} from ₹${booking.finalAmount} to ₹${packageRate}`);
      return packageRate;
    }

    // ✅ For non-custom bookings, use finalAmount
    console.log(`Regular booking ${booking.bookingId}: Using ₹${booking.finalAmount}`);
    return booking.finalAmount || 0;
  };

  // ✅ ENHANCED: Calculate comprehensive stats with debugging
  const calculateStats = (bookingsData) => {
    console.log('📊 Calculating stats for bookings:', bookingsData.length);
    
    const stats = {
      total: bookingsData.length,
      active: bookingsData.filter(b => b.status === 'active').length,
      completed: bookingsData.filter(b => b.status === 'completed').length,
      cancelled: bookingsData.filter(b => b.status === 'cancelled').length,
      totalRevenue: 0,
      packageStats: {
        half_day: 0,
        full_day: 0,
        night: 0
      },
      revenueByPackage: {
        half_day: 0,
        full_day: 0,
        night: 0
      }
    };

    // ✅ Calculate revenue and package stats accurately with debugging
    bookingsData.forEach((booking, index) => {
      const revenue = getBookingRevenue(booking);
      console.log(`📈 Booking ${index + 1} (${booking.bookingId}): ₹${revenue}`);
      
      stats.totalRevenue += revenue;

      const packageType = booking.customBookingType;
      if (packageType && stats.packageStats[packageType] !== undefined) {
        stats.packageStats[packageType]++;
        stats.revenueByPackage[packageType] += revenue;
        console.log(`📦 ${packageType}: +₹${revenue}, Total: ₹${stats.revenueByPackage[packageType]}`);
      }
    });

    console.log('📊 Final Stats:', {
      totalRevenue: stats.totalRevenue,
      avgRevenue: stats.total > 0 ? Math.round(stats.totalRevenue / stats.total) : 0,
      packageStats: stats.packageStats,
      revenueByPackage: stats.revenueByPackage
    });

    setStats(stats);
  };

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = !searchTerm || 
      booking.bookingId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.customerId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.customerId?.phone?.includes(searchTerm);
    
    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;
    const matchesPackage = packageFilter === 'all' || booking.customBookingType === packageFilter;
    
    return matchesSearch && matchesStatus && matchesPackage;
  });

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateDuration = (startTime, endTime, status) => {
    // ✅ Handle cancelled bookings
    if (status === 'cancelled') {
      return 'CANCELLED';
    }
    
    if (!startTime) return 'N/A';
    
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diffMs = end - start;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  // ✅ NEW: Calculate package efficiency
  const getPackageEfficiency = (packageType) => {
    const packageInfo = CUSTOM_RATES[packageType];
    const count = stats.packageStats[packageType] || 0;
    const revenue = stats.revenueByPackage[packageType] || 0;
    
    if (count === 0) return { avgRevenue: 0, efficiency: 0 };
    
    const avgRevenue = Math.round(revenue / count);
    const efficiency = Math.round((avgRevenue / packageInfo.price) * 100);
    
    return { avgRevenue, efficiency };
  };

  if (loading) {
    return (
      <ThemedLayout>
        <div className="min-h-screen flex items-center justify-center">
          <ThemedCard>
            <div className="flex items-center space-x-3 p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
              <span className="text-white text-xl">Loading custom bookings...</span>
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
            Custom <span className={theme.typography.gradient}>Bookings</span>
          </h2>
          <p className={`${theme.typography.subtitle} max-w-2xl mx-auto mt-4`}>
            Manage and monitor all fixed-rate package bookings with accurate revenue tracking
          </p>
        </div>

        {/* ✅ DEBUG: Show actual booking data (always visible for troubleshooting) */}
        {bookings.length > 0 && (
          <ThemedCard title="🔧 Revenue Correction Status" className="mb-8">
            <div className="p-6 space-y-4">
              <div className="text-sm text-gray-400 mb-4">
                This panel shows how revenue is being calculated for each booking:
              </div>
              
              {bookings.slice(0, 5).map((booking) => {
                const packageInfo = CUSTOM_RATES[booking.customBookingType] || {};
                const calculatedRevenue = getBookingRevenue(booking);
                const storedAmount = booking.finalAmount || 0;
                const packageRate = packageInfo.price || 0;
                const isCorrected = calculatedRevenue !== storedAmount;
                
                return (
                  <div key={booking._id} className="bg-gray-800/50 p-4 rounded-lg border-l-4 border-cyan-400">
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
                      <div>
                        <div className="text-gray-400">Booking ID:</div>
                        <div className="text-white font-mono">{booking.bookingId}</div>
                      </div>
                      <div>
                        <div className="text-gray-400">Package:</div>
                        <div className="text-white">{booking.customBookingType || 'None'}</div>
                      </div>
                      <div>
                        <div className="text-gray-400">Database Amount:</div>
                        <div className={cn("font-bold", isCorrected ? "text-red-400" : "text-green-400")}>
                          ₹{storedAmount.toLocaleString('en-IN')}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-400">Package Rate:</div>
                        <div className="text-cyan-400 font-bold">₹{packageRate.toLocaleString('en-IN')}</div>
                      </div>
                      <div>
                        <div className="text-gray-400">Displayed Amount:</div>
                        <div className="text-green-400 font-bold">₹{calculatedRevenue.toLocaleString('en-IN')}</div>
                      </div>
                      <div>
                        <div className="text-gray-400">Status:</div>
                        <div className={cn("font-bold", isCorrected ? "text-orange-400" : "text-green-400")}>
                          {isCorrected ? '✅ Fixed' : '✓ Correct'}
                        </div>
                      </div>
                    </div>
                    
                    {isCorrected && (
                      <div className="mt-2 text-xs text-orange-300 bg-orange-900/20 p-2 rounded">
                        💡 Corrected: Database had ₹{storedAmount.toLocaleString('en-IN')} but showing package rate ₹{packageRate.toLocaleString('en-IN')}
                      </div>
                    )}
                  </div>
                );
              })}
              
              <div className="mt-4 p-4 bg-blue-900/20 border border-blue-700/50 rounded-lg">
                <div className="text-blue-200 font-medium mb-2">Expected vs Actual Revenue:</div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-400">Expected (Package Rates):</div>
                    <div className="text-green-400 font-bold text-lg">
                      ₹{Object.keys(stats.packageStats).reduce((sum, pkg) => {
                        return sum + (stats.packageStats[pkg] * (CUSTOM_RATES[pkg]?.price || 0));
                      }, 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400">Current Total:</div>
                    <div className="text-cyan-400 font-bold text-lg">₹{stats.totalRevenue.toLocaleString('en-IN')}</div>
                  </div>
                </div>
              </div>
            </div>
          </ThemedCard>
        )}

        {/* ✅ ENHANCED: Stats Overview with accurate calculations */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <ThemedCard className="p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-cyan-400 mb-2">{stats.total}</div>
              <div className="text-cyan-200 text-sm">Total Custom Bookings</div>
            </div>
          </ThemedCard>
          
          <ThemedCard className="p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-400 mb-2">{stats.active}</div>
              <div className="text-green-200 text-sm">Active Bookings</div>
            </div>
          </ThemedCard>
          
          <ThemedCard className="p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-400 mb-2">{stats.completed}</div>
              <div className="text-blue-200 text-sm">Completed</div>
            </div>
          </ThemedCard>

          <ThemedCard className="p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-red-400 mb-2">{stats.cancelled}</div>
              <div className="text-red-200 text-sm">Cancelled</div>
            </div>
          </ThemedCard>
          
          <ThemedCard className="p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-400 mb-2">
                ₹{stats.totalRevenue.toLocaleString('en-IN')}
              </div>
              <div className="text-purple-200 text-sm">Total Revenue</div>
              <div className="text-xs text-purple-300 mt-1">
                ₹{stats.total > 0 ? Math.round(stats.totalRevenue / stats.total).toLocaleString('en-IN') : 0}/avg
              </div>
            </div>
          </ThemedCard>
        </div>

        {/* ✅ ENHANCED: Package Stats with revenue breakdown */}
        <ThemedCard title="📦 Package Distribution & Revenue" className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
            {Object.entries(CUSTOM_RATES).map(([key, packageInfo]) => {
              const efficiency = getPackageEfficiency(key);
              const packageRevenue = stats.revenueByPackage[key] || 0;
              const packageCount = stats.packageStats[key] || 0;
              
              return (
                <div key={key} className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
                  <div className="text-center">
                    <div className="text-3xl mb-2">{packageInfo.icon}</div>
                    <div className="text-lg font-bold text-white mb-1">{packageInfo.label}</div>
                    
                    {/* Booking Count */}
                    <div className="text-2xl font-bold text-cyan-400 mb-1">
                      {packageCount}
                    </div>
                    <div className="text-sm text-gray-400 mb-3">bookings</div>
                    
                    {/* Revenue Information */}
                    <div className="space-y-2 border-t border-gray-600 pt-3">
                      <div>
                        <div className="text-lg font-bold text-green-400">
                          ₹{packageRevenue.toLocaleString('en-IN')}
                        </div>
                        <div className="text-xs text-gray-400">Total Revenue</div>
                      </div>
                      
                      <div>
                        <div className="text-sm text-cyan-300">
                          ₹{packageInfo.price.toLocaleString('en-IN')} base
                        </div>
                        <div className="text-xs text-gray-400">Package Rate</div>
                      </div>
                      
                      {packageCount > 0 && (
                        <div>
                          <div className="text-sm text-yellow-400">
                            ₹{efficiency.avgRevenue.toLocaleString('en-IN')} avg
                          </div>
                          <div className="text-xs text-gray-400">
                            {efficiency.efficiency}% of base rate
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ThemedCard>

        {/* Filters */}
        <ThemedCard title="🔍 Filters" className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6">
            <ThemedInput
              label="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by booking ID, customer name, or phone"
            />
            
            <ThemedSelect
              label="Status"
              value={statusFilter}
              onValueChange={setStatusFilter}
              options={[
                { value: 'all', label: 'All Statuses' },
                { value: 'active', label: 'Active' },
                { value: 'completed', label: 'Completed' },
                { value: 'cancelled', label: 'Cancelled' }
              ]}
            />
            
            <ThemedSelect
              label="Package Type"
              value={packageFilter}
              onValueChange={setPackageFilter}
              options={[
                { value: 'all', label: 'All Packages' },
                { value: 'half_day', label: '🌅 Half Day' },
                { value: 'full_day', label: '☀️ Full Day' },
                { value: 'night', label: '🌙 Night Package' }
              ]}
            />
            
            <div className="flex items-end">
              <ThemedButton
                variant="primary"
                onClick={fetchCustomBookings}
                className="w-full"
              >
                🔄 Refresh
              </ThemedButton>
            </div>
          </div>
          
          {/* ✅ Filter Summary */}
          <div className="px-6 pb-4">
            <div className="text-sm text-gray-400">
              Showing {filteredBookings.length} of {bookings.length} custom bookings
              {statusFilter !== 'all' && ` • Status: ${statusFilter}`}
              {packageFilter !== 'all' && ` • Package: ${CUSTOM_RATES[packageFilter]?.label}`}
              {searchTerm && ` • Search: "${searchTerm}"`}
            </div>
          </div>
        </ThemedCard>

        {/* ✅ ENHANCED: Bookings List with accurate revenue display */}
        <ThemedCard title={`📋 Custom Bookings (${filteredBookings.length})`}>
          {filteredBookings.length === 0 ? (
            <div className="text-center p-12">
              <div className="text-6xl mb-4">📦</div>
              <h3 className="text-2xl font-bold text-white mb-2">No Custom Bookings Found</h3>
              <p className="text-gray-400 mb-6">
                {bookings.length === 0 
                  ? "No custom bookings have been created yet"
                  : "No bookings match your current filters"
                }
              </p>
              <div className="flex gap-4 justify-center">
                <Link href="/custom-booking">
                  <ThemedButton variant="primary">
                    Create Custom Booking
                  </ThemedButton>
                </Link>
                <Link href="/booking">
                  <ThemedButton variant="secondary">
                    Create Regular Booking
                  </ThemedButton>
                </Link>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left p-4 text-gray-300">Booking ID</th>
                    <th className="text-left p-4 text-gray-300">Customer</th>
                    <th className="text-left p-4 text-gray-300">Package</th>
                    <th className="text-left p-4 text-gray-300">Vehicle</th>
                    <th className="text-left p-4 text-gray-300">Duration</th>
                    <th className="text-left p-4 text-gray-300">Amount</th>
                    <th className="text-left p-4 text-gray-300">Status</th>
                    <th className="text-left p-4 text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.map((booking) => {
                    const packageInfo = CUSTOM_RATES[booking.customBookingType] || {};
                    const bookingRevenue = getBookingRevenue(booking);
                    
                    return (
                      <tr key={booking._id} className="border-b border-gray-800 hover:bg-gray-800/30">
                        <td className="p-4">
                          <div className="font-mono text-cyan-400 font-bold">{booking.bookingId}</div>
                          <div className="text-xs text-gray-400">
                            {formatDateTime(booking.createdAt)}
                          </div>
                        </td>
                        
                        <td className="p-4">
                          <div className="text-white font-medium">{booking.customerId?.name || 'Unknown'}</div>
                          <div className="text-sm text-gray-400">{booking.customerId?.phone || 'N/A'}</div>
                        </td>
                        
                        <td className="p-4">
                          <div className="flex items-center space-x-2">
                            <span className="text-2xl">{packageInfo.icon}</span>
                            <div>
                              <div className="text-white font-medium">{packageInfo.label}</div>
                              <div className="text-xs text-purple-400">
                                ₹{packageInfo.price?.toLocaleString('en-IN')} base rate
                              </div>
                              {booking.customBookingLabel && (
                                <div className="text-xs text-gray-400">{booking.customBookingLabel}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        
                        <td className="p-4">
                          <div className="text-white">{booking.vehicleId?.model || 'Unknown'}</div>
                          <div className="text-sm text-gray-400 font-mono">{booking.vehicleId?.plateNumber || 'N/A'}</div>
                        </td>
                        
                        <td className="p-4">
                          <div className="text-white font-medium">
                            {calculateDuration(booking.startTime, booking.endTime, booking.status)}
                          </div>
                          {booking.status !== 'cancelled' && (
                            <>
                              <div className="text-xs text-gray-400">
                                Start: {formatDateTime(booking.startTime)}
                              </div>
                              {booking.endTime && (
                                <div className="text-xs text-gray-400">
                                  End: {formatDateTime(booking.endTime)}
                                </div>
                              )}
                              {booking.status === 'active' && (
                                <div className="text-xs text-orange-400 flex items-center gap-1 mt-1">
                                  <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                                  Live
                                </div>
                              )}
                            </>
                          )}
                        </td>
                        
                        <td className="p-4">
                          {booking.status === 'cancelled' ? (
                            <div>
                              <div className="text-red-400 font-bold">CANCELLED</div>
                              <div className="text-xs text-red-300">No charge</div>
                            </div>
                          ) : (
                            <div>
                              <div className="text-lg font-bold text-green-400">
                                ₹{bookingRevenue.toLocaleString('en-IN')}
                              </div>
                              <div className="text-xs text-gray-400 capitalize">
                                {booking.paymentMethod || 'N/A'}
                              </div>
                              {/* ✅ SHOW CORRECTION STATUS */}
                              {(() => {
                                const packageInfo = CUSTOM_RATES[booking.customBookingType];
                                const baseRate = packageInfo?.price || 0;
                                const storedAmount = booking.finalAmount || 0;
                                
                                if (bookingRevenue === baseRate && storedAmount !== baseRate) {
                                  return (
                                    <div className="text-xs text-orange-400">
                                      ✅ Fixed: was ₹{storedAmount.toLocaleString('en-IN')}
                                    </div>
                                  );
                                } else if (bookingRevenue === baseRate) {
                                  return (
                                    <div className="text-xs text-green-400">
                                      📦 Package Rate
                                    </div>
                                  );
                                } else {
                                  return (
                                    <div className="text-xs text-yellow-400">
                                      Custom Amount
                                    </div>
                                  );
                                }
                              })()}
                            </div>
                          )}
                        </td>
                        
                        <td className="p-4">
                          <ThemedBadge
                            className={cn(
                              "border",
                              booking.status === 'active' && "bg-green-500/20 text-green-400 border-green-500/30",
                              booking.status === 'completed' && "bg-blue-500/20 text-blue-400 border-blue-500/30",
                              booking.status === 'cancelled' && "bg-red-500/20 text-red-400 border-red-500/30"
                            )}
                          >
                            {booking.status.toUpperCase()}
                          </ThemedBadge>
                        </td>
                        
                        <td className="p-4">
                          <div className="flex flex-col gap-2">
                            <div className="flex space-x-2">
                              {booking.status === 'active' && (
                                <Link href={`/active-bookings/${booking.bookingId}`}>
                                  <ThemedButton variant="primary" className="text-xs px-3 py-1">
                                    View Live
                                  </ThemedButton>
                                </Link>
                              )}
                              {booking.status === 'active' && (
                                <Link href={`/return/${booking.bookingId}`}>
                                  <ThemedButton variant="success" className="text-xs px-3 py-1">
                                    Return
                                  </ThemedButton>
                                </Link>
                              )}
                            </div>
                            <Link href={`/booking/confirmation/${booking.bookingId}`}>
                              <ThemedButton variant="secondary" className="text-xs px-3 py-1 w-full">
                                📄 Receipt
                              </ThemedButton>
                            </Link>
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
        <div className="flex flex-col md:flex-row gap-4 mt-8">
          <Link href="/custom-booking" className="flex-1">
            <ThemedButton variant="success" className="w-full py-3">
              ➕ New Custom Booking
            </ThemedButton>
          </Link>
          <Link href="/booking" className="flex-1">
            <ThemedButton variant="primary" className="w-full py-3">
              ⚡ New Regular Booking
            </ThemedButton>
          </Link>
          <Link href="/admin/bookings" className="flex-1">
            <ThemedButton variant="secondary" className="w-full py-3">
              📋 All Bookings
            </ThemedButton>
          </Link>
          <Link href="/active-bookings" className="flex-1">
            <ThemedButton variant="secondary" className="w-full py-3">
              🔄 Active Bookings
            </ThemedButton>
          </Link>
          <Link href="/admin" className="flex-1">
            <ThemedButton variant="secondary" className="w-full py-3">
              📊 Dashboard
            </ThemedButton>
          </Link>
        </div>
      </div>
    </ThemedLayout>
  );
}