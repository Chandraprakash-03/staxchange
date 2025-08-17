// Core Conversion Engine - Orchestrates file-by-file conversion using AI agents

import { BaseService } from './base';
import { AgentOrchestrator } from '../agents/orchestrator';
import { OpenRouterClient } from './openrouter';
import { 
  ConversionPlan, 
  ConversionJob, 
  ConversionResult, 
  FileTree, 
  TechStack,
  FileChange,
  ConversionTask
} from '../types';
import { AgentContext, AgentResult } from '../agents/types';
import { ValidationAgent } from '../agents/validation';
import { IntegrationAgent } from '../agents/integration';

export interface ConversionEngineOptions {
  maxConcurrentFiles?: number;
  preserveContext?: boolean;
  validateResults?: boolean;
  enableRetry?: boolean;
  maxRetries?: number;
}

export interface ConversionContext {
  projectId: string;
  sourceFiles: FileTree;
  targetTechStack: TechStack;
  sourceTechStack: TechStack;
  convertedFiles: Map<string, FileChange>;
  conversionHistory: ConversionHistoryEntry[];
  sharedContext: Record<string, any>;
  dependencies: Map<string, string[]>; // file -> dependencies
}

export interface ConversionHistoryEntry {
  filePath: string;
  originalContent: string;
  convertedContent: string;
  conversionType: string;
  timestamp: Date;
  success: boolean;
  error?: string;
}

export class ConversionEngine extends BaseService {
  private orchestrator: AgentOrchestrator;
  private aiClient: OpenRouterClient;
  private validationAgent: ValidationAgent;
  private integrationAgent: IntegrationAgent;
  private options: Required<ConversionEngineOptions>;

  constructor(
    aiClient: OpenRouterClient,
    options: ConversionEngineOptions = {}
  ) {
    super();
    this.aiClient = aiClient;
    this.orchestrator = new AgentOrchestrator(aiClient);
    this.validationAgent = new ValidationAgent();
    this.integrationAgent = new IntegrationAgent();
    
    this.options = {
      maxConcurrentFiles: options.maxConcurrentFiles || 5,
      preserveContext: options.preserveContext ?? true,
      validateResults: options.validateResults ?? true,
      enableRetry: options.enableRetry ?? true,
      maxRetries: options.maxRetries || 3,
    };
  }

  async executeConversion(
    plan: ConversionPlan,
    sourceFiles: FileTree,
    sourceTechStack: TechStack,
    targetTechStack: TechStack
  ): Promise<ConversionResult[]> {
    this.log(`Starting conversion execution for project ${plan.projectId}`);
    
    const context = this.createConversionContext(
      plan.projectId,
      sourceFiles,
      sourceTechStack,
      targetTechStack
    );

    try {
      // Phase 1: Analyze and prepare conversion context
      await this.prepareConversionContext(context, plan);
      
      // Phase 2: Execute file-by-file conversion
      const conversionResults = await this.executeFileConversions(context, plan);
      
      // Phase 3: Validate and integrate results
      if (this.options.validateResults) {
        await this.validateConversionResults(context, conversionResults);
      }
      
      // Phase 4: Perform final integration
      await this.performFinalIntegration(context, conversionResults);
      
      this.log(`Conversion completed successfully for project ${plan.projectId}`);
      return conversionResults;
      
    } catch (error) {
      this.error('Conversion execution failed:', error as Error);
      throw error;
    }
  }

  private createConversionContext(
    projectId: string,
    sourceFiles: FileTree,
    sourceTechStack: TechStack,
    targetTechStack: TechStack
  ): ConversionContext {
    return {
      projectId,
      sourceFiles,
      sourceTechStack,
      targetTechStack,
      convertedFiles: new Map(),
      conversionHistory: [],
      sharedContext: {},
      dependencies: this.analyzeDependencies(sourceFiles),
    };
  }

  private analyzeDependencies(sourceFiles: FileTree): Map<string, string[]> {
    const dependencies = new Map<string, string[]>();
    
    // Simple dependency analysis based on imports/requires
    this.traverseFileTree(sourceFiles, (file) => {
      if (file.type === 'file' && file.content) {
        const fileDeps = this.extractFileDependencies(file.content, file.path);
        if (fileDeps.length > 0) {
          dependencies.set(file.path, fileDeps);
        }
      }
    });
    
    return dependencies;
  }

