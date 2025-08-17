// Base agent implementation

import { Agent, AgentContext, AgentResult, AgentCapability, AgentMetrics } from './types';
import { ConversionTask } from '../types';
import { BaseService } from '../services/base';

export abstract class BaseAgent extends BaseService implements Agent {
  public readonly name: string;
  public readonly type: string;
  public readonly capabilities: string[];
  protected metrics: AgentMetrics;

  constructor(name: string, type: string, capabilities: string[]) {
    super();
    this.name = name;
    this.type = type;
    this.capabilities = capabilities;
    this.metrics = {
      executionCount: 0,
      successRate: 0,
      averageExecutionTime: 0
    };
  }

  abstract execute(task: ConversionTask, context: AgentContext): Promise<AgentResult>;

  canHandle(task: ConversionTask): boolean {
    return task.agentType === this.type || this.capabilities.includes(task.type);
  }

  async validate(task: ConversionTask, context: AgentContext): Promise<boolean> {
    try {
      // Basic validation - check if task has required fields
      if (!task.id || !task.type || !task.description) {
        this.warn(`Task validation failed: missing required fields`, task);
        return false;
      }

      // Check if agent can handle this task type
      if (!this.canHandle(task)) {
        this.warn(`Agent ${this.name} cannot handle task type: ${task.type}`);
        return false;
      }

      // Validate input files exist in context
      for (const inputFile of task.inputFiles) {
        if (!this.findFileInTree(context.sourceFiles, inputFile)) {
          this.warn(`Input file not found: ${inputFile}`);
          return false;
        }
      }

      return true;
    } catch (error) {
      this.error(`Validation error for task ${task.id}:`, error as Error);
      return false;
    }
  }

  protected async executeWithMetrics(
    task: ConversionTask, 
    context: AgentContext
  ): Promise<AgentResult> {
    const startTime = Date.now();
    this.metrics.executionCount++;
    
    try {
      this.log(`Executing task ${task.id}: ${task.description}`);
      const result = await this.execute(task, context);
      
      const executionTime = Date.now() - startTime;
      this.updateMetrics(true, executionTime);
      this.metrics.lastExecuted = new Date();
      
      this.log(`Task ${task.id} completed successfully in ${executionTime}ms`);
      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.updateMetrics(false, executionTime);
      this.error(`Task ${task.id} failed after ${executionTime}ms:`, error as Error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  protected updateMetrics(success: boolean, executionTime: number): void {
    const totalExecutions = this.metrics.executionCount;
    const currentSuccessRate = this.metrics.successRate;
    const currentAvgTime = this.metrics.averageExecutionTime;

    // Update success rate
    if (totalExecutions === 1) {
      this.metrics.successRate = success ? 1 : 0;
    } else {
      const successCount = Math.round(currentSuccessRate * (totalExecutions - 1));
      this.metrics.successRate = (successCount + (success ? 1 : 0)) / totalExecutions;
    }

    // Update average execution time
    if (totalExecutions === 1) {
      this.metrics.averageExecutionTime = executionTime;
    } else {
      this.metrics.averageExecutionTime = 
        (currentAvgTime * (totalExecutions - 1) + executionTime) / totalExecutions;
    }
  }

  protected findFileInTree(tree: any, path: string): any {
    if (tree.path === path) {
      return tree;
    }
    
    if (tree.children) {
      for (const child of tree.children) {
        const found = this.findFileInTree(child, path);
        if (found) return found;
      }
    }
    
    return null;
  }

  protected createSuccessResult(
    output?: any, 
    files?: Array<{ path: string; content: string; type: 'create' | 'update' | 'delete' }>,
    metadata?: Record<string, any>
  ): AgentResult {
    return {
      success: true,
      output,
      files,
      metadata
    };
  }

  protected createErrorResult(error: string): AgentResult {
    return {
      success: false,
      error
    };
  }

  getMetrics(): AgentMetrics {
    return { ...this.metrics };
  }

  getCapabilities(): AgentCapability[] {
    return this.capabilities.map(cap => ({
      name: cap,
      description: `${this.name} capability: ${cap}`,
      inputTypes: ['file', 'code', 'config'],
      outputTypes: ['file', 'code', 'config', 'analysis']
    }));
  }
}