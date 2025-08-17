// Planning Agent - Creates detailed conversion plans and task breakdowns

import { BaseAgent } from './base';
import { AgentContext, AgentResult } from './types';
import { ConversionTask, ConversionPlan, TaskType, AgentType } from '../types';

export class PlanningAgent extends BaseAgent {
  constructor() {
    super('PlanningAgent', 'planning', ['planning', 'task_generation', 'dependency_planning']);
  }

  async execute(task: ConversionTask, context: AgentContext): Promise<AgentResult> {
    try {
      switch (task.type) {
        case 'analysis':
          return await this.createConversionPlan(task, context);
        default:
          return this.createErrorResult(`Unsupported task type: ${task.type}`);
      }
    } catch (error) {
      return this.createErrorResult(`Planning failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async createConversionPlan(task: ConversionTask, context: AgentContext): Promise<AgentResult> {
    const plan = await this.generateDetailedPlan(context);
    
    return this.createSuccessResult(plan, undefined, {
      planType: 'conversion_plan',
      timestamp: new Date().toISOString(),
      estimatedDuration: plan.estimatedDuration,
      complexity: plan.complexity
    });
  }

  private async generateDetailedPlan(context: AgentContext): Promise<ConversionPlan> {
    const tasks = await this.generateConversionTasks(context);
    const dependencies = this.calculateTaskDependencies(tasks);
    const complexity = this.assessComplexity(context, tasks);
    const estimatedDuration = this.estimateDuration(tasks, complexity);
    const warnings = this.generateWarnings(context, tasks);

    return {
      id: `plan_${Date.now()}`,
      projectId: context.projectId,
      tasks: this.optimizeTaskOrder(tasks, dependencies),
      estimatedDuration,
      complexity,
      warnings,
      feasible: this.assessFeasibility(context, tasks),
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  private async generateConversionTasks(context: AgentContext): Promise<ConversionTask[]> {
    const tasks: ConversionTask[] = [];
    let taskId = 1;

    // 1. Analysis tasks
    tasks.push(...this.createAnalysisTasks(context, taskId));
    taskId += tasks.length;

    // 2. Dependency update tasks
    tasks.push(...this.createDependencyTasks(context, taskId));
    taskId += tasks.length;

    // 3. Configuration update tasks
    tasks.push(...this.createConfigurationTasks(context, taskId));
    taskId += tasks.length;

    // 4. Code generation tasks
    tasks.push(...this.createCodeGenerationTasks(context, taskId));
    taskId += tasks.length;

    // 5. Validation tasks
    tasks.push(...this.createValidationTasks(context, taskId));
    taskId += tasks.length;

    // 6. Integration tasks
    tasks.push(...this.createIntegrationTasks(context, taskId));

    return tasks;
  }

  private createAnalysisTasks(context: AgentContext, startId: number): ConversionTask[] {
    const tasks: ConversionTask[] = [];
    
    tasks.push({
      id: `task_${startId}`,
      type: 'analysis',
      description: 'Analyze source code structure and dependencies',
      inputFiles: this.getAllSourceFiles(context.sourceFiles),
      outputFiles: ['analysis_report.json'],
      dependencies: [],
      agentType: 'analysis',
      priority: 1,
      status: 'pending',
      estimatedDuration: 300, // 5 minutes
      context: {
        analysisType: 'comprehensive',
        includeMetrics: true
      }
    });

    return tasks;
  }

  private createDependencyTasks(context: AgentContext, startId: number): ConversionTask[] {
    const tasks: ConversionTask[] = [];
    const packageFiles = this.findPackageFiles(context.sourceFiles);

    packageFiles.forEach((file, index) => {
      tasks.push({
        id: `task_${startId + index}`,
        type: 'dependency_update',
        description: `Update dependencies in ${file}`,
        inputFiles: [file],
        outputFiles: [file],
        dependencies: [`task_${startId - 1}`], // Depends on analysis
        agentType: 'code_generation',
        priority: 2,
        status: 'pending',
        estimatedDuration: 180, // 3 minutes
        context: {
          targetTechStack: context.targetTechStack,
          updateType: 'dependencies'
        }
      });
    });

    return tasks;
  }

  private createConfigurationTasks(context: AgentContext, startId: number): ConversionTask[] {
    const tasks: ConversionTask[] = [];
    const configFiles = this.findConfigFiles(context.sourceFiles);

    configFiles.forEach((file, index) => {
      tasks.push({
        id: `task_${startId + index}`,
        type: 'config_update',
        description: `Update configuration in ${file}`,
        inputFiles: [file],
        outputFiles: [file],
        dependencies: [`task_${startId - 1}`], // Depends on dependency updates
        agentType: 'code_generation',
        priority: 3,
        status: 'pending',
        estimatedDuration: 240, // 4 minutes
        context: {
          targetTechStack: context.targetTechStack,
          configType: this.getConfigType(file)
        }
      });
    });

    return tasks;
  }

  private createCodeGenerationTasks(context: AgentContext, startId: number): ConversionTask[] {
    const tasks: ConversionTask[] = [];
    const sourceFiles = this.getSourceCodeFiles(context.sourceFiles);
    
    // Group files by module/component for batch processing
    const fileGroups = this.groupFilesByModule(sourceFiles);

    fileGroups.forEach((group, index) => {
      tasks.push({
        id: `task_${startId + index}`,
        type: 'code_generation',
        description: `Convert ${group.name} module`,
        inputFiles: group.files,
        outputFiles: group.files.map(f => this.getTargetFileName(f, context.targetTechStack)),
        dependencies: this.getCodeGenerationDependencies(startId, index),
        agentType: 'code_generation',
        priority: 4,
        status: 'pending',
        estimatedDuration: this.estimateCodeGenerationTime(group.files),
        context: {
          moduleType: group.type,
          targetTechStack: context.targetTechStack,
          preserveLogic: true
        }
      });
    });

    return tasks;
  }

  private createValidationTasks(context: AgentContext, startId: number): ConversionTask[] {
    const tasks: ConversionTask[] = [];

    tasks.push({
      id: `task_${startId}`,
      type: 'validation',
      description: 'Validate converted code syntax and structure',
      inputFiles: this.getAllOutputFiles(context),
      outputFiles: ['validation_report.json'],
      dependencies: this.getAllCodeGenerationTaskIds(startId),
      agentType: 'validation',
      priority: 5,
      status: 'pending',
      estimatedDuration: 300, // 5 minutes
      context: {
        validationType: 'syntax_and_structure',
        targetTechStack: context.targetTechStack
      }
    });

    return tasks;
  }

  private createIntegrationTasks(context: AgentContext, startId: number): ConversionTask[] {
    const tasks: ConversionTask[] = [];

    tasks.push({
      id: `task_${startId}`,
      type: 'integration',
      description: 'Integrate all converted components and test compatibility',
      inputFiles: this.getAllOutputFiles(context),
      outputFiles: ['integration_report.json'],
      dependencies: [`task_${startId - 1}`], // Depends on validation
      agentType: 'integration',
      priority: 6,
      status: 'pending',
      estimatedDuration: 600, // 10 minutes
      context: {
        integrationType: 'full_system',
        targetTechStack: context.targetTechStack,
        runTests: true
      }
    });

    return tasks;
  }

  private calculateTaskDependencies(tasks: ConversionTask[]): Map<string, string[]> {
    const dependencies = new Map<string, string[]>();
    
    tasks.forEach(task => {
      dependencies.set(task.id, task.dependencies);
    });

    return dependencies;
  }

  private optimizeTaskOrder(tasks: ConversionTask[], dependencies: Map<string, string[]>): ConversionTask[] {
    // Topological sort to optimize task execution order
    const sorted: ConversionTask[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (taskId: string) => {
      if (visiting.has(taskId)) {
        throw new Error(`Circular dependency detected involving task ${taskId}`);
      }
      if (visited.has(taskId)) return;

      visiting.add(taskId);
      const taskDeps = dependencies.get(taskId) || [];
      taskDeps.forEach(depId => visit(depId));
      visiting.delete(taskId);
      visited.add(taskId);

      const task = tasks.find(t => t.id === taskId);
      if (task) sorted.push(task);
    };

    tasks.forEach(task => {
      if (!visited.has(task.id)) {
        visit(task.id);
      }
    });

    return sorted;
  }

  private assessComplexity(context: AgentContext, tasks: ConversionTask[]): 'low' | 'medium' | 'high' {
    let complexityScore = 0;

    // Language complexity
    if (context.sourceTechStack.language !== context.targetTechStack.language) {
      complexityScore += 3;
    }

    // Framework complexity
    if (context.sourceTechStack.framework !== context.targetTechStack.framework) {
      complexityScore += 2;
    }

    // Database complexity
    if (context.sourceTechStack.database !== context.targetTechStack.database) {
      complexityScore += 2;
    }

    // Task count complexity
    if (tasks.length > 20) complexityScore += 2;
    else if (tasks.length > 10) complexityScore += 1;

    // File count complexity
    const fileCount = this.getAllSourceFiles(context.sourceFiles).length;
    if (fileCount > 100) complexityScore += 3;
    else if (fileCount > 50) complexityScore += 2;
    else if (fileCount > 20) complexityScore += 1;

    if (complexityScore >= 7) return 'high';
    if (complexityScore >= 4) return 'medium';
    return 'low';
  }

  private estimateDuration(tasks: ConversionTask[], complexity: 'low' | 'medium' | 'high'): number {
    const baseDuration = tasks.reduce((sum, task) => sum + task.estimatedDuration, 0);
    
    const complexityMultiplier = {
      'low': 1.0,
      'medium': 1.5,
      'high': 2.0
    };

    return Math.round(baseDuration * complexityMultiplier[complexity]);
  }

  private generateWarnings(context: AgentContext, tasks: ConversionTask[]): string[] {
    const warnings: string[] = [];

    // Check for major language changes
    if (context.sourceTechStack.language !== context.targetTechStack.language) {
      warnings.push(`Language conversion from ${context.sourceTechStack.language} to ${context.targetTechStack.language} may require manual review`);
    }

    // Check for framework changes
    if (context.sourceTechStack.framework !== context.targetTechStack.framework) {
      warnings.push(`Framework migration from ${context.sourceTechStack.framework} to ${context.targetTechStack.framework} may affect application architecture`);
    }

    // Check for large codebases
    const fileCount = this.getAllSourceFiles(context.sourceFiles).length;
    if (fileCount > 100) {
      warnings.push('Large codebase detected - conversion may take significant time and require multiple iterations');
    }

    // Check for complex dependencies
    const complexTasks = tasks.filter(t => t.estimatedDuration > 600);
    if (complexTasks.length > 0) {
      warnings.push(`${complexTasks.length} complex tasks identified - manual intervention may be required`);
    }

    return warnings;
  }

  private assessFeasibility(context: AgentContext, tasks: ConversionTask[]): boolean {
    // Check if conversion is technically feasible
    const sourceLanguage = context.sourceTechStack.language?.toLowerCase();
    const targetLanguage = context.targetTechStack.language?.toLowerCase();

    // Define supported conversion paths
    const supportedConversions = new Set([
      'javascript-typescript',
      'typescript-javascript',
      'python-javascript',
      'python-typescript',
      'javascript-python',
      'typescript-python'
    ]);

    const conversionPath = `${sourceLanguage}-${targetLanguage}`;
    return supportedConversions.has(conversionPath) || sourceLanguage === targetLanguage;
  }

  // Helper methods
  private getAllSourceFiles(fileTree: any): string[] {
    const files: string[] = [];
    this.traverseFileTree(fileTree, (file) => {
      if (file.type === 'file' && this.isSourceFile(file.name)) {
        files.push(file.path);
      }
    });
    return files;
  }

  private findPackageFiles(fileTree: any): string[] {
    const packageFiles: string[] = [];
    this.traverseFileTree(fileTree, (file) => {
      if (file.type === 'file' && this.isPackageFile(file.name)) {
        packageFiles.push(file.path);
      }
    });
    return packageFiles;
  }

  private findConfigFiles(fileTree: any): string[] {
    const configFiles: string[] = [];
    this.traverseFileTree(fileTree, (file) => {
      if (file.type === 'file' && this.isConfigFile(file.name)) {
        configFiles.push(file.path);
      }
    });
    return configFiles;
  }

  private getSourceCodeFiles(fileTree: any): string[] {
    const sourceFiles: string[] = [];
    this.traverseFileTree(fileTree, (file) => {
      if (file.type === 'file' && this.isSourceCodeFile(file.name)) {
        sourceFiles.push(file.path);
      }
    });
    return sourceFiles;
  }

  private groupFilesByModule(files: string[]): Array<{ name: string; files: string[]; type: string }> {
    const groups = new Map<string, string[]>();
    
    files.forEach(file => {
      const parts = file.split('/');
      const moduleName = parts.length > 2 ? parts[parts.length - 2] : 'root';
      
      if (!groups.has(moduleName)) {
        groups.set(moduleName, []);
      }
      groups.get(moduleName)!.push(file);
    });

    return Array.from(groups.entries()).map(([name, files]) => ({
      name,
      files,
      type: this.determineModuleType(files)
    }));
  }

  private traverseFileTree(tree: any, callback: (file: any) => void): void {
    callback(tree);
    if (tree.children) {
      tree.children.forEach((child: any) => this.traverseFileTree(child, callback));
    }
  }

  private isSourceFile(filename: string): boolean {
    const sourceExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.rb', '.java', '.cs', '.php'];
    return sourceExtensions.some(ext => filename.endsWith(ext));
  }

  private isPackageFile(filename: string): boolean {
    return ['package.json', 'requirements.txt', 'Gemfile', 'pom.xml', 'composer.json'].includes(filename);
  }

  private isConfigFile(filename: string): boolean {
    const configFiles = [
      'tsconfig.json', 'webpack.config.js', 'vite.config.ts', 'next.config.js',
      'tailwind.config.js', 'jest.config.js', 'babel.config.js'
    ];
    return configFiles.some(config => filename.includes(config.split('.')[0]));
  }

  private isSourceCodeFile(filename: string): boolean {
    const codeExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.rb'];
    return codeExtensions.some(ext => filename.endsWith(ext)) && !filename.includes('test') && !filename.includes('spec');
  }

  private getConfigType(filename: string): string {
    if (filename.includes('tsconfig')) return 'typescript';
    if (filename.includes('webpack')) return 'webpack';
    if (filename.includes('vite')) return 'vite';
    if (filename.includes('next')) return 'nextjs';
    return 'general';
  }

  private getTargetFileName(sourceFile: string, targetTechStack: any): string {
    // Simple extension mapping - can be enhanced
    if (targetTechStack.language === 'typescript' && sourceFile.endsWith('.js')) {
      return sourceFile.replace('.js', '.ts');
    }
    if (targetTechStack.language === 'javascript' && sourceFile.endsWith('.ts')) {
      return sourceFile.replace('.ts', '.js');
    }
    return sourceFile;
  }

  private getCodeGenerationDependencies(startId: number, index: number): string[] {
    // Code generation tasks depend on config tasks
    return [`task_${startId - 1}`];
  }

  private estimateCodeGenerationTime(files: string[]): number {
    // Base time per file + complexity factor
    const baseTimePerFile = 120; // 2 minutes
    const complexityFactor = Math.min(files.length * 0.1, 2); // Max 2x multiplier
    return Math.round(files.length * baseTimePerFile * (1 + complexityFactor));
  }

  private getAllOutputFiles(context: AgentContext): string[] {
    // This would be populated during execution - for planning, we estimate
    return this.getAllSourceFiles(context.sourceFiles);
  }

  private getAllCodeGenerationTaskIds(startId: number): string[] {
    // Return IDs of all code generation tasks that this validation depends on
    return [`task_${startId - 1}`]; // Simplified - would be more complex in real implementation
  }

  private determineModuleType(files: string[]): string {
    if (files.some(f => f.includes('component') || f.includes('Component'))) return 'component';
    if (files.some(f => f.includes('service') || f.includes('Service'))) return 'service';
    if (files.some(f => f.includes('util') || f.includes('helper'))) return 'utility';
    return 'module';
  }
}