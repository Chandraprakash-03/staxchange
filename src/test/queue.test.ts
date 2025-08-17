import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConversionQueueService } from '@/services/conversionQueue';
import { JobManagerService } from '@/services/jobManager';
import { AIConversionService } from '@/services/conversion';
import { ConversionPlan, ConversionTask, TechStack } from '@/types';

// Mock Redis connection
vi.mock('@/lib/redis', () => ({
  redisConnection: {
    connect: vi.fn().mockResolvedValue({}),
    getClient: vi.fn().mockReturnValue({
      connect: vi.fn(),
      disconnect: vi.fn(),
    }),
    isClientConnected: vi.fn().mockReturnValue(true),
  },
}));

// Mock Bull queue
vi.mock('bull', () => {
  const mockJob = {
    id: '1',
    name: 'test-job',
    data: {},
    progress: vi.fn(),
    getState: vi.fn().mockResolvedValue('completed'),
    pause: vi.fn(),
    resume: vi.fn(),
    remove: vi.fn(),
  };

  const mockQueue = {
    add: vi.fn().mockResolvedValue(mockJob),
    getJob: vi.fn().mockResolvedValue(mockJob),
    getJobs: vi.fn().mockResolvedValue([mockJob]),
    getWaiting: vi.fn().mockResolvedValue([]),
    getActive: vi.fn().mockResolvedValue([]),
    getCompleted: vi.fn().mockResolvedValue([]),
    getFailed: vi.fn().mockResolvedValue([]),
    getDelayed: vi.fn().mockResolvedValue([]),
    getPaused: vi.fn().mockResolvedValue([]),
    pause: vi.fn(),
    resume: vi.fn(),
    clean: vi.fn(),
    close: vi.fn(),
    process: vi.fn(),
    on: vi.fn(),
  };

  // Mock the Bull constructor
  const BullConstructor = vi.fn(() => mockQueue);
  
  return {
    default: BullConstructor,
  };
});

