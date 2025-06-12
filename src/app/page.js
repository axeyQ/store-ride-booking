'use client';

import { useState } from 'react';
import BookingForm from '@/components/BookingForm';
import AdminDashboard from '@/components/AdminDashboard';

export default function Home() {
  const [currentView, setCurrentView] = useState('booking'); // 'booking' or 'admin'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="text-2xl font-bold text-blue-600">MR Travels</div>
              <div className="text-gray-500">|</div>
              <div className="text-gray-700">Bike Rental System</div>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentView('booking')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  currentView === 'booking'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                New Booking
              </button>
              <button
                onClick={() => setCurrentView('admin')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  currentView === 'admin'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Admin Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main>
        {currentView === 'booking' && <BookingForm />}
        {currentView === 'admin' && <AdminDashboard />}
      </main>
    </div>
  );
}