'use client';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import UserRegistration from '@/components/UserRegistration';
import UserManagement from '@/components/UserManagement';

export const AuthenticatedLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const [showUserRegistration, setShowUserRegistration] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);

  const handleLogout = async () => {
    if (confirm('Are you sure you want to logout?')) {
      await logout();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Navigation Header */}
      <header className="border-b border-gray-800 bg-black/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            {/* Logo and Brand */}
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">MR</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">MR Travels</h1>
                <p className="text-gray-400 text-sm">Rental Management System</p>
              </div>
            </div>

            {/* User Actions */}
            <div className="flex items-center space-x-4">
              {/* User Management (only for first user) */}
              {user?.isFirstUser && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowUserRegistration(true)}
                    className="px-3 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-200 flex items-center space-x-2 text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Add User</span>
                  </button>
                  
                  <button
                    onClick={() => setShowUserManagement(true)}
                    className="px-3 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg hover:from-indigo-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200 flex items-center space-x-2 text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <span>Manage Users</span>
                  </button>
                </div>
              )}

              {/* User Info */}
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <div className="text-white font-medium">{user?.fullName}</div>
                  <div className="text-gray-400 text-sm flex items-center space-x-1">
                    <span>@{user?.username}</span>
                    {user?.isFirstUser && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-900/50 text-yellow-200 border border-yellow-700/50">
                        Admin
                      </span>
                    )}
                  </div>
                </div>
                <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium">
                    {user?.fullName?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Session Info */}
              <div className="hidden lg:flex items-center space-x-2 text-xs text-gray-400">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>Active Session</span>
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="min-h-[calc(100vh-80px)]">
        {children}
      </main>

      {/* Modals */}
      <UserRegistration
        isOpen={showUserRegistration}
        onClose={() => setShowUserRegistration(false)}
        onUserCreated={() => {
          setShowUserRegistration(false);
        }}
      />

      <UserManagement
        isOpen={showUserManagement}
        onClose={() => setShowUserManagement(false)}
      />
    </div>
  );
};