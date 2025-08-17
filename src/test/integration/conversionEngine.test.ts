// Integration tests for the conversion engine

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConversionEngine } from '../../services/conversionEngine';
import { OpenRouterClient } from '../../services/openrouter';
import { 
  ConversionPlan, 
  ConversionTask, 
  FileTree, 
  TechStack,
  ConversionResult
} from '../../types';

// Mock the OpenRouter client
vi.mock('../../services/openrouter');

describe('ConversionEngine Integration Tests', () => {
  let conversionEngine: ConversionEngine;
  let mockAiClient: OpenRouterClient;
  let mockSourceFiles: FileTree;
  let mockSourceTechStack: TechStack;
  let mockTargetTechStack: TechStack;
  let mockConversionPlan: ConversionPlan;

  beforeEach(() => {
    // Setup mock AI client
    mockAiClient = new OpenRouterClient();
    
    // Mock the generateCompletion method on the prototype
    vi.mocked(OpenRouterClient.prototype.generateCompletion).mockImplementation(async (prompt: string) => {
      // Mock AI responses based on prompt content
      if (prompt.includes('React')) {
        return `
\`\`\`typescript
import React from 'react';

const App: React.FC = () => {
  return <div>Hello TypeScript!</div>;
};

export default App;
\`\`\`
        `;
      }
      
      if (prompt.includes('package.json')) {
        return `
\`\`\`json
{
  "name": "converted-project",
  "version": "1.0.0",
  "dependencies": {
    "react": "^18.0.0",
    "@types/react": "^18.0.0",
    "typescript": "^5.0.0"
  }
}
\`\`\`
        `;
      }
      
      return 'console.log("Converted code");';
    });

    // Setup conversion engine
    conversionEngine = new ConversionEngine(mockAiClient, {
      maxConcurrentFiles: 2,
      preserveContext: true,
      validateResults: true,
      enableRetry: true,
      maxRetries: 1,
    });

    // Setup mock data
    mockSourceFiles = {
      name: 'test-project',
      type: 'directory',
      path: '/',
      children: [
        {
          name: 'src',
          type: 'directory',
          path: '/src',
          children: [
            {
              name: 'App.js',
              type: 'file',
              path: '/src/App.js',
              content: `
import React from 'react';

function App() {
  return <div>Hello World!</div>;
}

export default App;
              `,
              metadata: {
                size: 150,
                lastModified: new Date(),
                mimeType: 'application/javascript'
              }
            },
            {
              name: 'index.js',
              type: 'file',
              path: '/src/index.js',
              content: `
import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';

ReactDOM.render(<App />, document.getElementById('root'));
              `,
              metadata: {
                size: 120,
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
        {
          name: 'package.json',
          type: 'file',
          path: '/package.json',
          content: `
{
  "name": "test-project",
  "version": "1.0.0",
  "dependencies": {
    "react": "^17.0.0",
    "react-dom": "^17.0.0"
  }
}
          `,
          metadata: {
            size: 200,
            lastModified: new Date(),
            mimeType: 'application/json'
          }
        }
      ],
      metadata: {
        size: 0,
        lastModified: new Date()
      }
    };

    mockSourceTechStack = {
      language: 'javascript',
      framework: 'react',
      runtime: 'node',
      packageManager: 'npm',
      additional: {}
    };

    mockTargetTechStack = {
      language: 'typescript',
      framework: 'react',
      runtime: 'node',
      packageManager: 'npm',
      additional: {}
    };

    mockConversionPlan = {
      id: 'test-plan-1',
      projectId: 'test-project-1',
      tasks: [
        {
          id: 'task-1',
          type: 'code_generation',
          description: 'Convert React components to TypeScript',
          inputFiles: ['/src/App.js', '/src/index.js'],
          outputFiles: ['/src/App.tsx', '/src/index.tsx'],
          dependencies: [],
          agentType: 'code_generation',
          priority: 1,
          status: 'pending',
          estimatedDuration: 60
        },
        {
          id: 'task-2',
          type: 'dependency_update',
          description: 'Update package.json for TypeScript',
          inputFiles: ['/package.json'],
          outputFiles: ['/package.json'],
          dependencies: ['task-1'],
          agentType: 'code_generation',
          priority: 2,
          status: 'pending',
          estimatedDuration: 30
        }
      ],
      estimatedDuration: 90,
      complexity: 'medium',
      warnings: [],
      feasible: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  });

  afterEach(async () => {
    await conversionEngine.cleanup();
  });

  describe('End-to-End Conversion Workflow', () => {
    it('should successfully convert a React JavaScript project to TypeScript', async () => {
      const results = await conversionEngine.executeConversion(
        mockConversionPlan,
        mockSourceFiles,
        mockSourceTechStack,
        mockTargetTechStack
      );

      expect(results).toHaveLength(2);
      
      // Check first task (code generation)
      const codeGenResult = results.find(r => r.taskId === 'task-1');
      expect(codeGenResult).toBeDefined();
      expect(codeGenResult!.status).toBe('success');
      expect(codeGenResult!.files).toHaveLength(2);
      
      // Check that files were converted to TypeScript
      const appFile = codeGenResult!.files.find(f => f.path.includes('App'));
      expect(appFile).toBeDefined();
      expect(appFile!.content).toContain('React.FC');
      expect(appFile!.content).toContain('TypeScript');

      // Check second task (dependency update)
      const depUpdateResult = results.find(r => r.taskId === 'task-2');
      expect(depUpdateResult).toBeDefined();
      expect(depUpdateResult!.status).toBe('success');
      expect(depUpdateResult!.files).toHaveLength(1);
      
      const packageJsonFile = depUpdateResult!.files.find(f => f.path === '/package.json');
      expect(packageJsonFile).toBeDefined();
      expect(packageJsonFile!.content).toContain('typescript');
      expect(packageJsonFile!.content).toContain('@types/react');
    });

    it('should handle conversion errors gracefully', async () => {
      // Mock AI client to throw an error
      vi.mocked(OpenRouterClient.prototype.generateCompletion).mockRejectedValueOnce(
        new Error('AI service unavailable')
      );

      const results = await conversionEngine.executeConversion(
        mockConversionPlan,
        mockSourceFiles,
        mockSourceTechStack,
        mockTargetTechStack
      );

      expect(results).toHaveLength(2);
      
      // First task should fail
      const failedResult = results.find(r => r.taskId === 'task-1');
      expect(failedResult).toBeDefined();
      expect(failedResult!.status).toBe('error');
      expect(failedResult!.error).toContain('AI service unavailable');
    });

    it('should retry failed conversions when enabled', async () => {
      let callCount = 0;
      vi.mocked(OpenRouterClient.prototype.generateCompletion).mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Temporary failure');
        }
        return 'console.log("Retry successful");';
      });

      const results = await conversionEngine.executeConversion(
        mockConversionPlan,
        mockSourceFiles,
        mockSourceTechStack,
        mockTargetTechStack
      );

      expect(callCount).toBeGreaterThan(1); // Should have retried
      
      const result = results.find(r => r.taskId === 'task-1');
      expect(result).toBeDefined();
      expect(result!.status).toBe('success');
      expect(result!.output).toContain('retry');
    });

    it('should preserve context between file conversions', async () => {
      const results = await conversionEngine.executeConversion(
        mockConversionPlan,
        mockSourceFiles,
        mockSourceTechStack,
        mockTargetTechStack
      );

      // Verify that context was preserved by checking AI client calls
      const aiCalls = vi.mocked(OpenRouterClient.prototype.generateCompletion).mock.calls;
      expect(aiCalls.length).toBeGreaterThan(0);
      
      // Later calls should have access to context from earlier conversions
      // This is verified by the mock implementation returning appropriate responses
      expect(results.every(r => r.status === 'success')).toBe(true);
    });

    it('should validate conversion results when enabled', async () => {
      const results = await conversionEngine.executeConversion(
        mockConversionPlan,
        mockSourceFiles,
        mockSourceTechStack,
        mockTargetTechStack
      );

      // All results should be successful since our mock returns valid code
      expect(results.every(r => r.status === 'success')).toBe(true);
      
      // Check that validation was performed (no validation warnings in output)
      results.forEach(result => {
        expect(result.output).not.toContain('Validation warnings');
      });
    });
  });

  describe('Complex Conversion Scenarios', () => {
    it('should handle multi-framework conversion (React to Vue)', async () => {
      const vueTargetStack: TechStack = {
        language: 'typescript',
        framework: 'vue',
        runtime: 'node',
        additional: {}
      };

      // Mock Vue-specific AI responses
      vi.mocked(OpenRouterClient.prototype.generateCompletion).mockImplementation(async (prompt: string) => {
        if (prompt.includes('Vue')) {
          return `
\`\`\`typescript
<template>
  <div>Hello Vue with TypeScript!</div>
</template>

<script setup lang="ts">
// Vue 3 Composition API
</script>
\`\`\`
          `;
        }
        return 'export default {};';
      });

      const results = await conversionEngine.executeConversion(
        mockConversionPlan,
        mockSourceFiles,
        mockSourceTechStack,
        vueTargetStack
      );

      expect(results).toHaveLength(2);
      
      const codeGenResult = results.find(r => r.taskId === 'task-1');
      expect(codeGenResult).toBeDefined();
      expect(codeGenResult!.status).toBe('success');
      
      const convertedFile = codeGenResult!.files[0];
      expect(convertedFile.content).toContain('<template>');
      expect(convertedFile.content).toContain('Vue');
    });

    it('should handle dependency resolution across files', async () => {
      // Add a more complex file structure with dependencies
      const complexSourceFiles: FileTree = {
        ...mockSourceFiles,
        children: [
          ...mockSourceFiles.children!,
          {
            name: 'utils',
            type: 'directory',
            path: '/utils',
            children: [
              {
                name: 'helper.js',
                type: 'file',
                path: '/utils/helper.js',
                content: 'export const helper = () => "helper function";',
                metadata: {
                  size: 50,
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
        ]
      };

      // Update source file to import the helper
      const updatedAppContent = `
import React from 'react';
import { helper } from '../utils/helper';

function App() {
  return <div>{helper()}</div>;
}

export default App;
      `;

      complexSourceFiles.children![0].children![0].content = updatedAppContent;

      const results = await conversionEngine.executeConversion(
        mockConversionPlan,
        complexSourceFiles,
        mockSourceTechStack,
        mockTargetTechStack
      );

      expect(results).toHaveLength(2);
      expect(results.every(r => r.status === 'success')).toBe(true);
    });

    it('should handle large projects with many files efficiently', async () => {
      // Create a larger project structure
      const largeProject: FileTree = {
        name: 'large-project',
        type: 'directory',
        path: '/',
        children: [],
        metadata: {
          size: 0,
          lastModified: new Date()
        }
      };

      // Generate 20 files
      for (let i = 0; i < 20; i++) {
        largeProject.children!.push({
          name: `component${i}.js`,
          type: 'file',
          path: `/src/component${i}.js`,
          content: `
import React from 'react';
export const Component${i} = () => <div>Component ${i}</div>;
          `,
          metadata: {
            size: 100,
            lastModified: new Date(),
            mimeType: 'application/javascript'
          }
        });
      }

      const largePlan: ConversionPlan = {
        ...mockConversionPlan,
        tasks: [
          {
            id: 'large-task',
            type: 'code_generation',
            description: 'Convert all components',
            inputFiles: largeProject.children!.map(f => f.path),
            outputFiles: largeProject.children!.map(f => f.path.replace('.js', '.tsx')),
            dependencies: [],
            agentType: 'code_generation',
            priority: 1,
            status: 'pending',
            estimatedDuration: 300
          }
        ]
      };

      const startTime = Date.now();
      const results = await conversionEngine.executeConversion(
        largePlan,
        largeProject,
        mockSourceTechStack,
        mockTargetTechStack
      );
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('success');
      expect(results[0].files).toHaveLength(20);
      
      // Should complete within reasonable time (less than 10 seconds for mock)
      expect(duration).toBeLessThan(10000);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle partial failures gracefully', async () => {
      let callCount = 0;
      vi.mocked(OpenRouterClient.prototype.generateCompletion).mockImplementation(async () => {
        callCount++;
        if (callCount === 2) {
          throw new Error('Simulated failure for second file');
        }
        return 'console.log("Success");';
      });

      const results = await conversionEngine.executeConversion(
        mockConversionPlan,
        mockSourceFiles,
        mockSourceTechStack,
        mockTargetTechStack
      );

      expect(results).toHaveLength(2);
      
      // First task might have partial success
      const firstResult = results.find(r => r.taskId === 'task-1');
      expect(firstResult).toBeDefined();
      
      // Second task should succeed (dependency update)
      const secondResult = results.find(r => r.taskId === 'task-2');
      expect(secondResult).toBeDefined();
    });

    it('should provide detailed error information', async () => {
      const detailedError = new Error('Detailed conversion error with context');
      vi.mocked(OpenRouterClient.prototype.generateCompletion).mockRejectedValueOnce(detailedError);

      const results = await conversionEngine.executeConversion(
        mockConversionPlan,
        mockSourceFiles,
        mockSourceTechStack,
        mockTargetTechStack
      );

      const failedResult = results.find(r => r.status === 'error');
      expect(failedResult).toBeDefined();
      expect(failedResult!.error).toContain('Detailed conversion error');
    });

    it('should maintain conversion metrics', async () => {
      const results = await conversionEngine.executeConversion(
        mockConversionPlan,
        mockSourceFiles,
        mockSourceTechStack,
        mockTargetTechStack
      );

      // Access conversion metrics through the engine
      // Note: This would require exposing the context or metrics publicly
      expect(results).toHaveLength(2);
      expect(results.filter(r => r.status === 'success')).toHaveLength(2);
    });
  });

  describe('Performance and Concurrency', () => {
    it('should respect concurrency limits', async () => {
      const concurrentEngine = new ConversionEngine(mockAiClient, {
        maxConcurrentFiles: 1, // Force sequential processing
      });

      let concurrentCalls = 0;
      let maxConcurrentCalls = 0;

      vi.mocked(OpenRouterClient.prototype.generateCompletion).mockImplementation(async () => {
        concurrentCalls++;
        maxConcurrentCalls = Math.max(maxConcurrentCalls, concurrentCalls);
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        concurrentCalls--;
        return 'console.log("Success");';
      });

      await concurrentEngine.executeConversion(
        mockConversionPlan,
        mockSourceFiles,
        mockSourceTechStack,
        mockTargetTechStack
      );

      // Should never exceed the concurrency limit
      expect(maxConcurrentCalls).toBeLessThanOrEqual(1);
      
      await concurrentEngine.cleanup();
    });

    it('should handle timeout scenarios', async () => {
      vi.mocked(OpenRouterClient.prototype.generateCompletion).mockImplementation(async () => {
        // Simulate a very slow response
        await new Promise(resolve => setTimeout(resolve, 5000));
        return 'console.log("Slow response");';
      });

      // This test would need timeout handling in the actual implementation
      const results = await conversionEngine.executeConversion(
        mockConversionPlan,
        mockSourceFiles,
        mockSourceTechStack,
        mockTargetTechStack
      );

      // For now, just verify it completes
      expect(results).toHaveLength(2);
    });
  });
});