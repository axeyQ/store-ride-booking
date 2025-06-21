'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { calculateCurrentAmount } from '@/lib/pricing';

export default function ModernHomePage() {
  const [stats, setStats] = useState({
    todayRevenue: 0,
    activeBookings: 0,
    availableVehicles: 0,
    totalCustomers: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [advancedRevenue, setAdvancedRevenue] = useState(0);
  const [calculatingRevenue, setCalculatingRevenue] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch basic stats first
      const response = await fetch('/api/stats');
      const data = await response.json();
      if (data.success && data.stats) {
        setStats({
          todayRevenue: data.stats.todayRevenue || 0,
          activeBookings: data.stats.activeBookings || 0,
          availableVehicles: data.stats.availableVehicles || 0,
          totalCustomers: data.stats.totalCustomers || 0
        });

        // Then calculate advanced pricing for today's revenue
        await calculateAdvancedTodayRevenue();
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      setError('Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  const calculateAdvancedTodayRevenue = async () => {
    try {
      setCalculatingRevenue(true);
      
      // Get today's bookings
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Fetch all bookings from today
      const response = await fetch('/api/bookings');
      const data = await response.json();
      
      if (data.success) {
        const todayBookings = data.bookings.filter(booking => {
          const bookingDate = new Date(booking.createdAt);
          return bookingDate >= today && bookingDate < tomorrow;
        });

        // Calculate advanced pricing for each booking using centralized pricing.js
        let totalAdvancedRevenue = 0;
        
        for (const booking of todayBookings) {
          const result = await calculateCurrentAmount(booking);
          totalAdvancedRevenue += typeof result === 'number' ? result : result.amount;
        }

        setAdvancedRevenue(totalAdvancedRevenue);
      }
    } catch (error) {
      console.error('Error calculating advanced revenue:', error);
      // Fallback to basic revenue if advanced calculation fails
      setAdvancedRevenue(stats.todayRevenue);
    } finally {
      setCalculatingRevenue(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex flex-col">
        <header className="border-b border-gray-800 bg-black/50 backdrop-blur-sm">
          <div className="container mx-auto px-6 py-4">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-white">MR Travels</h1>
              <Badge variant="outline" className="text-cyan-400 border-cyan-400">
                Bike & Scooter Rentals
              </Badge>
            </div>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center">
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-6 text-center">
              <div className="text-red-400 text-xl mb-4">⚠️ {error}</div>
              <Button onClick={() => {
                setError(null);
                setLoading(true);
                fetchStats();
              }} className="bg-cyan-600 hover:bg-cyan-700">
                Retry
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Modern Header */}
      <header className="border-b border-gray-800 bg-black/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">MR</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">MR Travels</h1>
                <p className="text-gray-400 text-sm">Rental Management System</p>
              </div>
            </div>
            <Badge variant="outline" className="text-cyan-400 border-cyan-400 bg-cyan-400/10">
              Bike & Scooter Rentals
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-white mb-4">
            Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">MR Travels</span>
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Professional rental management system for bikes and scooters
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
          <Card className="bg-gradient-to-r from-green-900/50 to-green-800/50 border-green-700/50 hover:scale-105 transition-transform">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-green-400 mb-2">
                {calculatingRevenue ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-400"></div>
                  </div>
                ) : (
                  `₹${(advancedRevenue || 0).toLocaleString('en-IN')}`
                )}
              </div>
              <div className="text-green-200 text-sm">Today&apos;s Revenue</div>
              <div className="text-xs text-green-300 mt-1">
                {calculatingRevenue ? 'Calculating...' : '🧮 Advanced Pricing'}
              </div>
              <div className="w-full bg-green-900/30 rounded-full h-2 mt-3">
                <div className="bg-green-400 h-2 rounded-full w-3/4"></div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-blue-900/50 to-blue-800/50 border-blue-700/50 hover:scale-105 transition-transform">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-blue-400 mb-2">{stats.activeBookings || 0}</div>
              <div className="text-blue-200 text-sm">Active Bookings</div>
              <div className="w-full bg-blue-900/30 rounded-full h-2 mt-3">
                <div className="bg-blue-400 h-2 rounded-full w-2/3"></div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-900/50 to-purple-800/50 border-purple-700/50 hover:scale-105 transition-transform">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-purple-400 mb-2">{stats.availableVehicles || 0}</div>
              <div className="text-purple-200 text-sm">Available Vehicles</div>
              <div className="w-full bg-purple-900/30 rounded-full h-2 mt-3">
                <div className="bg-purple-400 h-2 rounded-full w-4/5"></div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-900/50 to-orange-800/50 border-orange-700/50 hover:scale-105 transition-transform">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-orange-400 mb-2">{stats.totalCustomers || 0}</div>
              <div className="text-orange-200 text-sm">Total Customers</div>
              <div className="w-full bg-orange-900/30 rounded-full h-2 mt-3">
                <div className="bg-orange-400 h-2 rounded-full w-3/5"></div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Navigation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {/* New Booking */}
          <Link href="/booking" className="group">
            <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 hover:border-green-500/50 transition-all duration-300 hover:scale-105 h-full">
              <CardContent className="p-8 text-center h-full flex flex-col justify-center">
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-green-400 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <CardTitle className="text-2xl font-bold text-white mb-3 group-hover:text-green-400 transition-colors">
                  New Booking
                </CardTitle>
                <CardDescription className="text-gray-400 text-lg">
                  Start a new bike or scooter rental
                </CardDescription>
                <Badge className="mt-4 bg-green-500/20 text-green-400 border-green-500/30">
                  Primary Action
                </Badge>
              </CardContent>
            </Card>
          </Link>

          {/* Active Bookings */}
          <Link href="/active-bookings" className="group">
            <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 hover:border-orange-500/50 transition-all duration-300 hover:scale-105 h-full">
              <CardContent className="p-8 text-center h-full flex flex-col justify-center">
                <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-orange-400 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <CardTitle className="text-2xl font-bold text-white mb-3 group-hover:text-orange-400 transition-colors">
                  Active Bookings
                </CardTitle>
                <CardDescription className="text-gray-400 text-lg">
                  Manage ongoing rentals
                </CardDescription>
                {stats.activeBookings > 0 && (
                  <Badge className="mt-4 bg-orange-500/20 text-orange-400 border-orange-500/30">
                    {stats.activeBookings} active
                  </Badge>
                )}
              </CardContent>
            </Card>
          </Link>

          {/* Vehicle Management */}
          <Link href="/vehicles" className="group">
            <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 hover:border-purple-500/50 transition-all duration-300 hover:scale-105 h-full">
              <CardContent className="p-8 text-center h-full flex flex-col justify-center">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-purple-400 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <CardTitle className="text-2xl font-bold text-white mb-3 group-hover:text-purple-400 transition-colors">
                  Vehicles
                </CardTitle>
                <CardDescription className="text-gray-400 text-lg">
                  Manage bikes & scooters
                </CardDescription>
                {stats.availableVehicles > 0 && (
                  <Badge className="mt-4 bg-purple-500/20 text-purple-400 border-purple-500/30">
                    {stats.availableVehicles} available
                  </Badge>
                )}
              </CardContent>
            </Card>
          </Link>

          {/* Admin Dashboard */}
          <Link href="/admin" className="group">
            <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 hover:border-blue-500/50 transition-all duration-300 hover:scale-105 h-full">
              <CardContent className="p-8 text-center h-full flex flex-col justify-center">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <CardTitle className="text-2xl font-bold text-white mb-3 group-hover:text-blue-400 transition-colors">
                  Dashboard
                </CardTitle>
                <CardDescription className="text-gray-400 text-lg">
                  Analytics & reports
                </CardDescription>
                <Badge className="mt-4 bg-blue-500/20 text-blue-400 border-blue-500/30">
                  Analytics
                </Badge>
              </CardContent>
            </Card>
          </Link>

          {/* Customer Database */}
          <Link href="/customers" className="group">
            <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 hover:border-cyan-500/50 transition-all duration-300 hover:scale-105 h-full">
              <CardContent className="p-8 text-center h-full flex flex-col justify-center">
                <div className="w-16 h-16 bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <CardTitle className="text-2xl font-bold text-white mb-3 group-hover:text-cyan-400 transition-colors">
                  Customers
                </CardTitle>
                <CardDescription className="text-gray-400 text-lg">
                  Customer database
                </CardDescription>
                {stats.totalCustomers > 0 && (
                  <Badge className="mt-4 bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                    {stats.totalCustomers} customers
                  </Badge>
                )}
              </CardContent>
            </Card>
          </Link>

          {/* Settings */}
          <Link href="/settings" className="group">
            <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 hover:border-gray-500/50 transition-all duration-300 hover:scale-105 h-full">
              <CardContent className="p-8 text-center h-full flex flex-col justify-center">
                <div className="w-16 h-16 bg-gradient-to-r from-gray-500 to-gray-400 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <CardTitle className="text-2xl font-bold text-white mb-3 group-hover:text-gray-400 transition-colors">
                  Settings
                </CardTitle>
                <CardDescription className="text-gray-400 text-lg">
                  System configuration
                </CardDescription>
                <Badge className="mt-4 bg-gray-500/20 text-gray-400 border-gray-500/30">
                  Configuration
                </Badge>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Today's Summary */}
        <Card className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 border-gray-700 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              Today&apos;s Business Summary
            </CardTitle>
            <CardDescription className="text-gray-400">
              Real-time overview with advanced pricing calculations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
                  <span className="text-gray-400 text-lg">Loading business metrics...</span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="bg-green-900/20 border border-green-700/30 rounded-xl p-6 text-center">
                  <div className="text-3xl font-bold text-green-400 mb-2">
                    {calculatingRevenue ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-400"></div>
                      </div>
                    ) : (
                      `₹${(advancedRevenue || 0).toLocaleString('en-IN')}`
                    )}
                  </div>
                  <div className="text-green-200 text-sm">Today&apos;s Revenue</div>
                  <div className="text-xs text-green-300 mt-1">
                    {calculatingRevenue ? 'Calculating advanced pricing...' : '🧮 Advanced pricing system'}
                  </div>
                </div>

                <div className="bg-blue-900/20 border border-blue-700/30 rounded-xl p-6 text-center">
                  <div className="text-3xl font-bold text-blue-400 mb-2">{stats.activeBookings || 0}</div>
                  <div className="text-blue-200 text-sm">Active Bookings</div>
                  <div className="text-xs text-blue-300 mt-1">
                    {stats.activeBookings > 0 ? 'Live rentals' : 'All vehicles available'}
                  </div>
                </div>

                <div className="bg-purple-900/20 border border-purple-700/30 rounded-xl p-6 text-center">
                  <div className="text-3xl font-bold text-purple-400 mb-2">{stats.availableVehicles || 0}</div>
                  <div className="text-purple-200 text-sm">Available Vehicles</div>
                  <div className="text-xs text-purple-300 mt-1">Ready for rental</div>
                </div>

                <div className="bg-orange-900/20 border border-orange-700/30 rounded-xl p-6 text-center">
                  <div className="text-3xl font-bold text-orange-400 mb-2">{stats.totalCustomers || 0}</div>
                  <div className="text-orange-200 text-sm">Total Customers</div>
                  <div className="text-xs text-orange-300 mt-1">Registered users</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Modern Footer */}
      <footer className="border-t border-gray-800 bg-black/30 backdrop-blur-sm mt-12">
        <div className="container mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-4 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">MR</span>
              </div>
              <div>
                <div className="text-white font-semibold">MR Travels</div>
                <div className="text-gray-400 text-sm">Professional Rental Management</div>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <Badge variant="outline" className="text-gray-400 border-gray-600">
                System Status: Online
              </Badge>
              <div className="text-gray-400 text-sm">
                © 2025 MR Travels. All rights reserved.
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}