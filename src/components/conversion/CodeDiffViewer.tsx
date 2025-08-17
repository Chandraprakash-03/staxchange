'use client';

import React, { useState, useEffect } from 'react';
import { ConversionJob, ConversionTask, FileChange } from '@/types';

interface CodeDiffViewerProps {
    conversionJob: ConversionJob;
    selectedTask?: ConversionTask | null;
}

export function CodeDiffViewer({ conversionJob, selectedTask }: CodeDiffViewerProps) {
    const [selectedFile, setSelectedFile] = useState<FileChange | null>(null);
    const [viewMode, setViewMode] = useState<'split' | 'unified'>('split');
    const [showOnlyChanges, setShowOnlyChanges] = useState(true);

    // Get all file changes from conversion results
    const allFileChanges = conversionJob.results?.flatMap(result => result.files) || [];
    
    // Filter file changes based on selected task
    const fileChanges = selectedTask 
        ? allFileChanges.filter(change => 
            selectedTask.outputFiles.includes(change.path) || 
            selectedTask.inputFiles.includes(change.path)
          )
        : allFileChanges;

    // Auto-select first file when changes update
    useEffect(() => {
        if (fileChanges.length > 0 && !selectedFile) {
            setSelectedFile(fileChanges[0]);
        }
    }, [fileChanges, selectedFile]);

    const getChangeTypeIcon = (type: string) => {
        switch (type) {
            case 'create':
                return (
                    <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                );
            case 'update':
                return (
                    <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                    </svg>
                );
            case 'delete':
                return (
                    <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                );
            default:
                return null;
        }
    };

    const getChangeTypeBadge = (type: string) => {
        const colors = {
            create: 'bg-green-100 text-green-800',
            update: 'bg-blue-100 text-blue-800',
            delete: 'bg-red-100 text-red-800'
        };

        return (
            <span className={`px-2 py-1 text-xs rounded-full ${colors[type as keyof typeof colors]}`}>
                {type.toUpperCase()}
            </span>
        );
    };

    const renderDiffLines = (oldContent: string, newContent: string) => {
        const oldLines = oldContent.split('\n');
        const newLines = newContent.split('\n');
        const maxLines = Math.max(oldLines.length, newLines.length);

        const lines = [];
        for (let i = 0; i < maxLines; i++) {
            const oldLine = oldLines[i] || '';
            const newLine = newLines[i] || '';
            
            if (oldLine === newLine) {
                if (!showOnlyChanges) {
                    lines.push({
                        type: 'unchanged',
                        oldLineNum: i + 1,
                        newLineNum: i + 1,
                        content: oldLine
                    });
                }
            } else {
                if (oldLine) {
                    lines.push({
                        type: 'removed',
                        oldLineNum: i + 1,
                        newLineNum: null,
                        content: oldLine
                    });
                }
                if (newLine) {
                    lines.push({
                        type: 'added',
                        oldLineNum: null,
                        newLineNum: i + 1,
                        content: newLine
                    });
                }
            }
        }

        return lines;
    };

    const renderSplitView = (fileChange: FileChange) => {
        if (fileChange.type === 'create') {
            return (
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Original (New File)</h4>
                        <div className="text-sm text-gray-500 italic">File does not exist</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">New Content</h4>
                        <pre className="text-sm bg-white p-3 rounded border overflow-x-auto">
                            <code>{fileChange.content || ''}</code>
                        </pre>
                    </div>
                </div>
            );
        }

        if (fileChange.type === 'delete') {
            return (
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-red-50 p-4 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Original Content</h4>
                        <pre className="text-sm bg-white p-3 rounded border overflow-x-auto">
                            <code>{fileChange.oldContent || ''}</code>
                        </pre>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">New (Deleted)</h4>
                        <div className="text-sm text-gray-500 italic">File will be deleted</div>
                    </div>
                </div>
            );
        }

        // Update case
        return (
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-red-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Original</h4>
                    <pre className="text-sm bg-white p-3 rounded border overflow-x-auto">
                        <code>{fileChange.oldContent || ''}</code>
                    </pre>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Modified</h4>
                    <pre className="text-sm bg-white p-3 rounded border overflow-x-auto">
                        <code>{fileChange.content || ''}</code>
                    </pre>
                </div>
            </div>
        );
    };

    const renderUnifiedView = (fileChange: FileChange) => {
        if (fileChange.type === 'create') {
            return (
                <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">New File: {fileChange.path}</h4>
                    <pre className="text-sm bg-white p-3 rounded border overflow-x-auto">
                        <code className="text-green-700">{fileChange.content || ''}</code>
                    </pre>
                </div>
            );
        }

        if (fileChange.type === 'delete') {
            return (
                <div className="bg-red-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Deleted File: {fileChange.path}</h4>
                    <pre className="text-sm bg-white p-3 rounded border overflow-x-auto">
                        <code className="text-red-700">{fileChange.oldContent || ''}</code>
                    </pre>
                </div>
            );
        }

        // Unified diff for updates
        const diffLines = renderDiffLines(fileChange.oldContent || '', fileChange.content || '');
        
        return (
            <div className="bg-white border rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b">
                    <h4 className="text-sm font-medium text-gray-700">Changes in {fileChange.path}</h4>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm font-mono">
                        <tbody>
                            {diffLines.map((line, index) => (
                                <tr key={index} className={
                                    line.type === 'added' ? 'bg-green-50' :
                                    line.type === 'removed' ? 'bg-red-50' :
                                    'bg-white'
                                }>
                                    <td className="px-2 py-1 text-gray-500 text-right border-r w-12">
                                        {line.oldLineNum || ''}
                                    </td>
                                    <td className="px-2 py-1 text-gray-500 text-right border-r w-12">
                                        {line.newLineNum || ''}
                                    </td>
                                    <td className="px-2 py-1">
                                        <span className={
                                            line.type === 'added' ? 'text-green-700' :
                                            line.type === 'removed' ? 'text-red-700' :
                                            'text-gray-700'
                                        }>
                                            {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                                            {line.content}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    if (fileChanges.length === 0) {
        return (
            <div className="text-center py-8">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Code Changes Yet</h3>
                <p className="text-gray-600">
                    {selectedTask 
                        ? 'No changes have been made for the selected task yet.'
                        : 'The conversion process hasn\'t generated any code changes yet.'
                    }
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Controls */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                        <label className="text-sm font-medium text-gray-700">View:</label>
                        <select
                            value={viewMode}
                            onChange={(e) => setViewMode(e.target.value as any)}
                            className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="split">Split View</option>
                            <option value="unified">Unified Diff</option>
                        </select>
                    </div>
                    <div className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            id="show-only-changes"
                            checked={showOnlyChanges}
                            onChange={(e) => setShowOnlyChanges(e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="show-only-changes" className="text-sm text-gray-700">
                            Show only changes
                        </label>
                    </div>
                </div>
                <div className="text-sm text-gray-600">
                    {fileChanges.length} file{fileChanges.length !== 1 ? 's' : ''} changed
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* File List */}
                <div className="lg:col-span-1">
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Changed Files</h3>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {fileChanges.map((change, index) => (
                            <button
                                key={index}
                                onClick={() => setSelectedFile(change)}
                                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                                    selectedFile === change
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                            >
                                <div className="flex items-center space-x-2 mb-1">
                                    {getChangeTypeIcon(change.type)}
                                    {getChangeTypeBadge(change.type)}
                                </div>
                                <div className="text-sm font-medium text-gray-900 truncate">
                                    {change.path.split('/').pop()}
                                </div>
                                <div className="text-xs text-gray-500 truncate">
                                    {change.path}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Diff Viewer */}
                <div className="lg:col-span-3">
                    {selectedFile ? (
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-medium text-gray-900">
                                    {selectedFile.path}
                                </h3>
                                <div className="flex items-center space-x-2">
                                    {getChangeTypeIcon(selectedFile.type)}
                                    {getChangeTypeBadge(selectedFile.type)}
                                </div>
                            </div>
                            {viewMode === 'split' 
                                ? renderSplitView(selectedFile)
                                : renderUnifiedView(selectedFile)
                            }
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            Select a file to view changes
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}