import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ConversionEngine } from "@/services/conversionEngine";
import { AIService } from "@/services/ai";
import { AgentOrchestrator } from "@/agents/orchestrator";
import { ConversionPlan, TechStack } from "@/types";

// Mock dependencies
vi.mock("@/services/ai");
vi.mock("@/agents/orchestrator");

const MockedAIService = vi.mocked(AIService);
const MockedAgentOrchestrator = vi.mocked(AgentOrchestrator);

describe("Conversion Performance Tests", () => {
	let conversionEngine: ConversionEngine;
	let mockAIService: any;
	let mockOrchestrator: any;

	const mockTechStack: TechStack = {
		language: "JavaScript",
		framework: "React",
		database: "PostgreSQL",
		runtime: "Node.js",
		buildTool: "Webpack",
		packageManager: "npm",
		deployment: "Docker",
		additional: {},
	};

	const mockTargetTechStack: TechStack = {
		language: "TypeScript",
		framework: "Vue",
		database: "MongoDB",
		runtime: "Node.js",
		buildTool: "Vite",
		packageManager: "pnpm",
		deployment: "Docker",
		additional: {},
	};

	beforeEach(() => {
		mockAIService = {
			convertCode: vi.fn(),
			analyzeCode: vi.fn(),
			validateConversion: vi.fn(),
			processConversionTask: vi.fn(),
			healthCheck: vi.fn(),
		};

		mockOrchestrator = {
			createWorkflow: vi.fn(),
			executeWorkflow: vi.fn(),
			getWorkflowStatus: vi.fn(),
			pauseWorkflow: vi.fn(),
			resumeWorkflow: vi.fn(),
		};

		MockedAIService.mockImplementation(() => mockAIService);
		MockedAgentOrchestrator.mockImplementation(() => mockOrchestrator);

		conversionEngine = new ConversionEngine({
			aiService: mockAIService,
			orchestrator: mockOrchestrator,
		});
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe("Small Project Performance", () => {
		it("should convert small projects (< 10 files) within 30 seconds", async () => {
			const smallPlan: ConversionPlan = {
				id: "small-plan",
				projectId: "small-project",
				tasks: Array.from({ length: 5 }, (_, i) => ({
					id: `task-${i}`,
					type: "conversion",
					description: `Convert file ${i}`,
					inputFiles: [`src/component${i}.js`],
					outputFiles: [`src/component${i}.vue`],
					dependencies: [],
					agentType: "code-generation",
					priority: i,
					status: "pending" as const,
					estimatedDuration: 300,
				})),
				estimatedDuration: 1500,
				complexity: "low",
				warnings: [],
			};

			// Mock fast responses
			mockOrchestrator.createWorkflow.mockResolvedValue({
				id: "small-workflow",
				tasks: smallPlan.tasks,
				dependencies: [],
				context: {},
			});

			mockOrchestrator.executeWorkflow.mockImplementation(async () => {
				// Simulate processing time
				await new Promise((resolve) => setTimeout(resolve, 100));
				return {
					id: "small-workflow",
					status: "completed",
					progress: 100,
					results: smallPlan.tasks.map((task) => ({
						taskId: task.id,
						status: "completed",
						output: "converted code",
					})),
				};
			});

			const startTime = Date.now();
			const result = await conversionEngine.startConversion(smallPlan);
			const endTime = Date.now();

			expect(result.status).toBe("completed");
			expect(endTime - startTime).toBeLessThan(30000); // 30 seconds
		});
	});

	describe("Medium Project Performance", () => {
		it("should convert medium projects (10-50 files) within 2 minutes", async () => {
			const mediumPlan: ConversionPlan = {
				id: "medium-plan",
				projectId: "medium-project",
				tasks: Array.from({ length: 25 }, (_, i) => ({
					id: `task-${i}`,
					type: "conversion",
					description: `Convert file ${i}`,
					inputFiles: [`src/component${i}.js`],
					outputFiles: [`src/component${i}.vue`],
					dependencies: [],
					agentType: "code-generation",
					priority: i,
					status: "pending" as const,
					estimatedDuration: 400,
				})),
				estimatedDuration: 10000,
				complexity: "medium",
				warnings: [],
			};

			mockOrchestrator.createWorkflow.mockResolvedValue({
				id: "medium-workflow",
				tasks: mediumPlan.tasks,
				dependencies: [],
				context: {},
			});

			mockOrchestrator.executeWorkflow.mockImplementation(async () => {
				// Simulate processing time for medium project
				await new Promise((resolve) => setTimeout(resolve, 500));
				return {
					id: "medium-workflow",
					status: "completed",
					progress: 100,
					results: mediumPlan.tasks.map((task) => ({
						taskId: task.id,
						status: "completed",
						output: "converted code",
					})),
				};
			});

			const startTime = Date.now();
			const result = await conversionEngine.startConversion(mediumPlan);
			const endTime = Date.now();

			expect(result.status).toBe("completed");
			expect(endTime - startTime).toBeLessThan(120000); // 2 minutes
		});
	});

	describe("Large Project Performance", () => {
		it("should handle large projects (50+ files) efficiently with streaming", async () => {
			const largePlan: ConversionPlan = {
				id: "large-plan",
				projectId: "large-project",
				tasks: Array.from({ length: 100 }, (_, i) => ({
					id: `task-${i}`,
					type: "conversion",
					description: `Convert file ${i}`,
					inputFiles: [`src/component${i}.js`],
					outputFiles: [`src/component${i}.vue`],
					dependencies: [],
					agentType: "code-generation",
					priority: i,
					status: "pending" as const,
					estimatedDuration: 500,
				})),
				estimatedDuration: 50000,
				complexity: "high",
				warnings: [],
			};

			mockOrchestrator.createWorkflow.mockResolvedValue({
				id: "large-workflow",
				tasks: largePlan.tasks,
				dependencies: [],
				context: {},
			});

			// Mock streaming execution
			let progressCallbacks: Array<(progress: number) => void> = [];
			mockOrchestrator.executeWorkflow.mockImplementation(async () => {
				// Simulate streaming progress updates
				for (let i = 0; i <= 100; i += 10) {
					await new Promise((resolve) => setTimeout(resolve, 50));
					progressCallbacks.forEach((callback) => callback(i));
				}

				return {
					id: "large-workflow",
					status: "completed",
					progress: 100,
					results: largePlan.tasks.slice(0, 10).map((task) => ({
						// Only return first 10 for performance
						taskId: task.id,
						status: "completed",
						output: "converted code",
					})),
				};
			});

			const startTime = Date.now();
			const result = await conversionEngine.startConversion(largePlan);
			const endTime = Date.now();

			expect(result.status).toBe("completed");
			expect(endTime - startTime).toBeLessThan(10000); // Should start quickly, even for large projects
		});
	});

	describe("Memory Usage Performance", () => {
		it("should maintain reasonable memory usage during conversion", async () => {
			const memoryIntensivePlan: ConversionPlan = {
				id: "memory-plan",
				projectId: "memory-project",
				tasks: Array.from({ length: 50 }, (_, i) => ({
					id: `task-${i}`,
					type: "conversion",
					description: `Convert large file ${i}`,
					inputFiles: [`src/large-component${i}.js`],
					outputFiles: [`src/large-component${i}.vue`],
					dependencies: [],
					agentType: "code-generation",
					priority: i,
					status: "pending" as const,
					estimatedDuration: 600,
				})),
				estimatedDuration: 30000,
				complexity: "high",
				warnings: [],
			};

			// Mock memory-efficient processing
			mockOrchestrator.createWorkflow.mockResolvedValue({
				id: "memory-workflow",
				tasks: memoryIntensivePlan.tasks,
				dependencies: [],
				context: { memoryLimit: "512MB" },
			});

			mockOrchestrator.executeWorkflow.mockImplementation(async () => {
				// Simulate memory-efficient processing
				const batchSize = 5;
				const batches = Math.ceil(memoryIntensivePlan.tasks.length / batchSize);

				for (let batch = 0; batch < batches; batch++) {
					await new Promise((resolve) => setTimeout(resolve, 100));
					// Simulate memory cleanup between batches
				}

				return {
					id: "memory-workflow",
					status: "completed",
					progress: 100,
					results: [],
				};
			});

			const initialMemory = process.memoryUsage().heapUsed;
			const result = await conversionEngine.startConversion(
				memoryIntensivePlan
			);
			const finalMemory = process.memoryUsage().heapUsed;

			expect(result.status).toBe("completed");
			// Memory usage should not increase dramatically (allowing for some variance)
			expect(finalMemory - initialMemory).toBeLessThan(100 * 1024 * 1024); // Less than 100MB increase
		});
	});

	describe("Concurrent Conversion Performance", () => {
		it("should handle multiple concurrent conversions without significant performance degradation", async () => {
			const createPlan = (id: string): ConversionPlan => ({
				id: `plan-${id}`,
				projectId: `project-${id}`,
				tasks: Array.from({ length: 10 }, (_, i) => ({
					id: `task-${id}-${i}`,
					type: "conversion",
					description: `Convert file ${i}`,
					inputFiles: [`src/component${i}.js`],
					outputFiles: [`src/component${i}.vue`],
					dependencies: [],
					agentType: "code-generation",
					priority: i,
					status: "pending" as const,
					estimatedDuration: 300,
				})),
				estimatedDuration: 3000,
				complexity: "medium",
				warnings: [],
			});

			const plans = Array.from({ length: 5 }, (_, i) =>
				createPlan(i.toString())
			);

			// Mock concurrent execution
			mockOrchestrator.createWorkflow.mockImplementation(async (plan) => ({
				id: `workflow-${plan.id}`,
				tasks: plan.tasks,
				dependencies: [],
				context: {},
			}));

			mockOrchestrator.executeWorkflow.mockImplementation(
				async (workflowId) => {
					await new Promise((resolve) =>
						setTimeout(resolve, 200 + Math.random() * 100)
					);
					return {
						id: workflowId,
						status: "completed",
						progress: 100,
						results: [],
					};
				}
			);

			const startTime = Date.now();
			const results = await Promise.all(
				plans.map((plan) => conversionEngine.startConversion(plan))
			);
			const endTime = Date.now();

			expect(results).toHaveLength(5);
			results.forEach((result) => {
				expect(result.status).toBe("completed");
			});

			// Concurrent execution should be faster than sequential
			expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
		});
	});

	describe("AI Service Performance", () => {
		it("should handle AI service rate limits gracefully", async () => {
			const rateLimitPlan: ConversionPlan = {
				id: "rate-limit-plan",
				projectId: "rate-limit-project",
				tasks: Array.from({ length: 20 }, (_, i) => ({
					id: `task-${i}`,
					type: "conversion",
					description: `Convert file ${i}`,
					inputFiles: [`src/component${i}.js`],
					outputFiles: [`src/component${i}.vue`],
					dependencies: [],
					agentType: "code-generation",
					priority: i,
					status: "pending" as const,
					estimatedDuration: 400,
				})),
				estimatedDuration: 8000,
				complexity: "medium",
				warnings: [],
			};

			mockOrchestrator.createWorkflow.mockResolvedValue({
				id: "rate-limit-workflow",
				tasks: rateLimitPlan.tasks,
				dependencies: [],
				context: { rateLimitHandling: true },
			});

			// Mock rate limit handling with exponential backoff
			let callCount = 0;
			mockOrchestrator.executeWorkflow.mockImplementation(async () => {
				callCount++;
				if (callCount <= 3) {
					// Simulate rate limit on first few calls
					await new Promise((resolve) =>
						setTimeout(resolve, 100 * Math.pow(2, callCount - 1))
					);
				}

				return {
					id: "rate-limit-workflow",
					status: "completed",
					progress: 100,
					results: [],
				};
			});

			const startTime = Date.now();
			const result = await conversionEngine.startConversion(rateLimitPlan);
			const endTime = Date.now();

			expect(result.status).toBe("completed");
			expect(callCount).toBeGreaterThan(1); // Should have retried
			expect(endTime - startTime).toBeLessThan(5000); // Should complete within reasonable time
		});
	});

	describe("Error Recovery Performance", () => {
		it("should recover from transient errors quickly", async () => {
			const errorRecoveryPlan: ConversionPlan = {
				id: "error-recovery-plan",
				projectId: "error-recovery-project",
				tasks: Array.from({ length: 10 }, (_, i) => ({
					id: `task-${i}`,
					type: "conversion",
					description: `Convert file ${i}`,
					inputFiles: [`src/component${i}.js`],
					outputFiles: [`src/component${i}.vue`],
					dependencies: [],
					agentType: "code-generation",
					priority: i,
					status: "pending" as const,
					estimatedDuration: 300,
				})),
				estimatedDuration: 3000,
				complexity: "medium",
				warnings: [],
			};

			mockOrchestrator.createWorkflow.mockResolvedValue({
				id: "error-recovery-workflow",
				tasks: errorRecoveryPlan.tasks,
				dependencies: [],
				context: { errorRecovery: true },
			});

			// Mock transient errors with quick recovery
			let attemptCount = 0;
			mockOrchestrator.executeWorkflow.mockImplementation(async () => {
				attemptCount++;
				if (attemptCount === 1) {
					throw new Error("Transient network error");
				}

				await new Promise((resolve) => setTimeout(resolve, 100));
				return {
					id: "error-recovery-workflow",
					status: "completed",
					progress: 100,
					results: [],
				};
			});

			const startTime = Date.now();
			const result = await conversionEngine.startConversion(errorRecoveryPlan);
			const endTime = Date.now();

			expect(result.status).toBe("completed");
			expect(attemptCount).toBe(2); // Should have retried once
			expect(endTime - startTime).toBeLessThan(1000); // Should recover quickly
		});
	});
});
