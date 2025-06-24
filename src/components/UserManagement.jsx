'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useApiRequest } from '@/hooks/useApiRequest';
import { User, Shield, ShieldOff, Trash2, Edit, MoreVertical, X, AlertCircle, CheckCircle } from 'lucide-react';

const UserManagement = ({ isOpen, onClose }) => {
  const { user: currentUser } = useAuth();
  const { request, loading, error } = useApiRequest();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  // Fetch all users
  const fetchUsers = async () => {
    try {
      const data = await request('/api/auth/users');
      setUsers(data.users || []);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  // Toggle user active status
  const toggleUserStatus = async (userId, newStatus) => {
    try {
      const data = await request(`/api/auth/users/${userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: newStatus })
      });

      if (data.success) {
        setUsers(users.map(u => 
          u._id === userId ? { ...u, isActive: newStatus } : u
        ));
      }
    } catch (err) {
      console.error('Failed to update user status:', err);
    }
  };

  // Delete user
  const deleteUser = async (userId) => {
    try {
      const data = await request(`/api/auth/users/${userId}`, {
        method: 'DELETE'
      });

      if (data.success) {
        setUsers(users.filter(u => u._id !== userId));
      }
    } catch (err) {
      console.error('Failed to delete user:', err);
    }
  };

  // Reset user password
  const resetPassword = async (userId) => {
    try {
      const data = await request(`/api/auth/users/${userId}/reset-password`, {
        method: 'POST'
      });

      if (data.success) {
        alert(`Password reset successfully. New password: ${data.newPassword}`);
      }
    } catch (err) {
      console.error('Failed to reset password:', err);
    }
  };

  const handleConfirmAction = () => {
    if (confirmAction) {
      confirmAction.action();
      setShowConfirmDialog(false);
      setConfirmAction(null);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-white">User Management</h2>
            <p className="text-gray-400 text-sm mt-1">Manage system users and permissions</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Permission Check */}
          {!currentUser?.isFirstUser && (
            <div className="mb-6 p-4 bg-red-900/50 border border-red-700/50 rounded-lg flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <div>
                <p className="text-red-200 text-sm">
                  Only the first user can manage other users.
                </p>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-900/50 border border-red-700/50 rounded-lg flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <div>
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
              <span className="ml-3 text-white">Loading users...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Users List */}
              <div className="bg-gray-800/50 rounded-lg overflow-hidden">
                <div className="px-4 py-3 bg-gray-700/50 border-b border-gray-600">
                  <h3 className="text-lg font-semibold text-white">System Users ({users.length})</h3>
                </div>
                
                {users.length === 0 ? (
                  <div className="p-8 text-center">
                    <User className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400">No users found</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-600">
                    {users.map((user) => (
                      <div key={user._id} className="p-4 hover:bg-gray-700/30 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            {/* Avatar */}
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                              user.isActive 
                                ? 'bg-gradient-to-r from-green-500 to-green-600' 
                                : 'bg-gray-600'
                            }`}>
                              <span className="text-white font-medium text-lg">
                                {user.fullName?.charAt(0)?.toUpperCase()}
                              </span>
                            </div>

                            {/* User Info */}
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <h4 className="text-white font-medium">{user.fullName}</h4>
                                {user.isFirstUser && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-900/50 text-yellow-200 border border-yellow-700/50">
                                    <Shield className="w-3 h-3 mr-1" />
                                    Admin
                                  </span>
                                )}
                                {!user.isActive && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-900/50 text-red-200 border border-red-700/50">
                                    <ShieldOff className="w-3 h-3 mr-1" />
                                    Inactive
                                  </span>
                                )}
                              </div>
                              <p className="text-gray-400 text-sm">@{user.username}</p>
                              {user.email && (
                                <p className="text-gray-500 text-sm">{user.email}</p>
                              )}
                              <div className="mt-1 text-xs text-gray-500">
                                <span>Created: {formatDate(user.createdAt)}</span>
                                {user.lastLogin && (
                                  <span className="ml-4">Last login: {formatDate(user.lastLogin)}</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          {currentUser?.isFirstUser && user._id !== currentUser._id && (
                            <div className="flex items-center space-x-2">
                              {/* Toggle Status */}
                              <button
                                onClick={() => {
                                  setConfirmAction({
                                    title: user.isActive ? 'Deactivate User' : 'Activate User',
                                    message: `Are you sure you want to ${user.isActive ? 'deactivate' : 'activate'} ${user.fullName}?`,
                                    action: () => toggleUserStatus(user._id, !user.isActive)
                                  });
                                  setShowConfirmDialog(true);
                                }}
                                className={`p-2 rounded-lg transition-colors ${
                                  user.isActive
                                    ? 'text-orange-400 hover:bg-orange-900/30'
                                    : 'text-green-400 hover:bg-green-900/30'
                                }`}
                                title={user.isActive ? 'Deactivate user' : 'Activate user'}
                              >
                                {user.isActive ? <ShieldOff className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                              </button>

                              {/* Reset Password */}
                              <button
                                onClick={() => {
                                  setConfirmAction({
                                    title: 'Reset Password',
                                    message: `Reset password for ${user.fullName}? A new temporary password will be generated.`,
                                    action: () => resetPassword(user._id)
                                  });
                                  setShowConfirmDialog(true);
                                }}
                                className="p-2 text-blue-400 hover:bg-blue-900/30 rounded-lg transition-colors"
                                title="Reset password"
                              >
                                <Edit className="w-4 h-4" />
                              </button>

                              {/* Delete User */}
                              {!user.isFirstUser && (
                                <button
                                  onClick={() => {
                                    setConfirmAction({
                                      title: 'Delete User',
                                      message: `Are you sure you want to permanently delete ${user.fullName}? This action cannot be undone.`,
                                      action: () => deleteUser(user._id),
                                      destructive: true
                                    });
                                    setShowConfirmDialog(true);
                                  }}
                                  className="p-2 text-red-400 hover:bg-red-900/30 rounded-lg transition-colors"
                                  title="Delete user"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* System Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-2">Total Users</h4>
                  <p className="text-2xl font-bold text-cyan-400">{users.length}</p>
                </div>
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-2">Active Users</h4>
                  <p className="text-2xl font-bold text-green-400">
                    {users.filter(u => u.isActive).length}
                  </p>
                </div>
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-2">Administrators</h4>
                  <p className="text-2xl font-bold text-yellow-400">
                    {users.filter(u => u.isFirstUser).length}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && confirmAction && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-60">
          <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  confirmAction.destructive 
                    ? 'bg-red-500/20 text-red-400' 
                    : 'bg-yellow-500/20 text-yellow-400'
                }`}>
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{confirmAction.title}</h3>
                </div>
              </div>
              
              <p className="text-gray-300 mb-6">{confirmAction.message}</p>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowConfirmDialog(false)}
                  className="px-4 py-2 text-gray-300 bg-gray-700 rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmAction}
                  className={`px-4 py-2 text-white rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                    confirmAction.destructive
                      ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                      : 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500'
                  }`}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;