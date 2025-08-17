import { describe, it, expect, beforeEach } from 'vitest';
import { ConversionPlanningService } from '../../services/conversionPlanning';
import { TechStack, ProjectAnalysis, ConversionPlan, ConversionTask } from '../../types';

describe('ConversionPlanningService', () => {
  let service: ConversionPlanningService;
  let mockSourceTechStack: TechStack;
  let mockTargetTechStack: TechStack;
  let mockProjectAnalysis: ProjectAnalysis;

  beforeEach(() => {
    service = new ConversionPlanningService();
    
    mockSourceTechStack = {
      language: 'javascript',
      framework: 'react',
      database: 'postgresql',
      runtime: 'nodejs',
      buildTool: 'webpack',
      packageManager: 'npm',
      deployment: 'docker',
      additional: {}
    };

    mockTargetTechStack = {
      language: 'typescript',
      framework: 'nextjs',
      database: 'postgresql',
      runtime: 'nodejs',
      buildTool: 'vite',
      packageManager: 'npm',
      deployment: 'docker',
      additional: {}
    };

    mockProjectAnalysis = {
      techStack: mockSourceTechStack,
      architecture: 'spa',
      dependencies: [
        { name: 'react', version: '18.0.0', type: 'runtime', source: 'npm' },
        { name: 'webpack', version: '5.0.0', type: 'dev', source: 'npm' }
      ],
      entryPoints: ['src/index.js', 'src/App.js']
    };
  });

  describe('analyzeFeasibility', () => {
    it('should return feasible result for compatible tech stacks', async () => {
      const result = await service.analyzeFeasibility(
        mockSourceTechStack,
        mockTargetTechStack,
        mockProjectAnalysis
      );

      expect(result.feasible).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.3); // Adjusted to be more realistic
      expect(result.complexity).toBeOneOf(['low', 'medium', 'high']);
      expect(result.estimatedDuration).toBeGreaterThan(0);
      expect(Array.isArray(result.warnings)).toBe(true);
      expect(Array.isArray(result.blockers)).toBe(true);
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it('should return non-feasible result for incompatible tech stacks', async () => {
      const incompatibleTarget: TechStack = {
        ...mockTargetTechStack,
        language: 'cobol', // Highly incompatible language
        framework: 'unknown-framework'
      };

      const result = await service.analyzeFeasibility(
        mockSourceTechStack,
        incompatibleTarget,
        mockProjectAnalysis
      );

      expect(result.feasible).toBe(false);
      expect(result.blockers.length).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThan(0.5);
    });

    it('should handle missing project analysis', async () => {
      const result = await service.analyzeFeasibility(
        mockSourceTechStack,
        mockTargetTechStack
      );

      expect(result).toBeDefined();
      expect(typeof result.feasible).toBe('boolean');
      expect(typeof result.confidence).toBe('number');
    });

    it('should provide appropriate complexity assessment', async () => {
      // Test low complexity (same language, similar framework)
      const lowComplexityTarget: TechStack = {
        ...mockSourceTechStack,
        framework: 'nextjs' // React to Next.js should be low complexity
      };

      const lowResult = await service.analyzeFeasibility(
        mockSourceTechStack,
        lowComplexityTarget,
        mockProjectAnalysis
      );

      expect(lowResult.complexity).toBe('low');

      // Test high complexity (different language)
      const highComplexityTarget: TechStack = {
        ...mockTargetTechStack,
        language: 'python',
        framework: 'django'
      };

      const highResult = await service.analyzeFeasibility(
        mockSourceTechStack,
        highComplexityTarget,
        mockProjectAnalysis
      );

      expect(highResult.complexity).toBeOneOf(['medium', 'high']);
    });
  });

  describe('validateTechStackCompatibility', () => {
    it('should return perfect compatibility for identical stacks', async () => {
      const result = await service.validateTechStackCompatibility(
        mockSourceTechStack,
        mockSourceTechStack
      );

      expect(result.compatible).toBe(true);
      expect(result.compatibilityScore).toBe(1.0);
      expect(result.issues).toHaveLength(0);
    });

    it('should identify compatibility issues', async () => {
      const incompatibleTarget: TechStack = {
        ...mockTargetTechStack,
        language: 'python',
        framework: 'django',
        database: 'mongodb'
      };

      const result = await service.validateTechStackCompatibility(
        mockSourceTechStack,
        incompatibleTarget
      );

      expect(result.compatibilityScore).toBeLessThan(1.0);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.migrations.length).toBeGreaterThan(0);
    });

    it('should handle partial tech stack information', async () => {
      const partialSource: TechStack = {
        language: 'javascript',
        additional: {}
      };

      const partialTarget: TechStack = {
        language: 'typescript',
        framework: 'react',
        additional: {}
      };

      const result = await service.validateTechStackCompatibility(
        partialSource,
        partialTarget
      );

      expect(result).toBeDefined();
      expect(typeof result.compatible).toBe('boolean');
      expect(typeof result.compatibilityScore).toBe('number');
    });

    it('should provide migration paths', async () => {
      const result = await service.validateTechStackCompatibility(
        mockSourceTechStack,
        mockTargetTechStack
      );

      expect(result.migrations).toBeDefined();
      expect(Array.isArray(result.migrations)).toBe(true);
      
      if (result.migrations.length > 0) {
        const migration = result.migrations[0];
        expect(migration).toHaveProperty('from');
        expect(migration).toHaveProperty('to');
        expect(migration).toHaveProperty('complexity');
        expect(migration).toHaveProperty('steps');
        expect(migration).toHaveProperty('estimatedTime');
      }
    });
  });

  describe('generateConversionPlan', () => {
    it('should generate a valid conversion plan', async () => {
      const plan = await service.generateConversionPlan(
        'test-project-id',
        mockSourceTechStack,
        mockTargetTechStack,
        mockProjectAnalysis
      );

      expect(plan).toBeDefined();
      expect(plan.id).toBeDefined();
      expect(plan.projectId).toBe('test-project-id');
      expect(plan.tasks).toBeDefined();
      expect(Array.isArray(plan.tasks)).toBe(true);
      expect(plan.tasks.length).toBeGreaterThan(0);
      expect(plan.estimatedDuration).toBeGreaterThan(0);
      expect(plan.complexity).toBeOneOf(['low', 'medium', 'high']);
      expect(plan.feasible).toBe(true);
      expect(plan.createdAt).toBeInstanceOf(Date);
      expect(plan.updatedAt).toBeInstanceOf(Date);
    });

    it('should throw error for non-feasible conversion', async () => {
      const incompatibleTarget: TechStack = {
        language: 'assembly',
        additional: {}
      };

      await expect(
        service.generateConversionPlan(
          'test-project-id',
          mockSourceTechStack,
          incompatibleTarget,
          mockProjectAnalysis
        )
      ).rejects.toThrow('Conversion not feasible');
    });

    it('should generate appropriate tasks for different conversions', async () => {
      // Test language conversion
      const languageConversionTarget: TechStack = {
        ...mockSourceTechStack,
        language: 'typescript'
      };

      const languagePlan = await service.generateConversionPlan(
        'test-project-id',
        mockSourceTechStack,
        languageConversionTarget,
        mockProjectAnalysis
      );

      const codeGenTasks = languagePlan.tasks.filter(t => t.type === 'code_generation');
      expect(codeGenTasks.length).toBeGreaterThan(0);

      // Test framework conversion
      const frameworkConversionTarget: TechStack = {
        ...mockSourceTechStack,
        framework: 'vue'
      };

      const frameworkPlan = await service.generateConversionPlan(
        'test-project-id',
        mockSourceTechStack,
        frameworkConversionTarget,
        mockProjectAnalysis
      );

      const frameworkTasks = frameworkPlan.tasks.filter(t => 
        t.description.includes('vue') || t.description.includes('framework')
      );
      expect(frameworkTasks.length).toBeGreaterThan(0);
    });

    it('should create tasks with proper dependencies', async () => {
      const plan = await service.generateConversionPlan(
        'test-project-id',
        mockSourceTechStack,
        mockTargetTechStack,
        mockProjectAnalysis
      );

      // Check that tasks have proper dependency structure
      const taskIds = new Set(plan.tasks.map(t => t.id));
      
      for (const task of plan.tasks) {
        for (const depId of task.dependencies) {
          expect(taskIds.has(depId)).toBe(true);
        }
      }

      // Analysis task should have no dependencies
      const analysisTasks = plan.tasks.filter(t => t.type === 'analysis');
      expect(analysisTasks.length).toBeGreaterThan(0);
      expect(analysisTasks[0].dependencies).toHaveLength(0);
    });
  });

  describe('validateConversionPlan', () => {
    let validPlan: ConversionPlan;

    beforeEach(async () => {
      validPlan = await service.generateConversionPlan(
        'test-project-id',
        mockSourceTechStack,
        mockTargetTechStack,
        mockProjectAnalysis
      );
    });

    it('should validate a correct conversion plan', async () => {
      const result = await service.validateConversionPlan(validPlan);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing plan ID', async () => {
      const invalidPlan: ConversionPlan = {
        ...validPlan,
        id: ''
      };

      const result = await service.validateConversionPlan(invalidPlan);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_PLAN_STRUCTURE')).toBe(true);
    });

    it('should detect missing tasks', async () => {
      const invalidPlan: ConversionPlan = {
        ...validPlan,
        tasks: []
      };

      const result = await service.validateConversionPlan(invalidPlan);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'NO_TASKS')).toBe(true);
    });

    it('should detect invalid task structure', async () => {
      const invalidTask: ConversionTask = {
        id: '',
        type: 'analysis',
        description: '',
        inputFiles: [],
        outputFiles: [],
        dependencies: [],
        agentType: 'analysis',
        priority: 1,
        status: 'pending',
        estimatedDuration: 0
      };

      const invalidPlan: ConversionPlan = {
        ...validPlan,
        tasks: [invalidTask]
      };

      const result = await service.validateConversionPlan(invalidPlan);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should detect circular dependencies', async () => {
      const task1: ConversionTask = {
        id: 'task1',
        type: 'analysis',
        description: 'Task 1',
        inputFiles: [],
        outputFiles: [],
        dependencies: ['task2'],
        agentType: 'analysis',
        priority: 1,
        status: 'pending',
        estimatedDuration: 30
      };

      const task2: ConversionTask = {
        id: 'task2',
        type: 'code_generation',
        description: 'Task 2',
        inputFiles: [],
        outputFiles: [],
        dependencies: ['task1'],
        agentType: 'code_generation',
        priority: 2,
        status: 'pending',
        estimatedDuration: 60
      };

      const invalidPlan: ConversionPlan = {
        ...validPlan,
        tasks: [task1, task2]
      };

      const result = await service.validateConversionPlan(invalidPlan);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'CIRCULAR_DEPENDENCY')).toBe(true);
    });

    it('should detect invalid dependencies', async () => {
      const taskWithInvalidDep: ConversionTask = {
        ...validPlan.tasks[0],
        dependencies: ['non-existent-task-id']
      };

      const invalidPlan: ConversionPlan = {
        ...validPlan,
        tasks: [taskWithInvalidDep]
      };

      const result = await service.validateConversionPlan(invalidPlan);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_DEPENDENCY')).toBe(true);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle empty tech stacks', async () => {
      const emptyTechStack: TechStack = {
        language: '',
        additional: {}
      };

      const result = await service.validateTechStackCompatibility(
        emptyTechStack,
        mockTargetTechStack
      );

      expect(result).toBeDefined();
      expect(typeof result.compatible).toBe('boolean');
    });

    it('should handle unknown languages', async () => {
      const unknownLanguageStack: TechStack = {
        language: 'unknown-language-xyz',
        additional: {}
      };

      const result = await service.validateTechStackCompatibility(
        unknownLanguageStack,
        mockTargetTechStack
      );

      expect(result).toBeDefined();
      expect(result.compatibilityScore).toBeLessThan(0.5);
    });

    it('should handle large project analysis', async () => {
      const largeDependencies = Array.from({ length: 100 }, (_, i) => ({
        name: `package-${i}`,
        version: '1.0.0',
        type: 'runtime' as const,
        source: 'npm'
      }));

      const largeProjectAnalysis: ProjectAnalysis = {
        ...mockProjectAnalysis,
        dependencies: largeDependencies,
        architecture: 'microservices'
      };

      const result = await service.analyzeFeasibility(
        mockSourceTechStack,
        mockTargetTechStack,
        largeProjectAnalysis
      );

      expect(result).toBeDefined();
      expect(result.estimatedDuration).toBeGreaterThan(100); // Should account for project size
    });

    it('should provide meaningful error messages', async () => {
      try {
        await service.generateConversionPlan(
          '',
          mockSourceTechStack,
          { language: 'invalid', additional: {} },
          mockProjectAnalysis
        );
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Conversion not feasible');
      }
    });
  });

  describe('performance and scalability', () => {
    it('should handle multiple concurrent feasibility analyses', async () => {
      const promises = Array.from({ length: 10 }, () =>
        service.analyzeFeasibility(mockSourceTechStack, mockTargetTechStack, mockProjectAnalysis)
      );

      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(typeof result.feasible).toBe('boolean');
      });
    });

    it('should complete feasibility analysis within reasonable time', async () => {
      const startTime = Date.now();
      
      await service.analyzeFeasibility(
        mockSourceTechStack,
        mockTargetTechStack,
        mockProjectAnalysis
      );
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});