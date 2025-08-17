// Workflow Orchestrator - Manages agent workflows and task coordination

import { BaseService } from '../services/base';
import { 
  Agent, 
  AgentContext, 
  Workflow, 
  WorkflowTask, 
  WorkflowResult, 
  TaskDependency 
} from './types';
import { ConversionPlan, ConversionTask, ConversionJob } from '../types';
import { AnalysisAgent } from './analysis';
import { PlanningAgent } from './planning';
import { CodeGenerationAgent } from './code-generation';
import { ValidationAgent } from './validation';
import { IntegrationAgent } from './integration';
import { OpenRouterClient } from '../services/openrouter';

export class AgentOrchestrator extends BaseService {
  private agents: Map<string, Agent>;
  private workflows: Map<string, Workflow>;
  private taskQueue: WorkflowTask[];
  private isProcessing: boolean;
  private maxConcurrentTasks: number;
  private currentlyRunning: Set<string>;

  constructor(aiClient: OpenRouterClient, maxConcurrentTasks: number = 3) {
    super();
    this.agents = new Map();
    this.workflows = new Map();
    this.taskQueue = [];
    this.isProcessing = false;
    this.maxConcurrentTasks = maxConcurrentTasks;
    this.currentlyRunning = new Set();

    // Initialize agents
    this.initializeAgents(aiClient);
  }

  private initializeAgents(aiClient: OpenRouterClient): void {
    const agents = [
      new AnalysisAgent(),
      new PlanningAgent(),
      new CodeGenerationAgent(aiClient),
      new ValidationAgent(),
      new IntegrationAgent()
    ];

    agents.forEach(agent => {
      this.agents.set(agent.type, agent);
      this.log(`Registered agent: ${agent.name} (${agent.type})`);
    });
  }

