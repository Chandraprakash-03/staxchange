'use client';

import React, { useState } from 'react';
import { ImportResult, TechStack } from '@/types';

interface TechStackDisplayProps {
  importResult: ImportResult;
  onStartOver: () => void;
}

export function TechStackDisplay({ importResult, onStartOver }: TechStackDisplayProps) {
  const [showFileStructure, setShowFileStructure] = useState(false);

  const formatTechStackValue = (value: string | undefined) => {
    if (!value) return 'Not detected';
    return value.charAt(0).toUpperCase() + value.slice(1);
  };

  const getTechStackIcon = (category: string, value?: string) => {
    const iconClass = "w-5 h-5";
    
    switch (category) {
      case 'language':
        return <span className={`${iconClass} text-blue-600`}>💻</span>;
      case 'framework':
        return <span className={`${iconClass} text-green-600`}>🚀</span>;
      case 'database':
        return <span className={`${iconClass} text-purple-600`}>🗄️</span>;
      case 'runtime':
        return <span className={`${iconClass} text-orange-600`}>⚡</span>;
      case 'buildTool':
        return <span className={`${iconClass} text-red-600`}>🔧</span>;
      case 'packageManager':
        return <span className={`${iconClass} text-yellow-600`}>📦</span>;
      case 'deployment':
        return <span className={`${iconClass} text-indigo-600`}>🚀</span>;
      default:
        return <span className={`${iconClass} text-gray-600`}>🔍</span>;
    }
  };

  const renderFileTree = (tree: any, depth = 0) => {
    if (!tree) return null;

    const indent = depth * 20;
    
    return (
      <div key={tree.path} style={{ marginLeft: `${indent}px` }}>
        <div className="flex items-center py-1">
          {tree.type === 'directory' ? (
            <svg className="w-4 h-4 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-gray-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
            </svg>
          )}
          <span className="text-sm text-gray-700">{tree.name}</span>
          {tree.type === 'file' && tree.metadata?.size && (
            <span className="text-xs text-gray-500 ml-2">
              ({(tree.metadata.size / 1024).toFixed(1)} KB)
            </span>
          )}
        </div>
        {tree.children && tree.children.slice(0, 10).map((child: any) => 
          renderFileTree(child, depth + 1)
        )}
        {tree.children && tree.children.length > 10 && (
          <div style={{ marginLeft: `${(depth + 1) * 20}px` }} className="text-xs text-gray-500 py-1">
            ... and {tree.children.length - 10} more files
          </div>
        )}
      </div>
    );
  };

  const techStackEntries = [
    { key: 'language', label: 'Programming Language', value: importResult.detectedTechnologies.language },
    { key: 'framework', label: 'Framework', value: importResult.detectedTechnologies.framework },
    { key: 'runtime', label: 'Runtime', value: importResult.detectedTechnologies.runtime },
    { key: 'database', label: 'Database', value: importResult.detectedTechnologies.database },
    { key: 'buildTool', label: 'Build Tool', value: importResult.detectedTechnologies.buildTool },
    { key: 'packageManager', label: 'Package Manager', value: importResult.detectedTechnologies.packageManager },
    { key: 'deployment', label: 'Deployment', value: importResult.detectedTechnologies.deployment },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="flex items-center justify-center mb-4">
          <svg className="w-12 h-12 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Import Successful!
        </h2>
        <p className="text-gray-600">
          We've analyzed your repository and detected the following technology stack
        </p>
      </div>

      {/* Project Info */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-lg font-medium text-gray-900 mb-3">Project Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className="text-sm font-medium text-gray-500">Project ID:</span>
            <p className="text-sm text-gray-900 font-mono">{importResult.projectId}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-500">Repository Size:</span>
            <p className="text-sm text-gray-900">{(importResult.size / 1024).toFixed(1)} KB</p>
          </div>
        </div>
      </div>

      {/* Detected Tech Stack */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Detected Technology Stack</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {techStackEntries.map(({ key, label, value }) => (
            <div key={key} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-md">
              {getTechStackIcon(key, value)}
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{label}</p>
                <p className="text-sm text-gray-600">{formatTechStackValue(value)}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Additional Technologies */}
        {Object.keys(importResult.detectedTechnologies.additional).length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Additional Technologies</h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(importResult.detectedTechnologies.additional).map(([key, value]) => (
                <span key={key} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {key}: {value}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* File Structure Preview */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Project Structure</h3>
          <button
            onClick={() => setShowFileStructure(!showFileStructure)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {showFileStructure ? 'Hide' : 'Show'} Files
          </button>
        </div>
        
        {showFileStructure && (
          <div className="bg-gray-50 rounded-md p-4 max-h-64 overflow-y-auto">
            <div className="font-mono text-sm">
              {renderFileTree(importResult.structure)}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          onClick={() => {
            // Navigate to tech stack selection
            window.location.href = `/projects/${importResult.projectId}/convert`;
          }}
        >
          Continue to Tech Stack Selection
        </button>
        
        <button
          type="button"
          onClick={onStartOver}
          className="flex-1 bg-gray-200 text-gray-900 py-2 px-4 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
        >
          Import Another Project
        </button>
      </div>

      {/* Help Text */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <div className="flex">
          <svg className="w-5 h-5 text-blue-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div>
            <h3 className="text-sm font-medium text-blue-800">Next Steps</h3>
            <div className="text-sm text-blue-700 mt-1">
              <p>Now that we've analyzed your project, you can:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Select your target technology stack</li>
                <li>Review the conversion plan</li>
                <li>Start the AI-powered conversion process</li>
                <li>Preview your converted project live</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}