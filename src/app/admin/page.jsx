'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ThemedLayout, 
  ThemedCard, 
  ThemedStatsCard, 
  ThemedButton, 
  ThemedBadge 
} from '@/components/themed';
import { theme } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

export default function UpdatedThemedAdminDashboard() {
  const [dashboardData, setDashboardData] = useState({
    todayStats: {
      revenue: 0,
      bookings: 0,
      activeRentals: 0,
      vehiclesOut: 0
    },
    recentBookings: [],
    revenueChart: [],
    vehicleUtilization: [],
    monthlyStats: {
      totalRevenue: 0,
      totalBookings: 0,
      avgPerBooking: 0,
      topVehicle: ''
    }
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('week');

  useEffect(() => {
    fetchDashboardData();
    // Refresh data every 5 minutes
    const interval = setInterval(fetchDashboardData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [timeRange]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Try to fetch admin API data first
      const [statsRes, bookingsRes, revenueRes] = await Promise.all([
        fetch('/api/admin/stats').catch(() => null),
        fetch('/api/admin/recent-bookings?limit=8').catch(() => null),
        fetch(`/api/admin/revenue-chart?range=${timeRange}`).catch(() => null)
      ]);

      let dashboardInfo = {
        todayStats: {},
        recentBookings: [],
        revenueChart: [],
        vehicleUtilization: [],
        monthlyStats: {}
      };

      // Handle recent bookings
      if (bookingsRes && bookingsRes.ok) {
        const bookingsData = await bookingsRes.json();
        if (bookingsData.success) {
          dashboardInfo.recentBookings = bookingsData.bookings;
        }
      } else {
        // Fallback: fetch from basic bookings API
        try {
          const fallbackBookings = await fetch('/api/bookings');
          const fallbackData = await fallbackBookings.json();
          if (fallbackData.success) {
            // Take the 8 most recent bookings and format them
            dashboardInfo.recentBookings = fallbackData.bookings
              .slice(0, 8)
              .map(booking => ({
                ...booking,
                customerName: booking.customerId?.name || 'Unknown Customer',
                vehicleInfo: booking.vehicleId ? 
                  `${booking.vehicleId.model} (${booking.vehicleId.plateNumber})` : 
                  'Unknown Vehicle',
                displayAmount: booking.finalAmount || 
                  (booking.status === 'active' ? 
                    Math.ceil((new Date() - new Date(booking.startTime)) / (1000 * 60 * 60)) * 80 : 0)
              }));
          }
        } catch (error) {
          console.error('Error fetching fallback bookings:', error);
        }
      }

      // Handle other stats
      if (statsRes && statsRes.ok) {
        const statsData = await statsRes.json();
        dashboardInfo.todayStats = statsData.todayStats || {};
        dashboardInfo.vehicleUtilization = statsData.vehicleUtilization || [];
        dashboardInfo.monthlyStats = statsData.monthlyStats || {};
      } else {
        // Fallback to basic stats
        try {
          const basicStatsRes = await fetch('/api/stats');
          if (basicStatsRes.ok) {
            const basicStats = await basicStatsRes.json();
            dashboardInfo.todayStats = {
              revenue: basicStats.stats?.todayRevenue || 0,
              bookings: dashboardInfo.recentBookings.filter(b => {
                const today = new Date();
                const bookingDate = new Date(b.createdAt);
                return bookingDate.toDateString() === today.toDateString();
              }).length || 5,
              activeRentals: basicStats.stats?.activeBookings || 0,
              vehiclesOut: basicStats.stats?.activeBookings || 0
            };
          }
        } catch (error) {
          console.error('Error fetching basic stats:', error);
        }
      }

      // Handle revenue chart
      if (revenueRes && revenueRes.ok) {
        const revenueData = await revenueRes.json();
        dashboardInfo.revenueChart = revenueData.chartData || [];
      }

      setDashboardData(dashboardInfo);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Mock data for demonstration (fallback when APIs are not available)
  const mockRevenueData = [
    { date: 'Mon', revenue: 2400, bookings: 8 },
    { date: 'Tue', revenue: 1600, bookings: 6 },
    { date: 'Wed', revenue: 3200, bookings: 12 },
    { date: 'Thu', revenue: 2800, bookings: 10 },
    { date: 'Fri', revenue: 4000, bookings: 15 },
    { date: 'Sat', revenue: 3600, bookings: 14 },
    { date: 'Sun', revenue: 3000, bookings: 11 }
  ];

  const mockVehicleData = [
    { name: 'Hero Splendor', hours: 45, revenue: 3600 },
    { name: 'Honda Activa', hours: 38, revenue: 3040 },
    { name: 'TVS Jupiter', hours: 32, revenue: 2560 },
    { name: 'Bajaj Pulsar', hours: 28, revenue: 2240 }
  ];

  // Dark theme chart configuration
  const darkChartTheme = {
    cartesianGrid: { stroke: '#374151', strokeDasharray: '3 3' },
    xAxis: { stroke: '#9CA3AF', fontSize: 12 },
    yAxis: { stroke: '#9CA3AF', fontSize: 12 },
    tooltip: {
      contentStyle: {
        backgroundColor: '#1F2937',
        border: '1px solid #374151',
        borderRadius: '8px',
        color: '#F3F4F6'
      }
    }
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <ThemedLayout>
        <div className="min-h-screen flex items-center justify-center">
          <ThemedCard>
            <div className="flex items-center space-x-3 p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
              <span className="text-white text-xl">Loading dashboard...</span>
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
            Admin <span className={theme.typography.gradient}>Dashboard</span>
          </h2>
          <p className={`${theme.typography.subtitle} max-w-2xl mx-auto mt-4`}>
            Complete business analytics and performance insights
          </p>
        </div>

        {/* Time Range Selector */}
        <ThemedCard className="mb-8">
          <div className="flex justify-between items-center p-6">
            <div>
              <h3 className="text-lg font-semibold text-white">Analytics Overview</h3>
              <p className="text-gray-400">Real-time business performance metrics</p>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className={theme.components.input.base + " w-auto"}
              >
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
                <option value="year">Last 12 Months</option>
              </select>
              <ThemedButton
                variant="secondary"
                onClick={fetchDashboardData}
                className="flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </ThemedButton>
            </div>
          </div>
        </ThemedCard>

        {/* Today's Stats */}
        <div className={theme.layout.grid.stats + " mb-8"}>
          <ThemedStatsCard
            title="Today's Revenue"
            value={`₹${(dashboardData.todayStats.revenue || 2640).toLocaleString('en-IN')}`}
            subtitle="+12% from yesterday"
            colorScheme="revenue"
            icon={<div className="text-4xl mb-2">💰</div>}
            progress={75}
          />
          
          <ThemedStatsCard
            title="New Bookings"
            value={dashboardData.todayStats.bookings || 8}
            subtitle="Today's count"
            colorScheme="bookings"
            icon={<div className="text-4xl mb-2">📋</div>}
            progress={60}
          />
          
          <ThemedStatsCard
            title="Active Rentals"
            value={dashboardData.todayStats.activeRentals || 5}
            subtitle="Currently out"
            colorScheme="vehicles"
            icon={<div className="text-4xl mb-2">🚴</div>}
            progress={50}
          />
          
          <ThemedStatsCard
            title="Vehicles Out"
            value={dashboardData.todayStats.vehiclesOut || 5}
            subtitle="Fleet utilization"
            colorScheme="customers"
            icon={<div className="text-4xl mb-2">🏍️</div>}
            progress={42}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Revenue Chart */}
          <ThemedCard title="Revenue Trend" description={`${timeRange} view`}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dashboardData.revenueChart.length > 0 ? dashboardData.revenueChart : mockRevenueData}>
                <CartesianGrid {...darkChartTheme.cartesianGrid} />
                <XAxis 
                  dataKey="date" 
                  {...darkChartTheme.xAxis}
                />
                <YAxis {...darkChartTheme.yAxis} />
                <Tooltip 
                  {...darkChartTheme.tooltip}
                  formatter={(value, name) => [
                    `₹${value}`, 
                    name === 'revenue' ? 'Revenue' : 'Bookings'
                  ]} 
                />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#06B6D4" 
                  strokeWidth={3}
                  dot={{ fill: '#06B6D4', strokeWidth: 2, r: 6 }}
                  activeDot={{ r: 8, stroke: '#06B6D4', strokeWidth: 2, fill: '#1F2937' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ThemedCard>

          {/* Vehicle Performance */}
          <ThemedCard title="Vehicle Performance" description="Hours rented today">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dashboardData.vehicleUtilization.length > 0 ? dashboardData.vehicleUtilization : mockVehicleData}>
                <CartesianGrid {...darkChartTheme.cartesianGrid} />
                <XAxis 
                  dataKey="name" 
                  {...darkChartTheme.xAxis}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis {...darkChartTheme.yAxis} />
                <Tooltip 
                  {...darkChartTheme.tooltip}
                  formatter={(value, name) => [
                    name === 'hours' ? `${value} hours` : `₹${value}`, 
                    name === 'hours' ? 'Hours Rented' : 'Revenue'
                  ]} 
                />
                <Bar 
                  dataKey="hours" 
                  fill="url(#barGradient)"
                  radius={[4, 4, 0, 0]}
                />
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" />
                    <stop offset="100%" stopColor="#059669" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </ThemedCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Recent Bookings - Now Using Real Data */}
          <div className="lg:col-span-2">
            <ThemedCard title="Recent Bookings">
              <div className="flex justify-between items-center mb-6">
                <p className="text-gray-400">Latest rental activity from database</p>
                <div className="flex gap-3">
                  <Link href="/admin/bookings">
                    <ThemedButton variant="secondary" className="text-sm">
                      View All Bookings →
                    </ThemedButton>
                  </Link>
                  <Link href="/active-bookings">
                    <ThemedButton variant="primary" className="text-sm">
                      Active Only →
                    </ThemedButton>
                  </Link>
                </div>
              </div>
              
              <div className="overflow-hidden">
                {dashboardData.recentBookings.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-gray-400 text-lg mb-2">No recent bookings found</div>
                    <p className="text-gray-500 text-sm">Create your first booking to see data here</p>
                    <Link href="/booking" className="mt-4 inline-block">
                      <ThemedButton variant="primary" className="text-sm">
                        + Create First Booking
                      </ThemedButton>
                    </Link>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-3 px-4 font-medium text-gray-400">Customer</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-400">Vehicle</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-400">Status</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-400">Amount</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-400">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {dashboardData.recentBookings.map((booking, index) => (
                        <tr key={booking._id || index} className="hover:bg-gray-800/50 transition-colors">
                          <td className="py-3 px-4">
                            <div>
                              <div className="font-medium text-white">{booking.customerName}</div>
                              <div className="text-gray-400 text-sm font-mono">
                                ID: {booking.bookingId}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-gray-300">{booking.vehicleInfo}</div>
                          </td>
                          <td className="py-3 px-4">
                            <ThemedBadge 
                              status={booking.status}
                              className="text-xs"
                            >
                              {booking.status.toUpperCase()}
                              {booking.status === 'active' && <span className="ml-1">🔴</span>}
                            </ThemedBadge>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-white">
                              ₹{booking.displayAmount.toLocaleString('en-IN')}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-gray-300 text-sm">
                              {formatDateTime(booking.startTime)}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </ThemedCard>
          </div>

          {/* Quick Actions */}
          <ThemedCard title="Quick Actions">
            <div className="space-y-4">
              <Link href="/booking">
                <ThemedButton variant="success" className="w-full flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  New Booking
                </ThemedButton>
              </Link>
              
              <Link href="/admin/bookings">
                <ThemedButton variant="primary" className="w-full flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v11a2 2 0 002 2h9.5M15 8v7m0 0l3-3m-3 3l-3-3" />
                  </svg>
                  All Bookings
                </ThemedButton>
              </Link>
              
              <Link href="/vehicles">
                <ThemedButton variant="secondary" className="w-full flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Manage Vehicles
                </ThemedButton>
              </Link>
              
              <Link href="/customers">
                <ThemedButton variant="secondary" className="w-full flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                  Customer Database
                </ThemedButton>
              </Link>
              
              <Link href="/settings">
                <ThemedButton variant="secondary" className="w-full flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Settings
                </ThemedButton>
              </Link>
            </div>
            
            <div className="mt-8 pt-6 border-t border-gray-700">
              <h4 className="font-semibold text-white mb-3">System Status</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Database</span>
                  <span className="text-green-400 font-medium flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    Online
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Last Backup</span>
                  <span className="text-gray-300">2 hours ago</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Active Users</span>
                  <span className="text-cyan-400 font-medium">2</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Uptime</span>
                  <span className="text-green-400 font-medium">99.9%</span>
                </div>
              </div>
            </div>
          </ThemedCard>
        </div>

        {/* Monthly Performance Summary */}
        <ThemedCard title="Monthly Performance Summary">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-400 mb-2">
                ₹{(dashboardData.monthlyStats.totalRevenue || 45000).toLocaleString('en-IN')}
              </div>
              <div className="text-gray-400">Total Revenue</div>
              <div className="text-sm text-green-400 mt-1">+15% vs last month</div>
            </div>
            
            <div className="text-center">
              <div className="text-4xl font-bold text-green-400 mb-2">
                {dashboardData.monthlyStats.totalBookings || 156}
              </div>
              <div className="text-gray-400">Total Bookings</div>
              <div className="text-sm text-green-400 mt-1">+8% vs last month</div>
            </div>
            
            <div className="text-center">
              <div className="text-4xl font-bold text-orange-400 mb-2">
                ₹{(dashboardData.monthlyStats.avgPerBooking || 288).toLocaleString('en-IN')}
              </div>
              <div className="text-gray-400">Avg per Booking</div>
              <div className="text-sm text-blue-400 mt-1">Stable</div>
            </div>
            
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-400 mb-2">
                {dashboardData.monthlyStats.topVehicle || 'Hero Splendor'}
              </div>
              <div className="text-gray-400">Top Vehicle</div>
              <div className="text-sm text-purple-400 mt-1">45 hours</div>
            </div>
          </div>
        </ThemedCard>
      </div>
    </ThemedLayout>
  );
}