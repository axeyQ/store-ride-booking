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

const calculateBookingRevenue = async (booking) => {
  try {
    // ✅ FIXED: For custom bookings, use fixed package rates instead of finalAmount
    if (booking.isCustomBooking) {
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

      const packageType = booking.customBookingType || 'half_day';
      const packageInfo = CUSTOM_PACKAGES[packageType];
      
      if (packageInfo) {
        console.log(`📦 Custom booking ${booking.bookingId}: ${packageType} = ₹${packageInfo.price} (FIXED RATE)`);
        return packageInfo.price;
      } else {
        console.log(`❌ Unknown custom package type: ${booking.customBookingType}`);
        return 0;
      }
    }
    
    // For advanced pricing bookings, use the complex calculation
    const result = await calculateCurrentAmount(booking);
    return typeof result === 'number' ? result : result.amount;
  } catch (error) {
    console.warn(`Pricing calculation failed for booking ${booking.bookingId}, using fallback:`, error);
    return booking.finalAmount || booking.baseAmount || 0;
  }
};

// ✅ ENHANCED: Helper function to process multiple bookings with async
const calculateTotalRevenue = async (bookings) => {
  let totalRevenue = 0;
  for (const booking of bookings) {
    const revenue = await calculateBookingRevenue(booking);
    totalRevenue += revenue;
  }
  return totalRevenue;
};

