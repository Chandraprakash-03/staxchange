'use client';

import React from 'react';
import { ConversionJob, ConversionTask } from '@/types';

interface ProgressTrackerProps {
    conversionJob: ConversionJob;
}

export function ProgressTracker({ conversionJob }: ProgressTrackerProps) {
    const { plan, progress, status } = conversionJob;
    
    // Calculate task statistics
    const taskStats = plan.tasks.reduce(
        (acc, task) => {
            acc.total++;
            switch (task.status) {
                case 'completed':
                    acc.completed++;
                    break;
                case 'running':
                    acc.running++;
                    break;
                case 'failed':
                    acc.failed++;
                    break;
                default:
                    acc.pending++;
            }
            return acc;
        },
        { total: 0, completed: 0, running: 0, failed: 0, pending: 0 }
    );

    const getProgressBarColor = () => {
        if (status === 'failed') return 'bg-red-500';
        if (status === 'completed') return 'bg-green-500';
        if (status === 'paused') return 'bg-yellow-500';
        return 'bg-blue-500';
    };

    const getProgressBarBg = () => {
        if (status === 'failed') return 'bg-red-100';
        if (status === 'completed') return 'bg-green-100';
        if (status === 'paused') return 'bg-yellow-100';
        return 'bg-blue-100';
    };

    return (
        <div className="space-y-4">
            {/* Main Progress Bar */}
            <div>
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-medium text-gray-900">Overall Progress</h3>
                    <span className="text-sm font-medium text-gray-600">{progress}%</span>
                </div>
                <div className={`w-full ${getProgressBarBg()} rounded-full h-3`}>
                    <div
                        className={`${getProgressBarColor()} h-3 rounded-full transition-all duration-300 ease-out`}
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            {/* Task Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{taskStats.total}</div>
                    <div className="text-sm text-gray-600">Total Tasks</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{taskStats.completed}</div>
                    <div className="text-sm text-gray-600">Completed</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{taskStats.running}</div>
                    <div className="text-sm text-gray-600">Running</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{taskStats.failed}</div>
                    <div className="text-sm text-gray-600">Failed</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold text-gray-600">{taskStats.pending}</div>
                    <div className="text-sm text-gray-600">Pending</div>
                </div>
            </div>

            {/* Task Progress Visualization */}
            <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Task Progress</h4>
                <div className="space-y-2">
                    {plan.tasks.slice(0, 10).map((task, index) => (
                        <div key={task.id} className="flex items-center space-x-3">
                            <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                                {task.status === 'completed' ? (
                                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                ) : task.status === 'running' ? (
                                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                ) : task.status === 'failed' ? (
                                    <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                ) : (
                                    <div className="w-4 h-4 bg-gray-300 rounded-full" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                        {task.description}
                                    </p>
                                    <span className={`text-xs px-2 py-1 rounded-full ${
                                        task.status === 'completed' ? 'bg-green-100 text-green-800' :
                                        task.status === 'running' ? 'bg-blue-100 text-blue-800' :
                                        task.status === 'failed' ? 'bg-red-100 text-red-800' :
                                        'bg-gray-100 text-gray-800'
                                    }`}>
                                        {task.status}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500">
                                    {task.type} • Priority: {task.priority}
                                </p>
                            </div>
                        </div>
                    ))}
                    {plan.tasks.length > 10 && (
                        <div className="text-center py-2">
                            <span className="text-sm text-gray-500">
                                ... and {plan.tasks.length - 10} more tasks
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Conversion Plan Info */}
            <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Conversion Plan Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                        <span className="text-gray-600">Complexity:</span>
                        <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                            plan.complexity === 'high' ? 'bg-red-100 text-red-800' :
                            plan.complexity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                        }`}>
                            {plan.complexity}
                        </span>
                    </div>
                    <div>
                        <span className="text-gray-600">Estimated Duration:</span>
                        <span className="ml-2 font-medium">{plan.estimatedDuration} minutes</span>
                    </div>
                    <div>
                        <span className="text-gray-600">Total Tasks:</span>
                        <span className="ml-2 font-medium">{plan.tasks.length}</span>
                    </div>
                </div>
                {plan.warnings.length > 0 && (
                    <div className="mt-3">
                        <span className="text-gray-600 text-sm">Warnings:</span>
                        <ul className="mt-1 space-y-1">
                            {plan.warnings.map((warning, index) => (
                                <li key={index} className="text-sm text-yellow-700 flex items-start">
                                    <svg className="w-4 h-4 text-yellow-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    {warning}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}