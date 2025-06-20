'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ThemedLayout, 
  ThemedCard, 
  ThemedButton, 
  ThemedInput, 
  ThemedSelect,
  ThemedBadge 
} from '@/components/themed';
import SignatureCanvas from '@/components/SignatureCanvas';
import { validatePhoneNumber, validateDrivingLicense } from '@/lib/validations';
import { theme } from '@/lib/theme';
import { cn } from '@/lib/utils';

export default function EnhancedBookingClientPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [availableVehicles, setAvailableVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [settings, setSettings] = useState({ hourlyRate: 80, businessName: 'MR Travels' });

  // Customer autocomplete state
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const nameInputRef = useRef(null);
  const suggestionsRef = useRef(null);

  // Form state
  const [bookingData, setBookingData] = useState({
    vehicleId: '',
    selectedVehicle: null,
    customer: {
      name: '',
      phone: '',
      driverLicense: ''
    },
    checklist: {
      helmetProvided: false,
      aadharCardCollected: false,
      vehicleInspected: false
    },
    additionalNotes: '',
    signature: '',
    termsAccepted: false
  });

  useEffect(() => {
    fetchAvailableVehicles();
    fetchSettings();
    const customerId = searchParams.get('customerId');
    if (customerId) {
      fetchCustomerDetails(customerId);
    }
  }, []);

  // Debounce customer search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (bookingData.customer.name.length >= 2) {
        searchCustomers(bookingData.customer.name);
      } else {
        setCustomerSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [bookingData.customer.name]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target) &&
          nameInputRef.current && !nameInputRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchCustomers = async (query) => {
    if (query.length < 2) return;
    
    try {
      setSearchingCustomers(true);
      const response = await fetch(`/api/customers/search?q=${encodeURIComponent(query)}&limit=8`);
      const data = await response.json();
      
      if (data.success) {
        setCustomerSuggestions(data.customers);
        setShowSuggestions(data.customers.length > 0);
      }
    } catch (error) {
      console.error('Error searching customers:', error);
    } finally {
      setSearchingCustomers(false);
    }
  };

  const selectCustomer = (customer) => {
    setBookingData(prev => ({
      ...prev,
      customer: {
        name: customer.name,
        phone: customer.phone,
        driverLicense: customer.driverLicense
      }
    }));
    setSelectedCustomerId(customer._id);
    setShowSuggestions(false);
    setCustomerSuggestions([]);
  };

  const clearCustomerSelection = () => {
    setSelectedCustomerId(null);
    setBookingData(prev => ({
      ...prev,
      customer: {
        name: '',
        phone: '',
        driverLicense: ''
      }
    }));
  };

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      const data = await response.json();
      if (data.success) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const fetchCustomerDetails = async (customerId) => {
    try {
      const response = await fetch(`/api/customers/${customerId}`);
      const data = await response.json();
      if (data.success) {
        setBookingData(prev => ({
          ...prev,
          customer: {
            name: data.customer.name,
            phone: data.customer.phone,
            driverLicense: data.customer.driverLicense
          }
        }));
        setSelectedCustomerId(customerId);
      }
    } catch (error) {
      console.error('Error fetching customer:', error);
    }
  };

  const fetchAvailableVehicles = async () => {
    try {
      const response = await fetch('/api/vehicles/available');
      const data = await response.json();
      if (data.success) {
        setAvailableVehicles(data.vehicles);
      }
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVehicleSelect = (vehicle) => {
    setBookingData(prev => ({
      ...prev,
      vehicleId: vehicle._id,
      selectedVehicle: vehicle
    }));
  };

  const handleCustomerChange = (field, value) => {
    setBookingData(prev => ({
      ...prev,
      customer: {
        ...prev.customer,
        [field]: value
      }
    }));

    // Clear selected customer if name is manually changed
    if (field === 'name' && selectedCustomerId) {
      setSelectedCustomerId(null);
    }
  };

  const handleChecklistChange = (field, value) => {
    setBookingData(prev => ({
      ...prev,
      checklist: {
        ...prev.checklist,
        [field]: value
      }
    }));
  };

  const handleSignatureChange = (signatureData) => {
    setBookingData(prev => ({
      ...prev,
      signature: signatureData
    }));
  };

  const handleNext = () => {
    setCurrentStep(prev => Math.min(prev + 1, 4));
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const canProceedFromStep = (step) => {
    switch (step) {
      case 1:
        return bookingData.vehicleId;
      case 2:
        return bookingData.customer.name.trim() &&
               validatePhoneNumber(bookingData.customer.phone) &&
               validateDrivingLicense(bookingData.customer.driverLicense);
      case 3:
        return bookingData.checklist.helmetProvided &&
               bookingData.checklist.aadharCardCollected &&
               bookingData.checklist.vehicleInspected;
      case 4:
        return bookingData.signature && bookingData.termsAccepted;
      default:
        return true;
    }
  };

  const handleCompleteBooking = async () => {
    if (!canProceedFromStep(4)) return;
    setSubmitting(true);
    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId: bookingData.vehicleId,
          customer: bookingData.customer,
          signature: bookingData.signature,
          helmetProvided: bookingData.checklist.helmetProvided,
          aadharCardCollected: bookingData.checklist.aadharCardCollected,
          vehicleInspected: bookingData.checklist.vehicleInspected,
          additionalNotes: bookingData.additionalNotes
        })
      });
      const data = await response.json();
      if (data.success) {
        router.push(`/booking/confirmation/${data.booking.bookingId}`);
      } else {
        alert('Error creating booking: ' + data.error);
      }
    } catch (error) {
      console.error('Error creating booking:', error);
      alert('Error creating booking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStepTitle = (step) => {
    switch (step) {
      case 1: return 'Select Vehicle';
      case 2: return 'Customer Information';
      case 3: return 'Pre-Rental Checklist';
      case 4: return 'Terms & Digital Signature';
      default: return 'Booking';
    }
  };

  const formatLastVisit = (date) => {
    const now = new Date();
    const visitDate = new Date(date);
    const diffDays = Math.ceil((now - visitDate) / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays} days ago`;
    return visitDate.toLocaleDateString('en-IN');
  };

  if (loading) {
    return (
      <ThemedLayout>
        <div className="min-h-screen flex items-center justify-center">
          <ThemedCard>
            <div className="flex items-center space-x-3 p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
              <span className="text-white text-xl">Loading available vehicles...</span>
            </div>
          </ThemedCard>
        </div>
      </ThemedLayout>
    );
  }

  return (
    <ThemedLayout>
      <div className="container mx-auto px-6 py-8">
        {/* Progress Header */}
        <ThemedCard className="mb-8">
          <div className="flex justify-between items-center p-6">
            <div>
              <h1 className={theme.typography.title}>New Booking</h1>
              <p className="text-gray-400">Step {currentStep} of 4 - {getStepTitle(currentStep)}</p>
            </div>
            <ThemedBadge color="cyan">
              {currentStep}/4 Complete
            </ThemedBadge>
          </div>
          
          {/* Progress Bar */}
          <div className="px-6 pb-6">
            <div className="flex items-center">
              {[1, 2, 3, 4].map((step) => (
                <div key={step} className="flex items-center flex-1">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all",
                    step <= currentStep
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white'
                      : 'bg-gray-600 text-gray-300'
                  )}>
                    {step}
                  </div>
                  {step < 4 && (
                    <div className={cn(
                      "flex-1 h-2 mx-3 rounded-full transition-all",
                      step < currentStep 
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-500' 
                        : 'bg-gray-600'
                    )} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </ThemedCard>

        {/* Step 1: Vehicle Selection */}
        {currentStep === 1 && (
          <ThemedCard title="Select Vehicle">
            <div className="space-y-8">
              {/* Vehicle Selection */}
              <div>
                <h3 className="text-xl font-bold text-white mb-6">Available Vehicles</h3>
                {availableVehicles.length === 0 ? (
                  <ThemedCard className="text-center p-12">
                    <div className="text-gray-400 text-xl mb-4">
                      No vehicles available for booking
                    </div>
                    <Link href="/vehicles">
                      <ThemedButton variant="secondary">
                        Manage Vehicles →
                      </ThemedButton>
                    </Link>
                  </ThemedCard>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-2 gap-6">
                    {availableVehicles.map((vehicle) => (
                      <ThemedCard
                        key={vehicle._id}
                        className={cn(
                          "cursor-pointer transition-all duration-300",
                          bookingData.vehicleId === vehicle._id
                            ? 'border-cyan-500 bg-cyan-500/10'
                            : 'hover:border-gray-500'
                        )}
                        onClick={() => handleVehicleSelect(vehicle)}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-xl font-bold text-white capitalize">
                              {vehicle.type} - {vehicle.model}
                            </h3>
                            <p className="text-gray-400 text-lg font-mono">{vehicle.plateNumber}</p>
                            <ThemedBadge status="available" className="mt-2">
                              Available
                            </ThemedBadge>
                          </div>
                          {bookingData.vehicleId === vehicle._id && (
                            <div className="text-cyan-400">
                              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </div>
                      </ThemedCard>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ThemedCard>
        )}

        {/* Step 2: Customer Information with Smart Autocomplete */}
        {currentStep === 2 && (
          <ThemedCard title="Customer Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Enhanced Name Input with Autocomplete */}
              <div className="relative">
                <div ref={nameInputRef}>
                  <ThemedInput
                    label="Full Name *"
                    value={bookingData.customer.name}
                    onChange={(e) => handleCustomerChange('name', e.target.value)}
                    placeholder="Enter customer's full name"
                    className={selectedCustomerId ? 'border-green-500' : ''}
                  />
                </div>

                {/* Customer Selection Status */}
                {selectedCustomerId && (
                  <div className="mt-2 flex items-center justify-between bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-green-400">✓</span>
                      <span className="text-green-300 text-sm">Existing customer selected</span>
                    </div>
                    <button
                      onClick={clearCustomerSelection}
                      className="text-red-400 hover:text-red-300 text-sm underline"
                    >
                      Clear & create new
                    </button>
                  </div>
                )}

                {/* Loading indicator */}
                {searchingCustomers && (
                  <div className="mt-2 text-gray-400 text-sm flex items-center gap-2">
                    <div className="animate-spin rounded-full h-3 w-3 border-b border-cyan-400"></div>
                    Searching customers...
                  </div>
                )}

                {/* Customer Suggestions Dropdown */}
                {showSuggestions && customerSuggestions.length > 0 && (
                  <div 
                    ref={suggestionsRef}
                    className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-xl max-h-80 overflow-y-auto"
                  >
                    <div className="p-2 border-b border-gray-700">
                      <div className="text-gray-400 text-xs">Found {customerSuggestions.length} existing customers</div>
                    </div>
                    
                    {customerSuggestions.map((customer) => (
                      <div
                        key={customer._id}
                        onClick={() => selectCustomer(customer)}
                        className="p-4 hover:bg-gray-700 cursor-pointer border-b border-gray-700 last:border-b-0 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-green-400">🟢</span>
                              <span className="font-medium text-white">{customer.name}</span>
                              {customer.totalBookings >= 10 && (
                                <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded">
                                  VIP
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-400">
                              📞 {customer.phone} • 🆔 {customer.driverLicense}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {customer.totalBookings} bookings • Last visit: {formatLastVisit(customer.lastVisit)}
                            </div>
                          </div>
                          <div className="text-gray-500">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Option to create new customer */}
                    <div className="p-4 bg-gray-750 border-t border-gray-600">
                      <div className="flex items-center gap-2 text-cyan-400">
                        <span>➕</span>
                        <span className="text-sm">"{bookingData.customer.name}" - Create new customer</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <ThemedInput
                label="Phone Number *"
                type="tel"
                value={bookingData.customer.phone}
                onChange={(e) => handleCustomerChange('phone', e.target.value)}
                placeholder="Enter 10-digit phone number"
                error={bookingData.customer.phone && !validatePhoneNumber(bookingData.customer.phone) 
                  ? 'Please enter a valid 10-digit phone number' : ''}
                maxLength="10"
                className={selectedCustomerId ? 'border-green-500' : ''}
                disabled={selectedCustomerId}
              />
              
              <ThemedInput
                label="Driver License Number *"
                value={bookingData.customer.driverLicense}
                onChange={(e) => handleCustomerChange('driverLicense', e.target.value.toUpperCase())}
                placeholder="e.g., MP1420110012345"
                error={bookingData.customer.driverLicense && !validateDrivingLicense(bookingData.customer.driverLicense) 
                  ? 'Please enter a valid driving license number' : ''}
                className={selectedCustomerId ? 'border-green-500' : ''}
                disabled={selectedCustomerId}
              />
            </div>
          </ThemedCard>
        )}

        {/* Step 3: Pre-Rental Checklist */}
        {currentStep === 3 && (
          <ThemedCard title="Pre-Rental Checklist">
            <div className="space-y-6">
              {[
                { key: 'helmetProvided', label: 'Helmet Provided', icon: '🪖' },
                { key: 'aadharCardCollected', label: 'Aadhar Card Collected', icon: '📄' },
                { key: 'vehicleInspected', label: 'Vehicle Inspected', icon: '🔍' }
              ].map((item) => (
                <ThemedCard 
                  key={item.key}
                  className={cn(
                    "cursor-pointer transition-all",
                    bookingData.checklist[item.key] 
                      ? 'border-green-500 bg-green-500/10' 
                      : 'border-gray-600 hover:border-gray-500'
                  )}
                  onClick={() => handleChecklistChange(item.key, !bookingData.checklist[item.key])}
                >
                  <div className="flex items-center justify-between p-6">
                    <div className="flex items-center space-x-4">
                      <span className="text-3xl">{item.icon}</span>
                      <div>
                        <h3 className="text-xl font-semibold text-white">{item.label}</h3>
                        <p className="text-gray-400">Required for rental</p>
                      </div>
                    </div>
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center",
                      bookingData.checklist[item.key] 
                        ? 'bg-green-500 text-white' 
                        : 'bg-gray-600 text-gray-300'
                    )}>
                      {bookingData.checklist[item.key] ? '✓' : '○'}
                    </div>
                  </div>
                </ThemedCard>
              ))}

              <ThemedInput
                label="Additional Notes (Optional)"
                value={bookingData.additionalNotes}
                onChange={(e) => setBookingData(prev => ({ ...prev, additionalNotes: e.target.value }))}
                placeholder="Any additional notes or observations..."
              />
            </div>
          </ThemedCard>
        )}

        {/* Step 4: Terms & Digital Signature */}
        {currentStep === 4 && (
          <ThemedCard title="Terms & Digital Signature">
            <div className="space-y-8">
              {/* Final Booking Summary */}
              <div className={`${theme.colors.stats.revenue.bg} ${theme.colors.stats.revenue.border} rounded-lg p-6`}>
                <h3 className="text-xl font-bold text-green-200 mb-4">Booking Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-green-200">
                      <span className="font-medium">Customer:</span> {bookingData.customer.name}
                      {selectedCustomerId && <span className="text-green-400 ml-2">✓ Existing</span>}
                    </p>
                    <p className="text-green-200"><span className="font-medium">Phone:</span> {bookingData.customer.phone}</p>
                    <p className="text-green-200"><span className="font-medium">License:</span> {bookingData.customer.driverLicense}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-green-200"><span className="font-medium">Vehicle:</span> {bookingData.selectedVehicle?.model} ({bookingData.selectedVehicle?.plateNumber})</p>
                    <p className="text-green-200"><span className="font-medium">Rate:</span> ₹{settings.hourlyRate}/hour</p>
                    <p className="text-green-200"><span className="font-medium">Payment:</span> On Return</p>
                  </div>
                </div>
              </div>

              {/* Terms & Conditions */}
              <div className="space-y-4">
                <label className="flex items-start space-x-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bookingData.termsAccepted}
                    onChange={(e) => setBookingData(prev => ({ ...prev, termsAccepted: e.target.checked }))}
                    className="w-6 h-6 text-cyan-600 border-2 border-gray-300 rounded focus:ring-cyan-500 mt-1"
                  />
                  <div className="text-lg font-medium text-white">
                    I have read and agree to the rental terms and conditions. I understand that:
                    <ul className="mt-2 text-sm text-gray-300 list-disc list-inside space-y-1">
                      <li>Bring your <strong>Aadhar Card</strong> and <strong>Driving License</strong> at the pickup time</li>
                      <li>Rate is <strong>₹{settings.hourlyRate}</strong> per hour</li>
                      <li>For first hour the amount will be <strong>₹{settings.hourlyRate}</strong> even after you come within a minute after pickup time.</li>
                      <li>For first 75 minutes (base hour + 15 minutes grace period), amount will be <strong>₹{settings.hourlyRate}</strong>, but after that in each 30 minute block the amount <strong>₹{(settings.hourlyRate)/2} will be added.</strong></li>
                      <li>Either you need to provide your <strong>Aadhar Card</strong> or a security deposit of <strong>₹ 500</strong>, it will be returned once you return the vehicle in provided condition.</li>
                      <li>Please wear the helmet(provided by the firm) and follow traffic rules. If you are caught by police, you are <strong>solely responsible</strong> and have to <strong>pay the required fines</strong>.</li>
                      <li>If any damage is found on the vehicle then you have to pay the repair cost.</li>
                      <li>If you do not return before 10:00 P.M then <strong>₹{settings.hourlyRate}</strong> extra will be charged for that hour that is <strong>₹{settings.hourlyRate + settings.hourlyRate}</strong></li>
                      <li>If you are not able to return the vehicle before 10:30 P.M then store will be closed and you'll have return it back in the morning with <strong>₹500</strong> fine.</li>
                      <li>If <strong>3 people</strong> are found on a single vehicle then <strong>₹500</strong> fine will be charged.</li>
                      <li>You'll get the fuel till the fuel station and if by some reason fuel is done for then you can call us and we'll provide the fuel so that you can reach the fuel station.</li>
                    </ul>
                  </div>
                </label>
              </div>

              {/* Digital Signature */}
              <div>
                <h4 className="text-lg font-semibold text-white mb-4">Customer Signature *</h4>
                <ThemedCard className="p-4">
                  <SignatureCanvas
                    onSignatureChange={handleSignatureChange}
                    signature={bookingData.signature}
                  />
                </ThemedCard>
              </div>
            </div>
          </ThemedCard>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8 gap-4">
          <ThemedButton
            variant="secondary"
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className={currentStep === 1 ? 'opacity-50 cursor-not-allowed' : ''}
          >
            ← Previous
          </ThemedButton>

          {currentStep < 4 ? (
            <ThemedButton
              variant="primary"
              onClick={handleNext}
              disabled={!canProceedFromStep(currentStep)}
              className={!canProceedFromStep(currentStep) ? 'opacity-50 cursor-not-allowed' : ''}
            >
              Next →
            </ThemedButton>
          ) : (
            <ThemedButton
              variant="success"
              onClick={handleCompleteBooking}
              disabled={!canProceedFromStep(4) || submitting}
              className={(!canProceedFromStep(4) || submitting) ? 'opacity-50 cursor-not-allowed' : ''}
            >
              {submitting ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                  Creating Booking...
                </div>
              ) : (
                'Complete Booking & Generate Receipt'
              )}
            </ThemedButton>
          )}
        </div>
      </div>
    </ThemedLayout>
  );
}