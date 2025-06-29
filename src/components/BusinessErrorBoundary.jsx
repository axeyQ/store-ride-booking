// src/components/BusinessErrorBoundary.jsx
'use client';
import React from 'react';
import { AlertCircle, RefreshCw, Home, Bug } from 'lucide-react';

/**
 * Enhanced Error Boundary for Business Logic Errors
 * Provides better user experience when errors occur
 */
export class BusinessErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorId: Date.now().toString(36) + Math.random().toString(36).substr(2)
    };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error('BusinessErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Log to external service if configured
    this.logError(error, errorInfo);
  }

  logError = (error, errorInfo) => {
    // In production, you might want to send this to a logging service
    const errorData = {
      message: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      errorId: this.state.errorId,
      timestamp: new Date().toISOString(),
      userAgent: navigator?.userAgent,
      url: window?.location?.href
    };

    // For now, just log to console
    console.group('🚨 Error Details');
    console.error('Error ID:', errorData.errorId);
    console.error('Message:', errorData.message);
    console.error('Stack:', errorData.stack);
    console.error('Component Stack:', errorData.componentStack);
    console.groupEnd();

    // TODO: Send to monitoring service
    // this.sendToMonitoringService(errorData);
  };

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleReportError = () => {
    const errorDetails = {
      errorId: this.state.errorId,
      message: this.state.error?.message,
      timestamp: new Date().toISOString()
    };

    // Create mailto link with error details
    const subject = `MR Travels Error Report - ${this.state.errorId}`;
    const body = `Error ID: ${errorDetails.errorId}\nMessage: ${errorDetails.message}\nTime: ${errorDetails.timestamp}\n\nPlease describe what you were doing when this error occurred:\n\n`;
    const mailtoLink = `mailto:support@mrtravels.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    window.open(mailtoLink);
  };

  getErrorType = (error) => {
    if (error?.message?.includes('NetworkError') || error?.message?.includes('fetch')) {
      return 'network';
    }
    if (error?.message?.includes('pricing') || error?.message?.includes('calculation')) {
      return 'pricing';
    }
    if (error?.message?.includes('booking') || error?.message?.includes('reservation')) {
      return 'booking';
    }
    return 'general';
  };

  getErrorMessage = (errorType) => {
    switch (errorType) {
      case 'network':
        return 'Unable to connect to server. Please check your internet connection.';
      case 'pricing':
        return 'Error calculating pricing. Using fallback rates.';
      case 'booking':
        return 'Booking operation failed. Your data is safe.';
      default:
        return 'An unexpected error occurred. Our team has been notified.';
    }
  };

  getErrorIcon = (errorType) => {
    switch (errorType) {
      case 'network':
        return '🌐';
      case 'pricing':
        return '💰';
      case 'booking':
        return '📋';
      default:
        return '⚠️';
    }
  };

  render() {
    if (this.state.hasError) {
      const errorType = this.getErrorType(this.state.error);
      const errorMessage = this.getErrorMessage(errorType);
      const errorIcon = this.getErrorIcon(errorType);

      // Custom fallback UI can be provided via props
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleRetry);
      }

      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-6">
          <div className="max-w-lg w-full">
            {/* Error Card */}
            <div className="bg-gray-800/90 border border-red-500/30 rounded-xl p-8 text-center backdrop-blur-sm">
              {/* Error Icon */}
              <div className="text-6xl mb-4">{errorIcon}</div>
              
              {/* Error Title */}
              <h1 className="text-2xl font-bold text-white mb-3">
                Oops! Something went wrong
              </h1>
              
              {/* Error Message */}
              <p className="text-gray-300 mb-6 leading-relaxed">
                {errorMessage}
              </p>

              {/* Error ID */}
              <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-3 mb-6">
                <div className="text-xs text-gray-400 mb-1">Error ID</div>
                <div className="font-mono text-sm text-gray-200">{this.state.errorId}</div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {/* Retry Button */}
                <button
                  onClick={this.handleRetry}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-3"
                  disabled={this.state.retryCount >= 3}
                >
                  <RefreshCw className="w-4 h-4" />
                  {this.state.retryCount >= 3 ? 'Max retries reached' : 'Try Again'}
                </button>

                {/* Go Home Button */}
                <button
                  onClick={this.handleGoHome}
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-3"
                >
                  <Home className="w-4 h-4" />
                  Go to Dashboard
                </button>

                {/* Report Error Button */}
                <button
                  onClick={this.handleReportError}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-3"
                >
                  <Bug className="w-4 h-4" />
                  Report Error
                </button>
              </div>

              {/* Additional Info */}
              <div className="mt-6 text-xs text-gray-500">
                <p>This error has been automatically logged.</p>
                <p>If the problem persists, please report it using the button above.</p>
              </div>
            </div>

            {/* Development Info */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mt-6 bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                <div className="text-red-400 font-semibold mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Development Info
                </div>
                <div className="text-xs text-red-200 font-mono break-all">
                  <div className="mb-2">
                    <strong>Error:</strong> {this.state.error.message}
                  </div>
                  <div className="mb-2">
                    <strong>Stack:</strong>
                    <pre className="mt-1 text-xs overflow-auto max-h-32 bg-red-900/30 p-2 rounded">
                      {this.state.error.stack}
                    </pre>
                  </div>
                  {this.state.errorInfo?.componentStack && (
                    <div>
                      <strong>Component Stack:</strong>
                      <pre className="mt-1 text-xs overflow-auto max-h-32 bg-red-900/30 p-2 rounded">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-Order Component for wrapping components with error boundary
 */
export function withErrorBoundary(Component, fallback) {
  return function WrappedComponent(props) {
    return (
      <BusinessErrorBoundary fallback={fallback}>
        <Component {...props} />
      </BusinessErrorBoundary>
    );
  };
}

/**
 * Hook for handling errors in functional components
 */
export function useErrorHandler() {
  const [error, setError] = React.useState(null);

  const handleError = React.useCallback((error) => {
    console.error('useErrorHandler caught error:', error);
    setError(error);
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  // Throw error to be caught by error boundary
  if (error) {
    throw error;
  }

  return { handleError, clearError };
}

/**
 * Simple Error Fallback Component
 */
export function SimpleErrorFallback({ error, retry }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 my-4">
      <div className="flex items-center gap-3">
        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-red-800 font-semibold">Something went wrong</h3>
          <p className="text-red-600 text-sm mt-1">
            {error?.message || 'An unexpected error occurred'}
          </p>
        </div>
        {retry && (
          <button
            onClick={retry}
            className="bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded text-sm font-medium transition-colors"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}

export default BusinessErrorBoundary;