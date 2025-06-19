'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function HomePage() {
  const [stats, setStats] = useState({
    todayRevenue: 0,
    activeBookings: 0,
    availableVehicles: 0,
    totalCustomers: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/stats');
      const data = await response.json();
      if (data.success && data.stats) {
        // Ensure all stats values are numbers and not null/undefined
        setStats({
          todayRevenue: data.stats.todayRevenue || 0,
          activeBookings: data.stats.activeBookings || 0,
          availableVehicles: data.stats.availableVehicles || 0,
          totalCustomers: data.stats.totalCustomers || 0
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      setError('Failed to load stats');
      // Keep default values on error
    } finally {
      setLoading(false);
    }
  };

  // Error fallback
  if (error) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="bg-blue-600 text-white p-6 shadow-lg">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">MR Travels</h1>
            <div className="text-sm">
              <span className="bg-blue-500 px-3 py-1 rounded-full">
                Bike & Scooter Rentals
              </span>
            </div>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-600 text-xl mb-4">⚠️ {error}</div>
            <button 
              onClick={() => {
                setError(null);
                setLoading(true);
                fetchStats();
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg"
            >
              Retry
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-blue-600 text-white p-6 shadow-lg">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">MR Travels</h1>
          <div className="text-sm">
            <span className="bg-blue-500 px-3 py-1 rounded-full">
              Bike & Scooter Rentals
            </span>
          </div>
        </div>
      </header>

      {/* Main Navigation */}
      <main className="flex-1 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
          
          {/* New Booking */}
          <Link href="/booking" className="group">
            <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-transparent group-hover:border-blue-500">
              <div className="text-center">
                <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">New Booking</h2>
                <p className="text-gray-600">Start a new bike/scooter rental</p>
              </div>
            </div>
          </Link>

          {/* Active Bookings */}
          <Link href="/active-bookings" className="group">
            <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-transparent group-hover:border-orange-500">
              <div className="text-center">
                <div className="bg-orange-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Active Bookings</h2>
                <p className="text-gray-600">Manage ongoing rentals</p>
                {stats.activeBookings > 0 && (
                  <div className="mt-2">
                    <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-sm font-medium">
                      {stats.activeBookings || 0} active
                    </span>
                  </div>
                )}
              </div>
            </div>
          </Link>

          {/* Vehicle Management */}
          <Link href="/vehicles" className="group">
            <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-transparent group-hover:border-purple-500">
              <div className="text-center">
                <div className="bg-purple-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Vehicles</h2>
                <p className="text-gray-600">Manage bikes & scooters</p>
                {stats.availableVehicles > 0 && (
                  <div className="mt-2">
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm font-medium">
                      {stats.availableVehicles || 0} available
                    </span>
                  </div>
                )}
              </div>
            </div>
          </Link>

          {/* Admin Dashboard */}
          <Link href="/admin" className="group">
            <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-transparent group-hover:border-blue-500">
              <div className="text-center">
                <div className="bg-blue-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Dashboard</h2>
                <p className="text-gray-600">Reports & analytics</p>
              </div>
            </div>
          </Link>

          {/* Customer Database */}
          <Link href="/customers" className="group">
            <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-transparent group-hover:border-indigo-500">
              <div className="text-center">
                <div className="bg-indigo-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Customers</h2>
                <p className="text-gray-600">Customer database</p>
                {stats.totalCustomers > 0 && (
                  <div className="mt-2">
                    <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full text-sm font-medium">
                      {stats.totalCustomers || 0} customers
                    </span>
                  </div>
                )}
              </div>
            </div>
          </Link>

          {/* Settings */}
          <Link href="/settings" className="group">
            <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-transparent group-hover:border-gray-500">
              <div className="text-center">
                <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Settings</h2>
                <p className="text-gray-600">System configuration</p>
              </div>
            </div>
          </Link>

        </div>

        {/* Quick Stats */}
        <div className="mt-12 bg-white rounded-xl shadow-lg p-6 max-w-4xl mx-auto">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Today&apos;s Summary</h3>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Loading stats...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">₹{(stats.todayRevenue || 0).toLocaleString('en-IN')}</div>
                <div className="text-sm text-gray-600">Today&apos;s Revenue</div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{stats.activeBookings || 0}</div>
                <div className="text-sm text-gray-600">Active Bookings</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{stats.availableVehicles || 0}</div>
                <div className="text-sm text-gray-600">Available Vehicles</div>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{stats.totalCustomers || 0}</div>
                <div className="text-sm text-gray-600">Total Customers</div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white p-4 text-center">
        <p>&copy; 2025 MR Travels. Digital Bike Rental System.</p>
      </footer>
    </div>
  );
}