import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '@/types';

// Mock data storage - in real implementation, this would be in database
const mockConversionJobs: Record<string, any> = {};

// POST /api/projects/[id]/conversion/resume - Resume conversion job
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

        // Check if job can be resumed
        if (mockConversionJobs[projectId].status !== 'paused') {
            return NextResponse.json({
                success: false,
                error: 'Can only resume paused conversion jobs'
            }, { status: 400 });
        }

        // Resume the job
        mockConversionJobs[projectId].status = 'running';
        mockConversionJobs[projectId].currentTask = 'Resuming conversion process...';

        return NextResponse.json({
            success: true,
            message: 'Conversion job resumed successfully'
        });
    } catch (error) {
        console.error('Error resuming conversion job:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to resume conversion job'
        }, { status: 500 });
    }
}