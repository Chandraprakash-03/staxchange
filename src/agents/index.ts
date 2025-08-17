// Agent system exports

export * from './types';
export { BaseAgent } from './base';
export { AnalysisAgent } from './analysis';
export { PlanningAgent } from './planning';
export { CodeGenerationAgent } from './code-generation';
export { ValidationAgent } from './validation';
export { IntegrationAgent } from './integration';
export { AgentOrchestrator } from './orchestrator';

// Convenience factory function
import { AgentOrchestrator } from './orchestrator';
import { OpenRouterClient } from '../services/openrouter';

export function createAgentOrchestrator(aiClient: OpenRouterClient, maxConcurrentTasks?: number): AgentOrchestrator {
  return new AgentOrchestrator(aiClient, maxConcurrentTasks);
}