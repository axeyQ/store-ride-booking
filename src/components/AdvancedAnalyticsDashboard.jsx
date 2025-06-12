'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';

const AdvancedAnalyticsDashboard = () => {
  const [analytics, setAnalytics] = useState({
    revenue: [],
    vehicleUtilization: [],
    customerInsights: {},
    peakHours: [],
    monthlyTrends: [],
    profitability: {},
    recentMetrics: {}
  });
  
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    endDate: new Date().toISOString().split('T')[0] // today
  });
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadAnalyticsData();
  }, [dateRange]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/analytics?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`);
      const result = await response.json();
      
      if (result.success) {
        setAnalytics(result.data);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  // Color schemes for charts
  const colors = {
    primary: '#3B82F6',
    secondary: '#10B981', 
    accent: '#F59E0B',
    danger: '#EF4444',
    purple: '#8B5CF6',
    teal: '#14B8A6'
  };

  const pieColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#14B8A6'];

  // Overview Tab Component
  const OverviewTab = () => (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-600 rounded-lg">
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-blue-600">Total Revenue</p>
              <p className="text-2xl font-semibold text-blue-900">
                {formatCurrency(analytics.recentMetrics.totalRevenue || 0)}
              </p>
              <p className="text-xs text-blue-600">
                {analytics.recentMetrics.revenueGrowth > 0 ? '↗' : '↘'} 
                {Math.abs(analytics.recentMetrics.revenueGrowth || 0)}% vs last period
              </p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 p-6 rounded-lg border border-green-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-600 rounded-lg">
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-green-600">Total Bookings</p>
              <p className="text-2xl font-semibold text-green-900">
                {analytics.recentMetrics.totalBookings || 0}
              </p>
              <p className="text-xs text-green-600">
                {analytics.recentMetrics.bookingGrowth > 0 ? '↗' : '↘'} 
                {Math.abs(analytics.recentMetrics.bookingGrowth || 0)}% vs last period
              </p>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-600 rounded-lg">
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-yellow-600">Avg Revenue/Day</p>
              <p className="text-2xl font-semibold text-yellow-900">
                {formatCurrency(analytics.recentMetrics.avgRevenuePerDay || 0)}
              </p>
              <p className="text-xs text-yellow-600">
                Based on {analytics.recentMetrics.activeDays || 0} active days
              </p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
          <div className="flex items-center">
            <div className="p-2 bg-purple-600 rounded-lg">
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-purple-600">Unique Customers</p>
              <p className="text-2xl font-semibold text-purple-900">
                {analytics.recentMetrics.uniqueCustomers || 0}
              </p>
              <p className="text-xs text-purple-600">
                {analytics.recentMetrics.repeatCustomers || 0} repeat customers
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Trend Chart */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Revenue Trend</h3>
          <div className="text-sm text-gray-500">
            {formatDate(dateRange.startDate)} to {formatDate(dateRange.endDate)}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={analytics.revenue}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis tickFormatter={(value) => `₹${value}`} />
            <Tooltip formatter={(value) => [formatCurrency(value), 'Revenue']} />
            <Area type="monotone" dataKey="amount" stroke={colors.primary} fill={colors.primary} fillOpacity={0.1} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vehicle Utilization */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Vehicle Utilization</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={analytics.vehicleUtilization}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="vehicleNumber" />
              <YAxis />
              <Tooltip formatter={(value) => [`${value}%`, 'Utilization']} />
              <Bar dataKey="utilizationPercentage" fill={colors.secondary} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Peak Hours */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Peak Hours Analysis</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={analytics.peakHours}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="bookings" stroke={colors.accent} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  // Revenue Tab Component
  const RevenueTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Revenue Sources</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Bike Rentals', value: analytics.profitability.bikeRevenue || 0 },
                  { name: 'Scooty Rentals', value: analytics.profitability.scootyRevenue || 0 },
                  { name: 'Late Penalties', value: analytics.profitability.penaltyRevenue || 0 },
                  { name: 'Damage Charges', value: analytics.profitability.damageRevenue || 0 }
                ]}
                cx="50%"
                cy="50%"
                outerRadius={60}
                fill="#8884d8"
                dataKey="value"
              >
                {[0, 1, 2, 3].map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(value)} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Profitability</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Revenue</span>
              <span className="font-semibold text-green-600">
                {formatCurrency(analytics.profitability.totalRevenue || 0)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Operating Costs</span>
              <span className="font-semibold text-red-600">
                {formatCurrency(analytics.profitability.operatingCosts || 0)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Maintenance Costs</span>
              <span className="font-semibold text-red-600">
                {formatCurrency(analytics.profitability.maintenanceCosts || 0)}
              </span>
            </div>
            <hr />
            <div className="flex justify-between">
              <span className="text-gray-800 font-semibold">Net Profit</span>
              <span className={`font-bold ${analytics.profitability.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(analytics.profitability.netProfit || 0)}
              </span>
            </div>
            <div className="text-sm text-gray-500">
              Profit Margin: {((analytics.profitability.netProfit / analytics.profitability.totalRevenue) * 100 || 0).toFixed(1)}%
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Monthly Comparison</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={analytics.monthlyTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => `₹${value/1000}k`} />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Bar dataKey="revenue" fill={colors.primary} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Revenue Breakdown */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Detailed Revenue Analysis</h3>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={analytics.revenue}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis tickFormatter={(value) => `₹${value}`} />
            <Tooltip formatter={(value) => formatCurrency(value)} />
            <Legend />
            <Line type="monotone" dataKey="amount" stroke={colors.primary} name="Total Revenue" strokeWidth={2} />
            <Line type="monotone" dataKey="bikeRevenue" stroke={colors.secondary} name="Bike Revenue" strokeWidth={1} />
            <Line type="monotone" dataKey="scootyRevenue" stroke={colors.accent} name="Scooty Revenue" strokeWidth={1} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  // Customer Insights Tab Component
  const CustomerTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium text-blue-800">Total Customers</h4>
          <p className="text-2xl font-bold text-blue-600">{analytics.customerInsights.totalCustomers || 0}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <h4 className="font-medium text-green-800">Repeat Customers</h4>
          <p className="text-2xl font-bold text-green-600">{analytics.customerInsights.repeatCustomers || 0}</p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg">
          <h4 className="font-medium text-yellow-800">Avg Booking Value</h4>
          <p className="text-2xl font-bold text-yellow-600">
            {formatCurrency(analytics.customerInsights.avgBookingValue || 0)}
          </p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <h4 className="font-medium text-purple-800">Customer Retention</h4>
          <p className="text-2xl font-bold text-purple-600">
            {(analytics.customerInsights.retentionRate || 0).toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Customer Segments */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Customer Segments</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-700 mb-3">By Frequency</h4>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'One-time', value: analytics.customerInsights.oneTimeCustomers || 0 },
                    { name: 'Regular', value: analytics.customerInsights.regularCustomers || 0 },
                    { name: 'Frequent', value: analytics.customerInsights.frequentCustomers || 0 }
                  ]}
                  cx="50%"
                  cy="50%"
                  outerRadius={60}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {[0, 1, 2].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={pieColors[index]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-700 mb-3">By Vehicle Preference</h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={[
                { type: 'Bike', customers: analytics.customerInsights.bikeCustomers || 0 },
                { type: 'Scooty', customers: analytics.customerInsights.scootyCustomers || 0 },
                { type: 'Both', customers: analytics.customerInsights.bothCustomers || 0 }
              ]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="customers" fill={colors.secondary} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Customers */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Customers</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Bookings</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total Spent</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Avg Rating</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Last Booking</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {(analytics.customerInsights.topCustomers || []).map((customer, index) => (
                <tr key={index}>
                  <td className="px-4 py-2">
                    <div>
                      <div className="font-medium text-gray-900">{customer.name}</div>
                      <div className="text-sm text-gray-500">{customer.mobile}</div>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900">{customer.bookingCount}</td>
                  <td className="px-4 py-2 text-sm text-gray-900">{formatCurrency(customer.totalSpent)}</td>
                  <td className="px-4 py-2 text-sm text-gray-900">
                    <div className="flex items-center">
                      <span>{customer.avgRating.toFixed(1)}</span>
                      <div className="ml-1 flex">
                        {[...Array(5)].map((_, i) => (
                          <svg
                            key={i}
                            className={`h-3 w-3 ${i < Math.round(customer.avgRating) ? 'text-yellow-400' : 'text-gray-300'}`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500">{formatDate(customer.lastBooking)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-2">
            <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-gray-600">Loading analytics...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Business Intelligence Dashboard</h1>
            <p className="text-gray-600">Advanced analytics and insights for MR Travels</p>
          </div>
          
          {/* Date Range Selector */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">From:</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">To:</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={loadAnalyticsData}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow-sm mb-6">
        <div className="flex space-x-0 border-b">
          {[
            { id: 'overview', label: 'Overview', icon: '📊' },
            { id: 'revenue', label: 'Revenue', icon: '💰' },
            { id: 'customers', label: 'Customers', icon: '👥' },
            { id: 'vehicles', label: 'Vehicles', icon: '🚲' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="mb-6">
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'revenue' && <RevenueTab />}
        {activeTab === 'customers' && <CustomerTab />}
        {activeTab === 'vehicles' && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Vehicle Performance Analytics</h3>
            <p className="text-gray-600">Vehicle performance analytics coming in next update...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdvancedAnalyticsDashboard;