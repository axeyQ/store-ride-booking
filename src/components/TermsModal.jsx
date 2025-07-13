'use client';
import { useState } from 'react';

const TermsModal = ({ isOpen, onClose, onAccept }) => {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollTop + clientHeight >= scrollHeight - 10) {
      setHasScrolledToBottom(true);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Rental Terms & Conditions</h2>
            <p className="text-gray-600">MR Travels - Bike & Scooter Rental Service</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-3xl font-bold w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-all"
          >
            ×
          </button>
        </div>

        {/* Scrollable Content */}
        <div 
          className="flex-1 overflow-y-auto p-6 space-y-6"
          onScroll={handleScroll}
        >
          
          {/* ✅ UPDATED: Customer-Friendly Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-xl font-bold text-blue-800 mb-4">🚀 Quick Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
              <div>
                <h4 className="font-semibold mb-2">💰 Pricing</h4>
                <ul className="space-y-1">
                  <li>• ₹80 for first hour + 15min grace</li>
                  <li>• ₹40 per 30-minute block after</li>
                  <li>• Night charges: 2x after 10 PM</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">🛡️ Security</h4>
                <ul className="space-y-1">
                  <li>• Aadhar Card OR ₹500 deposit</li>
                  <li>• Valid driving license required</li>
                  <li>• Mandatory helmet provided</li>
                </ul>
              </div>
            </div>
          </div>

          {/* ✅ UPDATED: Detailed Terms */}
          <div className="space-y-6">
            
            {/* 1. Vehicle Usage */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">1. Vehicle Usage</h3>
              <ul className="space-y-2 text-gray-700">
                <li>• The rented vehicle must be used responsibly and only by the person whose details are provided.</li>
                <li>• Customer must have a valid driving license appropriate for the vehicle type.</li>
                <li>• Vehicle should not be used for racing, stunts, or any illegal activities.</li>
                <li>• Maximum 2 passengers allowed (3+ people = ₹500 fine).</li>
              </ul>
            </div>

            {/* 2. Safety Requirements - UPDATED */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">2. Safety Requirements</h3>
              <ul className="space-y-2 text-gray-700">
                <li>• <strong>Helmets are mandatory</strong> and must be worn at all times while riding.</li>
                <li>• Helmets will be provided by MR Travels at no extra cost.</li>
                <li>• Customer must follow all traffic rules and regulations.</li>
                <li>• Vehicle should not be overloaded beyond its capacity.</li>
                <li>• All traffic fines and penalties are customer's responsibility.</li>
              </ul>
            </div>

            {/* 3. Identity & Security - NEW */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h3 className="text-lg font-bold text-orange-800 mb-3">3. Identity Verification & Security</h3>
              <ul className="space-y-2 text-orange-700">
                <li>• <strong>Either</strong> valid Aadhar card submission <strong>OR</strong> ₹500 security deposit required.</li>
                <li>• Security deposit is <strong>fully refundable</strong> upon safe vehicle return.</li>
                <li>• Aadhar card will be returned when vehicle is returned in good condition.</li>
                <li>• Valid driving license mandatory for all rentals.</li>
                <li>• Photo identification may be required for verification.</li>
              </ul>
            </div>

            {/* 4. Advanced Pricing Structure - NEW */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="text-lg font-bold text-green-800 mb-3">4. Advanced Pricing Structure</h3>
              <ul className="space-y-2 text-green-700">
                <li>• <strong>Base Rate:</strong> ₹80 for first hour + 15-minute grace period</li>
                <li>• <strong>Block Pricing:</strong> ₹40 per 30-minute block after initial hour + grace</li>
                <li>• <strong>Night Charges:</strong> 1.5x rate multiplier for any time block crossing 10:00 PM</li>
                <li>• <strong>Billing:</strong> Time blocks are rounded up (minimum 30-minute increments after grace period)</li>
                <li>• <strong>Example:</strong> 2 hours 45 minutes = ₹80 + ₹40 + ₹40 + ₹40 = ₹200</li>
              </ul>
            </div>

            {/* 5. Damage & Loss */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">5. Damage & Loss</h3>
              <ul className="space-y-2 text-gray-700">
                <li>• Customer is responsible for any damage to the vehicle during the rental period.</li>
                <li>• In case of theft or total loss, customer will be charged the full value of the vehicle.</li>
                <li>• Any traffic fines or penalties will be customer's responsibility.</li>
                <li>• Vehicle inspection will be conducted before and after rental.</li>
              </ul>
            </div>

            {/* 6. Return Policy - UPDATED */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="text-lg font-bold text-red-800 mb-3">6. Return Policy & Restrictions</h3>
              <ul className="space-y-2 text-red-700">
                <li>• Vehicle must be returned by <strong>10:30 PM</strong> (store closing time)</li>
                <li>• Late return after 10:00 PM: <strong>Additional ₹80 charge/hr</strong></li>
                <li>• Return after 10:30 PM: <strong>₹500 overnight fine + next day return</strong></li>
                <li>• Vehicle should be returned in the same condition as received.</li>
                <li>• Vehicle must be returned with <strong>same fuel level</strong></li>
                <li>• Fuel support available during business hours if needed.</li>
              </ul>
            </div>

            {/* 7. Payment Terms */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">7. Payment Terms</h3>
              <ul className="space-y-2 text-gray-700">
                <li>• Payment is due upon vehicle return.</li>
                <li>• Accepted payment methods: Cash, UPI</li>
                <li>• Security deposit (if applicable) will be refunded immediately upon safe return.</li>
                <li>• Any additional charges for damage/fines will be collected before vehicle release.</li>
              </ul>
            </div>

          </div>

          {/* ✅ NEW: Legal Framework Section */}
          <div className="bg-gray-50 border border-gray-300 rounded-lg p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">⚖️ Legal Framework & Jurisdiction</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-700">
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">Governing Laws</h4>
                <ul className="space-y-1">
                  <li>• Indian Contract Act, 1872</li>
                  <li>• Information Technology Act, 2000</li>
                  <li>• Consumer Protection Act, 2019</li>
                  <li>• Motor Vehicles Act, 1988</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">Jurisdiction & Disputes</h4>
                <ul className="space-y-1">
                  <li>• <strong>Jurisdiction:</strong> Bhopal District Courts, Madhya Pradesh</li>
                  <li>• <strong>Dispute Resolution:</strong> Mediation preferred before litigation</li>
                  <li>• <strong>Consumer Rights:</strong> As per Consumer Protection Act, 2019</li>
                  <li>• <strong>Digital Signature:</strong> Valid as per IT Act 2000, Section 3A</li>
                </ul>
              </div>
            </div>

            <div className="mt-4 p-3 bg-blue-100 border border-blue-300 rounded">
              <p className="text-xs text-blue-800">
                <strong>Digital Agreement Validity:</strong> This electronic rental agreement, including digital signatures, 
                has the same legal validity as a paper contract under the Information Technology Act, 2000. 
                By providing your digital signature, you acknowledge and accept all terms stated herein.
              </p>
            </div>
          </div>

          {/* Contact Information */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-bold text-gray-900 mb-3">📞 Contact & Support</h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
                <div>
                  <p><strong>Business Hours:</strong> 6:00 AM - 10:00 PM</p>
                  <p><strong>Emergency Support:</strong> Available during business hours</p>
                </div>
                <div>
                  <p><strong>Location:</strong> MR Travels, Bhopal, Madhya Pradesh</p>
                  <p><strong>For Complaints:</strong> Consumer Forum, Bhopal</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {hasScrolledToBottom ? (
                <span className="text-green-600 font-medium">✓ You have reviewed all terms</span>
              ) : (
                <span className="text-orange-600 font-medium">⚠️ Please scroll to read all terms</span>
              )}
            </div>
            
            <div className="flex gap-4">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              
              <button
                onClick={() => {
                  if (hasScrolledToBottom) {
                    onAccept();
                  } else {
                    alert('Please scroll through and read all terms and conditions before accepting.');
                  }
                }}
                disabled={!hasScrolledToBottom}
                className={`px-8 py-2 rounded-lg font-medium transition-colors ${
                  hasScrolledToBottom
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                I Accept All Terms
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsModal;
