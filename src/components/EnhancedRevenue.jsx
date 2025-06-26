import { useState, useEffect } from 'react';
import { ThemedCard, ThemedSelect, ThemedButton } from '@/components/themed';

// Enhanced Revenue Summary Component for Dashboard
export function EnhancedRevenueSummary() {
  const [revenueData, setRevenueData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('today');
  
  useEffect(() => {
    fetchRevenueData();
  }, [period]);
  
  const fetchRevenueData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/enhanced-revenue?period=${period}`);
      const data = await response.json();
      if (data.success) {
        setRevenueData(data);
      }
    } catch (error) {
      console.error('Error fetching revenue data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <ThemedCard title="💰 Enhanced Revenue Analytics" description="Loading...">
        <div className="p-6">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mr-3"></div>
            <span className="text-white">Loading revenue data...</span>
          </div>
        </div>
      </ThemedCard>
    );
  }
  
  if (!revenueData) {
    return (
      <ThemedCard title="💰 Revenue Analytics" description="No data available">
        <div className="p-6 text-center">
          <div className="text-red-400 mb-4">Unable to load revenue data</div>
          <ThemedButton onClick={fetchRevenueData} variant="primary">
            Retry
          </ThemedButton>
        </div>
      </ThemedCard>
    );
  }
  
  return (
    <ThemedCard title="💰 Enhanced Revenue Analytics" description="Advanced + Custom booking breakdown">
      <div className="p-6">
        {/* Period Selector */}
        <div className="mb-6">
          <ThemedSelect
            label="Time Period"
            value={period}
            onValueChange={setPeriod}
            options={[
              { value: 'today', label: 'Today' },
              { value: 'week', label: 'This Week' },
              { value: 'month', label: 'This Month' }
            ]}
          />
        </div>
        
        {/* Total Revenue */}
        <div className="bg-gradient-to-r from-green-900/50 to-green-800/50 border border-green-700/50 rounded-xl p-6 mb-6">
          <div className="text-center">
            <div className="text-4xl font-bold text-green-400 mb-2">
              ₹{revenueData.totalRevenue.toLocaleString('en-IN')}
            </div>
            <div className="text-green-200">Total Revenue ({period})</div>
            <div className="text-sm text-green-300 mt-1">
              {revenueData.summary.totalBookings} total bookings • Avg ₹{revenueData.summary.averagePerBooking.toLocaleString('en-IN')}
            </div>
          </div>
        </div>
        
        {/* Revenue Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Advanced Pricing */}
          <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400 mb-2">
                ₹{revenueData.breakdown.advanced.total.toLocaleString('en-IN')}
              </div>
              <div className="text-blue-200 text-sm mb-2">⚡ Advanced Pricing</div>
              <div className="text-xs text-blue-300">
                {revenueData.breakdown.advanced.count} bookings 
                ({revenueData.summary.revenueDistribution.advanced.percentage}%)
              </div>
              <div className="text-xs text-blue-300">
                Avg: ₹{revenueData.breakdown.advanced.avgPerBooking.toLocaleString('en-IN')}
              </div>
            </div>
          </div>
          
          {/* Custom Bookings */}
          <div className="bg-purple-900/20 border border-purple-700/30 rounded-lg p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400 mb-2">
                ₹{revenueData.breakdown.custom.total.toLocaleString('en-IN')}
              </div>
              <div className="text-purple-200 text-sm mb-2">📦 Custom Packages</div>
              <div className="text-xs text-purple-300">
                {revenueData.breakdown.custom.count} bookings 
                ({revenueData.summary.revenueDistribution.custom.percentage}%)
              </div>
              <div className="text-xs text-purple-300">
                Avg: ₹{revenueData.breakdown.custom.avgPerBooking.toLocaleString('en-IN')}
              </div>
            </div>
          </div>
        </div>
        
        {/* Custom Package Breakdown */}
        {revenueData.breakdown.custom.count > 0 && (
          <div>
            <h4 className="text-lg font-semibold text-white mb-4">📦 Custom Package Breakdown</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-3">
                <div className="text-center">
                  <div className="text-2xl mb-1">🌅</div>
                  <div className="text-lg font-bold text-white mb-1">
                    {revenueData.customBookingAnalysis.packageBreakdown.half_day.count}
                  </div>
                  <div className="text-xs text-gray-400 mb-1">HALF DAY</div>
                  <div className="text-sm text-green-400">
                    ₹{revenueData.customBookingAnalysis.packageBreakdown.half_day.revenue.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-3">
                <div className="text-center">
                  <div className="text-2xl mb-1">☀️</div>
                  <div className="text-lg font-bold text-white mb-1">
                    {revenueData.customBookingAnalysis.packageBreakdown.full_day.count}
                  </div>
                  <div className="text-xs text-gray-400 mb-1">FULL DAY</div>
                  <div className="text-sm text-green-400">
                    ₹{revenueData.customBookingAnalysis.packageBreakdown.full_day.revenue.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-3">
                <div className="text-center">
                  <div className="text-2xl mb-1">🌙</div>
                  <div className="text-lg font-bold text-white mb-1">
                    {revenueData.customBookingAnalysis.packageBreakdown.night.count}
                  </div>
                  <div className="text-xs text-gray-400 mb-1">NIGHT</div>
                  <div className="text-sm text-green-400">
                    ₹{revenueData.customBookingAnalysis.packageBreakdown.night.revenue.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            </div>
            <div className="text-center mt-4 text-sm text-gray-400">
              📈 Most popular: {revenueData.customBookingAnalysis.mostPopularPackage.replace('_', ' ').toUpperCase()} 
              ({revenueData.customBookingAnalysis.mostPopularPackageCount} bookings)
            </div>
          </div>
        )}
        
        {/* No Custom Bookings Message */}
        {revenueData.breakdown.custom.count === 0 && (
          <div className="text-center py-6 bg-gray-800/30 rounded-lg">
            <div className="text-3xl mb-2">📦</div>
            <div className="text-gray-400 mb-3">No custom bookings for this period</div>
            <a href="/custom-booking" className="inline-block">
              <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                Create Custom Booking
              </button>
            </a>
          </div>
        )}
        
        {/* Refresh Button */}
        <div className="flex justify-center mt-6">
          <ThemedButton
            onClick={fetchRevenueData}
            variant="secondary"
            className="flex items-center gap-2"
          >
            🔄 Refresh Data
          </ThemedButton>
        </div>
      </div>
    </ThemedCard>
  );
}

// Simple stats cards for dashboard overview
export function EnhancedStatsCards() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchStats();
  }, []);
  
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats');
      const data = await response.json();
      if (data.success) {
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-gray-800 rounded-lg p-6 animate-pulse">
            <div className="h-8 bg-gray-700 rounded mb-2"></div>
            <div className="h-4 bg-gray-700 rounded"></div>
          </div>
        ))}
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      {/* Today's Total Revenue */}
      <div className="bg-gradient-to-r from-green-900/50 to-green-800/50 border border-green-700/50 rounded-lg p-6">
        <div className="text-center">
          <div className="text-3xl font-bold text-green-400 mb-2">
            ₹{stats.todayStats.revenue.toLocaleString('en-IN')}
          </div>
          <div className="text-green-200 text-sm">Today's Revenue</div>
          <div className="text-xs text-green-300 mt-1">
            ⚡ ₹{stats.todayStats.advancedRevenue.toLocaleString('en-IN')} • 
            📦 ₹{stats.todayStats.customRevenue.toLocaleString('en-IN')}
          </div>
        </div>
      </div>
      
      {/* Today's Bookings */}
      <div className="bg-gradient-to-r from-blue-900/50 to-blue-800/50 border border-blue-700/50 rounded-lg p-6">
        <div className="text-center">
          <div className="text-3xl font-bold text-blue-400 mb-2">
            {stats.todayStats.bookings}
          </div>
          <div className="text-blue-200 text-sm">Today's Bookings</div>
          <div className="text-xs text-blue-300 mt-1">
            ⚡ {stats.todayStats.advancedBookings} • 📦 {stats.todayStats.customBookings}
          </div>
        </div>
      </div>
      
      {/* Active Rentals */}
      <div className="bg-gradient-to-r from-orange-900/50 to-orange-800/50 border border-orange-700/50 rounded-lg p-6">
        <div className="text-center">
          <div className="text-3xl font-bold text-orange-400 mb-2">
            {stats.todayStats.activeRentals}
          </div>
          <div className="text-orange-200 text-sm">Active Rentals</div>
          <div className="text-xs text-orange-300 mt-1">Live monitoring</div>
        </div>
      </div>
      
      {/* Monthly Revenue */}
      <div className="bg-gradient-to-r from-purple-900/50 to-purple-800/50 border border-purple-700/50 rounded-lg p-6">
        <div className="text-center">
          <div className="text-3xl font-bold text-purple-400 mb-2">
            ₹{stats.monthlyStats.totalRevenue.toLocaleString('en-IN')}
          </div>
          <div className="text-purple-200 text-sm">Monthly Revenue</div>
          <div className="text-xs text-purple-300 mt-1">
            {stats.monthlyStats.totalBookings} bookings
          </div>
        </div>
      </div>
    </div>
  );
}