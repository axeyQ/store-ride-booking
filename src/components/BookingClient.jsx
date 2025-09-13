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
  
  // NEW: Calculated start time state
  const [calculatedStartTime, setCalculatedStartTime] = useState(null);
  const [startTimeTimer, setStartTimeTimer] = useState(null);

  // NEW: Estimated return time state
  const [estimatedReturnTime, setEstimatedReturnTime] = useState('');

  // Customer autocomplete state
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const nameInputRef = useRef(null);
  const suggestionsRef = useRef(null);

  // NEW: Multiple driver state
  const [actualDriver, setActualDriver] = useState({
    isSameAsLicenseHolder: true,
    name: '',
    phone: '',
    relationToLicenseHolder: '',
    alternateId: ''
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

  // 🔧 FIXED: Function to calculate suggested return time
  const calculateSuggestedReturnTime = (startTime) => {
    if (!startTime) return '';
    const start = new Date(startTime);
    const suggested = new Date(start.getTime() + (2 * 60 * 60 * 1000)); // 2 hours later
    
    // Format for datetime-local input (local time)
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
          !selectedCustomerId) { // Only check if no customer selected via autocomplete
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
        // License exists but customer data doesn't match current input
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
          // Data matches, auto-select this customer
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
  
  // NEW: Function to calculate and display start time
  const calculateStartTime = () => {
    const now = new Date();
    const delayMinutes = settings.startDelayMinutes || 5;
    const roundToMinutes = settings.roundToNearestMinutes || 5;
    
    // Add delay to current time
    const startTime = new Date(now.getTime() + (delayMinutes * 60 * 1000));
    
    // Round to nearest specified minutes
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
    
    setCalculatedStartTime(startTime);
    
    // Auto-set estimated return time if not already set
    if (!estimatedReturnTime) {
      const suggestedReturn = calculateSuggestedReturnTime(startTime.toISOString());
      setEstimatedReturnTime(suggestedReturn);
    }
  };

  // NEW: Duration calculation helper function
  const calculateDuration = (start, end) => {
    if (!start || !end) return '';
    const diffMs = end - start;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours === 0) return `${diffMinutes} minutes`;
    if (diffMinutes === 0) return `${diffHours} hours`;
    return `${diffHours}h ${diffMinutes}m`;
  };

  // NEW: Calculate required security deposit based on multiple driver scenario
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

  // NEW: Calculate start time when settings change and update every minute
  useEffect(() => {
    if (settings.startDelayMinutes !== undefined) {
      calculateStartTime();
      
      // Update start time every minute
      const interval = setInterval(calculateStartTime, 60000);
      setStartTimeTimer(interval);
      
      return () => {
        if (interval) clearInterval(interval);
      };
    }
  }, [settings.startDelayMinutes, settings.roundToNearestMinutes]);

  // NEW: Update security deposit when driver changes
  useEffect(() => {
    if (bookingData.checklist.securityDepositCollected) {
      const requiredDeposit = calculateRequiredDeposit();
      setBookingData(prev => ({
        ...prev,
        securityDepositAmount: requiredDeposit
      }));
    }
  }, [actualDriver.isSameAsLicenseHolder]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (startTimeTimer) clearInterval(startTimeTimer);
    };
  }, [startTimeTimer]);

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
    setCurrentStep(prev => Math.min(prev + 1, 5)); // Updated to 5 steps
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // UPDATED: Enhanced validation including estimated return time
  const canProceedFromStep = (step) => {
    switch (step) {
      case 1:
        return bookingData.vehicleId;
      case 2:
        return estimatedReturnTime && new Date(estimatedReturnTime) > (calculatedStartTime || new Date());
      case 3:
        const basicValidation = bookingData.customer.name.trim() &&
               validatePhoneNumber(bookingData.customer.phone) &&
               validateDrivingLicense(bookingData.customer.driverLicense);
        
        // If different driver, validate their info too
        if (!actualDriver.isSameAsLicenseHolder) {
          return basicValidation &&
                 actualDriver.name.trim() &&
                 validatePhoneNumber(actualDriver.phone) &&
                 actualDriver.relationToLicenseHolder &&
                 actualDriver.relationToLicenseHolder.trim() &&
                 actualDriver.alternateId.trim();
        }
        return basicValidation;
      case 4:
        const aadharOrDeposit = bookingData.checklist.aadharCardCollected || 
        bookingData.checklist.securityDepositCollected;

        return bookingData.checklist.vehicleInspected && aadharOrDeposit;
      case 5:
        return bookingData.signature && bookingData.termsAccepted;
      default:
        return true;
    }
  };

  // 🔧 FIXED: Timezone-aware booking submission
  const handleCompleteBooking = async () => {
    if (!canProceedFromStep(5)) return;
    
    setSubmitting(true);
    try {
      // 🔧 FIX: Convert datetime-local to proper IST timestamp
      const convertToIST = (localDateTimeString) => {
        if (!localDateTimeString) return null;
        
        // datetime-local gives us: "2025-06-28T21:00"
        // We need to explicitly set this as IST time
        const istDate = new Date(localDateTimeString + '+05:30'); // Add IST timezone
        
        return istDate.toISOString(); // This will be in UTC but represents the correct IST time
      };

      console.log('🕐 Timezone Debug:');
      console.log('Raw estimatedReturnTime:', estimatedReturnTime);
      console.log('As IST Date:', new Date(estimatedReturnTime + '+05:30'));
      console.log('Converting to UTC:', convertToIST(estimatedReturnTime));
      console.log('Will display as IST:', new Date(convertToIST(estimatedReturnTime)).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));

      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId: bookingData.vehicleId,
          customer: bookingData.customer,
          signature: bookingData.signature,
          startTime: calculatedStartTime?.toISOString(),
          estimatedReturnTime: convertToIST(estimatedReturnTime), // 🔧 FIXED: Convert to proper IST
          helmetProvided: bookingData.checklist.helmetProvided,
          aadharCardCollected: bookingData.checklist.aadharCardCollected,
          vehicleInspected: bookingData.checklist.vehicleInspected,
          securityDepositCollected: bookingData.checklist.securityDepositCollected,
          securityDepositAmount: bookingData.securityDepositAmount,
          additionalNotes: bookingData.additionalNotes,
          // NEW: Multiple driver information
          actualDriver: actualDriver,
          enhancedSecurity: {
            isRequired: !actualDriver.isSameAsLicenseHolder,
            reason: 'multiple_driver',
            additionalDepositAmount: actualDriver.isSameAsLicenseHolder ? 0 : 500
          }
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
  
  // UPDATED: Step titles for 5 steps
  const getStepTitle = (step) => {
    switch (step) {
      case 1: return 'Select Vehicle';
      case 2: return 'Estimated Return Time';
      case 3: return 'Customer Information';
      case 4: return 'Pre-Rental Checklist';
      case 5: return 'Terms & Digital Signature';
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
              <p className="text-gray-400">Step {currentStep} of 5 - {getStepTitle(currentStep)}</p>
              {/* NEW: Display calculated start time */}
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
              {currentStep}/5 Complete
            </ThemedBadge>
          </div>
          
          {/* Progress Bar - Updated to 5 steps */}
          <div className="px-6 pb-6">
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map((step) => (
                <div key={step} className="flex items-center flex-1">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all",
                    step <= currentStep
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white'
                      : 'bg-gray-600 text-gray-300'
                  )}>
                    {step}
                  </div>
                  {step < 5 && (
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

        {/* NEW Step 2: Estimated Return Time */}
        {currentStep === 2 && (
          <ThemedCard title="📅 Estimated Return Time">
            <div className="space-y-6">
              <div className="bg-amber-900/20 border border-amber-700/30 rounded-lg p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="text-3xl">⏰</div>
                  <div>
                    <h3 className="text-xl font-bold text-amber-200">When do you plan to return?</h3>
                    <p className="text-amber-300">This helps us manage our fleet better and provide better service</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Current Start Time Display */}
                  <div className="space-y-2">
                    <label className="text-green-200 font-medium">Rental Start Time</label>
                    <div className="bg-green-900/30 border border-green-700/50 rounded-lg p-4">
                      <div className="text-green-400 font-bold text-lg">
                        {calculatedStartTime?.toLocaleString('en-IN', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Estimated Return Time Input */}
                  <div className="space-y-2">
                    <label className="text-amber-200 font-medium">Estimated Return Time*</label>
                    <input
                      type="datetime-local"
                      value={estimatedReturnTime}
                      onChange={(e) => setEstimatedReturnTime(e.target.value)}
                      min={calculatedStartTime?.toISOString().slice(0, 16)}
                      required
                      className="w-full bg-gray-800 border border-amber-500 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                    />
                    {estimatedReturnTime && calculatedStartTime && (
                      <div className="text-amber-300 text-sm">
                        Duration: {calculateDuration(calculatedStartTime, new Date(estimatedReturnTime))}
                      </div>
                    )}
                  </div>
                </div>

                {/* 🔧 FIXED: Quick Duration Buttons */}
                <div className="mt-6">
                  <div className="text-amber-200 font-medium mb-3">Quick Select:</div>
                  <div className="flex flex-wrap gap-3">
                    {[
                      { label: '2 Hours', hours: 2 },
                      { label: '4 Hours', hours: 4 },
                      { label: '6 Hours', hours: 6 },
                      { label: '8 Hours', hours: 8 },
                      { label: 'Half Day (12h)', hours: 12 },
                      { label: 'Full Day (24h)', hours: 24 }
                    ].map((duration) => (
                      <button
                        key={duration.hours}
                        type="button"
                        onClick={() => {
                          if (calculatedStartTime) {
                            const returnTime = new Date(calculatedStartTime.getTime() + (duration.hours * 60 * 60 * 1000));
                            
                            // 🔧 FIX: Format as local datetime string for input
                            const year = returnTime.getFullYear();
                            const month = String(returnTime.getMonth() + 1).padStart(2, '0');
                            const day = String(returnTime.getDate()).padStart(2, '0');
                            const hours = String(returnTime.getHours()).padStart(2, '0');
                            const minutes = String(returnTime.getMinutes()).padStart(2, '0');
                            
                            const localTimeString = `${year}-${month}-${day}T${hours}:${minutes}`;
                            
                            console.log(`Setting ${duration.label}:`, {
                              returnTime: returnTime.toLocaleString('en-IN'),
                              localTimeString: localTimeString
                            });
                            
                            setEstimatedReturnTime(localTimeString);
                          }
                        }}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        {duration.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Important Note */}
                <div className="mt-6 bg-blue-900/20 border border-blue-700/30 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <div className="text-blue-400 text-xl">💡</div>
                    <div className="text-blue-200 text-sm">
                      <div className="font-medium mb-1">Important Notes:</div>
                      <ul className="space-y-1 text-blue-300">
                        <li>• This is an estimate - you can return earlier or later</li>
                        <li>• Billing is calculated based on actual return time</li>
                        <li>• We'll use this to better plan vehicle availability</li>
                        <li>• Store closes at 10:30 PM - late returns incur additional charges</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ThemedCard>
        )}

        {/* Step 3: Customer Information with Smart Autocomplete + Multiple Driver Support */}
        {currentStep === 3 && (
          <div className="space-y-8">
            <ThemedCard title="License Holder Information">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Enhanced Name Input with Autocomplete */}
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
  
  {/* License checking indicator */}
  {checkingLicense && (
    <div className="flex items-center space-x-2 text-sm text-gray-400">
      <div className="animate-spin rounded-full h-3 w-3 border-b border-cyan-400"></div>
      <span>Checking license number...</span>
    </div>
  )}
  
  {/* License conflict warning */}
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
              // Clear license number to prevent conflict
              handleCustomerChange('driverLicense', '');
              setLicenseConflict(null);
            }}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
          >
            🔄 Enter Different License Number
          </button>
          
          <div className="text-red-300 text-xs">
            ⚠️ Using the same license with different details will overwrite existing customer data
          </div>
        </div>
      </div>
    </div>
  )}
</div>
              </div>
            </ThemedCard>

            {/* NEW: Multiple Driver Section */}
            <ThemedCard>
              <div className="p-6">
                <h3 className="text-xl font-semibold text-white mb-4">🚗 Driver Information</h3>
                
                {/* Same person checkbox */}
                <div className="mb-6">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={actualDriver.isSameAsLicenseHolder}
                      onChange={(e) => setActualDriver(prev => ({
                        ...prev,
                        isSameAsLicenseHolder: e.target.checked,
                        name: e.target.checked ? '' : prev.name,
                        phone: e.target.checked ? '' : prev.phone,
                        relationToLicenseHolder: e.target.checked ? '' : prev.relationToLicenseHolder,
                        alternateId: e.target.checked ? '' : prev.alternateId
                      }))}
                      className="w-5 h-5 text-green-600 border-2 border-gray-300 rounded focus:ring-green-500"
                    />
                    <span className="text-white font-medium">
                      License holder will drive the vehicle themselves
                    </span>
                  </label>
                </div>

                {/* Different driver form */}
                {!actualDriver.isSameAsLicenseHolder && (
                  <div className="space-y-6">
                    <div className="bg-orange-900/20 border border-orange-700/30 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-orange-400">⚠️</span>
                        <span className="text-orange-300 font-semibold">Different Driver Policy</span>
                      </div>
                      <ul className="text-orange-200 text-sm space-y-1">
                        <li>• Both license holder AND actual driver must be present</li>
                        <li>• Higher security deposit required (₹1000)</li>
                        <li>• Both persons will sign the rental agreement</li>
                        <li>• License holder remains legally responsible</li>
                      </ul>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <ThemedInput
                        label="Actual Driver Name *"
                        value={actualDriver.name}
                        onChange={(e) => setActualDriver(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Person who will drive"
                        required={!actualDriver.isSameAsLicenseHolder}
                      />
                      
                      <ThemedInput
                        label="Driver Phone Number *"
                        type="tel"
                        value={actualDriver.phone}
                        onChange={(e) => setActualDriver(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="10-digit phone number"
                        maxLength="10"
                        required={!actualDriver.isSameAsLicenseHolder}
                        error={actualDriver.phone && !validatePhoneNumber(actualDriver.phone) 
                          ? 'Please enter a valid 10-digit phone number' : ''}
                      />
                      
                      <ThemedSelect
                        label="Relationship to License Holder *"
                        value={actualDriver.relationToLicenseHolder}
                        onValueChange={(value) => setActualDriver(prev => ({ ...prev, relationToLicenseHolder: value }))}
                        options={[
                          { value: 'brother', label: 'Brother' },
                          { value: 'sister', label: 'Sister' },
                          { value: 'friend', label: 'Friend' },
                          { value: 'spouse', label: 'Spouse' },
                          { value: 'father', label: 'Father' },
                          { value: 'mother', label: 'Mother' },
                          { value: 'cousin', label: 'Cousin' },
                          { value: 'colleague', label: 'Colleague' },
                          { value: 'other', label: 'Other' }
                        ]}
                        placeholder="Select relationship"
                        required={!actualDriver.isSameAsLicenseHolder}
                      />
                      
                      <ThemedInput
                        label="Alternate ID (Aadhar/PAN) *"
                        value={actualDriver.alternateId}
                        onChange={(e) => setActualDriver(prev => ({ ...prev, alternateId: e.target.value.toUpperCase() }))}
                        placeholder="e.g., 1234 5678 9012 or ABCDE1234F"
                        required={!actualDriver.isSameAsLicenseHolder}
                      />
                    </div>

                    {/* Enhanced security deposit notice */}
                    <div className="bg-red-900/20 border border-red-700/30 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-red-400">💰</span>
                        <span className="text-red-300 font-semibold">Enhanced Security Required</span>
                      </div>
                      <p className="text-red-200 text-sm">
                        Security deposit increased to ₹1000 when different person drives. 
                        Both Aadhar cards will be collected OR higher deposit paid.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </ThemedCard>
          </div>
        )}

        {/* Step 4: Pre-Rental Checklist - UPDATED for Multiple Driver */}
        {currentStep === 4 && (
          <ThemedCard title="Pre-Rental Checklist">
            <div className="space-y-6">
              
              {/* Helmet Provided - OPTIONAL */}
              <ThemedCard
                className={cn(
                  "cursor-pointer transition-all",
                  bookingData.checklist.helmetProvided
                    ? 'border-green-500 bg-green-500/10'
                    : 'border-gray-600 hover:border-gray-500'
                )}
                onClick={() => handleChecklistChange('helmetProvided', 
                  !bookingData.checklist.helmetProvided)}
              >
                <div className="flex items-center justify-between p-6">
                  <div className="flex items-center space-x-4">
                    <span className="text-3xl">🪖</span>
                    <div>
                      <h3 className="text-xl font-semibold text-white">
                        Helmet Provided
                      </h3>
                      <p className="text-gray-400">Optional - Customer choice</p>
                    </div>
                  </div>
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center",
                    bookingData.checklist.helmetProvided
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-600 text-gray-300'
                  )}>
                    {bookingData.checklist.helmetProvided ? '✓' : '○'}
                  </div>
                </div>
              </ThemedCard>

              {/* Identity Verification - UPDATED for Multiple Driver */}
              <div className="bg-gradient-to-r from-orange-900/50 to-orange-800/50 border border-orange-700/50 rounded-xl p-6">
                <h4 className="text-xl font-semibold text-orange-200 mb-4">
                  🆔 Identity Verification (Required - Choose One)
                  {!actualDriver.isSameAsLicenseHolder && (
                    <span className="text-sm font-normal text-orange-300 block mt-1">
                      Enhanced security required for multiple drivers
                    </span>
                  )}
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Aadhar Card Option */}
                  <ThemedCard
                    className={cn(
                      "cursor-pointer transition-all",
                      bookingData.checklist.aadharCardCollected
                        ? 'border-green-500 bg-green-500/10'
                        : 'border-gray-600 hover:border-gray-500'
                    )}
                    onClick={() => {
                      handleChecklistChange('aadharCardCollected', !bookingData.checklist.aadharCardCollected);
                      if (!bookingData.checklist.aadharCardCollected) {
                        // If selecting Aadhar, unselect security deposit
                        handleChecklistChange('securityDepositCollected', false);
                        setBookingData(prev => ({ ...prev, securityDepositAmount: 0 }));
                      }
                    }}
                  >
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">📄</span>
                        <div>
                          <h4 className="font-semibold text-white">
                            Aadhar Card{!actualDriver.isSameAsLicenseHolder && 's'}
                          </h4>
                          <p className="text-sm text-gray-400">
                            {!actualDriver.isSameAsLicenseHolder 
                              ? 'Both persons\' documents' 
                              : 'Collect original document'
                            }
                          </p>
                        </div>
                      </div>
                      <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center",
                        bookingData.checklist.aadharCardCollected
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-600 text-gray-300'
                      )}>
                        {bookingData.checklist.aadharCardCollected ? '✓' : '○'}
                      </div>
                    </div>
                  </ThemedCard>

                  {/* Security Deposit Option - UPDATED amount */}
                  <ThemedCard
                    className={cn(
                      "cursor-pointer transition-all",
                      bookingData.checklist.securityDepositCollected
                        ? 'border-green-500 bg-green-500/10'
                        : 'border-gray-600 hover:border-gray-500'
                    )}
                    onClick={() => {
                      const newValue = !bookingData.checklist.securityDepositCollected;
                      handleChecklistChange('securityDepositCollected', newValue);
                      if (newValue) {
                        // If selecting deposit, unselect Aadhar and set amount
                        handleChecklistChange('aadharCardCollected', false);
                        const requiredDeposit = calculateRequiredDeposit();
                        setBookingData(prev => ({ ...prev, securityDepositAmount: requiredDeposit }));
                      } else {
                        setBookingData(prev => ({ ...prev, securityDepositAmount: 0 }));
                      }
                    }}
                  >
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">💰</span>
                        <div>
                          <h4 className="font-semibold text-white">Security Deposit</h4>
                          <p className="text-sm text-gray-400">
                            ₹{calculateRequiredDeposit()} refundable
                            {!actualDriver.isSameAsLicenseHolder && (
                              <span className="text-orange-400 block">Enhanced amount</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center",
                        bookingData.checklist.securityDepositCollected
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-600 text-gray-300'
                      )}>
                        {bookingData.checklist.securityDepositCollected ? '✓' : '○'}
                      </div>
                    </div>
                  </ThemedCard>
                </div>

                {/* Show selected option info */}
                {bookingData.checklist.aadharCardCollected && (
                  <div className="mt-4 p-3 bg-green-900/20 border border-green-700/30 rounded-lg">
                    <p className="text-green-300 text-sm">
                      ✓ {!actualDriver.isSameAsLicenseHolder 
                          ? 'Both Aadhar cards will be collected and returned upon vehicle return'
                          : 'Aadhar card will be collected and returned upon vehicle return'
                        }
                    </p>
                  </div>
                )}
                
                {bookingData.checklist.securityDepositCollected && (
                  <div className="mt-4 p-3 bg-green-900/20 border border-green-700/30 rounded-lg">
                    <p className="text-green-300 text-sm">
                      ✓ Security deposit of ₹{calculateRequiredDeposit()} will be collected and refunded upon safe vehicle return
                      {!actualDriver.isSameAsLicenseHolder && (
                        <span className="block text-orange-300 mt-1">
                          Enhanced deposit due to multiple driver policy
                        </span>
                      )}
                    </p>
                  </div>
                )}
                
                {!bookingData.checklist.aadharCardCollected && !bookingData.checklist.securityDepositCollected && (
                  <div className="mt-4 p-3 bg-red-900/20 border border-red-700/30 rounded-lg">
                    <p className="text-red-300 text-sm">
                      ⚠️ Please select either Aadhar card collection or security deposit to proceed
                    </p>
                  </div>
                )}
              </div>

              {/* Vehicle Inspected - REQUIRED */}
              <ThemedCard
                className={cn(
                  "cursor-pointer transition-all",
                  bookingData.checklist.vehicleInspected
                    ? 'border-green-500 bg-green-500/10'
                    : 'border-red-600 hover:border-red-500'
                )}
                onClick={() => handleChecklistChange('vehicleInspected', 
                  !bookingData.checklist.vehicleInspected)}
              >
                <div className="flex items-center justify-between p-6">
                  <div className="flex items-center space-x-4">
                    <span className="text-3xl">🔍</span>
                    <div>
                      <h3 className="text-xl font-semibold text-white">
                        Vehicle Inspected
                      </h3>
                      <p className="text-red-400 font-medium">Required - Safety check completed</p>
                    </div>
                  </div>
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center",
                    bookingData.checklist.vehicleInspected
                      ? 'bg-green-500 text-white'
                      : 'bg-red-600 text-white'
                  )}>
                    {bookingData.checklist.vehicleInspected ? '✓' : '!'}
                  </div>
                </div>
              </ThemedCard>

            </div>
          </ThemedCard>
        )}

        {/* Step 5: Terms & Digital Signature - UPDATED for Multiple Driver */}
        {currentStep === 5 && (
          <ThemedCard title="Terms & Digital Signature">
            <div className="space-y-8">
              
              {/* Final Booking Summary - UPDATED with estimated return time */}
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
                    {/* NEW: Show actual driver if different */}
                    {!actualDriver.isSameAsLicenseHolder && (
                      <>
                        <p className="text-orange-200 border-t border-orange-700/30 pt-2 mt-2">
                          <span className="font-medium">Actual Driver:</span> {actualDriver.name}
                        </p>
                        <p className="text-orange-200">
                          <span className="font-medium">Driver Phone:</span> {actualDriver.phone}
                        </p>
                        <p className="text-orange-200">
                          <span className="font-medium">Relationship:</span> {actualDriver.relationToLicenseHolder}
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
                    {/* NEW: Show estimated return time */}
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
                      <span className="font-medium">Security:</span> {
                        bookingData.checklist.aadharCardCollected 
                          ? 'Aadhar Card' 
                          : `₹${bookingData.securityDepositAmount} Deposit`
                      }
                      {!actualDriver.isSameAsLicenseHolder && (
                        <span className="text-orange-300 block text-sm">Enhanced for multiple drivers</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Enhanced Terms & Conditions Section */}
              <div className="space-y-6">
                
                {/* Terms Preview */}
                <div className="bg-blue-900/50 border border-blue-700/50 rounded-lg p-6">
                  <h4 className="text-xl font-semibold text-blue-200 mb-4">📋 Rental Agreement</h4>
                  
                  {/* Quick Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <h5 className="font-semibold text-blue-300 mb-2">Key Terms</h5>
                      <ul className="text-sm text-blue-200 space-y-1">
                        <li>• ₹80/hour + ₹40 per 30min block</li>
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
                        {!actualDriver.isSameAsLicenseHolder && (
                          <li className="text-orange-300">• Enhanced security for multiple drivers</li>
                        )}
                      </ul>
                    </div>
                  </div>

                  {/* NEW: Multiple Driver Warning */}
                  {!actualDriver.isSameAsLicenseHolder && (
                    <div className="bg-orange-900/30 border border-orange-700/50 rounded-lg p-4 mb-6">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-orange-400">⚠️</span>
                        <span className="text-orange-300 font-semibold">Multiple Driver Agreement</span>
                      </div>
                      <ul className="text-orange-200 text-sm space-y-1">
                        <li>• License holder remains fully legally responsible</li>
                        <li>• Both persons have signed this agreement</li>
                        <li>• Enhanced security measures are in effect</li>
                        <li>• Both contact numbers must remain active</li>
                      </ul>
                    </div>
                  )}

                  {/* View Full Terms Button */}
                  <div className="text-center">
                    <button
                      onClick={() => setShowTermsModal(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
                    >
                      📖 View Complete Terms & Conditions
                    </button>
                  </div>
                </div>

                {/* Acceptance Checkbox */}
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
                        {!actualDriver.isSameAsLicenseHolder && ' including multiple driver policy'}
                      </span>
                      <p className="text-red-200 text-sm mt-1">
                        By checking this box, I confirm that I have reviewed the complete terms and conditions 
                        and agree to be legally bound by this rental agreement under Indian law.
                        {!actualDriver.isSameAsLicenseHolder && (
                          <span className="block mt-1 text-orange-300">
                            As the license holder, I remain fully responsible for all actions of the actual driver.
                          </span>
                        )}
                      </p>
                      <div className="mt-2 text-xs text-red-300">
                        <p>✓ Governed by Indian Contract Act, 1872 & IT Act, 2000</p>
                        <p>✓ Jurisdiction: Bhopal District Courts, Madhya Pradesh</p>
                      </div>
                    </div>
                  </label>
                </div>

                {/* Digital Signature */}
                <div>
                  <h4 className="text-lg font-semibold text-white mb-4">
                    ✍️ {!actualDriver.isSameAsLicenseHolder ? 'License Holder' : 'Customer'} Digital Signature
                  </h4>
                  <SignatureCanvas
                    onSignatureChange={(signatureData) => 
                      setBookingData(prev => ({ ...prev, signature: signatureData }))
                    }
                    signature={bookingData.signature}
                  />
                  {!actualDriver.isSameAsLicenseHolder && (
                    <p className="text-orange-300 text-sm mt-2">
                      Note: Both license holder and actual driver signatures will be collected during vehicle handover
                    </p>
                  )}
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

        {/* Navigation Buttons - Updated for 5 steps */}
        <div className="flex justify-between mt-8 gap-4">
          <ThemedButton
            variant="secondary"
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className={currentStep === 1 ? 'opacity-50 cursor-not-allowed' : ''}
          >
            ← Previous
          </ThemedButton>

          {currentStep < 5 ? (
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
              disabled={!canProceedFromStep(5) || submitting}
              className={(!canProceedFromStep(5) || submitting) ? 'opacity-50 cursor-not-allowed' : ''}
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