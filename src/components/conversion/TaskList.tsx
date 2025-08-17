'use client';

import React, { useState } from 'react';
import { ConversionTask } from '@/types';

interface TaskListProps {
    tasks: ConversionTask[];
    onTaskSelect: (task: ConversionTask | null) => void;
    selectedTask: ConversionTask | null;
}

export function TaskList({ tasks, onTaskSelect, selectedTask }: TaskListProps) {
    const [filter, setFilter] = useState<'all' | 'pending' | 'running' | 'completed' | 'failed'>('all');
    const [sortBy, setSortBy] = useState<'priority' | 'status' | 'type'>('priority');

    // Filter and sort tasks
    const filteredTasks = tasks
        .filter(task => filter === 'all' || task.status === filter)
        .sort((a, b) => {
            switch (sortBy) {
                case 'priority':
                    return a.priority - b.priority;
                case 'status':
                    return a.status.localeCompare(b.status);
                case 'type':
                    return a.type.localeCompare(b.type);
                default:
                    return 0;
            }
        });

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed':
                return (
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                );
            case 'failed':
                return (
                    <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                );
            case 'running':
                return (
                    <div className="w-5 h-5">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                    </div>
                );
            case 'skipped':
                return (
                    <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
                    </svg>
                );
            default: // pending
                return (
                    <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                );
        }
    };

    const getStatusBadge = (status: string) => {
        const colors = {
            completed: 'bg-green-100 text-green-800',
            running: 'bg-blue-100 text-blue-800',
            failed: 'bg-red-100 text-red-800',
            skipped: 'bg-gray-100 text-gray-800',
            pending: 'bg-yellow-100 text-yellow-800'
        };

        return (
            <span className={`px-2 py-1 text-xs rounded-full ${colors[status as keyof typeof colors] || colors.pending}`}>
                {status}
            </span>
        );
    };

    const getTypeBadge = (type: string) => {
        const colors = {
            analysis: 'bg-purple-100 text-purple-800',
            code_generation: 'bg-blue-100 text-blue-800',
            dependency_update: 'bg-orange-100 text-orange-800',
            config_update: 'bg-indigo-100 text-indigo-800',
            validation: 'bg-green-100 text-green-800',
            integration: 'bg-pink-100 text-pink-800'
        };

        return (
            <span className={`px-2 py-1 text-xs rounded-full ${colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
                {type.replace('_', ' ')}
            </span>
        );
    };

    const getPriorityColor = (priority: number) => {
        if (priority <= 3) return 'text-red-600'; // High priority
        if (priority <= 6) return 'text-yellow-600'; // Medium priority
        return 'text-green-600'; // Low priority
    };

    const getPriorityLabel = (priority: number) => {
        if (priority <= 3) return 'High';
        if (priority <= 6) return 'Medium';
        return 'Low';
    };

    const taskStats = tasks.reduce(
        (acc, task) => {
            acc.total++;
            acc[task.status]++;
            return acc;
        },
        { total: 0, pending: 0, running: 0, completed: 0, failed: 0, skipped: 0 }
    );

    return (
        <div className="space-y-4">
            {/* Controls */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                        <label htmlFor="task-filter" className="text-sm font-medium text-gray-700">Filter:</label>
                        <select
                            id="task-filter"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value as any)}
                            className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">All Tasks</option>
                            <option value="pending">Pending</option>
                            <option value="running">Running</option>
                            <option value="completed">Completed</option>
                            <option value="failed">Failed</option>
                        </select>
                    </div>
                    <div className="flex items-center space-x-2">
                        <label htmlFor="task-sort" className="text-sm font-medium text-gray-700">Sort by:</label>
                        <select
                            id="task-sort"
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="priority">Priority</option>
                            <option value="status">Status</option>
                            <option value="type">Type</option>
                        </select>
                    </div>
                </div>
                <div className="text-sm text-gray-600">
                    {filteredTasks.length} of {tasks.length} tasks
                </div>
            </div>

            {/* Task Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="text-center">
                    <div className="text-lg font-bold text-gray-900">{taskStats.total}</div>
                    <div className="text-xs text-gray-600">Total</div>
                </div>
                <div className="text-center">
                    <div className="text-lg font-bold text-green-600">{taskStats.completed}</div>
                    <div className="text-xs text-gray-600">Completed</div>
                </div>
                <div className="text-center">
                    <div className="text-lg font-bold text-blue-600">{taskStats.running}</div>
                    <div className="text-xs text-gray-600">Running</div>
                </div>
                <div className="text-center">
                    <div className="text-lg font-bold text-yellow-600">{taskStats.pending}</div>
                    <div className="text-xs text-gray-600">Pending</div>
                </div>
                <div className="text-center">
                    <div className="text-lg font-bold text-red-600">{taskStats.failed}</div>
                    <div className="text-xs text-gray-600">Failed</div>
                </div>
                <div className="text-center">
                    <div className="text-lg font-bold text-gray-600">{taskStats.skipped}</div>
                    <div className="text-xs text-gray-600">Skipped</div>
                </div>
            </div>

            {/* Task List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredTasks.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        No tasks match the current filter
                    </div>
                ) : (
                    filteredTasks.map((task) => (
                        <div
                            key={task.id}
                            onClick={() => onTaskSelect(selectedTask?.id === task.id ? null : task)}
                            className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                                selectedTask?.id === task.id
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-start space-x-3 flex-1">
                                    {getStatusIcon(task.status)}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center space-x-2 mb-2">
                                            {getStatusBadge(task.status)}
                                            {getTypeBadge(task.type)}
                                            <span className={`text-xs font-medium ${getPriorityColor(task.priority)}`}>
                                                {getPriorityLabel(task.priority)} Priority
                                            </span>
                                        </div>
                                        <h4 className="text-sm font-medium text-gray-900 mb-1">
                                            {task.description}
                                        </h4>
                                        <div className="text-xs text-gray-500 space-y-1">
                                            <div>
                                                <span className="font-medium">Agent:</span> {task.agentType}
                                            </div>
                                            <div>
                                                <span className="font-medium">Duration:</span> ~{task.estimatedDuration} min
                                            </div>
                                            {task.inputFiles.length > 0 && (
                                                <div>
                                                    <span className="font-medium">Input files:</span> {task.inputFiles.length}
                                                </div>
                                            )}
                                            {task.outputFiles.length > 0 && (
                                                <div>
                                                    <span className="font-medium">Output files:</span> {task.outputFiles.length}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex-shrink-0 ml-4">
                                    <div className="text-right">
                                        <div className="text-xs text-gray-500">Priority</div>
                                        <div className={`text-sm font-bold ${getPriorityColor(task.priority)}`}>
                                            {task.priority}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Expanded Details */}
                            {selectedTask?.id === task.id && (
                                <div className="mt-4 pt-4 border-t border-gray-200">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                        {task.inputFiles.length > 0 && (
                                            <div>
                                                <h5 className="font-medium text-gray-900 mb-2">Input Files</h5>
                                                <ul className="space-y-1">
                                                    {task.inputFiles.map((file, index) => (
                                                        <li key={index} className="text-gray-600 text-xs font-mono">
                                                            {file}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        {task.outputFiles.length > 0 && (
                                            <div>
                                                <h5 className="font-medium text-gray-900 mb-2">Output Files</h5>
                                                <ul className="space-y-1">
                                                    {task.outputFiles.map((file, index) => (
                                                        <li key={index} className="text-gray-600 text-xs font-mono">
                                                            {file}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        {task.dependencies.length > 0 && (
                                            <div className="md:col-span-2">
                                                <h5 className="font-medium text-gray-900 mb-2">Dependencies</h5>
                                                <div className="flex flex-wrap gap-2">
                                                    {task.dependencies.map((depId, index) => {
                                                        const depTask = tasks.find(t => t.id === depId);
                                                        return (
                                                            <span
                                                                key={index}
                                                                className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                                                            >
                                                                {depTask?.description.substring(0, 30) || depId}...
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                        {task.context && Object.keys(task.context).length > 0 && (
                                            <div className="md:col-span-2">
                                                <h5 className="font-medium text-gray-900 mb-2">Context</h5>
                                                <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                                                    {JSON.stringify(task.context, null, 2)}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}