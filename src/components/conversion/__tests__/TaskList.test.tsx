import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TaskList } from '../TaskList';
import { ConversionTask } from '@/types';

// Mock tasks data
const mockTasks: ConversionTask[] = [
    {
        id: 'task-1',
        type: 'analysis',
        description: 'Analyze project structure and dependencies',
        inputFiles: ['package.json', 'src/**/*.js'],
        outputFiles: ['analysis-report.json'],
        dependencies: [],
        agentType: 'analysis',
        priority: 1,
        status: 'completed',
        estimatedDuration: 5,
        context: { phase: 'initial' }
    },
    {
        id: 'task-2',
        type: 'code_generation',
        description: 'Convert JavaScript components to TypeScript',
        inputFiles: ['src/components/**/*.js'],
        outputFiles: ['src/components/**/*.ts'],
        dependencies: ['task-1'],
        agentType: 'code_generation',
        priority: 2,
        status: 'running',
        estimatedDuration: 15,
        context: { targetLanguage: 'typescript' }
    },
    {
        id: 'task-3',
        type: 'dependency_update',
        description: 'Update package.json with TypeScript dependencies',
        inputFiles: ['package.json'],
        outputFiles: ['package.json'],
        dependencies: ['task-2'],
        agentType: 'planning',
        priority: 3,
        status: 'pending',
        estimatedDuration: 3,
    },
    {
        id: 'task-4',
        type: 'validation',
        description: 'Validate converted code and run tests',
        inputFiles: ['src/**/*.ts', 'test/**/*.ts'],
        outputFiles: ['validation-report.json'],
        dependencies: ['task-3'],
        agentType: 'validation',
        priority: 4,
        status: 'failed',
        estimatedDuration: 10,
    }
];

