import { NextRequest, NextResponse } from 'next/server';
import { ConversionJob, ApiResponse, ConversionPlan, ConversionTask } from '@/types';

// Mock data for demonstration - in real implementation, this would come from database
const mockConversionJobs: Record<string, ConversionJob> = {};

// Mock conversion plan generator
function generateMockConversionPlan(projectId: string): ConversionPlan {
    const tasks: ConversionTask[] = [
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
            context: { dependencies: ['typescript', '@types/node'] }
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
            context: { configType: 'typescript' }
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
            context: { testFramework: 'jest' }
        }
    ];

    return {
        id: `plan-${projectId}`,
        projectId,
        tasks,
        estimatedDuration: tasks.reduce((sum, task) => sum + task.estimatedDuration, 0),
        complexity: 'medium',
        warnings: [
            'Some JavaScript features may not have direct TypeScript equivalents',
            'Manual review recommended for complex type definitions'
        ],
        feasible: true,
        createdAt: new Date(),
        updatedAt: new Date()
    };
}

// GET /api/projects/[id]/conversion - Get conversion job status
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse<ConversionJob>>> {
    try {
        const projectId = params.id;
        
        // Check if conversion job exists
        const existingJob = mockConversionJobs[projectId];
        
        if (!existingJob) {
            return NextResponse.json({
                success: false,
                error: 'No conversion job found for this project'
            }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            data: existingJob
        });
    } catch (error) {
        console.error('Error fetching conversion job:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to fetch conversion job'
        }, { status: 500 });
    }
}

// POST /api/projects/[id]/conversion - Start new conversion job
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse<ConversionJob>>> {
    try {
        const projectId = params.id;
        
        // Check if conversion job already exists
        if (mockConversionJobs[projectId]) {
            return NextResponse.json({
                success: false,
                error: 'Conversion job already exists for this project'
            }, { status: 409 });
        }

        // Generate conversion plan
        const plan = generateMockConversionPlan(projectId);
        
        // Create new conversion job
        const conversionJob: ConversionJob = {
            id: `job-${projectId}-${Date.now()}`,
            projectId,
            plan,
            status: 'running',
            progress: 20, // Mock initial progress
            currentTask: 'Analyzing project structure and dependencies',
            results: [],
            startedAt: new Date(),
            createdAt: new Date()
        };

        // Store the job (in real implementation, this would be saved to database)
        mockConversionJobs[projectId] = conversionJob;

        // Simulate progress updates (in real implementation, this would be handled by background workers)
        setTimeout(() => {
            if (mockConversionJobs[projectId]) {
                mockConversionJobs[projectId].progress = 40;
                mockConversionJobs[projectId].currentTask = 'Converting JavaScript components to TypeScript';
            }
        }, 5000);

        setTimeout(() => {
            if (mockConversionJobs[projectId]) {
                mockConversionJobs[projectId].progress = 75;
                mockConversionJobs[projectId].currentTask = 'Updating configuration files';
            }
        }, 15000);

        setTimeout(() => {
            if (mockConversionJobs[projectId]) {
                mockConversionJobs[projectId].progress = 100;
                mockConversionJobs[projectId].status = 'completed';
                mockConversionJobs[projectId].currentTask = 'Conversion completed successfully';
                mockConversionJobs[projectId].completedAt = new Date();
                
                // Update task statuses
                mockConversionJobs[projectId].plan.tasks.forEach(task => {
                    task.status = 'completed';
                });
            }
        }, 25000);

        return NextResponse.json({
            success: true,
            data: conversionJob
        });
    } catch (error) {
        console.error('Error starting conversion job:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to start conversion job'
        }, { status: 500 });
    }
}

// DELETE /api/projects/[id]/conversion - Cancel conversion job
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse<void>>> {
    try {
        const projectId = params.id;
        
        // Check if conversion job exists
        if (!mockConversionJobs[projectId]) {
            return NextResponse.json({
                success: false,
                error: 'No conversion job found for this project'
            }, { status: 404 });
        }

        // Cancel the job (in real implementation, this would stop background workers)
        delete mockConversionJobs[projectId];

        return NextResponse.json({
            success: true,
            message: 'Conversion job cancelled successfully'
        });
    } catch (error) {
        console.error('Error cancelling conversion job:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to cancel conversion job'
        }, { status: 500 });
    }
}