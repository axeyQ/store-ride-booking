'use client';

import { useState, useEffect } from 'react';
import PhotoCapture from './PhotoCapture';

const EnhancedReturnProcess = ({ booking, onReturnComplete, onCancel }) => {
  const [returnData, setReturnData] = useState({
    returnDate: new Date().toISOString().split('T')[0],
    returnTime: new Date().toTimeString().split(' ')[0].substring(0, 5),
    customerPhoto: null,
    vehiclePhotos: {
      front: null,
      back: null,
      left: null,
      right: null
    },
    damagePhotos: [],
    vehicleCondition: {
      bodyCondition: 'good',
      tyreCondition: 'good',
      lightsWorking: true,
      hornWorking: true,
      brakesWorking: true,
      fuelLevel: 'full'
    },
    damageAssessment: {
      hasDamage: false,
      damageDescription: '',
      estimatedCost: 0
    },
    customerFeedback: {
      rating: 5,
      comments: ''
    },
    paymentMethod: 'cash',
    staffNotes: ''
  });

  const [calculatedAmount, setCalculatedAmount] = useState(0);
  const [latePenalty, setLatePenalty] = useState(0);
  const [totalHours, setTotalHours] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  // Calculate rental amount and late penalty
  useEffect(() => {
    if (booking && returnData.returnDate && returnData.returnTime) {
      const pickupDateTime = new Date(`${booking.vehicleDetails.pickupDate}T${booking.vehicleDetails.pickupTime}`);
      const returnDateTime = new Date(`${returnData.returnDate}T${returnData.returnTime}`);
      
      const diffMs = returnDateTime - pickupDateTime;
      const hours = Math.ceil(diffMs / (1000 * 60 * 60));
      const baseHours = Math.max(1, hours);
      
      setTotalHours(baseHours);
      
      const baseAmount = baseHours * (booking.booking.ratePerHour || 80);
      setCalculatedAmount(baseAmount);
      
      // Calculate late penalty (assuming 2 hours more than pickup time means late)
      const expectedReturnTime = new Date(pickupDateTime.getTime() + (2 * 60 * 60 * 1000)); // 2 hours after pickup
      if (returnDateTime > expectedReturnTime) {
        const lateHours = Math.ceil((returnDateTime - expectedReturnTime) / (1000 * 60 * 60));
        const penalty = lateHours * 50; // ₹50 per hour late
        setLatePenalty(penalty);
      } else {
        setLatePenalty(0);
      }
    }
  }, [booking, returnData.returnDate, returnData.returnTime]);

  const handleInputChange = (section, field, value) => {
    setReturnData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleDirectInputChange = (field, value) => {
    setReturnData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addDamagePhoto = (photo) => {
    setReturnData(prev => ({
      ...prev,
      damagePhotos: [...prev.damagePhotos, photo]
    }));
  };

  const removeDamagePhoto = (index) => {
    setReturnData(prev => ({
      ...prev,
      damagePhotos: prev.damagePhotos.filter((_, i) => i !== index)
    }));
  };

  const validateStep = (step) => {
    switch (step) {
      case 1: // Photos
        return returnData.customerPhoto && 
               returnData.vehiclePhotos.front && 
               returnData.vehiclePhotos.back;
      case 2: // Condition Check
        return true; // All fields have defaults
      case 3: // Payment
        return returnData.paymentMethod;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    } else {
      alert('Please complete all required fields before proceeding.');
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) {
      alert('Please complete all required fields.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const finalAmount = calculatedAmount + latePenalty + returnData.damageAssessment.estimatedCost;
      
      const returnProcessData = {
        ...returnData,
        totalAmount: finalAmount,
        baseAmount: calculatedAmount,
        latePenalty,
        damageCharges: returnData.damageAssessment.estimatedCost,
        totalHours,
        processedBy: 'staff', // This would be dynamic based on logged-in user
        processedAt: new Date().toISOString()
      };

      await onReturnComplete(returnProcessData);
      
    } catch (error) {
      console.error('Error processing return:', error);
      alert('Error processing return. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const StepIndicator = () => (
    <div className="flex items-center justify-center space-x-4 mb-8">
      {[1, 2, 3].map((step) => (
        <div key={step} className="flex items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            currentStep >= step 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-300 text-gray-600'
          }`}>
            {step}
          </div>
          {step < 3 && (
            <div className={`w-16 h-1 mx-2 ${
              currentStep > step ? 'bg-blue-600' : 'bg-gray-300'
            }`} />
          )}
        </div>
      ))}
    </div>
  );

  const PhotoStep = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-800">Step 1: Photo Documentation</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Customer Photo */}
        <div>
          <PhotoCapture
            label="Customer Photo"
            required
            onPhotoCapture={(photo) => handleDirectInputChange('customerPhoto', photo)}
          />
        </div>

        {/* Vehicle Front Photo */}
        <div>
          <PhotoCapture
            label="Vehicle Front View"
            required
            onPhotoCapture={(photo) => handleInputChange('vehiclePhotos', 'front', photo)}
          />
        </div>

        {/* Vehicle Back Photo */}
        <div>
          <PhotoCapture
            label="Vehicle Back View"
            required
            onPhotoCapture={(photo) => handleInputChange('vehiclePhotos', 'back', photo)}
          />
        </div>

        {/* Vehicle Left Side */}
        <div>
          <PhotoCapture
            label="Vehicle Left Side"
            onPhotoCapture={(photo) => handleInputChange('vehiclePhotos', 'left', photo)}
          />
        </div>

        {/* Vehicle Right Side */}
        <div>
          <PhotoCapture
            label="Vehicle Right Side"
            onPhotoCapture={(photo) => handleInputChange('vehiclePhotos', 'right', photo)}
          />
        </div>
      </div>
    </div>
  );

  const ConditionStep = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-800">Step 2: Vehicle Condition Assessment</h3>
      
      {/* Basic Condition Checks */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <h4 className="font-medium text-gray-800 mb-4">Vehicle Condition</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Body Condition</label>
            <select
              value={returnData.vehicleCondition.bodyCondition}
              onChange={(e) => handleInputChange('vehicleCondition', 'bodyCondition', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="excellent">Excellent</option>
              <option value="good">Good</option>
              <option value="fair">Fair</option>
              <option value="poor">Poor</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tyre Condition</label>
            <select
              value={returnData.vehicleCondition.tyreCondition}
              onChange={(e) => handleInputChange('vehicleCondition', 'tyreCondition', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="excellent">Excellent</option>
              <option value="good">Good</option>
              <option value="fair">Fair</option>
              <option value="poor">Poor</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Fuel Level</label>
            <select
              value={returnData.vehicleCondition.fuelLevel}
              onChange={(e) => handleInputChange('vehicleCondition', 'fuelLevel', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="full">Full</option>
              <option value="three-quarter">3/4</option>
              <option value="half">Half</option>
              <option value="quarter">1/4</option>
              <option value="empty">Empty</option>
            </select>
          </div>
        </div>

        {/* Functional Checks */}
        <div className="mt-6">
          <h5 className="font-medium text-gray-700 mb-3">Functional Checks</h5>
          <div className="space-y-3">
            {[
              { key: 'lightsWorking', label: 'Lights Working' },
              { key: 'hornWorking', label: 'Horn Working' },
              { key: 'brakesWorking', label: 'Brakes Working' }
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={returnData.vehicleCondition[key]}
                  onChange={(e) => handleInputChange('vehicleCondition', key, e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Damage Assessment */}
      <div className="bg-red-50 p-6 rounded-lg border border-red-200">
        <h4 className="font-medium text-gray-800 mb-4">Damage Assessment</h4>
        
        <label className="flex items-center space-x-3 mb-4">
          <input
            type="checkbox"
            checked={returnData.damageAssessment.hasDamage}
            onChange={(e) => handleInputChange('damageAssessment', 'hasDamage', e.target.checked)}
            className="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 rounded focus:ring-red-500"
          />
          <span className="text-sm font-medium text-gray-700">Vehicle has damage</span>
        </label>

        {returnData.damageAssessment.hasDamage && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Damage Description</label>
              <textarea
                value={returnData.damageAssessment.damageDescription}
                onChange={(e) => handleInputChange('damageAssessment', 'damageDescription', e.target.value)}
                rows={3}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                placeholder="Describe the damage in detail..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Estimated Repair Cost (₹)</label>
              <input
                type="number"
                value={returnData.damageAssessment.estimatedCost}
                onChange={(e) => handleInputChange('damageAssessment', 'estimatedCost', parseInt(e.target.value) || 0)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                placeholder="0"
              />
            </div>

            {/* Damage Photos */}
            <div>
              <h5 className="font-medium text-gray-700 mb-3">Damage Photos</h5>
              
              <PhotoCapture
                label="Add Damage Photo"
                onPhotoCapture={addDamagePhoto}
              />

              {returnData.damagePhotos.length > 0 && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                  {returnData.damagePhotos.map((photo, index) => (
                    <div key={index} className="relative">
                      <img
                        src={photo}
                        alt={`Damage ${index + 1}`}
                        className="w-full h-24 object-cover rounded border"
                      />
                      <button
                        type="button"
                        onClick={() => removeDamagePhoto(index)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 text-white rounded-full text-xs hover:bg-red-700"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Customer Feedback */}
      <div className="bg-green-50 p-6 rounded-lg border border-green-200">
        <h4 className="font-medium text-gray-800 mb-4">Customer Feedback</h4>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Rating (1-5 stars)</label>
            <div className="flex space-x-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => handleInputChange('customerFeedback', 'rating', star)}
                  className={`w-8 h-8 ${
                    star <= returnData.customerFeedback.rating
                      ? 'text-yellow-400'
                      : 'text-gray-300'
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Comments (Optional)</label>
            <textarea
              value={returnData.customerFeedback.comments}
              onChange={(e) => handleInputChange('customerFeedback', 'comments', e.target.value)}
              rows={2}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              placeholder="Any additional feedback..."
            />
          </div>
        </div>
      </div>
    </div>
  );

  const PaymentStep = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-800">Step 3: Payment & Finalization</h3>
      
      {/* Amount Breakdown */}
      <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
        <h4 className="font-medium text-gray-800 mb-4">Amount Breakdown</h4>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Base Rental ({totalHours} hours × ₹{booking?.booking?.ratePerHour || 80})</span>
            <span>₹{calculatedAmount}</span>
          </div>
          
          {latePenalty > 0 && (
            <div className="flex justify-between text-red-600">
              <span>Late Return Penalty</span>
              <span>₹{latePenalty}</span>
            </div>
          )}
          
          {returnData.damageAssessment.estimatedCost > 0 && (
            <div className="flex justify-between text-red-600">
              <span>Damage Charges</span>
              <span>₹{returnData.damageAssessment.estimatedCost}</span>
            </div>
          )}
          
          <hr className="my-2" />
          
          <div className="flex justify-between font-semibold text-lg">
            <span>Total Amount</span>
            <span>₹{calculatedAmount + latePenalty + returnData.damageAssessment.estimatedCost}</span>
          </div>
        </div>
      </div>

      {/* Payment Method */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <h4 className="font-medium text-gray-800 mb-4">Payment Method</h4>
        
        <div className="space-y-3">
          {[
            { value: 'cash', label: 'Cash' },
            { value: 'upi', label: 'UPI' },
            { value: 'card', label: 'Card' }
          ].map(({ value, label }) => (
            <label key={value} className="flex items-center space-x-3">
              <input
                type="radio"
                name="paymentMethod"
                value={value}
                checked={returnData.paymentMethod === value}
                onChange={(e) => handleDirectInputChange('paymentMethod', e.target.value)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Staff Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Staff Notes (Optional)</label>
        <textarea
          value={returnData.staffNotes}
          onChange={(e) => handleDirectInputChange('staffNotes', e.target.value)}
          rows={3}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="Any additional notes about the return process..."
        />
      </div>
    </div>
  );

  if (!booking) {
    return (
      <div className="text-center py-8 text-gray-500">
        No booking selected for return processing.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white">
      <div className="bg-blue-600 text-white p-4 rounded-lg mb-6">
        <h1 className="text-xl font-bold">Vehicle Return Process</h1>
        <p className="text-blue-100">
          {booking.vehicleDetails.vehicleNumber} - {booking.customerDetails.name}
        </p>
      </div>

      <StepIndicator />

      <div className="min-h-96">
        {currentStep === 1 && <PhotoStep />}
        {currentStep === 2 && <ConditionStep />}
        {currentStep === 3 && <PaymentStep />}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-8">
        <div className="space-x-4">
          {currentStep > 1 && (
            <button
              type="button"
              onClick={() => setCurrentStep(prev => prev - 1)}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Previous
            </button>
          )}
          
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50"
          >
            Cancel
          </button>
        </div>

        <div>
          {currentStep < 3 ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`px-6 py-2 rounded-lg font-medium ${
                isSubmitting
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {isSubmitting ? 'Processing...' : 'Complete Return'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedReturnProcess;