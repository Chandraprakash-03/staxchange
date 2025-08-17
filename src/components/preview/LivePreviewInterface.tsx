'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { LivePreviewProps } from './types';
import { FileChange } from '../../types';
import SplitPaneLayout from './SplitPaneLayout';
import CodeEditor from './CodeEditor';
import PreviewFrame from './PreviewFrame';

const LivePreviewInterface: React.FC<LivePreviewProps> = ({
  projectId,
  files,
  previewEnvironment,
  onFileChange,
  onPreviewUpdate
}) => {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [pendingChanges, setPendingChanges] = useState<Map<string, string>>(new Map());
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [splitPosition, setSplitPosition] = useState(50);
  
  // Debounce timer for file changes
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const DEBOUNCE_DELAY = 1000; // 1 second

  // Handle file selection in editor
  const handleFileSelect = useCallback((filePath: string) => {
    setSelectedFile(filePath);
  }, []);

  // Handle file content changes with debouncing
  const handleFileChange = useCallback((filePath: string, content: string) => {
    // Update pending changes immediately for UI responsiveness
    setPendingChanges(prev => new Map(prev).set(filePath, content));

    // Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new debounce timer
    debounceTimerRef.current = setTimeout(() => {
      const changes: FileChange[] = [{
        path: filePath,
        type: 'update',
        content: content
      }];

      onFileChange?.(changes);
    }, DEBOUNCE_DELAY);
  }, [onFileChange]);

  // Handle preview frame loading
  const handlePreviewLoad = useCallback(() => {
    setIsPreviewLoading(false);
    setPreviewError(null);
  }, []);

  // Handle preview frame errors
  const handlePreviewError = useCallback((error: string) => {
    setIsPreviewLoading(false);
    setPreviewError(error);
  }, []);

  // Handle split pane resize
  const handleSplitChange = useCallback((size: number) => {
    setSplitPosition(size);
  }, []);

  // Update preview URL when environment changes
  useEffect(() => {
    if (previewEnvironment?.url) {
      setIsPreviewLoading(true);
      setPreviewError(null);
      onPreviewUpdate?.(previewEnvironment.url);
    }
  }, [previewEnvironment?.url, onPreviewUpdate]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Create merged files with pending changes for editor
  const mergedFiles = React.useMemo(() => {
    if (pendingChanges.size === 0) return files;

    const updateFileContent = (tree: typeof files): typeof files => {
      if (tree.type === 'file') {
        const pendingContent = pendingChanges.get(tree.path);
        return pendingContent !== undefined 
          ? { ...tree, content: pendingContent }
          : tree;
      } else if (tree.children) {
        return {
          ...tree,
          children: tree.children.map(updateFileContent)
        };
      }
      return tree;
    };

    return updateFileContent(files);
  }, [files, pendingChanges]);

  const leftPane = (
    <div className="h-full">
      <CodeEditor
        files={mergedFiles}
        selectedFile={selectedFile || ''}
        onFileSelect={handleFileSelect}
        onFileChange={handleFileChange}
        readOnly={false}
      />
    </div>
  );

  const rightPane = (
    <div className="h-full">
      <PreviewFrame
        url={previewEnvironment?.url}
        loading={isPreviewLoading || previewEnvironment?.status === 'initializing'}
        error={previewError || (previewEnvironment?.status === 'error' ? 'Preview environment error' : undefined)}
        onLoad={handlePreviewLoad}
        onError={handlePreviewError}
      />
    </div>
  );

  return (
    <div className="h-full w-full bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Live Preview</h2>
            <p className="text-sm text-gray-600 mt-1">
              Edit your code and see changes in real-time
            </p>
          </div>

          <div className="flex items-center space-x-4">
            {/* Preview Status */}
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${getStatusColor(previewEnvironment?.status)}`} />
              <span className="text-sm text-gray-600">
                {getStatusText(previewEnvironment?.status)}
              </span>
            </div>

            {/* Pending Changes Indicator */}
            {pendingChanges.size > 0 && (
              <div className="flex items-center space-x-2 text-sm text-orange-600">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                <span>{pendingChanges.size} unsaved change{pendingChanges.size !== 1 ? 's' : ''}</span>
              </div>
            )}

            {/* Layout Controls */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setSplitPosition(25)}
                className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
                title="Focus on preview"
              >
                Preview
              </button>
              <button
                onClick={() => setSplitPosition(50)}
                className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
                title="Split view"
              >
                Split
              </button>
              <button
                onClick={() => setSplitPosition(75)}
                className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
                title="Focus on code"
              >
                Code
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="h-[calc(100%-80px)]">
        <SplitPaneLayout
          leftPane={leftPane}
          rightPane={rightPane}
          defaultSplit={splitPosition}
          minSize={20}
          maxSize={80}
          split="vertical"
          onSplitChange={handleSplitChange}
        />
      </div>
    </div>
  );
};

// Helper functions
function getStatusColor(status?: string): string {
  switch (status) {
    case 'ready':
      return 'bg-green-500';
    case 'initializing':
      return 'bg-yellow-500';
    case 'error':
      return 'bg-red-500';
    case 'stopped':
      return 'bg-gray-500';
    default:
      return 'bg-gray-400';
  }
}

function getStatusText(status?: string): string {
  switch (status) {
    case 'ready':
      return 'Ready';
    case 'initializing':
      return 'Starting...';
    case 'error':
      return 'Error';
    case 'stopped':
      return 'Stopped';
    default:
      return 'Not Available';
  }
}

export default LivePreviewInterface;