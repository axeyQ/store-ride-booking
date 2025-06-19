'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    // Business Settings
    businessName: 'MR Travels',
    businessAddress: 'Bhopal, Madhya Pradesh',
    businessPhone: '',
    businessEmail: '',
    gstNumber: '',
    
    // Pricing Settings
    hourlyRate: 80,
    minimumHours: 1,
    graceMinutes: 15,
    blockMinutes: 30,
    lateFeePerHour: 20,
    securityDeposit: 500,
    nightChargeTime: '22:30',
    nightMultiplier: 2,
    
    // Operational Settings
    operatingHours: {
      start: '06:00',
      end: '22:00'
    },
    maxAdvanceBookingDays: 7,
    reminderTimeBeforeReturn: 30, // minutes
    
    // Notification Settings
    smsNotifications: true,
    emailNotifications: false,
    whatsappNotifications: false,
    
    // System Settings
    autoBackup: true,
    backupFrequency: 'daily',
    dataRetentionMonths: 12,
    
    // Document Settings
    requireAadharPhoto: true,
    requireSignature: true,
    requireLicenseVerification: true
  });

  const [activeTab, setActiveTab] = useState('business');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      const data = await response.json();
      
      if (data.success) {
        setSettings(prev => ({ ...prev, ...data.settings }));
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        alert('Error saving settings: ' + data.error);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field, value, section = null) => {
    if (section) {
      setSettings(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value
        }
      }));
    } else {
      setSettings(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const resetToDefaults = () => {
    if (confirm('Are you sure you want to reset all settings to default values?')) {
      setSettings({
        businessName: 'MR Travels',
        businessAddress: 'Bhopal, Madhya Pradesh',
        businessPhone: '',
        businessEmail: '',
        gstNumber: '',
        hourlyRate: 80,
        minimumHours: 1,
        lateFeePerHour: 20,
        securityDeposit: 500,
        operatingHours: { start: '06:00', end: '22:00' },
        maxAdvanceBookingDays: 7,
        reminderTimeBeforeReturn: 30,
        smsNotifications: true,
        emailNotifications: false,
        whatsappNotifications: false,
        autoBackup: true,
        backupFrequency: 'daily',
        dataRetentionMonths: 12,
        requireAadharPhoto: true,
        requireSignature: true,
        requireLicenseVerification: true
      });
    }
  };

  const exportData = async () => {
    try {
      window.open('/api/admin/export-all-data', '_blank');
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Export failed. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-xl">Loading settings...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-blue-600 hover:text-blue-800">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={resetToDefaults}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium"
              >
                Reset to Defaults
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className={`px-6 py-2 rounded-lg font-medium ${
                  saving
                    ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                    : saved
                    ? 'bg-green-600 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Settings Navigation */}
        <div className="bg-white rounded-xl shadow-lg mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'business', label: '🏢 Business', icon: '🏢' },
                { id: 'pricing', label: '💰 Pricing', icon: '💰' },
                { id: 'operations', label: '⚙️ Operations', icon: '⚙️' },
                { id: 'notifications', label: '📱 Notifications', icon: '📱' },
                { id: 'system', label: '🛡️ System', icon: '🛡️' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-8">
            {/* Business Settings */}
            {activeTab === 'business' && (
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Business Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Business Name</label>
                    <input
                      type="text"
                      value={settings.businessName}
                      onChange={(e) => handleInputChange('businessName', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Business Phone</label>
                    <input
                      type="tel"
                      value={settings.businessPhone}
                      onChange={(e) => handleInputChange('businessPhone', e.target.value)}
                      placeholder="Enter business phone number"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Business Address</label>
                    <textarea
                      value={settings.businessAddress}
                      onChange={(e) => handleInputChange('businessAddress', e.target.value)}
                      rows="3"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Business Email</label>
                    <input
                      type="email"
                      value={settings.businessEmail}
                      onChange={(e) => handleInputChange('businessEmail', e.target.value)}
                      placeholder="business@mrtravels.com"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">GST Number</label>
                    <input
                      type="text"
                      value={settings.gstNumber}
                      onChange={(e) => handleInputChange('gstNumber', e.target.value)}
                      placeholder="Enter GST number (optional)"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Pricing Settings */}
            {activeTab === 'pricing' && (
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Pricing Configuration</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Base Hourly Rate (₹)</label>
                    <input
                      type="number"
                      value={settings.hourlyRate}
                      onChange={(e) => handleInputChange('hourlyRate', parseInt(e.target.value) || 0)}
                      min="1"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-sm text-gray-500 mt-1">Base rate for first period</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Grace Period (Minutes)</label>
                    <input
                      type="number"
                      value={settings.graceMinutes}
                      onChange={(e) => handleInputChange('graceMinutes', parseInt(e.target.value) || 0)}
                      min="0"
                      max="60"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-sm text-gray-500 mt-1">Free minutes added to first hour</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Block Duration (Minutes)</label>
                    <input
                      type="number"
                      value={settings.blockMinutes}
                      onChange={(e) => handleInputChange('blockMinutes', parseInt(e.target.value) || 30)}
                      min="15"
                      max="60"
                      step="15"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-sm text-gray-500 mt-1">Duration of subsequent billing blocks</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Night Charge Time</label>
                    <input
                      type="time"
                      value={settings.nightChargeTime}
                      onChange={(e) => handleInputChange('nightChargeTime', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-sm text-gray-500 mt-1">When night charges begin (e.g., 22:30 = 10:30 PM)</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Night Charge Multiplier</label>
                    <select
                      value={settings.nightMultiplier}
                      onChange={(e) => handleInputChange('nightMultiplier', parseFloat(e.target.value))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="1.5">1.5x (₹{Math.round(settings.hourlyRate * 1.5)})</option>
                      <option value="2">2x (₹{settings.hourlyRate * 2})</option>
                      <option value="2.5">2.5x (₹{Math.round(settings.hourlyRate * 2.5)})</option>
                      <option value="3">3x (₹{settings.hourlyRate * 3})</option>
                    </select>
                    <p className="text-sm text-gray-500 mt-1">Multiplier for night charges</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Late Fee per Hour (₹)</label>
                    <input
                      type="number"
                      value={settings.lateFeePerHour}
                      onChange={(e) => handleInputChange('lateFeePerHour', parseInt(e.target.value) || 0)}
                      min="0"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-sm text-gray-500 mt-1">Additional penalty for overdue returns</p>
                  </div>
                </div>
                
                {/* Advanced Pricing Preview */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
                  <h4 className="font-semibold text-blue-900 mb-4">💡 Advanced Pricing Preview</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h5 className="font-medium text-blue-800 mb-3">Day Time Examples:</h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>0-{60 + settings.graceMinutes} minutes:</span>
                          <span className="font-semibold">₹{settings.hourlyRate}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Up to {60 + settings.graceMinutes + settings.blockMinutes} minutes:</span>
                          <span className="font-semibold">₹{settings.hourlyRate + Math.round(settings.hourlyRate / 2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Up to {60 + settings.graceMinutes + settings.blockMinutes * 2} minutes:</span>
                          <span className="font-semibold">₹{settings.hourlyRate + Math.round(settings.hourlyRate / 2) * 2}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h5 className="font-medium text-blue-800 mb-3">Night Time Examples (after {settings.nightChargeTime}):</h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>First period (crosses night time):</span>
                          <span className="font-semibold text-orange-600">₹{settings.hourlyRate * settings.nightMultiplier}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>30-min blocks (crosses night time):</span>
                          <span className="font-semibold text-orange-600">₹{Math.round(settings.hourlyRate / 2) * settings.nightMultiplier}</span>
                        </div>
                        <div className="text-xs text-blue-700 mt-2">
                          Night charges apply to blocks that cross {settings.nightChargeTime}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 p-3 bg-blue-100 rounded text-sm text-blue-800">
                    <strong>Billing Structure:</strong> First {60 + settings.graceMinutes} minutes = ₹{settings.hourlyRate}, 
                    then ₹{Math.round(settings.hourlyRate / 2)} per {settings.blockMinutes}-minute block. 
                    Night multiplier (×{settings.nightMultiplier}) applies to any block crossing {settings.nightChargeTime}.
                  </div>
                </div>
              </div>
            )}

            {/* Operations Settings */}
            {activeTab === 'operations' && (
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Operational Settings</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Operating Hours - Start</label>
                    <input
                      type="time"
                      value={settings.operatingHours.start}
                      onChange={(e) => handleInputChange('start', e.target.value, 'operatingHours')}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Operating Hours - End</label>
                    <input
                      type="time"
                      value={settings.operatingHours.end}
                      onChange={(e) => handleInputChange('end', e.target.value, 'operatingHours')}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Max Advance Booking (Days)</label>
                    <input
                      type="number"
                      value={settings.maxAdvanceBookingDays}
                      onChange={(e) => handleInputChange('maxAdvanceBookingDays', parseInt(e.target.value) || 1)}
                      min="1"
                      max="30"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Return Reminder (Minutes)</label>
                    <input
                      type="number"
                      value={settings.reminderTimeBeforeReturn}
                      onChange={(e) => handleInputChange('reminderTimeBeforeReturn', parseInt(e.target.value) || 30)}
                      min="5"
                      max="120"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-sm text-gray-500 mt-1">Send reminder before expected return</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-900">Document Requirements</h4>
                  
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.requireAadharPhoto}
                        onChange={(e) => handleInputChange('requireAadharPhoto', e.target.checked)}
                        className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-3 text-sm font-medium text-gray-700">Require Aadhar card photo</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.requireSignature}
                        onChange={(e) => handleInputChange('requireSignature', e.target.checked)}
                        className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-3 text-sm font-medium text-gray-700">Require digital signature</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.requireLicenseVerification}
                        onChange={(e) => handleInputChange('requireLicenseVerification', e.target.checked)}
                        className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-3 text-sm font-medium text-gray-700">Verify driving license</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Settings */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Notification Preferences</h3>
                
                <div className="space-y-6">
                  <div className="border border-gray-200 rounded-lg p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Communication Channels</h4>
                    
                    <div className="space-y-4">
                      <label className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-medium text-gray-700">📱 SMS Notifications</span>
                          <p className="text-sm text-gray-500">Send booking confirmations and reminders via SMS</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.smsNotifications}
                          onChange={(e) => handleInputChange('smsNotifications', e.target.checked)}
                          className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </label>
                      
                      <label className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-medium text-gray-700">📧 Email Notifications</span>
                          <p className="text-sm text-gray-500">Send receipts and updates via email</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.emailNotifications}
                          onChange={(e) => handleInputChange('emailNotifications', e.target.checked)}
                          className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </label>
                      
                      <label className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-medium text-gray-700">💬 WhatsApp Notifications</span>
                          <p className="text-sm text-gray-500">Send updates via WhatsApp Business</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.whatsappNotifications}
                          onChange={(e) => handleInputChange('whatsappNotifications', e.target.checked)}
                          className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </label>
                    </div>
                  </div>
                  
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                    <h4 className="font-semibold text-yellow-900 mb-2">🚧 Coming Soon</h4>
                    <p className="text-sm text-yellow-800">
                      Notification features will be implemented in the next update. 
                      Configure your preferences now for when they become available.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* System Settings */}
            {activeTab === 'system' && (
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">System & Data Management</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-gray-900">Backup Settings</h4>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.autoBackup}
                        onChange={(e) => handleInputChange('autoBackup', e.target.checked)}
                        className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-3 text-sm font-medium text-gray-700">Enable automatic backups</span>
                    </label>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Backup Frequency</label>
                      <select
                        value={settings.backupFrequency}
                        onChange={(e) => handleInputChange('backupFrequency', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Data Retention (Months)</label>
                      <input
                        type="number"
                        value={settings.dataRetentionMonths}
                        onChange={(e) => handleInputChange('dataRetentionMonths', parseInt(e.target.value) || 12)}
                        min="6"
                        max="60"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-sm text-gray-500 mt-1">How long to keep completed booking data</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-gray-900">Data Export</h4>
                    
                    <button
                      onClick={exportData}
                      className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-medium"
                    >
                      📊 Export All Data
                    </button>
                    
                    <p className="text-sm text-gray-500">
                      Export all bookings, customers, and vehicle data to CSV files for backup or analysis.
                    </p>
                    
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <h5 className="font-semibold text-red-900 mb-2">⚠️ Data Security</h5>
                      <p className="text-sm text-red-800">
                        Exported data contains sensitive customer information. 
                        Handle with care and ensure secure storage.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Link
              href="/admin"
              className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg text-center font-medium"
            >
              📊 Admin Dashboard
            </Link>
            <Link
              href="/admin/bookings"
              className="bg-green-600 hover:bg-green-700 text-white p-4 rounded-lg text-center font-medium"
            >
              📋 All Bookings
            </Link>
            <Link
              href="/customers"
              className="bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-lg text-center font-medium"
            >
              👥 Customers
            </Link>
            <Link
              href="/vehicles"
              className="bg-orange-600 hover:bg-orange-700 text-white p-4 rounded-lg text-center font-medium"
            >
              🚗 Vehicles
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}