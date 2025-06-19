'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

export default function AdminDashboard() {
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
  const [timeRange, setTimeRange] = useState('week'); // week, month, year

  useEffect(() => {
    fetchDashboardData();
    // Refresh data every 5 minutes
    const interval = setInterval(fetchDashboardData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [timeRange]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch multiple data sources
      const [statsRes, bookingsRes, revenueRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/recent-bookings'),
        fetch(`/api/admin/revenue-chart?range=${timeRange}`)
      ]);

      if (statsRes.ok && bookingsRes.ok && revenueRes.ok) {
        const [stats, bookings, revenue] = await Promise.all([
          statsRes.json(),
          bookingsRes.json(),
          revenueRes.json()
        ]);

        setDashboardData({
          todayStats: stats.todayStats || {},
          recentBookings: bookings.bookings || [],
          revenueChart: revenue.chartData || [],
          vehicleUtilization: stats.vehicleUtilization || [],
          monthlyStats: stats.monthlyStats || {}
        });
      } else {
        // Fallback to basic stats if admin APIs don't exist yet
        const basicStatsRes = await fetch('/api/stats');
        if (basicStatsRes.ok) {
          const basicStats = await basicStatsRes.json();
          setDashboardData(prev => ({
            ...prev,
            todayStats: {
              revenue: basicStats.stats?.todayRevenue || 0,
              bookings: 5, // Mock data
              activeRentals: basicStats.stats?.activeBookings || 0,
              vehiclesOut: basicStats.stats?.activeBookings || 0
            }
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Mock data for demonstration (remove when real APIs are implemented)
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

  const pieColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-xl">Loading dashboard...</div>
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
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
                <option value="year">Last 12 Months</option>
              </select>
              <button
                onClick={fetchDashboardData}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
              >
                🔄 Refresh
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Today's Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Today's Revenue</p>
                <p className="text-2xl font-bold text-green-600">
                  ₹{(dashboardData.todayStats.revenue || 0).toLocaleString('en-IN')}
                </p>
              </div>
              <div className="text-green-500 text-3xl">💰</div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">New Bookings</p>
                <p className="text-2xl font-bold text-blue-600">{dashboardData.todayStats.bookings || 5}</p>
              </div>
              <div className="text-blue-500 text-3xl">📋</div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Rentals</p>
                <p className="text-2xl font-bold text-orange-600">{dashboardData.todayStats.activeRentals || 0}</p>
              </div>
              <div className="text-orange-500 text-3xl">🚴</div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Vehicles Out</p>
                <p className="text-2xl font-bold text-purple-600">{dashboardData.todayStats.vehiclesOut || 0}</p>
              </div>
              <div className="text-purple-500 text-3xl">🏍️</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Chart */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Revenue Trend</h3>
              <span className="text-sm text-gray-500 capitalize">{timeRange} view</span>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dashboardData.revenueChart.length > 0 ? dashboardData.revenueChart : mockRevenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value, name) => [`₹${value}`, name === 'revenue' ? 'Revenue' : 'Bookings']} />
                <Line type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Vehicle Utilization */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Vehicle Performance</h3>
              <span className="text-sm text-gray-500">Hours rented</span>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dashboardData.vehicleUtilization.length > 0 ? dashboardData.vehicleUtilization : mockVehicleData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value, name) => [name === 'hours' ? `${value} hours` : `₹${value}`, name === 'hours' ? 'Hours Rented' : 'Revenue']} />
                <Bar dataKey="hours" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Bookings */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Recent Bookings</h3>
              <div className="flex gap-3">
                <Link href="/admin/bookings" className="text-blue-600 hover:text-blue-800 font-medium">
                  View All Bookings →
                </Link>
                <Link href="/active-bookings" className="text-green-600 hover:text-green-800 font-medium">
                  Active Only →
                </Link>
              </div>
            </div>
            <div className="overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Customer</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Vehicle</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {/* Mock data - replace with real data */}
                  {[
                    { customer: 'Raj Kumar', vehicle: 'Hero Splendor (MP09AB1234)', status: 'active', amount: '₹480' },
                    { customer: 'Priya Sharma', vehicle: 'Honda Activa (MP09CD5678)', status: 'completed', amount: '₹320' },
                    { customer: 'Amit Verma', vehicle: 'TVS Jupiter (MP09EF9012)', status: 'active', amount: '₹240' },
                    { customer: 'Sunita Patel', vehicle: 'Bajaj Pulsar (MP09GH3456)', status: 'completed', amount: '₹560' }
                  ].map((booking, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{booking.customer}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{booking.vehicle}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          booking.status === 'active' 
                            ? 'bg-orange-100 text-orange-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {booking.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">{booking.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Quick Actions</h3>
          {/* Settings Button in Quick Actions */}
            <div className="space-y-4">
              <Link 
                href="/booking" 
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-medium text-center block"
              >
                + New Booking
              </Link>
              <Link 
                href="/admin/bookings" 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium text-center block"
              >
                📋 All Bookings
              </Link>
              <Link 
                href="/vehicles" 
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-lg font-medium text-center block"
              >
                Manage Vehicles
              </Link>
              <Link 
                href="/customers" 
                className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 px-4 rounded-lg font-medium text-center block"
              >
                Customer Database
              </Link>
              <Link 
                href="/settings" 
                className="w-full bg-gray-600 hover:bg-gray-700 text-white py-3 px-4 rounded-lg font-medium text-center block"
              >
                ⚙️ Settings
              </Link>
            </div>

            <div className="mt-8 pt-6 border-t">
              <h4 className="font-semibold text-gray-900 mb-3">System Status</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Database</span>
                  <span className="text-green-600 font-medium">✓ Online</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Backup</span>
                  <span className="text-gray-900">2 hours ago</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Active Users</span>
                  <span className="text-blue-600 font-medium">2</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Summary */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Monthly Performance</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">₹{(dashboardData.monthlyStats.totalRevenue || 45000).toLocaleString('en-IN')}</div>
              <div className="text-gray-600 mt-1">Total Revenue</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{dashboardData.monthlyStats.totalBookings || 156}</div>
              <div className="text-gray-600 mt-1">Total Bookings</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">₹{(dashboardData.monthlyStats.avgPerBooking || 288).toLocaleString('en-IN')}</div>
              <div className="text-gray-600 mt-1">Avg per Booking</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">{dashboardData.monthlyStats.topVehicle || 'Hero Splendor'}</div>
              <div className="text-gray-600 mt-1">Top Vehicle</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}