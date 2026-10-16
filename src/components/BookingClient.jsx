'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import TermsModal from '@/components/TermsModal';
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
  const [settings, setSettings] = useState({ 
    hourlyRate: 80, 
    businessName: 'MR Travels',
    startDelayMinutes: 5,
    roundToNearestMinutes: 5
  });
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [activeBookingWarning, setActiveBookingWarning] = useState(null);

  const [calculatedStartTime, setCalculatedStartTime] = useState(null);
  const [startTimeTimer, setStartTimeTimer] = useState(null);
  const [estimatedReturnTime, setEstimatedReturnTime] = useState('');

  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const nameInputRef = useRef(null);
  const suggestionsRef = useRef(null);

  const [actualDriver, setActualDriver] = useState({
    isSameAsLicenseHolder: true,
    name: '',
    phone: '',
    relationToLicenseHolder: '',
    alternateId: ''
  });

  const [passengerInfo, setPassengerInfo] = useState({
    include: false,
    name: '',
    phone: '',
  });

  const [licenseConflict, setLicenseConflict] = useState(null);
  const [checkingLicense, setCheckingLicense] = useState(false);

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
      vehicleInspected: false,
      securityDepositCollected: false
    },
    securityDepositAmount: 0,
    signature: '',
    termsAccepted: false,
    additionalNotes: ''
  });

  const calculateSuggestedReturnTime = (startTime) => {
    if (!startTime) return '';
    const start = new Date(startTime);
    const suggested = new Date(start.getTime() + (2 * 60 * 60 * 1000));
    
    const year = suggested.getFullYear();
    const month = String(suggested.getMonth() + 1).padStart(2, '0');
    const day = String(suggested.getDate()).padStart(2, '0');
    const hours = String(suggested.getHours()).padStart(2, '0');
    const minutes = String(suggested.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (bookingData.customer.driverLicense && 
          bookingData.customer.driverLicense.length >= 10 && 
          !selectedCustomerId) {
        checkLicenseConflict(bookingData.customer.driverLicense);
      } else {
        setLicenseConflict(null);
      }
    }, 500);
  
    return () => clearTimeout(timer);
  }, [bookingData.customer.driverLicense, selectedCustomerId]);
  
  const checkLicenseConflict = async (licenseNumber) => {
    if (!licenseNumber || selectedCustomerId) return;
    
    try {
      setCheckingLicense(true);
      const response = await fetch(`/api/customers/check-license?license=${encodeURIComponent(licenseNumber)}`);
      const data = await response.json();
      
      if (data.success && data.exists) {
        const existingCustomer = data.customer;
        const currentInput = {
          name: bookingData.customer.name.trim(),
          phone: bookingData.customer.phone.trim()
        };
        
        const isDataMatch = existingCustomer.name === currentInput.name && 
                           existingCustomer.phone === currentInput.phone;
        
        if (!isDataMatch) {
          setLicenseConflict({
            exists: true,
            existing: existingCustomer,
            conflict: true
          });
        } else {
          selectCustomer(existingCustomer);
          setLicenseConflict(null);
        }
      } else {
        setLicenseConflict(null);
      }
    } catch (error) {
      console.error('Error checking license conflict:', error);
    } finally {
      setCheckingLicense(false);
    }
  };

  const checkCustomerStatus = async (customer) => {
    try {
      const response = await fetch('/api/customers/check-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverLicense: customer.driverLicense,
          phone: customer.phone
        })
      });
      const data = await response.json();

      if (data.success && data.status === 'has_active_booking') {
        setActiveBookingWarning(data.activeBooking);
      } else {
        setActiveBookingWarning(null);
      }
    } catch (error) {
      console.error('Error checking customer status:', error);
      setActiveBookingWarning(null);
    }
  };
  
  const calculateStartTime = () => {
    const now = new Date();
    const roundToMinutes = settings.roundToNearestMinutes || 5;
    
    const startTime = new Date(now);
    
    if (roundToMinutes > 1) {
      const minutes = startTime.getMinutes();
      const seconds = startTime.getSeconds();
      const milliseconds = startTime.getMilliseconds();
      
      let roundedMinutes;
      if (minutes % roundToMinutes === 0 && seconds === 0 && milliseconds === 0) {
        roundedMinutes = minutes + roundToMinutes;
      } else {
        roundedMinutes = Math.ceil(minutes / roundToMinutes) * roundToMinutes;
      }
      
      if (roundedMinutes >= 60) {
        startTime.setHours(startTime.getHours() + Math.floor(roundedMinutes / 60));
        startTime.setMinutes(roundedMinutes % 60, 0, 0);
      } else {
        startTime.setMinutes(roundedMinutes, 0, 0);
      }
    }
    
    setCalculatedStartTime(startTime);
    
    // Always set estimated return time
    const suggestedReturn = calculateSuggestedReturnTime(startTime.toISOString());
    setEstimatedReturnTime(suggestedReturn);
  };

  const calculateRequiredDeposit = () => {
    return actualDriver.isSameAsLicenseHolder ? 500 : 1000;
  };

  useEffect(() => {
    fetchAvailableVehicles();
    fetchSettings();
    const customerId = searchParams.get('customerId');
    if (customerId) {
      fetchCustomerDetails(customerId);
    }
  }, []);

  useEffect(() => {
    if (settings.roundToNearestMinutes !== undefined) {
      calculateStartTime();
      
      const interval = setInterval(calculateStartTime, 60000);
      setStartTimeTimer(interval);
      
      return () => {
        if (interval) clearInterval(interval);
      };
    }
  }, [settings.startDelayMinutes, settings.roundToNearestMinutes]);

  useEffect(() => {
    if (bookingData.checklist.securityDepositCollected) {
      const requiredDeposit = calculateRequiredDeposit();
      setBookingData(prev => ({
        ...prev,
        securityDepositAmount: requiredDeposit
      }));
    }
  }, [actualDriver.isSameAsLicenseHolder]);

  useEffect(() => {
    return () => {
      if (startTimeTimer) clearInterval(startTimeTimer);
    };
  }, [startTimeTimer]);

  // Search by name or phone
  useEffect(() => {
    const timer = setTimeout(() => {
      const nameQuery = bookingData.customer.name.trim();
      const phoneQuery = bookingData.customer.phone.trim();

      if (nameQuery.length >= 2) {
        searchCustomers(nameQuery);
      } else if (phoneQuery.length >= 4) {
        searchCustomers(phoneQuery);
      } else {
        setCustomerSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [bookingData.customer.name, bookingData.customer.phone]);

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
    setLicenseConflict(null);
    checkCustomerStatus(customer);
  };

  const clearCustomerSelection = () => {
    setSelectedCustomerId(null);
    setActiveBookingWarning(null);
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
        checkCustomerStatus(data.customer);
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

    if (field === 'name' && selectedCustomerId) {
      setSelectedCustomerId(null);
      setActiveBookingWarning(null);
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

  const handleNext = () => {
    setCurrentStep(prev => Math.min(prev + 1, 3));
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const canProceedFromStep = (step) => {
    switch (step) {
      case 1:
        return bookingData.vehicleId;
      case 2:
        if (activeBookingWarning) return false;

        const basicValidation =
          bookingData.customer.name.trim() &&
          validatePhoneNumber(bookingData.customer.phone) &&
          validateDrivingLicense(bookingData.customer.driverLicense);
  
        if (!actualDriver.isSameAsLicenseHolder) {
          if (
            !basicValidation ||
            !actualDriver.name.trim() ||
            !validatePhoneNumber(actualDriver.phone) ||
            !actualDriver.relationToLicenseHolder ||
            !actualDriver.relationToLicenseHolder.trim() ||
            !actualDriver.alternateId.trim()
          ) {
            return false;
          }
        } else if (!basicValidation) {
          return false;
        }
  
        if (passengerInfo.include) {
          return (
            passengerInfo.name.trim() &&
            validatePhoneNumber(passengerInfo.phone)
          );
        }
  
        return true;
  
      case 3:
        return (
          bookingData.signature &&
          bookingData.termsAccepted &&
          bookingData.checklist.vehicleInspected
        );
  
      default:
        return true;
    }
  };

  // ✅ FIXED: Always sends a valid estimatedReturnTime
  const handleCompleteBooking = async () => {
    if (!canProceedFromStep(3)) return;

    setSubmitting(true);
    try {
      const startTime = calculatedStartTime || new Date();

      // Always build a valid return time (start + 2 hours)
      let returnDate;
      if (estimatedReturnTime) {
        const raw = estimatedReturnTime;
        if (raw.includes('T') && !raw.includes('Z') && !raw.includes('+')) {
          returnDate = new Date(raw + '+05:30');
        } else {
          returnDate = new Date(raw);
        }
      }

      if (!returnDate || isNaN(returnDate.getTime())) {
        returnDate = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);
      }

      if (returnDate <= startTime) {
        returnDate = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);
      }

      const payload = {
        vehicleId: bookingData.vehicleId,
        customer: bookingData.customer,
        signature: bookingData.signature,
        startTime: startTime.toISOString(),
        estimatedReturnTime: returnDate.toISOString(),
        helmetProvided: bookingData.checklist.helmetProvided,
        aadharCardCollected: bookingData.checklist.aadharCardCollected,
        vehicleInspected: bookingData.checklist.vehicleInspected,
        securityDepositCollected: bookingData.checklist.securityDepositCollected,
        securityDepositAmount: bookingData.securityDepositAmount || 0,
        additionalNotes: bookingData.additionalNotes || '',
        actualDriver: actualDriver,
        enhancedSecurity: {
          isRequired: !actualDriver.isSameAsLicenseHolder,
          reason: 'multiple_driver',
          additionalDepositAmount: actualDriver.isSameAsLicenseHolder ? 0 : 500
        },
        passengerInfo: passengerInfo.include
          ? {
              name: passengerInfo.name.trim(),
              phone: passengerInfo.phone.trim(),
            }
          : null,
      };

      console.log('📤 Booking payload:', {
        ...payload,
        signature: payload.signature ? '[SIGNATURE]' : null
      });

      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        console.error('❌ API error:', data);
        alert('Error creating booking: ' + (data.error || `Server error ${response.status}`));
        return;
      }

      router.push(`/booking/confirmation/${data.booking.bookingId}`);
    } catch (error) {
      console.error('Error creating booking:', error);
      alert('Error creating booking: ' + (error.message || 'Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };
  
  const getStepTitle = (step) => {
    switch (step) {
      case 1: return 'Select Vehicle';
      case 2: return 'Customer Information';
      case 3: return 'Terms & Digital Signature';
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
              <p className="text-gray-400">Step {currentStep} of 3 - {getStepTitle(currentStep)}</p>
              {calculatedStartTime && (
                <div className="mt-2 flex items-center space-x-2">
                  <span className="text-green-400">🕐</span>
                  <span className="text-green-300 font-medium">
                    Rental starts at: {calculatedStartTime.toLocaleString('en-IN', {
                      weekday: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                      day: 'numeric',
                      month: 'short'
                    })}
                  </span>
                </div>
              )}
            </div>
            <ThemedBadge color="cyan">
              {currentStep}/3 Complete
            </ThemedBadge>
          </div>
          
          <div className="px-6 pb-6">
            <div className="flex items-center">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center flex-1">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all",
                    step <= currentStep
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white'
                      : 'bg-gray-600 text-gray-300'
                  )}>
                    {step}
                  </div>
                  {step < 3 && (
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

        {/* Step 2: Customer Information */}
        {currentStep === 2 && (
          <div className="space-y-8">
            <ThemedCard title="License Holder Information">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="relative">
                  <div ref={nameInputRef}>
                    <ThemedInput
                      label="Full Name *"
                      value={bookingData.customer.name}
                      onChange={(e) => handleCustomerChange('name', e.target.value)}
                      placeholder="Enter license holder's full name"
                      className={selectedCustomerId ? 'border-green-500' : ''}
                    />
                  </div>

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

                  {searchingCustomers && (
                    <div className="mt-2 text-gray-400 text-sm flex items-center gap-2">
                      <div className="animate-spin rounded-full h-3 w-3 border-b border-cyan-400"></div>
                      Searching customers...
                    </div>
                  )}

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
                
                <div className="space-y-2">
                  <ThemedInput
                    label="Driver License Number *"
                    value={bookingData.customer.driverLicense}
                    onChange={(e) => handleCustomerChange('driverLicense', e.target.value.toUpperCase())}
                    placeholder="e.g., MP1420110012345"
                    error={bookingData.customer.driverLicense && !validateDrivingLicense(bookingData.customer.driverLicense) 
                      ? 'Please enter a valid driving license number' : ''}
                    className={selectedCustomerId ? 'border-green-500' : licenseConflict?.conflict ? 'border-red-500' : ''}
                    disabled={selectedCustomerId}
                  />
                  
                  {checkingLicense && (
                    <div className="flex items-center space-x-2 text-sm text-gray-400">
                      <div className="animate-spin rounded-full h-3 w-3 border-b border-cyan-400"></div>
                      <span>Checking license number...</span>
                    </div>
                  )}
                  
                  {licenseConflict?.conflict && (
                    <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-3">
                        <span className="text-red-400">⚠️</span>
                        <span className="text-red-300 font-semibold">License Number Conflict</span>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <p className="text-red-200">
                          This license number belongs to an existing customer with different details:
                        </p>
                        
                        <div className="bg-red-800/30 rounded p-3">
                          <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                              <div className="text-red-300 font-medium">Existing Customer:</div>
                              <div className="text-red-200">📛 {licenseConflict.existing.name}</div>
                              <div className="text-red-200">📞 {licenseConflict.existing.phone}</div>
                              <div className="text-red-200">📅 {licenseConflict.existing.totalBookings} bookings</div>
                            </div>
                            <div>
                              <div className="text-red-300 font-medium">Your Input:</div>
                              <div className="text-red-200">📛 {bookingData.customer.name}</div>
                              <div className="text-red-200">📞 {bookingData.customer.phone}</div>
                              <div className="text-red-200">🆕 New entry</div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col space-y-2 mt-3">
                          <button
                            onClick={() => {
                              selectCustomer(licenseConflict.existing);
                              setLicenseConflict(null);
                            }}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
                          >
                            ✅ Use Existing Customer ({licenseConflict.existing.name})
                          </button>
                          
                          <button
                            onClick={() => {
                              handleCustomerChange('driverLicense', '');
                              setLicenseConflict(null);
                            }}
                            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
                          >
                            🔄 Enter Different License Number
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Active Booking Warning */}
                  {activeBookingWarning && (
                    <div className="bg-amber-900/30 border border-amber-600/50 rounded-lg p-4 mt-2">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-amber-400 text-xl">⚠️</span>
                        <span className="text-amber-300 font-semibold">Active Booking Found</span>
                      </div>
                      <p className="text-amber-200 text-sm mb-3">
                        {activeBookingWarning.message}
                      </p>
                      <div className="text-xs text-amber-300 space-y-1 bg-amber-950/40 rounded p-3">
                        <div>Booking ID: <span className="font-mono font-medium">{activeBookingWarning.bookingId}</span></div>
                        <div>Vehicle: {activeBookingWarning.vehicle}</div>
                        <div>
                          Started:{' '}
                          {new Date(activeBookingWarning.startTime).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                      <p className="text-amber-400 text-xs mt-3 font-medium">
                        You cannot create a new booking until the current one is completed or cancelled.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </ThemedCard>

            {/* Optional Passenger Information */}
            <ThemedCard>
              <div className="p-6">
                <h3 className="text-xl font-semibold text-white mb-4">👥 Passenger Information (Optional)</h3>

                <div className="mb-6">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={passengerInfo.include}
                      onChange={(e) => setPassengerInfo(prev => ({
                        ...prev,
                        include: e.target.checked,
                        name: e.target.checked ? prev.name : '',
                        phone: e.target.checked ? prev.phone : '',
                      }))}
                      className="w-5 h-5 text-cyan-600 border-2 border-gray-300 rounded focus:ring-cyan-500"
                    />
                    <span className="text-white font-medium">
                      Record passenger details for this ride
                    </span>
                  </label>
                  <p className="text-gray-400 text-sm mt-2 ml-8">
                    Shown in Active Bookings only while the rental is live — not saved as a customer record.
                  </p>
                </div>

                {passengerInfo.include && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ThemedInput
                      label="Passenger Name *"
                      value={passengerInfo.name}
                      onChange={(e) => setPassengerInfo(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Passenger full name"
                      required
                    />

                    <ThemedInput
                      label="Passenger Phone Number *"
                      type="tel"
                      value={passengerInfo.phone}
                      onChange={(e) => setPassengerInfo(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="10-digit phone number"
                      maxLength="10"
                      required
                      error={passengerInfo.phone && !validatePhoneNumber(passengerInfo.phone)
                        ? 'Please enter a valid 10-digit phone number' : ''}
                    />
                  </div>
                )}
              </div>
            </ThemedCard>
          </div>
        )}

        {/* Step 3: Terms & Digital Signature */}
        {currentStep === 3 && (
          <ThemedCard title="Terms & Digital Signature">
            <div className="space-y-8">
              
              <div className={`${theme.colors.stats.revenue.bg} ${theme.colors.stats.revenue.border} rounded-lg p-6`}>
                <h3 className="text-xl font-bold text-green-200 mb-4">Booking Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-green-200">
                      <span className="font-medium">License Holder:</span> {bookingData.customer.name}
                      {selectedCustomerId && <span className="text-green-400 ml-2">✓ Existing</span>}
                    </p>
                    <p className="text-green-200">
                      <span className="font-medium">Phone:</span> {bookingData.customer.phone}
                    </p>
                    <p className="text-green-200">
                      <span className="font-medium">License:</span> {bookingData.customer.driverLicense}
                    </p>
                    {passengerInfo.include && (
                      <>
                        <p className="text-cyan-200 border-t border-cyan-700/30 pt-2 mt-2">
                          <span className="font-medium">Passenger:</span> {passengerInfo.name}
                        </p>
                        <p className="text-cyan-200">
                          <span className="font-medium">Passenger Phone:</span> {passengerInfo.phone}
                        </p>
                      </>
                    )}
                  </div>
                  <div className="space-y-2">
                    <p className="text-green-200">
                      <span className="font-medium">Vehicle:</span> {bookingData.selectedVehicle?.model} 
                      ({bookingData.selectedVehicle?.plateNumber})
                    </p>
                    <p className="text-green-200">
                      <span className="font-medium">Rate:</span> ₹{settings.hourlyRate}/hour
                    </p>
                    {calculatedStartTime && (
                      <p className="text-green-200">
                        <span className="font-medium">Rental Starts:</span> {calculatedStartTime.toLocaleString('en-IN', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    )}
                    {estimatedReturnTime && (
                      <p className="text-amber-200">
                        <span className="font-medium">Estimated Return:</span> {new Date(estimatedReturnTime).toLocaleString('en-IN', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    )}
                    <p className="text-green-200">
                      <span className="font-medium">Vehicle Inspected:</span>{' '}
                      {bookingData.checklist.vehicleInspected ? 'Yes' : 'Pending'}
                    </p>
                    <p className="text-green-200">
                      <span className="font-medium">Helmet Provided:</span>{' '}
                      {bookingData.checklist.helmetProvided ? 'Yes' : 'No'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-blue-900/50 border border-blue-700/50 rounded-lg p-6">
                  <h4 className="text-xl font-semibold text-blue-200 mb-4">📋 Rental Agreement</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <h5 className="font-semibold text-blue-300 mb-2">Key Terms</h5>
                      <ul className="text-sm text-blue-200 space-y-1">
                        <li>• ₹{settings.hourlyRate}/hour + ₹{Math.round(settings.hourlyRate / 2)} per 30min block</li>
                        <li>• Night charges: 1.5x after 10 PM</li>
                        <li>• Mandatory helmet provided</li>
                        <li>• Return by 10:30 PM</li>
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-semibold text-blue-300 mb-2">Security Requirements</h5>
                      <ul className="text-sm text-blue-200 space-y-1">
                        <li>• Aadhar Card OR ₹{calculateRequiredDeposit()} deposit</li>
                        <li>• Valid driving license</li>
                        <li>• Vehicle inspection required</li>
                        <li>• Customer liability for damages</li>
                      </ul>
                    </div>
                  </div>

                  <div className="text-center">
                    <button
                      onClick={() => setShowTermsModal(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
                    >
                      📖 View Complete Terms & Conditions
                    </button>
                  </div>
                </div>

                <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-6">
                  <label className="flex items-start space-x-4 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bookingData.termsAccepted}
                      onChange={(e) => setBookingData(prev => ({ ...prev, termsAccepted: e.target.checked }))}
                      className="w-6 h-6 text-red-600 border-2 border-red-300 rounded focus:ring-red-500 mt-1"
                    />
                    <div>
                      <span className="text-lg font-bold text-white">
                        I have read and agree to all rental terms and conditions
                      </span>
                      <p className="text-red-200 text-sm mt-1">
                        By checking this box, I confirm that I have reviewed the complete terms and conditions 
                        and agree to be legally bound by this rental agreement under Indian law.
                      </p>
                    </div>
                  </label>
                </div>

                <div className="bg-cyan-900/20 border border-cyan-700/50 rounded-lg p-6 space-y-4">
                  <label className="flex items-start space-x-4 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bookingData.checklist.vehicleInspected}
                      onChange={(e) => handleChecklistChange('vehicleInspected', e.target.checked)}
                      className="w-6 h-6 text-cyan-600 border-2 border-cyan-300 rounded focus:ring-cyan-500 mt-1"
                    />
                    <div>
                      <span className="text-lg font-bold text-white">
                        Vehicle inspected
                      </span>
                      <p className="text-cyan-200 text-sm mt-1">
                        Confirm that the vehicle has been inspected and is ready for rental.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start space-x-4 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bookingData.checklist.helmetProvided}
                      onChange={(e) => handleChecklistChange('helmetProvided', e.target.checked)}
                      className="w-6 h-6 text-cyan-600 border-2 border-cyan-300 rounded focus:ring-cyan-500 mt-1"
                    />
                    <div>
                      <span className="text-lg font-bold text-white">
                        Helmet provided
                      </span>
                      <p className="text-cyan-200 text-sm mt-1">
                        Confirm that a helmet has been provided to the rider.
                      </p>
                    </div>
                  </label>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-white mb-4">
                    ✍️ Customer Digital Signature
                  </h4>
                  <SignatureCanvas
                    onSignatureChange={(signatureData) => 
                      setBookingData(prev => ({ ...prev, signature: signatureData }))
                    }
                    signature={bookingData.signature}
                  />
                </div>
              </div>
            </div>
          </ThemedCard>
        )}

        <TermsModal
          isOpen={showTermsModal}
          onClose={() => setShowTermsModal(false)}
          onAccept={() => {
            setBookingData(prev => ({ ...prev, termsAccepted: true }));
            setShowTermsModal(false);
          }}
        />

        <div className="flex justify-between mt-8 gap-4">
          <ThemedButton
            variant="secondary"
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className={currentStep === 1 ? 'opacity-50 cursor-not-allowed' : ''}
          >
            ← Previous
          </ThemedButton>

          {currentStep < 3 ? (
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
              disabled={!canProceedFromStep(3) || submitting}
              className={(!canProceedFromStep(3) || submitting) ? 'opacity-50 cursor-not-allowed' : ''}
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