'use client';
import { useState } from 'react';
import {
  ThemedCard,
  ThemedButton
} from '@/components/themed';

export function DailyOpsComprehensiveFix() {
  const [step, setStep] = useState(1);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [cleanupResults, setCleanupResults] = useState(null);
  const [revenueLoading, setRevenueLoading] = useState(false);
  const [revenueResults, setRevenueResults] = useState(null);
  const [error, setError] = useState(null);

  const runCleanup = async () => {
    setCleanupLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/cleanup-duplicates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        setCleanupResults(data);
        if (data.summary?.totalRemoved > 0) {
          setStep(2); // Move to revenue fix step
        } else {
          setStep(2); // Still move to step 2 even if no duplicates found
        }
      } else {
        setError(data.error || 'Cleanup failed');
      }
    } catch (error) {
      console.error('Error running cleanup:', error);
      setError('Failed to run cleanup. Please try again.');
    } finally {
      setCleanupLoading(false);
    }
  };

  const runRevenueRecalculation = async (dryRun = false) => {
    setRevenueLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/daily-operations-recalculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dryRun }),
      });

      const data = await response.json();

      if (data.success) {
        setRevenueResults(data);
        if (!dryRun) {
          setStep(3); // Move to completion step
        }
      } else {
        setError(data.error || 'Revenue recalculation failed');
      }
    } catch (error) {
      console.error('Error running revenue recalculation:', error);
      setError('Failed to run revenue recalculation. Please try again.');
    } finally {
      setRevenueLoading(false);
    }
  };

  const resetTool = () => {
    setStep(1);
    setCleanupResults(null);
    setRevenueResults(null);
    setError(null);
  };

  return (
    <ThemedCard title="🔧 Daily Operations Complete Fix" description="Fix duplicates and revenue calculation issues">
      <div className="space-y-6">
        
        {/* Progress Indicator */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
              step >= 1 ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-600 text-gray-400'
            }`}>
              1
            </div>
            <div className={`h-1 w-16 ${step >= 2 ? 'bg-blue-500' : 'bg-gray-600'}`}></div>
            <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
              step >= 2 ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-600 text-gray-400'
            }`}>
              2
            </div>
            <div className={`h-1 w-16 ${step >= 3 ? 'bg-blue-500' : 'bg-gray-600'}`}></div>
            <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
              step >= 3 ? 'bg-green-500 border-green-500 text-white' : 'border-gray-600 text-gray-400'
            }`}>
              ✓
            </div>
          </div>
          <div className="text-sm text-gray-400">
            {step === 1 && 'Step 1: Remove Duplicates'}
            {step === 2 && 'Step 2: Fix Revenue'}
            {step === 3 && 'Complete: All Fixed!'}
          </div>
        </div>

        {/* Issues Overview */}
        {step === 1 && (
          <div className="bg-orange-900/20 border border-orange-700/30 rounded-lg p-4">
            <h4 className="text-orange-400 font-semibold mb-2">🔍 Issues Detected</h4>
            <div className="space-y-2 text-orange-200 text-sm">
              <div className="flex items-center gap-2">
                <span>❌</span>
                <span><strong>Duplicate daily operations</strong> - Multiple entries for same dates</span>
              </div>
              <div className="flex items-center gap-2">
                <span>❌</span>
                <span><strong>Incorrect revenue calculation</strong> - Using finalAmount instead of advanced pricing</span>
              </div>
            </div>
            <p className="text-orange-200 text-sm mt-3">
              This tool will fix both issues in sequence. Let's start with removing duplicates.
            </p>
          </div>
        )}

        {/* Step 1: Cleanup Duplicates */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                1
              </div>
              <h3 className="text-lg font-semibold text-white">Remove Duplicate Operations</h3>
            </div>
            
            <ThemedButton
              variant="primary"
              onClick={runCleanup}
              disabled={cleanupLoading}
              className="flex items-center gap-2"
            >
              {cleanupLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                  Cleaning up duplicates...
                </>
              ) : (
                <>
                  🧹 Clean Up Duplicates
                </>
              )}
            </ThemedButton>

            {cleanupResults && (
              <div className="bg-green-900/20 border border-green-700/30 rounded-lg p-4">
                <h4 className="text-green-400 font-semibold mb-2">✅ Step 1 Complete</h4>
                <p className="text-green-200 text-sm">
                  {cleanupResults.summary?.totalRemoved > 0 
                    ? `Removed ${cleanupResults.summary.totalRemoved} duplicate records.`
                    : 'No duplicates found - data is already clean!'
                  } Ready for revenue fix.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Fix Revenue */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                2
              </div>
              <h3 className="text-lg font-semibold text-white">Recalculate Revenue</h3>
            </div>

            <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-4">
              <p className="text-blue-200 text-sm">
                Now we'll recalculate revenue using your advanced pricing calculator instead of stored finalAmount values.
                This will likely increase your total revenue significantly.
              </p>
            </div>
            
            <div className="flex gap-4">
              <ThemedButton
                variant="secondary"
                onClick={() => runRevenueRecalculation(true)}
                disabled={revenueLoading}
                className="flex items-center gap-2"
              >
                {revenueLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                    Calculating...
                  </>
                ) : (
                  <>
                    📊 Preview Changes
                  </>
                )}
              </ThemedButton>

              {revenueResults && (
                <ThemedButton
                  variant="primary"
                  onClick={() => runRevenueRecalculation(false)}
                  disabled={revenueLoading}
                  className="flex items-center gap-2"
                >
                  {revenueLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                      Updating...
                    </>
                  ) : (
                    <>
                      💰 Apply Revenue Fix
                    </>
                  )}
                </ThemedButton>
              )}
            </div>

            {revenueResults && (
              <div className={`border rounded-lg p-4 ${
                revenueResults.dryRun 
                  ? 'bg-blue-900/20 border-blue-700/30' 
                  : 'bg-green-900/20 border-green-700/30'
              }`}>
                <h4 className={`font-semibold mb-3 ${
                  revenueResults.dryRun ? 'text-blue-400' : 'text-green-400'
                }`}>
                  {revenueResults.dryRun ? '📊 Revenue Preview' : '✅ Revenue Fixed!'}
                </h4>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Old Total Revenue:</span>
                    <div className="text-red-400 font-bold">₹{revenueResults.summary.oldTotalRevenue.toLocaleString('en-IN')}</div>
                  </div>
                  <div>
                    <span className="text-gray-400">New Total Revenue:</span>
                    <div className="text-green-400 font-bold">₹{revenueResults.summary.newTotalRevenue.toLocaleString('en-IN')}</div>
                  </div>
                </div>

                <div className="mt-3 p-3 bg-gray-800/50 rounded-lg">
                  <div className="text-sm">
                    <span className="text-gray-400">Revenue Increase: </span>
                    <span className="text-green-400 font-bold">
                      +₹{revenueResults.summary.totalRevenueDifference.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Complete */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-green-900/20 border border-green-700/30 rounded-lg p-6 text-center">
              <div className="text-4xl mb-3">🎉</div>
              <h3 className="text-xl font-semibold text-green-400 mb-2">All Issues Fixed!</h3>
              <p className="text-green-200 text-sm mb-4">
                Your daily operations are now clean and using correct revenue calculations.
              </p>
              
              <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <div className="text-gray-400">Duplicates Removed:</div>
                  <div className="text-white font-bold">{cleanupResults?.summary?.totalRemoved || 0}</div>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <div className="text-gray-400">Revenue Increased:</div>
                  <div className="text-green-400 font-bold">
                    +₹{revenueResults?.summary?.totalRevenueDifference?.toLocaleString('en-IN') || 0}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-center">
                <ThemedButton variant="primary" onClick={() => window.location.href = '/daily-operations'}>
                  📅 View Daily Operations
                </ThemedButton>
                <ThemedButton variant="secondary" onClick={resetTool}>
                  🔄 Run Again
                </ThemedButton>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/20 border border-red-700/30 rounded-lg p-4">
            <h4 className="text-red-400 font-semibold mb-2">❌ Error</h4>
            <p className="text-red-200 text-sm">{error}</p>
            <ThemedButton 
              variant="secondary" 
              onClick={() => setError(null)} 
              className="mt-3"
            >
              Dismiss
            </ThemedButton>
          </div>
        )}
      </div>
    </ThemedCard>
  );
}