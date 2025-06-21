'use client';
import { useState, useEffect } from 'react';
import { ThemedCard, ThemedButton, ThemedBadge } from '@/components/themed';
import { cn } from '@/lib/utils';

export function VehicleChangeModal({ 
  isOpen, 
  onClose, 
  booking, 
  onVehicleChanged 
}) {
  const [availableVehicles, setAvailableVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [loading, setLoading] = useState(false);
  const [changing, setChanging] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchAvailableVehicles();
    }
  }, [isOpen]);

  const fetchAvailableVehicles = async () => {
    setLoading(true);
    try {
      console.log('Fetching available vehicles...');
      const response = await fetch('/api/vehicles?status=available');
      const data = await response.json();
      if (data.success) {
        // Filter out current vehicle
        const otherVehicles = data.vehicles.filter(v => v._id !== booking.vehicleId._id);
        console.log('Available vehicles:', otherVehicles.length);
        setAvailableVehicles(otherVehicles);
      } else {
        console.error('Error fetching vehicles:', data.error);
        alert('Error loading available vehicles: ' + data.error);
      }
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      alert('Error loading available vehicles. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVehicleSelect = (vehicle) => {
    setSelectedVehicle(vehicle);
  };

  const handleConfirmChange = () => {
    if (!selectedVehicle) return;
    setShowConfirmation(true);
  };

  const handleFinalConfirm = async () => {
    if (!selectedVehicle) return;
    
    setChanging(true);
    try {
      console.log('Making vehicle change request to /api/change-vehicle');
      console.log('Request data:', {
        bookingId: booking.bookingId,
        newVehicleId: selectedVehicle._id
      });
      
      // ✅ CORRECTED: Using the right API endpoint
      const response = await fetch('/api/change-vehicle', {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          bookingId: booking.bookingId, // Use bookingId string, not _id ObjectId
          newVehicleId: selectedVehicle._id
        })
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      
      // Check if response is ok
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      // Parse JSON response
      const data = await response.json();
      console.log('API Success Response:', data);
      
      if (data.success) {
        onVehicleChanged(data.booking);
        onClose();
        setShowConfirmation(false);
        setSelectedVehicle(null);
        alert(`Vehicle changed successfully to ${data.changeDetails.newVehicle.model} (${data.changeDetails.newVehicle.plateNumber})`);
      } else {
        console.error('API returned success: false', data);
        alert('Error changing vehicle: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Vehicle change request failed:', error);
      alert('Error changing vehicle: ' + error.message + '\nPlease check the console for more details.');
    } finally {
      setChanging(false);
    }
  };

  const getVehicleIcon = (type) => {
    switch (type.toLowerCase()) {
      case 'scooter': return '🛵';
      case 'bike': return '🏍️';
      case 'bicycle': return '🚲';
      default: return '🚗';
    }
  };

  if (!isOpen) return null;

  if (showConfirmation) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
          <h3 className="text-xl font-bold text-white mb-4">⚠️ Confirm Vehicle Change</h3>
          
          <div className="bg-gray-700 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">From:</span>
                <p className="text-white font-medium">
                  {getVehicleIcon(booking.vehicleId.type)} {booking.vehicleId.model}
                </p>
                <p className="text-gray-300 font-mono">{booking.vehicleId.plateNumber}</p>
              </div>
              <div>
                <span className="text-gray-400">To:</span>
                <p className="text-white font-medium">
                  {getVehicleIcon(selectedVehicle.type)} {selectedVehicle.model}
                </p>
                <p className="text-gray-300 font-mono">{selectedVehicle.plateNumber}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-4 mb-6">
            <h4 className="text-blue-200 font-medium mb-2">Important Notes:</h4>
            <ul className="text-blue-300 text-sm space-y-1">
              <li>• Customer must return current vehicle immediately</li>
              <li>• New vehicle will be assigned with same booking terms</li>
              <li>• No additional charges or paperwork required</li>
              <li>• Original start time and pricing remain unchanged</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <ThemedButton 
              variant="secondary" 
              onClick={() => setShowConfirmation(false)}
              className="flex-1"
              disabled={changing}
            >
              Cancel
            </ThemedButton>
            <ThemedButton 
              variant="primary" 
              onClick={handleFinalConfirm}
              className="flex-1"
              disabled={changing}
            >
              {changing ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Changing...
                </div>
              ) : (
                'Confirm Change'
              )}
            </ThemedButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-700">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-white">Change Vehicle</h2>
              <p className="text-gray-400">
                Booking: {booking.bookingId} - {booking.customerId.name}
              </p>
            </div>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Current Vehicle */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-3">Current Vehicle</h3>
            <div className="bg-gray-700 rounded-lg p-4 border-2 border-orange-500">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="text-3xl mr-3">{getVehicleIcon(booking.vehicleId.type)}</div>
                  <div>
                    <h4 className="font-semibold text-white capitalize">
                      {booking.vehicleId.type} - {booking.vehicleId.model}
                    </h4>
                    <p className="text-gray-300 font-mono">{booking.vehicleId.plateNumber}</p>
                  </div>
                </div>
                <ThemedBadge status="active">Currently Assigned</ThemedBadge>
              </div>
            </div>
          </div>

          {/* Available Vehicles */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">
              Select New Vehicle ({availableVehicles.length} available)
            </h3>
            
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto mb-4"></div>
                <p className="text-gray-400">Loading available vehicles...</p>
              </div>
            ) : availableVehicles.length === 0 ? (
              <div className="text-center py-8 bg-gray-700 rounded-lg">
                <div className="text-4xl mb-4">🚫</div>
                <p className="text-gray-400">No other vehicles available at the moment</p>
                <p className="text-gray-500 text-sm mt-2">All vehicles may be currently rented or under maintenance</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableVehicles.map((vehicle) => (
                  <div
                    key={vehicle._id}
                    onClick={() => handleVehicleSelect(vehicle)}
                    className={cn(
                      "bg-gray-700 rounded-lg p-4 cursor-pointer transition-all border-2",
                      selectedVehicle?._id === vehicle._id
                        ? "border-cyan-500 bg-cyan-900/20"
                        : "border-gray-600 hover:border-gray-500"
                    )}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-2xl">{getVehicleIcon(vehicle.type)}</div>
                      {selectedVehicle?._id === vehicle._id && (
                        <div className="text-cyan-400">
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <h4 className="font-semibold text-white capitalize mb-1">
                      {vehicle.type} - {vehicle.model}
                    </h4>
                    <p className="text-gray-300 font-mono text-sm mb-2">{vehicle.plateNumber}</p>
                    <ThemedBadge status="available">Available</ThemedBadge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-gray-700">
          <div className="flex gap-3">
            <ThemedButton 
              variant="secondary" 
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </ThemedButton>
            <ThemedButton 
              variant="primary" 
              onClick={handleConfirmChange}
              disabled={!selectedVehicle || availableVehicles.length === 0}
              className="flex-1"
            >
              {selectedVehicle 
                ? `Change to ${selectedVehicle.model}` 
                : 'Select a Vehicle'
              }
            </ThemedButton>
          </div>
        </div>
      </div>
    </div>
  );
}