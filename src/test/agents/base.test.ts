// Unit tests for BaseAgent

import { describe, beforeEach, it, expect } from 'vitest';
import { BaseAgent } from '../../agents/base';
import { AgentContext, AgentResult } from '../../agents/types';
import { ConversionTask } from '../../types';

// Mock implementation for testing
class TestAgent extends BaseAgent {
  constructor() {
    super('TestAgent', 'test', ['test_capability']);
  }

  async execute(task: ConversionTask, context: AgentContext): Promise<AgentResult> {
    // Add small delay to ensure timing is measurable
    await new Promise(resolve => setTimeout(resolve, 1));
    
    if (task.description.includes('fail')) {
      throw new Error('Simulated failure');
    }
    
    return this.createSuccessResult(
      { message: 'Test execution successful' },
      [{ path: 'test.js', content: 'console.log("test");', type: 'create' }]
    );
  }
}

describe('BaseAgent', () => {
  let agent: TestAgent;
  let mockContext: AgentContext;
  let mockTask: ConversionTask;

  beforeEach(() => {
    agent = new TestAgent();
    
    mockContext = {
      projectId: 'test-project',
      sourceFiles: {
        name: 'root',
        type: 'directory',
        path: '/',
        children: [
          {
            name: 'test.js',
            type: 'file',
            path: '/test.js',
            content: 'console.log("hello");',
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
      conversionPlan: {
        id: 'plan-1',
        projectId: 'test-project',
        tasks: [],
        estimatedDuration: 1000,
        complexity: 'low',
        warnings: [],
        feasible: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      sharedData: {}
    };

    mockTask = {
      id: 'task-1',
      type: 'analysis',
      description: 'Test task',
      inputFiles: ['/test.js'],
      outputFiles: ['/test.ts'],
      dependencies: [],
      agentType: "test" as any,
      priority: 1,
      status: 'pending',
      estimatedDuration: 100
    };
  });

  describe('constructor', () => {
    it('should initialize agent with correct properties', () => {
      expect(agent.name).toBe('TestAgent');
      expect(agent.type).toBe('test');
      expect(agent.capabilities).toEqual(['test_capability']);
    });

    it('should initialize metrics', () => {
      const metrics = agent.getMetrics();
      expect(metrics.executionCount).toBe(0);
      expect(metrics.successRate).toBe(0);
      expect(metrics.averageExecutionTime).toBe(0);
    });
  });

  describe('canHandle', () => {
    it('should return true for matching agent type', () => {
      expect(agent.canHandle(mockTask)).toBe(true);
    });

    it('should return true for matching capability', () => {
      const taskWithCapability = { ...mockTask, type: 'test_capability' as any };
      expect(agent.canHandle(taskWithCapability)).toBe(true);
    });

    it('should return false for non-matching type and capability', () => {
      const nonMatchingTask = { ...mockTask, agentType: 'other' as any, type: 'other' as any };
      expect(agent.canHandle(nonMatchingTask)).toBe(false);
    });
  });

  describe('validate', () => {
    it('should validate task with required fields', async () => {
      const isValid = await agent.validate(mockTask, mockContext);
      expect(isValid).toBe(true);
    });

    it('should fail validation for task without required fields', async () => {
      const invalidTask = { ...mockTask, id: '' };
      const isValid = await agent.validate(invalidTask, mockContext);
      expect(isValid).toBe(false);
    });

    it('should fail validation for unsupported task type', async () => {
      const unsupportedTask = { ...mockTask, agentType: 'unsupported' as any };
      const isValid = await agent.validate(unsupportedTask, mockContext);
      expect(isValid).toBe(false);
    });

    it('should fail validation for missing input files', async () => {
      const taskWithMissingFile = { ...mockTask, inputFiles: ['/nonexistent.js'] };
      const isValid = await agent.validate(taskWithMissingFile, mockContext);
      expect(isValid).toBe(false);
    });
  });

  describe('executeWithMetrics', () => {
    it('should execute task successfully and update metrics', async () => {
      const result = await (agent as any).executeWithMetrics(mockTask, mockContext);
      
      expect(result.success).toBe(true);
      expect(result.output).toEqual({ message: 'Test execution successful' });
      
      const metrics = agent.getMetrics();
      expect(metrics.executionCount).toBe(1);
      expect(metrics.successRate).toBe(1);
      expect(metrics.averageExecutionTime).toBeGreaterThan(0);
    });

    it('should handle execution failure and update metrics', async () => {
      const failingTask = { ...mockTask, description: 'This should fail' };
      const result = await (agent as any).executeWithMetrics(failingTask, mockContext);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Simulated failure');
      
      const metrics = agent.getMetrics();
      expect(metrics.executionCount).toBe(1);
      expect(metrics.successRate).toBe(0);
    });

    it('should calculate correct success rate over multiple executions', async () => {
      // Execute successful task
      await (agent as any).executeWithMetrics(mockTask, mockContext);
      
      // Execute failing task
      const failingTask = { ...mockTask, description: 'This should fail' };
      await (agent as any).executeWithMetrics(failingTask, mockContext);
      
      const metrics = agent.getMetrics();
      expect(metrics.executionCount).toBe(2);
      expect(metrics.successRate).toBe(0.5);
    });
  });

  describe('helper methods', () => {
    it('should find file in tree', () => {
      const file = (agent as any).findFileInTree(mockContext.sourceFiles, '/test.js');
      expect(file).toBeDefined();
      expect(file.name).toBe('test.js');
    });

    it('should return null for non-existent file', () => {
      const file = (agent as any).findFileInTree(mockContext.sourceFiles, '/nonexistent.js');
      expect(file).toBeNull();
    });

    it('should create success result', () => {
      const result = (agent as any).createSuccessResult(
        { data: 'test' },
        [{ path: 'test.js', content: 'test', type: 'create' }],
        { meta: 'data' }
      );

      expect(result.success).toBe(true);
      expect(result.output).toEqual({ data: 'test' });
      expect(result.files).toHaveLength(1);
      expect(result.metadata).toEqual({ meta: 'data' });
    });

    it('should create error result', () => {
      const result = (agent as any).createErrorResult('Test error');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Test error');
    });
  });

  describe('getCapabilities', () => {
    it('should return formatted capabilities', () => {
      const capabilities = agent.getCapabilities();
      expect(capabilities).toHaveLength(1);
      expect(capabilities[0].name).toBe('test_capability');
      expect(capabilities[0].description).toContain('TestAgent');
    });
  });
});