'use client';
import { useState, useEffect } from 'react';
import {
  ThemedCard,
  ThemedButton,
  ThemedBadge
} from '@/components/themed';
import { cn } from '@/lib/utils';

export default function PricingMigrationTool() {
  const [migrationStatus, setMigrationStatus] = useState(null);
  const [migrationResult, setMigrationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dryRunResult, setDryRunResult] = useState(null);
  const [showChanges, setShowChanges] = useState(false);
  const [confirmMigration, setConfirmMigration] = useState(false);

  useEffect(() => {
    fetchMigrationStatus();
  }, []);

  const fetchMigrationStatus = async () => {
    try {
      const response = await fetch('/api/admin/migrate-pricing');
      const data = await response.json();
      if (data.success) {
        setMigrationStatus(data.status);
      }
    } catch (error) {
      console.error('Error fetching migration status:', error);
    }
  };

  const runDryRun = async () => {
    setLoading(true);
    setDryRunResult(null);
    try {
      const response = await fetch('/api/admin/migrate-pricing?dryRun=true', {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        setDryRunResult(data);
        console.log('Dry run completed:', data);
      } else {
        alert('Dry run failed: ' + data.error);
      }
    } catch (error) {
      console.error('Dry run error:', error);
      alert('Dry run failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const runMigration = async () => {
    if (!confirmMigration) {
      alert('Please confirm that you want to proceed with the migration');
      return;
    }

    setLoading(true);
    setMigrationResult(null);
    try {
      const response = await fetch('/api/admin/migrate-pricing?dryRun=false', {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        setMigrationResult(data);
        setConfirmMigration(false);
        // Refresh status
        await fetchMigrationStatus();
        alert(`Migration completed successfully! Updated ${data.migration.updatedBookings} bookings.`);
      } else {
        alert('Migration failed: ' + data.error);
      }
    } catch (error) {
      console.error('Migration error:', error);
      alert('Migration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => `₹${amount.toLocaleString('en-IN')}`;
  const formatPercentage = (percentage) => `${percentage > 0 ? '+' : ''}${percentage.toFixed(2)}%`;

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-4">
          🧮 Pricing Migration Tool
        </h2>
        <p className="text-gray-400 text-lg">
          Adjust all stored booking amounts to use your current advanced pricing calculations
        </p>
      </div>

      {/* Migration Status */}
      {migrationStatus && (
        <ThemedCard className="mb-8">
          <div className="p-6">
            <h3 className="text-xl font-bold text-white mb-4">Current Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-4">
                <h4 className="font-semibold text-blue-200 mb-3">📋 Bookings</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Total Completed:</span>
                    <span className="text-white font-medium">{migrationStatus.bookings.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Already Migrated:</span>
                    <span className="text-green-400 font-medium">{migrationStatus.bookings.migrated}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Pending:</span>
                    <span className="text-orange-400 font-medium">{migrationStatus.bookings.pending}</span>
                  </div>
                  <div className="mt-3">
                    <div className="bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${migrationStatus.bookings.percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-400 mt-1 block">
                      {migrationStatus.bookings.percentage}% migrated
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-purple-900/20 border border-purple-700/30 rounded-lg p-4">
                <h4 className="font-semibold text-purple-200 mb-3">📅 Daily Operations</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Total Ended:</span>
                    <span className="text-white font-medium">{migrationStatus.operations.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Already Migrated:</span>
                    <span className="text-green-400 font-medium">{migrationStatus.operations.migrated}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Pending:</span>
                    <span className="text-orange-400 font-medium">{migrationStatus.operations.pending}</span>
                  </div>
                  <div className="mt-3">
                    <div className="bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${migrationStatus.operations.percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-400 mt-1 block">
                      {migrationStatus.operations.percentage}% migrated
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {migrationStatus.lastMigration && (
              <div className="mt-4 text-sm text-gray-400">
                Last migration: {new Date(migrationStatus.lastMigration).toLocaleString('en-IN')}
              </div>
            )}
          </div>
        </ThemedCard>
      )}

      {/* Dry Run Section */}
      <ThemedCard className="mb-8">
        <div className="p-6">
          <h3 className="text-xl font-bold text-white mb-4">🔍 Preview Changes (Dry Run)</h3>
          <p className="text-gray-400 mb-4">
            Run a simulation to see what would change without actually modifying any data.
          </p>
          
          <ThemedButton
            variant="secondary"
            onClick={runDryRun}
            disabled={loading}
            className="flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Running Preview...
              </>
            ) : (
              <>
                🔍 Run Dry Run
              </>
            )}
          </ThemedButton>

          {/* Dry Run Results */}
          {dryRunResult && (
            <div className="mt-6 space-y-4">
              <div className="bg-gray-800/50 rounded-lg p-4">
                <h4 className="font-semibold text-white mb-3">📊 Dry Run Results</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">
                      {dryRunResult.migration.totalChanges}
                    </div>
                    <div className="text-sm text-gray-400">Bookings to Update</div>
                  </div>
                  
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${dryRunResult.migration.financial.difference >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {dryRunResult.migration.financial.difference >= 0 ? '+' : ''}{formatCurrency(dryRunResult.migration.financial.difference)}
                    </div>
                    <div className="text-sm text-gray-400">Revenue Difference</div>
                  </div>
                  
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${dryRunResult.migration.financial.percentageChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatPercentage(dryRunResult.migration.financial.percentageChange)}
                    </div>
                    <div className="text-sm text-gray-400">Percentage Change</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Current Total Revenue:</span>
                    <span className="text-white font-medium ml-2">
                      {formatCurrency(dryRunResult.migration.financial.oldTotal)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">New Total Revenue:</span>
                    <span className="text-white font-medium ml-2">
                      {formatCurrency(dryRunResult.migration.financial.newTotal)}
                    </span>
                  </div>
                </div>

                {dryRunResult.summary.biggestIncrease && (
                  <div className="mt-4 p-3 bg-green-900/20 border border-green-700/30 rounded">
                    <div className="text-sm">
                      <span className="text-green-200">Biggest Increase:</span>
                      <span className="text-white ml-2">
                        {dryRunResult.summary.biggestIncrease.bookingId} - 
                        {formatCurrency(dryRunResult.summary.biggestIncrease.oldAmount)} → 
                        {formatCurrency(dryRunResult.summary.biggestIncrease.newAmount)}
                        <span className="text-green-400 ml-1">
                          (+{formatCurrency(dryRunResult.summary.biggestIncrease.difference)})
                        </span>
                      </span>
                    </div>
                  </div>
                )}

                {dryRunResult.summary.biggestDecrease && (
                  <div className="mt-2 p-3 bg-red-900/20 border border-red-700/30 rounded">
                    <div className="text-sm">
                      <span className="text-red-200">Biggest Decrease:</span>
                      <span className="text-white ml-2">
                        {dryRunResult.summary.biggestDecrease.bookingId} - 
                        {formatCurrency(dryRunResult.summary.biggestDecrease.oldAmount)} → 
                        {formatCurrency(dryRunResult.summary.biggestDecrease.newAmount)}
                        <span className="text-red-400 ml-1">
                          ({formatCurrency(dryRunResult.summary.biggestDecrease.difference)})
                        </span>
                      </span>
                    </div>
                  </div>
                )}

                <div className="mt-4 flex gap-2">
                  <ThemedButton
                    variant="secondary"
                    onClick={() => setShowChanges(!showChanges)}
                    className="text-sm"
                  >
                    {showChanges ? 'Hide' : 'Show'} Individual Changes ({dryRunResult.changes.length})
                  </ThemedButton>
                </div>

                {/* Individual Changes */}
                {showChanges && dryRunResult.changes.length > 0 && (
                  <div className="mt-4 max-h-80 overflow-y-auto">
                    <div className="space-y-2">
                      {dryRunResult.changes.map((change, index) => (
                        <div key={index} className="bg-gray-700/30 rounded p-3 text-sm">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-medium text-white">{change.bookingId}</span>
                              <span className="text-gray-400 ml-2">({change.duration})</span>
                            </div>
                            <div className="text-right">
                              <div className={`font-medium ${change.difference >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {formatCurrency(change.oldAmount)} → {formatCurrency(change.newAmount)}
                              </div>
                              <div className={`text-xs ${change.difference >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                                {change.difference >= 0 ? '+' : ''}{formatCurrency(change.difference)}
                              </div>
                            </div>
                          </div>
                          {change.summary && (
                            <div className="text-xs text-gray-400 mt-1">{change.summary}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </ThemedCard>

      {/* Migration Execution */}
      {dryRunResult && (
        <ThemedCard className="mb-8">
          <div className="p-6">
            <h3 className="text-xl font-bold text-white mb-4">⚡ Execute Migration</h3>
            
            <div className="bg-orange-900/20 border border-orange-700/30 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-orange-200 mb-2">⚠️ Important Notice</h4>
              <ul className="text-orange-300 text-sm space-y-1">
                <li>• This will permanently update {dryRunResult.migration.totalChanges} booking records</li>
                <li>• Total revenue will change by {formatCurrency(dryRunResult.migration.financial.difference)}</li>
                <li>• Daily operations summaries will be recalculated</li>
                <li>• This action cannot be undone - make sure you have a database backup</li>
              </ul>
            </div>

            <div className="mb-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmMigration}
                  onChange={(e) => setConfirmMigration(e.target.checked)}
                  className="w-5 h-5 text-red-600 border-gray-600 rounded focus:ring-red-500 bg-gray-800"
                />
                <span className="text-white">
                  I understand this will permanently modify the database and I have a backup
                </span>
              </label>
            </div>

            <ThemedButton
              variant={confirmMigration ? "primary" : "secondary"}
              onClick={runMigration}
              disabled={loading || !confirmMigration}
              className={cn(
                "flex items-center gap-2",
                confirmMigration ? "bg-red-600 hover:bg-red-700" : ""
              )}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Migrating Data...
                </>
              ) : (
                <>
                  ⚡ Execute Migration
                </>
              )}
            </ThemedButton>
          </div>
        </ThemedCard>
      )}

      {/* Migration Results */}
      {migrationResult && (
        <ThemedCard>
          <div className="p-6">
            <h3 className="text-xl font-bold text-green-400 mb-4">✅ Migration Completed!</h3>
            <div className="bg-green-900/20 border border-green-700/30 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Bookings Updated:</span>
                  <span className="text-white font-medium ml-2">
                    {migrationResult.migration.updatedBookings}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Daily Operations Updated:</span>
                  <span className="text-white font-medium ml-2">
                    {migrationResult.migration.dailyOperations.updated}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Revenue Difference:</span>
                  <span className={`font-medium ml-2 ${migrationResult.migration.financial.difference >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {migrationResult.migration.financial.difference >= 0 ? '+' : ''}{formatCurrency(migrationResult.migration.financial.difference)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Errors:</span>
                  <span className="text-white font-medium ml-2">
                    {migrationResult.migration.errors}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </ThemedCard>
      )}
    </div>
  );
}