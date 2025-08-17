'use client';

import React, { useState, useEffect, useRef } from 'react';
import { LogEntry } from '@/types';

interface ConversionLogsProps {
    logs: LogEntry[];
}

export function ConversionLogs({ logs }: ConversionLogsProps) {
    const [filter, setFilter] = useState<'all' | 'info' | 'warn' | 'error' | 'debug'>('all');
    const [autoScroll, setAutoScroll] = useState(true);
    const logsEndRef = useRef<HTMLDivElement>(null);
    const logsContainerRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when new logs arrive
    useEffect(() => {
        if (autoScroll && logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs, autoScroll]);

    // Check if user has scrolled up to disable auto-scroll
    const handleScroll = () => {
        if (logsContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = logsContainerRef.current;
            const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
            setAutoScroll(isAtBottom);
        }
    };

    const filteredLogs = logs.filter(log => filter === 'all' || log.level === filter);

    const getLevelIcon = (level: string) => {
        switch (level) {
            case 'error':
                return (
                    <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                );
            case 'warn':
                return (
                    <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                );
            case 'debug':
                return (
                    <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                );
            default: // info
                return (
                    <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                );
        }
    };

    const getLevelColor = (level: string) => {
        switch (level) {
            case 'error': return 'text-red-700 bg-red-50 border-red-200';
            case 'warn': return 'text-yellow-700 bg-yellow-50 border-yellow-200';
            case 'debug': return 'text-gray-700 bg-gray-50 border-gray-200';
            default: return 'text-blue-700 bg-blue-50 border-blue-200';
        }
    };

    const getSourceBadge = (source: string) => {
        const colors = {
            system: 'bg-blue-100 text-blue-800',
            application: 'bg-green-100 text-green-800',
            build: 'bg-purple-100 text-purple-800'
        };

        return (
            <span className={`px-2 py-1 text-xs rounded-full ${colors[source as keyof typeof colors] || colors.system}`}>
                {source}
            </span>
        );
    };

    const formatTimestamp = (timestamp: Date) => {
        return new Intl.DateTimeFormat('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            fractionalSecondDigits: 3
        }).format(new Date(timestamp));
    };

    const clearLogs = () => {
        // This would typically call a parent function to clear logs
        console.log('Clear logs requested');
    };

    const downloadLogs = () => {
        const logText = logs.map(log => 
            `[${formatTimestamp(log.timestamp)}] [${log.level.toUpperCase()}] [${log.source}] ${log.message}`
        ).join('\n');
        
        const blob = new Blob([logText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `conversion-logs-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-4">
            {/* Controls */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                        <label htmlFor="log-filter" className="text-sm font-medium text-gray-700">
                            Filter:
                        </label>
                        <select
                            id="log-filter"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value as any)}
                            className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">All Levels</option>
                            <option value="info">Info</option>
                            <option value="warn">Warnings</option>
                            <option value="error">Errors</option>
                            <option value="debug">Debug</option>
                        </select>
                    </div>
                    <div className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            id="auto-scroll"
                            checked={autoScroll}
                            onChange={(e) => setAutoScroll(e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="auto-scroll" className="text-sm text-gray-700">
                            Auto-scroll
                        </label>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={downloadLogs}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                        Download
                    </button>
                    <button
                        onClick={clearLogs}
                        className="px-3 py-1 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                    >
                        Clear
                    </button>
                </div>
            </div>

            {/* Log Count */}
            <div className="text-sm text-gray-600">
                Showing {filteredLogs.length} of {logs.length} log entries
            </div>

            {/* Logs Container */}
            <div
                ref={logsContainerRef}
                onScroll={handleScroll}
                className="bg-gray-900 text-gray-100 rounded-lg p-4 h-96 overflow-y-auto font-mono text-sm"
            >
                {filteredLogs.length === 0 ? (
                    <div className="text-center text-gray-400 py-8">
                        {logs.length === 0 ? 'No logs available yet' : 'No logs match the current filter'}
                    </div>
                ) : (
                    <div className="space-y-1">
                        {filteredLogs.map((log) => (
                            <div
                                key={log.id}
                                className={`p-2 rounded border-l-4 ${getLevelColor(log.level)}`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start space-x-2 flex-1">
                                        {getLevelIcon(log.level)}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center space-x-2 mb-1">
                                                <span className="text-xs text-gray-500">
                                                    {formatTimestamp(log.timestamp)}
                                                </span>
                                                {getSourceBadge(log.source)}
                                                <span className={`text-xs px-2 py-1 rounded-full ${
                                                    log.level === 'error' ? 'bg-red-100 text-red-800' :
                                                    log.level === 'warn' ? 'bg-yellow-100 text-yellow-800' :
                                                    log.level === 'debug' ? 'bg-gray-100 text-gray-800' :
                                                    'bg-blue-100 text-blue-800'
                                                }`}>
                                                    {log.level.toUpperCase()}
                                                </span>
                                            </div>
                                            <div className="text-sm break-words">
                                                {log.message}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div ref={logsEndRef} />
                    </div>
                )}
            </div>

            {/* Auto-scroll indicator */}
            {!autoScroll && (
                <div className="text-center">
                    <button
                        onClick={() => {
                            setAutoScroll(true);
                            logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                    >
                        Scroll to Bottom
                    </button>
                </div>
            )}
        </div>
    );
}