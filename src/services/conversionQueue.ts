import { Job } from 'bull';
import { BaseQueueService } from './queue';
import { ConversionEngine } from './conversionEngine';
import { OpenRouterClient } from './openrouter';
import {
    ConversionJobData,
    ConversionTaskJobData,
    JobResult,
    JobProgressUpdate,
    ConversionJob,
    ConversionTask,
    TaskStatus,
    ConversionStatus,
    FileTree,
    TechStack
} from '@/types';

export class ConversionQueueService extends BaseQueueService {
    private progressCallbacks: Map<string, (update: JobProgressUpdate) => void> = new Map();
    private processingStarted = false;
    private conversionEngine: ConversionEngine;
    private aiClient: OpenRouterClient;

    constructor() {
        super('conversion-queue');
        this.aiClient = new OpenRouterClient({
            apiKey: process.env.OPENROUTER_API_KEY || ''
          });
        this.conversionEngine = new ConversionEngine(this.aiClient, {
            maxConcurrentFiles: 3,
            preserveContext: true,
            validateResults: true, 
            enableRetry: true,
            maxRetries: 2,
        });
    }

    private async ensureProcessingStarted(): Promise<void> {
        if (!this.processingStarted) {
            await this.startProcessing();
            this.processingStarted = true;
        }
    }

