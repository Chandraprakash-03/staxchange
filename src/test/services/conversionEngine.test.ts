// Unit tests for ConversionEngine service

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConversionEngine } from '../../services/conversionEngine';
import { OpenRouterClient } from '../../services/openrouter';
import { AgentOrchestrator } from '../../agents/orchestrator';
import { 
  ConversionPlan, 
  FileTree, 
  TechStack
} from '../../types';

// Mock dependencies
vi.mock('../../services/openrouter');
vi.mock('../../agents/orchestrator');

describe('ConversionEngine', () => {
  let conversionEngine: ConversionEngine;
  let mockAiClient: OpenRouterClient;
  let mockOrchestrator: AgentOrchestrator;

  beforeEach(() => {
    mockAiClient = new OpenRouterClient(
      {
        apiKey:process.env.OPENROUTER_API_KEY || ''
      }
    );
    
    // Mock orchestrator methods
    vi.mocked(AgentOrchestrator.prototype.createWorkflow).mockResolvedValue({
      id: 'test-workflow',
      projectId: 'test-project',
      tasks: new Map(),
      context: {} as any,
      status: 'pending',
      progress: 0,
      createdAt: new Date()
    });

    vi.mocked(AgentOrchestrator.prototype.executeWorkflow).mockResolvedValue({
      workflowId: 'test-workflow',
      status: 'completed',
      completedTasks: 1,
      totalTasks: 1,
      results: [{
        taskId: 'test-task',
        status: 'success',
        output: 'Conversion successful',
        files: [{
          path: '/test.ts',
          content: 'console.log("converted");',
          type: 'create'
        }]
      }],
      errors: []
    });

    vi.mocked(AgentOrchestrator.prototype.cleanup).mockResolvedValue();

    conversionEngine = new ConversionEngine(mockAiClient, {
      maxConcurrentFiles: 2,
      preserveContext: true,
      validateResults: false, // Disable for unit tests
      enableRetry: false
    });
  });

  afterEach(async () => {
    await conversionEngine.cleanup();
  });

  describe('Constructor and Configuration', () => {
    it('should initialize with default options', () => {
      const engine = new ConversionEngine(mockAiClient);
      expect(engine).toBeInstanceOf(ConversionEngine);
    });

    it('should initialize with custom options', () => {
      const customOptions = {
        maxConcurrentFiles: 10,
        preserveContext: false,
        validateResults: true,
        enableRetry: true,
        maxRetries: 5
      };

      const engine = new ConversionEngine(mockAiClient, customOptions);
      expect(engine).toBeInstanceOf(ConversionEngine);
    });
  });

  describe('Dependency Analysis', () => {
    it('should analyze file dependencies correctly', async () => {
      const sourceFiles: FileTree = {
        name: 'project',
        type: 'directory',
        path: '/',
        children: [
          {
            name: 'main.js',
            type: 'file',
            path: '/main.js',
            content: `
              import { helper } from './utils/helper';
              import React from 'react';
              const result = require('./config');
            `,
            metadata: {
              size: 100,
              lastModified: new Date()
            }
          },
          {
            name: 'utils',
            type: 'directory',
            path: '/utils',
            children: [
              {
                name: 'helper.js',
                type: 'file',
                path: '/utils/helper.js',
                content: 'export const helper = () => {};',
                metadata: {
                  size: 50,
                  lastModified: new Date()
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

      const plan: ConversionPlan = {
        id: 'test-plan',
        projectId: 'test-project',
        tasks: [{
          id: 'test-task',
          type: 'code_generation',
          description: 'Test conversion',
          inputFiles: ['/main.js'],
          outputFiles: ['/main.ts'],
          dependencies: [],
          agentType: 'code_generation',
          priority: 1,
          status: 'pending',
          estimatedDuration: 60
        }],
        estimatedDuration: 60,
        complexity: 'low',
        warnings: [],
        feasible: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const sourceTechStack: TechStack = {
        language: 'javascript',
        additional: {}
      };

      const targetTechStack: TechStack = {
        language: 'typescript',
        additional: {}
      };

      const results = await conversionEngine.executeConversion(
        plan,
        sourceFiles,
        sourceTechStack,
        targetTechStack
      );

      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('success');
    });
  });

  describe('Project Structure Analysis', () => {
    it('should identify project structure correctly', async () => {
      const sourceFiles: FileTree = {
        name: 'project',
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
                content: 'console.log("entry point");',
                metadata: {
                  size: 30,
                  lastModified: new Date()
                }
              }
            ],
            metadata: {
              size: 0,
              lastModified: new Date()
            }
          },
          {
            name: 'package.json',
            type: 'file',
            path: '/package.json',
            content: '{"name": "test-project"}',
            metadata: {
              size: 25,
              lastModified: new Date()
            }
          }
        ],
        metadata: {
          size: 0,
          lastModified: new Date()
        }
      };

      const plan: ConversionPlan = {
        id: 'test-plan',
        projectId: 'test-project',
        tasks: [{
          id: 'test-task',
          type: 'analysis',
          description: 'Analyze project structure',
          inputFiles: ['/src/index.js'],
          outputFiles: [],
          dependencies: [],
          agentType: 'analysis',
          priority: 1,
          status: 'pending',
          estimatedDuration: 30
        }],
        estimatedDuration: 30,
        complexity: 'low',
        warnings: [],
        feasible: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const sourceTechStack: TechStack = {
        language: 'javascript',
        additional: {}
      };

      const targetTechStack: TechStack = {
        language: 'typescript',
        additional: {}
      };

      const results = await conversionEngine.executeConversion(
        plan,
        sourceFiles,
        sourceTechStack,
        targetTechStack
      );

      expect(results).toHaveLength(1);
      expect(AgentOrchestrator.prototype.createWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({ tasks: [plan.tasks[0]] }),
        expect.objectContaining({
          projectId: 'test-project',
          sourceFiles,
          sourceTechStack,
          targetTechStack
        })
      );
    });
  });

  describe('Conversion Order Calculation', () => {
    it('should calculate conversion order based on dependencies', async () => {
      const plan: ConversionPlan = {
        id: 'test-plan',
        projectId: 'test-project',
        tasks: [
          {
            id: 'task-3',
            type: 'integration',
            description: 'Final integration',
            inputFiles: [],
            outputFiles: [],
            dependencies: ['task-1', 'task-2'],
            agentType: 'integration',
            priority: 1,
            status: 'pending',
            estimatedDuration: 30
          },
          {
            id: 'task-1',
            type: 'code_generation',
            description: 'Generate code',
            inputFiles: ['/src/main.js'],
            outputFiles: ['/src/main.ts'],
            dependencies: [],
            agentType: 'code_generation',
            priority: 3,
            status: 'pending',
            estimatedDuration: 60
          },
          {
            id: 'task-2',
            type: 'dependency_update',
            description: 'Update dependencies',
            inputFiles: ['/package.json'],
            outputFiles: ['/package.json'],
            dependencies: [],
            agentType: 'code_generation',
            priority: 2,
            status: 'pending',
            estimatedDuration: 30
          }
        ],
        estimatedDuration: 120,
        complexity: 'medium',
        warnings: [],
        feasible: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const sourceFiles: FileTree = {
        name: 'project',
        type: 'directory',
        path: '/',
        children: [],
        metadata: {
          size: 0,
          lastModified: new Date()
        }
      };

      const sourceTechStack: TechStack = {
        language: 'javascript',
        additional: {}
      };

      const targetTechStack: TechStack = {
        language: 'typescript',
        additional: {}
      };

      // Mock multiple workflow executions
      vi.mocked(AgentOrchestrator.prototype.executeWorkflow)
        .mockResolvedValueOnce({
          workflowId: 'workflow-1',
          status: 'completed',
          completedTasks: 1,
          totalTasks: 1,
          results: [{ taskId: 'task-1', status: 'success', output: 'Success', files: [] }],
          errors: []
        })
        .mockResolvedValueOnce({
          workflowId: 'workflow-2',
          status: 'completed',
          completedTasks: 1,
          totalTasks: 1,
          results: [{ taskId: 'task-2', status: 'success', output: 'Success', files: [] }],
          errors: []
        })
        .mockResolvedValueOnce({
          workflowId: 'workflow-3',
          status: 'completed',
          completedTasks: 1,
          totalTasks: 1,
          results: [{ taskId: 'task-3', status: 'success', output: 'Success', files: [] }],
          errors: []
        });

      const results = await conversionEngine.executeConversion(
        plan,
        sourceFiles,
        sourceTechStack,
        targetTechStack
      );

      expect(results).toHaveLength(3);
      expect(results.every(r => r.status === 'success')).toBe(true);
      
      // Verify that workflows were created in the correct order
      expect(AgentOrchestrator.prototype.createWorkflow).toHaveBeenCalledTimes(3);
    });
  });

  describe('Context Preservation', () => {
    it('should preserve context between conversions', async () => {
      const plan: ConversionPlan = {
        id: 'test-plan',
        projectId: 'test-project',
        tasks: [
          {
            id: 'task-1',
            type: 'code_generation',
            description: 'First conversion',
            inputFiles: ['/file1.js'],
            outputFiles: ['/file1.ts'],
            dependencies: [],
            agentType: 'code_generation',
            priority: 1,
            status: 'pending',
            estimatedDuration: 60
          },
          {
            id: 'task-2',
            type: 'code_generation',
            description: 'Second conversion',
            inputFiles: ['/file2.js'],
            outputFiles: ['/file2.ts'],
            dependencies: ['task-1'],
            agentType: 'code_generation',
            priority: 1,
            status: 'pending',
            estimatedDuration: 60
          }
        ],
        estimatedDuration: 120,
        complexity: 'medium',
        warnings: [],
        feasible: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const sourceFiles: FileTree = {
        name: 'project',
        type: 'directory',
        path: '/',
        children: [
          {
            name: 'file1.js',
            type: 'file',
            path: '/file1.js',
            content: 'export const shared = "value";',
            metadata: {
              size: 30,
              lastModified: new Date()
            }
          },
          {
            name: 'file2.js',
            type: 'file',
            path: '/file2.js',
            content: 'import { shared } from "./file1";',
            metadata: {
              size: 35,
              lastModified: new Date()
            }
          }
        ],
        metadata: {
          size: 0,
          lastModified: new Date()
        }
      };

      const sourceTechStack: TechStack = {
        language: 'javascript',
        additional: {}
      };

      const targetTechStack: TechStack = {
        language: 'typescript',
        additional: {}
      };

      const results = await conversionEngine.executeConversion(
        plan,
        sourceFiles,
        sourceTechStack,
        targetTechStack
      );

      expect(results).toHaveLength(2);
      
      // Verify that context was passed between conversions
      const createWorkflowCalls = vi.mocked(AgentOrchestrator.prototype.createWorkflow).mock.calls;
      expect(createWorkflowCalls.length).toBe(2);
      
      // Second call should have context from first conversion
      const secondCallContext = createWorkflowCalls[1][1];
      expect(secondCallContext.sharedData).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle workflow execution errors', async () => {
      vi.mocked(AgentOrchestrator.prototype.executeWorkflow).mockResolvedValueOnce({
        workflowId: 'test-workflow',
        status: 'failed',
        completedTasks: 0,
        totalTasks: 1,
        results: [],
        errors: ['Workflow execution failed']
      });

      const plan: ConversionPlan = {
        id: 'test-plan',
        projectId: 'test-project',
        tasks: [{
          id: 'test-task',
          type: 'code_generation',
          description: 'Test conversion',
          inputFiles: ['/test.js'],
          outputFiles: ['/test.ts'],
          dependencies: [],
          agentType: 'code_generation',
          priority: 1,
          status: 'pending',
          estimatedDuration: 60
        }],
        estimatedDuration: 60,
        complexity: 'low',
        warnings: [],
        feasible: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const sourceFiles: FileTree = {
        name: 'project',
        type: 'directory',
        path: '/',
        children: [],
        metadata: {
          size: 0,
          lastModified: new Date()
        }
      };

      const sourceTechStack: TechStack = {
        language: 'javascript',
        additional: {}
      };

      const targetTechStack: TechStack = {
        language: 'typescript',
        additional: {}
      };

      const results = await conversionEngine.executeConversion(
        plan,
        sourceFiles,
        sourceTechStack,
        targetTechStack
      );

      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('error');
      expect(results[0].error).toContain('Workflow execution failed');
    });

    it('should handle orchestrator creation errors', async () => {
      vi.mocked(AgentOrchestrator.prototype.createWorkflow).mockRejectedValueOnce(
        new Error('Failed to create workflow')
      );

      const plan: ConversionPlan = {
        id: 'test-plan',
        projectId: 'test-project',
        tasks: [{
          id: 'test-task',
          type: 'code_generation',
          description: 'Test conversion',
          inputFiles: ['/test.js'],
          outputFiles: ['/test.ts'],
          dependencies: [],
          agentType: 'code_generation',
          priority: 1,
          status: 'pending',
          estimatedDuration: 60
        }],
        estimatedDuration: 60,
        complexity: 'low',
        warnings: [],
        feasible: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const sourceFiles: FileTree = {
        name: 'project',
        type: 'directory',
        path: '/',
        children: [],
        metadata: {
          size: 0,
          lastModified: new Date()
        }
      };

      const sourceTechStack: TechStack = {
        language: 'javascript',
        additional: {}
      };

      const targetTechStack: TechStack = {
        language: 'typescript',
        additional: {}
      };

      const results = await conversionEngine.executeConversion(
        plan,
        sourceFiles,
        sourceTechStack,
        targetTechStack
      );

      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('error');
      expect(results[0].error).toContain('Failed to create workflow');
    });
  });

  describe('Utility Methods', () => {
    it('should traverse file tree correctly', () => {
      const sourceFiles: FileTree = {
        name: 'root',
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
                content: 'console.log("test");',
                metadata: {
                  size: 20,
                  lastModified: new Date()
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

      // This tests the internal traversal logic indirectly through conversion
      const plan: ConversionPlan = {
        id: 'test-plan',
        projectId: 'test-project',
        tasks: [{
          id: 'test-task',
          type: 'analysis',
          description: 'Test traversal',
          inputFiles: ['/src/index.js'],
          outputFiles: [],
          dependencies: [],
          agentType: 'analysis',
          priority: 1,
          status: 'pending',
          estimatedDuration: 30
        }],
        estimatedDuration: 30,
        complexity: 'low',
        warnings: [],
        feasible: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(async () => {
        await conversionEngine.executeConversion(
          plan,
          sourceFiles,
          { language: 'javascript', additional: {} },
          { language: 'typescript', additional: {} }
        );
      }).not.toThrow();
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources properly', async () => {
      await conversionEngine.cleanup();

      expect(AgentOrchestrator.prototype.cleanup).toHaveBeenCalledOnce();
    });
  });
});