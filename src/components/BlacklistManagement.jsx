'use client';

import { useState, useEffect } from 'react';

const BlacklistManagement = () => {
  const [blacklistedCustomers, setBlacklistedCustomers] = useState([]);
  const [allCustomers, setAllCustomers] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [newBlacklistEntry, setNewBlacklistEntry] = useState({
    customerId: '',
    reason: '',
    severity: 'medium',
    notes: '',
    addedBy: 'staff'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [blacklistResponse, customersResponse] = await Promise.all([
        fetch('/api/blacklist'),
        fetch('/api/customers')
      ]);
      
      const blacklistResult = await blacklistResponse.json();
      const customersResult = await customersResponse.json();
      
      if (blacklistResult.success) {
        setBlacklistedCustomers(blacklistResult.data);
      }
      
      if (customersResult.success) {
        setAllCustomers(customersResult.data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToBlacklist = async () => {
    try {
      if (!newBlacklistEntry.customerId || !newBlacklistEntry.reason.trim()) {
        alert('Please select a customer and provide a reason');
        return;
      }

      const response = await fetch('/api/blacklist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newBlacklistEntry)
      });

      const result = await response.json();
      if (result.success) {
        alert('Customer added to blacklist successfully');
        setBlacklistedCustomers(prev => [...prev, result.data]);
        setShowAddForm(false);
        setNewBlacklistEntry({
          customerId: '',
          reason: '',
          severity: 'medium',
          notes: '',
          addedBy: 'staff'
        });
      } else {
        alert('Error adding to blacklist: ' + result.error);
      }
    } catch (error) {
      console.error('Error adding to blacklist:', error);
      alert('Error adding to blacklist');
    }
  };

  const removeFromBlacklist = async (blacklistId) => {
    if (!confirm('Are you sure you want to remove this customer from the blacklist?')) {
      return;
    }

    try {
      const response = await fetch(`/api/blacklist/${blacklistId}`, {
        method: 'DELETE'
      });

      const result = await response.json();
      if (result.success) {
        alert('Customer removed from blacklist');
        setBlacklistedCustomers(prev => prev.filter(item => item._id !== blacklistId));
      } else {
        alert('Error removing from blacklist: ' + result.error);
      }
    } catch (error) {
      console.error('Error removing from blacklist:', error);
      alert('Error removing from blacklist');
    }
  };

  const updateBlacklistEntry = async (blacklistId, updates) => {
    try {
      const response = await fetch(`/api/blacklist/${blacklistId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates)
      });

      const result = await response.json();
      if (result.success) {
        setBlacklistedCustomers(prev => 
          prev.map(item => item._id === blacklistId ? result.data : item)
        );
        alert('Blacklist entry updated successfully');
      } else {
        alert('Error updating entry: ' + result.error);
      }
    } catch (error) {
      console.error('Error updating blacklist entry:', error);
      alert('Error updating entry');
    }
  };

  const filteredBlacklist = blacklistedCustomers.filter(entry => {
    const searchLower = searchTerm.toLowerCase();
    return entry.customerDetails?.name?.toLowerCase().includes(searchLower) ||
           entry.customerDetails?.mobile?.includes(searchTerm) ||
           entry.reason.toLowerCase().includes(searchLower);
  });

  const getAvailableCustomers = () => {
    const blacklistedIds = blacklistedCustomers.map(entry => entry.customerId);
    return allCustomers.filter(customer => !blacklistedIds.includes(customer._id));
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'low': return 'bg-yellow-100 text-yellow-800';
      case 'medium': return 'bg-orange-100 text-orange-800';
      case 'high': return 'bg-red-100 text-red-800';
      case 'critical': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const BlacklistStats = () => {
    const total = blacklistedCustomers.length;
    const severityCounts = blacklistedCustomers.reduce((acc, entry) => {
      acc[entry.severity] = (acc[entry.severity] || 0) + 1;
      return acc;
    }, {});

    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-gray-100 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-800">Total Blacklisted</h3>
          <p className="text-2xl font-bold text-gray-600">{total}</p>
        </div>
        
        <div className="bg-yellow-100 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-yellow-800">Low Risk</h3>
          <p className="text-2xl font-bold text-yellow-600">{severityCounts.low || 0}</p>
        </div>
        
        <div className="bg-orange-100 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-orange-800">Medium Risk</h3>
          <p className="text-2xl font-bold text-orange-600">{severityCounts.medium || 0}</p>
        </div>
        
        <div className="bg-red-100 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-red-800">High Risk</h3>
          <p className="text-2xl font-bold text-red-600">{severityCounts.high || 0}</p>
        </div>
        
        <div className="bg-purple-100 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-purple-800">Critical</h3>
          <p className="text-2xl font-bold text-purple-600">{severityCounts.critical || 0}</p>
        </div>
      </div>
    );
  };

  const AddBlacklistForm = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold mb-4">Add Customer to Blacklist</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Customer</label>
            <select
              value={newBlacklistEntry.customerId}
              onChange={(e) => setNewBlacklistEntry(prev => ({ ...prev, customerId: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
            >
              <option value="">Choose a customer</option>
              {getAvailableCustomers().map(customer => (
                <option key={customer._id} value={customer._id}>
                  {customer.name} - {customer.mobile}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Blacklisting</label>
            <textarea
              value={newBlacklistEntry.reason}
              onChange={(e) => setNewBlacklistEntry(prev => ({ ...prev, reason: e.target.value }))}
              rows={3}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
              placeholder="Describe the reason for blacklisting..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Severity Level</label>
            <select
              value={newBlacklistEntry.severity}
              onChange={(e) => setNewBlacklistEntry(prev => ({ ...prev, severity: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
            >
              <option value="low">Low - Minor issues</option>
              <option value="medium">Medium - Moderate concerns</option>
              <option value="high">High - Serious violations</option>
              <option value="critical">Critical - Immediate ban</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes (Optional)</label>
            <textarea
              value={newBlacklistEntry.notes}
              onChange={(e) => setNewBlacklistEntry(prev => ({ ...prev, notes: e.target.value }))}
              rows={2}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
              placeholder="Any additional information..."
            />
          </div>
        </div>

        <div className="flex justify-end space-x-4 mt-6">
          <button
            type="button"
            onClick={() => setShowAddForm(false)}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={addToBlacklist}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Add to Blacklist
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white">
      <div className="bg-red-600 text-white p-4 rounded-lg mb-6">
        <h1 className="text-xl font-bold">Customer Blacklist Management</h1>
        <p className="text-red-100">Manage problematic customers and prevent future bookings</p>
      </div>

      <BlacklistStats />

      {/* Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Search by name, mobile, or reason..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
          />
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Add to Blacklist
          </button>
          
          <button
            onClick={loadData}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Blacklist Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Severity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Added</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Added By</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredBlacklist.map((entry) => (
                <tr key={entry._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {entry.customerDetails?.name || 'Unknown'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {entry.customerDetails?.mobile || 'No mobile'}
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-xs">
                      {entry.reason}
                    </div>
                    {entry.notes && (
                      <div className="text-xs text-gray-500 mt-1">
                        Note: {entry.notes}
                      </div>
                    )}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(entry.severity)}`}>
                      {entry.severity.charAt(0).toUpperCase() + entry.severity.slice(1)}
                    </span>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(entry.createdAt)}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {entry.addedBy}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          const newSeverity = prompt('Change severity level (low/medium/high/critical):', entry.severity);
                          if (newSeverity && ['low', 'medium', 'high', 'critical'].includes(newSeverity)) {
                            updateBlacklistEntry(entry._id, { severity: newSeverity });
                          }
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </button>
                      
                      <button
                        onClick={() => removeFromBlacklist(entry._id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredBlacklist.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {loading ? 'Loading...' : 'No blacklisted customers found'}
            </div>
          )}
        </div>
      </div>

      {/* Warning Banner */}
      <div className="mt-6 bg-yellow-50 p-4 rounded-lg border border-yellow-200">
        <h3 className="font-medium text-yellow-800 mb-2">⚠️ Important Information</h3>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• Blacklisted customers will be automatically prevented from making new bookings</li>
          <li>• All blacklist actions are logged and auditable</li>
          <li>• Use appropriate severity levels: Low (warnings), Medium (temporary issues), High (serious violations), Critical (permanent ban)</li>
          <li>• Review blacklist entries regularly and remove when appropriate</li>
          <li>• Always provide clear reasons for blacklisting decisions</li>
        </ul>
      </div>

      {showAddForm && <AddBlacklistForm />}
    </div>
  );
};

export default BlacklistManagement;