import { BaseService } from './base';
import { 
  TechStack, 
  ConversionPlan, 
  ConversionTask, 
  TaskType, 
  AgentType,
  ValidationResult,
  ValidationError,
  ProjectAnalysis,
  TaskStatus
} from '../types';
import { randomUUID } from 'crypto';

export interface ConversionFeasibilityResult {
  feasible: boolean;
  confidence: number;
  complexity: 'low' | 'medium' | 'high';
  estimatedDuration: number; // in minutes
  warnings: string[];
  blockers: string[];
  recommendations: string[];
}

export interface TechStackCompatibility {
  compatible: boolean;
  compatibilityScore: number; // 0-1
  issues: CompatibilityIssue[];
  migrations: MigrationPath[];
}

export interface CompatibilityIssue {
  type: 'warning' | 'error' | 'info';
  category: 'language' | 'framework' | 'database' | 'deployment' | 'dependency';
  message: string;
  impact: 'low' | 'medium' | 'high';
  autoFixable: boolean;
}

export interface MigrationPath {
  from: string;
  to: string;
  category: string;
  complexity: 'low' | 'medium' | 'high';
  steps: string[];
  estimatedTime: number; // in minutes
}

interface CompatibilityValidationResult {
  score: number;
  issues: CompatibilityIssue[];
  migrations: MigrationPath[];
}

export class ConversionPlanningService extends BaseService {
  
  /**
   * Analyze conversion feasibility between source and target tech stacks
   */
  async analyzeFeasibility(
    sourceTechStack: TechStack,
    targetTechStack: TechStack,
    projectAnalysis?: ProjectAnalysis
  ): Promise<ConversionFeasibilityResult> {
    try {
      this.log('Analyzing conversion feasibility', { sourceTechStack, targetTechStack });
      
      const compatibility = await this.validateTechStackCompatibility(sourceTechStack, targetTechStack);
      const complexity = this.calculateConversionComplexity(sourceTechStack, targetTechStack, projectAnalysis);
      const duration = this.estimateConversionDuration(complexity, projectAnalysis);
      
      const warnings: string[] = [];
      const blockers: string[] = [];
      const recommendations: string[] = [];
      
      // Analyze compatibility issues
      for (const issue of compatibility.issues) {
        if (issue.type === 'error') {
          blockers.push(issue.message);
        } else if (issue.type === 'warning') {
          warnings.push(issue.message);
        }
      }
      
      // Generate recommendations
      recommendations.push(...this.generateRecommendations(sourceTechStack, targetTechStack, compatibility));
      
      const feasible = blockers.length === 0 && compatibility.compatible;
      const confidence = this.calculateFeasibilityConfidence(compatibility, complexity, projectAnalysis);
      
      return {
        feasible,
        confidence,
        complexity,
        estimatedDuration: duration,
        warnings,
        blockers,
        recommendations
      };
    } catch (error) {
      this.error('Failed to analyze conversion feasibility:', error as Error);
      throw error;
    }
  }

  /**
   * Validate compatibility between source and target tech stacks
   */
  async validateTechStackCompatibility(
    source: TechStack,
    target: TechStack
  ): Promise<TechStackCompatibility> {
    try {
      this.log('Validating tech stack compatibility', { source, target });
      
      const issues: CompatibilityIssue[] = [];
      const migrations: MigrationPath[] = [];
      let compatibilityScore = 1.0;
      
      // Language compatibility
      const languageCompatibility = this.validateLanguageCompatibility(source.language, target.language);
      issues.push(...languageCompatibility.issues);
      migrations.push(...languageCompatibility.migrations);
      compatibilityScore *= languageCompatibility.score;
      
      // Framework compatibility
      if (source.framework && target.framework) {
        const frameworkCompatibility = this.validateFrameworkCompatibility(
          source.framework, 
          target.framework,
          source.language,
          target.language
        );
        issues.push(...frameworkCompatibility.issues);
        migrations.push(...frameworkCompatibility.migrations);
        compatibilityScore *= frameworkCompatibility.score;
      }
      
      // Database compatibility
      if (source.database && target.database) {
        const dbCompatibility = this.validateDatabaseCompatibility(source.database, target.database);
        issues.push(...dbCompatibility.issues);
        migrations.push(...dbCompatibility.migrations);
        compatibilityScore *= dbCompatibility.score;
      }
      
      // Build tool compatibility
      if (source.buildTool && target.buildTool) {
        const buildCompatibility = this.validateBuildToolCompatibility(
          source.buildTool, 
          target.buildTool,
          source.language,
          target.language
        );
        issues.push(...buildCompatibility.issues);
        migrations.push(...buildCompatibility.migrations);
        compatibilityScore *= buildCompatibility.score;
      }
      
      const compatible = !issues.some(issue => issue.type === 'error');
      
      return {
        compatible,
        compatibilityScore,
        issues,
        migrations
      };
    } catch (error) {
      this.error('Failed to validate tech stack compatibility:', error as Error);
      throw error;
    }
  }