  private extractFileDependencies(content: string, filePath: string): string[] {
    const dependencies: string[] = [];
    
    // Extract import statements (JavaScript/TypeScript)
    const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      if (importPath.startsWith('.')) {
        // Relative import - resolve to absolute path
        const resolvedPath = this.resolveRelativePath(filePath, importPath);
        dependencies.push(resolvedPath);
      }
    }
    
    // Extract require statements (Node.js)
    const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    while ((match = requireRegex.exec(content)) !== null) {
      const requirePath = match[1];
      if (requirePath.startsWith('.')) {
        const resolvedPath = this.resolveRelativePath(filePath, requirePath);
        dependencies.push(resolvedPath);
      }
    }
    
    return dependencies;
  }

  private resolveRelativePath(fromPath: string, relativePath: string): string {
    const fromDir = fromPath.split('/').slice(0, -1).join('/');
    const parts = relativePath.split('/');
    const resolvedParts = fromDir.split('/');
    
    for (const part of parts) {
      if (part === '..') {
        resolvedParts.pop();
      } else if (part !== '.') {
        resolvedParts.push(part);
      }
    }
    
    return resolvedParts.join('/');
  }

  private async prepareConversionContext(
    context: ConversionContext,
    plan: ConversionPlan
  ): Promise<void> {
    this.log('Preparing conversion context...');
    
    // Initialize shared context with project metadata
    context.sharedContext = {
      projectStructure: this.analyzeProjectStructure(context.sourceFiles),
      commonPatterns: this.identifyCommonPatterns(context.sourceFiles),
      globalDependencies: this.extractGlobalDependencies(context.sourceFiles),
      conversionPlan: plan,
    };
    
    // Pre-analyze critical files (package.json, config files, etc.)
    await this.preAnalyzeCriticalFiles(context);
  }

  private analyzeProjectStructure(sourceFiles: FileTree): any {
    const structure = {
      directories: [] as string[],
      fileTypes: new Map<string, number>(),
      entryPoints: [] as string[],
      configFiles: [] as string[],
    };
    
    this.traverseFileTree(sourceFiles, (file) => {
      if (file.type === 'directory') {
        structure.directories.push(file.path);
      } else {
        const extension = file.path.split('.').pop() || '';
        structure.fileTypes.set(extension, (structure.fileTypes.get(extension) || 0) + 1);
        
        // Identify entry points and config files
        const fileName = file.path.split('/').pop() || '';
        if (['index.js', 'index.ts', 'main.js', 'main.ts', 'app.js', 'app.ts'].includes(fileName)) {
          structure.entryPoints.push(file.path);
        }
        if (['package.json', 'tsconfig.json', 'webpack.config.js', '.babelrc'].includes(fileName)) {
          structure.configFiles.push(file.path);
        }
      }
    });
    
    return structure;
  }

  private identifyCommonPatterns(sourceFiles: FileTree): any {
    const patterns = {
      imports: new Map<string, number>(),
      exports: new Map<string, number>(),
      frameworks: new Set<string>(),
      libraries: new Set<string>(),
    };
    
    this.traverseFileTree(sourceFiles, (file) => {
      if (file.type === 'file' && file.content) {
        // Analyze import patterns
        const imports = file.content.match(/import\s+.*?\s+from\s+['"]([^'"]+)['"]/g) || [];
        imports.forEach(imp => {
          const match = imp.match(/from\s+['"]([^'"]+)['"]/);
          if (match) {
            const module = match[1];
            patterns.imports.set(module, (patterns.imports.get(module) || 0) + 1);
            
            // Identify frameworks and libraries
            if (['react', 'vue', 'angular', 'express', 'fastify'].some(fw => module.includes(fw))) {
              patterns.frameworks.add(module);
            }
            if (!module.startsWith('.')) {
              patterns.libraries.add(module);
            }
          }
        });
        
        // Analyze export patterns
        const exports = file.content.match(/export\s+(default\s+)?/g) || [];
        exports.forEach(exp => {
          patterns.exports.set(exp, (patterns.exports.get(exp) || 0) + 1);
        });
      }
    });
    
    return patterns;
  }

  private extractGlobalDependencies(sourceFiles: FileTree): any {
    const packageJsonFile = this.findFileInTree(sourceFiles, 'package.json');
    if (packageJsonFile && packageJsonFile.content) {
      try {
        return JSON.parse(packageJsonFile.content);
      } catch (error) {
        this.warn('Failed to parse package.json:', error as Error);
      }
    }
    return {};
  }

  private async preAnalyzeCriticalFiles(context: ConversionContext): Promise<void> {
    const criticalFiles = ['package.json', 'tsconfig.json', 'webpack.config.js'];
    
    for (const fileName of criticalFiles) {
      const file = this.findFileInTree(context.sourceFiles, fileName);
      if (file && file.content) {
        // Store original content for reference during conversion
        context.sharedContext[`original_${fileName}`] = file.content;
      }
    }
  }

  private async executeFileConversions(
    context: ConversionContext,
    plan: ConversionPlan
  ): Promise<ConversionResult[]> {
    this.log('Executing file-by-file conversions...');
    
    const results: ConversionResult[] = [];
    const conversionOrder = this.calculateConversionOrder(context, plan);
    
    // Process files in batches to respect concurrency limits
    const batches = this.createConversionBatches(conversionOrder, this.options.maxConcurrentFiles);
    
    for (const batch of batches) {
      const batchPromises = batch.map(task => 
        this.convertSingleFile(context, task)
      );
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      for (let i = 0; i < batchResults.length; i++) {
        const result = batchResults[i];
        const task = batch[i];
        
        if (result.status === 'fulfilled') {
          results.push(result.value);
          this.updateContextWithResult(context, task, result.value);
        } else {
          const errorResult: ConversionResult = {
            taskId: task.id,
            status: 'error',
            error: result.reason instanceof Error ? result.reason.message : 'Unknown error',
            files: [],
          };
          results.push(errorResult);
          
          // Handle retry logic
          if (this.options.enableRetry) {
            const retryResult = await this.retryConversion(context, task);
            if (retryResult) {
              results[results.length - 1] = retryResult;
              this.updateContextWithResult(context, task, retryResult);
            }
          }
        }
      }
    }
    
    return results;
  }

  private calculateConversionOrder(
    context: ConversionContext,
    plan: ConversionPlan
  ): ConversionTask[] {
    // Sort tasks based on dependencies and priority
    const tasks = [...plan.tasks];
    
    // First, sort by priority (higher priority first)
    tasks.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    
    // Then, ensure dependency order is respected
    const orderedTasks: ConversionTask[] = [];
    const processed = new Set<string>();
    
    const processTask = (task: ConversionTask) => {
      if (processed.has(task.id)) return;
      
      // Process dependencies first
      for (const depId of task.dependencies) {
        const depTask = tasks.find(t => t.id === depId);
        if (depTask && !processed.has(depId)) {
          processTask(depTask);
        }
      }
      
      orderedTasks.push(task);
      processed.add(task.id);
    };
    
    tasks.forEach(processTask);
    
    return orderedTasks;
  }

  private createConversionBatches(
    tasks: ConversionTask[],
    batchSize: number
  ): ConversionTask[][] {
    const batches: ConversionTask[][] = [];
    
    for (let i = 0; i < tasks.length; i += batchSize) {
      batches.push(tasks.slice(i, i + batchSize));
    }
    
    return batches;
  }

  private async convertSingleFile(
    context: ConversionContext,
    task: ConversionTask
  ): Promise<ConversionResult> {
    this.log(`Converting file(s) for task: ${task.id}`);
    
    try {
      // Create agent context
      const agentContext: AgentContext = {
        projectId: context.projectId,
        sourceFiles: context.sourceFiles,
        sourceTechStack: context.sourceTechStack,
        targetTechStack: context.targetTechStack,
        conversionPlan: {
          id: `plan_${task.id}`,
          projectId: context.projectId,
          tasks: [task],
          estimatedDuration: task.estimatedDuration,
          complexity: 'medium',
          warnings: [],
          feasible: true,
          createdAt: new Date(),
          updatedAt: new Date()
        } as ConversionPlan,
        sharedData: context.sharedContext,
      };
      
      // Execute the task using the orchestrator
      const workflow = await this.orchestrator.createWorkflow(
        agentContext.conversionPlan,
        agentContext
      );
      
      const workflowResult = await this.orchestrator.executeWorkflow(workflow.id);
      
      if (workflowResult.status === 'completed') {
        return {
          taskId: task.id,
          status: 'success',
          output: `Successfully converted ${task.inputFiles.length} file(s)`,
          files: this.extractFileChanges(workflowResult.results),
        };
      } else {
        return {
          taskId: task.id,
          status: 'error',
          error: workflowResult.errors.join('; '),
          files: [],
        };
      }
      
    } catch (error) {
      this.error(`Failed to convert file for task ${task.id}:`, error as Error);
      return {
        taskId: task.id,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        files: [],
      };
    }
  }

  private extractFileChanges(results: any[]): FileChange[] {
    const fileChanges: FileChange[] = [];
    
    for (const result of results) {
      if (result.files && Array.isArray(result.files)) {
        fileChanges.push(...result.files);
      }
    }
    
    return fileChanges;
  }

  private updateContextWithResult(
    context: ConversionContext,
    task: ConversionTask,
    result: ConversionResult
  ): void {
    // Update converted files map
    for (const fileChange of result.files) {
      context.convertedFiles.set(fileChange.path, fileChange);
    }
    
    // Add to conversion history
    for (const inputFile of task.inputFiles) {
      const fileChange = result.files.find(f => f.path === inputFile);
      if (fileChange) {
        context.conversionHistory.push({
          filePath: inputFile,
          originalContent: fileChange.oldContent || '',
          convertedContent: fileChange.content || '',
          conversionType: task.type,
          timestamp: new Date(),
          success: result.status === 'success',
          error: result.error,
        });
      }
    }
    
    // Update shared context with conversion results
    context.sharedContext[`task_${task.id}`] = {
      result: result.output,
      files: result.files,
      timestamp: new Date().toISOString(),
    };
  }

  private async retryConversion(
    context: ConversionContext,
    task: ConversionTask
  ): Promise<ConversionResult | null> {
    this.log(`Retrying conversion for task: ${task.id}`);
    
    for (let attempt = 1; attempt <= this.options.maxRetries; attempt++) {
      try {
        // Add retry context to help the AI understand this is a retry
        const retryContext = {
          ...context.sharedContext,
          retryAttempt: attempt,
          previousErrors: context.conversionHistory
            .filter(h => h.filePath === task.inputFiles[0] && !h.success)
            .map(h => h.error),
        };
        
        const agentContext: AgentContext = {
          projectId: context.projectId,
          sourceFiles: context.sourceFiles,
          sourceTechStack: context.sourceTechStack,
          targetTechStack: context.targetTechStack,
          conversionPlan: {
            id: `retry_plan_${task.id}_${attempt}`,
            projectId: context.projectId,
            tasks: [task],
            estimatedDuration: task.estimatedDuration,
            complexity: 'medium',
            warnings: [],
            feasible: true,
            createdAt: new Date(),
            updatedAt: new Date()
          } as ConversionPlan,
          sharedData: retryContext,
        };
        
        const workflow = await this.orchestrator.createWorkflow(
          agentContext.conversionPlan,
          agentContext
        );
        
        const workflowResult = await this.orchestrator.executeWorkflow(workflow.id);
        
        if (workflowResult.status === 'completed') {
          this.log(`Retry successful for task ${task.id} on attempt ${attempt}`);
          return {
            taskId: task.id,
            status: 'success',
            output: `Successfully converted on retry attempt ${attempt}`,
            files: this.extractFileChanges(workflowResult.results),
          };
        }
        
      } catch (error) {
        this.warn(`Retry attempt ${attempt} failed for task ${task.id}:`, error as Error);
        
        if (attempt === this.options.maxRetries) {
          return {
            taskId: task.id,
            status: 'error',
            error: `Failed after ${this.options.maxRetries} retry attempts: ${error instanceof Error ? error.message : 'Unknown error'}`,
            files: [],
          };
        }
        
        // Wait before next retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
    
    return null;
  }

  private async validateConversionResults(
    context: ConversionContext,
    results: ConversionResult[]
  ): Promise<void> {
    this.log('Validating conversion results...');
    
    for (const result of results) {
      if (result.status === 'success') {
        for (const fileChange of result.files) {
          try {
            // Create a dummy task for validation
            const validationTask: ConversionTask = {
              id: `validation_${result.taskId}`,
              type: 'validation',
              description: `Validate converted file: ${fileChange.path}`,
              inputFiles: [fileChange.path],
              outputFiles: [fileChange.path],
              dependencies: [],
              agentType: 'validation',
              priority: 1,
              status: 'pending',
              estimatedDuration: 30,
            };
            
            const agentContext: AgentContext = {
              projectId: context.projectId,
              sourceFiles: context.sourceFiles,
              sourceTechStack: context.sourceTechStack,
              targetTechStack: context.targetTechStack,
              conversionPlan: {
                id: `validation_plan_${result.taskId}`,
                projectId: context.projectId,
                tasks: [validationTask],
                estimatedDuration: validationTask.estimatedDuration,
                complexity: 'low',
                warnings: [],
                feasible: true,
                createdAt: new Date(),
                updatedAt: new Date()
              } as ConversionPlan,
              sharedData: {
                ...context.sharedContext,
                convertedContent: fileChange.content,
                originalContent: fileChange.oldContent,
              },
            };
            
            const validationResult = await this.validationAgent.execute(validationTask, agentContext);
            
            if (!validationResult.success) {
              this.warn(`Validation failed for ${fileChange.path}: ${validationResult.error}`);
              // Mark the original result as having validation issues
              result.output += ` (Validation warnings: ${validationResult.error})`;
            }
            
          } catch (error) {
            this.warn(`Validation error for ${fileChange.path}:`, error as Error);
          }
        }
      }
    }
  }

  private async performFinalIntegration(
    context: ConversionContext,
    results: ConversionResult[]
  ): Promise<void> {
    this.log('Performing final integration...');
    
    try {
      // Create integration task
      const integrationTask: ConversionTask = {
        id: 'final_integration',
        type: 'integration',
        description: 'Final integration of all converted files',
        inputFiles: Array.from(context.convertedFiles.keys()),
        outputFiles: Array.from(context.convertedFiles.keys()),
        dependencies: [],
        agentType: 'integration',
        priority: 1,
        status: 'pending',
        estimatedDuration: 60,
      };
      
      const agentContext: AgentContext = {
        projectId: context.projectId,
        sourceFiles: context.sourceFiles,
        sourceTechStack: context.sourceTechStack,
        targetTechStack: context.targetTechStack,
        conversionPlan: {
          id: 'integration_plan',
          projectId: context.projectId,
          tasks: [integrationTask],
          estimatedDuration: integrationTask.estimatedDuration,
          complexity: 'medium',
          warnings: [],
          feasible: true,
          createdAt: new Date(),
          updatedAt: new Date()
        } as ConversionPlan,
        sharedData: {
          ...context.sharedContext,
          convertedFiles: Array.from(context.convertedFiles.values()),
          conversionHistory: context.conversionHistory,
        },
      };
      
      const integrationResult = await this.integrationAgent.execute(integrationTask, agentContext);
      
      if (!integrationResult.success) {
        this.warn(`Integration issues detected: ${integrationResult.error}`);
      } else {
        this.log('Final integration completed successfully');
      }
      
    } catch (error) {
      this.warn('Final integration failed:', error as Error);
    }
  }

  // Utility methods
  private traverseFileTree(tree: FileTree, callback: (file: FileTree) => void): void {
    callback(tree);
    if (tree.children) {
      tree.children.forEach(child => this.traverseFileTree(child, callback));
    }
  }

  private findFileInTree(tree: FileTree, targetPath: string): FileTree | null {
    if (tree.path === targetPath) {
      return tree;
    }
    
    if (tree.children) {
      for (const child of tree.children) {
        const found = this.findFileInTree(child, targetPath);
        if (found) return found;
      }
    }
    
    return null;
  }

  // Public methods for monitoring and control
  getConversionMetrics(context: ConversionContext): any {
    return {
      totalFiles: context.conversionHistory.length,
      successfulConversions: context.conversionHistory.filter(h => h.success).length,
      failedConversions: context.conversionHistory.filter(h => !h.success).length,
      convertedFileTypes: Array.from(context.convertedFiles.keys())
        .map(path => path.split('.').pop())
        .reduce((acc, ext) => {
          acc[ext || 'unknown'] = (acc[ext || 'unknown'] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      conversionDuration: context.conversionHistory.length > 0 
        ? context.conversionHistory[context.conversionHistory.length - 1].timestamp.getTime() - 
          context.conversionHistory[0].timestamp.getTime()
        : 0,
    };
  }

  async cleanup(): Promise<void> {
    await this.orchestrator.cleanup();
    this.log('Conversion engine cleaned up successfully');
  }
}