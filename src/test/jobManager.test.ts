import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JobManagerService } from '@/services/jobManager';
import { ConversionPlan, ConversionTask, TechStack } from '@/types';

// Mock the ConversionQueueService
vi.mock('@/services/conversionQueue', () => ({
  ConversionQueueService: vi.fn().mockImplementation(() => ({
    startConversionJob: vi.fn().mockImplementation((jobId: string) => {
      if (jobId === 'non-existent') {
        return Promise.reject(new Error('Conversion job non-existent not found'));
      }
      return Promise.resolve('queue-job-1');
    }),
    pauseConversionJob: vi.fn().mockImplementation((jobId: string) => {
      if (jobId === 'non-existent') {
        return Promise.reject(new Error('Conversion job non-existent not found'));
      }
      return Promise.resolve(undefined);
    }),
    resumeConversionJob: vi.fn().mockImplementation((jobId: string) => {
      if (jobId === 'non-existent') {
        return Promise.reject(new Error('Conversion job non-existent not found'));
      }
      return Promise.resolve(undefined);
    }),
    getConversionJobStatus: vi.fn().mockResolvedValue('running'),
    getQueueStats: vi.fn().mockResolvedValue({
      waiting: 0,
      active: 1,
      completed: 0,
      failed: 0,
      delayed: 0,
      paused: 0,
    }),
    onJobProgress: vi.fn(),
    offJobProgress: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
  })),
}));

