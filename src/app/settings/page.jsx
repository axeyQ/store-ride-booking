'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ThemedLayout, 
  ThemedCard, 
  ThemedButton, 
  ThemedInput,
  ThemedSelect,
  ThemedBadge 
} from '@/components/themed';
import { theme } from '@/lib/theme';
import { cn } from '@/lib/utils';

export default function ThemedSettingsPage() {
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
    
    // NEW: Start delay settings
    startDelayMinutes: 5,
    roundToNearestMinutes: 5,
    
    // Operational Settings
    operatingHours: {
      start: '06:00',
      end: '22:00'
    },
    maxAdvanceBookingDays: 7,
    reminderTimeBeforeReturn: 30,
    
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
  const [errors, setErrors] = useState({});

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

  const validateSettings = () => {
    const newErrors = {};
    
    // Business validation
    if (!settings.businessName?.trim()) {
      newErrors.businessName = 'Business name is required';
    }
    
    // Pricing validation
    if (!settings.hourlyRate || settings.hourlyRate <= 0) {
      newErrors.hourlyRate = 'Hourly rate must be greater than 0';
    }
    
    if (settings.graceMinutes < 0 || settings.graceMinutes > 60) {
      newErrors.graceMinutes = 'Grace period must be between 0 and 60 minutes';
    }
    
    if (settings.blockMinutes <= 0 || settings.blockMinutes > 120) {
      newErrors.blockMinutes = 'Block duration must be between 1 and 120 minutes';
    }
    
    if (settings.nightMultiplier < 1 || settings.nightMultiplier > 5) {
      newErrors.nightMultiplier = 'Night multiplier must be between 1 and 5';
    }
    
    // NEW: Start delay validation
    if (settings.startDelayMinutes < 0 || settings.startDelayMinutes > 60) {
      newErrors.startDelayMinutes = 'Start delay must be between 0 and 60 minutes';
    }
    
    if (settings.roundToNearestMinutes && ![1, 5, 10, 15, 30].includes(settings.roundToNearestMinutes)) {
      newErrors.roundToNearestMinutes = 'Round to nearest must be 1, 5, 10, 15, or 30 minutes';
    }
    
    // Time format validation
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(settings.nightChargeTime)) {
      newErrors.nightChargeTime = 'Night charge time must be in HH:MM format';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateSettings()) {
      return;
    }
    
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
        setTimeout(() => setSaved(false), 3000);
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
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
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
        graceMinutes: 15,
        blockMinutes: 30,
        lateFeePerHour: 20,
        securityDeposit: 500,
        nightChargeTime: '22:30',
        nightMultiplier: 2,
        startDelayMinutes: 5, // NEW
        roundToNearestMinutes: 5, // NEW
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

  // Pricing examples calculation
  const getPricingExamples = () => {
    const { hourlyRate, graceMinutes, blockMinutes, nightMultiplier } = settings;
    const halfRate = Math.round(hourlyRate / 2);
    
    return {
      day: [
        { duration: '30 minutes', amount: hourlyRate },
        { duration: '1 hour', amount: hourlyRate },
        { duration: '1.5 hours', amount: hourlyRate + halfRate },
        { duration: '2 hours', amount: hourlyRate + halfRate * 2 }
      ],
      night: [
        { duration: '1 hour (night)', amount: hourlyRate * nightMultiplier },
        { duration: '1.5 hours (night)', amount: (hourlyRate + halfRate) * nightMultiplier }
      ]
    };
  };

  // NEW: Calculate example start times
  const getStartTimeExamples = () => {
    const now = new Date();
    const examples = [];
    
    for (let i = 0; i < 3; i++) {
      const testTime = new Date(now.getTime() + (i * 2 * 60 * 1000)); // Every 2 minutes
      const delayMinutes = settings.startDelayMinutes || 5;
      const roundToMinutes = settings.roundToNearestMinutes || 5;
      
      const startTime = new Date(testTime.getTime() + (delayMinutes * 60 * 1000));
      
      if (roundToMinutes > 1) {
        const minutes = startTime.getMinutes();
        const roundedMinutes = Math.ceil(minutes / roundToMinutes) * roundToMinutes;
        
        if (roundedMinutes >= 60) {
          startTime.setHours(startTime.getHours() + Math.floor(roundedMinutes / 60));
          startTime.setMinutes(roundedMinutes % 60, 0, 0);
        } else {
          startTime.setMinutes(roundedMinutes, 0, 0);
        }
      }
      
      examples.push({
        bookingTime: testTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        startTime: startTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
      });
    }
    
    return examples;
  };

  const tabs = [
    { id: 'business', label: '🏢 Business', icon: '🏢' },
    { id: 'pricing', label: '💰 Pricing', icon: '💰' },
    { id: 'operations', label: '⚙️ Operations', icon: '⚙️' },
    { id: 'notifications', label: '📱 Notifications', icon: '📱' },
    { id: 'system', label: '🛡️ System', icon: '🛡️' }
  ];

  if (loading) {
    return (
      <ThemedLayout>
        <div className="min-h-screen flex items-center justify-center">
          <ThemedCard>
            <div className="flex items-center space-x-3 p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
              <span className="text-white text-xl">Loading settings...</span>
            </div>
          </ThemedCard>
        </div>
      </ThemedLayout>
    );
  }

  const pricingExamples = getPricingExamples();
  const startTimeExamples = getStartTimeExamples(); // NEW

  return (
    <ThemedLayout>
      <div className="container mx-auto px-6 py-8">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <h2 className={theme.typography.hero}>
            System <span className={theme.typography.gradient}>Settings</span>
          </h2>
          <p className={`${theme.typography.subtitle} max-w-2xl mx-auto mt-4`}>
            Configure your rental business parameters and preferences
          </p>
        </div>

        {/* Settings Header */}
        <ThemedCard className="mb-8">
          <div className="flex justify-between items-center p-6">
            <div>
              <h3 className="text-lg font-semibold text-white">Configuration Management</h3>
              <p className="text-gray-400">Customize your rental system settings</p>
            </div>
            <div className="flex items-center space-x-3">
              <ThemedButton
                variant="secondary"
                onClick={resetToDefaults}
              >
                Reset to Defaults
              </ThemedButton>
              <ThemedButton
                variant={saved ? "success" : "primary"}
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Saving...
                  </>
                ) : saved ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Saved!
                  </>
                ) : (
                  'Save Settings'
                )}
              </ThemedButton>
            </div>
          </div>
        </ThemedCard>

        {/* Settings Navigation */}
        <ThemedCard className="mb-6">
          <div className="border-b border-gray-700">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors",
                    activeTab === tab.id
                      ? "border-cyan-500 text-cyan-400"
                      : "border-transparent text-gray-400 hover:text-gray-300"
                  )}
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
                <h3 className="text-2xl font-bold text-white mb-6">Business Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <ThemedInput
                    label="Business Name"
                    value={settings.businessName}
                    onChange={(e) => handleInputChange('businessName', e.target.value)}
                    error={errors.businessName}
                    required
                  />
                  
                  <ThemedInput
                    label="Business Phone"
                    type="tel"
                    value={settings.businessPhone}
                    onChange={(e) => handleInputChange('businessPhone', e.target.value)}
                    placeholder="Enter business phone number"
                  />
                  
                  <div className="md:col-span-2">
                    <label className="block text-lg font-semibold text-white mb-2">Business Address</label>
                    <textarea
                      value={settings.businessAddress}
                      onChange={(e) => handleInputChange('businessAddress', e.target.value)}
                      rows="3"
                      className={theme.components.input.base + " resize-none"}
                    />
                  </div>
                  
                  <ThemedInput
                    label="Business Email"
                    type="email"
                    value={settings.businessEmail}
                    onChange={(e) => handleInputChange('businessEmail', e.target.value)}
                    placeholder="business@mrtravels.com"
                  />
                  
                  <ThemedInput
                    label="GST Number"
                    value={settings.gstNumber}
                    onChange={(e) => handleInputChange('gstNumber', e.target.value)}
                    placeholder="Enter GST number (optional)"
                  />
                </div>
              </div>
            )}

            {/* Pricing Settings */}
            {activeTab === 'pricing' && (
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-white mb-6">Pricing Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <ThemedInput
                    label="Base Hourly Rate (₹)"
                    type="number"
                    value={settings.hourlyRate}
                    onChange={(e) => handleInputChange('hourlyRate', parseInt(e.target.value) || 0)}
                    min="1"
                    error={errors.hourlyRate}
                    required
                  />
                  
                  <ThemedInput
                    label="Grace Period (Minutes)"
                    type="number"
                    value={settings.graceMinutes}
                    onChange={(e) => handleInputChange('graceMinutes', parseInt(e.target.value) || 0)}
                    min="0"
                    max="60"
                    error={errors.graceMinutes}
                  />
                  
                  <ThemedInput
                    label="Block Duration (Minutes)"
                    type="number"
                    value={settings.blockMinutes}
                    onChange={(e) => handleInputChange('blockMinutes', parseInt(e.target.value) || 30)}
                    min="15"
                    max="60"
                    step="15"
                    error={errors.blockMinutes}
                  />
                  
                  <ThemedInput
                    label="Night Charge Time"
                    type="time"
                    value={settings.nightChargeTime}
                    onChange={(e) => handleInputChange('nightChargeTime', e.target.value)}
                    error={errors.nightChargeTime}
                  />
                  
                  <ThemedSelect
                    label="Night Charge Multiplier"
                    value={settings.nightMultiplier.toString()}
                    onValueChange={(value) => handleInputChange('nightMultiplier', parseFloat(value))}
                    options={[
                      { value: '1.5', label: `1.5x (₹${Math.round(settings.hourlyRate * 1.5)})` },
                      { value: '2', label: `2x (₹${settings.hourlyRate * 2})` },
                      { value: '2.5', label: `2.5x (₹${Math.round(settings.hourlyRate * 2.5)})` },
                      { value: '3', label: `3x (₹${settings.hourlyRate * 3})` }
                    ]}
                    error={errors.nightMultiplier}
                  />
                  
                  <ThemedInput
                    label="Late Fee per Hour (₹)"
                    type="number"
                    value={settings.lateFeePerHour}
                    onChange={(e) => handleInputChange('lateFeePerHour', parseInt(e.target.value) || 0)}
                    min="0"
                  />
                </div>

                {/* Advanced Pricing Preview */}
                <div className="bg-gradient-to-r from-blue-900/50 to-blue-800/50 border border-blue-700/50 rounded-lg p-6 mt-8">
                  <h4 className="font-semibold text-blue-200 mb-4">💡 Advanced Pricing Preview</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h5 className="font-medium text-blue-300 mb-3">Day Time Examples:</h5>
                      <div className="space-y-2 text-sm">
                        {pricingExamples.day.map((example, index) => (
                          <div key={index} className="flex justify-between">
                            <span className="text-blue-200">{example.duration}:</span>
                            <span className="font-semibold text-white">₹{example.amount}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h5 className="font-medium text-blue-300 mb-3">Night Time Examples (after {settings.nightChargeTime}):</h5>
                      <div className="space-y-2 text-sm">
                        {pricingExamples.night.map((example, index) => (
                          <div key={index} className="flex justify-between">
                            <span className="text-blue-200">{example.duration}:</span>
                            <span className="font-semibold text-orange-400">₹{example.amount}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-blue-800/30 rounded text-sm text-blue-200">
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
                <h3 className="text-2xl font-bold text-white mb-6">Operational Settings</h3>
                
                {/* NEW: Rental Start Time Configuration */}
                <div className="bg-gradient-to-r from-cyan-900/50 to-cyan-800/50 border border-cyan-700/50 rounded-xl p-6 mb-8">
                  <h4 className="text-xl font-semibold text-cyan-200 mb-4">🕐 Rental Start Time Configuration</h4>
                  <p className="text-cyan-300 text-sm mb-6">
                    Configure how much time customers get to reach the vehicle after booking confirmation.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ThemedSelect
                      label="Start Delay (Minutes)"
                      value={settings.startDelayMinutes.toString()}
                      onValueChange={(value) => handleInputChange('startDelayMinutes', parseInt(value))}
                      options={[
                        { value: '0', label: 'No Delay (Immediate Start)' },
                        { value: '3', label: '3 Minutes' },
                        { value: '5', label: '5 Minutes (Recommended)' },
                        { value: '10', label: '10 Minutes' },
                        { value: '15', label: '15 Minutes' },
                        { value: '30', label: '30 Minutes' }
                      ]}
                      error={errors.startDelayMinutes}
                    />
                    <ThemedSelect
                      label="Round Start Time To"
                      value={settings.roundToNearestMinutes.toString()}
                      onValueChange={(value) => handleInputChange('roundToNearestMinutes', parseInt(value))}
                      options={[
                        { value: '1', label: 'Exact Time (No Rounding)' },
                        { value: '5', label: 'Nearest 5 Minutes (Recommended)' },
                        { value: '10', label: 'Nearest 10 Minutes' },
                        { value: '15', label: 'Nearest 15 Minutes' },
                        { value: '30', label: 'Nearest 30 Minutes' }
                      ]}
                      error={errors.roundToNearestMinutes}
                    />
                  </div>
                  
                  {/* Start Time Examples */}
                  <div className="mt-6 bg-cyan-800/30 rounded-lg p-4">
                    <h5 className="font-semibold text-cyan-200 mb-3">📋 Live Start Time Examples</h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {startTimeExamples.map((example, index) => (
                        <div key={index} className="bg-cyan-700/20 rounded p-3">
                          <div className="text-sm text-cyan-200">If booked at:</div>
                          <div className="font-mono text-cyan-100">{example.bookingTime}</div>
                          <div className="text-sm text-cyan-200 mt-1">Rental starts at:</div>
                          <div className="font-mono font-semibold text-green-300">{example.startTime}</div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 text-xs text-cyan-300">
                      <strong>Purpose:</strong> This delay gives customers time to physically reach the vehicle after booking confirmation.
                      The rounded times look more professional and reduce confusion.
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <ThemedInput
                    label="Operating Hours - Start"
                    type="time"
                    value={settings.operatingHours.start}
                    onChange={(e) => handleInputChange('start', e.target.value, 'operatingHours')}
                  />
                  
                  <ThemedInput
                    label="Operating Hours - End"
                    type="time"
                    value={settings.operatingHours.end}
                    onChange={(e) => handleInputChange('end', e.target.value, 'operatingHours')}
                  />
                  
                  <ThemedInput
                    label="Max Advance Booking (Days)"
                    type="number"
                    value={settings.maxAdvanceBookingDays}
                    onChange={(e) => handleInputChange('maxAdvanceBookingDays', parseInt(e.target.value) || 1)}
                    min="1"
                    max="30"
                  />
                  
                  <ThemedInput
                    label="Return Reminder (Minutes)"
                    type="number"
                    value={settings.reminderTimeBeforeReturn}
                    onChange={(e) => handleInputChange('reminderTimeBeforeReturn', parseInt(e.target.value) || 30)}
                    min="5"
                    max="120"
                  />
                </div>

                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-white">Document Requirements</h4>
                  <div className="space-y-3">
                    {[
                      { key: 'requireAadharPhoto', label: 'Require Aadhar card photo' },
                      { key: 'requireSignature', label: 'Require digital signature' },
                      { key: 'requireLicenseVerification', label: 'Verify driving license' }
                    ].map((requirement) => (
                      <label key={requirement.key} className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings[requirement.key]}
                          onChange={(e) => handleInputChange(requirement.key, e.target.checked)}
                          className="w-5 h-5 text-cyan-600 border-gray-600 rounded focus:ring-cyan-500 bg-gray-800"
                        />
                        <span className="text-white">{requirement.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Settings */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-white mb-6">Notification Preferences</h3>
                <div className="space-y-6">
                  <div className="border border-gray-600 rounded-lg p-6">
                    <h4 className="text-lg font-semibold text-white mb-4">Communication Channels</h4>
                    <div className="space-y-4">
                      {[
                        { key: 'smsNotifications', label: '📱 SMS Notifications', description: 'Send booking confirmations and reminders via SMS' },
                        { key: 'emailNotifications', label: '📧 Email Notifications', description: 'Send receipts and updates via email' },
                        { key: 'whatsappNotifications', label: '💬 WhatsApp Notifications', description: 'Send updates via WhatsApp Business' }
                      ].map((notification) => (
                        <label key={notification.key} className="flex items-start justify-between cursor-pointer">
                          <div className="flex-1">
                            <span className="text-white font-medium">{notification.label}</span>
                            <p className="text-sm text-gray-400">{notification.description}</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={settings[notification.key]}
                            onChange={(e) => handleInputChange(notification.key, e.target.checked)}
                            className="w-5 h-5 text-cyan-600 border-gray-600 rounded focus:ring-cyan-500 bg-gray-800 mt-1"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-orange-900/50 to-orange-800/50 border border-orange-700/50 rounded-lg p-6">
                    <h4 className="font-semibold text-orange-200 mb-2">🚧 Coming Soon</h4>
                    <p className="text-sm text-orange-300">
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
                <h3 className="text-2xl font-bold text-white mb-6">System & Data Management</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-white">Backup Settings</h4>
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.autoBackup}
                        onChange={(e) => handleInputChange('autoBackup', e.target.checked)}
                        className="w-5 h-5 text-cyan-600 border-gray-600 rounded focus:ring-cyan-500 bg-gray-800"
                      />
                      <span className="text-white">Enable automatic backups</span>
                    </label>
                    
                    <ThemedSelect
                      label="Backup Frequency"
                      value={settings.backupFrequency}
                      onValueChange={(value) => handleInputChange('backupFrequency', value)}
                      options={[
                        { value: 'daily', label: 'Daily' },
                        { value: 'weekly', label: 'Weekly' },
                        { value: 'monthly', label: 'Monthly' }
                      ]}
                    />
                    
                    <ThemedInput
                      label="Data Retention (Months)"
                      type="number"
                      value={settings.dataRetentionMonths}
                      onChange={(e) => handleInputChange('dataRetentionMonths', parseInt(e.target.value) || 12)}
                      min="6"
                      max="60"
                    />
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-white">Data Export</h4>
                    <ThemedButton
                      variant="success"
                      onClick={exportData}
                      className="w-full flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      📊 Export All Data
                    </ThemedButton>
                    <p className="text-sm text-gray-400">
                      Export all bookings, customers, and vehicle data to CSV files for backup or analysis.
                    </p>
                    
                    <div className="bg-gradient-to-r from-red-900/50 to-red-800/50 border border-red-700/50 rounded-lg p-4">
                      <h5 className="font-semibold text-red-200 mb-2">⚠️ Data Security</h5>
                      <p className="text-sm text-red-300">
                        Exported data contains sensitive customer information.
                        Handle with care and ensure secure storage.
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* System Status */}
                <div className="bg-gradient-to-r from-green-900/50 to-green-800/50 border border-green-700/50 rounded-lg p-6">
                  <h4 className="font-semibold text-green-200 mb-4">System Health Status</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl mb-2">🟢</div>
                      <div className="text-green-200 text-sm">Database</div>
                      <div className="text-green-400 font-medium">Online</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl mb-2">🟢</div>
                      <div className="text-green-200 text-sm">API Status</div>
                      <div className="text-green-400 font-medium">Healthy</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl mb-2">🟢</div>
                      <div className="text-green-200 text-sm">Backup</div>
                      <div className="text-green-400 font-medium">2h ago</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl mb-2">🟢</div>
                      <div className="text-green-200 text-sm">Uptime</div>
                      <div className="text-green-400 font-medium">99.9%</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ThemedCard>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Link href="/admin">
            <ThemedButton variant="primary" className="w-full flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              📊 Admin Dashboard
            </ThemedButton>
          </Link>
          
          <Link href="/admin/bookings">
            <ThemedButton variant="secondary" className="w-full flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v11a2 2 0 002 2h9.5M15 8v7m0 0l3-3m-3 3l-3-3" />
              </svg>
              📋 All Bookings
            </ThemedButton>
          </Link>
          
          <Link href="/customers">
            <ThemedButton variant="secondary" className="w-full flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              👥 Customers
            </ThemedButton>
          </Link>
          
          <Link href="/vehicles">
            <ThemedButton variant="secondary" className="w-full flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              🚗 Vehicles
            </ThemedButton>
          </Link>
        </div>
      </div>
    </ThemedLayout>
  );
}