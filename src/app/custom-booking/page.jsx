'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import QRCode from 'qrcode';
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

// Custom booking fixed rates
const CUSTOM_RATES = {
  half_day: { label: 'Half Day (up to 12 hours)', price: 800, maxHours: 12 },
  full_day: { label: 'Full Day (up to 24 hours)', price: 1200, maxHours: 24 },
  night: { label: 'Night Package (10 PM to 9 AM)', price: 600, maxHours: 11 }
};

export default function CustomBookingPage() {
  const router = useRouter();
  const canvasRef = useRef(null);
  
  // State management
  const [vehicles, setVehicles] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [signature, setSignature] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  
  // Form state
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [packageType, setPackageType] = useState('half_day');
  const [startTime, setStartTime] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  
  // New customer form
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    driverLicense: ''
  });
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  
  // Safety checklist
  const [checklist, setChecklist] = useState({
    helmetProvided: false,
    aadharCardCollected: false,
    vehicleInspected: false,
    securityDepositCollected: false
  });
  const [securityDepositAmount, setSecurityDepositAmount] = useState(0);

  useEffect(() => {
    fetchData();
    initializeCanvas();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [vehiclesRes, customersRes] = await Promise.all([
        fetch('/api/vehicles'),
        fetch('/api/customers')
      ]);

      const [vehiclesData, customersData] = await Promise.all([
        vehiclesRes.json(),
        customersRes.json()
      ]);

      if (vehiclesData.success) {
        setVehicles(vehiclesData.vehicles.filter(v => v.status === 'available'));
      }
      if (customersData.success) {
        setCustomers(customersData.customers.filter(c => !c.isBlacklisted));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const initializeCanvas = () => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.strokeStyle = '#3B82F6';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
    }
  };

  const startDrawing = (e) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      const canvas = canvasRef.current;
      setSignature(canvas.toDataURL());
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignature('');
  };

  const calculateEndTime = () => {
    console.log('Calculating end time with:', { startTime, packageType });
    
    if (!startTime || !packageType) {
      console.warn('Missing startTime or packageType:', { startTime, packageType });
      return '';
    }
    
    try {
      const start = new Date(startTime);
      const packageInfo = CUSTOM_RATES[packageType];
      
      if (!packageInfo) {
        console.error('Package info not found for:', packageType);
        return '';
      }
      
      let end;
      
      if (packageType === 'night') {
        // Night package: Set end time to 9 AM next day
        end = new Date(start);
        end.setDate(end.getDate() + 1);
        end.setHours(9, 0, 0, 0);
      } else {
        // Add hours for half day or full day
        end = new Date(start.getTime() + (packageInfo.maxHours * 60 * 60 * 1000));
      }
      
      const endTimeString = end.toISOString();
      console.log('Calculated end time:', endTimeString);
      return endTimeString;
      
    } catch (error) {
      console.error('Error calculating end time:', error);
      return '';
    }
  };

  const handleNewCustomerSubmit = async () => {
    if (!newCustomer.name || !newCustomer.phone || !newCustomer.driverLicense) {
      alert('Please fill all customer details');
      return;
    }

    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCustomer)
      });

      const data = await response.json();
      if (data.success) {
        setCustomers([...customers, data.customer]);
        setSelectedCustomer(data.customer._id);
        setShowNewCustomerForm(false);
        setNewCustomer({ name: '', phone: '', driverLicense: '' });
      } else {
        alert(data.error || 'Error creating customer');
      }
    } catch (error) {
      console.error('Error creating customer:', error);
      alert('Error creating customer');
    }
  };

  const handleStartTimeChange = (newStartTime) => {
    console.log('Start time changed to:', newStartTime);
    setStartTime(newStartTime);
    
    // Validate the start time
    if (newStartTime) {
      const selectedTime = new Date(newStartTime);
      const now = new Date();
      
      // Check if start time is in the past
      if (selectedTime < now) {
        console.warn('Start time is in the past');
        // You might want to show a warning but still allow it for custom bookings
      }
      
      // Log calculated end time for debugging
      const calculatedEnd = calculateEndTime();
      console.log('Calculated end time after start time change:', calculatedEnd);
    }
  };

  const handleSubmit = async () => {
    console.log('Starting booking submission...');
    
    // Enhanced validation
    if (!selectedVehicle) {
      alert('Please select a vehicle');
      return;
    }
    if (!selectedCustomer) {
      alert('Please select a customer');
      return;
    }
    if (!startTime) {
      alert('Please select start time');
      return;
    }
    if (!packageType) {
      alert('Please select a package type');
      return;
    }
    if (!signature) {
      alert('Please provide customer signature');
      return;
    }
  
    // Calculate end time with validation
    const calculatedEndTime = calculateEndTime();
    if (!calculatedEndTime) {
      alert('Error calculating end time. Please check start time and package selection.');
      return;
    }
  
    const packageInfo = CUSTOM_RATES[packageType];
    
    console.log('Creating booking with data:', {
      selectedVehicle,
      selectedCustomer,
      startTime,
      calculatedEndTime,
      packageType,
      packageInfo
    });
  
    const bookingData = {
      vehicleId: selectedVehicle,
      customerId: selectedCustomer,
      signature,
      startTime,
      endTime: calculatedEndTime, // 🚀 FIXED: Use calculated end time
      paymentMethod,
      isCustomBooking: true,
      customBookingType: packageType,
      customBookingLabel: packageInfo.label,
      finalAmount: packageInfo.price,
      helmetProvided: checklist.helmetProvided,
      aadharCardCollected: checklist.aadharCardCollected,
      vehicleInspected: checklist.vehicleInspected,
      securityDepositCollected: checklist.securityDepositCollected,
      securityDepositAmount: checklist.securityDepositCollected ? 500 : 0
    };
  
    console.log('Final booking data:', bookingData);
  
    setSubmitting(true);
    try {
      const response = await fetch('/api/custom-bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData)
      });
  
      const data = await response.json();
      console.log('API Response:', data);
      
      if (data.success) {
        router.push(`/booking/confirmation/${data.booking.bookingId}`);
      } else {
        console.error('Booking creation failed:', data.error);
        alert(data.error || 'Error creating booking');
      }
    } catch (error) {
      console.error('Error creating booking:', error);
      alert('Network error: Please check your connection and try again');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedPackage = CUSTOM_RATES[packageType];
  const endTime = calculateEndTime();

  if (loading) {
    return (
      <ThemedLayout>
        <div className="min-h-screen flex items-center justify-center">
          <ThemedCard>
            <div className="flex items-center space-x-3 p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
              <span className="text-white text-xl">Loading...</span>
            </div>
          </ThemedCard>
        </div>
      </ThemedLayout>
    );
  }

  return (
    <ThemedLayout>
      <div className="container mx-auto px-6 py-8">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <h2 className={theme.typography.hero}>
            Custom <span className={theme.typography.gradient}>Booking</span>
          </h2>
          <p className={`${theme.typography.subtitle} max-w-2xl mx-auto mt-4`}>
            Fixed flat rate packages for convenient booking
          </p>
        </div>

        {/* Package Selection */}
        <ThemedCard title="📦 Select Package" className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
            {Object.entries(CUSTOM_RATES).map(([key, packageInfo]) => (
              <div
                key={key}
                className={cn(
                  "border-2 rounded-xl p-6 cursor-pointer transition-all",
                  packageType === key
                    ? "border-cyan-500 bg-cyan-500/10"
                    : "border-gray-600 hover:border-cyan-400"
                )}
                onClick={() => setPackageType(key)}
              >
                <div className="text-center">
                  <div className="text-3xl mb-2">
                    {key === 'half_day' && '🌅'}
                    {key === 'full_day' && '☀️'}
                    {key === 'night' && '🌙'}
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">
                    {packageInfo.label}
                  </h3>
                  <div className="text-3xl font-bold text-cyan-400 mb-2">
                    ₹{packageInfo.price.toLocaleString('en-IN')}
                  </div>
                  <div className="text-sm text-gray-400">
                    Max {packageInfo.maxHours} hours
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ThemedCard>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Vehicle Selection */}
            <ThemedCard title="🚗 Select Vehicle">
              <div className="p-6">
                <ThemedSelect
                  label="Available Vehicles"
                  value={selectedVehicle}
                  onValueChange={setSelectedVehicle}
                  options={vehicles.map(vehicle => ({
                    value: vehicle._id,
                    label: `${vehicle.model} (${vehicle.plateNumber}) - ${vehicle.type}`
                  }))}
                  placeholder="Choose a vehicle"
                />
                {vehicles.length === 0 && (
                  <div className="text-center text-gray-400 py-4">
                    No vehicles available. Please add vehicles first.
                  </div>
                )}
              </div>
            </ThemedCard>

            {/* Customer Selection */}
            <ThemedCard title="👤 Select Customer">
              <div className="p-6 space-y-4">
                {!showNewCustomerForm ? (
                  <>
                    <ThemedSelect
                      label="Existing Customers"
                      value={selectedCustomer}
                      onValueChange={setSelectedCustomer}
                      options={customers.map(customer => ({
                        value: customer._id,
                        label: `${customer.name} (${customer.phone})`
                      }))}
                      placeholder="Choose a customer"
                    />
                    <ThemedButton
                      variant="secondary"
                      onClick={() => setShowNewCustomerForm(true)}
                      className="w-full"
                    >
                      + Add New Customer
                    </ThemedButton>
                  </>
                ) : (
                  <div className="space-y-4">
                    <h4 className="font-semibold text-white">New Customer Details</h4>
                    <ThemedInput
                      label="Full Name"
                      value={newCustomer.name}
                      onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                      placeholder="Enter customer name"
                    />
                    <ThemedInput
                      label="Phone Number"
                      value={newCustomer.phone}
                      onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                      placeholder="Enter phone number"
                    />
                    <ThemedInput
                      label="Driver License"
                      value={newCustomer.driverLicense}
                      onChange={(e) => setNewCustomer({...newCustomer, driverLicense: e.target.value})}
                      placeholder="Enter license number"
                    />
                    <div className="flex space-x-3">
                      <ThemedButton
                        variant="success"
                        onClick={handleNewCustomerSubmit}
                        className="flex-1"
                      >
                        Save Customer
                      </ThemedButton>
                      <ThemedButton
                        variant="secondary"
                        onClick={() => setShowNewCustomerForm(false)}
                        className="flex-1"
                      >
                        Cancel
                      </ThemedButton>
                    </div>
                  </div>
                )}
              </div>
            </ThemedCard>

            {/* Timing */}
            <ThemedCard title="⏰ Rental Timing">
              <div className="p-6 space-y-4">
                <ThemedInput
                  label="Start Time"
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
                {endTime && (
                  <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-4">
                    <div className="text-sm text-blue-200 mb-1">Expected End Time</div>
                    <div className="text-lg font-bold text-blue-400">
                      {new Date(endTime).toLocaleString('en-IN')}
                    </div>
                  </div>
                )}
              </div>
            </ThemedCard>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Safety Checklist */}
            <ThemedCard title="✅ Safety Checklist">
              <div className="p-6 space-y-4">
                {Object.entries({
                  helmetProvided: '🪖 Helmet Provided',
                  aadharCardCollected: '🆔 Aadhar Card Collected',
                  vehicleInspected: '🔍 Vehicle Inspected',
                  securityDepositCollected: '💰 Security Deposit'
                }).map(([key, label]) => (
                  <label key={key} className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checklist[key]}
                      onChange={(e) => setChecklist({...checklist, [key]: e.target.checked})}
                      className="w-5 h-5 text-cyan-600 border-gray-600 rounded focus:ring-cyan-500 bg-gray-800"
                    />
                    <span className="text-white">{label}</span>
                  </label>
                ))}
                
                {checklist.securityDepositCollected && (
                  <ThemedInput
                    label="Security Deposit Amount (₹)"
                    type="number"
                    value={securityDepositAmount}
                    onChange={(e) => setSecurityDepositAmount(Number(e.target.value))}
                    placeholder="Enter deposit amount"
                  />
                )}
              </div>
            </ThemedCard>

            {/* Payment Method */}
            <ThemedCard title="💳 Payment Method">
              <div className="p-6">
                <ThemedSelect
                  label="Payment Method"
                  value={paymentMethod}
                  onValueChange={setPaymentMethod}
                  options={[
                    { value: 'cash', label: '💵 Cash' },
                    { value: 'upi', label: '📱 UPI' }
                  ]}
                />
              </div>
            </ThemedCard>

            {/* Customer Signature */}
            <ThemedCard title="✍️ Customer Signature">
              <div className="p-6">
                <div className="border-2 border-dashed border-gray-600 rounded-lg p-4">
                  <canvas
                    ref={canvasRef}
                    width="400"
                    height="200"
                    className="border border-gray-700 rounded w-full bg-white cursor-crosshair"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                  />
                  <div className="flex justify-between mt-3">
                    <span className="text-sm text-gray-400">Customer signature required</span>
                    <ThemedButton
                      variant="secondary"
                      onClick={clearSignature}
                      className="text-xs"
                    >
                      Clear
                    </ThemedButton>
                  </div>
                </div>
              </div>
            </ThemedCard>
          </div>
        </div>

        {/* Booking Summary */}
        <ThemedCard title="📋 Booking Summary" className="mt-8">
          <div className="p-6">
            <div className="bg-gradient-to-r from-cyan-900/50 to-blue-900/50 border border-cyan-700/50 rounded-xl p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-lg font-bold text-cyan-200 mb-4">Package Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Package:</span>
                      <span className="text-white font-medium">{selectedPackage.label}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Fixed Rate:</span>
                      <span className="text-cyan-400 font-bold">₹{selectedPackage.price.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Max Duration:</span>
                      <span className="text-white">{selectedPackage.maxHours} hours</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-lg font-bold text-cyan-200 mb-4">Total Amount</h4>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-cyan-400 mb-2">
                      ₹{selectedPackage.price.toLocaleString('en-IN')}
                    </div>
                    <div className="text-sm text-gray-300">
                      {checklist.securityDepositCollected && (
                        <div>+ ₹{securityDepositAmount.toLocaleString('en-IN')} security deposit</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ThemedCard>

        {/* Action Buttons */}
        <div className="flex flex-col md:flex-row gap-4 mt-8">
          <ThemedButton
            variant="primary"
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 py-4 text-lg"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                Creating Booking...
              </>
            ) : (
              '🎯 Create Custom Booking'
            )}
          </ThemedButton>
          <ThemedButton
            variant="secondary"
            onClick={() => router.push('/admin')}
            className="py-4"
          >
            Cancel
          </ThemedButton>
        </div>
      </div>
    </ThemedLayout>
  );
}