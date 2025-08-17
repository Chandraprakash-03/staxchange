import Bull, { Queue, Job, JobOptions } from 'bull';
import { redisConnection } from '@/lib/redis';
import { QueueJob, QueueJobOptions, JobProgress, JobResult, QueueStats } from '@/types';
import { BaseService } from './base';

export abstract class BaseQueueService extends BaseService {
  protected queue: Queue | null = null;
  protected queueName: string;
  private initializationPromise: Promise<void> | null = null;

  constructor(queueName: string) {
    super();
    this.queueName = queueName;
  }

  private async initializeQueue(): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this._initializeQueue();
    return this.initializationPromise;
  }

  private async _initializeQueue(): Promise<void> {
    try {
      await redisConnection.connect();
      const redisClient = redisConnection.getClient();
      
      if (!redisClient) {
        throw new Error('Redis client not available');
      }

      // Create Bull queue with Redis connection
      this.queue = new Bull(this.queueName, {
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD,
        },
        defaultJobOptions: {
          removeOnComplete: 10,
          removeOnFail: 50,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      });

      // Set up event listeners
      this.setupEventListeners();
      
      this.log(`Queue ${this.queueName} initialized successfully`);
    } catch (error) {
      this.error('Failed to initialize queue:', error as Error);
      throw error;
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.queue) {
      await this.initializeQueue();
    }
  }

  private setupEventListeners(): void {
    if (!this.queue) return;
    
    this.queue.on('completed', (job: Job, result: any) => {
      this.log(`Job ${job.id} completed:`, result);
    });

    this.queue.on('failed', (job: Job, err: Error) => {
      this.error(`Job ${job.id} failed:`, err);
    });

    this.queue.on('progress', (job: Job, progress: number) => {
      this.log(`Job ${job.id} progress: ${progress}%`);
    });

    this.queue.on('stalled', (job: Job) => {
      this.error(`Job ${job.id} stalled`);
    });
  }

  async addJob<T>(
    jobType: string,
    data: T,
    options?: QueueJobOptions
  ): Promise<QueueJob<T>> {
    try {
      await this.ensureInitialized();
      if (!this.queue) {
        throw new Error('Queue not initialized');
      }

      const jobOptions: JobOptions = {
        priority: options?.priority,
        delay: options?.delay,
        attempts: options?.attempts || 3,
        backoff: options?.backoff || { type: 'exponential', delay: 2000 },
        removeOnComplete: options?.removeOnComplete || 10,
        removeOnFail: options?.removeOnFail || 50,
      };

      const job = await this.queue.add(jobType, data, jobOptions);
      
      return {
        id: job.id?.toString() || '',
        type: jobType,
        data,
        opts: options,
      };
    } catch (error) {
      this.error('Failed to add job to queue:', error as Error);
      throw error;
    }
  }

  async getJob(jobId: string): Promise<Job | null> {
    try {
      await this.ensureInitialized();
      if (!this.queue) {
        return null;
      }
      return await this.queue.getJob(jobId);
    } catch (error) {
      this.error('Failed to get job:', error as Error);
      return null;
    }
  }

  async updateJobProgress(jobId: string, progress: JobProgress): Promise<void> {
    try {
      const job = await this.getJob(jobId);
      if (job) {
        await job.progress(progress.percentage);
        // Store additional progress data in job data
        job.data.progressMessage = progress.message;
        job.data.progressData = progress.data;
      }
    } catch (error) {
      this.error('Failed to update job progress:', error as Error);
    }
  }

  async pauseJob(jobId: string): Promise<void> {
    try {
      const job = await this.getJob(jobId);
      if (job) {
        // Bull jobs don't have pause/resume methods, we need to use queue-level operations
        // For now, we'll simulate pausing by updating job data
        job.data.isPaused = true;
        await job.update(job.data);
      }
    } catch (error) {
      this.error('Failed to pause job:', error as Error);
      throw error;
    }
  }

  async resumeJob(jobId: string): Promise<void> {
    try {
      const job = await this.getJob(jobId);
      if (job) {
        // Resume by removing the pause flag
        job.data.isPaused = false;
        await job.update(job.data);
      }
    } catch (error) {
      this.error('Failed to resume job:', error as Error);
      throw error;
    }
  }

  async removeJob(jobId: string): Promise<void> {
    try {
      const job = await this.getJob(jobId);
      if (job) {
        await job.remove();
      }
    } catch (error) {
      this.error('Failed to remove job:', error as Error);
      throw error;
    }
  }

  async getQueueStats(): Promise<QueueStats> {
    try {
      await this.ensureInitialized();
      if (!this.queue) {
        throw new Error('Queue not initialized');
      }

      const [waiting, active, completed, failed, delayed] = await Promise.all([
        this.queue.getWaiting(),
        this.queue.getActive(),
        this.queue.getCompleted(),
        this.queue.getFailed(),
        this.queue.getDelayed(),
      ]);

      // getPaused is not available in all Bull versions, so we'll handle it separately
      let paused = [];
      try {
        paused = await (this.queue as any).getPaused?.() || [];
      } catch (error) {
        // getPaused not available, set to empty array
        paused = [];
      }

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
        paused: Array.isArray(paused) ? paused.length : 0,
      };
    } catch (error) {
      this.error('Failed to get queue stats:', error as Error);
      throw error;
    }
  }

  async pauseQueue(): Promise<void> {
    try {
      await this.ensureInitialized();
      if (!this.queue) {
        throw new Error('Queue not initialized');
      }
      await this.queue.pause();
      this.log(`Queue ${this.queueName} paused`);
    } catch (error) {
      this.error('Failed to pause queue:', error as Error);
      throw error;
    }
  }

  async resumeQueue(): Promise<void> {
    try {
      await this.ensureInitialized();
      if (!this.queue) {
        throw new Error('Queue not initialized');
      }
      await this.queue.resume();
      this.log(`Queue ${this.queueName} resumed`);
    } catch (error) {
      this.error('Failed to resume queue:', error as Error);
      throw error;
    }
  }

  async cleanQueue(grace: number = 0): Promise<void> {
    try {
      await this.ensureInitialized();
      if (!this.queue) {
        throw new Error('Queue not initialized');
      }
      await this.queue.clean(grace, 'completed');
      await this.queue.clean(grace, 'failed');
      this.log(`Queue ${this.queueName} cleaned`);
    } catch (error) {
      this.error('Failed to clean queue:', error as Error);
      throw error;
    }
  }

  async close(): Promise<void> {
    try {
      if (this.queue) {
        await this.queue.close();
        this.log(`Queue ${this.queueName} closed`);
      }
    } catch (error) {
      this.error('Failed to close queue:', error as Error);
      throw error;
    }
  }

  // Abstract method to be implemented by subclasses
  abstract processJob(job: Job): Promise<JobResult>;

  protected async startProcessing(): Promise<void> {
    await this.ensureInitialized();
    if (!this.queue) {
      throw new Error('Queue not initialized');
    }
    
    // Check if processing is already started to avoid duplicate handlers
    if ((this.queue as any)._processingStarted) {
      return;
    }
    
    this.queue.process('*', async (job: Job) => {
      try {
        this.log(`Processing job ${job.id} of type ${job.name}`);
        const result = await this.processJob(job);
        this.log(`Job ${job.id} completed successfully`);
        return result;
      } catch (error) {
        this.error(`Job ${job.id} failed:`, error as Error);
        throw error;
      }
    });
    
    // Mark processing as started
    (this.queue as any)._processingStarted = true;
  }
}