describe('JobManagerService Unit Tests', () => {
  let jobManager: JobManagerService;

  const mockTechStack: TechStack = {
    language: 'JavaScript',
    framework: 'React',
    additional: {},
  };

  const mockConversionTask: ConversionTask = {
    id: 'task-1',
    type: 'code_generation',
    description: 'Convert React component to Vue',
    inputFiles: ['src/components/Button.jsx'],
    outputFiles: ['src/components/Button.vue'],
    dependencies: [],
    agentType: 'code_generation',
    priority: 1,
    status: 'pending',
    estimatedDuration: 30000,
  };

  const mockConversionPlan: ConversionPlan = {
    id: 'plan-1',
    projectId: 'project-1',
    tasks: [mockConversionTask],
    estimatedDuration: 30000,
    complexity: 'medium',
    warnings: [],
    feasible: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    jobManager = new JobManagerService();
  });

  describe('Job Creation and Management', () => {
    it('should create a conversion job', async () => {
      const job = await jobManager.createConversionJob({
        projectId: 'project-1',
        plan: mockConversionPlan,
        status: 'pending',
        progress: 0,
      });

      expect(job).toHaveProperty('id');
      expect(job.projectId).toBe('project-1');
      expect(job.status).toBe('pending');
      expect(job.progress).toBe(0);
      expect(job.plan).toEqual(mockConversionPlan);
      expect(job.createdAt).toBeInstanceOf(Date);
    });

    it('should start a conversion job', async () => {
      const job = await jobManager.createConversionJob({
        projectId: 'project-1',
        plan: mockConversionPlan,
        status: 'pending',
        progress: 0,
      });

      await jobManager.startConversionJob(job.id, 'user-1');

      const updatedJob = await jobManager.getConversionJob(job.id);
      expect(updatedJob?.status).toBe('running');
      expect(updatedJob?.startedAt).toBeInstanceOf(Date);
    });

    it('should get a conversion job', async () => {
      const job = await jobManager.createConversionJob({
        projectId: 'project-1',
        plan: mockConversionPlan,
        status: 'pending',
        progress: 0,
      });

      const retrievedJob = await jobManager.getConversionJob(job.id);
      expect(retrievedJob).toEqual(job);
    });

    it('should return null for non-existent job', async () => {
      const job = await jobManager.getConversionJob('non-existent');
      expect(job).toBeNull();
    });

    it('should update a conversion job', async () => {
      const job = await jobManager.createConversionJob({
        projectId: 'project-1',
        plan: mockConversionPlan,
        status: 'pending',
        progress: 0,
      });

      const updatedJob = await jobManager.updateConversionJob(job.id, {
        status: 'running',
        progress: 50,
        currentTask: 'Processing files...',
      });

      expect(updatedJob.status).toBe('running');
      expect(updatedJob.progress).toBe(50);
      expect(updatedJob.currentTask).toBe('Processing files...');
    });

    it('should delete a conversion job', async () => {
      const job = await jobManager.createConversionJob({
        projectId: 'project-1',
        plan: mockConversionPlan,
        status: 'pending',
        progress: 0,
      });

      await jobManager.deleteConversionJob(job.id);

      const deletedJob = await jobManager.getConversionJob(job.id);
      expect(deletedJob).toBeNull();
    });
  });

  describe('Job State Management', () => {
    it('should pause a running conversion job', async () => {
      const job = await jobManager.createConversionJob({
        projectId: 'project-1',
        plan: mockConversionPlan,
        status: 'pending',
        progress: 0,
      });

      await jobManager.startConversionJob(job.id, 'user-1');
      await jobManager.pauseConversionJob(job.id);

      const pausedJob = await jobManager.getConversionJob(job.id);
      expect(pausedJob?.status).toBe('paused');
    });

    it('should resume a paused conversion job', async () => {
      const job = await jobManager.createConversionJob({
        projectId: 'project-1',
        plan: mockConversionPlan,
        status: 'pending',
        progress: 0,
      });

      await jobManager.startConversionJob(job.id, 'user-1');
      await jobManager.pauseConversionJob(job.id);
      await jobManager.resumeConversionJob(job.id);

      const resumedJob = await jobManager.getConversionJob(job.id);
      expect(resumedJob?.status).toBe('running');
    });

    it('should throw error when starting non-existent job', async () => {
      await expect(jobManager.startConversionJob('non-existent', 'user-1'))
        .rejects.toThrow('Conversion job non-existent not found');
    });

    it('should throw error when pausing non-existent job', async () => {
      await expect(jobManager.pauseConversionJob('non-existent'))
        .rejects.toThrow('Conversion job non-existent not found');
    });

    it('should throw error when resuming non-existent job', async () => {
      await expect(jobManager.resumeConversionJob('non-existent'))
        .rejects.toThrow('Conversion job non-existent not found');
    });

    it('should throw error when starting already running job', async () => {
      const job = await jobManager.createConversionJob({
        projectId: 'project-1',
        plan: mockConversionPlan,
        status: 'running', // Already running
        progress: 0,
      });

      await expect(jobManager.startConversionJob(job.id, 'user-1'))
        .rejects.toThrow('Cannot start job');
    });

    it('should throw error when pausing non-running job', async () => {
      const job = await jobManager.createConversionJob({
        projectId: 'project-1',
        plan: mockConversionPlan,
        status: 'pending', // Not running
        progress: 0,
      });

      await expect(jobManager.pauseConversionJob(job.id))
        .rejects.toThrow('Cannot pause job');
    });

    it('should throw error when resuming non-paused job', async () => {
      const job = await jobManager.createConversionJob({
        projectId: 'project-1',
        plan: mockConversionPlan,
        status: 'running', // Not paused
        progress: 0,
      });

      await expect(jobManager.resumeConversionJob(job.id))
        .rejects.toThrow('Cannot resume job');
    });
  });

  describe('Job Listing and Filtering', () => {
    it('should list all conversion jobs', async () => {
      const job1 = await jobManager.createConversionJob({
        projectId: 'project-1',
        plan: mockConversionPlan,
        status: 'pending',
        progress: 0,
      });

      const job2 = await jobManager.createConversionJob({
        projectId: 'project-2',
        plan: { ...mockConversionPlan, id: 'plan-2', projectId: 'project-2' },
        status: 'pending',
        progress: 0,
      });

      const allJobs = await jobManager.listConversionJobs();
      expect(allJobs).toHaveLength(2);
      
      // Should be sorted by creation date (newest first)
      expect(allJobs[0].createdAt.getTime()).toBeGreaterThanOrEqual(allJobs[1].createdAt.getTime());
    });

    it('should filter jobs by project ID', async () => {
      const job1 = await jobManager.createConversionJob({
        projectId: 'project-1',
        plan: mockConversionPlan,
        status: 'pending',
        progress: 0,
      });

      const job2 = await jobManager.createConversionJob({
        projectId: 'project-2',
        plan: { ...mockConversionPlan, id: 'plan-2', projectId: 'project-2' },
        status: 'pending',
        progress: 0,
      });

      const project1Jobs = await jobManager.listConversionJobs('project-1');
      expect(project1Jobs).toHaveLength(1);
      expect(project1Jobs[0].id).toBe(job1.id);
      expect(project1Jobs[0].projectId).toBe('project-1');
    });

    it('should return empty array for non-existent project', async () => {
      const jobs = await jobManager.listConversionJobs('non-existent-project');
      expect(jobs).toHaveLength(0);
    });
  });

  describe('Progress Handling', () => {
    it('should handle job progress updates', async () => {
      const job = await jobManager.createConversionJob({
        projectId: 'project-1',
        plan: mockConversionPlan,
        status: 'pending',
        progress: 0,
      });

      await jobManager.startConversionJob(job.id, 'user-1');

      // Simulate progress update
      const progressUpdate = {
        jobId: job.id,
        progress: 50,
        message: 'Processing files...',
        status: 'running' as const,
      };

      // Access private method for testing
      const handleProgressUpdate = (jobManager as any).handleJobProgressUpdate.bind(jobManager);
      handleProgressUpdate(progressUpdate);

      const updatedJob = await jobManager.getConversionJob(job.id);
      expect(updatedJob?.progress).toBe(50);
      expect(updatedJob?.currentTask).toBe('Processing files...');
      expect(updatedJob?.status).toBe('running');
    });

    it('should set completion time when job completes', async () => {
      const job = await jobManager.createConversionJob({
        projectId: 'project-1',
        plan: mockConversionPlan,
        status: 'pending',
        progress: 0,
      });

      await jobManager.startConversionJob(job.id, 'user-1');

      // Simulate completion
      const progressUpdate = {
        jobId: job.id,
        progress: 100,
        message: 'Conversion completed',
        status: 'completed' as const,
      };

      const handleProgressUpdate = (jobManager as any).handleJobProgressUpdate.bind(jobManager);
      handleProgressUpdate(progressUpdate);

      const completedJob = await jobManager.getConversionJob(job.id);
      expect(completedJob?.status).toBe('completed');
      expect(completedJob?.completedAt).toBeInstanceOf(Date);
    });

    it('should set error message when job fails', async () => {
      const job = await jobManager.createConversionJob({
        projectId: 'project-1',
        plan: mockConversionPlan,
        status: 'pending',
        progress: 0,
      });

      await jobManager.startConversionJob(job.id, 'user-1');

      // Simulate failure
      const progressUpdate = {
        jobId: job.id,
        progress: 50,
        message: 'Conversion failed: Invalid syntax',
        status: 'failed' as const,
      };

      const handleProgressUpdate = (jobManager as any).handleJobProgressUpdate.bind(jobManager);
      handleProgressUpdate(progressUpdate);

      const failedJob = await jobManager.getConversionJob(job.id);
      expect(failedJob?.status).toBe('failed');
      expect(failedJob?.errorMessage).toBe('Conversion failed: Invalid syntax');
      expect(failedJob?.completedAt).toBeInstanceOf(Date);
    });
  });

  describe('Queue Statistics', () => {
    it('should get queue statistics', async () => {
      const stats = await jobManager.getQueueStats();

      expect(stats).toHaveProperty('waiting');
      expect(stats).toHaveProperty('active');
      expect(stats).toHaveProperty('completed');
      expect(stats).toHaveProperty('failed');
      expect(stats).toHaveProperty('delayed');
      expect(stats).toHaveProperty('paused');

      expect(typeof stats.waiting).toBe('number');
      expect(typeof stats.active).toBe('number');
      expect(typeof stats.completed).toBe('number');
      expect(typeof stats.failed).toBe('number');
      expect(typeof stats.delayed).toBe('number');
      expect(typeof stats.paused).toBe('number');
    });
  });

  describe('Cleanup', () => {
    it('should shutdown gracefully', async () => {
      await expect(jobManager.shutdown()).resolves.not.toThrow();
    });
  });
});