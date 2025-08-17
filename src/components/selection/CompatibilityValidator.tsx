'use client';

import React from 'react';
import { TechStack } from '@/types';

export interface CompatibilityIssue {
  type: 'error' | 'warning' | 'info';
  message: string;
  suggestion?: string;
  affectedTechnologies: string[];
}

interface CompatibilityValidatorProps {
  currentStack: TechStack;
  targetStack: Partial<TechStack>;
  issues: CompatibilityIssue[];
  onDismissIssue?: (index: number) => void;
}

export function CompatibilityValidator({
  currentStack,
  targetStack,
  issues,
  onDismissIssue
}: CompatibilityValidatorProps) {
  const getIssueIcon = (type: CompatibilityIssue['type']) => {
    switch (type) {
      case 'error':
        return (
          <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'info':
        return (
          <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  const getIssueStyles = (type: CompatibilityIssue['type']) => {
    switch (type) {
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  if (issues.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="text-sm font-medium text-green-800">
            No compatibility issues detected
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-gray-900">
        Compatibility Analysis ({issues.length} issue{issues.length !== 1 ? 's' : ''})
      </h4>
      
      {issues.map((issue, index) => (
        <div
          key={index}
          className={`border rounded-lg p-4 ${getIssueStyles(issue.type)}`}
        >
          <div className="flex items-start">
            <div className="flex-shrink-0 mr-3">
              {getIssueIcon(issue.type)}
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">
                {issue.message}
              </p>
              
              {issue.suggestion && (
                <p className="text-sm mt-1 opacity-90">
                  <strong>Suggestion:</strong> {issue.suggestion}
                </p>
              )}
              
              {issue.affectedTechnologies.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-medium mb-1">Affected technologies:</p>
                  <div className="flex flex-wrap gap-1">
                    {issue.affectedTechnologies.map((tech, techIndex) => (
                      <span
                        key={techIndex}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-white bg-opacity-50"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {onDismissIssue && (
              <button
                type="button"
                onClick={() => onDismissIssue(index)}
                className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}