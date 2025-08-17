import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ProgressTracker } from '../ProgressTracker';
import { ConversionJob, ConversionPlan, ConversionTask } from '@/types';

// Mock conversion job data
const mockTasks: ConversionTask[] = [
    {
        id: 'task-1',
        type: 'analysis',
        description: 'Analyze project structure',
        inputFiles: ['package.json'],
        outputFiles: ['analysis.json'],
        dependencies: [],
        agentType: 'analysis',
        priority: 1,
        status: 'completed',
        estimatedDuration: 5,
    },
    {
        id: 'task-2',
        type: 'code_generation',
        description: 'Convert JavaScript to TypeScript',
        inputFiles: ['src/**/*.js'],
        outputFiles: ['src/**/*.ts'],
        dependencies: ['task-1'],
        agentType: 'code_generation',
        priority: 2,
        status: 'running',
        estimatedDuration: 15,
    },
    {
        id: 'task-3',
        type: 'validation',
        description: 'Validate converted code',
        inputFiles: ['src/**/*.ts'],
        outputFiles: ['validation-report.json'],
        dependencies: ['task-2'],
        agentType: 'validation',
        priority: 3,
        status: 'pending',
        estimatedDuration: 10,
    },
    {
        id: 'task-4',
        type: 'integration',
        description: 'Integration test failed task',
        inputFiles: ['test/**/*.ts'],
        outputFiles: ['integration-report.json'],
        dependencies: ['task-3'],
        agentType: 'integration',
        priority: 4,
        status: 'failed',
        estimatedDuration: 8,
    }
];

const mockPlan: ConversionPlan = {
    id: 'plan-1',
    projectId: 'project-1',
    tasks: mockTasks,
    estimatedDuration: 38,
    complexity: 'medium',
    warnings: ['Some manual review may be required'],
    feasible: true,
    createdAt: new Date(),
    updatedAt: new Date()
};

const mockConversionJob: ConversionJob = {
    id: 'job-1',
    projectId: 'project-1',
    plan: mockPlan,
    status: 'running',
    progress: 65,
    currentTask: 'Converting JavaScript to TypeScript',
    results: [],
    startedAt: new Date(),
    createdAt: new Date()
};

describe('ProgressTracker', () => {
    it('renders overall progress correctly', () => {
        render(<ProgressTracker conversionJob={mockConversionJob} />);
        
        expect(screen.getByText('Overall Progress')).toBeInTheDocument();
        expect(screen.getByText('65%')).toBeInTheDocument();
    });

    it('displays task statistics correctly', () => {
        render(<ProgressTracker conversionJob={mockConversionJob} />);
        
        // Check total tasks
        expect(screen.getByText('4')).toBeInTheDocument();
        expect(screen.getByText('Total Tasks')).toBeInTheDocument();
        
        // Check completed tasks
        expect(screen.getByText('1')).toBeInTheDocument();
        expect(screen.getByText('Completed')).toBeInTheDocument();
        
        // Check running tasks
        expect(screen.getByText('Running')).toBeInTheDocument();
        
        // Check failed tasks
        expect(screen.getByText('Failed')).toBeInTheDocument();
        
        // Check pending tasks
        expect(screen.getByText('Pending')).toBeInTheDocument();
    });

    it('shows task progress visualization', () => {
        render(<ProgressTracker conversionJob={mockConversionJob} />);
        
        expect(screen.getByText('Task Progress')).toBeInTheDocument();
        expect(screen.getByText('Analyze project structure')).toBeInTheDocument();
        expect(screen.getByText('Convert JavaScript to TypeScript')).toBeInTheDocument();
    });

    it('displays conversion plan details', () => {
        render(<ProgressTracker conversionJob={mockConversionJob} />);
        
        expect(screen.getByText('Conversion Plan Details')).toBeInTheDocument();
        expect(screen.getByText('Complexity:')).toBeInTheDocument();
        expect(screen.getByText('medium')).toBeInTheDocument();
        expect(screen.getByText('Estimated Duration:')).toBeInTheDocument();
        expect(screen.getByText('38 minutes')).toBeInTheDocument();
    });

    it('shows warnings when present', () => {
        render(<ProgressTracker conversionJob={mockConversionJob} />);
        
        expect(screen.getByText('Warnings:')).toBeInTheDocument();
        expect(screen.getByText('Some manual review may be required')).toBeInTheDocument();
    });

    it('applies correct styling for different statuses', () => {
        render(<ProgressTracker conversionJob={mockConversionJob} />);
        
        // Check for status indicators
        const completedTask = screen.getByText('Analyze project structure').closest('div');
        expect(completedTask).toBeInTheDocument();
        
        const runningTask = screen.getByText('Convert JavaScript to TypeScript').closest('div');
        expect(runningTask).toBeInTheDocument();
    });

    it('handles completed conversion job', () => {
        const completedJob = {
            ...mockConversionJob,
            status: 'completed' as const,
            progress: 100
        };
        
        render(<ProgressTracker conversionJob={completedJob} />);
        
        expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('handles failed conversion job', () => {
        const failedJob = {
            ...mockConversionJob,
            status: 'failed' as const,
            progress: 45
        };
        
        render(<ProgressTracker conversionJob={failedJob} />);
        
        expect(screen.getByText('45%')).toBeInTheDocument();
    });

    it('limits task display to 10 items', () => {
        const manyTasks = Array.from({ length: 15 }, (_, i) => ({
            ...mockTasks[0],
            id: `task-${i}`,
            description: `Task ${i + 1}`
        }));
        
        const jobWithManyTasks = {
            ...mockConversionJob,
            plan: {
                ...mockPlan,
                tasks: manyTasks
            }
        };
        
        render(<ProgressTracker conversionJob={jobWithManyTasks} />);
        
        expect(screen.getByText('... and 5 more tasks')).toBeInTheDocument();
    });
});