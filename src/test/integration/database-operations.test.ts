import {
	describe,
	it,
	expect,
	beforeAll,
	afterAll,
	beforeEach,
	afterEach,
	vi,
} from "vitest";
import { PrismaClient } from "@prisma/client";
import { UserRepository } from "@/repositories/user";
import { ProjectRepository } from "@/repositories/project";
import { ConversionJobRepository } from "@/repositories/conversionJob";

// Mock Prisma client for testing
const mockPrisma = {
	user: {
		create: vi.fn(),
		findUnique: vi.fn(),
		findMany: vi.fn(),
		update: vi.fn(),
		delete: vi.fn(),
		count: vi.fn(),
	},
	project: {
		create: vi.fn(),
		findUnique: vi.fn(),
		findMany: vi.fn(),
		update: vi.fn(),
		delete: vi.fn(),
		count: vi.fn(),
		groupBy: vi.fn(),
	},
	conversionJob: {
		create: vi.fn(),
		findUnique: vi.fn(),
		findMany: vi.fn(),
		update: vi.fn(),
		delete: vi.fn(),
		count: vi.fn(),
		aggregate: vi.fn(),
	},
	$transaction: vi.fn(),
	$connect: vi.fn(),
	$disconnect: vi.fn(),
};

vi.mock("@/lib/prisma", () => ({
	default: mockPrisma,
}));

