'use client'
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import Link from "next/link";
import { Button } from "./ui/button";

export default function HomeFleetForecastWidget() {
    const [forecastData, setForecastData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
  
    useEffect(() => {
      fetchForecastData();
      const interval = setInterval(fetchForecastData, 5 * 60 * 1000); // Update every 5 minutes
      return () => clearInterval(interval);
    }, []);
  
    const fetchForecastData = async () => {
      try {
        setError(null);
        const response = await fetch('/api/analytics/fleet-forecast');
        const data = await response.json();
        if (data.success) {
          // ✅ FILTER: Only include slots with actual vehicle returns
          const filteredForecast = (data.forecast || []).filter(slot => 
            slot.expectedReturns && slot.expectedReturns > 0
          );
          setForecastData(filteredForecast);
        } else {
          setError('Failed to load forecast');
        }
      } catch (error) {
        console.error('Error fetching forecast:', error);
        setError('Connection error');
      } finally {
        setLoading(false);
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
              <Button 
                onClick={fetchForecastData}
                className="bg-cyan-600 hover:bg-cyan-700 text-white"
              >
                🔄 Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }
  
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
            Expected vehicle returns today
          </CardDescription>
        </CardHeader>
        <CardContent>
          {forecastData.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">🚗</div>
              <div className="text-gray-400 text-lg font-medium mb-2">All Clear!</div>
              <div className="text-gray-500 text-sm">No vehicles expected back today</div>
            </div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {/* ✅ IMPROVED: Only show meaningful time slots with returns */}
              {forecastData.slice(0, 4).map((slot, index) => (
                <div 
                  key={index} 
                  className="flex justify-between items-center p-4 rounded-lg bg-cyan-900/20 border border-cyan-700/30 hover:bg-cyan-900/30 transition-colors"
                >
                  <div className="flex-1">
                    <div className="text-cyan-200 font-semibold text-lg">{slot.hour}</div>
                    <div className="text-cyan-400 text-sm">
                      {slot.expectedReturns} vehicle{slot.expectedReturns !== 1 ? 's' : ''} expected
                    </div>
                    {slot.vehicles && slot.vehicles.length > 0 && (
                      <div className="text-cyan-300 text-xs mt-1">
                        {slot.vehicles.slice(0, 2).join(', ')}
                        {slot.vehicles.length > 2 && ` +${slot.vehicles.length - 2} more`}
                      </div>
                    )}
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-cyan-400 font-bold text-2xl">+{slot.expectedReturns}</div>
                    <div className="text-cyan-300 text-xs">available</div>
                  </div>
                </div>
              ))}
              
              {/* Show total if more than 4 slots */}
              {forecastData.length > 4 && (
                <div className="text-center pt-3 border-t border-gray-700/50">
                  <div className="text-gray-400 text-sm">
                    +{forecastData.length - 4} more time slots with returns
                  </div>
                  <div className="text-cyan-400 text-lg font-bold mt-1">
                    {forecastData.reduce((sum, slot) => sum + slot.expectedReturns, 0)} total expected today
                  </div>
                </div>
              )}
            </div>
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
        </CardContent>
      </Card>
    );
  }