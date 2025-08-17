import { BaseService } from './base';
import { ConversionQueueService } from './conversionQueue';
import { 
  ConversionJob, 
  ConversionPlan, 
  ConversionStatus, 
  JobProgressUpdate,
  CreateConversionJobInput,
  UpdateConversionJobInput
} from '@/types';
import { v4 as uuidv4 } from 'uuid';

export class JobManagerService extends BaseService {
  private conversionQueue: ConversionQueueService;
  private jobs: Map<string, ConversionJob> = new Map(); // In-memory storage for demo

  constructor() {
    super();
    this.conversionQueue = new ConversionQueueService();
  }

  async createConversionJob(input: CreateConversionJobInput): Promise<ConversionJob> {
    try {
      const jobId = uuidv4();
      const now = new Date();
      
      const job: ConversionJob = {
        id: jobId,
        projectId: input.projectId,
        plan: input.plan,
        status: input.status,
        progress: input.progress,
        createdAt: now,
        startedAt: input.startedAt,
        completedAt: input.completedAt,
        errorMessage: input.errorMessage,
        currentTask: input.currentTask,
        results: input.results,
      };

      // Store job (in real implementation, this would be in database)
      this.jobs.set(jobId, job);
      
      this.log(`Created conversion job ${jobId} for project ${input.projectId}`);
      return job;
    } catch (error) {
      this.error('Failed to create conversion job:', error as Error);
      throw error;
    }
  }

  async startConversionJob(jobId: string, userId: string): Promise<void> {
    try {
      const job = this.jobs.get(jobId);
      if (!job) {
        throw new Error(`Conversion job ${jobId} not found`);
      }

      if (job.status !== 'pending') {
        throw new Error(`Cannot start job ${jobId} with status ${job.status}`);
      }

      // Update job status
      job.status = 'running';
      job.startedAt = new Date();
      this.jobs.set(jobId, job);

      // Set up progress monitoring
      this.conversionQueue.onJobProgress(jobId, (update: JobProgressUpdate) => {
        this.handleJobProgressUpdate(update);
      });

      // Start the job in the queue
      await this.conversionQueue.startConversionJob(
        jobId,
        job.projectId,
        job.plan,
        userId
      );

      this.log(`Started conversion job ${jobId}`);
    } catch (error) {
      this.error('Failed to start conversion job:', error as Error);
      
      // Update job status to failed
      const job = this.jobs.get(jobId);
      if (job) {
        job.status = 'failed';
        job.errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.jobs.set(jobId, job);
      }
      
      throw error;
    }
  }

  async pauseConversionJob(jobId: string): Promise<void> {
    try {
      const job = this.jobs.get(jobId);
      if (!job) {
        throw new Error(`Conversion job ${jobId} not found`);
      }

      if (job.status !== 'running') {
        throw new Error(`Cannot pause job ${jobId} with status ${job.status}`);
      }

      await this.conversionQueue.pauseConversionJob(jobId);
      
      job.status = 'paused';
      this.jobs.set(jobId, job);
      
      this.log(`Paused conversion job ${jobId}`);
    } catch (error) {
      this.error('Failed to pause conversion job:', error as Error);
      throw error;
    }
  }

  async resumeConversionJob(jobId: string): Promise<void> {
    try {
      const job = this.jobs.get(jobId);
      if (!job) {
        throw new Error(`Conversion job ${jobId} not found`);
      }

      if (job.status !== 'paused') {
        throw new Error(`Cannot resume job ${jobId} with status ${job.status}`);
      }

      await this.conversionQueue.resumeConversionJob(jobId);
      
      job.status = 'running';
      this.jobs.set(jobId, job);
      
      this.log(`Resumed conversion job ${jobId}`);
    } catch (error) {
      this.error('Failed to resume conversion job:', error as Error);
      throw error;
    }
  }

  async getConversionJob(jobId: string): Promise<ConversionJob | null> {
    try {
      const job = this.jobs.get(jobId);
      if (!job) {
        return null;
      }

      // Update status from queue if job is active
      if (job.status === 'running' || job.status === 'pending') {
        const queueStatus = await this.conversionQueue.getConversionJobStatus(jobId);
        if (queueStatus !== job.status) {
          job.status = queueStatus;
          this.jobs.set(jobId, job);
        }
      }

      return job;
    } catch (error) {
      this.error('Failed to get conversion job:', error as Error);
      return null;
    }
  }

  async updateConversionJob(jobId: string, updates: UpdateConversionJobInput): Promise<ConversionJob> {
    try {
      const job = this.jobs.get(jobId);
      if (!job) {
        throw new Error(`Conversion job ${jobId} not found`);
      }

      // Apply updates
      Object.assign(job, updates);
      this.jobs.set(jobId, job);

      this.log(`Updated conversion job ${jobId}`);
      return job;
    } catch (error) {
      this.error('Failed to update conversion job:', error as Error);
      throw error;
    }
  }

  async deleteConversionJob(jobId: string): Promise<void> {
    try {
      const job = this.jobs.get(jobId);
      if (!job) {
        throw new Error(`Conversion job ${jobId} not found`);
      }

      // Cancel job if it's running
      if (job.status === 'running' || job.status === 'pending') {
        try {
          await this.conversionQueue.pauseConversionJob(jobId);
        } catch (error) {
          // Job might not be in queue anymore, continue with deletion
          this.log('Could not pause job during deletion, continuing...');
        }
      }

      // Remove progress callback
      this.conversionQueue.offJobProgress(jobId);

      // Delete job
      this.jobs.delete(jobId);
      
      this.log(`Deleted conversion job ${jobId}`);
    } catch (error) {
      this.error('Failed to delete conversion job:', error as Error);
      throw error;
    }
  }

  async listConversionJobs(projectId?: string): Promise<ConversionJob[]> {
    try {
      let jobs = Array.from(this.jobs.values());
      
      if (projectId) {
        jobs = jobs.filter(job => job.projectId === projectId);
      }

      // Sort by creation date (newest first)
      jobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      return jobs;
    } catch (error) {
      this.error('Failed to list conversion jobs:', error as Error);
      throw error;
    }
  }

  async getQueueStats() {
    try {
      return await this.conversionQueue.getQueueStats();
    } catch (error) {
      this.error('Failed to get queue stats:', error as Error);
      throw error;
    }
  }

  private handleJobProgressUpdate(update: JobProgressUpdate): void {
    try {
      const job = this.jobs.get(update.jobId);
      if (!job) {
        this.error(`Received progress update for unknown job: ${update.jobId}`);
        return;
      }

      // Update job with progress information
      job.progress = update.progress;
      job.status = update.status as ConversionStatus;
      job.currentTask = update.message;

      // Set completion time if job is completed or failed
      if (update.status === 'completed' || update.status === 'failed') {
        job.completedAt = new Date();
        
        if (update.status === 'failed') {
          job.errorMessage = update.message;
        }
        
        // Remove progress callback
        this.conversionQueue.offJobProgress(update.jobId);
      }

      this.jobs.set(update.jobId, job);
      
      this.log(`Job ${update.jobId} progress: ${update.progress}% - ${update.message}`);
    } catch (error) {
      this.error('Failed to handle job progress update:', error as Error);
    }
  }

  async shutdown(): Promise<void> {
    try {
      await this.conversionQueue.close();
      this.log('Job manager shut down successfully');
    } catch (error) {
      this.error('Failed to shutdown job manager:', error as Error);
      throw error;
    }
  }
}