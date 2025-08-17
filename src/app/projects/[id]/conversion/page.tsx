'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ConversionProgressMonitor } from '@/components/conversion';
import { Project, ConversionJob, ApiResponse } from '@/types';

export default function ConversionPage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params.id as string;
    
    const [project, setProject] = useState<Project | null>(null);
    const [conversionJob, setConversionJob] = useState<ConversionJob | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch project and start conversion
    useEffect(() => {
        const initializeConversion = async () => {
            try {
                setLoading(true);
                setError(null);

                // Fetch project data
                const projectResponse = await fetch(`/api/projects/${projectId}`);
                const projectResult: ApiResponse<Project> = await projectResponse.json();

                if (!projectResult.success || !projectResult.data) {
                    throw new Error(projectResult.error || 'Project not found');
                }

                setProject(projectResult.data);

                // Check if conversion job already exists
                const jobResponse = await fetch(`/api/projects/${projectId}/conversion`);
                const jobResult: ApiResponse<ConversionJob> = await jobResponse.json();

                if (jobResult.success && jobResult.data) {
                    setConversionJob(jobResult.data);
                } else {
                    // Start new conversion job
                    const startResponse = await fetch(`/api/projects/${projectId}/conversion`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    });

                    const startResult: ApiResponse<ConversionJob> = await startResponse.json();

                    if (!startResult.success || !startResult.data) {
                        throw new Error(startResult.error || 'Failed to start conversion');
                    }

                    setConversionJob(startResult.data);
                }
            } catch (err) {
                console.error('Error initializing conversion:', err);
                setError(err instanceof Error ? err.message : 'Failed to initialize conversion');
            } finally {
                setLoading(false);
            }
        };

        if (projectId) {
            initializeConversion();
        }
    }, [projectId]);

    const handleBack = () => {
        router.push(`/projects/${projectId}/convert`);
    };

    const handleComplete = () => {
        router.push(`/projects/${projectId}/preview`);
    };

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 py-8">
                <div className="container mx-auto px-4">
                    <div className="max-w-6xl mx-auto">
                        <div className="bg-white border border-gray-200 rounded-lg p-8">
                            <div className="flex items-center justify-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                <span className="ml-3 text-gray-600">Initializing conversion...</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 py-8">
                <div className="container mx-auto px-4">
                    <div className="max-w-6xl mx-auto">
                        <div className="bg-red-50 border border-red-200 rounded-lg p-8">
                            <div className="flex items-center">
                                <svg className="w-6 h-6 text-red-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                <div>
                                    <h3 className="text-lg font-medium text-red-800">Conversion Error</h3>
                                    <p className="text-red-700 mt-1">{error}</p>
                                </div>
                            </div>
                            <div className="mt-4">
                                <button
                                    onClick={handleBack}
                                    className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors mr-3"
                                >
                                    Back to Selection
                                </button>
                                <button
                                    onClick={() => window.location.reload()}
                                    className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
                                >
                                    Retry
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Main content
    if (!project || !conversionJob) {
        return (
            <div className="min-h-screen bg-gray-50 py-8">
                <div className="container mx-auto px-4">
                    <div className="max-w-6xl mx-auto">
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8">
                            <div className="flex items-center">
                                <svg className="w-6 h-6 text-yellow-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                <div>
                                    <h3 className="text-lg font-medium text-yellow-800">Missing Data</h3>
                                    <p className="text-yellow-700 mt-1">Project or conversion job data is missing.</p>
                                </div>
                            </div>
                            <div className="mt-4">
                                <button
                                    onClick={handleBack}
                                    className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 transition-colors"
                                >
                                    Back to Selection
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="container mx-auto px-4">
                <div className="max-w-6xl mx-auto">
                    <ConversionProgressMonitor
                        project={project}
                        conversionJob={conversionJob}
                        onBack={handleBack}
                        onComplete={handleComplete}
                    />
                </div>
            </div>
        </div>
    );
}