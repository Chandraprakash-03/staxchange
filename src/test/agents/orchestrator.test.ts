// Unit tests for AgentOrchestrator

import { AgentOrchestrator } from '../../agents/orchestrator';
import { AgentContext } from '../../agents/types';
import { ConversionPlan, ConversionTask } from '../../types';
import { OpenRouterClient } from '../../services/openrouter';
import { describe, beforeEach, it, expect } from 'vitest';

import { vi } from 'vitest';

// Mock OpenRouter client
const mockOpenRouterClient = {
  generateCompletion: vi.fn().mockResolvedValue('Mock AI response'),
  generateChat: vi.fn().mockResolvedValue('Mock chat response')
} as unknown as OpenRouterClient;

describe('AgentOrchestrator', () => {
  let orchestrator: AgentOrchestrator;
  let mockContext: AgentContext;
  let mockPlan: ConversionPlan;

  beforeEach(() => {
    orchestrator = new AgentOrchestrator(mockOpenRouterClient, 2);
    
    mockContext = {
      projectId: 'test-project',
      sourceFiles: {
        name: 'root',
        type: 'directory',
        path: '/',
        children: [
          {
            name: 'index.js',
            type: 'file',
            path: '/index.js',
            content: 'console.log("hello");',
            metadata: { size: 100, lastModified: new Date() }
          }
        ],
        metadata: { size: 0, lastModified: new Date() }
      },
      targetTechStack: {
        language: 'typescript',
        framework: 'react',
        additional: {}
      },
      sourceTechStack: {
        language: 'javascript',
        framework: 'vanilla',
        additional: {}
      },
      conversionPlan: {} as ConversionPlan, // Will be set in tests
      sharedData: {}
    };

    const mockTasks: ConversionTask[] = [
      {
        id: 'task-1',
        type: 'analysis',
        description: 'Analyze source code',
        inputFiles: ['/index.js'],
        outputFiles: ['analysis.json'],
        dependencies: [],
        agentType: 'analysis',
        priority: 1,
        status: 'pending',
        estimatedDuration: 300
      },
      {
        id: 'task-2',
        type: 'code_generation',
        description: 'Convert JavaScript to TypeScript',
        inputFiles: ['/index.js'],
        outputFiles: ['/index.ts'],
        dependencies: ['task-1'],
        agentType: 'code_generation',
        priority: 2,
        status: 'pending',
        estimatedDuration: 600
      },
      {
        id: 'task-3',
        type: 'validation',
        description: 'Validate converted code',
        inputFiles: ['/index.ts'],
        outputFiles: ['validation.json'],
        dependencies: ['task-2'],
        agentType: 'validation',
        priority: 3,
        status: 'pending',
        estimatedDuration: 200
      }
    ];

    mockPlan = {
      id: 'plan-1',
      projectId: 'test-project',
      tasks: mockTasks,
      estimatedDuration: 1100,
      complexity: 'medium',
      warnings: [],
      feasible: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    mockContext.conversionPlan = mockPlan;
  });

  describe('constructor', () => {
    it('should initialize with default agents', () => {
      const agents = orchestrator.getRegisteredAgents();
      expect(agents).toHaveLength(5); // Analysis, Planning, CodeGeneration, Validation, Integration
      
      const agentTypes = agents.map(agent => agent.type);
      expect(agentTypes).toContain('analysis');
      expect(agentTypes).toContain('planning');
      expect(agentTypes).toContain('code_generation');
      expect(agentTypes).toContain('validation');
      expect(agentTypes).toContain('integration');
    });

    it('should set max concurrent tasks', () => {
      expect((orchestrator as any).maxConcurrentTasks).toBe(2);
    });
  });

  describe('createWorkflow', () => {
    it('should create workflow with correct structure', async () => {
      const workflow = await orchestrator.createWorkflow(mockPlan, mockContext);
      
      expect(workflow.id).toBeDefined();
      expect(workflow.projectId).toBe('test-project');
      expect(workflow.tasks.size).toBe(3);
      expect(workflow.status).toBe('pending');
      expect(workflow.progress).toBe(0);
      expect(workflow.context).toBe(mockContext);
    });

    it('should convert conversion tasks to workflow tasks', async () => {
      const workflow = await orchestrator.createWorkflow(mockPlan, mockContext);
      
      const task1 = workflow.tasks.get('task-1');
      expect(task1).toBeDefined();
      expect(task1!.conversionTask.type).toBe('analysis');
      expect(task1!.status).toBe('pending');
      expect(task1!.retryCount).toBe(0);
      expect(task1!.maxRetries).toBe(3);
    });

    it('should preserve task dependencies', async () => {
      const workflow = await orchestrator.createWorkflow(mockPlan, mockContext);
      
      const task2 = workflow.tasks.get('task-2');
      expect(task2!.dependencies).toEqual(['task-1']);
      
      const task3 = workflow.tasks.get('task-3');
      expect(task3!.dependencies).toEqual(['task-2']);
    });
  });

  describe('executeWorkflow', () => {
    it('should execute workflow successfully', async () => {
      const workflow = await orchestrator.createWorkflow(mockPlan, mockContext);
      
      // Mock successful execution for all agents
      vi.spyOn(orchestrator as any, 'executeTask').mockResolvedValue({
        success: true,
        output: { result: 'success' },
        files: []
      });

      const result = await orchestrator.executeWorkflow(workflow.id);
      
      expect(result.status).toBe('completed');
      expect(result.completedTasks).toBe(3);
      expect(result.totalTasks).toBe(3);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle task failures with retries', async () => {
      const workflow = await orchestrator.createWorkflow(mockPlan, mockContext);
      
      let callCount = 0;
      vi.spyOn(orchestrator as any, 'executeTask').mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('First attempt failed'));
        }
        return Promise.resolve({
          success: true,
          output: { result: 'success after retry' },
          files: []
        });
      });

      const result = await orchestrator.executeWorkflow(workflow.id);
      
      expect(result.status).toBe('completed');
      expect(callCount).toBeGreaterThan(3); // Original calls + retries
    });

    it('should fail workflow on critical task failures', async () => {
      const workflow = await orchestrator.createWorkflow(mockPlan, mockContext);
      
      // Mock failure for analysis task (critical)
      vi.spyOn(orchestrator as any, 'executeTask').mockImplementation((task: any) => {
        if (task.conversionTask.type === 'analysis') {
          return Promise.reject(new Error('Analysis failed'));
        }
        return Promise.resolve({
          success: true,
          output: { result: 'success' },
          files: []
        });
      });

      const result = await orchestrator.executeWorkflow(workflow.id);
      
      expect(result.status).toBe('failed');
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should update workflow progress during execution', async () => {
      const workflow = await orchestrator.createWorkflow(mockPlan, mockContext);
      
      let progressUpdates: number[] = [];
      const originalExecuteTask = (orchestrator as any).executeTask;
      
      // Mock successful execution
      vi.spyOn(orchestrator as any, 'executeTask').mockResolvedValue({
        success: true,
        output: { result: 'success' },
        files: []
      });

      await orchestrator.executeWorkflow(workflow.id);
      
      const finalWorkflow = orchestrator.getWorkflowStatus(workflow.id);
      expect(finalWorkflow!.progress).toBe(100);
    });

    it('should throw error for non-existent workflow', async () => {
      await expect(orchestrator.executeWorkflow('non-existent')).rejects.toThrow('Workflow non-existent not found');
    });
  });

  describe('workflow management', () => {
    it('should pause and resume workflow', async () => {
      const workflow = await orchestrator.createWorkflow(mockPlan, mockContext);
      
      await orchestrator.pauseWorkflow(workflow.id);
      const pausedWorkflow = orchestrator.getWorkflowStatus(workflow.id);
      expect(pausedWorkflow?.status).toBe('paused');
      
      await orchestrator.resumeWorkflow(workflow.id);
      const resumedWorkflow = orchestrator.getWorkflowStatus(workflow.id);
      expect(resumedWorkflow!.status).toBe('running');
    });

    it('should cancel workflow', async () => {
      const workflow = await orchestrator.createWorkflow(mockPlan, mockContext);
      
      await orchestrator.cancelWorkflow(workflow.id);
      const cancelledWorkflow = orchestrator.getWorkflowStatus(workflow.id);
      
      expect(cancelledWorkflow!.status).toBe('failed');
      
      // All tasks should be marked as failed
      cancelledWorkflow!.tasks.forEach(task => {
        if (task.status !== 'completed') {
          expect(task.status).toBe('failed');
        }
      });
    });

    it('should retry failed tasks', async () => {
      const workflow = await orchestrator.createWorkflow(mockPlan, mockContext);
      
      // Manually set some tasks as failed
      const task1 = workflow.tasks.get('task-1')!;
      task1.status = 'failed';
      task1.retryCount = 1;
      
      await orchestrator.retryFailedTasks(workflow.id);
      
      const updatedTask = workflow.tasks.get('task-1')!;
      expect(updatedTask.status).toBe('pending');
      expect(updatedTask.retryCount).toBe(0);
    });
  });

  describe('task execution order', () => {
    it('should calculate correct execution order based on dependencies', () => {
      const workflow = {
        tasks: new Map([
          ['task-1', { id: 'task-1', dependencies: [] }],
          ['task-2', { id: 'task-2', dependencies: ['task-1'] }],
          ['task-3', { id: 'task-3', dependencies: ['task-2'] }],
          ['task-4', { id: 'task-4', dependencies: ['task-1'] }] // Parallel with task-2
        ])
      } as any;

      const executionOrder = (orchestrator as any).calculateExecutionOrder(workflow);
      
      expect(executionOrder).toHaveLength(3); // 3 batches
      expect(executionOrder[0]).toEqual(['task-1']); // First batch
      expect(executionOrder[1]).toEqual(expect.arrayContaining(['task-2', 'task-4'])); // Second batch (parallel)
      expect(executionOrder[2]).toEqual(['task-3']); // Third batch
    });

    it('should handle circular dependencies gracefully', () => {
      const workflow = {
        tasks: new Map([
          ['task-1', { id: 'task-1', dependencies: ['task-2'] }],
          ['task-2', { id: 'task-2', dependencies: ['task-1'] }]
        ])
      } as any;

      const executionOrder = (orchestrator as any).calculateExecutionOrder(workflow);
      
      // Should still produce an execution order despite circular dependency
      expect(executionOrder.length).toBeGreaterThan(0);
      expect(executionOrder.flat()).toEqual(expect.arrayContaining(['task-1', 'task-2']));
    });
  });

  describe('agent management', () => {
    it('should register and unregister agents', () => {
      const mockAgent = {
        name: 'MockAgent',
        type: 'mock',
        capabilities: ['mock'],
        execute: vi.fn(),
        canHandle: vi.fn(),
        validate: vi.fn()
      };

      orchestrator.registerAgent(mockAgent);
      expect(orchestrator.getRegisteredAgents()).toContain(mockAgent);

      orchestrator.unregisterAgent('mock');
      expect(orchestrator.getRegisteredAgents()).not.toContain(mockAgent);
    });

    it('should get agent metrics', () => {
      const metrics = orchestrator.getAgentMetrics();
      expect(metrics.size).toBeGreaterThan(0);
      
      // Each agent should have metrics
      metrics.forEach((metric, agentType) => {
        expect(metric).toHaveProperty('executionCount');
        expect(metric).toHaveProperty('successRate');
        expect(metric).toHaveProperty('averageExecutionTime');
      });
    });
  });

  describe('workflow monitoring', () => {
    it('should track active workflows', async () => {
      const workflow1 = await orchestrator.createWorkflow(mockPlan, mockContext);
      const workflow2 = await orchestrator.createWorkflow(mockPlan, mockContext);
      
      workflow1.status = 'running';
      workflow2.status = 'paused';

      const activeWorkflows = orchestrator.getActiveWorkflows();
      expect(activeWorkflows).toHaveLength(2);
      expect(activeWorkflows.map(w => w.id)).toEqual(expect.arrayContaining([workflow1.id, workflow2.id]));
    });

    it('should track workflow history', async () => {
      const workflow1 = await orchestrator.createWorkflow(mockPlan, mockContext);
      const workflow2 = await orchestrator.createWorkflow(mockPlan, mockContext);
      
      workflow1.status = 'completed';
      workflow1.completedAt = new Date();
      workflow2.status = 'failed';
      workflow2.completedAt = new Date();

      const history = orchestrator.getWorkflowHistory();
      expect(history).toHaveLength(2);
      expect(history.every(w => w.status === 'completed' || w.status === 'failed')).toBe(true);
    });

    it('should cleanup old workflows', async () => {
      const workflow = await orchestrator.createWorkflow(mockPlan, mockContext);
      
      // Set completion time to more than 24 hours ago
      workflow.completedAt = new Date(Date.now() - 25 * 60 * 60 * 1000);
      workflow.status = 'completed';

      await orchestrator.cleanup();
      
      const status = orchestrator.getWorkflowStatus(workflow.id);
      expect(status).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should handle agent selection failure', async () => {
      const workflow = await orchestrator.createWorkflow(mockPlan, mockContext);
      
      // Create a task with unsupported agent type
      const unsupportedTask = {
        id: 'unsupported-task',
        conversionTask: {
          id: 'unsupported',
          type: 'unsupported',
          agentType: 'unsupported',
          description: 'Unsupported task',
          inputFiles: [],
          outputFiles: [],
          dependencies: [],
          priority: 1,
          status: 'pending',
          estimatedDuration: 100
        },
        dependencies: [],
        status: 'pending',
        retryCount: 0,
        maxRetries: 3
      } as any;

      await expect((orchestrator as any).executeTask(unsupportedTask, workflow)).rejects.toThrow('No suitable agent found');
    });

    it('should handle task validation failure', async () => {
      const workflow = await orchestrator.createWorkflow(mockPlan, mockContext);
      const task = workflow.tasks.get('task-1')!;
      
      // Mock validation failure
      const agent = (orchestrator as any).agents.get('analysis');
      vi.spyOn(agent, 'validate').mockResolvedValue(false);

      await expect((orchestrator as any).executeTask(task, workflow)).rejects.toThrow('Task validation failed');
    });
  });
});