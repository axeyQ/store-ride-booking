'use client';
import { useState, useEffect } from 'react';

export default function PricingBreakdown({ startTime, endTime, finalAmount, className = '' }) {
  const [breakdown, setBreakdown] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalMinutes, setTotalMinutes] = useState(0);

  useEffect(() => {
    if (startTime) {
      calculateBreakdown();
    }
  }, [startTime, endTime, finalAmount]);

  const calculateBreakdown = async () => {
    try {
      setLoading(true);
      
      // Get current settings
      const settingsResponse = await fetch('/api/settings');
      const settingsData = await settingsResponse.json();
      
      const settings = settingsData.success ? settingsData.settings : {
        hourlyRate: 80,
        graceMinutes: 15,
        blockMinutes: 30,
        nightChargeTime: '22:30',
        nightMultiplier: 2
      };
      
      const start = new Date(startTime);
      const end = endTime ? new Date(endTime) : new Date();
      const minutes = Math.max(0, Math.floor((end - start) / (1000 * 60)));
      
      setTotalMinutes(minutes);
      
      if (minutes === 0) {
        setBreakdown([]);
        setLoading(false);
        return;
      }
      
      const result = calculateAdvancedBreakdown(start, minutes, settings);
      setBreakdown(result.breakdown);
    } catch (error) {
      console.error('Error calculating breakdown:', error);
      setBreakdown([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateAdvancedBreakdown = (startTime, totalMinutes, settings) => {
    const { hourlyRate, graceMinutes, blockMinutes, nightChargeTime, nightMultiplier } = settings;
    const halfRate = Math.round(hourlyRate / 2);
    
    let breakdown = [];
    let remainingMinutes = totalMinutes;
    let currentTime = new Date(startTime);
    
    // First block
    const firstBlockMinutes = 60 + graceMinutes;
    const firstBlockUsed = Math.min(remainingMinutes, firstBlockMinutes);
    
    const isFirstBlockNight = isNightCharge(currentTime, firstBlockUsed, nightChargeTime);
    const firstBlockRate = isFirstBlockNight ? hourlyRate * nightMultiplier : hourlyRate;
    
    breakdown.push({
      period: `First Period`,
      timeRange: `${formatTime(currentTime)} - ${formatTime(addMinutes(currentTime, firstBlockUsed))}`,
      minutes: firstBlockUsed,
      maxMinutes: firstBlockMinutes,
      rate: firstBlockRate,
      baseRate: hourlyRate,
      isNightCharge: isFirstBlockNight,
      description: `Base period + ${graceMinutes} min grace`,
      isFull: firstBlockUsed === firstBlockMinutes
    });
    
    remainingMinutes -= firstBlockUsed;
    currentTime = addMinutes(currentTime, firstBlockUsed);
    
    // Subsequent blocks
    let blockNumber = 2;
    while (remainingMinutes > 0) {
      const blockUsed = Math.min(remainingMinutes, blockMinutes);
      const isNight = isNightCharge(currentTime, blockUsed, nightChargeTime);
      const blockRate = isNight ? halfRate * nightMultiplier : halfRate;
      
      breakdown.push({
        period: `Block ${blockNumber}`,
        timeRange: `${formatTime(currentTime)} - ${formatTime(addMinutes(currentTime, blockUsed))}`,
        minutes: blockUsed,
        maxMinutes: blockMinutes,
        rate: blockRate,
        baseRate: halfRate,
        isNightCharge: isNight,
        description: `${blockMinutes}-minute block`,
        isFull: blockUsed === blockMinutes
      });
      
      remainingMinutes -= blockUsed;
      currentTime = addMinutes(currentTime, blockUsed);
      blockNumber++;
    }
    
    return { breakdown };
  };

  const isNightCharge = (startTime, durationMinutes, nightChargeTime) => {
    try {
      const [nightHour, nightMinute] = nightChargeTime.split(':').map(Number);
      const blockEndTime = addMinutes(startTime, durationMinutes);
      
      const nightThreshold = new Date(startTime);
      nightThreshold.setHours(nightHour, nightMinute, 0, 0);
      
      return blockEndTime > nightThreshold && startTime < addMinutes(nightThreshold, 1);
    } catch (error) {
      return false;
    }
  };

  const addMinutes = (date, minutes) => {
    return new Date(date.getTime() + minutes * 60000);
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const totalCalculated = breakdown.reduce((sum, block) => sum + block.rate, 0);

  if (loading) {
    return (
      <div className={`bg-gray-50 rounded-lg p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-3"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (breakdown.length === 0) {
    return (
      <div className={`bg-gray-50 rounded-lg p-4 text-center text-gray-500 ${className}`}>
        No time elapsed
      </div>
    );
  }

  return (
    <div className={`bg-gray-50 rounded-lg p-4 ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-semibold text-gray-900">Pricing Breakdown</h4>
        <span className="text-sm text-gray-500">Total: {formatDuration(totalMinutes)}</span>
      </div>
      
      <div className="space-y-3">
        {breakdown.map((block, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-3 bg-white">
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{block.period}</span>
                  {block.isNightCharge && (
                    <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">
                      🌙 Night Rate
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-600">{block.timeRange}</div>
                <div className="text-xs text-gray-500">{block.description}</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-lg text-gray-900">₹{block.rate}</div>
                {block.isNightCharge && (
                  <div className="text-xs text-orange-600">
                    ₹{block.baseRate} × {block.rate / block.baseRate}
                  </div>
                )}
              </div>
            </div>
            
            {/* Progress bar showing usage */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-500">{formatDuration(block.minutes)}</span>
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    block.isNightCharge ? 'bg-orange-400' : 'bg-blue-400'
                  }`}
                  style={{ width: `${(block.minutes / block.maxMinutes) * 100}%` }}
                ></div>
              </div>
              <span className="text-gray-500">
                {block.isFull ? 'Full' : 'Partial'}
              </span>
            </div>
          </div>
        ))}
      </div>
      
      {/* Total Summary */}
      <div className="border-t border-gray-300 pt-3 mt-4">
        <div className="flex justify-between items-center">
          <span className="font-semibold text-gray-900">Total Amount:</span>
          <span className="text-xl font-bold text-green-600">
            ₹{finalAmount || totalCalculated}
          </span>
        </div>
        {finalAmount && finalAmount !== totalCalculated && (
          <div className="text-sm text-gray-500 mt-1">
            Base calculation: ₹{totalCalculated}
            {finalAmount > totalCalculated && (
              <span className="text-red-600"> (+₹{finalAmount - totalCalculated} adjustments)</span>
            )}
            {finalAmount < totalCalculated && (
              <span className="text-green-600"> (-₹{totalCalculated - finalAmount} discount)</span>
            )}
          </div>
        )}
      </div>
      
      {/* Night charge explanation */}
      {breakdown.some(b => b.isNightCharge) && (
        <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded text-sm">
          <div className="font-medium text-orange-900 mb-1">🌙 Night Charges Applied</div>
          <div className="text-orange-800">
            Blocks that cross or include the night charge time have increased rates.
          </div>
        </div>
      )}
    </div>
  );
}