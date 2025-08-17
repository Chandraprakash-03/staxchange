'use client';

import React, { useState, useEffect } from 'react';

interface ProgressStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  description?: string;
}

export function ImportProgress() {
  const [steps, setSteps] = useState<ProgressStep[]>([
    {
      id: 'validate',
      label: 'Validating Repository',
      status: 'active',
      description: 'Checking repository accessibility and permissions'
    },
    {
      id: 'clone',
      label: 'Downloading Files',
      status: 'pending',
      description: 'Cloning repository contents'
    },
    {
      id: 'analyze',
      label: 'Analyzing Structure',
      status: 'pending',
      description: 'Examining project files and dependencies'
    },
    {
      id: 'detect',
      label: 'Detecting Tech Stack',
      status: 'pending',
      description: 'Identifying frameworks, languages, and tools'
    },
    {
      id: 'complete',
      label: 'Import Complete',
      status: 'pending',
      description: 'Preparing results for display'
    }
  ]);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStepIndex(prev => {
        if (prev < steps.length - 1) {
          // Update current step to completed and next to active
          setSteps(currentSteps => 
            currentSteps.map((step, index) => {
              if (index < prev + 1) {
                return { ...step, status: 'completed' };
              } else if (index === prev + 1) {
                return { ...step, status: 'active' };
              }
              return step;
            })
          );
          
          // Update progress
          setProgress(((prev + 1) / steps.length) * 100);
          
          return prev + 1;
        }
        return prev;
      });
    }, 2000); // Simulate 2 seconds per step

    return () => clearInterval(interval);
  }, [steps.length]);

  const getStepIcon = (status: ProgressStep['status']) => {
    switch (status) {
      case 'completed':
        return (
          <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'active':
        return (
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        );
      case 'error':
        return (
          <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <div className="w-5 h-5 border-2 border-gray-300 rounded-full"></div>
        );
    }
  };

  const getStepColor = (status: ProgressStep['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'active':
        return 'text-blue-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Importing Your Repository
        </h2>
        <p className="text-gray-600">
          Please wait while we analyze your project...
        </p>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      {/* Progress Steps */}
      <div className="space-y-4">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-1">
              {getStepIcon(step.status)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className={`text-sm font-medium ${getStepColor(step.status)}`}>
                  {step.label}
                </h3>
                {step.status === 'active' && (
                  <span className="text-xs text-blue-600 font-medium">
                    In Progress
                  </span>
                )}
                {step.status === 'completed' && (
                  <span className="text-xs text-green-600 font-medium">
                    Complete
                  </span>
                )}
              </div>
              {step.description && (
                <p className="text-sm text-gray-500 mt-1">
                  {step.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Additional Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <div className="flex">
          <svg className="w-5 h-5 text-blue-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div>
            <h3 className="text-sm font-medium text-blue-800">
              What's happening?
            </h3>
            <div className="text-sm text-blue-700 mt-1 space-y-1">
              <p>• We're securely downloading your repository files</p>
              <p>• Our AI is analyzing your project structure and dependencies</p>
              <p>• We're detecting your current technology stack</p>
              <p>• This process typically takes 30-60 seconds</p>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Button */}
      <div className="text-center">
        <button
          type="button"
          className="text-sm text-gray-500 hover:text-gray-700 underline"
          onClick={() => window.location.reload()}
        >
          Cancel Import
        </button>
      </div>
    </div>
  );
}