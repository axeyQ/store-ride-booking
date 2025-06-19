'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ThemedLayout, 
  ThemedCard, 
  ThemedStatsCard, 
  ThemedButton, 
  ThemedInput,
  ThemedSelect,
  ThemedBadge 
} from '@/components/themed';
import { theme } from '@/lib/theme';
import { cn } from '@/lib/utils';

export default function ThemedVehiclesPage() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Form state
  const [formData, setFormData] = useState({
    type: 'bike',
    model: '',
    plateNumber: '',
    status: 'available'
  });

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const response = await fetch('/api/vehicles');
      const data = await response.json();
      if (data.success) {
        setVehicles(data.vehicles);
      }
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingVehicle ? `/api/vehicles/${editingVehicle._id}` : '/api/vehicles';
      const method = editingVehicle ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      if (data.success) {
        await fetchVehicles();
        resetForm();
      }
    } catch (error) {
      console.error('Error saving vehicle:', error);
    }
  };

  const handleStatusChange = async (vehicleId, newStatus) => {
    try {
      const response = await fetch(`/api/vehicles/${vehicleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await response.json();
      if (data.success) {
        await fetchVehicles();
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleEdit = (vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      type: vehicle.type,
      model: vehicle.model,
      plateNumber: vehicle.plateNumber,
      status: vehicle.status
    });
    setShowAddForm(true);
  };

  const resetForm = () => {
    setFormData({ type: 'bike', model: '', plateNumber: '', status: 'available' });
    setEditingVehicle(null);
    setShowAddForm(false);
  };

  const filteredVehicles = vehicles.filter(vehicle => {
    const matchesSearch =
      vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.plateNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || vehicle.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusConfig = (status) => {
    switch (status) {
      case 'available':
        return {
          color: 'green',
          borderColor: 'border-green-500/50',
          bgColor: 'bg-green-500/10',
          icon: '✅',
          label: 'Available'
        };
      case 'rented':
        return {
          color: 'orange',
          borderColor: 'border-orange-500/50',
          bgColor: 'bg-orange-500/10',
          icon: '🔄',
          label: 'Rented'
        };
      case 'maintenance':
        return {
          color: 'red',
          borderColor: 'border-red-500/50',
          bgColor: 'bg-red-500/10',
          icon: '🔧',
          label: 'Maintenance'
        };
      default:
        return {
          color: 'gray',
          borderColor: 'border-gray-500/50',
          bgColor: 'bg-gray-500/10',
          icon: '❓',
          label: 'Unknown'
        };
    }
  };

  if (loading) {
    return (
      <ThemedLayout>
        <div className="min-h-screen flex items-center justify-center">
          <ThemedCard>
            <div className="flex items-center space-x-3 p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
              <span className="text-white text-xl">Loading vehicles...</span>
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
            Vehicle <span className={theme.typography.gradient}>Management</span>
          </h2>
          <p className={`${theme.typography.subtitle} max-w-2xl mx-auto mt-4`}>
            Complete fleet management and status tracking
          </p>
        </div>

        {/* Fleet Statistics */}
        <div className={theme.layout.grid.stats + " mb-8"}>
          <ThemedStatsCard
            title="Total Vehicles"
            value={vehicles.length}
            subtitle="Fleet size"
            colorScheme="vehicles"
            icon={<div className="text-4xl mb-2">🏍️</div>}
            progress={100}
          />
          
          <ThemedStatsCard
            title="Available"
            value={vehicles.filter(v => v.status === 'available').length}
            subtitle="Ready for rental"
            colorScheme="revenue"
            icon={<div className="text-4xl mb-2">✅</div>}
            progress={(vehicles.filter(v => v.status === 'available').length / Math.max(vehicles.length, 1)) * 100}
          />
          
          <ThemedStatsCard
            title="Rented"
            value={vehicles.filter(v => v.status === 'rented').length}
            subtitle="Currently out"
            colorScheme="bookings"
            icon={<div className="text-4xl mb-2">🚴</div>}
            progress={(vehicles.filter(v => v.status === 'rented').length / Math.max(vehicles.length, 1)) * 100}
          />
          
          <ThemedStatsCard
            title="Maintenance"
            value={vehicles.filter(v => v.status === 'maintenance').length}
            subtitle="Under repair"
            colorScheme="customers"
            icon={<div className="text-4xl mb-2">🔧</div>}
            progress={(vehicles.filter(v => v.status === 'maintenance').length / Math.max(vehicles.length, 1)) * 100}
          />
        </div>

        {/* Search and Filter */}
        <ThemedCard className="mb-8">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Fleet Overview</h3>
              <ThemedButton
                variant="primary"
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Vehicle
              </ThemedButton>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ThemedInput
                label="Search Vehicles"
                placeholder="Search by model or plate number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              
              <ThemedSelect
                label="Filter by Status"
                value={filterStatus}
                onValueChange={setFilterStatus}
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'available', label: 'Available' },
                  { value: 'rented', label: 'Rented' },
                  { value: 'maintenance', label: 'Maintenance' }
                ]}
              />
            </div>
          </div>
        </ThemedCard>

        {/* Vehicles Grid */}
        {filteredVehicles.length === 0 ? (
          <ThemedCard className="text-center p-12">
            <div className="mb-6">
              <div className="w-24 h-24 bg-gradient-to-r from-gray-600 to-gray-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">No Vehicles Found</h3>
              <p className="text-gray-400 mb-6">
                {vehicles.length === 0 
                  ? 'Add your first vehicle to get started'
                  : 'Try adjusting your search or filter criteria'
                }
              </p>
              {vehicles.length === 0 && (
                <ThemedButton variant="primary" onClick={() => setShowAddForm(true)}>
                  Add First Vehicle
                </ThemedButton>
              )}
            </div>
          </ThemedCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {filteredVehicles.map((vehicle) => {
              const statusConfig = getStatusConfig(vehicle.status);
              
              return (
                <ThemedCard 
                  key={vehicle._id} 
                  className={cn(
                    "hover:scale-105 transition-all duration-300",
                    statusConfig.borderColor,
                    statusConfig.bgColor
                  )}
                >
                  <div className="p-6">
                    {/* Vehicle Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-white capitalize">
                          {vehicle.type} - {vehicle.model}
                        </h3>
                        <p className="text-gray-400 text-lg font-mono">{vehicle.plateNumber}</p>
                        <p className="text-gray-500 text-sm">
                          Added: {new Date(vehicle.createdAt).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl mb-2">{statusConfig.icon}</div>
                        <ThemedBadge status={vehicle.status}>
                          {statusConfig.label}
                        </ThemedBadge>
                      </div>
                    </div>

                    {/* Vehicle Type Icon */}
                    <div className="bg-gray-800/50 rounded-lg p-4 mb-4 text-center">
                      <div className="text-4xl mb-2">
                        {vehicle.type === 'bike' ? '🏍️' : '🛵'}
                      </div>
                      <p className="text-gray-400 capitalize">{vehicle.type}</p>
                    </div>

                    {/* Quick Status Actions */}
                    <div className="space-y-3 mb-4">
                      <div className="grid grid-cols-2 gap-2">
                        {vehicle.status !== 'available' && (
                          <ThemedButton
                            variant="success"
                            onClick={() => handleStatusChange(vehicle._id, 'available')}
                            className="text-sm py-2"
                          >
                            ✓ Available
                          </ThemedButton>
                        )}
                        {vehicle.status !== 'maintenance' && (
                          <ThemedButton
                            variant="danger"
                            onClick={() => handleStatusChange(vehicle._id, 'maintenance')}
                            className="text-sm py-2"
                          >
                            🔧 Maintenance
                          </ThemedButton>
                        )}
                      </div>
                    </div>

                    {/* Edit Button */}
                    <ThemedButton
                      variant="secondary"
                      onClick={() => handleEdit(vehicle)}
                      className="w-full flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit Details
                    </ThemedButton>
                  </div>
                </ThemedCard>
              );
            })}
          </div>
        )}

        {/* Quick Actions Footer */}
        <div className="flex flex-col md:flex-row gap-4">
          <ThemedButton 
            variant="secondary" 
            onClick={fetchVehicles}
            className="flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh Fleet
          </ThemedButton>
          
          <Link href="/active-bookings" className="flex-1 md:flex-initial">
            <ThemedButton variant="primary" className="w-full">
              View Active Bookings
            </ThemedButton>
          </Link>
          
          <Link href="/admin" className="flex-1 md:flex-initial">
            <ThemedButton variant="secondary" className="w-full">
              📊 Dashboard
            </ThemedButton>
          </Link>
        </div>
      </div>

      {/* Add/Edit Vehicle Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <ThemedCard className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">
                  {editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
                </h2>
                <button
                  onClick={resetForm}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <ThemedSelect
                  label="Vehicle Type"
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                  options={[
                    { value: 'bike', label: '🏍️ Bike' },
                    { value: 'scooter', label: '🛵 Scooter' }
                  ]}
                />
                
                <ThemedInput
                  label="Model"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder="e.g., Honda Activa, Hero Splendor"
                  required
                />
                
                <ThemedInput
                  label="Plate Number"
                  value={formData.plateNumber}
                  onChange={(e) => setFormData({ ...formData, plateNumber: e.target.value.toUpperCase() })}
                  placeholder="e.g., MP09AB1234"
                  required
                />
                
                <ThemedSelect
                  label="Status"
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                  options={[
                    { value: 'available', label: '✅ Available' },
                    { value: 'maintenance', label: '🔧 Maintenance' }
                  ]}
                />
                
                <div className="flex gap-4 pt-4">
                  <ThemedButton
                    type="button"
                    variant="secondary"
                    onClick={resetForm}
                    className="flex-1"
                  >
                    Cancel
                  </ThemedButton>
                  <ThemedButton
                    type="submit"
                    variant="primary"
                    className="flex-1"
                  >
                    {editingVehicle ? 'Update Vehicle' : 'Add Vehicle'}
                  </ThemedButton>
                </div>
              </form>
            </div>
          </ThemedCard>
        </div>
      )}
    </ThemedLayout>
  );
}