  async createWorkflow(plan: ConversionPlan, context: AgentContext): Promise<Workflow> {
    const workflowId = `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const workflow: Workflow = {
      id: workflowId,
      projectId: context.projectId,
      tasks: new Map(),
      context,
      status: 'pending',
      progress: 0,
      createdAt: new Date()
    };

    // Convert conversion tasks to workflow tasks
    for (const conversionTask of plan.tasks) {
      const workflowTask: WorkflowTask = {
        id: conversionTask.id,
        conversionTask,
        dependencies: conversionTask.dependencies,
        status: 'pending',
        retryCount: 0,
        maxRetries: 3
      };

      workflow.tasks.set(conversionTask.id, workflowTask);
    }

    this.workflows.set(workflowId, workflow);
    this.log(`Created workflow ${workflowId} with ${plan.tasks.length} tasks`);

    return workflow;
  }

  async executeWorkflow(workflowId: string): Promise<WorkflowResult> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    this.log(`Starting execution of workflow ${workflowId}`);
    workflow.status = 'running';
    workflow.startedAt = new Date();

    try {
      const result = await this.processWorkflow(workflow);
      
      workflow.status = result.status === 'completed' ? 'completed' : 'failed';
      workflow.completedAt = new Date();
      workflow.progress = 100;

      this.log(`Workflow ${workflowId} completed with status: ${workflow.status}`);
      return result;
    } catch (error) {
      workflow.status = 'failed';
      workflow.completedAt = new Date();
      this.error(`Workflow ${workflowId} failed:`, error as Error);
      
      return {
        workflowId,
        status: 'failed',
        completedTasks: this.getCompletedTaskCount(workflow),
        totalTasks: workflow.tasks.size,
        results: this.extractResults(workflow),
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  async pauseWorkflow(workflowId: string): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    workflow.status = 'paused';
    this.log(`Paused workflow ${workflowId}`);
  }

  async resumeWorkflow(workflowId: string): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    if (workflow.status === 'paused') {
      workflow.status = 'running';
      this.log(`Resumed workflow ${workflowId}`);
      
      // Continue processing
      await this.processWorkflow(workflow);
    }
  }

  getWorkflowStatus(workflowId: string): Workflow | null {
    return this.workflows.get(workflowId) || null;
  }

  private async processWorkflow(workflow: Workflow): Promise<WorkflowResult> {
    const executionOrder = this.calculateExecutionOrder(workflow);
    const results: any[] = [];
    const errors: string[] = [];
    let completedTasks = 0;

    // Process tasks in dependency order
    for (const batch of executionOrder) {
      if (workflow.status === 'paused') {
        break;
      }

      // Execute tasks in parallel within each batch
      const batchPromises = batch.map(taskId => 
        this.executeTask(workflow.tasks.get(taskId)!, workflow)
      );

      const batchResults = await Promise.allSettled(batchPromises);
      
      for (let i = 0; i < batchResults.length; i++) {
        const result = batchResults[i];
        const taskId = batch[i];
        const task = workflow.tasks.get(taskId)!;

        if (result.status === 'fulfilled') {
          task.status = 'completed';
          task.result = result.value;
          task.completedAt = new Date();
          results.push({
            taskId,
            status: 'success',
            output: result.value.output,
            files: result.value.files || []
          });
          completedTasks++;
        } else {
          task.status = 'failed';
          task.completedAt = new Date();
          const errorMessage = result.reason instanceof Error ? result.reason.message : 'Unknown error';
          errors.push(`Task ${taskId} failed: ${errorMessage}`);
          
          // Check if we should retry
          if (task.retryCount < task.maxRetries) {
            task.retryCount++;
            task.status = 'pending';
            this.log(`Retrying task ${taskId} (attempt ${task.retryCount + 1}/${task.maxRetries + 1})`);
            
            // Add back to queue for retry
            const retryResult = await this.executeTask(task, workflow);
            if (retryResult.success) {
              task.status = 'completed';
              task.result = retryResult;
              completedTasks++;
            } else {
              errors.push(`Task ${taskId} failed after ${task.maxRetries} retries`);
            }
          }
        }

        // Update workflow progress
        workflow.progress = Math.round((completedTasks / workflow.tasks.size) * 100);
      }

      // Check if we should continue or stop due to critical failures
      if (this.hasCriticalFailures(batch, workflow)) {
        errors.push('Critical task failures detected, stopping workflow');
        break;
      }
    }

    const finalStatus = errors.length === 0 ? 'completed' : 
                       completedTasks > 0 ? 'partial' : 'failed';

    return {
      workflowId: workflow.id,
      status: finalStatus,
      completedTasks,
      totalTasks: workflow.tasks.size,
      results,
      errors
    };
  }

  private async executeTask(task: WorkflowTask, workflow: Workflow): Promise<any> {
    const agent = this.selectAgent(task.conversionTask);
    if (!agent) {
      throw new Error(`No suitable agent found for task ${task.id} (type: ${task.conversionTask.type})`);
    }

    this.log(`Executing task ${task.id} with agent ${agent.name}`);
    task.status = 'running';
    task.assignedAgent = agent;
    task.startedAt = new Date();

    try {
      // Validate task before execution
      const isValid = await agent.validate(task.conversionTask, workflow.context);
      if (!isValid) {
        throw new Error(`Task validation failed for ${task.id}`);
      }

      // Execute the task
      const result = await agent.execute(task.conversionTask, workflow.context);
      
      if (!result.success) {
        throw new Error(result.error || 'Task execution failed');
      }

      // Update shared context with task results
      this.updateSharedContext(workflow.context, task.id, result);

      return result;
    } catch (error) {
      this.error(`Task ${task.id} execution failed:`, error as Error);
      throw error;
    }
  }

  private selectAgent(task: ConversionTask): Agent | null {
    // Find the best agent for this task
    for (const agent of this.agents.values()) {
      if (agent.canHandle(task)) {
        return agent;
      }
    }

    // Fallback: try to find by agent type
    return this.agents.get(task.agentType) || null;
  }

  private calculateExecutionOrder(workflow: Workflow): string[][] {
    const tasks = Array.from(workflow.tasks.values());
    const dependencyGraph = this.buildDependencyGraph(tasks);
    
    return this.topologicalSort(dependencyGraph);
  }

  private buildDependencyGraph(tasks: WorkflowTask[]): Map<string, string[]> {
    const graph = new Map<string, string[]>();
    
    tasks.forEach(task => {
      graph.set(task.id, task.dependencies);
    });

    return graph;
  }

  private topologicalSort(graph: Map<string, string[]>): string[][] {
    const batches: string[][] = [];
    const visited = new Set<string>();
    const inDegree = new Map<string, number>();
    const dependents = new Map<string, string[]>(); // reverse adjacency list
  
    // Initialize maps
    for (const node of graph.keys()) {
      inDegree.set(node, 0);
      dependents.set(node, []);
    }
  
    // Build in-degree and reverse graph
    for (const [node, dependencies] of graph.entries()) {
      dependencies.forEach(dep => {
        // node depends on dep → dep has a child node
        inDegree.set(node, (inDegree.get(node) || 0) + 1);
        dependents.get(dep)!.push(node);
      });
    }
  
    // Process in batches
    while (visited.size < graph.size) {
      const currentBatch: string[] = [];
  
      // Select all unvisited nodes with in-degree 0
      for (const [node, degree] of inDegree.entries()) {
        if (degree === 0 && !visited.has(node)) {
          currentBatch.push(node);
        }
      }
  
      if (currentBatch.length === 0) {
        // Circular dependency
        const remaining = Array.from(graph.keys()).filter(node => !visited.has(node));
        this.warn(`Circular dependency detected among tasks: ${remaining.join(', ')}`);
        batches.push(remaining);
        break;
      }
  
      batches.push(currentBatch);
  
      // Mark as visited and decrease in-degree of dependents
      currentBatch.forEach(node => {
        visited.add(node);
        dependents.get(node)!.forEach(child => {
          inDegree.set(child, (inDegree.get(child) || 0) - 1);
        });
      });
    }
  
    return batches;
  }
  

  private updateSharedContext(context: AgentContext, taskId: string, result: any): void {
    // Update shared context with task results for future tasks to use
    if (!context.sharedData) {
      context.sharedData = {};
    }

    context.sharedData[taskId] = {
      result: result.output,
      files: result.files,
      metadata: result.metadata,
      timestamp: new Date().toISOString()
    };

    // Update source files if new files were created/modified
    if (result.files && result.files.length > 0) {
      this.updateSourceFiles(context, result.files);
    }
  }

  private updateSourceFiles(context: AgentContext, files: any[]): void {
    // Update the source files in context with new/modified files
    files.forEach(file => {
      if (file.type === 'create' || file.type === 'update') {
        // In a real implementation, this would update the file tree structure
        this.log(`File ${file.type}d: ${file.path}`);
      } else if (file.type === 'delete') {
        this.log(`File deleted: ${file.path}`);
      }
    });
  }

  private hasCriticalFailures(batch: string[], workflow: Workflow): boolean {
    // Check if any critical tasks in the batch failed
    const criticalTaskTypes = ['analysis', 'planning'];
    
    return batch.some(taskId => {
      const task = workflow.tasks.get(taskId);
      return task && 
             task.status === 'failed' && 
             criticalTaskTypes.includes(task.conversionTask.type);
    });
  }

  private getCompletedTaskCount(workflow: Workflow): number {
    return Array.from(workflow.tasks.values())
      .filter(task => task.status === 'completed').length;
  }

  private extractResults(workflow: Workflow): any[] {
    const results: any[] = [];
    
    workflow.tasks.forEach(task => {
      if (task.result) {
        results.push({
          taskId: task.id,
          status: task.status === 'completed' ? 'success' : 'error',
          output: task.result.output,
          files: task.result.files || [],
          error: task.status === 'failed' ? 'Task execution failed' : undefined
        });
      }
    });

    return results;
  }

  // Public methods for monitoring and management
  getAgentMetrics(): Map<string, any> {
    const metrics = new Map();
    
    this.agents.forEach((agent, type) => {
      if ('getMetrics' in agent && typeof agent.getMetrics === 'function') {
        metrics.set(type, agent.getMetrics());
      }
    });

    return metrics;
  }

  getActiveWorkflows(): Workflow[] {
    return Array.from(this.workflows.values())
      .filter(workflow => workflow.status === 'running' || workflow.status === 'paused');
  }

  getWorkflowHistory(): Workflow[] {
    return Array.from(this.workflows.values())
      .filter(workflow => workflow.status === 'completed' || workflow.status === 'failed')
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async cancelWorkflow(workflowId: string): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    workflow.status = 'failed';
    workflow.completedAt = new Date();
    
    // Mark all pending/running tasks as failed
    workflow.tasks.forEach(task => {
      if (task.status === 'pending' || task.status === 'running') {
        task.status = 'failed';
        task.completedAt = new Date();
      }
    });

    this.log(`Cancelled workflow ${workflowId}`);
  }

  async retryFailedTasks(workflowId: string): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    // Reset failed tasks to pending
    workflow.tasks.forEach(task => {
      if (task.status === 'failed' && task.retryCount < task.maxRetries) {
        task.status = 'pending';
        task.retryCount = 0;
        task.result = undefined;
        task.startedAt = undefined;
        task.completedAt = undefined;
      }
    });

    // Resume workflow if it was failed
    if (workflow.status === 'failed') {
      workflow.status = 'running';
      await this.processWorkflow(workflow);
    }
  }

  // Cleanup methods
  async cleanup(): Promise<void> {
    // Clean up completed workflows older than 24 hours
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const workflowsToDelete: string[] = [];
    this.workflows.forEach((workflow, id) => {
      if (workflow.completedAt && workflow.completedAt < cutoffTime) {
        workflowsToDelete.push(id);
      }
    });

    workflowsToDelete.forEach(id => {
      this.workflows.delete(id);
      this.log(`Cleaned up workflow ${id}`);
    });
  }

  // Agent management
  registerAgent(agent: Agent): void {
    this.agents.set(agent.type, agent);
    this.log(`Registered new agent: ${agent.name} (${agent.type})`);
  }

  unregisterAgent(agentType: string): void {
    if (this.agents.delete(agentType)) {
      this.log(`Unregistered agent: ${agentType}`);
    }
  }

  getRegisteredAgents(): Agent[] {
    return Array.from(this.agents.values());
  }
}