// src/components/LoginPage.jsx
'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, User, Lock, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

const LoginPage = () => {
  const { login, loading, error, clearError, initializeSystem } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    rememberMe: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [initMessage, setInitMessage] = useState('');

  // Clear error when component mounts or form changes
  useEffect(() => {
    clearError();
  }, [formData.username, formData.password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();

    if (!formData.username.trim() || !formData.password) {
      return;
    }

    const result = await login(formData.username, formData.password, formData.rememberMe);
    
    // If login fails with specific error codes, handle accordingly
    if (!result.success && result.code === 'INVALID_CREDENTIALS') {
      // Could check if system needs initialization
    }
  };

  const handleInitialize = async () => {
    setIsInitializing(true);
    setInitMessage('');
    
    const result = await initializeSystem();
    
    if (result.success) {
      setInitMessage('System initialized successfully! You can now login with the default credentials.');
    } else {
      setInitMessage(result.error || 'Failed to initialize system');
    }
    
    setIsInitializing(false);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-6 relative">
      {/* Background Pattern - Simple dots */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)',
          backgroundSize: '20px 20px'
        }}></div>
      </div>
      
      {/* Login Card */}
      <div className="relative w-full max-w-md">
        <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-cyan-500/20">
              <span className="text-white font-bold text-2xl">MR</span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
            <p className="text-gray-400">Sign in to MR Travels Management System</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-900/50 border border-red-700/50 rounded-lg flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Init Message */}
          {initMessage && (
            <div className={`mb-6 p-4 rounded-lg flex items-center space-x-3 ${
              initMessage.includes('successfully') 
                ? 'bg-green-900/50 border border-green-700/50' 
                : 'bg-red-900/50 border border-red-700/50'
            }`}>
              <CheckCircle className={`w-5 h-5 flex-shrink-0 ${
                initMessage.includes('successfully') ? 'text-green-400' : 'text-red-400'
              }`} />
              <div className="flex-1">
                <p className={`text-sm ${
                  initMessage.includes('successfully') ? 'text-green-200' : 'text-red-200'
                }`}>{initMessage}</p>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username Field */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={formData.username}
                  onChange={handleInputChange}
                  className="appearance-none relative block w-full pl-10 pr-3 py-3 border border-gray-600 placeholder-gray-500 text-white rounded-lg bg-gray-800/50 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 focus:z-10 transition-colors"
                  placeholder="Enter your username"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="appearance-none relative block w-full pl-10 pr-10 py-3 border border-gray-600 placeholder-gray-500 text-white rounded-lg bg-gray-800/50 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 focus:z-10 transition-colors"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-500 hover:text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-500 hover:text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="rememberMe"
                  name="rememberMe"
                  type="checkbox"
                  checked={formData.rememberMe}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-gray-600 rounded bg-gray-800"
                />
                <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-300">
                  Remember me for 30 days
                </label>
              </div>
            </div>

            {/* Login Button */}
            <div>
              <button
                type="submit"
                disabled={loading || !formData.username.trim() || !formData.password}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-cyan-500/20"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </div>
          </form>



          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-xs text-gray-500">
              MR Travels Management System v1.0
            </p>
            <p className="text-xs text-gray-500 mt-1">
              © 2025 MR Travels. All rights reserved.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default LoginPage;