'use client';

import React from 'react';
import { TechStack } from '@/types';

export interface ComplexityEstimate {
  overall: 'low' | 'medium' | 'high';
  estimatedDuration: number; // in hours
  factors: ComplexityFactor[];
  breakdown: ComplexityBreakdown;
}

export interface ComplexityFactor {
  category: string;
  impact: 'low' | 'medium' | 'high';
  description: string;
  timeImpact: number; // in hours
}

export interface ComplexityBreakdown {
  codeConversion: number;
  dependencyMigration: number;
  configurationChanges: number;
  testing: number;
  integration: number;
}

interface ComplexityEstimatorProps {
  currentStack: TechStack;
  targetStack: Partial<TechStack>;
  estimate: ComplexityEstimate;
  projectSize?: number; // in KB
}

export function ComplexityEstimator({
  currentStack,
  targetStack,
  estimate,
  projectSize
}: ComplexityEstimatorProps) {
  const getComplexityColor = (complexity: 'low' | 'medium' | 'high') => {
    switch (complexity) {
      case 'low':
        return 'text-green-600 bg-green-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'high':
        return 'text-red-600 bg-red-100';
    }
  };

  const getComplexityIcon = (complexity: 'low' | 'medium' | 'high') => {
    switch (complexity) {
      case 'low':
        return '🟢';
      case 'medium':
        return '🟡';
      case 'high':
        return '🔴';
    }
  };

  const formatDuration = (hours: number) => {
    if (hours < 1) {
      return `${Math.round(hours * 60)} minutes`;
    } else if (hours < 24) {
      return `${Math.round(hours * 10) / 10} hours`;
    } else {
      const days = Math.floor(hours / 24);
      const remainingHours = Math.round((hours % 24) * 10) / 10;
      return `${days} day${days !== 1 ? 's' : ''}${remainingHours > 0 ? ` ${remainingHours} hours` : ''}`;
    }
  };

  const getImpactIcon = (impact: 'low' | 'medium' | 'high') => {
    switch (impact) {
      case 'low':
        return (
          <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'medium':
        return (
          <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'high':
        return (
          <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  const totalBreakdownTime = Object.values(estimate.breakdown).reduce((sum, time) => sum + time, 0);

  return (
    <div className="space-y-6">
      {/* Overall Complexity */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Conversion Complexity</h3>
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getComplexityColor(estimate.overall)}`}>
            <span className="mr-1">{getComplexityIcon(estimate.overall)}</span>
            {estimate.overall.charAt(0).toUpperCase() + estimate.overall.slice(1)}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">Estimated Duration</h4>
            <p className="text-2xl font-bold text-gray-900">{formatDuration(estimate.estimatedDuration)}</p>
            {projectSize && (
              <p className="text-sm text-gray-500 mt-1">
                Based on project size: {(projectSize / 1024).toFixed(1)} KB
              </p>
            )}
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">Conversion Path</h4>
            <div className="flex items-center space-x-2 text-sm">
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                {currentStack.language}
                {currentStack.framework && ` + ${currentStack.framework}`}
              </span>
              <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded">
                {targetStack.language}
                {targetStack.framework && ` + ${targetStack.framework}`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Complexity Factors */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Complexity Factors</h4>
        
        <div className="space-y-3">
          {estimate.factors.map((factor, index) => (
            <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-md">
              <div className="flex-shrink-0 mt-0.5">
                {getImpactIcon(factor.impact)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h5 className="text-sm font-medium text-gray-900">{factor.category}</h5>
                  <span className="text-xs text-gray-500">+{formatDuration(factor.timeImpact)}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{factor.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Time Breakdown */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Time Breakdown</h4>
        
        <div className="space-y-4">
          {Object.entries(estimate.breakdown).map(([category, time]) => {
            const percentage = totalBreakdownTime > 0 ? (time / totalBreakdownTime) * 100 : 0;
            const categoryLabel = category.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
            
            return (
              <div key={category}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900">{categoryLabel}</span>
                  <span className="text-sm text-gray-500">{formatDuration(time)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="text-xs text-gray-500 mt-1">{percentage.toFixed(1)}% of total time</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-blue-400 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div>
            <h3 className="text-sm font-medium text-blue-800">Recommendations</h3>
            <div className="text-sm text-blue-700 mt-1">
              {estimate.overall === 'high' && (
                <p>This is a complex conversion. Consider breaking it into smaller phases or reviewing alternative target technologies.</p>
              )}
              {estimate.overall === 'medium' && (
                <p>This conversion has moderate complexity. Review the compatibility issues and plan for adequate testing time.</p>
              )}
              {estimate.overall === 'low' && (
                <p>This conversion should be straightforward. The AI agents can handle most of the work automatically.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}