'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ThemedLayout,
  ThemedCard,
  ThemedStatsCard,
  ThemedButton,
  ThemedSelect,
  ThemedInput
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
  Cell,
  ComposedChart
} from 'recharts';

import { calculateCurrentAmount } from '@/lib/pricing';

// ✅ FIXED: Helper function to calculate booking revenue with proper async handling
const calculateBookingRevenue = async (booking) => {
  try {
    const result = await calculateCurrentAmount(booking);
    return typeof result === 'number' ? result : result.amount;
  } catch (error) {
    console.warn(`Advanced pricing failed for booking ${booking.bookingId}, using fallback:`, error);
    return booking.finalAmount || booking.baseAmount || 0;
  }
};

// ✅ FIXED: Helper function to process multiple bookings with async
const calculateTotalRevenue = async (bookings) => {
  let totalRevenue = 0;
  for (const booking of bookings) {
    const revenue = await calculateBookingRevenue(booking);
    totalRevenue += revenue;
  }
  return totalRevenue;
};

// ✅ NEW: Daily Revenue Bar Chart Component
function DailyRevenueBarChart() {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [timeFilter, setTimeFilter] = useState('7days');
  const [chartType, setChartType] = useState('bar'); // bar, line, composed
  const [showComparison, setShowComparison] = useState(false);
  const [customDateRange, setCustomDateRange] = useState({
    start: '',
    end: ''
  });
  const [exportLoading, setExportLoading] = useState(false);

  // Fetch daily revenue data from real bookings
  const fetchDailyRevenueData = useCallback(async () => {
    if (loading) return; // ✅ FIXED: Prevent multiple simultaneous calls
    
    setLoading(true);
    console.log('🧮 Fetching daily revenue data using advanced pricing...');
    
    try {
      // Get real bookings data
      const bookingsResponse = await fetch('/api/bookings');
      const bookingsData = await bookingsResponse.json();
      
      if (!bookingsData.success || !bookingsData.bookings) {
        console.error('Failed to fetch bookings data');
        setChartData([]);
        return;
      }

      console.log(`📊 Processing ${bookingsData.bookings.length} total bookings with advanced pricing...`);

      // Calculate date range based on filter
      let endDate = new Date();
      let startDate = new Date();
      let days = 7;

      if (timeFilter === 'custom' && customDateRange.start && customDateRange.end) {
        startDate = new Date(customDateRange.start);
        endDate = new Date(customDateRange.end);
        days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
      } else {
        days = timeFilter === '7days' ? 7 : timeFilter === '30days' ? 30 : 90;
        startDate.setDate(endDate.getDate() - days + 1);
      }

      // Filter bookings by date range and exclude cancelled
      const filteredBookings = bookingsData.bookings.filter(booking => {
        const bookingDate = new Date(booking.createdAt);
        bookingDate.setHours(0, 0, 0, 0);
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        
        return bookingDate >= start && bookingDate <= end && booking.status !== 'cancelled';
      });

      // Group bookings by date
      const dailyData = new Map();
      
      // Initialize all dates in range with zero values
      for (let i = 0; i < days; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        const dateKey = date.toISOString().split('T')[0];
        
        dailyData.set(dateKey, {
          date: dateKey,
          dateFormatted: date.toLocaleDateString('en-IN', { 
            day: '2-digit', 
            month: 'short',
            weekday: days <= 7 ? 'short' : undefined 
          }).replace(',', ''),
          revenue: 0,
          bookings: 0,
          avgBookingValue: 0,
          bookingsList: []
        });
      }

      // Process each booking and add to appropriate date
      for (const booking of filteredBookings) {
        const bookingDate = new Date(booking.createdAt);
        const dateKey = bookingDate.toISOString().split('T')[0];
        
        if (dailyData.has(dateKey)) {
          const dayData = dailyData.get(dateKey);
          
          // ✅ FIXED: Use helper function for async calculation
          const bookingRevenue = await calculateBookingRevenue(booking);
          console.log(`Advanced pricing for ${booking.bookingId}: ₹${bookingRevenue}`);

          dayData.revenue += bookingRevenue;
          dayData.bookings += 1;
          dayData.bookingsList.push(booking);
        }
      }

      // Calculate average booking values and add comparison data if needed
      const chartDataArray = [];
      
      for (const dayData of dailyData.values()) {
        dayData.avgBookingValue = dayData.bookings > 0 ? Math.round(dayData.revenue / dayData.bookings) : 0;
        
        // Add comparison data if requested
        if (showComparison) {
          // For comparison, look at the same day in the previous period
          const comparisonDate = new Date(dayData.date);
          comparisonDate.setDate(comparisonDate.getDate() - days);
          
          const comparisonBookings = bookingsData.bookings.filter(booking => {
            const bookingDate = new Date(booking.createdAt);
            return bookingDate.toISOString().split('T')[0] === comparisonDate.toISOString().split('T')[0] && 
                   booking.status !== 'cancelled';
          });

          // ✅ FIXED: Use helper function for comparison revenue calculation
          const comparisonRevenue = await calculateTotalRevenue(comparisonBookings);
          dayData.prevRevenue = Math.round(comparisonRevenue);
          dayData.prevBookings = comparisonBookings.length;
        }
        
        chartDataArray.push(dayData);
      }

      setChartData(chartDataArray);
      
      const totalRevenue = chartDataArray.reduce((sum, day) => sum + day.revenue, 0);
      const totalBookings = chartDataArray.reduce((sum, day) => sum + day.bookings, 0);
      console.log(`✅ Advanced pricing calculation completed:`);
      console.log(`   📊 ${chartDataArray.length} days processed`);
      console.log(`   💰 Total revenue: ₹${totalRevenue.toLocaleString('en-IN')}`);
      console.log(`   📋 Total bookings: ${totalBookings}`);
      console.log(`   🧮 Average per booking: ₹${totalBookings > 0 ? Math.round(totalRevenue/totalBookings) : 0}`);
      
    } catch (error) {
      console.error('Error fetching daily revenue data:', error);
      setChartData([]);
    } finally {
      setLoading(false);
    }
  }, [timeFilter, customDateRange, showComparison]);

  useEffect(() => {
    fetchDailyRevenueData();
  }, [fetchDailyRevenueData]);

  // Export chart data to CSV
  const exportChartData = async () => {
    setExportLoading(true);
    try {
      const csvHeader = showComparison 
        ? 'Date,Revenue,Bookings,Avg Booking Value,Previous Revenue,Previous Bookings\n'
        : 'Date,Revenue,Bookings,Avg Booking Value\n';
      
      const csvData = chartData.map(item => {
        const baseRow = `${item.date},${item.revenue},${item.bookings},${item.avgBookingValue}`;
        return showComparison 
          ? `${baseRow},${item.prevRevenue || 0},${item.prevBookings || 0}`
          : baseRow;
      }).join('\n');
      
      const csvContent = csvHeader + csvData;
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `daily-revenue-${timeFilter}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setExportLoading(false);
    }
  };

  // Handle bar click for drill-down
  const handleBarClick = (data) => {
    if (data && data.date) {
      const confirmDrilldown = confirm(`View detailed bookings for ${data.dateFormatted}?\n\nRevenue: ₹${data.revenue.toLocaleString('en-IN')}\nBookings: ${data.bookings}`);
      if (confirmDrilldown) {
        // Navigate to bookings page with date filter
        window.open(`/admin/bookings?date=${data.date}`, '_blank');
      }
    }
  };

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 shadow-xl">
          <h4 className="text-white font-semibold mb-2">{data.dateFormatted}</h4>
          <div className="space-y-1 text-sm">
            <div className="text-green-400">
              Revenue: ₹{data.revenue.toLocaleString('en-IN')}
            </div>
            <div className="text-blue-400">
              Bookings: {data.bookings}
            </div>
            <div className="text-purple-400">
              Avg Value: ₹{data.avgBookingValue.toLocaleString('en-IN')}
            </div>
            {showComparison && data.prevRevenue && (
              <>
                <hr className="border-gray-600 my-2" />
                <div className="text-gray-400">Previous Period:</div>
                <div className="text-green-300">
                  Revenue: ₹{data.prevRevenue.toLocaleString('en-IN')}
                </div>
                <div className="text-blue-300">
                  Bookings: {data.prevBookings}
                </div>
              </>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  const chartTheme = {
    cartesianGrid: { stroke: '#374151', strokeDasharray: '3 3' },
    xAxis: { stroke: '#9CA3AF', fontSize: 12 },
    yAxis: { stroke: '#9CA3AF', fontSize: 12 }
  };

  return (
    <ThemedCard title="📊 Daily Revenue Analysis" description="🧮 Advanced pricing with grace periods, block rates & night charges">
      {/* Filter Controls */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <ThemedSelect
          label="Time Period"
          value={timeFilter}
          onValueChange={setTimeFilter}
          options={[
            { value: '7days', label: 'Last 7 Days' },
            { value: '30days', label: 'Last 30 Days' },
            { value: '90days', label: 'Last 3 Months' },
            { value: 'custom', label: 'Custom Range' }
          ]}
        />

        <ThemedSelect
          label="Chart Type"
          value={chartType}
          onValueChange={setChartType}
          options={[
            { value: 'bar', label: '📊 Bar Chart' },
            { value: 'line', label: '📈 Line Chart' },
            { value: 'composed', label: '📋 Combined' }
          ]}
        />

        {/* Custom Date Range */}
        {timeFilter === 'custom' && (
          <>
            <ThemedInput
              label="Start Date"
              type="date"
              value={customDateRange.start}
              onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
            />
            <ThemedInput
              label="End Date"
              type="date"
              value={customDateRange.end}
              onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
            />
          </>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          <ThemedButton
            variant="secondary"
            onClick={() => setShowComparison(!showComparison)}
            className="text-xs"
          >
            {showComparison ? '🔀 Hide Comparison' : '🔀 Compare Periods'}
          </ThemedButton>
          <ThemedButton
            variant="primary"
            onClick={exportChartData}
            disabled={exportLoading || chartData.length === 0}
            className="text-xs"
          >
            {exportLoading ? '⏳ Exporting...' : '📥 Export CSV'}
          </ThemedButton>
        </div>
      </div>

      {/* Chart Display */}
      {loading ? (
        <div className="h-96 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto mb-4"></div>
            <div className="text-gray-400">🧮 Calculating advanced pricing...</div>
            <div className="text-gray-500 text-sm mt-2">Processing bookings with grace periods, block rates & night charges</div>
          </div>
        </div>
      ) : chartData.length === 0 ? (
        <div className="h-96 flex items-center justify-center">
          <div className="text-center text-gray-400">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-lg font-medium mb-2">No Revenue Data</h3>
            <p className="text-sm">Daily revenue data will appear here once you have bookings</p>
          </div>
        </div>
      ) : (
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'bar' ? (
              <BarChart data={chartData} onClick={handleBarClick}>
                <CartesianGrid {...chartTheme.cartesianGrid} />
                <XAxis dataKey="dateFormatted" {...chartTheme.xAxis} />
                <YAxis {...chartTheme.yAxis} />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="revenue" 
                  fill="#10B981" 
                  radius={[4, 4, 0, 0]}
                  cursor="pointer"
                />
                {showComparison && (
                  <Bar 
                    dataKey="prevRevenue" 
                    fill="#6B7280" 
                    radius={[4, 4, 0, 0]}
                    opacity={0.6}
                  />
                )}
              </BarChart>
            ) : chartType === 'line' ? (
              <LineChart data={chartData}>
                <CartesianGrid {...chartTheme.cartesianGrid} />
                <XAxis dataKey="dateFormatted" {...chartTheme.xAxis} />
                <YAxis {...chartTheme.yAxis} />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#10B981" 
                  strokeWidth={3}
                  dot={{ fill: '#10B981', strokeWidth: 2, r: 6 }}
                />
                {showComparison && (
                  <Line 
                    type="monotone" 
                    dataKey="prevRevenue" 
                    stroke="#6B7280" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ fill: '#6B7280', strokeWidth: 2, r: 4 }}
                  />
                )}
              </LineChart>
            ) : (
              <ComposedChart data={chartData}>
                <CartesianGrid {...chartTheme.cartesianGrid} />
                <XAxis dataKey="dateFormatted" {...chartTheme.xAxis} />
                <YAxis yAxisId="revenue" {...chartTheme.yAxis} />
                <YAxis yAxisId="bookings" orientation="right" {...chartTheme.yAxis} />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  yAxisId="revenue"
                  dataKey="revenue" 
                  fill="#10B981" 
                  radius={[4, 4, 0, 0]}
                />
                <Line 
                  yAxisId="bookings"
                  type="monotone" 
                  dataKey="bookings" 
                  stroke="#06B6D4" 
                  strokeWidth={3}
                  dot={{ fill: '#06B6D4', strokeWidth: 2, r: 6 }}
                />
              </ComposedChart>
            )}
          </ResponsiveContainer>
        </div>
      )}

      {/* Summary Stats */}
      {chartData.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-white">Period Summary</h4>
            <div className="text-xs text-cyan-400 bg-cyan-400/10 px-2 py-1 rounded">
              🧮 Advanced Pricing
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">
                ₹{chartData.reduce((sum, item) => sum + item.revenue, 0).toLocaleString('en-IN')}
              </div>
              <div className="text-sm text-gray-400">Total Revenue</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">
                {chartData.reduce((sum, item) => sum + item.bookings, 0)}
              </div>
              <div className="text-sm text-gray-400">Total Bookings</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">
                ₹{Math.round(
                  chartData.reduce((sum, item) => sum + item.revenue, 0) / 
                  chartData.reduce((sum, item) => sum + item.bookings, 0)
                ).toLocaleString('en-IN')}
              </div>
              <div className="text-sm text-gray-400">Avg per Booking</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-400">
                ₹{Math.round(
                  chartData.reduce((sum, item) => sum + item.revenue, 0) / chartData.length
                ).toLocaleString('en-IN')}
              </div>
              <div className="text-sm text-gray-400">Daily Average</div>
            </div>
          </div>
        </div>
      )}
    </ThemedCard>
  );
}

// ✅ FIXED: Daily Revenue Summary Stats Component
function DailyRevenueSummary() {
  const [summaryData, setSummaryData] = useState({
    todayRevenue: 0,
    weekRevenue: 0,
    monthRevenue: 0,
    peakDay: null,
    averageDailyRevenue: 0,
    revenueGrowth: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummaryData = async () => {
      if (loading) return; // ✅ FIXED: Prevent multiple simultaneous calls
      
      try {
        console.log('🧮 Calculating revenue summary using advanced pricing...');
        
        // Get real bookings data
        const bookingsResponse = await fetch('/api/bookings');
        const bookingsData = await bookingsResponse.json();
        
        if (!bookingsData.success || !bookingsData.bookings) {
          console.error('Failed to fetch bookings for summary');
          setLoading(false);
          return;
        }

        const now = new Date();
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 7);
        
        const monthAgo = new Date(today);
        monthAgo.setDate(today.getDate() - 30);
        
        const twoMonthsAgo = new Date(today);
        twoMonthsAgo.setDate(today.getDate() - 60);

        // Filter out cancelled bookings
        const validBookings = bookingsData.bookings.filter(booking => booking.status !== 'cancelled');

        // Calculate today's revenue using helper function
        const todayBookings = validBookings.filter(booking => {
          const bookingDate = new Date(booking.createdAt);
          return bookingDate >= today && bookingDate < tomorrow;
        });
        const todayRevenue = await calculateTotalRevenue(todayBookings);

        // Calculate week revenue using helper function
        const weekBookings = validBookings.filter(booking => {
          const bookingDate = new Date(booking.createdAt);
          return bookingDate >= weekAgo && bookingDate <= now;
        });
        const weekRevenue = await calculateTotalRevenue(weekBookings);

        // Calculate month revenue using helper function
        const monthBookings = validBookings.filter(booking => {
          const bookingDate = new Date(booking.createdAt);
          return bookingDate >= monthAgo && bookingDate <= now;
        });
        const monthRevenue = await calculateTotalRevenue(monthBookings);

        // Calculate previous month revenue for growth calculation
        const prevMonthBookings = validBookings.filter(booking => {
          const bookingDate = new Date(booking.createdAt);
          return bookingDate >= twoMonthsAgo && bookingDate < monthAgo;
        });
        const prevMonthRevenue = await calculateTotalRevenue(prevMonthBookings);

        // Calculate growth rate
        const revenueGrowth = prevMonthRevenue > 0 ? 
          ((monthRevenue - prevMonthRevenue) / prevMonthRevenue * 100) : 0;

        // Find peak day in the last 30 days
        const dailyRevenue = new Map();
        
        for (const booking of monthBookings) {
          const date = new Date(booking.createdAt).toISOString().split('T')[0];
          const bookingRevenue = await calculateBookingRevenue(booking);
          dailyRevenue.set(date, (dailyRevenue.get(date) || 0) + bookingRevenue);
        }

        let peakDay = null;
        let maxRevenue = 0;
        for (const [date, revenue] of dailyRevenue.entries()) {
          if (revenue > maxRevenue) {
            maxRevenue = revenue;
            peakDay = { date, revenue: Math.round(revenue) };
          }
        }

        // Calculate average daily revenue
        const averageDailyRevenue = dailyRevenue.size > 0 ? 
          Math.round(monthRevenue / Math.min(30, dailyRevenue.size)) : 0;

        setSummaryData({
          todayRevenue: Math.round(todayRevenue),
          weekRevenue: Math.round(weekRevenue),
          monthRevenue: Math.round(monthRevenue),
          peakDay,
          averageDailyRevenue,
          revenueGrowth: Math.round(revenueGrowth * 10) / 10
        });

        console.log(`✅ Advanced pricing summary completed:`);
        console.log(`   📅 Today: ₹${Math.round(todayRevenue).toLocaleString('en-IN')}`);
        console.log(`   📅 Week: ₹${Math.round(weekRevenue).toLocaleString('en-IN')}`);
        console.log(`   📅 Month: ₹${Math.round(monthRevenue).toLocaleString('en-IN')}`);
        console.log(`   📈 Growth: ${Math.round(revenueGrowth * 10) / 10}%`);

      } catch (error) {
        console.error('Error fetching summary data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSummaryData();
  }, []);

  if (loading) {
    return (
      <ThemedCard title="📈 Revenue Summary" description="Key performance indicators">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-700 rounded mb-2"></div>
              <div className="h-8 bg-gray-600 rounded"></div>
            </div>
          ))}
        </div>
      </ThemedCard>
    );
  }

  return (
    <ThemedCard title="📈 Revenue Summary" description="🧮 Advanced pricing calculations with real-time updates">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
        <div className="text-center p-4 rounded-lg bg-green-900/20 border border-green-700/30">
          <div className="text-2xl font-bold text-green-400 mb-1">
            ₹{summaryData.todayRevenue.toLocaleString('en-IN')}
          </div>
          <div className="text-green-200 text-sm">Today's Revenue</div>
          <div className="text-xs text-green-300 mt-1">Live Updates</div>
        </div>

        <div className="text-center p-4 rounded-lg bg-blue-900/20 border border-blue-700/30">
          <div className="text-2xl font-bold text-blue-400 mb-1">
            ₹{summaryData.weekRevenue.toLocaleString('en-IN')}
          </div>
          <div className="text-blue-200 text-sm">This Week</div>
          <div className="text-xs text-blue-300 mt-1">7-day total</div>
        </div>

        <div className="text-center p-4 rounded-lg bg-purple-900/20 border border-purple-700/30">
          <div className="text-2xl font-bold text-purple-400 mb-1">
            ₹{summaryData.monthRevenue.toLocaleString('en-IN')}
          </div>
          <div className="text-purple-200 text-sm">This Month</div>
          <div className="text-xs text-purple-300 mt-1">30-day total</div>
        </div>

        <div className="text-center p-4 rounded-lg bg-orange-900/20 border border-orange-700/30">
          <div className="text-2xl font-bold text-orange-400 mb-1">
            ₹{summaryData.peakDay?.revenue.toLocaleString('en-IN') || '0'}
          </div>
          <div className="text-orange-200 text-sm">Peak Day</div>
          <div className="text-xs text-orange-300 mt-1">
            {summaryData.peakDay?.date && new Date(summaryData.peakDay.date).toLocaleDateString('en-IN')}
          </div>
        </div>

        <div className="text-center p-4 rounded-lg bg-cyan-900/20 border border-cyan-700/30">
          <div className="text-2xl font-bold text-cyan-400 mb-1">
            ₹{summaryData.averageDailyRevenue.toLocaleString('en-IN')}
          </div>
          <div className="text-cyan-200 text-sm">Daily Average</div>
          <div className="text-xs text-cyan-300 mt-1">30-day avg</div>
        </div>

        <div className="text-center p-4 rounded-lg bg-emerald-900/20 border border-emerald-700/30">
          <div className="text-2xl font-bold text-emerald-400 mb-1 flex items-center justify-center">
            {summaryData.revenueGrowth >= 0 ? '📈' : '📉'}
            {Math.abs(summaryData.revenueGrowth)}%
          </div>
          <div className="text-emerald-200 text-sm">Growth Rate</div>
          <div className="text-xs text-emerald-300 mt-1">vs last month</div>
        </div>
      </div>
    </ThemedCard>
  );
}

// Enhanced Animated Counter Component
function EnhancedAnimatedCounter({ value, duration = 1000, prefix = '', suffix = '', previousValue }) {
  const [displayValue, setDisplayValue] = useState(previousValue || 0);

  useEffect(() => {
    const startTime = Date.now();
    const startValue = displayValue;
    const difference = value - startValue;

    const updateCounter = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Smooth easing function
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentValue = Math.floor(startValue + (difference * easeOutQuart));
      
      setDisplayValue(currentValue);
      
      if (progress < 1) {
        requestAnimationFrame(updateCounter);
      }
    };

    updateCounter();
  }, [value, duration]);

  return (
    <span className="font-bold">
      {prefix}{displayValue.toLocaleString('en-IN')}{suffix}
    </span>
  );
}

// Enhanced Stats Card with Live Features
function LiveStatsCard({ 
  title, 
  value, 
  previousValue, 
  subtitle, 
  icon, 
  colorScheme = 'primary',
  showComparison = true,
  progress
}) {
  const change = previousValue !== undefined ? value - previousValue : 0;
  const changePercent = previousValue > 0 ? (change / previousValue * 100) : 0;
  const isPositive = change >= 0;

  return (
    <div className={cn(
      "relative overflow-hidden rounded-xl border border-gray-700/50",
      "bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm",
      "hover:border-gray-600/50 transition-all duration-300",
      "hover:scale-105 hover:shadow-xl p-6"
    )}>
      {/* Live indicator */}
      <div className="absolute top-4 right-4">
        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
      </div>

      <div className="flex items-start justify-between mb-4">
        <div className="text-4xl mb-2">{icon}</div>
        {progress !== undefined && (
          <div className="w-16 h-16">
            <svg className="w-16 h-16 transform -rotate-90">
              <circle
                cx="32" cy="32" r="28"
                stroke="#374151" strokeWidth="4" fill="none"
              />
              <circle
                cx="32" cy="32" r="28"
                stroke="#06B6D4" strokeWidth="4" fill="none"
                strokeDasharray={`${2 * Math.PI * 28}`}
                strokeDashoffset={`${2 * Math.PI * 28 * (1 - progress / 100)}`}
                strokeLinecap="round"
                className="transition-all duration-1000"
                style={{ filter: 'drop-shadow(0 0 6px #06B6D440)' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-white text-sm font-bold">
                {Math.round(progress)}%
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <h3 className="text-gray-400 text-sm font-medium">{title}</h3>
        
        <div className="text-3xl font-bold text-white">
          <EnhancedAnimatedCounter 
            value={value} 
            prefix={title.includes('Revenue') ? '₹' : title.includes('Rate') ? '' : ''}
            suffix={title.includes('Rate') ? '%' : ''}
            previousValue={previousValue}
            duration={1500}
          />
        </div>

        <p className="text-gray-400 text-sm">{subtitle}</p>

        {showComparison && previousValue !== undefined && (
          <div className="flex items-center space-x-2 pt-2">
            <div className={cn(
              "flex items-center text-sm font-medium",
              isPositive ? "text-green-400" : "text-red-400"
            )}>
              <svg 
                className={cn(
                  "w-4 h-4 mr-1",
                  isPositive ? "rotate-0" : "rotate-180"
                )} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 14l9-9 3 3L9 18l-4-4z" />
              </svg>
              {Math.abs(changePercent).toFixed(1)}%
            </div>
            <span className="text-gray-500 text-sm">vs yesterday</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Fleet Status Grid - Fixed for real data
function FleetStatusGrid({ vehicles }) {
  if (!vehicles || vehicles.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8">
        <div className="text-4xl mb-4">🚗</div>
        <p className="text-lg font-medium mb-2">No Vehicle Data</p>
        <p className="text-sm">Fleet information will appear here when vehicles are added</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Vehicle Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {vehicles.map((vehicle, index) => (
          <div
            key={vehicle._id || vehicle.id || index}
            className={cn(
              "p-3 rounded-lg border transition-all duration-300 hover:scale-105",
              vehicle.status === 'available' && "border-green-500/50 bg-green-500/10",
              vehicle.status === 'rented' && "border-orange-500/50 bg-orange-500/10", 
              vehicle.status === 'maintenance' && "border-red-500/50 bg-red-500/10"
            )}
          >
            {/* Status indicator */}
            <div className="flex justify-between items-start mb-2">
              <div className="text-lg">
                {vehicle.type === 'bike' ? '🏍️' : '🛵'}
              </div>
              <div 
                className={cn(
                  "w-3 h-3 rounded-full",
                  vehicle.status === 'available' && "bg-green-400 animate-pulse",
                  vehicle.status === 'rented' && "bg-orange-400 animate-pulse",
                  vehicle.status === 'maintenance' && "bg-red-400"
                )}
              />
            </div>

            <div className="space-y-1">
              <div className="text-sm font-semibold text-white truncate">
                {vehicle.model}
              </div>
              <div className="text-xs text-gray-400 font-mono">
                {vehicle.plateNumber}
              </div>
              <div className={cn(
                "text-xs px-2 py-1 rounded-full font-medium text-center",
                vehicle.status === 'available' && "text-green-400 bg-green-500/20",
                vehicle.status === 'rented' && "text-orange-400 bg-orange-500/20",
                vehicle.status === 'maintenance' && "text-red-400 bg-red-500/20"
              )}>
                {vehicle.status.charAt(0).toUpperCase() + vehicle.status.slice(1)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Week 2: Top Loyal Customers Component  
function TopLoyalCustomers({ customers }) {
  if (!customers || customers.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8">
        <div className="text-4xl mb-3">👥</div>
        <h4 className="text-lg font-semibold mb-2">No Loyal Customers Yet</h4>
        <p className="text-sm">Customer loyalty data will appear here once you have repeat customers</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {customers.slice(0, 5).map((customer, index) => (
        <div 
          key={customer.customerId}
          className="flex items-center justify-between p-4 rounded-lg bg-gray-800/30 border border-gray-700/50 hover:border-gray-600/50 transition-all"
        >
          <div className="flex items-center space-x-4">
            {/* Ranking Badge */}
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
              index === 0 && "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30", // Gold
              index === 1 && "bg-gray-400/20 text-gray-300 border border-gray-400/30", // Silver  
              index === 2 && "bg-orange-500/20 text-orange-400 border border-orange-500/30", // Bronze
              index > 2 && "bg-blue-500/20 text-blue-400 border border-blue-500/30" // Regular
            )}>
              {index === 0 ? '🏆' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
            </div>

            {/* Customer Info */}
            <div>
              <div className="font-semibold text-white">{customer.customerName}</div>
              <div className="text-sm text-gray-400">{customer.customerPhone}</div>
            </div>
          </div>

          {/* Stats */}
          <div className="text-right">
            <div className="text-lg font-bold text-cyan-400">
              {customer.totalBookings} bookings
            </div>
            <div className="text-sm text-gray-400">
              ₹{customer.totalRevenue.toLocaleString('en-IN')} total
            </div>
            <div className="text-xs text-green-400">
              {customer.bookingFrequency.toFixed(1)}/month
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Week 2: Customer Reliability Component
function CustomerReliabilitySection({ customers }) {
  if (!customers || customers.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8">
        <div className="text-4xl mb-3">⭐</div>
        <h4 className="text-lg font-semibold mb-2">No Reliability Data</h4>
        <p className="text-sm">Customer reliability scores will appear here once you have completed bookings</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {customers.slice(0, 5).map((customer) => (
        <div 
          key={customer.customerId}
          className="flex items-center justify-between p-4 rounded-lg bg-gray-800/30 border border-gray-700/50"
        >
          <div className="flex items-center space-x-4">
            {/* Reliability Score Circle */}
            <div className="relative w-12 h-12">
              <svg className="w-12 h-12 transform -rotate-90">
                <circle
                  cx="24" cy="24" r="20"
                  stroke="#374151" strokeWidth="3" fill="none"
                />
                <circle
                  cx="24" cy="24" r="20"
                  stroke={customer.reliabilityScore >= 95 ? "#10B981" : 
                         customer.reliabilityScore >= 80 ? "#F59E0B" : "#EF4444"}
                  strokeWidth="3" fill="none"
                  strokeDasharray={`${2 * Math.PI * 20}`}
                  strokeDashoffset={`${2 * Math.PI * 20 * (1 - customer.reliabilityScore / 100)}`}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white text-xs font-bold">
                  {customer.reliabilityScore}%
                </span>
              </div>
            </div>

            {/* Customer Info */}
            <div>
              <div className="font-semibold text-white">{customer.customerName}</div>
              <div className="text-sm text-gray-400">
                {customer.onTimeBookings}/{customer.totalBookings} on-time returns
              </div>
              {customer.averageLateDuration > 0 && (
                <div className="text-xs text-red-400">
                  Avg {customer.averageLateDuration}min late
                </div>
              )}
            </div>
          </div>

          {/* Reliability Badge */}
          <div className={cn(
            "px-3 py-1 rounded-full text-sm font-medium",
            customer.reliabilityScore >= 95 && "bg-green-500/20 text-green-400",
            customer.reliabilityScore >= 80 && customer.reliabilityScore < 95 && "bg-yellow-500/20 text-yellow-400",
            customer.reliabilityScore < 80 && "bg-red-500/20 text-red-400"
          )}>
            {customer.reliabilityScore >= 95 ? "Excellent" :
             customer.reliabilityScore >= 80 ? "Good" : "Needs Attention"}
          </div>
        </div>
      ))}
    </div>
  );
}

// Week 2: Enhanced Live Activity Feed with Milestones
function EnhancedLiveActivityFeed({ activities, milestones }) {
  const allActivities = [
    ...(milestones || []).map(m => ({
      id: `milestone-${m.customerId}`,
      type: 'milestone',
      message: `🎉 ${m.customerName} achieved: ${m.milestones?.map(ml => ml.milestone).join(', ') || 'New milestone'}`,
      time: new Date(),
      status: 'milestone'
    })),
    ...(activities || [])
  ].sort((a, b) => new Date(b.time) - new Date(a.time));

  return (
    <div className="space-y-3 max-h-80 overflow-y-auto">
      {allActivities && allActivities.length > 0 ? (
        allActivities.slice(0, 8).map((activity, index) => (
          <div 
            key={activity.id || index}
            className={cn(
              "flex items-start space-x-3 p-3 rounded-lg border",
              activity.type === 'milestone' 
                ? "bg-purple-900/20 border-purple-700/50" 
                : "bg-gray-800/30 border-gray-700/50"
            )}
          >
            <div className={cn(
              "w-2 h-2 rounded-full mt-2",
              activity.type === 'milestone' ? "bg-purple-400 animate-pulse" : "bg-cyan-400 animate-pulse"
            )} />
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm">
                {activity.message}
              </p>
              <p className="text-gray-400 text-xs mt-1">
                {new Date(activity.time).toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
            <div className={cn(
              "px-2 py-1 rounded-full text-xs font-medium",
              activity.type === 'milestone' && "text-purple-400 bg-purple-500/20",
              activity.status === 'active' && "text-orange-400 bg-orange-500/20",
              activity.status === 'completed' && "text-green-400 bg-green-500/20"
            )}>
              {activity.type === 'milestone' ? '🎯' : activity.status}
            </div>
          </div>
        ))
      ) : (
        <div className="text-center text-gray-400 py-4">
          <div className="text-xl mb-2">📊</div>
          <p className="text-sm">No recent activity</p>
        </div>
      )}
    </div>
  );
}

export default function EnhancedAdminDashboard() {
  // Enhanced state management with customer intelligence
  const [dashboardData, setDashboardData] = useState({
    todayStats: { revenue: 0, bookings: 0, activeRentals: 0, vehiclesOut: 0 },
    yesterdayStats: { revenue: 0, bookings: 0, activeRentals: 0, vehiclesOut: 0 },
    recentBookings: [],
    revenueChart: [],
    vehicleUtilization: [],
    fleetHeatmap: [],
    hourlyRevenue: [],
    recentActivity: [],
    monthlyStats: { totalRevenue: 0, totalBookings: 0, avgPerBooking: 0, topVehicle: '' },
    // Week 2: Customer Intelligence Data
    topLoyalCustomers: [],
    topReliableCustomers: [],
    recentMilestones: [],
    milestoneAlerts: [],
    customerSummary: { totalCustomersWithBookings: 0, averageReliability: 0, averageBookingsPerCustomer: 0 }
  });

  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('week');
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [isLive, setIsLive] = useState(true);
  const [calculatingRevenue, setCalculatingRevenue] = useState(false);

  // ✅ FIXED: Ref to store latest fetch function for interval
  const fetchDataRef = useRef();

  // ✅ FIXED: Calculate advanced revenue function (not useCallback to avoid dependency issues)
  const calculateAdvancedRevenue = async () => {
    try {
      setCalculatingRevenue(true);
      
      // Get all bookings
      const response = await fetch('/api/bookings');
      const data = await response.json();
      if (!data.success) return null;
  
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
  
      // Filter bookings by date and exclude cancelled bookings
      const todayBookings = data.bookings.filter(booking => {
        const bookingDate = new Date(booking.createdAt);
        return bookingDate >= today && bookingDate < tomorrow && booking.status !== 'cancelled';
      });
  
      const yesterdayBookings = data.bookings.filter(booking => {
        const bookingDate = new Date(booking.createdAt);
        return bookingDate >= yesterday && bookingDate < today && booking.status !== 'cancelled';
      });
  
      // Calculate advanced pricing using helper functions
      const todayAdvancedRevenue = await calculateTotalRevenue(todayBookings);
      const yesterdayAdvancedRevenue = await calculateTotalRevenue(yesterdayBookings);

      return {
        todayAdvancedRevenue,
        yesterdayAdvancedRevenue,
        todayBookingsCount: todayBookings.length,
        yesterdayBookingsCount: yesterdayBookings.length
      };
  
    } catch (error) {
      console.error('Error calculating advanced revenue:', error);
      return null;
    } finally {
      setCalculatingRevenue(false);
    }
  };

  // Enhanced data fetching with customer intelligence
  const fetchEnhancedDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Calculate advanced revenue first
      const advancedRevenueData = await calculateAdvancedRevenue();
      
      // Enhanced API calls including customer intelligence
      const [realTimeRes, hourlyRes, fleetRes, customerInsightsRes, milestonesRes] = await Promise.all([
        fetch('/api/analytics/real-time-stats').catch(() => null),
        fetch('/api/analytics/hourly-revenue').catch(() => null),
        fetch('/api/analytics/fleet-heatmap').catch(() => null),
        fetch('/api/analytics/customer-insights').catch(() => null),
        fetch('/api/analytics/customer-milestones').catch(() => null)
      ]);

      // Start with empty base data
      let newData = {
        todayStats: { revenue: 0, bookings: 0, activeRentals: 0, vehiclesOut: 0 },
        yesterdayStats: { revenue: 0, bookings: 0, activeRentals: 0, vehiclesOut: 0 },
        recentBookings: [],
        revenueChart: [],
        vehicleUtilization: [],
        fleetHeatmap: [],
        hourlyRevenue: [],
        recentActivity: [],
        monthlyStats: { totalRevenue: 0, totalBookings: 0, avgPerBooking: 0, topVehicle: '' },
        topLoyalCustomers: [],
        topReliableCustomers: [],
        recentMilestones: [],
        milestoneAlerts: [],
        customerSummary: { totalCustomersWithBookings: 0, averageReliability: 0, averageBookingsPerCustomer: 0 }
      };

      // Use advanced revenue if calculated successfully
      if (advancedRevenueData) {
        newData.todayStats.revenue = advancedRevenueData.todayAdvancedRevenue;
        newData.todayStats.bookings = advancedRevenueData.todayBookingsCount;
        newData.yesterdayStats.revenue = advancedRevenueData.yesterdayAdvancedRevenue;
        newData.yesterdayStats.bookings = advancedRevenueData.yesterdayBookingsCount;
      }

      // Handle real-time stats
      if (realTimeRes?.ok) {
        const realTimeData = await realTimeRes.json();
        if (realTimeData.success) {
          if (!advancedRevenueData) {
            newData.todayStats = {
              revenue: realTimeData.data.todayRevenue,
              bookings: realTimeData.data.todayBookings,
              activeRentals: realTimeData.data.activeBookings,
              vehiclesOut: realTimeData.data.rentedVehicles
            };
            newData.yesterdayStats = {
              revenue: realTimeData.data.yesterdayRevenue,
              bookings: realTimeData.data.yesterdayBookings,
              activeRentals: 0,
              vehiclesOut: 0
            };
          } else {
            newData.todayStats.activeRentals = realTimeData.data.activeBookings;
            newData.todayStats.vehiclesOut = realTimeData.data.rentedVehicles;
          }
          newData.recentActivity = realTimeData.data.recentActivity || [];
        }
      } else {
        // Fallback to existing APIs
        const [statsRes, bookingsRes, revenueRes] = await Promise.all([
          fetch('/api/admin/stats').catch(() => fetch('/api/stats')),
          fetch('/api/admin/recent-bookings').catch(() => null),
          fetch(`/api/admin/revenue-chart?range=${timeRange}`).catch(() => null)
        ]);

        if (statsRes?.ok) {
          const stats = await statsRes.json();
          if (stats.success) {
            if (!advancedRevenueData) {
              newData.todayStats = stats.todayStats || stats.stats || {};
            } else {
              const basicStats = stats.todayStats || stats.stats || {};
              newData.todayStats.activeRentals = basicStats.activeBookings || 0;
              newData.todayStats.vehiclesOut = basicStats.activeBookings || 0;
            }
            newData.vehicleUtilization = stats.vehicleUtilization || [];
            newData.monthlyStats = stats.monthlyStats || {};
          }
        }

        if (bookingsRes?.ok) {
          const bookings = await bookingsRes.json();
          if (bookings.success) {
            newData.recentBookings = bookings.bookings || [];
          }
        }

        if (revenueRes?.ok) {
          const revenue = await revenueRes.json();
          if (revenue.success) {
            newData.revenueChart = revenue.chartData || [];
          }
        }
      }

      // Handle hourly revenue data
      if (hourlyRes?.ok) {
        const hourlyData = await hourlyRes.json();
        if (hourlyData.success) {
          newData.hourlyRevenue = hourlyData.data.hourlyRevenue || [];
        }
      }

      // Handle fleet heatmap data
      if (fleetRes?.ok) {
        const fleetData = await fleetRes.json();
        if (fleetData.success) {
          newData.fleetHeatmap = fleetData.data.heatmapData || [];
        }
      } else {
        // Fallback: get vehicles directly from existing API
        try {
          const vehiclesRes = await fetch('/api/vehicles');
          if (vehiclesRes.ok) {
            const vehiclesData = await vehiclesRes.json();
            if (vehiclesData.success && vehiclesData.vehicles) {
              newData.fleetHeatmap = vehiclesData.vehicles.map(vehicle => ({
                _id: vehicle._id,
                id: vehicle._id,
                model: vehicle.model,
                plateNumber: vehicle.plateNumber,
                type: vehicle.type,
                status: vehicle.status
              }));
            }
          }
        } catch (err) {
          console.log('Vehicle fallback failed:', err);
        }
      }

      // Handle customer intelligence data
      if (customerInsightsRes?.ok) {
        const customerData = await customerInsightsRes.json();
        if (customerData.success) {
          newData.topLoyalCustomers = customerData.data.topLoyalCustomers || [];
          newData.topReliableCustomers = customerData.data.topReliableCustomers || [];
          newData.recentMilestones = customerData.data.recentMilestones || [];
          newData.customerSummary = customerData.data.summary || {};
        }
      }

      if (milestonesRes?.ok) {
        const milestones = await milestonesRes.json();
        if (milestones.success) {
          newData.milestoneAlerts = milestones.data.milestoneAlerts || [];
        }
      }

      setDashboardData(newData);
      setLastRefresh(new Date());
      setIsLive(true);

    } catch (error) {
      console.error('Error fetching enhanced dashboard data:', error);
      setIsLive(false);
    } finally {
      setLoading(false);
    }
  }, [timeRange]); // ✅ FIXED: Removed calculateAdvancedRevenue dependency

  // ✅ FIXED: Store the latest function in ref
  fetchDataRef.current = fetchEnhancedDashboardData;

  useEffect(() => {
    fetchEnhancedDashboardData();
  }, [fetchEnhancedDashboardData]);

  // ✅ FIXED: Separate useEffect for interval using ref to prevent stale closures
  useEffect(() => {
    const interval = setInterval(() => {
      fetchDataRef.current?.();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []); // ✅ Empty dependency array - interval will use the latest function via ref

  // Mock data fallback for demonstration
  const mockRevenueData = [
    { date: 'Mon', revenue: 2400, bookings: 8 },
    { date: 'Tue', revenue: 1600, bookings: 6 },
    { date: 'Wed', revenue: 3200, bookings: 12 },
    { date: 'Thu', revenue: 2800, bookings: 10 },
    { date: 'Fri', revenue: 4000, bookings: 15 },
    { date: 'Sat', revenue: 3600, bookings: 14 },
    { date: 'Sun', revenue: 3000, bookings: 11 }
  ];

  const pieColors = ['#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

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

  if (loading) {
    return (
      <ThemedLayout>
        <div className="min-h-screen flex items-center justify-center">
          <ThemedCard>
            <div className="flex items-center space-x-3 p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
              <span className="text-white text-xl">Loading enhanced dashboard...</span>
            </div>
          </ThemedCard>
        </div>
      </ThemedLayout>
    );
  }

  const utilizationRate = dashboardData.todayStats.vehiclesOut && dashboardData.fleetHeatmap?.length > 0
    ? (dashboardData.todayStats.vehiclesOut / dashboardData.fleetHeatmap.length * 100)
    : 0;

  return (
    <ThemedLayout>
      <div className="container mx-auto px-6 py-8">
        {/* Enhanced Hero Section */}
        <div className="text-center mb-8">
          <h2 className={theme.typography.hero}>
            Admin <span className={theme.typography.gradient}>Dashboard</span>
          </h2>
          <p className={`${theme.typography.subtitle} max-w-2xl mx-auto mt-4`}>
            Real-time business analytics with advanced pricing calculations
          </p>
          
          {/* Enhanced Live Indicator */}
          <div className="flex items-center justify-center mt-4 space-x-4">
            <div className="flex items-center space-x-2">
              <div className={cn(
                "w-2 h-2 rounded-full",
                isLive ? "bg-green-400 animate-pulse" : "bg-red-400"
              )}></div>
              <span className={cn(
                "text-sm font-medium",
                isLive ? "text-green-400" : "text-red-400"
              )}>
                {isLive ? 'LIVE' : 'OFFLINE'} • Last updated {lastRefresh.toLocaleTimeString('en-IN')}
              </span>
            </div>
            <ThemedButton 
              variant="secondary" 
              onClick={fetchEnhancedDashboardData}
              className="text-xs px-3 py-1"
              disabled={loading || calculatingRevenue}
            >
              {loading || calculatingRevenue ? '⏳' : '🔄'} Refresh
            </ThemedButton>
          </div>
        </div>

        {/* Enhanced Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <LiveStatsCard
            title="Today's Revenue"
            value={calculatingRevenue ? 0 : (dashboardData.todayStats.revenue || 0)}
            previousValue={dashboardData.yesterdayStats.revenue}
            subtitle={calculatingRevenue ? "Calculating advanced pricing..." : "🧮 Advanced pricing"}
            icon="💰"
            showComparison={!calculatingRevenue}
          />
          
          <LiveStatsCard
            title="Active Bookings"
            value={dashboardData.todayStats.activeRentals || 0}
            subtitle="Currently rented out"
            icon="🚴"
            progress={utilizationRate}
          />
          
          <LiveStatsCard
            title="Fleet Utilization"
            value={utilizationRate}
            subtitle="Vehicles in use"
            icon="📊"
            progress={utilizationRate}
          />
          
          <LiveStatsCard
            title="Today's Bookings"
            value={dashboardData.todayStats.bookings || 0}
            previousValue={dashboardData.yesterdayStats.bookings}
            subtitle="New rentals today"
            icon="📋"
            showComparison={true}
          />
        </div>

        {/* Enhanced Chart Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Enhanced Revenue Chart */}
          <div className="lg:col-span-2">
            <ThemedCard title="📈 Revenue Trends" description="Performance over time">
              <div className="mb-4">
                <ThemedSelect
                  value={timeRange}
                  onValueChange={setTimeRange}
                  options={[
                    { value: 'week', label: 'Last 7 Days' },
                    { value: 'month', label: 'Last 30 Days' },
                    { value: 'quarter', label: 'Last 3 Months' }
                  ]}
                />
              </div>
              {/* Enhanced Revenue Chart - Real Data Only */}
              {dashboardData.revenueChart && dashboardData.revenueChart.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dashboardData.revenueChart}>
                      <CartesianGrid {...darkChartTheme.cartesianGrid} />
                      <XAxis dataKey="date" {...darkChartTheme.xAxis} />
                      <YAxis {...darkChartTheme.yAxis} />
                      <Tooltip {...darkChartTheme.tooltip} />
                      <Line 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="#06B6D4" 
                        strokeWidth={3}
                        dot={{ fill: '#06B6D4', strokeWidth: 2, r: 6 }}
                        activeDot={{ r: 8, fill: '#06B6D4' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-80 flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <div className="text-4xl mb-4">📈</div>
                    <h3 className="text-lg font-medium mb-2">No Revenue Data</h3>
                    <p className="text-sm">Revenue trends will appear here once you have completed bookings</p>
                  </div>
                </div>
              )}
            </ThemedCard>
          </div>

          {/* Enhanced Activity Feed with Week 2 Milestones */}
          <div>
            <ThemedCard title="🔴 Live Activity" description="Recent transactions & milestones">
              <EnhancedLiveActivityFeed 
                activities={dashboardData.recentActivity} 
                milestones={dashboardData.recentMilestones}
              />
            </ThemedCard>
          </div>
        </div>

        {/* ✅ NEW: Daily Revenue Analysis Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Daily Revenue Bar Chart */}
          <div className="lg:col-span-2">
            <DailyRevenueBarChart />
          </div>

          {/* Daily Revenue Summary */}
          <div>
            <DailyRevenueSummary />
          </div>
        </div>

        {/* Enhanced Vehicle Performance Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Vehicle Performance - Real Data Only */}
          <ThemedCard title="🚗 Vehicle Performance" description="Top performers this month">
            {dashboardData.vehicleUtilization && dashboardData.vehicleUtilization.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboardData.vehicleUtilization}>
                    <CartesianGrid {...darkChartTheme.cartesianGrid} />
                    <XAxis dataKey="name" {...darkChartTheme.xAxis} />
                    <YAxis {...darkChartTheme.yAxis} />
                    <Tooltip {...darkChartTheme.tooltip} />
                    <Bar dataKey="revenue" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center text-gray-400 py-16">
                <div className="text-4xl mb-4">📊</div>
                <h3 className="text-lg font-medium mb-2">No Performance Data</h3>
                <p className="text-sm">Vehicle performance metrics will appear here once you have completed bookings</p>
              </div>
            )}
          </ThemedCard>

          {/* Enhanced Fleet Status Grid */}
          <ThemedCard title="🎯 Fleet Status Overview" description="Real-time vehicle availability">
            <FleetStatusGrid vehicles={dashboardData.fleetHeatmap} />
            
            {dashboardData.fleetHeatmap && dashboardData.fleetHeatmap.length > 0 && (
              <div className="mt-6 grid grid-cols-3 gap-4">
                <div className="text-center p-3 rounded-lg bg-green-900/20 border border-green-700/30">
                  <div className="text-sm text-green-200 mb-1">Available</div>
                  <div className="text-2xl font-bold text-green-400">
                    {dashboardData.fleetHeatmap.filter(v => v.status === 'available').length}
                  </div>
                </div>
                <div className="text-center p-3 rounded-lg bg-orange-900/20 border border-orange-700/30">
                  <div className="text-sm text-orange-200 mb-1">Rented</div>
                  <div className="text-2xl font-bold text-orange-400">
                    {dashboardData.fleetHeatmap.filter(v => v.status === 'rented').length}
                  </div>
                </div>
                <div className="text-center p-3 rounded-lg bg-red-900/20 border border-red-700/30">
                  <div className="text-sm text-red-200 mb-1">Maintenance</div>
                  <div className="text-2xl font-bold text-red-400">
                    {dashboardData.fleetHeatmap.filter(v => v.status === 'maintenance').length}
                  </div>
                </div>
              </div>
            )}
          </ThemedCard>
        </div>

        {/* Week 2: Customer Intelligence Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Top Loyal Customers */}
          <ThemedCard title="🏆 Most Loyal Customers" description="Your repeat customers ranked by bookings">
            <TopLoyalCustomers customers={dashboardData.topLoyalCustomers} />
          </ThemedCard>

          {/* Customer Reliability */}
          <ThemedCard title="⭐ Most Reliable Customers" description="Customers with best on-time return records">
            <CustomerReliabilitySection customers={dashboardData.topReliableCustomers} />
          </ThemedCard>
        </div>

        {/* Week 2: Customer Summary Stats */}
        {dashboardData.customerSummary && dashboardData.customerSummary.totalCustomersWithBookings > 0 && (
          <ThemedCard title="👥 Customer Overview" className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 rounded-lg bg-cyan-900/20 border border-cyan-700/30">
                <div className="text-2xl font-bold text-cyan-400 mb-2">
                  {dashboardData.customerSummary.totalCustomersWithBookings}
                </div>
                <div className="text-cyan-200 text-sm">Active Customers</div>
              </div>
              
              <div className="text-center p-4 rounded-lg bg-green-900/20 border border-green-700/30">
                <div className="text-2xl font-bold text-green-400 mb-2">
                  {dashboardData.customerSummary.averageReliability}%
                </div>
                <div className="text-green-200 text-sm">Avg Reliability</div>
              </div>
              
              <div className="text-center p-4 rounded-lg bg-purple-900/20 border border-purple-700/30">
                <div className="text-2xl font-bold text-purple-400 mb-2">
                  {dashboardData.customerSummary.averageBookingsPerCustomer}
                </div>
                <div className="text-purple-200 text-sm">Avg Bookings/Customer</div>
              </div>
            </div>
          </ThemedCard>
        )}

        {/* Enhanced Monthly Overview */}
        <ThemedCard title="📊 Monthly Business Overview" className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center p-4 rounded-lg bg-green-900/20 border border-green-700/30">
              <div className="text-2xl font-bold text-green-400 mb-2">
                ₹{(dashboardData.monthlyStats.totalRevenue || 0).toLocaleString('en-IN')}
              </div>
              <div className="text-green-200 text-sm">Total Revenue</div>
            </div>
            
            <div className="text-center p-4 rounded-lg bg-blue-900/20 border border-blue-700/30">
              <div className="text-2xl font-bold text-blue-400 mb-2">
                {dashboardData.monthlyStats.totalBookings || 0}
              </div>
              <div className="text-blue-200 text-sm">Total Bookings</div>
            </div>
            
            <div className="text-center p-4 rounded-lg bg-purple-900/20 border border-purple-700/30">
              <div className="text-2xl font-bold text-purple-400 mb-2">
                ₹{(dashboardData.monthlyStats.avgPerBooking || 0).toLocaleString('en-IN')}
              </div>
              <div className="text-purple-200 text-sm">Avg per Booking</div>
            </div>
            
            <div className="text-center p-4 rounded-lg bg-orange-900/20 border border-orange-700/30">
              <div className="text-2xl font-bold text-orange-400 mb-2">
                {dashboardData.monthlyStats.topVehicle || 'N/A'}
              </div>
              <div className="text-orange-200 text-sm">Top Vehicle</div>
            </div>
          </div>
        </ThemedCard>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <ThemedButton variant="primary" className="w-full py-3" onClick={() => window.location.href = '/booking'}>
            ➕ New Booking
          </ThemedButton>

          <ThemedButton variant="secondary" className="w-full py-3" onClick={() => window.location.href = '/admin/bookings'}>
            📋 All Bookings
          </ThemedButton>
          
          <ThemedButton variant="secondary" className="w-full py-3" onClick={() => window.location.href = '/active-bookings'}>
            🔄 Active Rentals
          </ThemedButton>
          
          <ThemedButton variant="secondary" className="w-full py-3" onClick={() => window.location.href = '/vehicles'}>
            🚗 Manage Fleet
          </ThemedButton>
        </div>
      </div>
    </ThemedLayout>
  );
}