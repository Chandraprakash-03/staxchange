'use client';

import React, { useState, useCallback } from 'react';
import { TechStack, Project } from '@/types';
import { TechStackSelector } from './TechStackSelector';
import { CompatibilityIssue } from './CompatibilityValidator';
import { ComplexityEstimate } from './ComplexityEstimator';

interface TechStackSelectionContainerProps {
  project: Project;
  onContinue: (targetStack: TechStack) => void;
  onBack: () => void;
}

export function TechStackSelectionContainer({
  project,
  onContinue,
  onBack
}: TechStackSelectionContainerProps) {
  const [targetStack, setTargetStack] = useState<Partial<TechStack>>({});
  const [compatibilityIssues, setCompatibilityIssues] = useState<CompatibilityIssue[]>([]);
  const [complexityEstimate, setComplexityEstimate] = useState<ComplexityEstimate | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSelectionChange = useCallback((newTargetStack: Partial<TechStack>) => {
    setTargetStack(newTargetStack);
  }, []);

  const handleValidationChange = useCallback((issues: CompatibilityIssue[]) => {
    setCompatibilityIssues(issues);
  }, []);

  const handleComplexityChange = useCallback((estimate: ComplexityEstimate) => {
    setComplexityEstimate(estimate);
  }, []);

  const canContinue = () => {
    // Must have at least a language selected
    if (!targetStack.language) return false;
    
    // Cannot have any error-level compatibility issues
    const hasErrors = compatibilityIssues.some(issue => issue.type === 'error');
    if (hasErrors) return false;
    
    return true;
  };

  const handleContinue = async () => {
    if (!canContinue()) return;
    
    setIsLoading(true);
    
    try {
      // Create complete tech stack with defaults
      const completeTargetStack: TechStack = {
        language: targetStack.language!,
        framework: targetStack.framework,
        database: targetStack.database,
        runtime: targetStack.runtime,
        buildTool: targetStack.buildTool,
        packageManager: targetStack.packageManager,
        deployment: targetStack.deployment,
        additional: {}
      };
      
      onContinue(completeTargetStack);
    } catch (error) {
      console.error('Error proceeding with conversion:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getProjectSize = () => {
    // Calculate project size from file structure if available
    if (!project.fileStructure) return undefined;
    
    const calculateSize = (node: any): number => {
      if (node.type === 'file' && node.metadata?.size) {
        return node.metadata.size;
      }
      if (node.children) {
        return node.children.reduce((total: number, child: any) => total + calculateSize(child), 0);
      }
      return 0;
    };
    
    return calculateSize(project.fileStructure);
  };

  const hasWarnings = compatibilityIssues.some(issue => issue.type === 'warning');
  const hasErrors = compatibilityIssues.some(issue => issue.type === 'error');

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Select Target Technology Stack
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Choose the technologies you want to convert your project to. 
          We'll analyze compatibility and estimate the conversion complexity.
        </p>
      </div>

      {/* Project Info */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Project: {project.name}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <span className="text-sm font-medium text-gray-500">Repository:</span>
            <p className="text-sm text-gray-900 truncate">{project.githubUrl}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-500">Status:</span>
            <p className="text-sm text-gray-900 capitalize">{project.status}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-500">Size:</span>
            <p className="text-sm text-gray-900">
              {getProjectSize() ? `${(getProjectSize()! / 1024).toFixed(1)} KB` : 'Unknown'}
            </p>
          </div>
        </div>
      </div>

      {/* Tech Stack Selector */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <TechStackSelector
          currentStack={project.originalTechStack}
          onSelectionChange={handleSelectionChange}
          onValidationChange={handleValidationChange}
          onComplexityChange={handleComplexityChange}
          projectSize={getProjectSize()}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
        >
          ← Back to Import
        </button>

        <div className="flex flex-col sm:flex-row gap-3">
          {/* Status indicator */}
          <div className="flex items-center space-x-2 text-sm">
            {hasErrors && (
              <span className="flex items-center text-red-600">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                Compatibility errors
              </span>
            )}
            {!hasErrors && hasWarnings && (
              <span className="flex items-center text-yellow-600">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Warnings present
              </span>
            )}
            {!hasErrors && !hasWarnings && targetStack.language && (
              <span className="flex items-center text-green-600">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Ready to convert
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleContinue}
            disabled={!canContinue() || isLoading}
            className={`
              px-6 py-3 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2
              ${canContinue() && !isLoading
                ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            {isLoading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Processing...
              </span>
            ) : (
              'Continue to Conversion →'
            )}
          </button>
        </div>
      </div>

      {/* Help Section */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-3">Need Help Choosing?</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Popular Combinations:</h4>
            <ul className="space-y-1">
              <li>• JavaScript + React + PostgreSQL</li>
              <li>• TypeScript + Next.js + MongoDB</li>
              <li>• Python + Django + PostgreSQL</li>
              <li>• Java + Spring Boot + MySQL</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Tips:</h4>
            <ul className="space-y-1">
              <li>• Start with language selection first</li>
              <li>• Consider your deployment target</li>
              <li>• Review compatibility warnings carefully</li>
              <li>• Complex conversions may take longer</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}