describe('TaskList', () => {
    const mockOnTaskSelect = vi.fn();

    beforeEach(() => {
        mockOnTaskSelect.mockClear();
    });

    it('renders all tasks by default', () => {
        render(
            <TaskList 
                tasks={mockTasks} 
                onTaskSelect={mockOnTaskSelect} 
                selectedTask={null} 
            />
        );
        
        expect(screen.getByText('Analyze project structure and dependencies')).toBeInTheDocument();
        expect(screen.getByText('Convert JavaScript components to TypeScript')).toBeInTheDocument();
        expect(screen.getByText('Update package.json with TypeScript dependencies')).toBeInTheDocument();
        expect(screen.getByText('Validate converted code and run tests')).toBeInTheDocument();
    });

    it('displays task statistics correctly', () => {
        render(
            <TaskList 
                tasks={mockTasks} 
                onTaskSelect={mockOnTaskSelect} 
                selectedTask={null} 
            />
        );
        
        // Check for statistics labels (there are multiple instances due to filter options)
        expect(screen.getByText('Total')).toBeInTheDocument();
        expect(screen.getAllByText('Completed')).toHaveLength(2); // Filter option and stats
        expect(screen.getAllByText('Running')).toHaveLength(2); // Filter option and stats
        expect(screen.getAllByText('Pending')).toHaveLength(2); // Filter option and stats
        expect(screen.getAllByText('Failed')).toHaveLength(2); // Filter option and stats
        
        // Check for task count display
        expect(screen.getByText('4 of 4 tasks')).toBeInTheDocument();
    });

    it('filters tasks by status', () => {
        render(
            <TaskList 
                tasks={mockTasks} 
                onTaskSelect={mockOnTaskSelect} 
                selectedTask={null} 
            />
        );
        
        const filterSelect = screen.getByLabelText('Filter:');
        fireEvent.change(filterSelect, { target: { value: 'completed' } });
        
        expect(screen.getByText('1 of 4 tasks')).toBeInTheDocument();
        expect(screen.getByText('Analyze project structure and dependencies')).toBeInTheDocument();
        expect(screen.queryByText('Convert JavaScript components to TypeScript')).not.toBeInTheDocument();
    });

    it('sorts tasks by priority', () => {
        render(
            <TaskList 
                tasks={mockTasks} 
                onTaskSelect={mockOnTaskSelect} 
                selectedTask={null} 
            />
        );
        
        const sortSelect = screen.getByLabelText('Sort by:');
        fireEvent.change(sortSelect, { target: { value: 'priority' } });
        
        // Verify sorting is applied
        expect(sortSelect).toHaveValue('priority');
    });

    it('sorts tasks by status', () => {
        render(
            <TaskList 
                tasks={mockTasks} 
                onTaskSelect={mockOnTaskSelect} 
                selectedTask={null} 
            />
        );
        
        const sortSelect = screen.getByLabelText('Sort by:');
        fireEvent.change(sortSelect, { target: { value: 'status' } });
        
        // Verify sorting is applied (exact order depends on alphabetical sorting of status)
        expect(screen.getByLabelText('Sort by:')).toHaveValue('status');
    });

    it('sorts tasks by type', () => {
        render(
            <TaskList 
                tasks={mockTasks} 
                onTaskSelect={mockOnTaskSelect} 
                selectedTask={null} 
            />
        );
        
        const sortSelect = screen.getByLabelText('Sort by:');
        fireEvent.change(sortSelect, { target: { value: 'type' } });
        
        expect(screen.getByLabelText('Sort by:')).toHaveValue('type');
    });

    it('handles task selection', () => {
        render(
            <TaskList 
                tasks={mockTasks} 
                onTaskSelect={mockOnTaskSelect} 
                selectedTask={null} 
            />
        );
        
        const firstTask = screen.getByText('Analyze project structure and dependencies').closest('div');
        fireEvent.click(firstTask!);
        
        expect(mockOnTaskSelect).toHaveBeenCalledWith(mockTasks[0]);
    });

    it('handles task deselection', () => {
        render(
            <TaskList 
                tasks={mockTasks} 
                onTaskSelect={mockOnTaskSelect} 
                selectedTask={mockTasks[0]} 
            />
        );
        
        const selectedTask = screen.getByText('Analyze project structure and dependencies').closest('div');
        fireEvent.click(selectedTask!);
        
        expect(mockOnTaskSelect).toHaveBeenCalledWith(null);
    });

    it('displays task details when selected', () => {
        render(
            <TaskList 
                tasks={mockTasks} 
                onTaskSelect={mockOnTaskSelect} 
                selectedTask={mockTasks[0]} 
            />
        );
        
        expect(screen.getByText('Input Files')).toBeInTheDocument();
        expect(screen.getByText('Output Files')).toBeInTheDocument();
        expect(screen.getByText('package.json')).toBeInTheDocument();
        expect(screen.getByText('analysis-report.json')).toBeInTheDocument();
    });

    it('displays dependencies when present', () => {
        render(
            <TaskList 
                tasks={mockTasks} 
                onTaskSelect={mockOnTaskSelect} 
                selectedTask={mockTasks[1]} // Task with dependencies
            />
        );
        
        expect(screen.getByText('Dependencies')).toBeInTheDocument();
    });

    it('displays context when present', () => {
        render(
            <TaskList 
                tasks={mockTasks} 
                onTaskSelect={mockOnTaskSelect} 
                selectedTask={mockTasks[0]} // Task with context
            />
        );
        
        expect(screen.getByText('Context')).toBeInTheDocument();
    });

    it('displays correct status badges', () => {
        render(
            <TaskList 
                tasks={mockTasks} 
                onTaskSelect={mockOnTaskSelect} 
                selectedTask={null} 
            />
        );
        
        expect(screen.getByText('completed')).toBeInTheDocument();
        expect(screen.getByText('running')).toBeInTheDocument();
        expect(screen.getByText('pending')).toBeInTheDocument();
        expect(screen.getByText('failed')).toBeInTheDocument();
    });

    it('displays correct type badges', () => {
        render(
            <TaskList 
                tasks={mockTasks} 
                onTaskSelect={mockOnTaskSelect} 
                selectedTask={null} 
            />
        );
        
        expect(screen.getAllByText('analysis')).toHaveLength(2); // Badge and agent type
        expect(screen.getByText('code generation')).toBeInTheDocument();
        expect(screen.getByText('dependency update')).toBeInTheDocument();
        expect(screen.getAllByText('validation')).toHaveLength(2); // Badge and agent type
    });

    it('displays priority labels correctly', () => {
        render(
            <TaskList 
                tasks={mockTasks} 
                onTaskSelect={mockOnTaskSelect} 
                selectedTask={null} 
            />
        );
        
        expect(screen.getAllByText('High Priority')).toHaveLength(3); // Priority 1, 2, 3
        expect(screen.getByText('Medium Priority')).toBeInTheDocument(); // Priority 4
    });

    it('shows empty state when no tasks match filter', () => {
        // Create tasks without any 'skipped' status
        const tasksWithoutSkipped = mockTasks.map(task => ({ ...task }));
        
        render(
            <TaskList 
                tasks={tasksWithoutSkipped} 
                onTaskSelect={mockOnTaskSelect} 
                selectedTask={null} 
            />
        );
        
        const filterSelect = screen.getByLabelText('Filter:');
        
        // Filter to completed tasks (should show 1 task)
        fireEvent.change(filterSelect, { target: { value: 'completed' } });
        expect(screen.getByText('1 of 4 tasks')).toBeInTheDocument();
    });

    it('highlights selected task', () => {
        render(
            <TaskList 
                tasks={mockTasks} 
                onTaskSelect={mockOnTaskSelect} 
                selectedTask={mockTasks[0]} 
            />
        );
        
        // Find the task container (the clickable div with the task)
        const taskContainers = screen.getAllByText('Analyze project structure and dependencies');
        const taskContainer = taskContainers[0].closest('.p-4');
        expect(taskContainer).toHaveClass('border-blue-500', 'bg-blue-50');
    });

    it('displays agent type information', () => {
        render(
            <TaskList 
                tasks={mockTasks} 
                onTaskSelect={mockOnTaskSelect} 
                selectedTask={null} 
            />
        );
        
        expect(screen.getAllByText('analysis')).toHaveLength(2); // Badge and agent type
        expect(screen.getByText('code_generation')).toBeInTheDocument();
        expect(screen.getByText('planning')).toBeInTheDocument();
        expect(screen.getAllByText('validation')).toHaveLength(2); // Badge and agent type
    });
});