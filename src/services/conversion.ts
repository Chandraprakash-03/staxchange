import { BaseService } from './base';
import { JobManagerService } from './jobManager';
import { ConversionPlan, ConversionJob, ConversionStatus } from '@/types';

export class AIConversionService extends BaseService {
  private jobManager: JobManagerService;

  constructor() {
    super();
    this.jobManager = new JobManagerService();
  }

  async startConversion(plan: ConversionPlan, userId: string = 'system'): Promise<ConversionJob> {
    try {
      this.log('Starting conversion for plan:', plan.id);
      
      // Create a new conversion job
      const job = await this.jobManager.createConversionJob({
        projectId: plan.projectId,
        plan,
        status: 'pending',
        progress: 0,
      });

      // Start the job
      await this.jobManager.startConversionJob(job.id, userId);
      
      this.log(`Conversion job ${job.id} started successfully`);
      return job;
    } catch (error) {
      this.error('Failed to start conversion:', error as Error);
      throw error;
    }
  }

  async getConversionStatus(jobId: string): Promise<ConversionStatus> {
    try {
      this.log('Getting conversion status for job:', jobId);
      
      const job = await this.jobManager.getConversionJob(jobId);
      if (!job) {
        throw new Error(`Conversion job ${jobId} not found`);
      }
      
      return job.status;
    } catch (error) {
      this.error('Failed to get conversion status:', error as Error);
      throw error;
    }
  }

  async getConversionJob(jobId: string): Promise<ConversionJob | null> {
    try {
      return await this.jobManager.getConversionJob(jobId);
    } catch (error) {
      this.error('Failed to get conversion job:', error as Error);
      return null;
    }
  }

  async pauseConversion(jobId: string): Promise<void> {
    try {
      this.log('Pausing conversion job:', jobId);
      await this.jobManager.pauseConversionJob(jobId);
    } catch (error) {
      this.error('Failed to pause conversion:', error as Error);
      throw error;
    }
  }

  async resumeConversion(jobId: string): Promise<void> {
    try {
      this.log('Resuming conversion job:', jobId);
      await this.jobManager.resumeConversionJob(jobId);
    } catch (error) {
      this.error('Failed to resume conversion:', error as Error);
      throw error;
    }
  }

  async listConversions(projectId?: string): Promise<ConversionJob[]> {
    try {
      return await this.jobManager.listConversionJobs(projectId);
    } catch (error) {
      this.error('Failed to list conversions:', error as Error);
      throw error;
    }
  }

  async deleteConversion(jobId: string): Promise<void> {
    try {
      this.log('Deleting conversion job:', jobId);
      await this.jobManager.deleteConversionJob(jobId);
    } catch (error) {
      this.error('Failed to delete conversion:', error as Error);
      throw error;
    }
  }

  async getQueueStats() {
    try {
      return await this.jobManager.getQueueStats();
    } catch (error) {
      this.error('Failed to get queue stats:', error as Error);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    try {
      await this.jobManager.shutdown();
      this.log('Conversion service shut down successfully');
    } catch (error) {
      this.error('Failed to shutdown conversion service:', error as Error);
      throw error;
    }
  }
}