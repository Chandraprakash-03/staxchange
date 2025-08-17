'use client';

import React from 'react';
import { TechStackSelector } from '@/components/selection/TechStackSelector';
import { TechStack } from '@/types';

const testCurrentStack: TechStack = {
  language: 'javascript',
  framework: 'react',
  database: 'postgresql',
  runtime: 'node',
  buildTool: 'webpack',
  packageManager: 'npm',
  deployment: 'vercel',
  additional: {}
};

export default function TestSelectorPage() {
  const handleSelectionChange = (targetStack: Partial<TechStack>) => {
    console.log('Selection changed:', targetStack);
  };

  const handleValidationChange = (issues: any[]) => {
    console.log('Validation changed:', issues);
  };

  const handleComplexityChange = (estimate: any) => {
    console.log('Complexity changed:', estimate);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              🧪 Tech Stack Selector Test
            </h1>
            <p className="text-gray-600">
              This page tests the TechStackSelector component to ensure there are no infinite loops.
              Check the browser console for any errors.
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <TechStackSelector
              currentStack={testCurrentStack}
              onSelectionChange={handleSelectionChange}
              onValidationChange={handleValidationChange}
              onComplexityChange={handleComplexityChange}
              projectSize={100 * 1024}
            />
          </div>
        </div>
      </div>
    </div>
  );
}