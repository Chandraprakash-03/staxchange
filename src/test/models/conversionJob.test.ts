import { describe, it, expect } from 'vitest';
import { ConversionJobModel } from '@/models/conversionJob';
import { ConversionPlan, ConversionTask } from '@/types';

describe('ConversionJobModel', () => {
  describe('validateJobData', () => {
    it('should validate required fields', () => {
      const result = ConversionJobModel.validateJobData({});
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors.map(e => e.field)).toContain('projectId');
      expect(result.errors.map(e => e.field)).toContain('plan');
    });

    it('should pass validation with valid data', () => {
      const validJobData = {
        project: { connect: { id: 'test-project-id' } },
        plan: {
          id: 'test-plan-id',
          projectId: 'test-project-id',
          tasks: [
            {
              id: 'task-1',
              type: 'analysis' as const,
              description: 'Analyze project structure',
              inputFiles: ['src/'],
              outputFiles: ['analysis.json'],
              dependencies: [],
              agentType: 'analysis' as const,
              priority: 1,
              status: 'pending' as const,
              estimatedDuration: 300,
            },
          ],
          estimatedDuration: 300,
          complexity: 'medium' as const,
          warnings: [],
          feasible: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      const result = ConversionJobModel.validateJobData(validJobData);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate status values', () => {
      const invalidStatusData = {
        project: { connect: { id: 'test-project-id' } },
        plan: {
          id: 'test-plan-id',
          projectId: 'test-project-id',
          tasks: [],
          estimatedDuration: 300,
          complexity: 'medium' as const,
          warnings: [],
          feasible: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        status: 'invalid-status',
      };

      const result = ConversionJobModel.validateJobData(invalidStatusData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'status' && e.code === 'INVALID_VALUE')).toBe(true);
    });

    it('should validate progress range', () => {
      const invalidProgressData = {
        project: { connect: { id: 'test-project-id' } },
        plan: {
          id: 'test-plan-id',
          projectId: 'test-project-id',
          tasks: [],
          estimatedDuration: 300,
          complexity: 'medium' as const,
          warnings: [],
          feasible: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        progress: 150, // Invalid: over 100
      };

      const result = ConversionJobModel.validateJobData(invalidProgressData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'progress' && e.code === 'INVALID_VALUE')).toBe(true);
    });

    it('should accept valid status values', () => {
      const validStatuses = ['pending', 'running', 'paused', 'completed', 'failed'];

      validStatuses.forEach(status => {
        const result = ConversionJobModel.validateJobData({
          project: { connect: { id: 'test-project-id' } },
          plan: {
            id: 'test-plan-id',
            projectId: 'test-project-id',
            tasks: [],
            estimatedDuration: 300,
            complexity: 'medium' as const,
            warnings: [],
            feasible: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          status,
        });
        
        expect(result.isValid).toBe(true);
      });
    });

    it('should accept valid progress values', () => {
      const validProgressValues = [0, 25, 50, 75, 100];

      validProgressValues.forEach(progress => {
        const result = ConversionJobModel.validateJobData({
          project: { connect: { id: 'test-project-id' } },
          plan: {
            id: 'test-plan-id',
            projectId: 'test-project-id',
            tasks: [],
            estimatedDuration: 300,
            complexity: 'medium' as const,
            warnings: [],
            feasible: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          progress,
        });
        
        expect(result.isValid).toBe(true);
      });
    });
  });

  describe('validateConversionPlan', () => {
    it('should validate required fields', () => {
      const incompletePlan: Partial<ConversionPlan> = {
        tasks: [],
      };

      const result = ConversionJobModel.validateConversionPlan(incompletePlan as ConversionPlan);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'plan.id')).toBe(true);
      expect(result.errors.some(e => e.field === 'plan.projectId')).toBe(true);
    });

    it('should validate complexity values', () => {
      const invalidComplexityPlan: ConversionPlan = {
        id: 'test-plan-id',
        projectId: 'test-project-id',
        tasks: [],
        estimatedDuration: 300,
        complexity: 'invalid' as any,
        warnings: [],
        feasible: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = ConversionJobModel.validateConversionPlan(invalidComplexityPlan);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'plan.complexity' && e.code === 'INVALID_VALUE')).toBe(true);
    });

    it('should validate estimated duration', () => {
      const invalidDurationPlan: ConversionPlan = {
        id: 'test-plan-id',
        projectId: 'test-project-id',
        tasks: [],
        estimatedDuration: -100, // Invalid: negative
        complexity: 'medium',
        warnings: [],
        feasible: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = ConversionJobModel.validateConversionPlan(invalidDurationPlan);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'plan.estimatedDuration' && e.code === 'INVALID_VALUE')).toBe(true);
    });

    it('should warn about empty task list', () => {
      const emptyTasksPlan: ConversionPlan = {
        id: 'test-plan-id',
        projectId: 'test-project-id',
        tasks: [],
        estimatedDuration: 300,
        complexity: 'medium',
        warnings: [],
        feasible: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = ConversionJobModel.validateConversionPlan(emptyTasksPlan);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Conversion plan has no tasks');
    });

    it('should validate individual tasks', () => {
      const invalidTaskPlan: ConversionPlan = {
        id: 'test-plan-id',
        projectId: 'test-project-id',
        tasks: [
          {
            id: '', // Invalid: empty ID
            type: 'analysis',
            description: '', // Invalid: empty description
            inputFiles: [],
            outputFiles: [],
            dependencies: [],
            agentType: 'analysis',
            priority: 1,
            status: 'pending',
            estimatedDuration: 300,
          } as ConversionTask,
        ],
        estimatedDuration: 300,
        complexity: 'medium',
        warnings: [],
        feasible: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = ConversionJobModel.validateConversionPlan(invalidTaskPlan);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'plan.tasks[0].id')).toBe(true);
      expect(result.errors.some(e => e.field === 'plan.tasks[0].description')).toBe(true);
    });

    it('should pass validation with valid plan', () => {
      const validPlan: ConversionPlan = {
        id: 'test-plan-id',
        projectId: 'test-project-id',
        tasks: [
          {
            id: 'task-1',
            type: 'analysis',
            description: 'Analyze project structure',
            inputFiles: ['src/'],
            outputFiles: ['analysis.json'],
            dependencies: [],
            agentType: 'analysis',
            priority: 1,
            status: 'pending',
            estimatedDuration: 300,
          },
          {
            id: 'task-2',
            type: 'code_generation',
            description: 'Generate converted code',
            inputFiles: ['src/'],
            outputFiles: ['dist/'],
            dependencies: ['task-1'],
            agentType: 'code_generation',
            priority: 2,
            status: 'pending',
            estimatedDuration: 600,
          },
        ],
        estimatedDuration: 900,
        complexity: 'high',
        warnings: ['This is a complex conversion'],
        feasible: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = ConversionJobModel.validateConversionPlan(validPlan);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept valid complexity values', () => {
      const validComplexities = ['low', 'medium', 'high'];

      validComplexities.forEach(complexity => {
        const plan: ConversionPlan = {
          id: 'test-plan-id',
          projectId: 'test-project-id',
          tasks: [],
          estimatedDuration: 300,
          complexity: complexity as 'low' | 'medium' | 'high',
          warnings: [],
          feasible: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const result = ConversionJobModel.validateConversionPlan(plan);
        
        expect(result.isValid).toBe(true);
      });
    });
  });
});