  /**
   * Generate a detailed conversion plan
   */
  async generateConversionPlan(
    projectId: string,
    sourceTechStack: TechStack,
    targetTechStack: TechStack,
    projectAnalysis?: ProjectAnalysis
  ): Promise<ConversionPlan> {
    try {
      this.log('Generating conversion plan', { projectId, sourceTechStack, targetTechStack });
      
      const feasibility = await this.analyzeFeasibility(sourceTechStack, targetTechStack, projectAnalysis);
      
      if (!feasibility.feasible) {
        throw new Error(`Conversion not feasible: ${feasibility.blockers.join(', ')}`);
      }
      
      const tasks = await this.generateConversionTasks(
        sourceTechStack, 
        targetTechStack, 
        projectAnalysis
      );
      
      const plan: ConversionPlan = {
        id: randomUUID(),
        projectId,
        tasks,
        estimatedDuration: feasibility.estimatedDuration,
        complexity: feasibility.complexity,
        warnings: feasibility.warnings,
        feasible: feasibility.feasible,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      return plan;
    } catch (error) {
      this.error('Failed to generate conversion plan:', error as Error);
      throw error;
    }
  }

  /**
   * Validate a conversion plan
   */
  async validateConversionPlan(plan: ConversionPlan): Promise<ValidationResult> {
    try {
      this.log('Validating conversion plan', { planId: plan.id });
      
      const errors: ValidationError[] = [];
      const warnings: string[] = [];
      
      // Validate plan structure
      if (!plan.id || !plan.projectId) {
        errors.push({
          field: 'plan',
          message: 'Plan must have valid ID and project ID',
          code: 'INVALID_PLAN_STRUCTURE'
        });
      }
      
      // Validate tasks
      if (!plan.tasks || plan.tasks.length === 0) {
        errors.push({
          field: 'tasks',
          message: 'Plan must contain at least one task',
          code: 'NO_TASKS'
        });
      } else {
        // Validate each task
        for (const task of plan.tasks) {
          const taskValidation = this.validateTask(task);
          errors.push(...taskValidation.errors);
          warnings.push(...taskValidation.warnings);
        }
        
        // Validate task dependencies
        const dependencyValidation = this.validateTaskDependencies(plan.tasks);
        errors.push(...dependencyValidation.errors);
        warnings.push(...dependencyValidation.warnings);
      }
      
      // Validate duration estimate
      if (plan.estimatedDuration <= 0) {
        warnings.push('Estimated duration should be greater than 0');
      }
      
      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      this.error('Failed to validate conversion plan:', error as Error);
      throw error;
    }
  }

  /**
   * Calculate conversion complexity based on tech stack differences
   */
  private calculateConversionComplexity(
    source: TechStack,
    target: TechStack,
    projectAnalysis?: ProjectAnalysis
  ): 'low' | 'medium' | 'high' {
    let complexityScore = 0;
    
    // Language complexity
    if (source.language !== target.language) {
      const languageComplexity = this.getLanguageConversionComplexity(source.language, target.language);
      complexityScore += languageComplexity;
    }
    
    // Framework complexity
    if (source.framework !== target.framework) {
      complexityScore += 2;
    }
    
    // Database complexity
    if (source.database !== target.database) {
      complexityScore += 1;
    }
    
    // Project size complexity
    if (projectAnalysis) {
      const fileCount = this.estimateFileCount(projectAnalysis);
      if (fileCount > 100) complexityScore += 2;
      else if (fileCount > 50) complexityScore += 1;
      
      const dependencyCount = projectAnalysis.dependencies?.length || 0;
      if (dependencyCount > 50) complexityScore += 2;
      else if (dependencyCount > 20) complexityScore += 1;
    }
    
    // Determine complexity level
    if (complexityScore <= 2) return 'low';
    if (complexityScore <= 5) return 'medium';
    return 'high';
  }

  /**
   * Estimate conversion duration based on complexity and project analysis
   */
  private estimateConversionDuration(
    complexity: 'low' | 'medium' | 'high',
    projectAnalysis?: ProjectAnalysis
  ): number {
    let baseDuration = 0;
    
    // Base duration by complexity
    switch (complexity) {
      case 'low':
        baseDuration = 30; // 30 minutes
        break;
      case 'medium':
        baseDuration = 120; // 2 hours
        break;
      case 'high':
        baseDuration = 480; // 8 hours
        break;
    }
    
    // Adjust based on project size
    if (projectAnalysis) {
      const fileCount = this.estimateFileCount(projectAnalysis);
      const fileFactor = Math.max(1, fileCount / 20); // 1 minute per 20 files
      baseDuration *= fileFactor;
      
      const dependencyCount = projectAnalysis.dependencies?.length || 0;
      const depFactor = Math.max(1, dependencyCount / 10); // Factor for dependencies
      baseDuration *= Math.min(depFactor, 2); // Cap at 2x
    }
    
    return Math.round(baseDuration);
  }

  /**
   * Generate recommendations based on tech stack compatibility
   */
  private generateRecommendations(
    source: TechStack,
    target: TechStack,
    compatibility: TechStackCompatibility
  ): string[] {
    const recommendations: string[] = [];
    
    // Language-specific recommendations
    if (source.language !== target.language) {
      recommendations.push(
        `Consider using automated migration tools for ${source.language} to ${target.language} conversion`
      );
    }
    
    // Framework recommendations
    if (source.framework && target.framework && source.framework !== target.framework) {
      recommendations.push(
        `Review component architecture differences between ${source.framework} and ${target.framework}`
      );
    }
    
    // Database recommendations
    if (source.database && target.database && source.database !== target.database) {
      recommendations.push(
        `Plan database schema migration from ${source.database} to ${target.database}`
      );
    }
    
    // Compatibility-based recommendations
    if (compatibility.compatibilityScore < 0.8) {
      recommendations.push('Consider a phased migration approach due to low compatibility score');
    }
    
    // Add migration path recommendations
    for (const migration of compatibility.migrations) {
      if (migration.complexity === 'high') {
        recommendations.push(
          `High complexity migration required for ${migration.from} to ${migration.to}: ${migration.steps.join(', ')}`
        );
      }
    }
    
    return recommendations;
  }

  /**
   * Calculate feasibility confidence score
   */
  private calculateFeasibilityConfidence(
    compatibility: TechStackCompatibility,
    complexity: 'low' | 'medium' | 'high',
    projectAnalysis?: ProjectAnalysis
  ): number {
    let confidence = compatibility.compatibilityScore;
    
    // Boost confidence for compatible stacks
    if (compatibility.compatible && compatibility.compatibilityScore > 0.7) {
      confidence = Math.max(confidence, 0.8);
    }
    
    // Adjust based on complexity
    switch (complexity) {
      case 'low':
        confidence *= 0.95;
        break;
      case 'medium':
        confidence *= 0.85;
        break;
      case 'high':
        confidence *= 0.7;
        break;
    }
    
    // Adjust based on project analysis
    if (projectAnalysis) {
      const dependencyCount = projectAnalysis.dependencies?.length || 0;
      if (dependencyCount > 50) {
        confidence *= 0.9;
      }
    }
    
    // Factor in error issues
    const errorCount = compatibility.issues.filter(issue => issue.type === 'error').length;
    if (errorCount > 0) {
      confidence *= Math.max(0.1, 1 - (errorCount * 0.3));
    }
    
    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Validate language compatibility
   */
  private validateLanguageCompatibility(
    sourceLanguage: string,
    targetLanguage: string
  ): CompatibilityValidationResult {
    const issues: CompatibilityIssue[] = [];
    const migrations: MigrationPath[] = [];
    let score = 1.0;
    
    if (sourceLanguage === targetLanguage) {
      return { score, issues, migrations };
    }
    
    // Define language compatibility matrix
    const compatibilityMatrix: Record<string, Record<string, number>> = {
      'javascript': { 'typescript': 0.9, 'python': 0.6, 'java': 0.4, 'csharp': 0.4 },
      'typescript': { 'javascript': 0.95, 'python': 0.6, 'java': 0.5, 'csharp': 0.5 },
      'python': { 'javascript': 0.6, 'typescript': 0.6, 'java': 0.5, 'csharp': 0.5 },
      'java': { 'csharp': 0.8, 'kotlin': 0.9, 'javascript': 0.4, 'python': 0.5 },
      'csharp': { 'java': 0.8, 'javascript': 0.4, 'typescript': 0.5, 'python': 0.5 }
    };
    
    const sourceKey = sourceLanguage.toLowerCase();
    const targetKey = targetLanguage.toLowerCase();
    
    score = compatibilityMatrix[sourceKey]?.[targetKey] || 0.3;
    
    if (score < 0.4) {
      issues.push({
        type: 'error',
        category: 'language',
        message: `Very low compatibility between ${sourceLanguage} and ${targetLanguage}`,
        impact: 'high',
        autoFixable: false
      });
    } else if (score < 0.6) {
      issues.push({
        type: 'warning',
        category: 'language',
        message: `Low compatibility between ${sourceLanguage} and ${targetLanguage}`,
        impact: 'high',
        autoFixable: false
      });
    }
    
    // Add migration path
    migrations.push({
      from: sourceLanguage,
      to: targetLanguage,
      category: 'language',
      complexity: score > 0.7 ? 'low' : score > 0.5 ? 'medium' : 'high',
      steps: [
        'Analyze syntax differences',
        'Convert language-specific constructs',
        'Update type systems',
        'Migrate standard library usage'
      ],
      estimatedTime: score > 0.7 ? 60 : score > 0.5 ? 180 : 360
    });
    
    return { score, issues, migrations };
  }

  /**
   * Validate framework compatibility
   */
  private validateFrameworkCompatibility(
    sourceFramework: string,
    targetFramework: string,
    sourceLanguage: string,
    targetLanguage: string
  ): CompatibilityValidationResult {
    const issues: CompatibilityIssue[] = [];
    const migrations: MigrationPath[] = [];
    let score = 1.0;
    
    if (sourceFramework === targetFramework) {
      return { score, issues, migrations };
    }
    
    // Framework compatibility logic
    const frameworkCompatibility: Record<string, Record<string, number>> = {
      'react': { 'vue': 0.7, 'angular': 0.6, 'svelte': 0.6, 'nextjs': 0.95 },
      'vue': { 'react': 0.7, 'angular': 0.5, 'svelte': 0.6, 'nuxtjs': 0.9 },
      'angular': { 'react': 0.6, 'vue': 0.5, 'svelte': 0.4 },
      'express': { 'fastify': 0.8, 'koa': 0.7, 'nestjs': 0.6 },
      'django': { 'flask': 0.7, 'fastapi': 0.6 },
      'spring': { 'springboot': 0.9, 'quarkus': 0.6 }
    };
    
    const sourceKey = sourceFramework.toLowerCase();
    const targetKey = targetFramework.toLowerCase();
    
    score = frameworkCompatibility[sourceKey]?.[targetKey] || 0.4;
    
    // Language mismatch penalty
    if (sourceLanguage !== targetLanguage) {
      score *= 0.7;
    }
    
    if (score < 0.6) {
      issues.push({
        type: 'warning',
        category: 'framework',
        message: `Framework migration from ${sourceFramework} to ${targetFramework} requires significant changes`,
        impact: 'medium',
        autoFixable: false
      });
    }
    
    migrations.push({
      from: sourceFramework,
      to: targetFramework,
      category: 'framework',
      complexity: score > 0.7 ? 'low' : score > 0.5 ? 'medium' : 'high',
      steps: [
        'Analyze component architecture',
        'Convert routing system',
        'Migrate state management',
        'Update build configuration'
      ],
      estimatedTime: score > 0.7 ? 90 : score > 0.5 ? 240 : 480
    });
    
    return { score, issues, migrations };
  }

  /**
   * Validate database compatibility
   */
  private validateDatabaseCompatibility(
    sourceDatabase: string,
    targetDatabase: string
  ): CompatibilityValidationResult {
    const issues: CompatibilityIssue[] = [];
    const migrations: MigrationPath[] = [];
    let score = 1.0;
    
    if (sourceDatabase === targetDatabase) {
      return { score, issues, migrations };
    }
    
    const dbCompatibility: Record<string, Record<string, number>> = {
      'postgresql': { 'mysql': 0.8, 'sqlite': 0.7, 'mongodb': 0.4 },
      'mysql': { 'postgresql': 0.8, 'sqlite': 0.7, 'mongodb': 0.4 },
      'sqlite': { 'postgresql': 0.6, 'mysql': 0.6, 'mongodb': 0.3 },
      'mongodb': { 'postgresql': 0.4, 'mysql': 0.4, 'sqlite': 0.3 }
    };
    
    const sourceKey = sourceDatabase.toLowerCase();
    const targetKey = targetDatabase.toLowerCase();
    
    score = dbCompatibility[sourceKey]?.[targetKey] || 0.3;
    
    if (score < 0.5) {
      issues.push({
        type: 'warning',
        category: 'database',
        message: `Database migration from ${sourceDatabase} to ${targetDatabase} may require schema redesign`,
        impact: 'high',
        autoFixable: false
      });
    }
    
    migrations.push({
      from: sourceDatabase,
      to: targetDatabase,
      category: 'database',
      complexity: score > 0.7 ? 'low' : score > 0.5 ? 'medium' : 'high',
      steps: [
        'Export existing schema',
        'Convert data types',
        'Migrate relationships',
        'Update queries and indexes'
      ],
      estimatedTime: score > 0.7 ? 45 : score > 0.5 ? 120 : 300
    });
    
    return { score, issues, migrations };
  }

  /**
   * Validate build tool compatibility
   */
  private validateBuildToolCompatibility(
    sourceBuildTool: string,
    targetBuildTool: string,
    sourceLanguage: string,
    targetLanguage: string
  ): CompatibilityValidationResult {
    const issues: CompatibilityIssue[] = [];
    const migrations: MigrationPath[] = [];
    let score = 1.0;
    
    if (sourceBuildTool === targetBuildTool) {
      return { score, issues, migrations };
    }
    
    const buildToolCompatibility: Record<string, Record<string, number>> = {
      'webpack': { 'vite': 0.85, 'rollup': 0.7, 'parcel': 0.6 },
      'vite': { 'webpack': 0.8, 'rollup': 0.8, 'parcel': 0.6 },
      'maven': { 'gradle': 0.8, 'sbt': 0.5 },
      'gradle': { 'maven': 0.8, 'sbt': 0.6 },
      'npm': { 'yarn': 0.9, 'pnpm': 0.8 }
    };
    
    const sourceKey = sourceBuildTool.toLowerCase();
    const targetKey = targetBuildTool.toLowerCase();
    
    score = buildToolCompatibility[sourceKey]?.[targetKey] || 0.5;
    
    // Language compatibility affects build tool migration
    if (sourceLanguage !== targetLanguage) {
      score *= 0.8;
    }
    
    if (score < 0.6) {
      issues.push({
        type: 'info',
        category: 'dependency',
        message: `Build tool migration from ${sourceBuildTool} to ${targetBuildTool} required`,
        impact: 'medium',
        autoFixable: true
      });
    }
    
    migrations.push({
      from: sourceBuildTool,
      to: targetBuildTool,
      category: 'build',
      complexity: score > 0.7 ? 'low' : 'medium',
      steps: [
        'Convert build configuration',
        'Update dependency management',
        'Migrate build scripts',
        'Update CI/CD pipeline'
      ],
      estimatedTime: score > 0.7 ? 30 : 90
    });
    
    return { score, issues, migrations };
  }

  /**
   * Generate conversion tasks based on tech stack differences
   */
  private async generateConversionTasks(
    source: TechStack,
    target: TechStack,
    projectAnalysis?: ProjectAnalysis
  ): Promise<ConversionTask[]> {
    const tasks: ConversionTask[] = [];
    let priority = 1;
    
    // Analysis task (always first)
    tasks.push({
      id: randomUUID(),
      type: 'analysis',
      description: 'Analyze project structure and dependencies',
      inputFiles: ['**/*'],
      outputFiles: ['analysis-report.json'],
      dependencies: [],
      agentType: 'analysis',
      priority: priority++,
      status: 'pending',
      estimatedDuration: 15,
      context: { source, target }
    });
    
    // Language conversion task
    if (source.language !== target.language) {
      tasks.push({
        id: randomUUID(),
        type: 'code_generation',
        description: `Convert code from ${source.language} to ${target.language}`,
        inputFiles: this.getLanguageFiles(source.language),
        outputFiles: this.getLanguageFiles(target.language),
        dependencies: [tasks[0].id],
        agentType: 'code_generation',
        priority: priority++,
        status: 'pending',
        estimatedDuration: 120,
        context: { sourceLanguage: source.language, targetLanguage: target.language }
      });
    }
    
    // Framework conversion task
    if (source.framework && target.framework && source.framework !== target.framework) {
      tasks.push({
        id: randomUUID(),
        type: 'code_generation',
        description: `Migrate from ${source.framework} to ${target.framework}`,
        inputFiles: this.getFrameworkFiles(source.framework),
        outputFiles: this.getFrameworkFiles(target.framework),
        dependencies: tasks.length > 1 ? [tasks[tasks.length - 1].id] : [tasks[0].id],
        agentType: 'code_generation',
        priority: priority++,
        status: 'pending',
        estimatedDuration: 180,
        context: { sourceFramework: source.framework, targetFramework: target.framework }
      });
    }
    
    // Dependency update task
    tasks.push({
      id: randomUUID(),
      type: 'dependency_update',
      description: 'Update dependencies and package configuration',
      inputFiles: ['package.json', 'requirements.txt', 'pom.xml', 'build.gradle'],
      outputFiles: ['package.json', 'requirements.txt', 'pom.xml', 'build.gradle'],
      dependencies: tasks.length > 1 ? [tasks[tasks.length - 1].id] : [tasks[0].id],
      agentType: 'planning',
      priority: priority++,
      status: 'pending',
      estimatedDuration: 30,
      context: { source, target }
    });
    
    // Configuration update task
    tasks.push({
      id: randomUUID(),
      type: 'config_update',
      description: 'Update build and deployment configuration',
      inputFiles: ['*.config.js', '*.config.ts', 'Dockerfile', 'docker-compose.yml'],
      outputFiles: ['*.config.js', '*.config.ts', 'Dockerfile', 'docker-compose.yml'],
      dependencies: [tasks[tasks.length - 1].id],
      agentType: 'planning',
      priority: priority++,
      status: 'pending',
      estimatedDuration: 45,
      context: { source, target }
    });
    
    // Validation task
    tasks.push({
      id: randomUUID(),
      type: 'validation',
      description: 'Validate converted code and run tests',
      inputFiles: ['**/*'],
      outputFiles: ['validation-report.json'],
      dependencies: [tasks[tasks.length - 1].id],
      agentType: 'validation',
      priority: priority++,
      status: 'pending',
      estimatedDuration: 60,
      context: { target }
    });
    
    // Integration task (final)
    tasks.push({
      id: randomUUID(),
      type: 'integration',
      description: 'Integrate all components and ensure functionality',
      inputFiles: ['**/*'],
      outputFiles: ['integration-report.json'],
      dependencies: [tasks[tasks.length - 1].id],
      agentType: 'integration',
      priority: priority++,
      status: 'pending',
      estimatedDuration: 90,
      context: { source, target, projectAnalysis }
    });
    
    return tasks;
  }

  /**
   * Validate individual task
   */
  private validateTask(task: ConversionTask): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];
    
    if (!task.id) {
      errors.push({
        field: 'task.id',
        message: 'Task must have a valid ID',
        code: 'MISSING_TASK_ID'
      });
    }
    
    if (!task.description) {
      errors.push({
        field: 'task.description',
        message: 'Task must have a description',
        code: 'MISSING_DESCRIPTION'
      });
    }
    
    if (!task.type) {
      errors.push({
        field: 'task.type',
        message: 'Task must have a valid type',
        code: 'MISSING_TASK_TYPE'
      });
    }
    
    if (!task.agentType) {
      errors.push({
        field: 'task.agentType',
        message: 'Task must specify an agent type',
        code: 'MISSING_AGENT_TYPE'
      });
    }
    
    if (task.estimatedDuration <= 0) {
      warnings.push('Task should have a positive estimated duration');
    }
    
    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate task dependencies
   */
  private validateTaskDependencies(tasks: ConversionTask[]): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];
    const taskIds = new Set(tasks.map(t => t.id));
    
