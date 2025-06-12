'use client';

import { useState, useEffect } from 'react';
import PhotoCapture from './PhotoCapture';

const AadhaarUploadSystem = () => {
  const [bookings, setBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [uploadMode, setUploadMode] = useState(null); // null, 'single', 'bulk'
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('missing'); // 'all', 'missing', 'uploaded'
  
  // Single upload state
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/bookings?limit=100');
      const result = await response.json();
      if (result.success) {
        setBookings(result.data);
      }
    } catch (error) {
      console.error('Error loading bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const uploadAadhaarDocuments = async (bookingId, photo, aadhaarNum) => {
    try {
      setIsUploading(true);
      const response = await fetch(`/api/bookings/${bookingId}/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          aadhaarNumber: aadhaarNum || '',
          aadhaarPhoto: photo,
          uploadedBy: 'staff' // This would be dynamic based on logged-in user
        })
      });

      const result = await response.json();
      if (result.success) {
        // Update local state
        setBookings(prev => prev.map(booking => 
          booking._id === bookingId 
            ? { ...booking, documents: result.data.documents }
            : booking
        ));
        return true;
      } else {
        alert('Error uploading documents: ' + result.error);
        return false;
      }
    } catch (error) {
      console.error('Error uploading documents:', error);
      alert('Error uploading documents');
      return false;
    } finally {
      setIsUploading(false);
    }
  };

  const handleSingleUpload = async (photo) => {
    if (selectedBooking && photo) {
      const success = await uploadAadhaarDocuments(selectedBooking._id, photo, aadhaarNumber);
      if (success) {
        alert('Aadhaar documents uploaded successfully!');
        setSelectedBooking(null);
        setUploadMode(null);
        setAadhaarNumber('');
      }
    }
  };

  const handleBulkFileUpload = (event) => {
    const files = Array.from(event.target.files);
    // This would be implemented to handle multiple file uploads
    // For now, we'll show a placeholder
    alert(`Selected ${files.length} files for bulk upload. This feature will be implemented to match files with booking IDs.`);
  };

  // Filter bookings based on search and status
  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = booking.customerDetails.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         booking.customerDetails.mobile.includes(searchTerm) ||
                         (booking.documents?.aadhaarNumber && booking.documents.aadhaarNumber.includes(searchTerm));
    
    const hasAadhaarPhoto = booking.documents?.aadhaarPhoto;
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'missing' && !hasAadhaarPhoto) ||
                         (statusFilter === 'uploaded' && hasAadhaarPhoto);
    
    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const DocumentStats = () => {
    const total = bookings.length;
    const uploaded = bookings.filter(b => b.documents?.aadhaarPhoto).length;
    const missing = total - uploaded;
    const percentage = total > 0 ? Math.round((uploaded / total) * 100) : 0;

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-100 p-4 rounded-lg border border-blue-200">
          <h3 className="text-sm font-medium text-blue-800">Total Bookings</h3>
          <p className="text-2xl font-bold text-blue-600">{total}</p>
        </div>
        
        <div className="bg-green-100 p-4 rounded-lg border border-green-200">
          <h3 className="text-sm font-medium text-green-800">Documents Uploaded</h3>
          <p className="text-2xl font-bold text-green-600">{uploaded}</p>
        </div>
        
        <div className="bg-red-100 p-4 rounded-lg border border-red-200">
          <h3 className="text-sm font-medium text-red-800">Missing Documents</h3>
          <p className="text-2xl font-bold text-red-600">{missing}</p>
        </div>
        
        <div className="bg-purple-100 p-4 rounded-lg border border-purple-200">
          <h3 className="text-sm font-medium text-purple-800">Completion Rate</h3>
          <p className="text-2xl font-bold text-purple-600">{percentage}%</p>
        </div>
      </div>
    );
  };

  // Single Upload Form
  if (uploadMode === 'single' && selectedBooking) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white">
        <div className="bg-blue-600 text-white p-4 rounded-lg mb-6">
          <h1 className="text-xl font-bold">Upload Aadhaar Documents</h1>
          <p className="text-blue-100">
            {selectedBooking.customerDetails.name} - {selectedBooking.customerDetails.mobile}
          </p>
        </div>

        <div className="space-y-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-800 mb-2">Customer Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Name:</span>
                <span className="ml-2 font-medium">{selectedBooking.customerDetails.name}</span>
              </div>
              <div>
                <span className="text-gray-600">Mobile:</span>
                <span className="ml-2 font-medium">{selectedBooking.customerDetails.mobile}</span>
              </div>
              <div>
                <span className="text-gray-600">DL Number:</span>
                <span className="ml-2 font-medium">{selectedBooking.customerDetails.dlNumber}</span>
              </div>
              <div>
                <span className="text-gray-600">Booking Date:</span>
                <span className="ml-2 font-medium">{formatDate(selectedBooking.createdAt)}</span>
              </div>
              <div>
                <span className="text-gray-600">Vehicle:</span>
                <span className="ml-2 font-medium">{selectedBooking.vehicleDetails.vehicleNumber}</span>
              </div>
              <div>
                <span className="text-gray-600">Status:</span>
                <span className={`ml-2 font-medium capitalize ${
                  selectedBooking.booking.status === 'active' ? 'text-green-600' : 'text-blue-600'
                }`}>
                  {selectedBooking.booking.status}
                </span>
              </div>
            </div>
          </div>

          {/* Aadhaar Number Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Aadhaar Number
            </label>
            <input
              type="text"
              value={aadhaarNumber}
              onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, ''))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="12-digit Aadhaar number (optional if clearly visible in photo)"
              maxLength="12"
            />
            <p className="text-xs text-gray-500 mt-1">
              💡 You can leave this blank if the Aadhaar number is clearly visible in the photo
            </p>
          </div>

          {/* Photo Capture */}
          <div>
            <PhotoCapture
              label="Aadhaar Card Photo"
              required
              onPhotoCapture={handleSingleUpload}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => {
                setUploadMode(null);
                setSelectedBooking(null);
                setAadhaarNumber('');
              }}
              disabled={isUploading}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            
            {isUploading && (
              <div className="flex items-center text-blue-600">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Uploading...
              </div>
            )}
          </div>

          {/* Upload Instructions */}
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <h4 className="font-medium text-yellow-800 mb-2">📝 Upload Instructions</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Take a clear photo of the Aadhaar card with all text visible</li>
              <li>• Ensure the photo is not blurry or cut off</li>
              <li>• Both front and back can be uploaded if needed</li>
              <li>• The Aadhaar number field is optional if visible in photo</li>
              <li>• You can replace documents later if needed</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // Main Document Management Interface
  return (
    <div className="max-w-6xl mx-auto p-6 bg-white">
      <div className="bg-blue-600 text-white p-4 rounded-lg mb-6">
        <h1 className="text-xl font-bold">Aadhaar Document Management</h1>
        <p className="text-blue-100">Upload and manage customer Aadhaar documents</p>
      </div>

      <DocumentStats />

      {/* Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Search by name, mobile, or Aadhaar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Bookings</option>
            <option value="missing">Missing Documents</option>
            <option value="uploaded">Documents Uploaded</option>
          </select>
        </div>

        <div className="flex gap-4">
          <label className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 cursor-pointer">
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleBulkFileUpload}
              className="hidden"
            />
            Bulk Upload
          </label>
          
          <button
            onClick={loadBookings}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Booking Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aadhaar Number</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Document Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uploaded By</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredBookings.map((booking) => (
                <tr key={booking._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{booking.customerDetails.name}</div>
                      <div className="text-sm text-gray-500">{booking.customerDetails.mobile}</div>
                      <div className="text-xs text-gray-400">DL: {booking.customerDetails.dlNumber}</div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{booking.vehicleDetails.vehicleNumber}</div>
                      <div className="text-sm text-gray-500 capitalize">{booking.vehicleDetails.type}</div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(booking.createdAt)}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {booking.documents?.aadhaarNumber || (
                      <span className="text-gray-400 italic">Not provided</span>
                    )}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    {booking.documents?.aadhaarPhoto ? (
                      <div className="flex items-center space-x-2">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          ✓ Uploaded
                        </span>
                        <button
                          onClick={() => window.open(booking.documents.aadhaarPhoto, '_blank')}
                          className="text-blue-600 hover:text-blue-800 text-xs underline"
                        >
                          View
                        </button>
                      </div>
                    ) : (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                        ✗ Missing
                      </span>
                    )}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {booking.documents?.uploadedBy ? (
                      <div>
                        <div>{booking.documents.uploadedBy}</div>
                        {booking.documents.uploadedAt && (
                          <div className="text-xs text-gray-400">
                            {formatDate(booking.documents.uploadedAt)}
                          </div>
                        )}
                      </div>
                    ) : (
                      '-'
                    )}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {booking.documents?.aadhaarPhoto ? (
                      <button
                        onClick={() => {
                          setSelectedBooking(booking);
                          setAadhaarNumber(booking.documents.aadhaarNumber || '');
                          setUploadMode('single');
                        }}
                        className="text-orange-600 hover:text-orange-900 bg-orange-100 hover:bg-orange-200 px-3 py-1 rounded-md transition-colors"
                      >
                        Replace
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedBooking(booking);
                          setAadhaarNumber('');
                          setUploadMode('single');
                        }}
                        className="text-blue-600 hover:text-blue-900 bg-blue-100 hover:bg-blue-200 px-3 py-1 rounded-md transition-colors"
                      >
                        Upload
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredBookings.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {loading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading bookings...
                </div>
              ) : (
                'No bookings found'
              )}
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-6 bg-yellow-50 p-4 rounded-lg border border-yellow-200">
        <h3 className="font-medium text-yellow-800 mb-2">💡 Document Management Instructions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-yellow-700">
          <ul className="space-y-1">
            <li>• Click "Upload" to add Aadhaar documents for individual customers</li>
            <li>• Both Aadhaar number and photo can be captured together</li>
            <li>• Aadhaar number is optional if clearly visible in photo</li>
            <li>• Photos should be clear and all text should be readable</li>
          </ul>
          <ul className="space-y-1">
            <li>• Use "Replace" to update existing documents if needed</li>
            <li>• "Bulk Upload" feature available for multiple photos</li>
            <li>• Supported formats: JPG, PNG, WEBP</li>
            <li>• Documents are stored securely and can be viewed later</li>
          </ul>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-red-100 rounded-full mr-2"></div>
          <span>Missing Documents: {bookings.filter(b => !b.documents?.aadhaarPhoto).length}</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-green-100 rounded-full mr-2"></div>
          <span>Complete Documents: {bookings.filter(b => b.documents?.aadhaarPhoto).length}</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-blue-100 rounded-full mr-2"></div>
          <span>Total Bookings: {bookings.length}</span>
        </div>
      </div>
    </div>
  );
};

export default AadhaarUploadSystem;