import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '@/types';

// Mock data storage - in real implementation, this would be in database
const mockConversionJobs: Record<string, any> = {};

// POST /api/projects/[id]/conversion/pause - Pause conversion job
export async function POST(
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

        // Check if job can be paused
        if (mockConversionJobs[projectId].status !== 'running') {
            return NextResponse.json({
                success: false,
                error: 'Can only pause running conversion jobs'
            }, { status: 400 });
        }

        // Pause the job
        mockConversionJobs[projectId].status = 'paused';
        mockConversionJobs[projectId].currentTask = 'Conversion paused by user';

        return NextResponse.json({
            success: true,
            message: 'Conversion job paused successfully'
        });
    } catch (error) {
        console.error('Error pausing conversion job:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to pause conversion job'
        }, { status: 500 });
    }
}