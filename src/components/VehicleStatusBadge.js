export default function VehicleStatusBadge({ status }) {
    const getStatusConfig = (status) => {
      switch (status) {
        case 'available':
          return {
            className: 'bg-green-100 text-green-800',
            label: 'Available'
          };
        case 'rented':
          return {
            className: 'bg-orange-100 text-orange-800',
            label: 'Rented'
          };
        case 'maintenance':
          return {
            className: 'bg-red-100 text-red-800',
            label: 'Maintenance'
          };
        default:
          return {
            className: 'bg-gray-100 text-gray-800',
            label: 'Unknown'
          };
      }
    };
  
    const config = getStatusConfig(status);
  
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  }