'use client';

import React, { useState } from 'react';
import { ValidationResult } from '@/types';

interface GitHubUrlInputProps {
  onImportStart: (url: string, accessToken?: string) => void;
  error?: string | null;
}

export function GitHubUrlInput({ onImportStart, error }: GitHubUrlInputProps) {
  const [url, setUrl] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const validateUrl = async (githubUrl: string): Promise<ValidationResult> => {
    if (!githubUrl.trim()) {
      return {
        isValid: false,
        errors: [{ field: 'url', message: 'GitHub URL is required', code: 'REQUIRED' }],
        warnings: []
      };
    }

    // Basic URL format validation
    const githubUrlPattern = /^https:\/\/github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+(?:\.git)?\/?$/;
    if (!githubUrlPattern.test(githubUrl)) {
      return {
        isValid: false,
        errors: [{ field: 'url', message: 'Invalid GitHub URL format', code: 'INVALID_FORMAT' }],
        warnings: []
      };
    }

    // Validate with backend
    try {
      const response = await fetch('/api/projects/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: githubUrl, accessToken }),
      });

      const result = await response.json();
      return result.data || {
        isValid: false,
        errors: [{ field: 'url', message: 'Validation failed', code: 'VALIDATION_ERROR' }],
        warnings: []
      };
    } catch (err) {
      return {
        isValid: false,
        errors: [{ field: 'url', message: 'Unable to validate repository', code: 'NETWORK_ERROR' }],
        warnings: []
      };
    }
  };

  const handleUrlChange = async (newUrl: string) => {
    setUrl(newUrl);
    setValidation(null);

    if (newUrl.trim()) {
      setIsValidating(true);
      const result = await validateUrl(newUrl);
      setValidation(result);
      setIsValidating(false);

      // Show token input if authentication is required
      if (result.errors.some(e => e.code === 'AUTH_REQUIRED')) {
        setShowTokenInput(true);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validation?.isValid) {
      onImportStart(url, accessToken || undefined);
    }
  };

  const isFormValid = validation?.isValid && !isValidating;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Enter GitHub Repository URL
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="github-url" className="block text-sm font-medium text-gray-700 mb-2">
              Repository URL
            </label>
            <input
              id="github-url"
              type="url"
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="https://github.com/username/repository"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
            
            {isValidating && (
              <div className="mt-2 flex items-center text-sm text-gray-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                Validating repository...
              </div>
            )}

            {validation && !isValidating && (
              <div className="mt-2 space-y-1">
                {validation.errors.map((error, index) => (
                  <div key={index} className="text-sm text-red-600 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {error.message}
                  </div>
                ))}
                
                {validation.warnings.map((warning, index) => (
                  <div key={index} className="text-sm text-yellow-600 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {warning}
                  </div>
                ))}

                {validation.isValid && (
                  <div className="text-sm text-green-600 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Repository is valid and accessible
                  </div>
                )}
              </div>
            )}
          </div>

          {showTokenInput && (
            <div>
              <label htmlFor="access-token" className="block text-sm font-medium text-gray-700 mb-2">
                GitHub Access Token (for private repositories)
              </label>
              <input
                id="access-token"
                type="password"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                Required for private repositories. You can generate a token in your GitHub settings.
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-red-800">Import Failed</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={!isFormValid}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Import Repository
          </button>
        </form>
      </div>

      <div className="border-t pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-3">Supported Repository Types</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-green-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Frontend Projects</p>
              <p className="text-sm text-gray-500">React, Vue, Angular, Svelte, vanilla JS/TS</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-green-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Backend Projects</p>
              <p className="text-sm text-gray-500">Node.js, Python, Java, Go, PHP, Ruby</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-green-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Full-Stack Projects</p>
              <p className="text-sm text-gray-500">Next.js, Nuxt.js, SvelteKit, Django, Rails</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-green-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Mobile Projects</p>
              <p className="text-sm text-gray-500">React Native, Flutter, Ionic</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}