'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { PreviewFrameProps } from './types';

const PreviewFrame: React.FC<PreviewFrameProps> = ({
  url,
  loading = false,
  error,
  onLoad,
  onError
}) => {
  const [isLoading, setIsLoading] = useState(loading);
  const [currentError, setCurrentError] = useState<string | null>(error || null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    setCurrentError(error || null);
  }, [error]);

  useEffect(() => {
    setIsLoading(loading);
  }, [loading]);

  const handleIframeLoad = useCallback(() => {
    setIsLoading(false);
    setCurrentError(null);
    setIsRefreshing(false);
    onLoad?.();
  }, [onLoad]);

  const handleIframeError = useCallback(() => {
    setIsLoading(false);
    setIsRefreshing(false);
    const errorMessage = 'Failed to load preview';
    setCurrentError(errorMessage);
    onError?.(errorMessage);
  }, [onError]);

  const handleRefresh = useCallback(() => {
    if (iframeRef.current && url) {
      setIsRefreshing(true);
      setCurrentError(null);
      setIsLoading(true);
      
      // Force reload the iframe
      iframeRef.current.src = url + '?t=' + Date.now();
    }
  }, [url]);

  const handleOpenInNewTab = useCallback(() => {
    if (url) {
      window.open(url, '_blank');
    }
  }, [url]);

  // Auto-refresh when URL changes
  useEffect(() => {
    if (url && iframeRef.current) {
      setIsLoading(true);
      setCurrentError(null);
      iframeRef.current.src = url;
    }
  }, [url]);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Preview Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <h3 className="text-sm font-semibold text-gray-700">Live Preview</h3>
          {(isLoading || isRefreshing) && (
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-gray-500">
                {isRefreshing ? 'Refreshing...' : 'Loading...'}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* URL Display */}
          {url && (
            <div className="flex items-center space-x-2 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              <span className="truncate max-w-48">{url}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center space-x-1">
            <button
              onClick={handleRefresh}
              disabled={!url || isRefreshing}
              className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh preview"
            >
              <RefreshIcon className="w-4 h-4" />
            </button>

            <button
              onClick={handleOpenInNewTab}
              disabled={!url}
              className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              title="Open in new tab"
            >
              <ExternalLinkIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Preview Content */}
      <div className="flex-1 relative">
        {currentError ? (
          <div className="flex items-center justify-center h-full bg-gray-50">
            <div className="text-center p-8">
              <div className="w-16 h-16 mx-auto mb-4 text-red-400">
                <ErrorIcon className="w-full h-full" />
              </div>
              <h4 className="text-lg font-semibold text-gray-700 mb-2">Preview Error</h4>
              <p className="text-sm text-gray-500 mb-4">{currentError}</p>
              <button
                onClick={handleRefresh}
                className="px-4 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : !url ? (
          <div className="flex items-center justify-center h-full bg-gray-50">
            <div className="text-center p-8">
              <div className="w-16 h-16 mx-auto mb-4 text-gray-400">
                <PreviewIcon className="w-full h-full" />
              </div>
              <h4 className="text-lg font-semibold text-gray-700 mb-2">No Preview Available</h4>
              <p className="text-sm text-gray-500">
                Start the conversion process to see a live preview of your application
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Loading Overlay */}
            {(isLoading || isRefreshing) && (
              <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
                <div className="text-center">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    {isRefreshing ? 'Refreshing preview...' : 'Loading preview...'}
                  </p>
                </div>
              </div>
            )}

            {/* Preview Iframe */}
            <iframe
              ref={iframeRef}
              src={url}
              className="w-full h-full border-0"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
              title="Live Preview"
            />
          </>
        )}
      </div>
    </div>
  );
};

// Icon Components
const RefreshIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const ExternalLinkIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);

const ErrorIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const PreviewIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

export default PreviewFrame;