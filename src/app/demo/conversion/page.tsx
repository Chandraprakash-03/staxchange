'use client';

import React from 'react';
import { ConversionProgressMonitor } from '@/components/conversion';
import { Project, ConversionJob, ConversionPlan, ConversionTask, TechStack } from '@/types';

// Mock data for demonstration
const mockTechStack: TechStack = {
    language: 'JavaScript',
    framework: 'React',
    database: 'MongoDB',
    runtime: 'Node.js',
    buildTool: 'Webpack',
    packageManager: 'npm',
    deployment: 'Vercel',
    additional: {}
};

const mockTargetTechStack: TechStack = {
    language: 'TypeScript',
    framework: 'Next.js',
    database: 'PostgreSQL',
    runtime: 'Node.js',
    buildTool: 'Turbopack',
    packageManager: 'npm',
    deployment: 'Vercel',
    additional: {}
};

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
        type: 'config_update',
        description: 'Create TypeScript configuration files',
        inputFiles: [],
        outputFiles: ['tsconfig.json', '.eslintrc.js'],
        dependencies: ['task-3'],
        agentType: 'planning',
        priority: 4,
        status: 'pending',
        estimatedDuration: 5,
    },
    {
        id: 'task-5',
        type: 'validation',
        description: 'Validate converted code and run tests',
        inputFiles: ['src/**/*.ts', 'test/**/*.ts'],
        outputFiles: ['validation-report.json'],
        dependencies: ['task-4'],
        agentType: 'validation',
        priority: 5,
        status: 'pending',
        estimatedDuration: 10,
    }
];

const mockPlan: ConversionPlan = {
    id: 'plan-demo',
    projectId: 'project-demo',
    tasks: mockTasks,
    estimatedDuration: 38,
    complexity: 'medium',
    warnings: [
        'Some JavaScript features may not have direct TypeScript equivalents',
        'Manual review recommended for complex type definitions'
    ],
    feasible: true,
    createdAt: new Date(),
    updatedAt: new Date()
};

const mockProject: Project = {
    id: 'project-demo',
    name: 'Demo React App',
    githubUrl: 'https://github.com/user/demo-react-app',
    userId: 'user-demo',
    originalTechStack: mockTechStack,
    targetTechStack: mockTargetTechStack,
    status: 'converting',
    createdAt: new Date(),
    updatedAt: new Date()
};

const mockConversionJob: ConversionJob = {
    id: 'job-demo',
    projectId: 'project-demo',
    plan: mockPlan,
    status: 'running',
    progress: 45,
    currentTask: 'Converting JavaScript components to TypeScript',
    results: [
        {
            taskId: 'task-1',
            status: 'success',
            output: 'Analysis completed successfully',
            files: [
                {
                    path: 'analysis-report.json',
                    type: 'create',
                    content: '{"techStack": "React + JavaScript", "complexity": "medium"}'
                }
            ]
        }
    ],
    startedAt: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
    createdAt: new Date(Date.now() - 15 * 60 * 1000)  // 15 minutes ago
};

export default function ConversionDemoPage() {
    const handleBack = () => {
        console.log('Back button clicked');
    };

    const handleComplete = () => {
        console.log('Complete button clicked');
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="container mx-auto px-4">
                <div className="max-w-6xl mx-auto">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            Conversion Progress Monitor Demo
                        </h1>
                        <p className="text-gray-600">
                            This is a demonstration of the conversion progress and monitoring UI components.
                        </p>
                    </div>
                    
                    <ConversionProgressMonitor
                        project={mockProject}
                        conversionJob={mockConversionJob}
                        onBack={handleBack}
                        onComplete={handleComplete}
                    />
                </div>
            </div>
        </div>
    );
}