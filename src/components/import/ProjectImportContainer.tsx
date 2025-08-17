'use client';

import React, { useState } from 'react';
import { GitHubUrlInput, ImportProgress, TechStackDisplay } from './index';
import { ImportResult, TechStack } from '@/types';

type ImportStep = 'input' | 'importing' | 'results';

export function ProjectImportContainer() {
    const [currentStep, setCurrentStep] = useState<ImportStep>('input');
    const [importResult, setImportResult] = useState<ImportResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleImportStart = async (url: string, accessToken?: string) => {
        setCurrentStep('importing');
        setError(null);

        try {
            const response = await fetch('/api/projects/import', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url, accessToken }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Import failed');
            }

            setImportResult(result.data);
            setCurrentStep('results');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
            setCurrentStep('input');
        }
    };

    const handleStartOver = () => {
        setCurrentStep('input');
        setImportResult(null);
        setError(null);
    };

    return (
        <div className="bg-white rounded-lg shadow-lg p-6">
            {currentStep === 'input' && (
                <GitHubUrlInput
                    onImportStart={handleImportStart}
                    error={error}
                />
            )}

            {currentStep === 'importing' && (
                <ImportProgress />
            )}

            {currentStep === 'results' && importResult && (
                <TechStackDisplay
                    importResult={importResult}
                    onStartOver={handleStartOver}
                />
            )}
        </div>
    );
}