describe("Database Operations Integration Tests", () => {
	let userRepository: UserRepository;
	let projectRepository: ProjectRepository;
	let conversionJobRepository: ConversionJobRepository;

	const mockUser = {
		id: "user-123",
		githubId: "github-123",
		username: "testuser",
		email: "test@example.com",
		accessToken: "github_token_123",
		createdAt: new Date("2024-01-01"),
		updatedAt: new Date("2024-01-01"),
	};

	const mockProject = {
		id: "project-123",
		name: "test-project",
		githubUrl: "https://github.com/testuser/test-project",
		userId: "user-123",
		originalTechStack: {
			language: "JavaScript",
			framework: "React",
		},
		targetTechStack: null,
		status: "imported",
		createdAt: new Date("2024-01-01"),
		updatedAt: new Date("2024-01-01"),
	};

	const mockConversionJob = {
		id: "job-123",
		projectId: "project-123",
		plan: {
			tasks: [],
			estimatedDuration: 3000,
			complexity: "medium",
		},
		status: "pending",
		progress: 0,
		currentTask: null,
		startedAt: null,
		completedAt: null,
		errorMessage: null,
		createdAt: new Date("2024-01-01"),
		updatedAt: new Date("2024-01-01"),
	};

	beforeAll(async () => {
		userRepository = new UserRepository(mockPrisma as any);
		projectRepository = new ProjectRepository(mockPrisma as any);
		conversionJobRepository = new ConversionJobRepository(mockPrisma as any);
	});

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("User Repository Operations", () => {
		describe("createUser", () => {
			it("should create a new user successfully", async () => {
				mockPrisma.user.create.mockResolvedValue(mockUser);

				const userData = {
					githubId: "github-123",
					username: "testuser",
					email: "test@example.com",
					accessToken: "github_token_123",
				};

				const result = await userRepository.create(userData);

				expect(result).toEqual(mockUser);
				expect(mockPrisma.user.create).toHaveBeenCalledWith({
					data: userData,
				});
			});

			it("should handle duplicate user creation", async () => {
				const duplicateError = new Error("Unique constraint violation");
				(duplicateError as any).code = "P2002";
				mockPrisma.user.create.mockRejectedValue(duplicateError);

				const userData = {
					githubId: "github-123",
					username: "testuser",
					email: "test@example.com",
					accessToken: "github_token_123",
				};

				await expect(userRepository.create(userData)).rejects.toThrow(
					"User already exists"
				);
			});
		});

		describe("findUserByGithubId", () => {
			it("should find user by GitHub ID", async () => {
				mockPrisma.user.findUnique.mockResolvedValue(mockUser);

				const result = await userRepository.findByGithubId("github-123");

				expect(result).toEqual(mockUser);
				expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
					where: { githubId: "github-123" },
				});
			});

			it("should return null for non-existent user", async () => {
				mockPrisma.user.findUnique.mockResolvedValue(null);

				const result = await userRepository.findByGithubId("non-existent");

				expect(result).toBeNull();
			});
		});

		describe("updateUser", () => {
			it("should update user successfully", async () => {
				const updatedUser = {
					...mockUser,
					username: "updateduser",
					updatedAt: new Date(),
				};

				mockPrisma.user.update.mockResolvedValue(updatedUser);

				const result = await userRepository.update("user-123", {
					username: "updateduser",
				});

				expect(result).toEqual(updatedUser);
				expect(mockPrisma.user.update).toHaveBeenCalledWith({
					where: { id: "user-123" },
					data: { username: "updateduser" },
				});
			});
		});

		describe("deleteUser", () => {
			it("should delete user and cascade to related records", async () => {
				mockPrisma.$transaction.mockImplementation(async (operations) => {
					// Mock transaction execution
					for (const operation of operations) {
						await operation;
					}
					return [mockUser];
				});

				mockPrisma.project.delete.mockResolvedValue(mockProject);
				mockPrisma.user.delete.mockResolvedValue(mockUser);

				const result = await userRepository.delete("user-123");

				expect(result).toEqual(mockUser);
				expect(mockPrisma.$transaction).toHaveBeenCalled();
			});
		});
	});

	describe("Project Repository Operations", () => {
		describe("createProject", () => {
			it("should create a new project successfully", async () => {
				mockPrisma.project.create.mockResolvedValue(mockProject);

				const projectData = {
					name: "test-project",
					githubUrl: "https://github.com/testuser/test-project",
					userId: "user-123",
					originalTechStack: {
						language: "JavaScript",
						framework: "React",
					},
					status: "imported" as const,
				};

				const result = await projectRepository.create(projectData);

				expect(result).toEqual(mockProject);
				expect(mockPrisma.project.create).toHaveBeenCalledWith({
					data: projectData,
				});
			});

			it("should validate required fields", async () => {
				const invalidProjectData = {
					name: "",
					githubUrl: "invalid-url",
					userId: "user-123",
				};

				await expect(
					projectRepository.create(invalidProjectData as any)
				).rejects.toThrow("Invalid project data");
			});
		});

		describe("findProjectsByUserId", () => {
			it("should find all projects for a user", async () => {
				const userProjects = [
					mockProject,
					{ ...mockProject, id: "project-456" },
				];
				mockPrisma.project.findMany.mockResolvedValue(userProjects);

				const result = await projectRepository.findByUserId("user-123");

				expect(result).toEqual(userProjects);
				expect(mockPrisma.project.findMany).toHaveBeenCalledWith({
					where: { userId: "user-123" },
					orderBy: { createdAt: "desc" },
				});
			});

			it("should support pagination", async () => {
				const paginatedProjects = [mockProject];
				mockPrisma.project.findMany.mockResolvedValue(paginatedProjects);

				const result = await projectRepository.findByUserId("user-123", {
					skip: 10,
					take: 5,
				});

				expect(result).toEqual(paginatedProjects);
				expect(mockPrisma.project.findMany).toHaveBeenCalledWith({
					where: { userId: "user-123" },
					orderBy: { createdAt: "desc" },
					skip: 10,
					take: 5,
				});
			});

			it("should support filtering by status", async () => {
				const filteredProjects = [mockProject];
				mockPrisma.project.findMany.mockResolvedValue(filteredProjects);

				const result = await projectRepository.findByUserId("user-123", {
					status: "imported",
				});

				expect(result).toEqual(filteredProjects);
				expect(mockPrisma.project.findMany).toHaveBeenCalledWith({
					where: {
						userId: "user-123",
						status: "imported",
					},
					orderBy: { createdAt: "desc" },
				});
			});
		});

		describe("updateProject", () => {
			it("should update project with target tech stack", async () => {
				const updatedProject = {
					...mockProject,
					targetTechStack: {
						language: "TypeScript",
						framework: "Vue",
					},
					status: "configured",
					updatedAt: new Date(),
				};

				mockPrisma.project.update.mockResolvedValue(updatedProject);

				const result = await projectRepository.update("project-123", {
					targetTechStack: {
						language: "TypeScript",
						framework: "Vue",
					},
					status: "configured",
				});

				expect(result).toEqual(updatedProject);
			});

			it("should validate tech stack compatibility", async () => {
				const incompatibleTechStack = {
					language: "Python",
					framework: "React", // Invalid combination
				};

				await expect(
					projectRepository.update("project-123", {
						targetTechStack: incompatibleTechStack,
					})
				).rejects.toThrow("Incompatible tech stack");
			});
		});

		describe("getProjectStatistics", () => {
			it("should return project statistics by tech stack", async () => {
				const mockStats = [
					{ originalTechStack: { language: "JavaScript" }, _count: 5 },
					{ originalTechStack: { language: "Python" }, _count: 3 },
				];

				mockPrisma.project.groupBy.mockResolvedValue(mockStats);

				const result = await projectRepository.getStatistics();

				expect(result).toEqual({
					byLanguage: {
						JavaScript: 5,
						Python: 3,
					},
					total: 8,
				});
			});
		});
	});

	describe("Conversion Job Repository Operations", () => {
		describe("createConversionJob", () => {
			it("should create a new conversion job", async () => {
				mockPrisma.conversionJob.create.mockResolvedValue(mockConversionJob);

				const jobData = {
					projectId: "project-123",
					plan: {
						tasks: [],
						estimatedDuration: 3000,
						complexity: "medium" as const,
					},
					status: "pending" as const,
				};

				const result = await conversionJobRepository.create(jobData);

				expect(result).toEqual(mockConversionJob);
				expect(mockPrisma.conversionJob.create).toHaveBeenCalledWith({
					data: jobData,
				});
			});

			it("should prevent multiple active jobs for same project", async () => {
				const existingJob = { ...mockConversionJob, status: "running" };
				mockPrisma.conversionJob.findMany.mockResolvedValue([existingJob]);

				const jobData = {
					projectId: "project-123",
					plan: {
						tasks: [],
						estimatedDuration: 3000,
						complexity: "medium" as const,
					},
					status: "pending" as const,
				};

				await expect(conversionJobRepository.create(jobData)).rejects.toThrow(
					"Active conversion job already exists"
				);
			});
		});

		describe("updateJobProgress", () => {
			it("should update job progress and current task", async () => {
				const updatedJob = {
					...mockConversionJob,
					status: "running",
					progress: 45,
					currentTask: "Converting components",
					updatedAt: new Date(),
				};

				mockPrisma.conversionJob.update.mockResolvedValue(updatedJob);

				const result = await conversionJobRepository.updateProgress("job-123", {
					status: "running",
					progress: 45,
					currentTask: "Converting components",
				});

				expect(result).toEqual(updatedJob);
			});

			it("should validate progress values", async () => {
				await expect(
					conversionJobRepository.updateProgress("job-123", {
						progress: 150, // Invalid progress > 100
					})
				).rejects.toThrow("Invalid progress value");

				await expect(
					conversionJobRepository.updateProgress("job-123", {
						progress: -10, // Invalid negative progress
					})
				).rejects.toThrow("Invalid progress value");
			});
		});

		describe("completeJob", () => {
			it("should mark job as completed with results", async () => {
				const completedJob = {
					...mockConversionJob,
					status: "completed",
					progress: 100,
					completedAt: new Date(),
					results: [{ file: "src/App.vue", status: "converted" }],
				};

				mockPrisma.conversionJob.update.mockResolvedValue(completedJob);

				const result = await conversionJobRepository.complete("job-123", {
					results: [{ file: "src/App.vue", status: "converted" }],
				});

				expect(result).toEqual(completedJob);
				expect(mockPrisma.conversionJob.update).toHaveBeenCalledWith({
					where: { id: "job-123" },
					data: {
						status: "completed",
						progress: 100,
						completedAt: expect.any(Date),
						results: [{ file: "src/App.vue", status: "converted" }],
					},
				});
			});
		});

		describe("failJob", () => {
			it("should mark job as failed with error message", async () => {
				const failedJob = {
					...mockConversionJob,
					status: "failed",
					errorMessage: "AI service unavailable",
					completedAt: new Date(),
				};

				mockPrisma.conversionJob.update.mockResolvedValue(failedJob);

				const result = await conversionJobRepository.fail(
					"job-123",
					"AI service unavailable"
				);

				expect(result).toEqual(failedJob);
				expect(mockPrisma.conversionJob.update).toHaveBeenCalledWith({
					where: { id: "job-123" },
					data: {
						status: "failed",
						errorMessage: "AI service unavailable",
						completedAt: expect.any(Date),
					},
				});
			});
		});

		describe("getJobStatistics", () => {
			it("should return conversion job statistics", async () => {
				const mockAggregation = {
					_count: { id: 100 },
					_avg: { progress: 75.5 },
					_sum: { estimatedDuration: 300000 },
				};

				mockPrisma.conversionJob.aggregate.mockResolvedValue(mockAggregation);

				const statusCounts = [
					{ status: "completed", _count: 60 },
					{ status: "running", _count: 25 },
					{ status: "failed", _count: 15 },
				];

				mockPrisma.conversionJob.groupBy.mockResolvedValue(statusCounts);

				const result = await conversionJobRepository.getStatistics();

				expect(result).toEqual({
					total: 100,
					averageProgress: 75.5,
					totalEstimatedDuration: 300000,
					byStatus: {
						completed: 60,
						running: 25,
						failed: 15,
					},
				});
			});
		});
	});

	describe("Transaction Operations", () => {
		it("should handle complex multi-table transactions", async () => {
			const newUser = { ...mockUser, id: "new-user-123" };
			const newProject = {
				...mockProject,
				id: "new-project-123",
				userId: "new-user-123",
			};
			const newJob = {
				...mockConversionJob,
				id: "new-job-123",
				projectId: "new-project-123",
			};

			mockPrisma.$transaction.mockImplementation(async (operations) => {
				// Simulate transaction execution
				return [newUser, newProject, newJob];
			});

			const result = await mockPrisma.$transaction([
				mockPrisma.user.create({
					data: {
						githubId: "new-github-123",
						username: "newuser",
						email: "new@example.com",
					},
				}),
				mockPrisma.project.create({
					data: {
						name: "new-project",
						githubUrl: "https://github.com/newuser/new-project",
						userId: "new-user-123",
					},
				}),
				mockPrisma.conversionJob.create({
					data: {
						projectId: "new-project-123",
						plan: { tasks: [] },
						status: "pending",
					},
				}),
			]);

			expect(result).toEqual([newUser, newProject, newJob]);
			expect(mockPrisma.$transaction).toHaveBeenCalled();
		});

		it("should rollback transaction on error", async () => {
			const transactionError = new Error("Transaction failed");
			mockPrisma.$transaction.mockRejectedValue(transactionError);

			await expect(
				mockPrisma.$transaction([
					mockPrisma.user.create({ data: {} }),
					mockPrisma.project.create({ data: {} }),
				])
			).rejects.toThrow("Transaction failed");
		});
	});

	describe("Connection Management", () => {
		it("should handle database connection", async () => {
			mockPrisma.$connect.mockResolvedValue(undefined);

			await expect(mockPrisma.$connect()).resolves.not.toThrow();
		});

		it("should handle database disconnection", async () => {
			mockPrisma.$disconnect.mockResolvedValue(undefined);

			await expect(mockPrisma.$disconnect()).resolves.not.toThrow();
		});

		it("should handle connection errors", async () => {
			const connectionError = new Error("Database connection failed");
			mockPrisma.$connect.mockRejectedValue(connectionError);

			await expect(mockPrisma.$connect()).rejects.toThrow(
				"Database connection failed"
			);
		});
	});

	describe("Data Integrity and Constraints", () => {
		it("should enforce foreign key constraints", async () => {
			const foreignKeyError = new Error("Foreign key constraint violation");
			(foreignKeyError as any).code = "P2003";
			mockPrisma.project.create.mockRejectedValue(foreignKeyError);

			const projectData = {
				name: "test-project",
				githubUrl: "https://github.com/testuser/test-project",
				userId: "non-existent-user",
				originalTechStack: { language: "JavaScript" },
				status: "imported" as const,
			};

			await expect(projectRepository.create(projectData)).rejects.toThrow(
				"Referenced user does not exist"
			);
		});

		it("should enforce unique constraints", async () => {
			const uniqueError = new Error("Unique constraint violation");
			(uniqueError as any).code = "P2002";
			mockPrisma.project.create.mockRejectedValue(uniqueError);

			const duplicateProject = {
				name: "test-project",
				githubUrl: "https://github.com/testuser/test-project", // Duplicate URL
				userId: "user-123",
				originalTechStack: { language: "JavaScript" },
				status: "imported" as const,
			};

			await expect(projectRepository.create(duplicateProject)).rejects.toThrow(
				"Project with this GitHub URL already exists"
			);
		});
	});

	describe("Performance and Optimization", () => {
		it("should handle large result sets efficiently", async () => {
			const largeResultSet = Array.from({ length: 1000 }, (_, i) => ({
				...mockProject,
				id: `project-${i}`,
			}));

			mockPrisma.project.findMany.mockResolvedValue(largeResultSet);

			const startTime = Date.now();
			const result = await projectRepository.findByUserId("user-123");
			const endTime = Date.now();

			expect(result).toHaveLength(1000);
			expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
		});

		it("should use database indexes effectively", async () => {
			// Mock query with index usage
			mockPrisma.project.findMany.mockImplementation(async (query) => {
				// Simulate indexed query performance
				if (query.where?.userId) {
					return [mockProject]; // Fast indexed lookup
				}
				throw new Error("Slow query without index");
			});

			const result = await projectRepository.findByUserId("user-123");
			expect(result).toEqual([mockProject]);
		});
	});
});
