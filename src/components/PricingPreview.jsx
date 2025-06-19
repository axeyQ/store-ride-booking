'use client';
import { useState, useEffect } from 'react';

export default function PricingPreview({ startTime, className = '' }) {
  const [pricing, setPricing] = useState({
    examples: [],
    settings: { hourlyRate: 80, graceMinutes: 15, blockMinutes: 30 }
  });
  const [selectedDuration, setSelectedDuration] = useState(60);
  const [currentAmount, setCurrentAmount] = useState(0);
  const [breakdown, setBreakdown] = useState([]);

  useEffect(() => {
    fetchPricingExamples();
  }, []);

  useEffect(() => {
    if (selectedDuration > 0) {
      calculatePreview();
    }
  }, [selectedDuration, startTime]);

  const fetchPricingExamples = async () => {
    try {
      // For now, create examples based on the advanced pricing logic
      const response = await fetch('/api/settings');
      const data = await response.json();
      
      if (data.success) {
        const settings = data.settings;
        const examples = generatePricingExamples(settings);
        setPricing({ examples, settings });
      }
    } catch (error) {
      console.error('Error fetching pricing:', error);
    }
  };

  const generatePricingExamples = (settings) => {
    const { hourlyRate, graceMinutes, blockMinutes, nightMultiplier } = settings;
    const halfRate = Math.round(hourlyRate / 2);
    
    return [
      {
        duration: 30,
        label: '30 minutes',
        amount: hourlyRate,
        description: 'Within first period'
      },
      {
        duration: 60,
        label: '1 hour',
        amount: hourlyRate,
        description: 'First period'
      },
      {
        duration: 60 + graceMinutes,
        label: `1h ${graceMinutes}m`,
        amount: hourlyRate,
        description: 'End of grace period'
      },
      {
        duration: 60 + graceMinutes + 1,
        label: `1h ${graceMinutes + 1}m`,
        amount: hourlyRate + halfRate,
        description: 'Into next block'
      },
      {
        duration: 90,
        label: '1.5 hours',
        amount: hourlyRate + halfRate,
        description: 'First + partial second'
      },
      {
        duration: 120,
        label: '2 hours',
        amount: hourlyRate + halfRate * 2,
        description: 'Two full periods'
      }
    ];
  };

  const calculatePreview = async () => {
    try {
      const settings = pricing.settings;
      const { hourlyRate, graceMinutes, blockMinutes, nightChargeTime, nightMultiplier } = settings;
      
      if (!hourlyRate) return;
      
      // Simple calculation for preview (without night charges for now)
      const firstPeriodMinutes = 60 + (graceMinutes || 15);
      const halfRate = Math.round(hourlyRate / 2);
      
      let totalAmount = hourlyRate; // First period
      let remainingMinutes = Math.max(0, selectedDuration - firstPeriodMinutes);
      let newBreakdown = [{
        period: `First ${Math.floor(firstPeriodMinutes/60)}h ${firstPeriodMinutes%60}m`,
        minutes: Math.min(selectedDuration, firstPeriodMinutes),
        amount: hourlyRate,
        description: selectedDuration <= firstPeriodMinutes ? 'Partial first period' : 'Full first period'
      }];
      
      // Add subsequent blocks
      let blockNumber = 2;
      while (remainingMinutes > 0) {
        const blockMinutesUsed = Math.min(remainingMinutes, blockMinutes || 30);
        const blockAmount = halfRate;
        
        newBreakdown.push({
          period: `Block ${blockNumber}`,
          minutes: blockMinutesUsed,
          amount: blockAmount,
          description: blockMinutesUsed === blockMinutes ? 'Full block' : 'Partial block'
        });
        
        totalAmount += blockAmount;
        remainingMinutes -= blockMinutesUsed;
        blockNumber++;
      }
      
      setCurrentAmount(totalAmount);
      setBreakdown(newBreakdown);
    } catch (error) {
      console.error('Error calculating preview:', error);
    }
  };

  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">💰 Pricing Calculator</h3>
      
      {/* Duration Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">Select Duration:</label>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {pricing.examples.slice(0, 6).map((example) => (
            <button
              key={example.duration}
              onClick={() => setSelectedDuration(example.duration)}
              className={`p-3 text-sm rounded-lg border-2 transition-all ${
                selectedDuration === example.duration
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium">{example.label}</div>
              <div className="text-xs text-gray-500">₹{example.amount}</div>
            </button>
          ))}
        </div>
        
        {/* Custom Duration Input */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">Custom:</span>
          <input
            type="number"
            min="1"
            max="1440"
            value={selectedDuration}
            onChange={(e) => setSelectedDuration(parseInt(e.target.value) || 0)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            placeholder="Minutes"
          />
          <span className="text-sm text-gray-600">minutes</span>
        </div>
      </div>
      
      {/* Pricing Result */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex justify-between items-center mb-3">
          <span className="text-blue-800 font-medium">Total for {formatTime(selectedDuration)}:</span>
          <span className="text-2xl font-bold text-blue-600">₹{currentAmount}</span>
        </div>
        
        {/* Breakdown */}
        {breakdown.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm text-blue-700 font-medium">Breakdown:</div>
            {breakdown.map((block, index) => (
              <div key={index} className="flex justify-between text-sm text-blue-600">
                <span>{block.period} ({formatTime(block.minutes)})</span>
                <span>₹{block.amount}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Pricing Info */}
      <div className="text-xs text-gray-500 space-y-1">
        <div>• First {60 + (pricing.settings.graceMinutes || 15)} minutes: ₹{pricing.settings.hourlyRate}</div>
        <div>• Each {pricing.settings.blockMinutes || 30}-minute block: ₹{Math.round((pricing.settings.hourlyRate || 80) / 2)}</div>
        <div>• Night charges apply after {pricing.settings.nightChargeTime || '22:30'}</div>
      </div>
    </div>
  );
}

// Simplified version for quick display
export function PricingQuickView({ amount, duration, className = '' }) {
  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <span className="text-sm text-gray-600">{formatTime(duration)}:</span>
      <span className="font-semibold text-green-600">₹{amount}</span>
    </div>
  );
}