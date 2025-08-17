// Unit tests for AnalysisAgent

import { beforeEach, describe, expect, it } from 'vitest';
import { AnalysisAgent } from '../../agents/analysis';
import { AgentContext } from '../../agents/types';
import { ConversionTask } from '../../types';

describe('AnalysisAgent', () => {
    let agent: AnalysisAgent;
    let mockContext: AgentContext;
    let mockTask: ConversionTask;

    beforeEach(() => {
        agent = new AnalysisAgent();

        mockContext = {
            projectId: 'test-project',
            sourceFiles: {
                name: 'root',
                type: 'directory',
                path: '/',
                children: [
                    {
                        name: 'package.json',
                        type: 'file',
                        path: '/package.json',
                        content: JSON.stringify({
                            name: 'test-project',
                            dependencies: {
                                'react': '^18.0.0',
                                'lodash': '^4.17.21'
                            },
                            devDependencies: {
                                'typescript': '^4.9.0'
                            }
                        }),
                        metadata: { size: 200, lastModified: new Date() }
                    },
                    {
                        name: 'src',
                        type: 'directory',
                        path: '/src',
                        children: [
                            {
                                name: 'index.js',
                                type: 'file',
                                path: '/src/index.js',
                                content: `
                  import React from 'react';
                  import _ from 'lodash';
                  
                  function App() {
                    const data = _.map([1, 2, 3], n => n * 2);
                    return <div>{data.join(', ')}</div>;
                  }
                  
                  export default App;
                `,
                                metadata: { size: 150, lastModified: new Date() }
                            },
                            {
                                name: 'utils.js',
                                type: 'file',
                                path: '/src/utils.js',
                                content: `
                  // Utility functions
                  export function calculateSum(numbers) {
                    let sum = 0;
                    for (let i = 0; i < numbers.length; i++) {
                      if (numbers[i] > 0) {
                        sum += numbers[i];
                      }
                    }
                    return sum;
                  }
                  
                  export function formatDate(date) {
                    return date.toISOString().split('T')[0];
                  }
                `,
                                metadata: { size: 300, lastModified: new Date() }
                            }
                        ],
                        metadata: { size: 0, lastModified: new Date() }
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
                framework: 'react',
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
            id: 'analysis-task-1',
            type: 'analysis',
            description: 'Analyze project structure and dependencies',
            inputFiles: ['/src/index.js', '/src/utils.js'],
            outputFiles: ['analysis_report.json'],
            dependencies: [],
            agentType: 'analysis',
            priority: 1,
            status: 'pending',
            estimatedDuration: 300
        };
    });

    describe('constructor', () => {
        it('should initialize with correct properties', () => {
            expect(agent.name).toBe('AnalysisAgent');
            expect(agent.type).toBe('analysis');
            expect(agent.capabilities).toContain('analysis');
            expect(agent.capabilities).toContain('code_analysis');
            expect(agent.capabilities).toContain('dependency_analysis');
        });
    });

    describe('canHandle', () => {
        it('should handle analysis tasks', () => {
            expect(agent.canHandle(mockTask)).toBe(true);
        });

        it('should not handle non-analysis tasks', () => {
            const nonAnalysisTask = { ...mockTask, type: 'code_generation' as any, agentType: 'code_generation' as any };
            expect(agent.canHandle(nonAnalysisTask)).toBe(false);
        });
    });

    describe('execute', () => {
        it('should perform code analysis successfully', async () => {
            const result = await agent.execute(mockTask, mockContext);

            expect(result.success).toBe(true);
            expect(result.output).toBeDefined();
            expect(result.output.sourceStructure).toBeDefined();
            expect(result.output.dependencies).toBeDefined();
            expect(result.output.codeComplexity).toBeDefined();
            expect(result.output.techStackCompatibility).toBeDefined();
            expect(result.output.conversionChallenges).toBeDefined();
        });

        it('should analyze project structure correctly', async () => {
            const result = await agent.execute(mockTask, mockContext);
            const structure = result.output.sourceStructure;

            expect(structure.totalFiles).toBeGreaterThan(0);
            expect(structure.directories).toBeGreaterThan(0);
            expect(structure.fileTypes).toBeDefined();
            expect(structure.entryPoints).toContain('/src/index.js');
            expect(structure.configFiles).toContain('/package.json');
        });

        it('should analyze dependencies correctly', async () => {
            const result = await agent.execute(mockTask, mockContext);
            const dependencies = result.output.dependencies;

            expect(dependencies.runtime).toContain('react');
            expect(dependencies.runtime).toContain('lodash');
            expect(dependencies.dev).toContain('typescript');
        });

        it('should analyze code complexity', async () => {
            const result = await agent.execute(mockTask, mockContext);
            const complexity = result.output.codeComplexity;

            expect(complexity.totalLines).toBeGreaterThan(0);
            expect(complexity.codeLines).toBeGreaterThan(0);
            expect(complexity.functionCount).toBeGreaterThan(0);
            expect(complexity.cyclomaticComplexity).toBeGreaterThan(0);
        });

        it('should analyze tech stack compatibility', async () => {
            const result = await agent.execute(mockTask, mockContext);
            const compatibility = result.output.techStackCompatibility;

            expect(compatibility.language).toBeDefined();
            expect(compatibility.framework).toBeDefined();
            expect(compatibility.overallScore).toBeGreaterThan(0);
            expect(compatibility.overallScore).toBeLessThanOrEqual(1);
        });

        it('should identify conversion challenges', async () => {
            const result = await agent.execute(mockTask, mockContext);
            const challenges = result.output.conversionChallenges;

            expect(Array.isArray(challenges)).toBe(true);
            // Should identify language conversion challenge
            expect(challenges.some((challenge: string) =>
                challenge.includes('javascript') && challenge.includes('typescript')
            )).toBe(true);
        });

        it('should include metadata in result', async () => {
            const result = await agent.execute(mockTask, mockContext);

            expect(result.metadata).toBeDefined();
            const metadata = result.metadata!;

            expect(metadata.analysisType).toBe('code_analysis');
            expect(metadata.timestamp).toBeDefined();
            expect(metadata.confidence).toBeGreaterThan(0);
            expect(metadata.confidence).toBeLessThanOrEqual(1);
        });

        it('should handle unsupported task types', async () => {
            const unsupportedTask = { ...mockTask, type: 'unsupported' as any };
            const result = await agent.execute(unsupportedTask, mockContext);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Unsupported task type');
        });
    });

    describe('validation', () => {
        it('should validate valid analysis task', async () => {
            const isValid = await agent.validate(mockTask, mockContext);
            expect(isValid).toBe(true);
        });

        it('should fail validation for missing input files', async () => {
            const taskWithMissingFile = { ...mockTask, inputFiles: ['/nonexistent.js'] };
            const isValid = await agent.validate(taskWithMissingFile, mockContext);
            expect(isValid).toBe(false);
        });
    });

    describe('private methods', () => {
        it('should detect entry points correctly', () => {
            const isEntryPoint = (agent as any).isEntryPoint('index.js', '/src/index.js');
            expect(isEntryPoint).toBe(true);

            const isNotEntryPoint = (agent as any).isEntryPoint('utils.js', '/src/utils.js');
            expect(isNotEntryPoint).toBe(false);
        });

        it('should detect config files correctly', () => {
            const isConfig = (agent as any).isConfigFile('package.json');
            expect(isConfig).toBe(true);

            const isNotConfig = (agent as any).isConfigFile('index.js');
            expect(isNotConfig).toBe(false);
        });

        it('should parse package.json correctly', () => {
            const packageContent = JSON.stringify({
                dependencies: { react: '^18.0.0' },
                devDependencies: { typescript: '^4.9.0' }
            });

            const parsed = (agent as any).parsePackageJson(packageContent);
            expect(parsed.dependencies.react).toBe('^18.0.0');
            expect(parsed.devDependencies.typescript).toBe('^4.9.0');
        });

        it('should handle invalid package.json', () => {
            const invalidJson = '{ invalid json }';
            const parsed = (agent as any).parsePackageJson(invalidJson);
            expect(parsed).toBeNull();
        });

        it('should calculate language compatibility', () => {
            const compatibility = (agent as any).getLanguageCompatibility('javascript', 'typescript');
            expect(compatibility.score).toBeGreaterThan(0.8); // High compatibility

            const lowCompatibility = (agent as any).getLanguageCompatibility('javascript', 'python');
            expect(lowCompatibility.score).toBeLessThan(0.5); // Low compatibility
        });

        it('should analyze file complexity', () => {
            const jsCode = `
        function complexFunction(data) {
          if (data.length > 0) {
            for (let i = 0; i < data.length; i++) {
              if (data[i].active) {
                try {
                  processItem(data[i]);
                } catch (error) {
                  handleError(error);
                }
              }
            }
          }
          return data.filter(item => item.processed);
        }
      `;

            const complexity = (agent as any).analyzeFileComplexity(jsCode, 'test.js');
            expect(complexity.totalLines).toBeGreaterThan(0);
            expect(complexity.codeLines).toBeGreaterThan(0);
            expect(complexity.cyclomaticComplexity).toBeGreaterThan(1);
            expect(complexity.functionCount).toBeGreaterThan(0);
        });
    });
});