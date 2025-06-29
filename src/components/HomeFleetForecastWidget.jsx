'use client'
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import Link from "next/link";
import { Button } from "./ui/button";

export default function HomeFleetForecastWidget() {
  const [forecastData, setForecastData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [retryCount, setRetryCount] = useState(0);

  // Update current time every minute for live display
  useEffect(() => {
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute
    
    return () => clearInterval(timeInterval);
  }, []);

  useEffect(() => {
    fetchForecastData();
    const interval = setInterval(fetchForecastData, 5 * 60 * 1000); // Update every 5 minutes
    return () => clearInterval(interval);
  }, []);

  const fetchForecastData = async () => {
    try {
      setError(null);
      console.log('🔄 Fetching fleet forecast data...');
      
      const response = await fetch('/api/analytics/fleet-forecast');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      console.log('📊 Fleet forecast response:', data);
      
      if (data.success) {
        // ✅ ENHANCED: Store both forecast and summary data with validation
        const filteredForecast = (data.forecast || []).filter(slot => 
          slot && slot.expectedReturns && slot.expectedReturns > 0
        );
        
        setForecastData(filteredForecast);
        setSummary(data.summary || null);
        setLastUpdated(new Date());
        setRetryCount(0); // Reset retry count on success
        
        console.log('✅ Fleet forecast loaded successfully:', {
          slots: filteredForecast.length,
          totalReturns: data.summary?.totalUpcomingReturns || 0
        });
      } else {
        throw new Error(data.error || data.details || 'Unknown API error');
      }
    } catch (error) {
      console.error('❌ Error fetching forecast:', error);
      setError(error.message || 'Connection error');
      setRetryCount(prev => prev + 1);
    } finally {
      setLoading(false);
    }
  };

  // ✅ SAFE: Format time with error handling
  const formatTimeIST = (timeInput) => {
    try {
      if (!timeInput) return '';
      
      const date = new Date(timeInput);
      if (isNaN(date.getTime())) {
        return 'Invalid time';
      }
      
      return date.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.log('Error formatting time:', error);
      return 'Time error';
    }
  };

  // ✅ SAFE: Get next return info with error handling
  const getNextReturn = () => {
    try {
      if (!forecastData || forecastData.length === 0) return null;
      
      const nextSlot = forecastData[0];
      if (nextSlot && nextSlot.bookings && nextSlot.bookings.length > 0) {
        const nextBooking = nextSlot.bookings[0];
        return {
          time: nextSlot.hour || 'Unknown time',
          vehicle: nextBooking.vehicleModel && nextBooking.plateNumber ? 
            `${nextBooking.vehicleModel} (${nextBooking.plateNumber})` : 'Unknown vehicle',
          customer: nextBooking.customerName || 'Unknown customer',
          isEstimated: nextBooking.isEstimated || false
        };
      }
      return { 
        time: nextSlot.hour || 'Unknown time', 
        count: nextSlot.expectedReturns || 0 
      };
    } catch (error) {
      console.log('Error getting next return:', error);
      return null;
    }
  };

  if (loading) {
    return (
      <Card className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 border-gray-700 hover:scale-105 transition-transform">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-white flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            Fleet Forecast
          </CardTitle>
          <CardDescription className="text-gray-400">
            Upcoming vehicle returns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-400"></div>
              <span className="text-gray-400">Loading forecast...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 border-gray-700 hover:scale-105 transition-transform">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-white flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-red-400 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            Fleet Forecast
          </CardTitle>
          <CardDescription className="text-red-400">
            {error}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="text-sm text-gray-400 mb-3">
              {retryCount > 0 && `Retry attempt: ${retryCount}`}
            </div>
            <Button 
              onClick={fetchForecastData}
              className="bg-cyan-600 hover:bg-cyan-700 text-white"
              disabled={loading}
            >
              🔄 Retry
            </Button>
            {retryCount > 2 && (
              <div className="mt-3 text-xs text-yellow-400">
                💡 Try refreshing the page if the issue persists
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const nextReturn = getNextReturn();

  return (
    <Card className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 border-gray-700 hover:scale-105 transition-transform">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-white flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          Fleet Forecast
        </CardTitle>
        <CardDescription className="text-gray-400 flex items-center justify-between">
          <span>Expected vehicle returns</span>
          <span className="text-xs text-cyan-400">
            🕐 {formatTimeIST(currentTime)} IST
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {forecastData.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">🚗</div>
            <div className="text-gray-400 text-lg font-medium mb-2">All Clear!</div>
            <div className="text-gray-500 text-sm">No vehicles expected back in next 6 hours</div>
            {summary && (
              <div className="mt-3 text-xs text-gray-400">
                {summary.totalUpcomingReturns === 0 ? (
                  "All vehicles are either available or on longer rentals"
                ) : (
                  `${summary.totalUpcomingReturns} returns expected beyond 6-hour window`
                )}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* ✅ ENHANCED: Next Return Highlight with error safety */}
            {nextReturn && (
              <div className="mb-4 p-3 bg-gradient-to-r from-cyan-600/20 to-blue-600/20 border border-cyan-500/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-cyan-200 text-sm font-medium">Next Return</div>
                    <div className="text-white font-semibold">{nextReturn.time}</div>
                    {nextReturn.customer && nextReturn.customer !== 'Unknown customer' && (
                      <div className="text-cyan-300 text-xs">{nextReturn.customer}</div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-cyan-400 font-bold text-lg">
                      {nextReturn.vehicle ? '1' : (nextReturn.count || '?')}
                    </div>
                    <div className="text-cyan-300 text-xs">
                      {nextReturn.isEstimated ? 'estimated' : 'scheduled'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3 max-h-64 overflow-y-auto">
              {/* ✅ SAFE: Show meaningful time slots with enhanced error handling */}
              {forecastData.slice(0, 4).map((slot, index) => {
                try {
                  return (
                    <div 
                      key={`slot-${index}-${slot.hour || index}`} 
                      className="flex justify-between items-center p-4 rounded-lg bg-cyan-900/20 border border-cyan-700/30 hover:bg-cyan-900/30 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="text-cyan-200 font-semibold text-lg">
                          {slot.hour || `Hour ${index + 1}`}
                        </div>
                        <div className="text-cyan-400 text-sm">
                          {slot.expectedReturns || 0} vehicle{(slot.expectedReturns || 0) !== 1 ? 's' : ''} expected
                        </div>
                        {slot.vehicles && slot.vehicles.length > 0 && (
                          <div className="text-cyan-300 text-xs mt-1">
                            {slot.vehicles.slice(0, 2).join(', ')}
                            {slot.vehicles.length > 2 && ` +${slot.vehicles.length - 2} more`}
                          </div>
                        )}
                        {/* Show estimation status safely */}
                        {slot.bookings && slot.bookings.length > 0 && (
                          <div className="text-cyan-400 text-xs mt-1">
                            {slot.bookings.filter(b => b && b.isEstimated).length > 0 && (
                              <span className="opacity-75">
                                ⏱️ {slot.bookings.filter(b => b && b.isEstimated).length} estimated
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        <div className="text-cyan-400 font-bold text-2xl">
                          +{slot.expectedReturns || 0}
                        </div>
                        <div className="text-cyan-300 text-xs">available</div>
                      </div>
                    </div>
                  );
                } catch (slotError) {
                  console.log(`Error rendering slot ${index}:`, slotError);
                  return (
                    <div key={`error-slot-${index}`} className="p-4 rounded-lg bg-red-900/20 border border-red-700/30">
                      <div className="text-red-400 text-sm">Error displaying slot {index + 1}</div>
                    </div>
                  );
                }
              })}
              
              {/* Show total if more than 4 slots */}
              {forecastData.length > 4 && (
                <div className="text-center pt-3 border-t border-gray-700/50">
                  <div className="text-gray-400 text-sm">
                    +{forecastData.length - 4} more time slots with returns
                  </div>
                  <div className="text-cyan-400 text-lg font-bold mt-1">
                    {forecastData.reduce((sum, slot) => sum + (slot.expectedReturns || 0), 0)} total expected
                  </div>
                </div>
              )}
            </div>

            {/* ✅ SAFE: Summary Stats with error handling */}
            {summary && (
              <div className="mt-4 pt-3 border-t border-gray-700/50">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-green-400 font-bold">{summary.confirmedReturns || 0}</div>
                    <div className="text-green-300 text-xs">confirmed</div>
                  </div>
                  <div>
                    <div className="text-yellow-400 font-bold">{summary.estimatedReturns || 0}</div>
                    <div className="text-yellow-300 text-xs">estimated</div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Quick Action Button */}
        <div className="mt-4 pt-4 border-t border-gray-700/50">
          <Link href="/active-bookings" className="w-full">
            <Button
              variant="outline" 
              className="w-full border-cyan-600 text-cyan-300 hover:bg-cyan-900/20 hover:text-cyan-200"
            >
              📋 View All Active Rentals
            </Button>
          </Link>
        </div>

        {/* ✅ ENHANCED: Timezone and Update Info */}
        <div className="mt-3 pt-3 border-t border-gray-700/30">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>🌏 Times in IST</span>
            {lastUpdated && (
              <span>Updated: {formatTimeIST(lastUpdated)}</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}