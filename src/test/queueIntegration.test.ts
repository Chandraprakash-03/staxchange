import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AIConversionService } from '@/services/conversion';
import { ConversionPlan, ConversionTask, TechStack } from '@/types';

// Mock Redis and Bull for integration tests
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

  const BullConstructor = vi.fn(() => mockQueue);
  return {
    default: BullConstructor,
  };
});

describe('Queue Integration Tests', () => {
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
    conversionService = new AIConversionService();
  });

  afterEach(async () => {
    try {
      await conversionService.shutdown();
    } catch (error) {
      // Ignore cleanup errors in tests
    }
  });

  describe('End-to-End Conversion Flow', () => {
    it('should create and start a conversion job', async () => {
      const job = await conversionService.startConversion(mockConversionPlan, 'user-1');

      expect(job).toHaveProperty('id');
      expect(job.projectId).toBe('project-1');
      expect(job.status).toBe('running');
      expect(job.plan).toEqual(mockConversionPlan);
    });

    it('should get conversion job status', async () => {
      const job = await conversionService.startConversion(mockConversionPlan, 'user-1');
      const status = await conversionService.getConversionStatus(job.id);

      expect(['pending', 'running', 'paused', 'completed', 'failed']).toContain(status);
    });

    it('should list conversion jobs', async () => {
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

    it('should pause and resume conversion jobs', async () => {
      const job = await conversionService.startConversion(mockConversionPlan, 'user-1');

      // Pause the job
      await conversionService.pauseConversion(job.id);
      let status = await conversionService.getConversionStatus(job.id);
      expect(status).toBe('paused');

      // Resume the job
      await conversionService.resumeConversion(job.id);
      status = await conversionService.getConversionStatus(job.id);
      expect(status).toBe('running');
    });

    it('should delete conversion jobs', async () => {
      const job = await conversionService.startConversion(mockConversionPlan, 'user-1');

      await conversionService.deleteConversion(job.id);

      const deletedJob = await conversionService.getConversionJob(job.id);
      expect(deletedJob).toBeNull();
    });

    it('should get queue statistics', async () => {
      const stats = await conversionService.getQueueStats();

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

  describe('Error Handling', () => {
    it('should handle non-existent job operations', async () => {
      await expect(conversionService.getConversionStatus('non-existent'))
        .rejects.toThrow('Conversion job non-existent not found');

      await expect(conversionService.pauseConversion('non-existent'))
        .rejects.toThrow('Conversion job non-existent not found');

      await expect(conversionService.resumeConversion('non-existent'))
        .rejects.toThrow('Conversion job non-existent not found');
    });

    it('should handle invalid state transitions', async () => {
      const job = await conversionService.startConversion(mockConversionPlan, 'user-1');

      // Try to pause and then pause again (should fail)
      await conversionService.pauseConversion(job.id);
      await expect(conversionService.pauseConversion(job.id))
        .rejects.toThrow('Cannot pause job');
    });
  });

  describe('Service Lifecycle', () => {
    it('should shutdown gracefully', async () => {
      const service = new AIConversionService();
      await expect(service.shutdown()).resolves.not.toThrow();
    });
  });
});