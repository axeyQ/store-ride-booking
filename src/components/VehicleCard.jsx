import VehicleStatusBadge from './VehicleStatusBadge';

export default function VehicleCard({ vehicle, onStatusChange, onEdit }) {
  const handleStatusChange = (newStatus) => {
    if (onStatusChange) {
      onStatusChange(vehicle._id, newStatus);
    }
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(vehicle);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900 capitalize">
            {vehicle.type} - {vehicle.model}
          </h3>
          <p className="text-gray-600 text-lg font-mono">{vehicle.plateNumber}</p>
          <p className="text-gray-500 text-sm">
            Added: {new Date(vehicle.addedDate).toLocaleDateString('en-IN')}
          </p>
        </div>
        <VehicleStatusBadge status={vehicle.status} />
      </div>

      <div className="space-y-3">
        {/* Quick Status Actions */}
        <div className="grid grid-cols-2 gap-2">
          {vehicle.status !== 'available' && (
            <button
              onClick={() => handleStatusChange('available')}
              className="bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded-lg text-sm font-medium"
            >
              ✓ Available
            </button>
          )}
          {vehicle.status !== 'maintenance' && (
            <button
              onClick={() => handleStatusChange('maintenance')}
              className="bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded-lg text-sm font-medium"
            >
              🔧 Maintenance
            </button>
          )}
        </div>

        {/* Edit Button */}
        <button
          onClick={handleEdit}
          className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Edit Details
        </button>
      </div>
    </div>
  );
}