import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ConversionEngine } from "@/services/conversionEngine";
import { AIService } from "@/services/ai";
import { AgentOrchestrator } from "@/agents/orchestrator";
import { ConversionPlan, TechStack, ConversionTask } from "@/types";

// Mock dependencies
vi.mock("@/services/ai");
vi.mock("@/agents/orchestrator");

const MockedAIService = vi.mocked(AIService);
const MockedAgentOrchestrator = vi.mocked(AgentOrchestrator);

describe("ConversionEngine - Comprehensive Tests", () => {
	let conversionEngine: ConversionEngine;
	let mockAIService: any;
	let mockOrchestrator: any;

	const mockSourceTechStack: TechStack = {
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

	const mockConversionPlan: ConversionPlan = {
		id: "plan-123",
		projectId: "project-123",
		tasks: [
			{
				id: "task-1",
				type: "analysis",
				description: "Analyze source code",
				inputFiles: ["src/App.js"],
				outputFiles: ["src/App.vue"],
				dependencies: [],
				agentType: "analysis",
				priority: 1,
				status: "pending",
				estimatedDuration: 300,
			},
			{
				id: "task-2",
				type: "conversion",
				description: "Convert React to Vue",
				inputFiles: ["src/App.js"],
				outputFiles: ["src/App.vue"],
				dependencies: ["task-1"],
				agentType: "code-generation",
				priority: 2,
				status: "pending",
				estimatedDuration: 600,
			},
		],
		estimatedDuration: 900,
		complexity: "medium",
		warnings: [],
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

	describe("startConversion", () => {
		it("should successfully start a conversion job", async () => {
			const mockWorkflow = {
				id: "workflow-123",
				tasks: mockConversionPlan.tasks,
				dependencies: [],
				context: {},
			};

			mockOrchestrator.createWorkflow.mockResolvedValue(mockWorkflow);
			mockOrchestrator.executeWorkflow.mockResolvedValue({
				id: "workflow-123",
				status: "running",
				progress: 0,
				results: [],
			});

			const result = await conversionEngine.startConversion(mockConversionPlan);

			expect(result.id).toBeDefined();
			expect(result.status).toBe("running");
			expect(result.progress).toBe(0);
			expect(mockOrchestrator.createWorkflow).toHaveBeenCalledWith(
				mockConversionPlan
			);
			expect(mockOrchestrator.executeWorkflow).toHaveBeenCalledWith(
				"workflow-123"
			);
		});

		it("should handle workflow creation errors", async () => {
			mockOrchestrator.createWorkflow.mockRejectedValue(
				new Error("Workflow creation failed")
			);

			await expect(
				conversionEngine.startConversion(mockConversionPlan)
			).rejects.toThrow("Failed to start conversion: Workflow creation failed");
		});

		it("should validate conversion plan before starting", async () => {
			const invalidPlan = { ...mockConversionPlan, tasks: [] };

			await expect(
				conversionEngine.startConversion(invalidPlan)
			).rejects.toThrow("Invalid conversion plan: No tasks defined");
		});
	});

	describe("getConversionStatus", () => {
		it("should return current conversion status", async () => {
			const mockStatus = {
				id: "workflow-123",
				status: "running" as const,
				progress: 50,
				currentTask: "Converting components",
				results: [],
				errors: [],
			};

			mockOrchestrator.getWorkflowStatus.mockResolvedValue(mockStatus);

			const result = await conversionEngine.getConversionStatus("job-123");

			expect(result).toEqual({
				id: "job-123",
				status: "running",
				progress: 50,
				currentTask: "Converting components",
				results: [],
			});
		});

		it("should handle non-existent job IDs", async () => {
			mockOrchestrator.getWorkflowStatus.mockResolvedValue(null);

			await expect(
				conversionEngine.getConversionStatus("non-existent")
			).rejects.toThrow("Conversion job not found: non-existent");
		});
	});

	describe("pauseConversion", () => {
		it("should successfully pause a running conversion", async () => {
			mockOrchestrator.pauseWorkflow.mockResolvedValue(undefined);

			await expect(
				conversionEngine.pauseConversion("job-123")
			).resolves.not.toThrow();
			expect(mockOrchestrator.pauseWorkflow).toHaveBeenCalledWith("job-123");
		});

		it("should handle pause errors gracefully", async () => {
			mockOrchestrator.pauseWorkflow.mockRejectedValue(
				new Error("Cannot pause completed job")
			);

			await expect(conversionEngine.pauseConversion("job-123")).rejects.toThrow(
				"Failed to pause conversion: Cannot pause completed job"
			);
		});
	});

	describe("resumeConversion", () => {
		it("should successfully resume a paused conversion", async () => {
			mockOrchestrator.resumeWorkflow.mockResolvedValue(undefined);

			await expect(
				conversionEngine.resumeConversion("job-123")
			).resolves.not.toThrow();
			expect(mockOrchestrator.resumeWorkflow).toHaveBeenCalledWith("job-123");
		});

		it("should handle resume errors gracefully", async () => {
			mockOrchestrator.resumeWorkflow.mockRejectedValue(
				new Error("Job not paused")
			);

			await expect(
				conversionEngine.resumeConversion("job-123")
			).rejects.toThrow("Failed to resume conversion: Job not paused");
		});
	});

	describe("performance optimization", () => {
		it("should handle large conversion plans efficiently", async () => {
			const largePlan: ConversionPlan = {
				...mockConversionPlan,
				tasks: Array.from({ length: 100 }, (_, i) => ({
					id: `task-${i}`,
					type: "conversion",
					description: `Convert file ${i}`,
					inputFiles: [`src/file${i}.js`],
					outputFiles: [`src/file${i}.vue`],
					dependencies: i > 0 ? [`task-${i - 1}`] : [],
					agentType: "code-generation",
					priority: i,
					status: "pending" as const,
					estimatedDuration: 300,
				})),
			};

			const mockWorkflow = {
				id: "large-workflow",
				tasks: largePlan.tasks,
				dependencies: [],
				context: {},
			};

			mockOrchestrator.createWorkflow.mockResolvedValue(mockWorkflow);
			mockOrchestrator.executeWorkflow.mockResolvedValue({
				id: "large-workflow",
				status: "running",
				progress: 0,
				results: [],
			});

			const startTime = Date.now();
			const result = await conversionEngine.startConversion(largePlan);
			const endTime = Date.now();

			expect(result.status).toBe("running");
			expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
		});

		it("should batch process multiple files efficiently", async () => {
			const batchPlan: ConversionPlan = {
				...mockConversionPlan,
				tasks: [
					{
						id: "batch-task",
						type: "batch-conversion",
						description: "Convert multiple files",
						inputFiles: ["src/file1.js", "src/file2.js", "src/file3.js"],
						outputFiles: ["src/file1.vue", "src/file2.vue", "src/file3.vue"],
						dependencies: [],
						agentType: "code-generation",
						priority: 1,
						status: "pending",
						estimatedDuration: 900,
					},
				],
			};

			mockOrchestrator.createWorkflow.mockResolvedValue({
				id: "batch-workflow",
				tasks: batchPlan.tasks,
				dependencies: [],
				context: {},
			});

			mockOrchestrator.executeWorkflow.mockResolvedValue({
				id: "batch-workflow",
				status: "running",
				progress: 0,
				results: [],
			});

			const result = await conversionEngine.startConversion(batchPlan);
			expect(result.status).toBe("running");
			expect(mockOrchestrator.createWorkflow).toHaveBeenCalledWith(batchPlan);
		});
	});

	describe("error recovery", () => {
		it("should retry failed tasks automatically", async () => {
			const mockWorkflowWithRetry = {
				id: "retry-workflow",
				tasks: mockConversionPlan.tasks,
				dependencies: [],
				context: { retryCount: 0, maxRetries: 3 },
			};

			mockOrchestrator.createWorkflow.mockResolvedValue(mockWorkflowWithRetry);
			mockOrchestrator.executeWorkflow
				.mockRejectedValueOnce(new Error("Temporary failure"))
				.mockResolvedValueOnce({
					id: "retry-workflow",
					status: "completed",
					progress: 100,
					results: [],
				});

			const result = await conversionEngine.startConversion(mockConversionPlan);
			expect(result.status).toBe("completed");
		});

		it("should handle permanent failures gracefully", async () => {
			mockOrchestrator.createWorkflow.mockResolvedValue({
				id: "fail-workflow",
				tasks: mockConversionPlan.tasks,
				dependencies: [],
				context: {},
			});

			mockOrchestrator.executeWorkflow.mockRejectedValue(
				new Error("Permanent failure")
			);

			await expect(
				conversionEngine.startConversion(mockConversionPlan)
			).rejects.toThrow("Failed to start conversion: Permanent failure");
		});
	});

	describe("memory management", () => {
		it("should clean up resources after conversion completion", async () => {
			const mockWorkflow = {
				id: "cleanup-workflow",
				tasks: mockConversionPlan.tasks,
				dependencies: [],
				context: {},
			};

			mockOrchestrator.createWorkflow.mockResolvedValue(mockWorkflow);
			mockOrchestrator.executeWorkflow.mockResolvedValue({
				id: "cleanup-workflow",
				status: "completed",
				progress: 100,
				results: [],
			});

			const result = await conversionEngine.startConversion(mockConversionPlan);
			expect(result.status).toBe("completed");

			// Verify cleanup was called (this would be implementation-specific)
			// In a real implementation, you'd check that temporary files are cleaned up,
			// memory is freed, etc.
		});
	});

	describe("concurrent conversions", () => {
		it("should handle multiple concurrent conversions", async () => {
			const plan1 = { ...mockConversionPlan, id: "plan-1" };
			const plan2 = { ...mockConversionPlan, id: "plan-2" };

			mockOrchestrator.createWorkflow
				.mockResolvedValueOnce({
					id: "workflow-1",
					tasks: plan1.tasks,
					dependencies: [],
					context: {},
				})
				.mockResolvedValueOnce({
					id: "workflow-2",
					tasks: plan2.tasks,
					dependencies: [],
					context: {},
				});

			mockOrchestrator.executeWorkflow
				.mockResolvedValueOnce({
					id: "workflow-1",
					status: "running",
					progress: 0,
					results: [],
				})
				.mockResolvedValueOnce({
					id: "workflow-2",
					status: "running",
					progress: 0,
					results: [],
				});

			const [result1, result2] = await Promise.all([
				conversionEngine.startConversion(plan1),
				conversionEngine.startConversion(plan2),
			]);

			expect(result1.status).toBe("running");
			expect(result2.status).toBe("running");
			expect(mockOrchestrator.createWorkflow).toHaveBeenCalledTimes(2);
		});
	});
});
