// Agent system types and interfaces

import { ConversionTask, ConversionResult, TechStack, FileTree, ConversionPlan } from '../types';

export interface AgentContext {
  projectId: string;
  sourceFiles: FileTree;
  targetTechStack: TechStack;
  sourceTechStack: TechStack;
  conversionPlan: ConversionPlan;
  sharedData: Record<string, any>;
}

export interface AgentResult {
  success: boolean;
  output?: any;
  error?: string;
  files?: Array<{
    path: string;
    content: string;
    type: 'create' | 'update' | 'delete';
  }>;
  metadata?: Record<string, any>;
}

export interface Agent {
  readonly name: string;
  readonly type: string;
  readonly capabilities: string[];
  
  execute(task: ConversionTask, context: AgentContext): Promise<AgentResult>;
  canHandle(task: ConversionTask): boolean;
  validate(task: ConversionTask, context: AgentContext): Promise<boolean>;
}

export interface WorkflowTask {
  id: string;
  conversionTask: ConversionTask;
  dependencies: string[];
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  result?: AgentResult;
  assignedAgent?: Agent;
  startedAt?: Date;
  completedAt?: Date;
  retryCount: number;
  maxRetries: number;
}

export interface Workflow {
  id: string;
  projectId: string;
  tasks: Map<string, WorkflowTask>;
  context: AgentContext;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed';
  progress: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface WorkflowResult {
  workflowId: string;
  status: 'completed' | 'failed' | 'partial';
  completedTasks: number;
  totalTasks: number;
  results: ConversionResult[];
  errors: string[];
}

export interface TaskDependency {
  taskId: string;
  dependsOn: string[];
  type: 'sequential' | 'parallel' | 'conditional';
}

export interface AgentCapability {
  name: string;
  description: string;
  inputTypes: string[];
  outputTypes: string[];
}

export interface AgentMetrics {
  executionCount: number;
  successRate: number;
  averageExecutionTime: number;
  lastExecuted?: Date;
}