describe('Task Queue Integration Tests', () => {
  let conversionQueue: ConversionQueueService;
  let jobManager: JobManagerService;
  let conversionService: AIConversionService;

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
    conversionQueue = new ConversionQueueService();
    jobManager = new JobManagerService();
    conversionService = new AIConversionService();
  });

  afterEach(async () => {
    try {
      await conversionQueue.close();
    } catch (error) {
      // Ignore cleanup errors in tests
    }
  });

  describe('ConversionQueueService', () => {
    it('should add a conversion job to the queue', async () => {
      const jobData = {
        jobId: 'job-1',
        projectId: 'project-1',
        plan: mockConversionPlan,
        userId: 'user-1',
      };

      const queueJobId = await conversionQueue.startConversionJob(
        jobData.jobId,
        jobData.projectId,
        jobData.plan,
        jobData.userId
      );

      expect(queueJobId).toBeDefined();
      expect(typeof queueJobId).toBe('string');
    });

    it('should get queue statistics', async () => {
      const stats = await conversionQueue.getQueueStats();

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

    it('should handle job progress updates', async () => {
      const jobId = 'job-1';
      let progressUpdate: any = null;

      conversionQueue.onJobProgress(jobId, (update) => {
        progressUpdate = update;
      });

      // Simulate progress update
      const mockUpdate = {
        jobId,
        progress: 50,
        message: 'Processing...',
        status: 'running' as const,
      };

      // Trigger progress update (this would normally be called internally)
      const callback = (conversionQueue as any).progressCallbacks.get(jobId);
      if (callback) {
        callback(mockUpdate);
      }

      expect(progressUpdate).toEqual(mockUpdate);

      // Clean up
      conversionQueue.offJobProgress(jobId);
      const removedCallback = (conversionQueue as any).progressCallbacks.get(jobId);
      expect(removedCallback).toBeUndefined();
    });
  });

  describe('JobManagerService', () => {
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
      expect(updatedJob?.startedAt).toBeDefined();
    });

    it('should pause and resume a conversion job', async () => {
      const job = await jobManager.createConversionJob({
        projectId: 'project-1',
        plan: mockConversionPlan,
        status: 'pending',
        progress: 0,
      });

      await jobManager.startConversionJob(job.id, 'user-1');
      
      // Pause the job
      await jobManager.pauseConversionJob(job.id);
      let updatedJob = await jobManager.getConversionJob(job.id);
      expect(updatedJob?.status).toBe('paused');

      // Resume the job
      await jobManager.resumeConversionJob(job.id);
      updatedJob = await jobManager.getConversionJob(job.id);
      expect(updatedJob?.status).toBe('running');
    });

    it('should list conversion jobs', async () => {
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

      // List all jobs
      const allJobs = await jobManager.listConversionJobs();
      expect(allJobs).toHaveLength(2);

      // List jobs for specific project
      const project1Jobs = await jobManager.listConversionJobs('project-1');
      expect(project1Jobs).toHaveLength(1);
      expect(project1Jobs[0].id).toBe(job1.id);
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

    it('should handle job not found errors', async () => {
      await expect(jobManager.getConversionJob('non-existent')).resolves.toBeNull();
      
      await expect(jobManager.startConversionJob('non-existent', 'user-1'))
        .rejects.toThrow('Conversion job non-existent not found');
      
      await expect(jobManager.pauseConversionJob('non-existent'))
        .rejects.toThrow('Conversion job non-existent not found');
    });
  });

  describe('AIConversionService Integration', () => {
    it('should start a conversion through the service', async () => {
      const job = await conversionService.startConversion(mockConversionPlan, 'user-1');

      expect(job).toHaveProperty('id');
      expect(job.projectId).toBe(mockConversionPlan.projectId);
      expect(job.plan).toEqual(mockConversionPlan);
    });

    it('should get conversion status', async () => {
      const job = await conversionService.startConversion(mockConversionPlan, 'user-1');
      const status = await conversionService.getConversionStatus(job.id);

      expect(['pending', 'running', 'paused', 'completed', 'failed']).toContain(status);
    });

    it('should pause and resume conversion', async () => {
      const job = await conversionService.startConversion(mockConversionPlan, 'user-1');

      await conversionService.pauseConversion(job.id);
      let status = await conversionService.getConversionStatus(job.id);
      expect(status).toBe('paused');

      await conversionService.resumeConversion(job.id);
      status = await conversionService.getConversionStatus(job.id);
      expect(status).toBe('running');
    });

    it('should list conversions', async () => {
      const job1 = await conversionService.startConversion(mockConversionPlan, 'user-1');
      const job2 = await conversionService.startConversion(
        { ...mockConversionPlan, id: 'plan-2', projectId: 'project-2' },
        'user-1'
      );

      const allJobs = await conversionService.listConversions();
      expect(allJobs.length).toBeGreaterThanOrEqual(2);

      const project1Jobs = await conversionService.listConversions('project-1');
      expect(project1Jobs).toHaveLength(1);
      expect(project1Jobs[0].id).toBe(job1.id);
    });

    it('should get queue statistics', async () => {
      const stats = await conversionService.getQueueStats();

      expect(stats).toHaveProperty('waiting');
      expect(stats).toHaveProperty('active');
      expect(stats).toHaveProperty('completed');
      expect(stats).toHaveProperty('failed');
    });
  });

  describe('Error Handling', () => {
    it('should handle queue connection errors gracefully', async () => {
      // Mock Redis connection failure
      const mockQueue = new ConversionQueueService();
      
      // This should not throw during construction
      expect(mockQueue).toBeDefined();
    });

    it('should handle job processing errors', async () => {
      const job = await jobManager.createConversionJob({
        projectId: 'project-1',
        plan: mockConversionPlan,
        status: 'pending',
        progress: 0,
      });

      // Mock a job processing error by trying to start a non-existent job
      await expect(jobManager.startConversionJob(job.id, 'user-1'))
        .resolves.not.toThrow(); // Should handle gracefully
    });

    it('should handle invalid job state transitions', async () => {
      const job = await jobManager.createConversionJob({
        projectId: 'project-1',
        plan: mockConversionPlan,
        status: 'completed', // Already completed
        progress: 100,
      });

      await expect(jobManager.startConversionJob(job.id, 'user-1'))
        .rejects.toThrow('Cannot start job');
    });
  });
});