    async processJob(job: Job): Promise<JobResult> {
        const startTime = Date.now();

        try {
            switch (job.name) {
                case 'conversion-job':
                    return await this.processConversionJob(job);
                case 'conversion-task':
                    return await this.processConversionTask(job);
                default:
                    throw new Error(`Unknown job type: ${job.name}`);
            }
        } catch (error) {
            const duration = Date.now() - startTime;
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                duration,
            };
        }
    }

    private async processConversionJob(job: Job<ConversionJobData>): Promise<JobResult> {
        const { jobId, projectId, plan, userId } = job.data;

        this.log(`Processing conversion job ${jobId} for project ${projectId}`);

        try {
            // Update job status to running
            await this.updateJobStatus(jobId, 'running', 0, 'Starting conversion...');

            // Get project data (in real implementation, this would come from database)
            const { sourceFiles, sourceTechStack, targetTechStack } = await this.getProjectData(projectId);

            // Set up progress monitoring
            const progressCallback = (progress: number, message: string) => {
                this.updateJobStatus(jobId, 'running', progress, message);
            };

            // Execute conversion using the conversion engine
            await this.updateJobStatus(jobId, 'running', 10, 'Initializing conversion engine...');

            const conversionResults = await this.conversionEngine.executeConversion(
                plan,
                sourceFiles,
                sourceTechStack,
                targetTechStack
            );

            // Process results
            const successfulResults = conversionResults.filter(r => r.status === 'success');
            const failedResults = conversionResults.filter(r => r.status === 'error');

            if (failedResults.length > 0) {
                const errorMessage = `${failedResults.length} tasks failed: ${failedResults.map(r => r.error).join('; ')}`;
                await this.updateJobStatus(jobId, 'failed', 90, errorMessage);

                return {
                    success: false,
                    error: errorMessage,
                    data: {
                        jobId,
                        successfulTasks: successfulResults.length,
                        failedTasks: failedResults.length,
                        results: conversionResults
                    },
                    duration: Date.now() - Date.now(),
                };
            }

            // Mark job as completed
            await this.updateJobStatus(jobId, 'completed', 100, 'Conversion completed successfully');

            return {
                success: true,
                data: {
                    jobId,
                    completedTasks: successfulResults.length,
                    totalTasks: plan.tasks.length,
                    results: conversionResults
                },
                duration: Date.now() - Date.now(),
            };

        } catch (error) {
            await this.updateJobStatus(
                jobId,
                'failed',
                0,
                `Conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
            throw error;
        }
    }

    private async processConversionTask(job: Job<ConversionTaskJobData>): Promise<JobResult> {
        const { taskId, jobId, task, context } = job.data;

        this.log(`Processing conversion task ${taskId} for job ${jobId}`);

        try {
            // Update task status to running
            await this.updateTaskStatus(taskId, 'running');

            // Individual tasks are now handled by the conversion engine
            // This method is kept for backward compatibility but tasks are processed
            // as part of the full conversion job

            // Update task status to completed
            await this.updateTaskStatus(taskId, 'completed');

            return {
                success: true,
                data: { taskId, type: task.type },
                duration: Date.now() - Date.now(),
            };

        } catch (error) {
            await this.updateTaskStatus(taskId, 'failed');
            throw error;
        }
    }

    private async simulateTaskProcessing(task: ConversionTask, job: Job): Promise<void> {
        // Simulate processing time based on task complexity
        const baseTime = 1000; // 1 second base
        const complexityMultiplier = task.priority || 1;
        const processingTime = baseTime * complexityMultiplier;

        // Simulate progress updates
        const steps = 10;
        const stepTime = processingTime / steps;

        for (let i = 1; i <= steps; i++) {
            await new Promise(resolve => setTimeout(resolve, stepTime));
            const progress = (i / steps) * 100;
            await job.progress(progress);

            this.log(`Task ${task.id} progress: ${progress}%`);
        }
    }

    private async waitForJobCompletion(jobId: string): Promise<void> {
        // Simplified implementation - in reality you'd use Bull's events
        return new Promise((resolve, reject) => {
            const checkInterval = setInterval(async () => {
                try {
                    const job = await this.getJob(jobId);
                    if (!job) {
                        clearInterval(checkInterval);
                        reject(new Error('Job not found'));
                        return;
                    }

                    const state = await job.getState();
                    if (state === 'completed') {
                        clearInterval(checkInterval);
                        resolve();
                    } else if (state === 'failed') {
                        clearInterval(checkInterval);
                        reject(new Error('Job failed'));
                    }
                } catch (error) {
                    clearInterval(checkInterval);
                    reject(error);
                }
            }, 1000);

            // Timeout after 5 minutes
            setTimeout(() => {
                clearInterval(checkInterval);
                reject(new Error('Job timeout'));
            }, 5 * 60 * 1000);
        });
    }

    async startConversionJob(
        jobId: string,
        projectId: string,
        plan: any,
        userId: string
    ): Promise<string> {
        await this.ensureProcessingStarted();

        const jobData: ConversionJobData = {
            jobId,
            projectId,
            plan,
            userId,
        };

        const queueJob = await this.addJob('conversion-job', jobData, {
            priority: 1,
            attempts: 1, // Conversion jobs should not be retried automatically
        });

        this.log(`Started conversion job ${jobId} with queue job ID ${queueJob.id}`);
        return queueJob.id;
    }

    async pauseConversionJob(jobId: string): Promise<void> {
        try {
            await this.ensureProcessingStarted();
            if (!this.queue) {
                throw new Error('Queue not initialized');
            }

            // Find the job by data.jobId since that's our business logic ID
            const jobs = await this.queue.getJobs(['active', 'waiting', 'delayed']);
            const job = jobs.find(j => j.data.jobId === jobId);

            if (job) {
                await this.pauseJob(job.id?.toString() || '');
                await this.updateJobStatus(jobId, 'paused', undefined, 'Job paused by user');
            } else {
                throw new Error(`Conversion job ${jobId} not found`);
            }
        } catch (error) {
            this.error('Failed to pause conversion job:', error as Error);
            throw error;
        }
    }

    async resumeConversionJob(jobId: string): Promise<void> {
        try {
            await this.ensureProcessingStarted();
            if (!this.queue) {
                throw new Error('Queue not initialized');
            }

            // Find the job by data.jobId
            const jobs = await this.queue.getJobs(['paused']);
            const job = jobs.find(j => j.data.jobId === jobId);

            if (job) {
                await this.resumeJob(job.id?.toString() || '');
                await this.updateJobStatus(jobId, 'running', undefined, 'Job resumed');
            } else {
                throw new Error(`Paused conversion job ${jobId} not found`);
            }
        } catch (error) {
            this.error('Failed to resume conversion job:', error as Error);
            throw error;
        }
    }

    async getConversionJobStatus(jobId: string): Promise<ConversionStatus> {
        try {
            await this.ensureProcessingStarted();
            if (!this.queue) {
                return 'failed';
            }

            // In a real implementation, this would query the database
            // For now, we'll try to find the job in the queue
            const jobs = await this.queue.getJobs(['active', 'waiting', 'completed', 'failed', 'paused']);
            const job = jobs.find(j => j.data.jobId === jobId);

            if (!job) {
                return 'pending'; // Default status if not found in queue
            }

            const state = await job.getState();
            switch (state) {
                case 'active':
                    return 'running';
                case 'waiting':
                case 'delayed':
                    return 'pending';
                case 'completed':
                    return 'completed';
                case 'failed':
                    return 'failed';
                case 'paused':
                    return 'paused';
                default:
                    return 'pending';
            }
        } catch (error) {
            this.error('Failed to get conversion job status:', error as Error);
            return 'failed';
        }
    }

    private async updateJobStatus(
        jobId: string,
        status: ConversionStatus,
        progress?: number,
        message?: string
    ): Promise<void> {
        const update: JobProgressUpdate = {
            jobId,
            progress: progress || 0,
            message: message || '',
            status,
        };

        // Notify any registered callbacks
        const callback = this.progressCallbacks.get(jobId);
        if (callback) {
            callback(update);
        }

        // In a real implementation, this would update the database
        this.log(`Job ${jobId} status update:`, update);
    }

    private async updateTaskStatus(taskId: string, status: TaskStatus): Promise<void> {
        // In a real implementation, this would update the database
        this.log(`Task ${taskId} status: ${status}`);
    }

    onJobProgress(jobId: string, callback: (update: JobProgressUpdate) => void): void {
        this.progressCallbacks.set(jobId, callback);
    }

    offJobProgress(jobId: string): void {
        this.progressCallbacks.delete(jobId);
    }

    private async getProjectData(projectId: string): Promise<{
        sourceFiles: FileTree;
        sourceTechStack: TechStack;
        targetTechStack: TechStack;
    }> {
        // In a real implementation, this would fetch from database
        // For now, return mock data structure
        const mockSourceFiles: FileTree = {
            name: 'project-root',
            type: 'directory',
            path: '/',
            children: [
                {
                    name: 'src',
                    type: 'directory',
                    path: '/src',
                    children: [
                        {
                            name: 'index.js',
                            type: 'file',
                            path: '/src/index.js',
                            content: 'console.log("Hello World");',
                            metadata: {
                                size: 100,
                                lastModified: new Date(),
                                mimeType: 'application/javascript'
                            }
                        }
                    ],
                    metadata: {
                        size: 0,
                        lastModified: new Date()
                    }
                }
            ],
            metadata: {
                size: 0,
                lastModified: new Date()
            }
        };

        const mockSourceTechStack: TechStack = {
            language: 'javascript',
            framework: 'react',
            runtime: 'node',
            additional: {}
        };

        const mockTargetTechStack: TechStack = {
            language: 'typescript',
            framework: 'react',
            runtime: 'node',
            additional: {}
        };

        return {
            sourceFiles: mockSourceFiles,
            sourceTechStack: mockSourceTechStack,
            targetTechStack: mockTargetTechStack
        };
    }

    async cleanup(): Promise<void> {
        if (this.conversionEngine) {
            await this.conversionEngine.cleanup();
        }
        await super.close();
    }
}