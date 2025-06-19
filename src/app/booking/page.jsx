// src/app/booking/page.js
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SignatureCanvas from '@/components/SignatureCanvas';
import { validatePhoneNumber, validateDrivingLicense } from '@/lib/validations';
import LabelInputContainer from '@/components/ui/LabelInputContainer';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export default function BookingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [availableVehicles, setAvailableVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  const [bookingData, setBookingData] = useState({
    // Vehicle Selection
    vehicleId: '',
    selectedVehicle: null,
    
    // Customer Details
    customer: {
      name: '',
      phone: '',
      driverLicense: ''
    },
    
    // Pre-rental Checklist
    checklist: {
      helmetProvided: false,
      aadharCardCollected: false,
      vehicleInspected: false
    },
    additionalNotes: '',
    
    // Terms & Signature
    signature: '',
    termsAccepted: false
  });

  useEffect(() => {
    fetchAvailableVehicles();
  }, []);

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
        // Redirect to booking confirmation page
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading available vehicles...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-blue-600 hover:text-blue-800">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">New Booking</h1>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Step {currentStep} of 4</div>
              <div className="text-lg font-semibold text-gray-900">{getStepTitle(currentStep)}</div>
            </div>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  step <= currentStep 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  {step}
                </div>
                {step < 4 && (
                  <div className={`flex-1 h-1 mx-2 ${
                    step < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Step 1: Vehicle Selection */}
        {currentStep === 1 && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Select Vehicle</h2>
            
            {/* Vehicle Selection */}
            <div className="mb-8">
              <label className="block text-lg font-semibold text-gray-700 mb-4">Available Vehicles</label>
              {availableVehicles.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-xl">No vehicles available for booking</p>
                  <Link href="/vehicles" className="text-blue-600 hover:text-blue-800 font-medium">
                    Manage Vehicles →
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {availableVehicles.map((vehicle) => (
                    <div
                      key={vehicle._id}
                      onClick={() => handleVehicleSelect(vehicle)}
                      className={`p-6 rounded-lg border-2 cursor-pointer transition-all ${
                        bookingData.vehicleId === vehicle._id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 capitalize">
                            {vehicle.type} - {vehicle.model}
                          </h3>
                          <p className="text-gray-600 text-lg font-mono">{vehicle.plateNumber}</p>
                          <span className="inline-block mt-2 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                            Available
                          </span>
                        </div>
                        {bookingData.vehicleId === vehicle._id && (
                          <div className="text-blue-500">
                            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Booking confirmation */}
            {bookingData.selectedVehicle && (
              <div className="border-t pt-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Details</h3>
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="font-medium text-gray-700">Vehicle:</span>
                      <span className="ml-2">
                        {bookingData.selectedVehicle.type} - {bookingData.selectedVehicle.model}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Plate Number:</span>
                      <span className="ml-2 font-mono font-bold">
                        {bookingData.selectedVehicle.plateNumber}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <p className="text-blue-800 text-sm">
                      <strong>Note:</strong> Booking will start immediately when completed. 
                      Payment will be collected when the customer returns the vehicle 
                      based on actual usage time at ₹80/hour.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Customer Information */}
        {currentStep === 2 && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Customer Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <LabelInputContainer>
                <Label>Full Name *</Label>
                <Input
                  type="text"
                  value={bookingData.customer.name}
                  onChange={(e) => handleCustomerChange('name', e.target.value)}
                  placeholder="Enter customer's full name"
                  required
                />
              </LabelInputContainer>

              <LabelInputContainer>
                <Label>Phone Number *</Label>
                <Input
                  type="tel"
                  value={bookingData.customer.phone}
                  onChange={(e) => handleCustomerChange('phone', e.target.value)}
                  placeholder="Enter 10-digit phone number"
                  className={` ${
                    bookingData.customer.phone && !validatePhoneNumber(bookingData.customer.phone)
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-300'
                  }`}
                  maxLength="10"
                  required
                />
                {bookingData.customer.phone && !validatePhoneNumber(bookingData.customer.phone) && (
                  <p className="text-red-600 text-sm mt-1">Please enter a valid 10-digit phone number</p>
                )}
              </LabelInputContainer>

              <LabelInputContainer >
                <Label>Driver License Number *</Label>
                <Input
                  type="text"
                  value={bookingData.customer.driverLicense}
                  onChange={(e) => handleCustomerChange('driverLicense', e.target.value.toUpperCase())}
                  placeholder="e.g., MP1420110012345"
                  className={` ${
                    bookingData.customer.driverLicense && !validateDrivingLicense(bookingData.customer.driverLicense)
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-300'
                  }`}
                  required
                />
                {bookingData.customer.driverLicense && !validateDrivingLicense(bookingData.customer.driverLicense) && (
                  <p className="text-red-600 text-sm mt-1">Please enter a valid driving license number</p>
                )}
              </LabelInputContainer>
            </div>

            {/* Note about Aadhar */}
            <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-yellow-900 mb-2">📄 Aadhar Card Collection</h3>
              <p className="text-yellow-800">
                <strong>Note:</strong> Aadhar card will be collected physically from the customer and uploaded 
                separately in the back office system for record keeping.
              </p>
            </div>
          </div>
        )}

        {/* Step 3: Pre-Rental Checklist */}
        {currentStep === 3 && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Pre-Rental Checklist</h2>
            
            <div className="space-y-6">
              {/* Safety Items */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Safety & Documentation</h3>
                <div className="space-y-4">
                  <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                    <input
                      type="checkbox"
                      id="helmet"
                      checked={bookingData.checklist.helmetProvided}
                      onChange={(e) => handleChecklistChange('helmetProvided', e.target.checked)}
                      className="w-6 h-6 text-blue-600 border-2 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="helmet" className="ml-4 text-lg font-medium text-gray-700">
                      🪖 Helmet provided to customer
                    </label>
                  </div>

                  <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                    <input
                      type="checkbox"
                      id="aadhar"
                      checked={bookingData.checklist.aadharCardCollected}
                      onChange={(e) => handleChecklistChange('aadharCardCollected', e.target.checked)}
                      className="w-6 h-6 text-blue-600 border-2 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="aadhar" className="ml-4 text-lg font-medium text-gray-700">
                      📄 Aadhar card collected from customer
                    </label>
                  </div>

                  <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                    <input
                      type="checkbox"
                      id="inspection"
                      checked={bookingData.checklist.vehicleInspected}
                      onChange={(e) => handleChecklistChange('vehicleInspected', e.target.checked)}
                      className="w-6 h-6 text-blue-600 border-2 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="inspection" className="ml-4 text-lg font-medium text-gray-700">
                      🔍 Vehicle condition inspected with customer
                    </label>
                  </div>
                </div>
              </div>

              {/* Additional Notes */}
              <div>
                <label className="block text-lg font-semibold text-gray-700 mb-3">Additional Notes (Optional)</label>
                <textarea
                  value={bookingData.additionalNotes}
                  onChange={(e) => setBookingData(prev => ({ ...prev, additionalNotes: e.target.value }))}
                  placeholder="Any scratches, damages, or special instructions..."
                  className="w-full px-4 py-4 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows="4"
                />
              </div>

              {/* Checklist Summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h4 className="font-semibold text-blue-900 mb-2">✅ Checklist Status</h4>
                <div className="text-sm text-blue-800 space-y-1">
                  <div>Helmet: {bookingData.checklist.helmetProvided ? '✓ Provided' : '❌ Not provided'}</div>
                  <div>Aadhar Card: {bookingData.checklist.aadharCardCollected ? '✓ Collected' : '❌ Not collected'}</div>
                  <div>Vehicle Inspection: {bookingData.checklist.vehicleInspected ? '✓ Completed' : '❌ Not completed'}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Terms & Digital Signature */}
        {currentStep === 4 && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Terms & Digital Signature</h2>
            
            {/* Final Booking Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
              <h3 className="text-xl font-bold text-blue-900 mb-4">Booking Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p><span className="font-medium">Customer:</span> {bookingData.customer.name}</p>
                  <p><span className="font-medium">Phone:</span> {bookingData.customer.phone}</p>
                  <p><span className="font-medium">License:</span> {bookingData.customer.driverLicense}</p>
                </div>
                <div>
                  <p><span className="font-medium">Vehicle:</span> {bookingData.selectedVehicle?.model} ({bookingData.selectedVehicle?.plateNumber})</p>
                  <p><span className="font-medium">Payment:</span> On Return (₹80/hour)</p>
                </div>
              </div>
            </div>

            {/* Terms & Conditions Checkbox */}
            <div className="mb-8">
              <div className="flex items-start space-x-4">
                <input
                  type="checkbox"
                  id="termsAccepted"
                  checked={bookingData.termsAccepted}
                  onChange={(e) => setBookingData(prev => ({ ...prev, termsAccepted: e.target.checked }))}
                  className="w-6 h-6 text-blue-600 border-2 border-gray-300 rounded focus:ring-blue-500 mt-1"
                />
                <label htmlFor="termsAccepted" className="text-lg font-medium text-gray-700">
                  I have read and agree to the rental terms and conditions. I understand that:
                  <ul className="mt-2 text-sm text-gray-600 list-disc list-inside space-y-1">
                    <li>Payment will be collected upon vehicle return</li>
                    <li>Rate is ₹80 per hour or part thereof</li>
                    <li>I am responsible for vehicle safety and damages</li>
                    <li>Helmet must be worn at all times</li>
                    <li>Late return incurs additional charges</li>
                  </ul>
                </label>
              </div>
            </div>

            {/* Digital Signature */}
            <div className="mb-8">
              <label className="block text-lg font-semibold text-gray-700 mb-4">Customer Signature *</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
                <SignatureCanvas 
                  onSignatureChange={handleSignatureChange}
                  signature={bookingData.signature}
                />
              </div>
            </div>

            {/* Complete Booking Button */}
            <div className="border-t pt-6">
              <button
                onClick={handleCompleteBooking}
                disabled={!canProceedFromStep(4) || submitting}
                className={`w-full py-4 rounded-lg font-bold text-xl ${
                  canProceedFromStep(4) && !submitting
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
              >
                {submitting ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                    Creating Booking...
                  </div>
                ) : (
                  'Complete Booking & Generate Receipt'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className={`px-8 py-4 rounded-lg font-semibold text-lg ${
              currentStep === 1
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-gray-600 hover:bg-gray-700 text-white'
            }`}
          >
            ← Previous
          </button>

          {currentStep < 4 && (
            <button
              onClick={handleNext}
              disabled={!canProceedFromStep(currentStep)}
              className={`px-8 py-4 rounded-lg font-semibold text-lg ${
                !canProceedFromStep(currentStep)
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              Next →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}