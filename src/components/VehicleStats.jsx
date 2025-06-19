export default function VehicleStats({ vehicles }) {
    const stats = {
      total: vehicles.length,
      available: vehicles.filter(v => v.status === 'available').length,
      rented: vehicles.filter(v => v.status === 'rented').length,
      maintenance: vehicles.filter(v => v.status === 'maintenance').length,
    };
  
    const StatCard = ({ title, value, color, icon }) => (
      <div className="bg-white p-6 rounded-xl shadow-lg text-center">
        <div className={`text-2xl font-bold ${color} flex items-center justify-center gap-2`}>
          <span>{icon}</span>
          <span>{value}</span>
        </div>
        <div className="text-gray-600 mt-1">{title}</div>
      </div>
    );
  
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Vehicles"
          value={stats.total}
          color="text-blue-600"
          icon="🏍️"
        />
        <StatCard
          title="Available"
          value={stats.available}
          color="text-green-600"
          icon="✅"
        />
        <StatCard
          title="Rented"
          value={stats.rented}
          color="text-orange-600"
          icon="🔄"
        />
        <StatCard
          title="Maintenance"
          value={stats.maintenance}
          color="text-red-600"
          icon="🔧"
        />
      </div>
    );
  }