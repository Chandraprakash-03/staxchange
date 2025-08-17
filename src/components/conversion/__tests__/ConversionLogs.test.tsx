import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ConversionLogs } from '../ConversionLogs';
import { LogEntry } from '@/types';

// Mock log entries
const mockLogs: LogEntry[] = [
    {
        id: 'log-1',
        timestamp: new Date('2024-01-01T10:00:00Z'),
        level: 'info',
        message: 'Starting conversion process',
        source: 'system'
    },
    {
        id: 'log-2',
        timestamp: new Date('2024-01-01T10:01:00Z'),
        level: 'warn',
        message: 'Deprecated API usage detected',
        source: 'application'
    },
    {
        id: 'log-3',
        timestamp: new Date('2024-01-01T10:02:00Z'),
        level: 'error',
        message: 'Failed to parse configuration file',
        source: 'build'
    },
    {
        id: 'log-4',
        timestamp: new Date('2024-01-01T10:03:00Z'),
        level: 'debug',
        message: 'Processing file: src/index.js',
        source: 'system'
    }
];

// Mock URL.createObjectURL and related APIs
Object.defineProperty(window, 'URL', {
    value: {
        createObjectURL: vi.fn(() => 'mock-url'),
        revokeObjectURL: vi.fn()
    }
});

describe('ConversionLogs', () => {
    it('renders all logs by default', () => {
        render(<ConversionLogs logs={mockLogs} />);
        
        expect(screen.getByText('Starting conversion process')).toBeInTheDocument();
        expect(screen.getByText('Deprecated API usage detected')).toBeInTheDocument();
        expect(screen.getByText('Failed to parse configuration file')).toBeInTheDocument();
        expect(screen.getByText('Processing file: src/index.js')).toBeInTheDocument();
    });

    it('displays correct log count', () => {
        render(<ConversionLogs logs={mockLogs} />);
        
        expect(screen.getByText('Showing 4 of 4 log entries')).toBeInTheDocument();
    });

    it('filters logs by level', () => {
        render(<ConversionLogs logs={mockLogs} />);
        
        const filterSelect = screen.getByLabelText('Filter:');
        fireEvent.change(filterSelect, { target: { value: 'error' } });
        
        expect(screen.getByText('Showing 1 of 4 log entries')).toBeInTheDocument();
        expect(screen.getByText('Failed to parse configuration file')).toBeInTheDocument();
        expect(screen.queryByText('Starting conversion process')).not.toBeInTheDocument();
    });

    it('shows warning logs when filtered', () => {
        render(<ConversionLogs logs={mockLogs} />);
        
        const filterSelect = screen.getByLabelText('Filter:');
        fireEvent.change(filterSelect, { target: { value: 'warn' } });
        
        expect(screen.getByText('Showing 1 of 4 log entries')).toBeInTheDocument();
        expect(screen.getByText('Deprecated API usage detected')).toBeInTheDocument();
    });

    it('shows debug logs when filtered', () => {
        render(<ConversionLogs logs={mockLogs} />);
        
        const filterSelect = screen.getByLabelText('Filter:');
        fireEvent.change(filterSelect, { target: { value: 'debug' } });
        
        expect(screen.getByText('Showing 1 of 4 log entries')).toBeInTheDocument();
        expect(screen.getByText('Processing file: src/index.js')).toBeInTheDocument();
    });

    it('displays source badges correctly', () => {
        render(<ConversionLogs logs={mockLogs} />);
        
        expect(screen.getByText('system')).toBeInTheDocument();
        expect(screen.getByText('application')).toBeInTheDocument();
        expect(screen.getByText('build')).toBeInTheDocument();
    });

    it('displays level badges correctly', () => {
        render(<ConversionLogs logs={mockLogs} />);
        
        expect(screen.getByText('INFO')).toBeInTheDocument();
        expect(screen.getByText('WARN')).toBeInTheDocument();
        expect(screen.getByText('ERROR')).toBeInTheDocument();
        expect(screen.getByText('DEBUG')).toBeInTheDocument();
    });

    it('handles auto-scroll toggle', () => {
        render(<ConversionLogs logs={mockLogs} />);
        
        const autoScrollCheckbox = screen.getByLabelText('Auto-scroll');
        expect(autoScrollCheckbox).toBeChecked();
        
        fireEvent.click(autoScrollCheckbox);
        expect(autoScrollCheckbox).not.toBeChecked();
    });

    it('handles download logs functionality', () => {
        // Mock document.createElement and related DOM methods
        const mockAnchor = {
            href: '',
            download: '',
            click: vi.fn()
        };
        
        vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any);
        vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockAnchor as any);
        vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockAnchor as any);
        
        render(<ConversionLogs logs={mockLogs} />);
        
        const downloadButton = screen.getByText('Download');
        fireEvent.click(downloadButton);
        
        expect(mockAnchor.click).toHaveBeenCalled();
        expect(mockAnchor.download).toContain('conversion-logs-');
    });

    it('shows empty state when no logs', () => {
        render(<ConversionLogs logs={[]} />);
        
        expect(screen.getByText('No logs available yet')).toBeInTheDocument();
        expect(screen.getByText('Showing 0 of 0 log entries')).toBeInTheDocument();
    });

    it('shows filtered empty state', () => {
        render(<ConversionLogs logs={mockLogs} />);
        
        const filterSelect = screen.getByLabelText('Filter:');
        fireEvent.change(filterSelect, { target: { value: 'error' } });
        
        // Change to a filter that has no matches
        fireEvent.change(filterSelect, { target: { value: 'info' } });
        fireEvent.change(filterSelect, { target: { value: 'warn' } });
        fireEvent.change(filterSelect, { target: { value: 'debug' } });
        
        // Reset to a filter with no results by creating logs without that level
        const logsWithoutInfo = mockLogs.filter(log => log.level !== 'info');
        render(<ConversionLogs logs={logsWithoutInfo} />);
        
        const newFilterSelect = screen.getByLabelText('Filter:');
        fireEvent.change(newFilterSelect, { target: { value: 'info' } });
        
        expect(screen.getByText('No logs match the current filter')).toBeInTheDocument();
    });

    it('formats timestamps correctly', () => {
        render(<ConversionLogs logs={mockLogs} />);
        
        // Check that timestamps are displayed (exact format may vary by locale)
        const timestampElements = screen.getAllByText(/\d{2}:\d{2}:\d{2}/);
        expect(timestampElements.length).toBeGreaterThan(0);
    });

    it('applies correct styling for different log levels', () => {
        render(<ConversionLogs logs={mockLogs} />);
        
        // Check that different log levels have different styling
        const errorLog = screen.getByText('Failed to parse configuration file').closest('div');
        const infoLog = screen.getByText('Starting conversion process').closest('div');
        
        expect(errorLog).toHaveClass('text-red-700');
        expect(infoLog).toHaveClass('text-blue-700');
    });
});