    for (const task of tasks) {
      for (const depId of task.dependencies) {
        if (!taskIds.has(depId)) {
          errors.push({
            field: 'task.dependencies',
            message: `Task ${task.id} has invalid dependency ${depId}`,
            code: 'INVALID_DEPENDENCY'
          });
        }
      }
    }
    
    // Check for circular dependencies
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    
    const hasCycle = (taskId: string): boolean => {
      if (recursionStack.has(taskId)) return true;
      if (visited.has(taskId)) return false;
      
      visited.add(taskId);
      recursionStack.add(taskId);
      
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        for (const depId of task.dependencies) {
          if (hasCycle(depId)) return true;
        }
      }
      
      recursionStack.delete(taskId);
      return false;
    };
    
    for (const task of tasks) {
      if (hasCycle(task.id)) {
        errors.push({
          field: 'task.dependencies',
          message: 'Circular dependency detected in task graph',
          code: 'CIRCULAR_DEPENDENCY'
        });
        break;
      }
    }
    
    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Helper methods
   */
  private getLanguageConversionComplexity(source: string, target: string): number {
    const complexityMatrix: Record<string, Record<string, number>> = {
      'javascript': { 'typescript': 1, 'python': 3, 'java': 4 },
      'typescript': { 'javascript': 1, 'python': 3, 'java': 4 },
      'python': { 'javascript': 3, 'typescript': 3, 'java': 3 },
      'java': { 'javascript': 4, 'typescript': 4, 'python': 3 }
    };
    
    return complexityMatrix[source.toLowerCase()]?.[target.toLowerCase()] || 5;
  }

  private estimateFileCount(projectAnalysis: ProjectAnalysis): number {
    // Estimate based on dependencies and architecture
    const baseFiles = 20;
    const depFactor = (projectAnalysis.dependencies?.length || 0) * 0.5;
    const archFactor = projectAnalysis.architecture === 'microservices' ? 2 : 1;
    
    return Math.round((baseFiles + depFactor) * archFactor);
  }

  private getLanguageFiles(language: string): string[] {
    const extensions: Record<string, string[]> = {
      'javascript': ['**/*.js', '**/*.jsx'],
      'typescript': ['**/*.ts', '**/*.tsx'],
      'python': ['**/*.py'],
      'java': ['**/*.java'],
      'csharp': ['**/*.cs']
    };
    
    return extensions[language.toLowerCase()] || ['**/*'];
  }

  private getFrameworkFiles(framework: string): string[] {
    const patterns: Record<string, string[]> = {
      'react': ['**/*.jsx', '**/*.tsx', '**/components/**/*'],
      'vue': ['**/*.vue', '**/components/**/*'],
      'angular': ['**/*.component.ts', '**/*.service.ts', '**/*.module.ts'],
      'express': ['**/routes/**/*', '**/middleware/**/*', '**/controllers/**/*'],
      'django': ['**/*.py', '**/templates/**/*', '**/static/**/*']
    };
    
    return patterns[framework.toLowerCase()] || ['**/*'];
  }
}