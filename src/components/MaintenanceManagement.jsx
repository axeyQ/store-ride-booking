'use client';

import { useState, useEffect } from 'react';

const MaintenanceManagement = () => {
  const [vehicles, setVehicles] = useState([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState([]);
  const [upcomingMaintenance, setUpcomingMaintenance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  
  const [maintenanceForm, setMaintenanceForm] = useState({
    vehicleId: '',
    type: 'regular',
    description: '',
    cost: 0,
    performedBy: '',
    scheduledDate: '',
    completedDate: '',
    status: 'scheduled',
    notes: '',
    nextServiceDate: ''
  });

  useEffect(() => {
    loadMaintenanceData();
  }, []);

  const loadMaintenanceData = async () => {
    try {
      setLoading(true);
      const [vehiclesRes, maintenanceRes, upcomingRes] = await Promise.all([
        fetch('/api/vehicles'),
        fetch('/api/maintenance'),
        fetch('/api/maintenance/upcoming')
      ]);
      
      const vehiclesData = await vehiclesRes.json();
      const maintenanceData = await maintenanceRes.json();
      const upcomingData = await upcomingRes.json();
      
      if (vehiclesData.success) setVehicles(vehiclesData.data);
      if (maintenanceData.success) setMaintenanceRecords(maintenanceData.data);
      if (upcomingData.success) setUpcomingMaintenance(upcomingData.data);
      
    } catch (error) {
      console.error('Error loading maintenance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitMaintenance = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/maintenance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(maintenanceForm)
      });
      
      const result = await response.json();
      if (result.success) {
        alert('Maintenance record added successfully');
        setShowAddForm(false);
        setMaintenanceForm({
          vehicleId: '',
          type: 'regular',
          description: '',
          cost: 0,
          performedBy: '',
          scheduledDate: '',
          completedDate: '',
          status: 'scheduled',
          notes: '',
          nextServiceDate: ''
        });
        loadMaintenanceData();
      } else {
        alert('Error adding maintenance record: ' + result.error);
      }
    } catch (error) {
      console.error('Error submitting maintenance:', error);
      alert('Error adding maintenance record');
    }
  };

  const updateMaintenanceStatus = async (recordId, newStatus) => {
    try {
      const response = await fetch(`/api/maintenance/${recordId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status: newStatus,
          completedDate: newStatus === 'completed' ? new Date().toISOString() : null
        })
      });
      
      const result = await response.json();
      if (result.success) {
        loadMaintenanceData();
      }
    } catch (error) {
      console.error('Error updating maintenance status:', error);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getVehicleMaintenanceStats = (vehicleId) => {
    const records = maintenanceRecords.filter(r => r.vehicleId === vehicleId);
    const totalCost = records.reduce((sum, r) => sum + (r.cost || 0), 0);
    const lastMaintenance = records
      .filter(r => r.status === 'completed')
      .sort((a, b) => new Date(b.completedDate) - new Date(a.completedDate))[0];
    
    return {
      totalRecords: records.length,
      totalCost,
      lastMaintenance: lastMaintenance?.completedDate,
      pendingCount: records.filter(r => r.status === 'scheduled').length
    };
  };

  const OverviewTab = () => {
    const totalMaintenanceCost = maintenanceRecords.reduce((sum, r) => sum + (r.cost || 0), 0);
    const completedMaintenance = maintenanceRecords.filter(r => r.status === 'completed').length;
    const pendingMaintenance = maintenanceRecords.filter(r => r.status === 'scheduled').length;
    const overdueMaintenance = upcomingMaintenance.filter(m => 
      new Date(m.scheduledDate) < new Date()
    ).length;

    return (
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
            <div className="flex items-center">
              <div className="p-2 bg-blue-600 rounded-lg">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-blue-600">Total Maintenance Cost</p>
                <p className="text-2xl font-semibold text-blue-900">
                  {formatCurrency(totalMaintenanceCost)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 p-6 rounded-lg border border-green-200">
            <div className="flex items-center">
              <div className="p-2 bg-green-600 rounded-lg">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-green-600">Completed</p>
                <p className="text-2xl font-semibold text-green-900">{completedMaintenance}</p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-600 rounded-lg">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-yellow-600">Pending</p>
                <p className="text-2xl font-semibold text-yellow-900">{pendingMaintenance}</p>
              </div>
            </div>
          </div>

          <div className="bg-red-50 p-6 rounded-lg border border-red-200">
            <div className="flex items-center">
              <div className="p-2 bg-red-600 rounded-lg">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-red-600">Overdue</p>
                <p className="text-2xl font-semibold text-red-900">{overdueMaintenance}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming Maintenance Alerts */}
        {upcomingMaintenance.length > 0 && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">🔔 Upcoming Maintenance</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {upcomingMaintenance.slice(0, 5).map((maintenance, index) => (
                  <div key={index} className={`p-4 rounded-lg border-l-4 ${
                    new Date(maintenance.scheduledDate) < new Date() 
                      ? 'border-red-500 bg-red-50' 
                      : 'border-yellow-500 bg-yellow-50'
                  }`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-gray-800">{maintenance.vehicleNumber}</h4>
                        <p className="text-sm text-gray-600">{maintenance.description}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(maintenance.scheduledDate) < new Date() ? 'Overdue: ' : 'Due: '}
                          {formatDate(maintenance.scheduledDate)}
                        </p>
                      </div>
                      <button
                        onClick={() => updateMaintenanceStatus(maintenance._id, 'completed')}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                      >
                        Mark Complete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Vehicle Health Overview */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Vehicle Health Overview</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vehicles.map(vehicle => {
                const stats = getVehicleMaintenanceStats(vehicle._id);
                return (
                  <div key={vehicle._id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium text-gray-800">{vehicle.vehicleNumber}</h4>
                        <p className="text-sm text-gray-600 capitalize">{vehicle.type} - {vehicle.brand}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        vehicle.status === 'available' ? 'bg-green-100 text-green-800' :
                        vehicle.status === 'maintenance' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {vehicle.status}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Cost:</span>
                        <span className="font-medium">{formatCurrency(stats.totalCost)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Records:</span>
                        <span className="font-medium">{stats.totalRecords}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Pending:</span>
                        <span className={`font-medium ${stats.pendingCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {stats.pendingCount}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Last Service:</span>
                        <span className="font-medium text-xs">
                          {stats.lastMaintenance ? formatDate(stats.lastMaintenance) : 'None'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const MaintenanceRecordsTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800">Maintenance Records</h3>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Add Maintenance Record
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {maintenanceRecords.map((record) => (
                <tr key={record._id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {vehicles.find(v => v._id === record.vehicleId)?.vehicleNumber || 'Unknown'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      record.type === 'regular' ? 'bg-blue-100 text-blue-800' :
                      record.type === 'repair' ? 'bg-red-100 text-red-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {record.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{record.description}</div>
                    {record.notes && (
                      <div className="text-xs text-gray-500 mt-1">{record.notes}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(record.cost)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      record.status === 'completed' ? 'bg-green-100 text-green-800' :
                      record.status === 'in-progress' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {record.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>Scheduled: {formatDate(record.scheduledDate)}</div>
                    {record.completedDate && (
                      <div>Completed: {formatDate(record.completedDate)}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {record.status === 'scheduled' && (
                      <div className="space-x-2">
                        <button
                          onClick={() => updateMaintenanceStatus(record._id, 'in-progress')}
                          className="text-yellow-600 hover:text-yellow-900"
                        >
                          Start
                        </button>
                        <button
                          onClick={() => updateMaintenanceStatus(record._id, 'completed')}
                          className="text-green-600 hover:text-green-900"
                        >
                          Complete
                        </button>
                      </div>
                    )}
                    {record.status === 'in-progress' && (
                      <button
                        onClick={() => updateMaintenanceStatus(record._id, 'completed')}
                        className="text-green-600 hover:text-green-900"
                      >
                        Complete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // Add Maintenance Form Modal
  const AddMaintenanceForm = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-screen overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Add Maintenance Record</h3>
          <button
            onClick={() => setShowAddForm(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmitMaintenance} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle</label>
            <select
              value={maintenanceForm.vehicleId}
              onChange={(e) => setMaintenanceForm(prev => ({ ...prev, vehicleId: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select Vehicle</option>
              {vehicles.map(vehicle => (
                <option key={vehicle._id} value={vehicle._id}>
                  {vehicle.vehicleNumber} - {vehicle.brand} {vehicle.model}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Maintenance Type</label>
            <select
              value={maintenanceForm.type}
              onChange={(e) => setMaintenanceForm(prev => ({ ...prev, type: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="regular">Regular Service</option>
              <option value="repair">Repair</option>
              <option value="inspection">Inspection</option>
              <option value="emergency">Emergency</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={maintenanceForm.description}
              onChange={(e) => setMaintenanceForm(prev => ({ ...prev, description: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Describe the maintenance work..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Cost (₹)</label>
            <input
              type="number"
              value={maintenanceForm.cost}
              onChange={(e) => setMaintenanceForm(prev => ({ ...prev, cost: parseInt(e.target.value) || 0 }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Performed By</label>
            <input
              type="text"
              value={maintenanceForm.performedBy}
              onChange={(e) => setMaintenanceForm(prev => ({ ...prev, performedBy: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Mechanic name or service center"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Date</label>
            <input
              type="date"
              value={maintenanceForm.scheduledDate}
              onChange={(e) => setMaintenanceForm(prev => ({ ...prev, scheduledDate: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Next Service Date</label>
            <input
              type="date"
              value={maintenanceForm.nextServiceDate}
              onChange={(e) => setMaintenanceForm(prev => ({ ...prev, nextServiceDate: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
            <textarea
              value={maintenanceForm.notes}
              onChange={(e) => setMaintenanceForm(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={2}
              placeholder="Additional notes..."
            />
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add Record
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-2">
            <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-gray-600">Loading maintenance data...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Maintenance Management</h1>
            <p className="text-gray-600">Vehicle maintenance scheduling and tracking</p>
          </div>
          <button
            onClick={loadMaintenanceData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Refresh Data
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow-sm mb-6">
        <div className="flex space-x-0 border-b">
          {[
            { id: 'overview', label: 'Overview', icon: '🔧' },
            { id: 'records', label: 'Maintenance Records', icon: '📋' },
            { id: 'schedule', label: 'Schedule', icon: '📅' },
            { id: 'costs', label: 'Cost Analysis', icon: '💰' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'records' && <MaintenanceRecordsTab />}
        {activeTab === 'schedule' && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Maintenance Schedule</h3>
            <p className="text-gray-600">Calendar-based schedule view coming in next update...</p>
          </div>
        )}
        {activeTab === 'costs' && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Cost Analysis</h3>
            <p className="text-gray-600">Detailed cost analysis and budgeting coming in next update...</p>
          </div>
        )}
      </div>

      {/* Add Maintenance Form Modal */}
      {showAddForm && <AddMaintenanceForm />}
    </div>
  );
};

export default MaintenanceManagement;