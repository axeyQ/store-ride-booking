'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ThemedLayout,
  ThemedCard,
  ThemedButton,
  ThemedSelect,
  ThemedBadge,
  ThemedInput
} from '@/components/themed';
import { theme } from '@/lib/theme';
import { cn } from '@/lib/utils';

export default function DailyOperationsPage() {
  const [operations, setOperations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [range, setRange] = useState('month');
  const [stats, setStats] = useState({
    totalOperatingDays: 0,
    totalRevenue: 0,
    averageRevenue: 0,
    totalOperatingHours: 0,
    averageOperatingHours: 0,
    bestDay: null,
    autoEndedDays: 0
  });

  const fetchOperations = async (page = 1) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/daily-operations?range=${range}&page=${page}&limit=10`);
      const data = await response.json();
      
      if (data.success) {
        setOperations(data.operations || []);
        setCurrentPage(page);
        setTotalPages(data.totalPages || 1);
        
        // Calculate stats
        calculateStats(data.operations || []);
      }
    } catch (error) {
      console.error('Error fetching operations:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (ops) => {
    const completedOps = ops.filter(op => op.status === 'ended');
    
    const totalRevenue = completedOps.reduce((sum, op) => sum + (op.dailySummary?.totalRevenue || 0), 0);
    const totalHours = completedOps.reduce((sum, op) => sum + (op.dailySummary?.operatingHours || 0), 0);
    const autoEnded = completedOps.filter(op => op.autoEnded).length;
    
    const bestDay = completedOps.reduce((best, op) => {
      const revenue = op.dailySummary?.totalRevenue || 0;
      return revenue > (best?.dailySummary?.totalRevenue || 0) ? op : best;
    }, null);

    setStats({
      totalOperatingDays: completedOps.length,
      totalRevenue,
      averageRevenue: completedOps.length > 0 ? Math.round(totalRevenue / completedOps.length) : 0,
      totalOperatingHours: Math.round(totalHours * 10) / 10,
      averageOperatingHours: completedOps.length > 0 ? Math.round((totalHours / completedOps.length) * 10) / 10 : 0,
      bestDay,
      autoEndedDays: autoEnded
    });
  };

  useEffect(() => {
    fetchOperations(1);
  }, [range]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    
    return date.toLocaleDateString('en-IN', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return '—';
    return new Date(timeString).toLocaleString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getStatusConfig = (operation) => {
    switch (operation.status) {
      case 'not_started':
        return { color: 'orange', icon: '🌅', text: 'Not Started' };
      case 'in_progress':
        return { color: 'green', icon: '🏃', text: 'In Progress' };
      case 'ended':
        return { color: 'blue', icon: '🌙', text: 'Ended' };
      default:
        return { color: 'gray', icon: '❓', text: 'Unknown' };
    }
  };

  const exportData = async () => {
    try {
      const response = await fetch(`/api/daily-operations/export?range=${range}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `daily-operations-${range}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    }
  };

  return (
    <ThemedLayout 
      title="📅 Daily Operations History" 
      subtitle="Track your business day-to-day operations and performance"
    >
      <div className="container mx-auto px-6 py-8">
        
        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-green-900/20 border border-green-700/30 rounded-xl p-6 text-center">
            <div className="text-3xl font-bold text-green-400 mb-2">
              ₹{stats.totalRevenue.toLocaleString('en-IN')}
            </div>
            <div className="text-green-200 text-sm">Total Revenue</div>
            <div className="text-xs text-green-300 mt-1">
              Avg: ₹{stats.averageRevenue.toLocaleString('en-IN')}
            </div>
          </div>

          <div className="bg-blue-900/20 border border-blue-700/30 rounded-xl p-6 text-center">
            <div className="text-3xl font-bold text-blue-400 mb-2">
              {stats.totalOperatingDays}
            </div>
            <div className="text-blue-200 text-sm">Operating Days</div>
            <div className="text-xs text-blue-300 mt-1">
              {stats.autoEndedDays} auto-ended
            </div>
          </div>

          <div className="bg-purple-900/20 border border-purple-700/30 rounded-xl p-6 text-center">
            <div className="text-3xl font-bold text-purple-400 mb-2">
              {stats.totalOperatingHours}h
            </div>
            <div className="text-purple-200 text-sm">Total Hours</div>
            <div className="text-xs text-purple-300 mt-1">
              Avg: {stats.averageOperatingHours}h/day
            </div>
          </div>

          <div className="bg-orange-900/20 border border-orange-700/30 rounded-xl p-6 text-center">
            <div className="text-3xl font-bold text-orange-400 mb-2">
              {stats.bestDay ? `₹${stats.bestDay.dailySummary.totalRevenue.toLocaleString('en-IN')}` : '—'}
            </div>
            <div className="text-orange-200 text-sm">Best Day</div>
            <div className="text-xs text-orange-300 mt-1">
              {stats.bestDay ? formatDate(stats.bestDay.date) : 'No data'}
            </div>
          </div>
        </div>

        {/* Controls */}
        <ThemedCard>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h3 className="text-xl font-bold text-white mb-2">Operations History</h3>
              <p className="text-gray-400 text-sm">
                View and analyze your daily business operations
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <ThemedSelect
                value={range}
                onValueChange={setRange}
                options={[
                  { value: 'week', label: 'Last 7 Days' },
                  { value: 'month', label: 'Last 30 Days' },
                  { value: 'all', label: 'All Time' }
                ]}
              />
              
              <ThemedButton
                variant="secondary"
                onClick={exportData}
                className="flex items-center gap-2"
              >
                📥 Export CSV
              </ThemedButton>

              <Link href="/admin">
                <ThemedButton variant="primary" className="flex items-center gap-2">
                  📊 Dashboard
                </ThemedButton>
              </Link>
            </div>
          </div>

          {/* Operations Table */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
              <span className="ml-3 text-gray-400">Loading operations...</span>
            </div>
          ) : operations.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">📅</div>
              <h3 className="text-lg font-medium text-white mb-2">No Operations Found</h3>
              <p className="text-gray-400">No daily operations recorded for the selected period.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-4 px-4 text-gray-300 font-medium">Date</th>
                      <th className="text-left py-4 px-4 text-gray-300 font-medium">Status</th>
                      <th className="text-center py-4 px-4 text-gray-300 font-medium">Start</th>
                      <th className="text-center py-4 px-4 text-gray-300 font-medium">End</th>
                      <th className="text-center py-4 px-4 text-gray-300 font-medium">Hours</th>
                      <th className="text-center py-4 px-4 text-gray-300 font-medium">Revenue</th>
                      <th className="text-center py-4 px-4 text-gray-300 font-medium">Bookings</th>
                      <th className="text-center py-4 px-4 text-gray-300 font-medium">Staff</th>
                    </tr>
                  </thead>
                  <tbody>
                    {operations.map((operation) => {
                      const statusConfig = getStatusConfig(operation);
                      return (
                        <tr key={operation._id} className="border-b border-gray-800 hover:bg-gray-800/30">
                          <td className="py-4 px-4">
                            <div>
                              <div className="text-white font-medium">
                                {formatDate(operation.date)}
                              </div>
                              <div className="text-gray-400 text-xs">
                                {new Date(operation.date).toLocaleDateString('en-IN')}
                              </div>
                            </div>
                          </td>
                          
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{statusConfig.icon}</span>
                              <ThemedBadge color={statusConfig.color} className="text-xs">
                                {statusConfig.text}
                              </ThemedBadge>
                              {operation.restartCount > 0 && (
                                <ThemedBadge color="orange" className="text-xs">
                                  🔄 {operation.restartCount}
                                </ThemedBadge>
                              )}
                            </div>
                          </td>

                          <td className="py-4 px-4 text-center">
                            <div className="text-white font-medium">
                              {formatTime(operation.startTime)}
                            </div>
                            {operation.startedBy && (
                              <div className="text-gray-400 text-xs">
                                {operation.startedBy}
                              </div>
                            )}
                          </td>

                          <td className="py-4 px-4 text-center">
                            <div className="text-white font-medium">
                              {formatTime(operation.endTime)}
                            </div>
                            {operation.endedBy && (
                              <div className="text-gray-400 text-xs">
                                {operation.endedBy}
                                {operation.autoEnded && ' (Auto)'}
                              </div>
                            )}
                          </td>

                          <td className="py-4 px-4 text-center">
                            <div className="text-white font-bold">
                              {operation.dailySummary?.operatingHours || 0}h
                            </div>
                          </td>

                          <td className="py-4 px-4 text-center">
                            <div className="text-green-400 font-bold">
                              ₹{(operation.dailySummary?.totalRevenue || 0).toLocaleString('en-IN')}
                            </div>
                            {operation.dailySummary?.revenuePerHour > 0 && (
                              <div className="text-gray-400 text-xs">
                                ₹{operation.dailySummary.revenuePerHour}/hr
                              </div>
                            )}
                          </td>

                          <td className="py-4 px-4 text-center">
                            <div className="text-blue-400 font-bold">
                              {operation.dailySummary?.totalBookings || 0}
                            </div>
                            <div className="text-gray-400 text-xs">
                              {operation.dailySummary?.completedBookings || 0} completed
                            </div>
                          </td>

                          <td className="py-4 px-4 text-center">
                            <div className="text-white text-sm">
                              Start: {operation.startedBy || '—'}
                            </div>
                            <div className="text-gray-400 text-xs">
                              End: {operation.endedBy || '—'}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-6 pt-4 border-t border-gray-700">
                  <ThemedButton
                    variant="secondary"
                    onClick={() => fetchOperations(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className={currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}
                  >
                    Previous
                  </ThemedButton>

                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                    return (
                      <ThemedButton
                        key={page}
                        variant={page === currentPage ? "primary" : "secondary"}
                        onClick={() => fetchOperations(page)}
                        className="px-3"
                      >
                        {page}
                      </ThemedButton>
                    );
                  })}

                  <ThemedButton
                    variant="secondary"
                    onClick={() => fetchOperations(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className={currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''}
                  >
                    Next
                  </ThemedButton>
                </div>
              )}
            </>
          )}
        </ThemedCard>
      </div>
    </ThemedLayout>
  );
}