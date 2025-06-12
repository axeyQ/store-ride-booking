'use client';

import { useState, useRef, useEffect } from 'react';

const BookingForm = () => {
  // Updated form data - removed pickupDate (auto-set to today)
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    dlNumber: '',
    vehicleType: '',
    vehicleNumber: '',
    pickupTime: ''
  });

  // Auto-set pickup date to today
  const todayDate = new Date().toISOString().split('T')[0];
  const currentTime = new Date().toTimeString().split(' ')[0].substring(0, 5);

  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signature, setSignature] = useState(null);
  const [generatedOTP, setGeneratedOTP] = useState('');
  const [enteredOTP, setEnteredOTP] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [showOTP, setShowOTP] = useState(false);
  const [errors, setErrors] = useState({});
  const [availableVehicles, setAvailableVehicles] = useState({});
  const [loading, setLoading] = useState(false);
  
  // Blacklist-related state
  const [blacklistStatus, setBlacklistStatus] = useState(null);
  const [blacklistChecked, setBlacklistChecked] = useState(false);
  const [blockBooking, setBlockBooking] = useState(false);

  // Auto-set current time when component loads
  useEffect(() => {
    if (!formData.pickupTime) {
      setFormData(prev => ({
        ...prev,
        pickupTime: currentTime
      }));
    }
  }, [currentTime]);

  // Load available vehicles when vehicle type changes
  useEffect(() => {
    if (formData.vehicleType) {
      loadAvailableVehicles(formData.vehicleType);
    }
  }, [formData.vehicleType]);

  // Check blacklist when mobile number is complete
  useEffect(() => {
    if (formData.mobile.length === 10) {
      checkBlacklistStatus();
    } else {
      setBlacklistStatus(null);
      setBlacklistChecked(false);
      setBlockBooking(false);
    }
  }, [formData.mobile]);

  const loadAvailableVehicles = async (type) => {
    try {
      const response = await fetch(`/api/vehicles/available?type=${type}`);
      const result = await response.json();
      if (result.success) {
        setAvailableVehicles(prev => ({
          ...prev,
          [type]: result.data.map(v => v.vehicleNumber)
        }));
      }
    } catch (error) {
      console.error('Error loading vehicles:', error);
    }
  };

  const checkBlacklistStatus = async () => {
    try {
      const response = await fetch('/api/bookings/check-blacklist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mobile: formData.mobile,
          aadhaarNumber: null
        })
      });
      
      const result = await response.json();
      if (result.success) {
        setBlacklistStatus(result);
        setBlacklistChecked(true);
        
        if (result.isBlacklisted) {
          setBlockBooking(result.blacklistInfo.severity === 'high' || result.blacklistInfo.severity === 'critical');
          
          if (result.customerDetails && !formData.name) {
            setFormData(prev => ({
              ...prev,
              name: result.customerDetails.name,
              dlNumber: result.customerDetails.dlNumber
            }));
          }
        }
      }
    } catch (error) {
      console.error('Error checking blacklist:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.mobile.trim()) newErrors.mobile = 'Mobile number is required';
    else if (!/^[6-9]\d{9}$/.test(formData.mobile)) newErrors.mobile = 'Invalid mobile number';
    
    if (!formData.dlNumber.trim()) newErrors.dlNumber = 'Driving License number is required';
    
    if (!formData.vehicleType) newErrors.vehicleType = 'Please select vehicle type';
    if (!formData.vehicleNumber) newErrors.vehicleNumber = 'Please select vehicle';
    if (!formData.pickupTime) newErrors.pickupTime = 'Pickup time is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Canvas signature functions
  const startDrawing = (e) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const ctx = canvas.getContext('2d');
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';
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
    setSignature(null);
  };

  const generateOTP = () => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOTP(otp);
    setShowOTP(true);
    setEnteredOTP('');
    setOtpVerified(false);
  };

  const verifyOTP = () => {
    if (enteredOTP === generatedOTP) {
      setOtpVerified(true);
      alert('OTP Verified Successfully!');
    } else {
      alert('Invalid OTP. Please try again.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (blockBooking) {
      alert('This customer is blacklisted and cannot make bookings. Please contact management.');
      return;
    }
    
    if (!validateForm()) {
      alert('Please fill all required fields correctly');
      return;
    }

    if (!signature) {
      alert('Please provide your signature');
      return;
    }

    if (!otpVerified) {
      alert('Please verify OTP first');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          pickupDate: todayDate, // Automatically use today's date
          signature,
          otp: generatedOTP
        })
      });

      const result = await response.json();
      
      if (result.success) {
        alert('Booking Created Successfully! Booking ID: ' + result.data._id.substring(0, 8));
        
        // Reset form but keep today's time
        setFormData({
          name: '',
          mobile: '',
          dlNumber: '',
          vehicleType: '',
          vehicleNumber: '',
          pickupTime: currentTime // Reset to current time
        });
        clearSignature();
        setShowOTP(false);
        setOtpVerified(false);
        setEnteredOTP('');
        setGeneratedOTP('');
        setBlacklistStatus(null);
        setBlacklistChecked(false);
        setBlockBooking(false);
        
      } else {
        alert('Error creating booking: ' + result.error);
      }
    } catch (error) {
      console.error('Error creating booking:', error);
      alert('Error creating booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Blacklist Warning Component
  const BlacklistWarning = () => {
    if (!blacklistStatus?.isBlacklisted) return null;
    
    const { blacklistInfo } = blacklistStatus;
    const severityColors = {
      low: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      medium: 'bg-orange-50 border-orange-200 text-orange-800',
      high: 'bg-red-50 border-red-200 text-red-800',
      critical: 'bg-red-100 border-red-300 text-red-900'
    };
    
    return (
      <div className={`p-4 rounded-lg border-2 mb-6 ${severityColors[blacklistInfo.severity]}`}>
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium">
              ⚠️ Customer Alert - {blacklistInfo.severity.toUpperCase()} Risk
            </h3>
            <div className="mt-2 text-sm">
              <p><strong>Reason:</strong> {blacklistInfo.reason}</p>
              <p><strong>Date Added:</strong> {new Date(blacklistInfo.addedDate).toLocaleDateString('en-IN')}</p>
              {blacklistInfo.notes && (
                <p><strong>Notes:</strong> {blacklistInfo.notes}</p>
              )}
            </div>
            {blockBooking && (
              <div className="mt-3 text-sm font-medium">
                🚫 This customer cannot make new bookings due to {blacklistInfo.severity} risk level.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white min-h-screen">
      <div className="bg-blue-600 text-white p-4 rounded-lg mb-6">
        <h1 className="text-2xl font-bold">MR Travels - New Booking</h1>
        <p className="text-blue-100">Simplified Digital Bike Rental System</p>
        <div className="mt-2 flex items-center text-blue-200 text-sm">
          <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
          </svg>
          <span>📅 Pickup Date: {new Date(todayDate).toLocaleDateString('en-IN')} (Today)</span>
        </div>
      </div>

      {/* Blacklist Warning */}
      <BlacklistWarning />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Details Section */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Customer Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                disabled={blockBooking}
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                } ${blockBooking ? 'bg-gray-200 cursor-not-allowed' : ''}`}
                placeholder="Enter customer name"
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mobile Number *
              </label>
              <input
                type="tel"
                name="mobile"
                value={formData.mobile}
                onChange={handleInputChange}
                disabled={blockBooking}
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.mobile ? 'border-red-500' : 'border-gray-300'
                } ${blockBooking ? 'bg-gray-200 cursor-not-allowed' : ''}`}
                placeholder="10-digit mobile number"
                maxLength="10"
              />
              {errors.mobile && <p className="text-red-500 text-sm mt-1">{errors.mobile}</p>}
              {blacklistChecked && !blacklistStatus?.isBlacklisted && formData.mobile.length === 10 && (
                <p className="text-green-600 text-sm mt-1">✓ Customer verified - No restrictions</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Driving License Number *
              </label>
              <input
                type="text"
                name="dlNumber"
                value={formData.dlNumber}
                onChange={handleInputChange}
                disabled={blockBooking}
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.dlNumber ? 'border-red-500' : 'border-gray-300'
                } ${blockBooking ? 'bg-gray-200 cursor-not-allowed' : ''}`}
                placeholder="Enter DL number"
              />
              {errors.dlNumber && <p className="text-red-500 text-sm mt-1">{errors.dlNumber}</p>}
            </div>
          </div>

          {/* Auto Date Notice */}
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start">
              <svg className="h-5 w-5 text-green-600 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div className="text-sm text-green-800">
                <p className="font-medium">🚀 Quick Booking - Today&apos;s Date Auto-Selected</p>
                <p className="mt-1">Pickup date automatically set to today ({new Date(todayDate).toLocaleDateString('en-IN')}). Most customers rent immediately!</p>
              </div>
            </div>
          </div>
        </div>

        {/* Vehicle Selection Section */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Vehicle & Timing</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vehicle Type *
              </label>
              <select
                name="vehicleType"
                value={formData.vehicleType}
                onChange={handleInputChange}
                disabled={blockBooking}
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.vehicleType ? 'border-red-500' : 'border-gray-300'
                } ${blockBooking ? 'bg-gray-200 cursor-not-allowed' : ''}`}
              >
                <option value="">Select vehicle type</option>
                <option value="bike">Bike (₹80/hr)</option>
                <option value="scooty">Scooty (₹80/hr)</option>
              </select>
              {errors.vehicleType && <p className="text-red-500 text-sm mt-1">{errors.vehicleType}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vehicle Number *
              </label>
              <select
                name="vehicleNumber"
                value={formData.vehicleNumber}
                onChange={handleInputChange}
                disabled={!formData.vehicleType || blockBooking}
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.vehicleNumber ? 'border-red-500' : 'border-gray-300'
                } ${(!formData.vehicleType || blockBooking) ? 'bg-gray-200' : ''}`}
              >
                <option value="">Select vehicle</option>
                {formData.vehicleType && availableVehicles[formData.vehicleType]?.map(vehicle => (
                  <option key={vehicle} value={vehicle}>{vehicle}</option>
                ))}
              </select>
              {errors.vehicleNumber && <p className="text-red-500 text-sm mt-1">{errors.vehicleNumber}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pickup Time *
              </label>
              <input
                type="time"
                name="pickupTime"
                value={formData.pickupTime}
                onChange={handleInputChange}
                disabled={blockBooking}
                className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.pickupTime ? 'border-red-500' : 'border-gray-300'
                } ${blockBooking ? 'bg-gray-200 cursor-not-allowed' : ''}`}
              />
              {errors.pickupTime && <p className="text-red-500 text-sm mt-1">{errors.pickupTime}</p>}
              <p className="text-xs text-gray-500 mt-1">Current time auto-filled, adjust if needed</p>
            </div>
          </div>
        </div>

        {/* Terms and Conditions */}
        <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
          <h3 className="text-lg font-semibold mb-3 text-gray-800">Terms and Conditions</h3>
          <div className="text-sm text-gray-700 space-y-2 max-h-32 overflow-y-auto border p-3 bg-white rounded">
            <p>• Customer must return the vehicle to the same location within the agreed time.</p>
            <p>• Late return charges: ₹50 per hour after the agreed return time.</p>
            <p>• Customer is responsible for any damage to the vehicle during rental period.</p>
            <p>• Valid driving license is mandatory for bike rental.</p>
            <p>• Helmet usage is mandatory and will be provided.</p>
            <p>• No refund for early returns.</p>
            <p>• Customer agrees to pay full rental amount on return.</p>
            <p>• Aadhaar card will be collected for identity verification.</p>
          </div>
        </div>

        {/* Digital Signature Section */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Digital Signature</h2>
          
          {blockBooking ? (
            <div className="border-2 border-dashed border-red-300 rounded-lg p-4 bg-red-50 text-center">
              <p className="text-red-600">Signature disabled - Customer is blacklisted</p>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-white">
              <p className="text-sm text-gray-600 mb-2">Please sign below using your finger or stylus:</p>
              <canvas
                ref={canvasRef}
                width={600}
                height={200}
                className="border border-gray-300 rounded cursor-crosshair w-full max-w-full"
                style={{ touchAction: 'none' }}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={(e) => {
                  e.preventDefault();
                  const touch = e.touches[0];
                  const mouseEvent = new MouseEvent('mousedown', {
                    clientX: touch.clientX,
                    clientY: touch.clientY
                  });
                  canvasRef.current.dispatchEvent(mouseEvent);
                }}
                onTouchMove={(e) => {
                  e.preventDefault();
                  const touch = e.touches[0];
                  const mouseEvent = new MouseEvent('mousemove', {
                    clientX: touch.clientX,
                    clientY: touch.clientY
                  });
                  canvasRef.current.dispatchEvent(mouseEvent);
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  const mouseEvent = new MouseEvent('mouseup', {});
                  canvasRef.current.dispatchEvent(mouseEvent);
                }}
              />
              <button
                type="button"
                onClick={clearSignature}
                className="mt-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
              >
                Clear Signature
              </button>
            </div>
          )}
        </div>

        {/* OTP Verification Section */}
        <div className="bg-green-50 p-6 rounded-lg border border-green-200">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">OTP Verification</h2>
          
          {blockBooking ? (
            <div className="text-center py-4">
              <p className="text-red-600">OTP verification disabled - Customer is blacklisted</p>
            </div>
          ) : !showOTP ? (
            <button
              type="button"
              onClick={generateOTP}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
            >
              Generate OTP
            </button>
          ) : (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-lg border">
                <p className="text-lg font-bold text-green-800">
                  OTP: <span className="text-2xl text-green-600">{generatedOTP}</span>
                </p>
                <p className="text-sm text-gray-600">Show this OTP to the customer</p>
              </div>
              
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer enters OTP:
                  </label>
                  <input
                    type="text"
                    value={enteredOTP}
                    onChange={(e) => setEnteredOTP(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Enter OTP"
                    maxLength="6"
                  />
                </div>
                <button
                  type="button"
                  onClick={verifyOTP}
                  disabled={enteredOTP.length !== 6}
                  className={`px-6 py-3 rounded-lg font-medium ${
                    enteredOTP.length === 6
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Verify OTP
                </button>
              </div>
              
              {otpVerified && (
                <div className="flex items-center gap-2 text-green-600">
                  <span className="text-lg">✓</span>
                  <span className="font-medium">OTP Verified Successfully!</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex justify-center pt-6">
          <button
            type="submit"
            disabled={loading || blockBooking}
            className={`px-8 py-4 rounded-lg font-medium text-lg min-w-[200px] ${
              loading || blockBooking
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {blockBooking 
              ? 'Booking Blocked' 
              : loading 
              ? 'Creating Booking...' 
              : 'Create Booking'
            }
          </button>
        </div>
      </form>
    </div>
  );
};

export default BookingForm;