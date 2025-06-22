'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  ThemedLayout,
  ThemedCard,
  ThemedStatsCard,
  ThemedButton,
  ThemedSelect,
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

import { calculateCurrentAmount } from '@/lib/pricing';

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

  // Helper function to check if a time block crosses night charge threshold
  const isNightCharge = useCallback((startTime, durationMinutes, nightChargeTime) => {
    try {
      const [nightHour, nightMinute] = nightChargeTime.split(':').map(Number);
      const blockEndTime = new Date(startTime.getTime() + durationMinutes * 60000);
      const nightThreshold = new Date(startTime);
      nightThreshold.setHours(nightHour, nightMinute, 0, 0);
      
      // Check if the block crosses or includes the night threshold
      return blockEndTime > nightThreshold && startTime < new Date(nightThreshold.getTime() + 60000);
    } catch (error) {
      return false;
    }
  }, []);

  // Calculate advanced revenue for today and yesterday
  const calculateAdvancedRevenue = useCallback(async () => {
    try {
      setCalculatingRevenue(true);
      
      // Get all bookings
      const response = await fetch('/api/bookings');
      const data = await response.json();
      
      if (!data.success) return;

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

      // Calculate advanced pricing for each booking
      let todayAdvancedRevenue = 0;
      let yesterdayAdvancedRevenue = 0;

      for (const booking of todayBookings) {
        const result= await calculateCurrentAmount(booking);
        todayAdvancedRevenue += typeof result === 'number' ? result : result.amount;
      }

      for (const booking of yesterdayBookings) {
        const result=await calculateCurrentAmount(booking);
        yesterdayAdvancedRevenue += typeof result === 'number' ? result : result.amount;
      }

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
  }, []);



  // Enhanced data fetching with customer intelligence
  const fetchEnhancedDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Enhanced API calls including customer intelligence
      const [realTimeRes, hourlyRes, fleetRes, customerInsightsRes, milestonesRes, advancedRevenueData] = await Promise.all([
        fetch('/api/analytics/real-time-stats').catch(() => null),
        fetch('/api/analytics/hourly-revenue').catch(() => null),
        fetch('/api/analytics/fleet-heatmap').catch(() => null),
        fetch('/api/analytics/customer-insights').catch(() => null),
        fetch('/api/analytics/customer-milestones').catch(() => null),
        calculateAdvancedRevenue()
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
  }, [timeRange, calculateAdvancedRevenue]);

  useEffect(() => {
    fetchEnhancedDashboardData();
    
    // Enhanced auto-refresh: 30 seconds for real-time, 5 minutes fallback
    const interval = setInterval(fetchEnhancedDashboardData, 30000);
    
    return () => clearInterval(interval);
  }, [fetchEnhancedDashboardData]);

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