const FleetForecastWidget = () => {
  const [forecastData, setForecastData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchForecastData();
    const interval = setInterval(fetchForecastData, 5 * 60 * 1000); // Update every 5 minutes
    return () => clearInterval(interval);
  }, []);

  const fetchForecastData = async () => {
    try {
      const response = await fetch('/api/analytics/fleet-forecast');
      const data = await response.json();
      if (data.success) {
        setForecastData(data.forecast || []);
      }
    } catch (error) {
      console.error('Error fetching forecast:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ThemedCard title="🔮 Fleet Availability Forecast" className="mb-8">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mr-3"></div>
          <span className="text-white">Loading forecast...</span>
        </div>
      </ThemedCard>
    );
  }

  return (
    <ThemedCard title="🔮 Fleet Availability Forecast" className="mb-8">
      <div className="space-y-3">
        {forecastData.length === 0 ? (
          <div className="text-center text-gray-400 py-6">
            <div className="text-3xl mb-2">📊</div>
            <p>No upcoming returns estimated</p>
          </div>
        ) : (
          forecastData.map((slot, index) => (
            <div key={index} className="flex justify-between items-center p-4 bg-blue-900/20 rounded-lg border border-blue-700/30">
              <div>
                <div className="text-blue-200 font-medium">{slot.hour}</div>
                <div className="text-blue-400 text-sm">
                  {slot.expectedReturns} vehicle{slot.expectedReturns !== 1 ? 's' : ''} expected
                </div>
                {slot.vehicles && slot.vehicles.length > 0 && (
                  <div className="text-blue-300 text-xs mt-1">
                    {slot.vehicles.slice(0, 2).join(', ')}
                    {slot.vehicles.length > 2 && ` +${slot.vehicles.length - 2} more`}
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="text-blue-400 font-bold text-lg">+{slot.expectedReturns}</div>
                <div className="text-blue-300 text-xs">available</div>
              </div>
            </div>
          ))
        )}
      </div>
    </ThemedCard>
  );
};

// ✅ ENHANCED: Booking Type Breakdown Component
function BookingTypeBreakdown({ bookings, title = "Booking Type Distribution" }) {
  const [breakdown, setBreakdown] = useState({
    advanced: { count: 0, revenue: 0, percentage: 0 },
    custom: { count: 0, revenue: 0, percentage: 0, packages: { half_day: 0, full_day: 0, night: 0 } }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const calculateBreakdown = async () => {
      if (!bookings || bookings.length === 0) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        let advancedCount = 0, customCount = 0;
        let advancedRevenue = 0, customRevenue = 0;
        const customPackages = { half_day: 0, full_day: 0, night: 0 };

        for (const booking of bookings) {
          if (booking.status === 'cancelled') continue;

          const revenue = await calculateBookingRevenue(booking);
          
          if (booking.isCustomBooking) {
            customCount++;
            customRevenue += revenue;
            if (booking.customBookingType && customPackages[booking.customBookingType] !== undefined) {
              customPackages[booking.customBookingType]++;
            }
          } else {
            advancedCount++;
            advancedRevenue += revenue;
          }
        }

        const totalBookings = advancedCount + customCount;
        const totalRevenue = advancedRevenue + customRevenue;

        setBreakdown({
          advanced: {
            count: advancedCount,
            revenue: Math.round(advancedRevenue),
            percentage: totalBookings > 0 ? Math.round((advancedCount / totalBookings) * 100) : 0
          },
          custom: {
            count: customCount,
            revenue: Math.round(customRevenue),
            percentage: totalBookings > 0 ? Math.round((customCount / totalBookings) * 100) : 0,
            packages: customPackages
          }
        });
      } catch (error) {
        console.error('Error calculating booking breakdown:', error);
      } finally {
        setLoading(false);
      }
    };

    calculateBreakdown();
  }, [bookings]);

  if (loading) {
    return (
      <ThemedCard title={title}>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mr-3"></div>
          <span className="text-white">Calculating breakdown...</span>
        </div>
      </ThemedCard>
    );
  }

  const totalBookings = breakdown.advanced.count + breakdown.custom.count;
  const totalRevenue = breakdown.advanced.revenue + breakdown.custom.revenue;

  if (totalBookings === 0) {
    return (
      <ThemedCard title={title}>
        <div className="text-center py-8 text-gray-400">
          <div className="text-4xl mb-4">📊</div>
          <p className="text-lg">No booking data available</p>
        </div>
      </ThemedCard>
    );
  }

  return (
    <ThemedCard title={title}>
      <div className="space-y-6">
        {/* Revenue Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Advanced Pricing */}
          <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="text-2xl">⚡</div>
                <div>
                  <div className="text-blue-200 font-medium">Advanced Pricing</div>
                  <div className="text-xs text-blue-300">Time-based calculations</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-blue-400">{breakdown.advanced.percentage}%</div>
                <div className="text-xs text-blue-300">{breakdown.advanced.count} bookings</div>
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400 mb-1">
                ₹{breakdown.advanced.revenue.toLocaleString('en-IN')}
              </div>
              <div className="text-xs text-blue-300">
                Avg: ₹{breakdown.advanced.count > 0 ? Math.round(breakdown.advanced.revenue / breakdown.advanced.count).toLocaleString('en-IN') : '0'}
              </div>
            </div>
          </div>

          {/* Custom Packages */}
          <div className="bg-purple-900/20 border border-purple-700/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="text-2xl">📦</div>
                <div>
                  <div className="text-purple-200 font-medium">Custom Packages</div>
                  <div className="text-xs text-purple-300">Fixed flat rates</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-purple-400">{breakdown.custom.percentage}%</div>
                <div className="text-xs text-purple-300">{breakdown.custom.count} bookings</div>
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400 mb-1">
                ₹{breakdown.custom.revenue.toLocaleString('en-IN')}
              </div>
              <div className="text-xs text-purple-300">
                Avg: ₹{breakdown.custom.count > 0 ? Math.round(breakdown.custom.revenue / breakdown.custom.count).toLocaleString('en-IN') : '0'}
              </div>
            </div>
          </div>
        </div>

        {/* Custom Package Breakdown */}
        {breakdown.custom.count > 0 && (
          <div>
            <h4 className="text-sm font-medium text-white mb-3">📦 Custom Package Distribution</h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-gray-800/50 rounded-lg">
                <div className="text-lg mb-1">🌅</div>
                <div className="text-sm font-bold text-white">{breakdown.custom.packages.half_day}</div>
                <div className="text-xs text-gray-400">Half Day</div>
              </div>
              <div className="text-center p-3 bg-gray-800/50 rounded-lg">
                <div className="text-lg mb-1">☀️</div>
                <div className="text-sm font-bold text-white">{breakdown.custom.packages.full_day}</div>
                <div className="text-xs text-gray-400">Full Day</div>
              </div>
              <div className="text-center p-3 bg-gray-800/50 rounded-lg">
                <div className="text-lg mb-1">🌙</div>
                <div className="text-sm font-bold text-white">{breakdown.custom.packages.night}</div>
                <div className="text-xs text-gray-400">Night</div>
              </div>
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="border-t border-gray-700/50 pt-4">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-green-400">{totalBookings}</div>
              <div className="text-xs text-gray-400">Total Bookings</div>
            </div>
            <div>
              <div className="text-lg font-bold text-green-400">
                ₹{totalRevenue.toLocaleString('en-IN')}
              </div>
              <div className="text-xs text-gray-400">Total Revenue</div>
            </div>
          </div>
        </div>
      </div>
    </ThemedCard>
  );
}

// ✅ IMPROVED: Enhanced Daily Revenue Bar Chart Component with Custom Booking Support
function DailyRevenueBarChart() {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [timeFilter, setTimeFilter] = useState('7days');
  const [chartType, setChartType] = useState('bar');
  const [showBreakdown, setShowBreakdown] = useState(true);
  const [customDateRange, setCustomDateRange] = useState({
    start: '',
    end: ''
  });
  const [exportLoading, setExportLoading] = useState(false);
  const [dataError, setDataError] = useState(null);

  // Fetch daily revenue data from real bookings (both types)
  const fetchDailyRevenueData = useCallback(async () => {
    if (loading) return;
    
    setLoading(true);
    setDataError(null);
    console.log('🧮 Fetching daily revenue data with booking type breakdown...');
    
    try {
      // Get real bookings data
      const bookingsResponse = await fetch('/api/bookings');
      const bookingsData = await bookingsResponse.json();
      
      if (!bookingsData.success || !bookingsData.bookings) {
        setDataError('Failed to fetch bookings data');
        setChartData([]);
        return;
      }

      console.log(`📊 Processing ${bookingsData.bookings.length} total bookings with both pricing types...`);

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
          fullDate: date.toLocaleDateString('en-IN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
          revenue: 0,
          advancedRevenue: 0,
          customRevenue: 0,
          bookings: 0,
          advancedBookings: 0,
          customBookings: 0,
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
          
          // Calculate revenue based on booking type
          const bookingRevenue = await calculateBookingRevenue(booking);
          console.log(`${booking.isCustomBooking ? 'Custom' : 'Advanced'} pricing for ${booking.bookingId}: ₹${bookingRevenue}`);

          dayData.revenue += bookingRevenue;
          dayData.bookings += 1;
          dayData.bookingsList.push(booking);

          if (booking.isCustomBooking) {
            dayData.customRevenue += bookingRevenue;
            dayData.customBookings += 1;
          } else {
            dayData.advancedRevenue += bookingRevenue;
            dayData.advancedBookings += 1;
          }
        }
      }

      // Calculate average booking values
      const chartDataArray = [];
      
      for (const dayData of dailyData.values()) {
        dayData.avgBookingValue = dayData.bookings > 0 ? Math.round(dayData.revenue / dayData.bookings) : 0;
        chartDataArray.push(dayData);
      }

      setChartData(chartDataArray);
      
      const totalRevenue = chartDataArray.reduce((sum, day) => sum + day.revenue, 0);
      const totalBookings = chartDataArray.reduce((sum, day) => sum + day.bookings, 0);
      const totalAdvanced = chartDataArray.reduce((sum, day) => sum + day.advancedRevenue, 0);
      const totalCustom = chartDataArray.reduce((sum, day) => sum + day.customRevenue, 0);
      
      console.log(`✅ Enhanced pricing calculation completed:`);
      console.log(`   📊 ${chartDataArray.length} days processed`);
      console.log(`   💰 Total revenue: ₹${totalRevenue.toLocaleString('en-IN')}`);
      console.log(`   ⚡ Advanced: ₹${totalAdvanced.toLocaleString('en-IN')}`);
      console.log(`   📦 Custom: ₹${totalCustom.toLocaleString('en-IN')}`);
      console.log(`   📋 Total bookings: ${totalBookings}`);
      
    } catch (error) {
      console.error('Error fetching daily revenue data:', error);
      setDataError('Failed to calculate daily revenue');
      setChartData([]);
    } finally {
      setLoading(false);
    }
  }, [timeFilter, customDateRange]);

  useEffect(() => {
    fetchDailyRevenueData();
  }, [fetchDailyRevenueData]);

  // Export chart data to CSV
  const exportChartData = async () => {
    setExportLoading(true);
    try {
      const csvHeader = showBreakdown 
        ? 'Date,Total Revenue,Advanced Revenue,Custom Revenue,Total Bookings,Advanced Bookings,Custom Bookings,Avg Booking Value\n'
        : 'Date,Revenue,Bookings,Avg Booking Value\n';
      
      const csvData = chartData.map(item => {
        const baseRow = `${item.date},${item.revenue},${item.bookings},${item.avgBookingValue}`;
        return showBreakdown 
          ? `${item.date},${item.revenue},${item.advancedRevenue},${item.customRevenue},${item.bookings},${item.advancedBookings},${item.customBookings},${item.avgBookingValue}`
          : baseRow;
      }).join('\n');
      
      const csvContent = csvHeader + csvData;
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `daily-revenue-breakdown-${timeFilter}-${new Date().toISOString().split('T')[0]}.csv`;
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
      const confirmDrilldown = confirm(
        `📊 ${data.fullDate}\n\n` +
        `💰 Total Revenue: ₹${data.revenue.toLocaleString('en-IN')}\n` +
        `⚡ Advanced: ₹${data.advancedRevenue.toLocaleString('en-IN')} (${data.advancedBookings} bookings)\n` +
        `📦 Custom: ₹${data.customRevenue.toLocaleString('en-IN')} (${data.customBookings} bookings)\n` +
        `📋 Total Bookings: ${data.bookings}\n` +
        `💸 Avg per Booking: ₹${data.avgBookingValue.toLocaleString('en-IN')}\n\n` +
        `Click OK to view detailed bookings for this date.`
      );
      if (confirmDrilldown) {
        window.open(`/admin/bookings?date=${data.date}`, '_blank');
      }
    }
  };

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 shadow-xl backdrop-blur-sm">
          <h4 className="text-white font-semibold mb-3 border-b border-gray-600 pb-2">
            {data.fullDate}
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Total Revenue:</span>
              <span className="text-green-400 font-bold">₹{data.revenue.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Total Bookings:</span>
              <span className="text-blue-400 font-medium">{data.bookings}</span>
            </div>
            {showBreakdown && (
              <>
                <hr className="border-gray-600 my-2" />
                <div className="flex justify-between items-center">
                  <span className="text-blue-300">⚡ Advanced:</span>
                  <span className="text-blue-400">₹{data.advancedRevenue.toLocaleString('en-IN')} ({data.advancedBookings})</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-purple-300">📦 Custom:</span>
                  <span className="text-purple-400">₹{data.customRevenue.toLocaleString('en-IN')} ({data.customBookings})</span>
                </div>
              </>
            )}
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Avg Value:</span>
              <span className="text-cyan-400 font-medium">₹{data.avgBookingValue.toLocaleString('en-IN')}</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-gray-600 text-xs text-cyan-400">
            💡 Click to view detailed bookings
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
    <ThemedCard className="overflow-hidden">
      {/* Enhanced Header */}
      <div className="p-6 border-b border-gray-700/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-2xl font-bold text-white flex items-center gap-3">
              📊 Daily Revenue Analysis
              <div className="text-xs text-cyan-400 bg-cyan-400/10 px-3 py-1 rounded-full">
                ⚡📦 Dual Pricing
              </div>
            </h3>
            <p className="text-gray-400 mt-1">
              Advanced pricing + Custom packages combined
            </p>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <ThemedButton
              variant="secondary"
              onClick={() => setShowBreakdown(!showBreakdown)}
              className="text-sm flex items-center gap-2"
            >
              {showBreakdown ? '📊 Hide Breakdown' : '📊 Show Breakdown'}
            </ThemedButton>
            <ThemedButton
              variant="primary"
              onClick={exportChartData}
              disabled={exportLoading || chartData.length === 0}
              className="text-sm flex items-center gap-2"
            >
              {exportLoading ? '⏳ Exporting...' : '📥 Export CSV'}
            </ThemedButton>
          </div>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="p-6 bg-gray-800/30 border-b border-gray-700/50">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Time Period</label>
            <ThemedSelect
              value={timeFilter}
              onValueChange={setTimeFilter}
              options={[
                { value: '7days', label: 'Last 7 Days' },
                { value: '30days', label: 'Last 30 Days' },
                { value: '90days', label: 'Last 3 Months' },
                { value: 'custom', label: 'Custom Range' }
              ]}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Chart Type</label>
            <ThemedSelect
              value={chartType}
              onValueChange={setChartType}
              options={[
                { value: 'bar', label: '📊 Bar Chart' },
                { value: 'stacked', label: '📊 Stacked Bar' },
                { value: 'line', label: '📈 Line Chart' },
                { value: 'composed', label: '📋 Combined' }
              ]}
            />
          </div>

          {/* Custom Date Range */}
          {timeFilter === 'custom' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Start Date</label>
                <ThemedInput
                  type="date"
                  value={customDateRange.start}
                  onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">End Date</label>
                <ThemedInput
                  type="date"
                  value={customDateRange.end}
                  onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Chart Display */}
      <div className="p-6">
        {loading ? (
          <div className="h-96 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
              <div className="text-white text-lg mb-2">🧮 Calculating Dual Pricing</div>
              <div className="text-gray-400 text-sm">Processing advanced pricing + custom packages</div>
            </div>
          </div>
        ) : dataError ? (
          <div className="h-96 flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl mb-4">⚠️</div>
              <h3 className="text-lg font-medium text-white mb-2">Data Error</h3>
              <p className="text-red-400 mb-4">{dataError}</p>
              <ThemedButton variant="primary" onClick={fetchDailyRevenueData}>
                🔄 Retry
              </ThemedButton>
            </div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-96 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-xl font-medium mb-2">No Revenue Data</h3>
              <p className="text-sm mb-4">Daily revenue data will appear here once you have bookings</p>
              <div className="flex gap-3 justify-center">
                <ThemedButton variant="secondary" onClick={() => window.location.href = '/booking'}>
                  ⚡ Advanced Booking
                </ThemedButton>
                <ThemedButton variant="success" onClick={() => window.location.href = '/custom-booking'}>
                  📦 Custom Booking
                </ThemedButton>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'bar' ? (
                <BarChart data={chartData} onClick={handleBarClick}>
                  <CartesianGrid {...chartTheme.cartesianGrid} />
                  <XAxis 
                    dataKey="dateFormatted" 
                    {...chartTheme.xAxis}
                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                    tickLine={{ stroke: '#9CA3AF' }}
                  />
                  <YAxis 
                    {...chartTheme.yAxis}
                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                    tickLine={{ stroke: '#9CA3AF' }}
                    tickFormatter={(value) => `₹${value}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="revenue" 
                    fill="#10B981" 
                    radius={[4, 4, 0, 0]}
                    cursor="pointer"
                  />
                </BarChart>
              ) : chartType === 'stacked' ? (
                <BarChart data={chartData} onClick={handleBarClick}>
                  <CartesianGrid {...chartTheme.cartesianGrid} />
                  <XAxis 
                    dataKey="dateFormatted" 
                    {...chartTheme.xAxis}
                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                  />
                  <YAxis 
                    {...chartTheme.yAxis}
                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                    tickFormatter={(value) => `₹${value}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="advancedRevenue" 
                    stackId="a"
                    fill="#3B82F6" 
                    name="Advanced Pricing"
                  />
                  <Bar 
                    dataKey="customRevenue" 
                    stackId="a"
                    fill="#8B5CF6" 
                    name="Custom Packages"
                  />
                </BarChart>
              ) : chartType === 'line' ? (
                <LineChart data={chartData}>
                  <CartesianGrid {...chartTheme.cartesianGrid} />
                  <XAxis 
                    dataKey="dateFormatted" 
                    {...chartTheme.xAxis}
                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                  />
                  <YAxis 
                    {...chartTheme.yAxis}
                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                    tickFormatter={(value) => `₹${value}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#10B981" 
                    strokeWidth={3}
                    dot={{ fill: '#10B981', strokeWidth: 2, r: 6 }}
                  />
                  {showBreakdown && (
                    <>
                      <Line 
                        type="monotone" 
                        dataKey="advancedRevenue" 
                        stroke="#3B82F6" 
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="customRevenue" 
                        stroke="#8B5CF6" 
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 4 }}
                      />
                    </>
                  )}
                </LineChart>
              ) : (
                <ComposedChart data={chartData}>
                  <CartesianGrid {...chartTheme.cartesianGrid} />
                  <XAxis 
                    dataKey="dateFormatted" 
                    {...chartTheme.xAxis}
                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                  />
                  <YAxis 
                    yAxisId="revenue" 
                    {...chartTheme.yAxis}
                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                    tickFormatter={(value) => `₹${value}`}
                  />
                  <YAxis 
                    yAxisId="bookings" 
                    orientation="right" 
                    {...chartTheme.yAxis}
                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                  />
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
      </div>

      {/* Enhanced Summary Stats */}
      {chartData.length > 0 && (
        <div className="p-6 bg-gray-800/30 border-t border-gray-700/50">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-white">Period Summary</h4>
            <div className="text-xs text-cyan-400 bg-cyan-400/10 px-3 py-1 rounded-full">
              ⚡📦 Dual Pricing Applied
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-4 rounded-lg bg-green-900/20 border border-green-700/30">
              <div className="text-2xl font-bold text-green-400 mb-1">
                ₹{chartData.reduce((sum, item) => sum + item.revenue, 0).toLocaleString('en-IN')}
              </div>
              <div className="text-sm text-green-200">Total Revenue</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-blue-900/20 border border-blue-700/30">
              <div className="text-2xl font-bold text-blue-400 mb-1">
                ₹{chartData.reduce((sum, item) => sum + item.advancedRevenue, 0).toLocaleString('en-IN')}
              </div>
              <div className="text-sm text-blue-200">⚡ Advanced</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-purple-900/20 border border-purple-700/30">
              <div className="text-2xl font-bold text-purple-400 mb-1">
                ₹{chartData.reduce((sum, item) => sum + item.customRevenue, 0).toLocaleString('en-IN')}
              </div>
              <div className="text-sm text-purple-200">📦 Custom</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-cyan-900/20 border border-cyan-700/30">
              <div className="text-2xl font-bold text-cyan-400 mb-1">
                {chartData.reduce((sum, item) => sum + item.bookings, 0)}
              </div>
              <div className="text-sm text-cyan-200">Total Bookings</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-orange-900/20 border border-orange-700/30">
              <div className="text-2xl font-bold text-orange-400 mb-1">
                ₹{Math.round(
                  chartData.reduce((sum, item) => sum + item.revenue, 0) / 
                  Math.max(chartData.reduce((sum, item) => sum + item.bookings, 0), 1)
                ).toLocaleString('en-IN')}
              </div>
              <div className="text-sm text-orange-200">Avg per Booking</div>
            </div>
          </div>
        </div>
      )}
    </ThemedCard>
  );
}

// ✅ ENHANCED: Daily Revenue Summary Stats Component with Custom Booking Support
function DailyRevenueSummary() {
  const [summaryData, setSummaryData] = useState({
    todayRevenue: 0,
    todayAdvanced: 0,
    todayCustom: 0,
    weekRevenue: 0,
    monthRevenue: 0,
    peakDay: null,
    averageDailyRevenue: 0,
    revenueGrowth: 0,
    bookingTypeRatio: { advanced: 0, custom: 0 }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummaryData = async () => {
      if (loading) return;
      
      try {
        console.log('🧮 Calculating enhanced revenue summary with both pricing types...');
        
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

        // Calculate today's revenue by type
        const todayBookings = validBookings.filter(booking => {
          const bookingDate = new Date(booking.createdAt);
          return bookingDate >= today && bookingDate < tomorrow;
        });
        
        let todayAdvanced = 0, todayCustom = 0;
        for (const booking of todayBookings) {
          const revenue = await calculateBookingRevenue(booking);
          if (booking.isCustomBooking) {
            todayCustom += revenue;
          } else {
            todayAdvanced += revenue;
          }
        }
        const todayRevenue = todayAdvanced + todayCustom;

        // Calculate week revenue
        const weekBookings = validBookings.filter(booking => {
          const bookingDate = new Date(booking.createdAt);
          return bookingDate >= weekAgo && bookingDate <= now;
        });
        const weekRevenue = await calculateTotalRevenue(weekBookings);

        // Calculate month revenue
        const monthBookings = validBookings.filter(booking => {
          const bookingDate = new Date(booking.createdAt);
          return bookingDate >= monthAgo && bookingDate <= now;
        });
        const monthRevenue = await calculateTotalRevenue(monthBookings);

        // Calculate previous month revenue for growth
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

        // Calculate booking type ratio for today
        const totalTodayBookings = todayBookings.length;
        const advancedCount = todayBookings.filter(b => !b.isCustomBooking).length;
        const customCount = todayBookings.filter(b => b.isCustomBooking).length;
        
        setSummaryData({
          todayRevenue: Math.round(todayRevenue),
          todayAdvanced: Math.round(todayAdvanced),
          todayCustom: Math.round(todayCustom),
          weekRevenue: Math.round(weekRevenue),
          monthRevenue: Math.round(monthRevenue),
          peakDay,
          averageDailyRevenue,
          revenueGrowth: Math.round(revenueGrowth * 10) / 10,
          bookingTypeRatio: {
            advanced: totalTodayBookings > 0 ? Math.round((advancedCount / totalTodayBookings) * 100) : 0,
            custom: totalTodayBookings > 0 ? Math.round((customCount / totalTodayBookings) * 100) : 0
          }
        });

        console.log(`✅ Enhanced pricing summary completed:`);
        console.log(`   📅 Today: ₹${Math.round(todayRevenue).toLocaleString('en-IN')} (⚡₹${Math.round(todayAdvanced)} + 📦₹${Math.round(todayCustom)})`);
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
    <ThemedCard title="📈 Revenue Summary" description="⚡📦 Dual pricing calculations with real-time updates">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
        <div className="text-center p-4 rounded-lg bg-green-900/20 border border-green-700/30">
          <div className="text-2xl font-bold text-green-400 mb-1">
            ₹{summaryData.todayRevenue.toLocaleString('en-IN')}
          </div>
          <div className="text-green-200 text-sm">Today's Revenue</div>
          <div className="text-xs text-green-300 mt-1 flex justify-center gap-2">
            <span>⚡₹{summaryData.todayAdvanced.toLocaleString('en-IN')}</span>
            <span>📦₹{summaryData.todayCustom.toLocaleString('en-IN')}</span>
          </div>
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

      {/* Today's Booking Type Breakdown */}
      {(summaryData.todayAdvanced > 0 || summaryData.todayCustom > 0) && (
        <div className="mt-6 pt-4 border-t border-gray-700/50">
          <h4 className="text-sm font-medium text-white mb-3">Today's Booking Mix</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-blue-800/30 rounded-lg">
              <div className="text-lg font-bold text-blue-400">{summaryData.bookingTypeRatio.advanced}%</div>
              <div className="text-xs text-blue-300">⚡ Advanced Pricing</div>
            </div>
            <div className="text-center p-3 bg-purple-800/30 rounded-lg">
              <div className="text-lg font-bold text-purple-400">{summaryData.bookingTypeRatio.custom}%</div>
              <div className="text-xs text-purple-300">📦 Custom Packages</div>
            </div>
          </div>
        </div>
      )}
    </ThemedCard>
  );
}

// Enhanced Animated Counter Component (unchanged)
function EnhancedAnimatedCounter({ value, duration = 1000, prefix = '', suffix = '', previousValue }) {
  const [displayValue, setDisplayValue] = useState(previousValue || 0);

  useEffect(() => {
    const startTime = Date.now();
    const startValue = displayValue;
    const difference = value - startValue;

    const updateCounter = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
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

// Enhanced Stats Card with Live Features (unchanged)
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

// Fleet Status Grid (unchanged)
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

// ✅ ENHANCED: Top Loyal Customers with Custom Booking Revenue
function TopLoyalCustomers({ customers }) {
  const [customersWithAdvancedPricing, setCustomersWithAdvancedPricing] = useState([]);
  const [recalculating, setRecalculating] = useState(false);
  const [hasRecalculated, setHasRecalculated] = useState(false);
  const [debugInfo, setDebugInfo] = useState(null);

  const recalculateWithAdvancedPricing = useCallback(async () => {
    if (!customers || customers.length === 0) return;
    
    setRecalculating(true);
    try {
      console.log('🧮 Recalculating loyal customers with dual pricing...');
      
      const bookingsResponse = await fetch('/api/bookings');
      const bookingsData = await bookingsResponse.json();
      
      if (!bookingsData.success || !bookingsData.bookings) {
        console.error('Failed to fetch bookings for customer recalculation');
        return;
      }

      const updatedCustomers = await Promise.all(
        customers.map(async (customer) => {
          const possibleCustomerIds = [
            customer.customerId,
            customer._id,
            customer.id,
            customer.customerDetails?._id,
            customer.customerDetails?.customerId
          ].filter(Boolean);

          const customerBookings = bookingsData.bookings.filter(booking => {
            const bookingCustomerIds = [
              booking.customerId,
              booking.customerId?._id,
              booking.customerId?.toString(),
              booking.customer?._id,
              booking.customer?.id
            ].filter(Boolean);

            return possibleCustomerIds.some(custId => 
              bookingCustomerIds.some(bookCustId => 
                custId.toString() === bookCustId.toString()
              )
            ) && booking.status === 'completed';
          });

          // Calculate dual pricing for each booking
          let totalAdvancedRevenue = 0;
          let totalCustomRevenue = 0;
          let advancedBookings = 0;
          let customBookings = 0;
          
          for (const booking of customerBookings) {
            const revenue = await calculateBookingRevenue(booking);
            
            if (booking.isCustomBooking) {
              totalCustomRevenue += revenue;
              customBookings++;
            } else {
              totalAdvancedRevenue += revenue;
              advancedBookings++;
            }
          }

          const totalDualRevenue = totalAdvancedRevenue + totalCustomRevenue;

          return {
            ...customer,
            totalDualRevenue: Math.round(totalDualRevenue),
            totalAdvancedRevenue: Math.round(totalAdvancedRevenue),
            totalCustomRevenue: Math.round(totalCustomRevenue),
            advancedBookings,
            customBookings,
            originalRevenue: customer.totalRevenue || 0,
            revenueDifference: Math.round(totalDualRevenue - (customer.totalRevenue || 0)),
            bookingsFound: customerBookings.length
          };
        })
      );

      const sortedCustomers = updatedCustomers.sort((a, b) => b.totalDualRevenue - a.totalDualRevenue);
      
      setCustomersWithAdvancedPricing(sortedCustomers);
      setHasRecalculated(true);
      
      setDebugInfo({
        totalCustomers: customers.length,
        customersWithBookings: sortedCustomers.filter(c => c.bookingsFound > 0).length,
        totalAdvancedRevenue: sortedCustomers.reduce((sum, c) => sum + c.totalAdvancedRevenue, 0),
        totalCustomRevenue: sortedCustomers.reduce((sum, c) => sum + c.totalCustomRevenue, 0)
      });
      
      console.log('✅ Customer loyalty recalculation completed with dual pricing');
      
    } catch (error) {
      console.error('❌ Error recalculating customer revenue with dual pricing:', error);
    } finally {
      setRecalculating(false);
    }
  }, [customers]);

  useEffect(() => {
    if (customers && customers.length > 0 && !hasRecalculated) {
      recalculateWithAdvancedPricing();
    }
  }, [customers, recalculateWithAdvancedPricing, hasRecalculated]);

  const displayCustomers = hasRecalculated ? customersWithAdvancedPricing : customers;

  if (!displayCustomers || displayCustomers.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8">
        <div className="text-4xl mb-3">👥</div>
        <h4 className="text-lg font-semibold mb-2">No Loyal Customers Yet</h4>
        <p className="text-sm mb-4">Customer loyalty data will appear here once you have repeat customers</p>
        <ThemedButton
          variant="secondary"
          onClick={() => window.location.href = '/customers'}
          className="text-sm"
        >
          📋 Manage Customers
        </ThemedButton>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-2">
          {hasRecalculated && (
            <div className="text-xs text-cyan-400 bg-cyan-400/10 px-2 py-1 rounded">
              ⚡📦 Dual Pricing
            </div>
          )}
          {recalculating && (
            <div className="text-xs text-orange-400 bg-orange-400/10 px-2 py-1 rounded flex items-center gap-1">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-orange-400"></div>
              Calculating...
            </div>
          )}
        </div>
        
        <div className="flex space-x-2">
          <ThemedButton
            variant="secondary"
            onClick={recalculateWithAdvancedPricing}
            disabled={recalculating}
            className="text-xs px-3 py-1"
          >
            {recalculating ? '⏳' : '🔄'} Recalculate
          </ThemedButton>
          
          <ThemedButton
            variant="primary"
            onClick={() => window.location.href = '/customers'}
            className="text-xs px-3 py-1"
          >
            📋 View All
          </ThemedButton>
        </div>
      </div>

      {displayCustomers.slice(0, 5).map((customer, index) => (
        <div 
          key={customer.customerId || customer._id || index}
          className="flex items-center justify-between p-4 rounded-lg bg-gray-800/30 border border-gray-700/50 hover:border-gray-600/50 transition-all hover:bg-gray-800/50 cursor-pointer"
          onClick={() => {
            const customerId = customer.customerId || customer._id;
            if (customerId) {
              window.location.href = `/customers/${customerId}`;
            }
          }}
        >
          <div className="flex items-center space-x-4">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
              index === 0 && "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
              index === 1 && "bg-gray-400/20 text-gray-300 border border-gray-400/30",
              index === 2 && "bg-orange-500/20 text-orange-400 border border-orange-500/30",
              index > 2 && "bg-blue-500/20 text-blue-400 border border-blue-500/30"
            )}>
              {index === 0 ? '🏆' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
            </div>

            <div>
              <div className="font-semibold text-white hover:text-cyan-400 transition-colors">
                {customer.customerName}
              </div>
              <div className="text-sm text-gray-400">{customer.customerPhone}</div>
              {hasRecalculated && (customer.advancedBookings > 0 || customer.customBookings > 0) && (
                <div className="text-xs text-gray-500 flex gap-2">
                  {customer.advancedBookings > 0 && <span>⚡{customer.advancedBookings}</span>}
                  {customer.customBookings > 0 && <span>📦{customer.customBookings}</span>}
                </div>
              )}
            </div>
          </div>

          <div className="text-right">
            <div className="text-lg font-bold text-cyan-400">
              {customer.totalBookings} bookings
            </div>
            
            {hasRecalculated ? (
              <div className="space-y-1">
                <div className="text-green-400 font-medium">
                  ₹{customer.totalDualRevenue.toLocaleString('en-IN')} total
                </div>
                
                {(customer.totalAdvancedRevenue > 0 || customer.totalCustomRevenue > 0) && (
                  <div className="text-xs text-gray-400 flex gap-2">
                    {customer.totalAdvancedRevenue > 0 && (
                      <span>⚡₹{customer.totalAdvancedRevenue.toLocaleString('en-IN')}</span>
                    )}
                    {customer.totalCustomRevenue > 0 && (
                      <span>📦₹{customer.totalCustomRevenue.toLocaleString('en-IN')}</span>
                    )}
                  </div>
                )}
                
                {customer.revenueDifference !== 0 && (
                  <div className={`text-xs ${customer.revenueDifference > 0 ? 'text-green-300' : 'text-red-300'}`}>
                    {customer.revenueDifference > 0 ? '+' : ''}₹{customer.revenueDifference.toLocaleString('en-IN')} vs stored
                  </div>
                )}
              </div>
            ) : (
              <div className="text-gray-400">
                ₹{(customer.totalRevenue || 0).toLocaleString('en-IN')} total
              </div>
            )}
            
            <div className="text-xs text-green-400">
              {customer.bookingFrequency?.toFixed(1) || '0.0'}/month
            </div>
          </div>
        </div>
      ))}

      {displayCustomers.length > 5 && (
        <div className="text-center pt-4 border-t border-gray-700/50">
          <p className="text-sm text-gray-400 mb-3">
            Showing top 5 of {displayCustomers.length} loyal customers
          </p>
          <ThemedButton
            variant="secondary"
            onClick={() => window.location.href = '/customers?sort=loyalty'}
            className="text-sm"
          >
            📊 View Complete Loyalty Rankings
          </ThemedButton>
        </div>
      )}
    </div>
  );
}

// Customer Reliability Section (similar enhancement)
function CustomerReliabilitySection({ customers }) {
  const [customersWithAdvancedPricing, setCustomersWithAdvancedPricing] = useState([]);
  const [recalculating, setRecalculating] = useState(false);
  const [hasRecalculated, setHasRecalculated] = useState(false);

  const recalculateReliabilityWithAdvancedPricing = useCallback(async () => {
    if (!customers || customers.length === 0) return;
    
    setRecalculating(true);
    try {
      const bookingsResponse = await fetch('/api/bookings');
      const bookingsData = await bookingsResponse.json();
      
      if (!bookingsData.success || !bookingsData.bookings) {
        console.error('Failed to fetch bookings for reliability recalculation');
        return;
      }

      const updatedCustomers = await Promise.all(
        customers.map(async (customer) => {
          const customerBookings = bookingsData.bookings.filter(booking => 
            booking.customerId === customer.customerId && 
            booking.status === 'completed'
          );

          let totalDualRevenue = 0;
          for (const booking of customerBookings) {
            const revenue = await calculateBookingRevenue(booking);
            totalDualRevenue += revenue;
          }

          return {
            ...customer,
            totalDualRevenue: Math.round(totalDualRevenue),
            originalRevenue: customer.totalRevenue || 0,
            revenueDifference: Math.round(totalDualRevenue - (customer.totalRevenue || 0))
          };
        })
      );

      setCustomersWithAdvancedPricing(updatedCustomers);
      setHasRecalculated(true);
      
    } catch (error) {
      console.error('Error recalculating reliability customers with dual pricing:', error);
    } finally {
      setRecalculating(false);
    }
  }, [customers]);

  useEffect(() => {
    if (customers && customers.length > 0 && !hasRecalculated) {
      recalculateReliabilityWithAdvancedPricing();
    }
  }, [customers, recalculateReliabilityWithAdvancedPricing, hasRecalculated]);

  const displayCustomers = hasRecalculated ? customersWithAdvancedPricing : customers;

  if (!displayCustomers || displayCustomers.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8">
        <div className="text-4xl mb-3">⭐</div>
        <h4 className="text-lg font-semibold mb-2">No Reliability Data</h4>
        <p className="text-sm mb-4">Customer reliability scores will appear here once you have completed bookings</p>
        <ThemedButton
          variant="secondary"
          onClick={() => window.location.href = '/customers?sort=reliability'}
          className="text-sm"
        >
          📊 View Customer Analytics
        </ThemedButton>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-2">
          {hasRecalculated && (
            <div className="text-xs text-cyan-400 bg-cyan-400/10 px-2 py-1 rounded">
              ⚡📦 Dual Pricing
            </div>
          )}
          {recalculating && (
            <div className="text-xs text-orange-400 bg-orange-400/10 px-2 py-1 rounded flex items-center gap-1">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-orange-400"></div>
              Calculating...
            </div>
          )}
        </div>
        
        <div className="flex space-x-2">
          <ThemedButton
            variant="secondary"
            onClick={recalculateReliabilityWithAdvancedPricing}
            disabled={recalculating}
            className="text-xs px-3 py-1"
          >
            {recalculating ? '⏳' : '🔄'} Recalculate
          </ThemedButton>
          
          <ThemedButton
            variant="primary"
            onClick={() => window.location.href = '/customers?sort=reliability'}
            className="text-xs px-3 py-1"
          >
            ⭐ View All
          </ThemedButton>
        </div>
      </div>

      {displayCustomers.slice(0, 5).map((customer) => (
        <div 
          key={customer.customerId}
          className="flex items-center justify-between p-4 rounded-lg bg-gray-800/30 border border-gray-700/50 hover:border-gray-600/50 transition-all hover:bg-gray-800/50 cursor-pointer"
          onClick={() => window.location.href = `/customers/${customer.customerId}`}
        >
          <div className="flex items-center space-x-4">
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

            <div>
              <div className="font-semibold text-white hover:text-cyan-400 transition-colors">
                {customer.customerName}
              </div>
              <div className="text-sm text-gray-400">
                {customer.onTimeBookings}/{customer.totalBookings} on-time returns
              </div>
              {customer.averageLateDuration > 0 && (
                <div className="text-xs text-red-400">
                  Avg {customer.averageLateDuration}min late
                </div>
              )}
              
              {hasRecalculated && (
                <div className="text-xs text-green-400 mt-1">
                  ₹{customer.totalDualRevenue.toLocaleString('en-IN')} dual revenue
                </div>
              )}
            </div>
          </div>

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

      {displayCustomers.length > 5 && (
        <div className="text-center pt-4 border-t border-gray-700/50">
          <ThemedButton
            variant="secondary"
            onClick={() => window.location.href = '/customers?sort=reliability'}
            className="text-sm"
          >
            ⭐ View All Reliability Scores
          </ThemedButton>
        </div>
      )}
    </div>
  );
}

// Enhanced Live Activity Feed (unchanged)
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
  const [hasInitialized, setHasInitialized] = useState(false);

  // ✅ ENHANCED: Calculate revenue with dual pricing support
  const calculateEnhancedRevenue = useCallback(async () => {
    try {
      setCalculatingRevenue(true);
      
      const response = await fetch('/api/bookings');
      const data = await response.json();
      if (!data.success) return null;
  
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
  
      // Filter bookings by date and exclude cancelled
      const todayBookings = data.bookings.filter(booking => {
        const bookingDate = new Date(booking.createdAt);
        return bookingDate >= today && bookingDate < tomorrow && booking.status !== 'cancelled';
      });
  
      const yesterdayBookings = data.bookings.filter(booking => {
        const bookingDate = new Date(booking.createdAt);
        return bookingDate >= yesterday && bookingDate < today && booking.status !== 'cancelled';
      });
  
      // Calculate dual pricing revenue
      const todayEnhancedRevenue = await calculateTotalRevenue(todayBookings);
      const yesterdayEnhancedRevenue = await calculateTotalRevenue(yesterdayBookings);

      return {
        todayEnhancedRevenue,
        yesterdayEnhancedRevenue,
        todayBookingsCount: todayBookings.length,
        yesterdayBookingsCount: yesterdayBookings.length
      };
  
    } catch (error) {
      console.error('Error calculating enhanced revenue:', error);
      return null;
    } finally {
      setCalculatingRevenue(false);
    }
  }, []);

  // ✅ ENHANCED: Fetch dashboard data with dual pricing
  const fetchEnhancedDashboardData = useCallback(async () => {
    if (loading && hasInitialized) {
      console.log('Fetch already in progress, skipping...');
      return;
    }

    try {
      setLoading(true);
      
      const enhancedRevenueData = await calculateEnhancedRevenue();
      
      // Try enhanced revenue API first, then fallback to existing APIs
      const apiCalls = [
        fetch('/api/admin/enhanced-revenue?period=today').catch(() => null),
        fetch('/api/analytics/real-time-stats').catch(() => null),
        fetch('/api/analytics/hourly-revenue').catch(() => null),
        fetch('/api/analytics/fleet-heatmap').catch(() => null),
        fetch('/api/analytics/customer-insights').catch(() => null),
        fetch('/api/analytics/customer-milestones').catch(() => null)
      ];

      const [enhancedRevenueRes, realTimeRes, hourlyRes, fleetRes, customerInsightsRes, milestonesRes] = await Promise.all(apiCalls);

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

      // Use enhanced revenue calculation
      if (enhancedRevenueData) {
        newData.todayStats.revenue = enhancedRevenueData.todayEnhancedRevenue;
        newData.todayStats.bookings = enhancedRevenueData.todayBookingsCount;
        newData.yesterdayStats.revenue = enhancedRevenueData.yesterdayEnhancedRevenue;
        newData.yesterdayStats.bookings = enhancedRevenueData.yesterdayBookingsCount;
      }

      // Handle enhanced revenue API response
      if (enhancedRevenueRes?.ok) {
        try {
          const enhancedData = await enhancedRevenueRes.json();
          if (enhancedData.success) {
            // Store enhanced revenue breakdown for later use
            newData.enhancedRevenueBreakdown = enhancedData.breakdown;
            newData.customBookingAnalysis = enhancedData.customBookingAnalysis;
          }
        } catch (err) {
          console.log('Enhanced revenue API parsing failed:', err);
        }
      }

      // Handle real-time stats (existing logic)
      if (realTimeRes?.ok) {
        try {
          const realTimeData = await realTimeRes.json();
          if (realTimeData.success) {
            if (!enhancedRevenueData) {
              newData.todayStats = {
                revenue: realTimeData.data.todayRevenue || 0,
                bookings: realTimeData.data.todayBookings || 0,
                activeRentals: realTimeData.data.activeBookings || 0,
                vehiclesOut: realTimeData.data.rentedVehicles || 0
              };
              newData.yesterdayStats = {
                revenue: realTimeData.data.yesterdayRevenue || 0,
                bookings: realTimeData.data.yesterdayBookings || 0,
                activeRentals: 0,
                vehiclesOut: 0
              };
            } else {
              newData.todayStats.activeRentals = realTimeData.data.activeBookings || 0;
              newData.todayStats.vehiclesOut = realTimeData.data.rentedVehicles || 0;
            }
            newData.recentActivity = realTimeData.data.recentActivity || [];
          }
        } catch (err) {
          console.log('Error parsing real-time stats:', err);
        }
      } else {
        // Fallback to existing stats API
        try {
          const statsRes = await fetch('/api/admin/stats').catch(() => null);
          if (statsRes?.ok) {
            const stats = await statsRes.json();
            if (stats.success) {
              if (!enhancedRevenueData) {
                newData.todayStats = stats.todayStats || {};
                newData.yesterdayStats = stats.yesterdayStats || {};
              } else {
                newData.todayStats.activeRentals = stats.todayStats?.activeRentals || 0;
                newData.todayStats.vehiclesOut = stats.todayStats?.vehiclesOut || 0;
              }
              newData.vehicleUtilization = stats.vehicleUtilization || [];
              newData.monthlyStats = stats.monthlyStats || {};
            }
          }
        } catch (fallbackError) {
          console.log('Fallback stats API failed:', fallbackError);
        }
      }

      // Handle other APIs (existing logic unchanged)
      if (fleetRes?.ok) {
        try {
          const fleetData = await fleetRes.json();
          if (fleetData.success) {
            newData.fleetHeatmap = fleetData.data.heatmapData || [];
          }
        } catch (err) {
          console.log('Error parsing fleet data:', err);
        }
      } else {
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

      // Handle customer intelligence
      if (customerInsightsRes?.ok) {
        try {
          const customerData = await customerInsightsRes.json();
          if (customerData.success) {
            newData.topLoyalCustomers = customerData.data.topLoyalCustomers || [];
            newData.topReliableCustomers = customerData.data.topReliableCustomers || [];
            newData.recentMilestones = customerData.data.recentMilestones || [];
            newData.customerSummary = customerData.data.summary || {};
          }
        } catch (err) {
          console.log('Error parsing customer insights:', err);
        }
      }

      setDashboardData(prevData => {
        const hasChanged = JSON.stringify(prevData) !== JSON.stringify(newData);
        return hasChanged ? newData : prevData;
      });
      
      setLastRefresh(new Date());
      setIsLive(true);
      setHasInitialized(true);

      console.log('✅ Enhanced dashboard data fetched successfully');

    } catch (error) {
      console.error('Error fetching enhanced dashboard data:', error);
      setIsLive(false);
    } finally {
      setLoading(false);
    }
  }, [timeRange, calculateEnhancedRevenue, hasInitialized]);

  // Initial load effect
  useEffect(() => {
    if (!hasInitialized) {
      console.log('🚀 Initial enhanced dashboard load...');
      fetchEnhancedDashboardData();
    }
  }, [fetchEnhancedDashboardData, hasInitialized]);

  // Time range change effect
  useEffect(() => {
    if (hasInitialized) {
      console.log('📊 Time range changed, refetching enhanced data...');
      fetchEnhancedDashboardData();
    }
  }, [timeRange]);

  // Auto-refresh interval
  useEffect(() => {
    if (!hasInitialized) return;

    console.log('⏰ Setting up enhanced auto-refresh interval...');
    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing enhanced dashboard data...');
      fetchEnhancedDashboardData();
    }, 30000); // 30 seconds
    
    return () => {
      console.log('🛑 Clearing enhanced auto-refresh interval...');
      clearInterval(interval);
    };
  }, [hasInitialized]);

  // Manual refresh function
  const handleManualRefresh = useCallback(() => {
    console.log('🔄 Manual enhanced refresh triggered...');
    fetchEnhancedDashboardData();
  }, [fetchEnhancedDashboardData]);

  // Loading state
  if (loading && !hasInitialized) {
    return (
      <ThemedLayout>
        <div className="min-h-screen flex items-center justify-center">
          <ThemedCard>
            <div className="flex items-center space-x-3 p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
              <span className="text-white text-xl">Loading enhanced dual-pricing dashboard...</span>
            </div>
          </ThemedCard>
        </div>
      </ThemedLayout>
    );
  }

  const utilizationRate = dashboardData.todayStats.vehiclesOut && dashboardData.fleetHeatmap?.length > 0
    ? (dashboardData.todayStats.vehiclesOut / dashboardData.fleetHeatmap.length * 100)
    : 0;

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

  return (
    <ThemedLayout>
      <div className="container mx-auto px-6 py-8">
        {/* Enhanced Hero Section */}
        <div className="text-center mb-8">
          <h2 className={theme.typography.hero}>
            Enhanced <span className={theme.typography.gradient}>Dashboard</span>
          </h2>
          <p className={`${theme.typography.subtitle} max-w-2xl mx-auto mt-4`}>
            Real-time analytics with advanced pricing + custom packages
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
            <div className="text-xs text-cyan-400 bg-cyan-400/10 px-3 py-1 rounded-full">
              ⚡📦 Dual Pricing Active
            </div>
            <ThemedButton 
              variant="secondary" 
              onClick={handleManualRefresh}
              className="text-xs px-3 py-1"
              disabled={loading || calculatingRevenue}
            >
              {loading || calculatingRevenue ? '⏳' : '🔄'} Refresh
            </ThemedButton>
          </div>
        </div>

        {/* Enhanced Stats Grid with Dual Pricing */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <LiveStatsCard
            title="Today's Revenue"
            value={calculatingRevenue ? 0 : (dashboardData.todayStats.revenue || 0)}
            previousValue={dashboardData.yesterdayStats.revenue}
            subtitle={calculatingRevenue ? "Calculating dual pricing..." : "⚡📦 Dual pricing"}
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

        {/* ✅ NEW: Booking Type Breakdown Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Booking Type Distribution */}
          <div className="lg:col-span-1">
            <BookingTypeBreakdown 
              bookings={dashboardData.recentBookings} 
              title="📊 Today's Booking Mix"
            />
          </div>

          {/* Enhanced Revenue Chart */}
          <div className="lg:col-span-2">
            <ThemedCard title="📈 Revenue Trends" description="Performance over time with dual pricing">
              <div className="mb-4 flex justify-between items-center">
                <ThemedSelect
                  value={timeRange}
                  onValueChange={setTimeRange}
                  options={[
                    { value: 'week', label: 'Last 7 Days' },
                    { value: 'month', label: 'Last 30 Days' },
                    { value: 'quarter', label: 'Last 3 Months' }
                  ]}
                />
                <div className="text-xs text-cyan-400 bg-cyan-400/10 px-3 py-1 rounded-full">
                  ⚡📦 Dual Pricing
                </div>
              </div>
              
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
                    <p className="text-sm mb-4">Revenue trends will appear here once you have completed bookings</p>
                    <div className="flex gap-3 justify-center">
                      <ThemedButton variant="secondary" onClick={() => window.location.href = '/booking'}>
                        ⚡ Advanced Booking
                      </ThemedButton>
                      <ThemedButton variant="success" onClick={() => window.location.href = '/custom-booking'}>
                        📦 Custom Booking
                      </ThemedButton>
                    </div>
                  </div>
                </div>
              )}
            </ThemedCard>
          </div>
        </div>

        {/* ✅ NEW: Enhanced Daily Revenue Analysis Section with Dual Pricing */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Enhanced Daily Revenue Bar Chart */}
          <div className="lg:col-span-2">
            <DailyRevenueBarChart />
          </div>

          {/* Enhanced Daily Revenue Summary */}
          <div>
            <DailyRevenueSummary />
          </div>
        </div>

        {/* ✅ INTEGRATED: Fleet Management & Forecast Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Vehicle Performance */}
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

        {/* ✅ INTEGRATED: Fleet Forecast Widget - NEW SECTION */}
        <FleetForecastWidget />

        {/* Enhanced Activity Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2">
            <ThemedCard title="🔴 Live Activity Feed" description="Recent transactions, milestones & booking updates">
              <EnhancedLiveActivityFeed 
                activities={dashboardData.recentActivity} 
                milestones={dashboardData.recentMilestones}
              />
            </ThemedCard>
          </div>
          
          {/* Quick Stats Summary */}
          <div className="space-y-4">
            <ThemedCard title="📊 Quick Stats" description="Today's overview">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Revenue:</span>
                  <span className="text-green-400 font-bold">₹{(dashboardData.todayStats.revenue || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Bookings:</span>
                  <span className="text-blue-400 font-bold">{dashboardData.todayStats.bookings || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Active Rentals:</span>
                  <span className="text-orange-400 font-bold">{dashboardData.todayStats.activeRentals || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Fleet Usage:</span>
                  <span className="text-purple-400 font-bold">{Math.round(utilizationRate)}%</span>
                </div>
              </div>
            </ThemedCard>
          </div>
        </div>

        {/* Customer Intelligence Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Enhanced Top Loyal Customers */}
          <ThemedCard title="🏆 Most Loyal Customers" description="Your repeat customers with dual pricing revenue">
            <TopLoyalCustomers customers={dashboardData.topLoyalCustomers} />
          </ThemedCard>

          {/* Enhanced Customer Reliability */}
          <ThemedCard title="⭐ Most Reliable Customers" description="Customers with best on-time return records">
            <CustomerReliabilitySection customers={dashboardData.topReliableCustomers} />
          </ThemedCard>
        </div>

        {/* Customer Summary Stats */}
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
              <div className="text-xs text-green-300 mt-1">⚡📦 Dual pricing</div>
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

        {/* ✅ ENHANCED: Quick Actions with Custom Booking */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <ThemedButton variant="primary" className="w-full py-3" onClick={() => window.location.href = '/booking'}>
            ⚡ Advanced Booking
          </ThemedButton>

          <ThemedButton variant="success" className="w-full py-3" onClick={() => window.location.href = '/custom-booking'}>
            📦 Custom Booking
          </ThemedButton>

          <ThemedButton variant="secondary" className="w-full py-3" onClick={() => window.location.href = '/custom-bookings'}>
            📋 Custom Bookings
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