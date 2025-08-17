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
import request from "supertest";
import express from "express";
import { PrismaClient } from "@prisma/client";
import { createServer } from "http";

// Import API routes
import authRoutes from "@/app/api/auth/route";
import projectsRoutes from "@/app/api/projects/route";
import conversionRoutes from "@/app/api/conversion/route";

// Mock Prisma client
const mockPrisma = {
	user: {
		create: vi.fn(),
		findUnique: vi.fn(),
		update: vi.fn(),
		delete: vi.fn(),
	},
	project: {
		create: vi.fn(),
		findUnique: vi.fn(),
		findMany: vi.fn(),
		update: vi.fn(),
		delete: vi.fn(),
	},
	conversionJob: {
		create: vi.fn(),
		findUnique: vi.fn(),
		findMany: vi.fn(),
		update: vi.fn(),
		delete: vi.fn(),
	},
};

vi.mock("@/lib/prisma", () => ({
	default: mockPrisma,
}));

describe("API Endpoints Integration Tests", () => {
	let app: express.Application;
	let server: any;

	beforeAll(async () => {
		app = express();
		app.use(express.json());

		// Setup routes
		app.use("/api/auth", authRoutes);
		app.use("/api/projects", projectsRoutes);
		app.use("/api/conversion", conversionRoutes);

		server = createServer(app);
	});

	afterAll(async () => {
		if (server) {
			server.close();
		}
	});

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Authentication Endpoints", () => {
		describe("POST /api/auth/github", () => {
			it("should authenticate user with GitHub OAuth", async () => {
				const mockUser = {
					id: "user-123",
					githubId: "github-123",
					username: "testuser",
					email: "test@example.com",
					accessToken: "github_token_123",
					createdAt: new Date(),
					updatedAt: new Date(),
				};

				mockPrisma.user.findUnique.mockResolvedValue(null);
				mockPrisma.user.create.mockResolvedValue(mockUser);

				const response = await request(app)
					.post("/api/auth/github")
					.send({
						code: "github_auth_code_123",
						state: "random_state_string",
					})
					.expect(200);

				expect(response.body).toHaveProperty("user");
				expect(response.body).toHaveProperty("token");
				expect(response.body.user.username).toBe("testuser");
			});

			it("should return existing user if already registered", async () => {
				const existingUser = {
					id: "user-123",
					githubId: "github-123",
					username: "existinguser",
					email: "existing@example.com",
					accessToken: "github_token_123",
					createdAt: new Date(),
					updatedAt: new Date(),
				};

				mockPrisma.user.findUnique.mockResolvedValue(existingUser);

				const response = await request(app)
					.post("/api/auth/github")
					.send({
						code: "github_auth_code_123",
						state: "random_state_string",
					})
					.expect(200);

				expect(response.body.user.username).toBe("existinguser");
				expect(mockPrisma.user.create).not.toHaveBeenCalled();
			});

			it("should handle invalid GitHub auth code", async () => {
				const response = await request(app)
					.post("/api/auth/github")
					.send({
						code: "invalid_code",
						state: "random_state_string",
					})
					.expect(400);

				expect(response.body).toHaveProperty("error");
				expect(response.body.error).toContain("Invalid authorization code");
			});
		});

		describe("POST /api/auth/logout", () => {
			it("should logout user successfully", async () => {
				const response = await request(app)
					.post("/api/auth/logout")
					.set("Authorization", "Bearer valid_jwt_token")
					.expect(200);

				expect(response.body).toHaveProperty("message");
				expect(response.body.message).toBe("Logged out successfully");
			});
		});
	});

	describe("Projects Endpoints", () => {
		const mockProject = {
			id: "project-123",
			name: "test-project",
			githubUrl: "https://github.com/user/test-project",
			userId: "user-123",
			originalTechStack: {
				language: "JavaScript",
				framework: "React",
			},
			targetTechStack: null,
			status: "imported",
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		describe("GET /api/projects", () => {
			it("should return user projects", async () => {
				mockPrisma.project.findMany.mockResolvedValue([mockProject]);

				const response = await request(app)
					.get("/api/projects")
					.set("Authorization", "Bearer valid_jwt_token")
					.expect(200);

				expect(response.body).toHaveProperty("projects");
				expect(response.body.projects).toHaveLength(1);
				expect(response.body.projects[0].name).toBe("test-project");
			});

			it("should return empty array for user with no projects", async () => {
				mockPrisma.project.findMany.mockResolvedValue([]);

				const response = await request(app)
					.get("/api/projects")
					.set("Authorization", "Bearer valid_jwt_token")
					.expect(200);

				expect(response.body.projects).toHaveLength(0);
			});

			it("should require authentication", async () => {
				const response = await request(app).get("/api/projects").expect(401);

				expect(response.body).toHaveProperty("error");
				expect(response.body.error).toContain("Authentication required");
			});
		});

		describe("POST /api/projects/import", () => {
			it("should import GitHub repository successfully", async () => {
				const importRequest = {
					githubUrl: "https://github.com/user/new-project",
					accessToken: "github_token_123",
				};

				mockPrisma.project.create.mockResolvedValue({
					...mockProject,
					githubUrl: importRequest.githubUrl,
				});

				const response = await request(app)
					.post("/api/projects/import")
					.set("Authorization", "Bearer valid_jwt_token")
					.send(importRequest)
					.expect(201);

				expect(response.body).toHaveProperty("project");
				expect(response.body.project.githubUrl).toBe(importRequest.githubUrl);
				expect(response.body).toHaveProperty("importResult");
			});

			it("should validate GitHub URL format", async () => {
				const invalidRequest = {
					githubUrl: "https://invalid-url.com/repo",
				};

				const response = await request(app)
					.post("/api/projects/import")
					.set("Authorization", "Bearer valid_jwt_token")
					.send(invalidRequest)
					.expect(400);

				expect(response.body).toHaveProperty("error");
				expect(response.body.error).toContain("Invalid GitHub URL");
			});

			it("should handle GitHub API errors", async () => {
				const importRequest = {
					githubUrl: "https://github.com/user/nonexistent-repo",
				};

				const response = await request(app)
					.post("/api/projects/import")
					.set("Authorization", "Bearer valid_jwt_token")
					.send(importRequest)
					.expect(404);

				expect(response.body).toHaveProperty("error");
				expect(response.body.error).toContain("Repository not found");
			});
		});

		describe("GET /api/projects/:id", () => {
			it("should return specific project details", async () => {
				mockPrisma.project.findUnique.mockResolvedValue(mockProject);

				const response = await request(app)
					.get("/api/projects/project-123")
					.set("Authorization", "Bearer valid_jwt_token")
					.expect(200);

				expect(response.body).toHaveProperty("project");
				expect(response.body.project.id).toBe("project-123");
			});

			it("should return 404 for non-existent project", async () => {
				mockPrisma.project.findUnique.mockResolvedValue(null);

				const response = await request(app)
					.get("/api/projects/non-existent")
					.set("Authorization", "Bearer valid_jwt_token")
					.expect(404);

				expect(response.body).toHaveProperty("error");
				expect(response.body.error).toContain("Project not found");
			});
		});

		describe("PUT /api/projects/:id", () => {
			it("should update project successfully", async () => {
				const updateData = {
					targetTechStack: {
						language: "TypeScript",
						framework: "Vue",
					},
				};

				const updatedProject = {
					...mockProject,
					targetTechStack: updateData.targetTechStack,
				};

				mockPrisma.project.findUnique.mockResolvedValue(mockProject);
				mockPrisma.project.update.mockResolvedValue(updatedProject);

				const response = await request(app)
					.put("/api/projects/project-123")
					.set("Authorization", "Bearer valid_jwt_token")
					.send(updateData)
					.expect(200);

				expect(response.body.project.targetTechStack).toEqual(
					updateData.targetTechStack
				);
			});
		});

		describe("DELETE /api/projects/:id", () => {
			it("should delete project successfully", async () => {
				mockPrisma.project.findUnique.mockResolvedValue(mockProject);
				mockPrisma.project.delete.mockResolvedValue(mockProject);

				const response = await request(app)
					.delete("/api/projects/project-123")
					.set("Authorization", "Bearer valid_jwt_token")
					.expect(200);

				expect(response.body).toHaveProperty("message");
				expect(response.body.message).toContain("deleted successfully");
			});
		});
	});

	describe("Conversion Endpoints", () => {
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
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		describe("POST /api/conversion/start", () => {
			it("should start conversion job successfully", async () => {
				const conversionRequest = {
					projectId: "project-123",
					targetTechStack: {
						language: "TypeScript",
						framework: "Vue",
					},
				};

				mockPrisma.project.findUnique.mockResolvedValue(mockProject);
				mockPrisma.conversionJob.create.mockResolvedValue(mockConversionJob);

				const response = await request(app)
					.post("/api/conversion/start")
					.set("Authorization", "Bearer valid_jwt_token")
					.send(conversionRequest)
					.expect(201);

				expect(response.body).toHaveProperty("job");
				expect(response.body.job.id).toBe("job-123");
				expect(response.body.job.status).toBe("pending");
			});

			it("should validate project exists", async () => {
				const conversionRequest = {
					projectId: "non-existent-project",
					targetTechStack: {
						language: "TypeScript",
						framework: "Vue",
					},
				};

				mockPrisma.project.findUnique.mockResolvedValue(null);

				const response = await request(app)
					.post("/api/conversion/start")
					.set("Authorization", "Bearer valid_jwt_token")
					.send(conversionRequest)
					.expect(404);

				expect(response.body).toHaveProperty("error");
				expect(response.body.error).toContain("Project not found");
			});
		});

		describe("GET /api/conversion/:jobId/status", () => {
			it("should return conversion job status", async () => {
				const runningJob = {
					...mockConversionJob,
					status: "running",
					progress: 45,
					currentTask: "Converting components",
				};

				mockPrisma.conversionJob.findUnique.mockResolvedValue(runningJob);

				const response = await request(app)
					.get("/api/conversion/job-123/status")
					.set("Authorization", "Bearer valid_jwt_token")
					.expect(200);

				expect(response.body).toHaveProperty("job");
				expect(response.body.job.status).toBe("running");
				expect(response.body.job.progress).toBe(45);
			});

			it("should return 404 for non-existent job", async () => {
				mockPrisma.conversionJob.findUnique.mockResolvedValue(null);

				const response = await request(app)
					.get("/api/conversion/non-existent/status")
					.set("Authorization", "Bearer valid_jwt_token")
					.expect(404);

				expect(response.body).toHaveProperty("error");
				expect(response.body.error).toContain("Conversion job not found");
			});
		});

		describe("POST /api/conversion/:jobId/pause", () => {
			it("should pause running conversion job", async () => {
				const runningJob = {
					...mockConversionJob,
					status: "running",
				};

				const pausedJob = {
					...runningJob,
					status: "paused",
				};

				mockPrisma.conversionJob.findUnique.mockResolvedValue(runningJob);
				mockPrisma.conversionJob.update.mockResolvedValue(pausedJob);

				const response = await request(app)
					.post("/api/conversion/job-123/pause")
					.set("Authorization", "Bearer valid_jwt_token")
					.expect(200);

				expect(response.body.job.status).toBe("paused");
			});

			it("should not pause completed job", async () => {
				const completedJob = {
					...mockConversionJob,
					status: "completed",
				};

				mockPrisma.conversionJob.findUnique.mockResolvedValue(completedJob);

				const response = await request(app)
					.post("/api/conversion/job-123/pause")
					.set("Authorization", "Bearer valid_jwt_token")
					.expect(400);

				expect(response.body).toHaveProperty("error");
				expect(response.body.error).toContain("Cannot pause completed job");
			});
		});

		describe("POST /api/conversion/:jobId/resume", () => {
			it("should resume paused conversion job", async () => {
				const pausedJob = {
					...mockConversionJob,
					status: "paused",
				};

				const resumedJob = {
					...pausedJob,
					status: "running",
				};

				mockPrisma.conversionJob.findUnique.mockResolvedValue(pausedJob);
				mockPrisma.conversionJob.update.mockResolvedValue(resumedJob);

				const response = await request(app)
					.post("/api/conversion/job-123/resume")
					.set("Authorization", "Bearer valid_jwt_token")
					.expect(200);

				expect(response.body.job.status).toBe("running");
			});
		});
	});

	describe("Error Handling", () => {
		it("should handle database connection errors", async () => {
			mockPrisma.project.findMany.mockRejectedValue(
				new Error("Database connection failed")
			);

			const response = await request(app)
				.get("/api/projects")
				.set("Authorization", "Bearer valid_jwt_token")
				.expect(500);

			expect(response.body).toHaveProperty("error");
			expect(response.body.error).toContain("Internal server error");
		});

		it("should handle malformed JSON requests", async () => {
			const response = await request(app)
				.post("/api/projects/import")
				.set("Authorization", "Bearer valid_jwt_token")
				.set("Content-Type", "application/json")
				.send("{ invalid json }")
				.expect(400);

			expect(response.body).toHaveProperty("error");
			expect(response.body.error).toContain("Invalid JSON");
		});

		it("should handle missing required fields", async () => {
			const response = await request(app)
				.post("/api/projects/import")
				.set("Authorization", "Bearer valid_jwt_token")
				.send({}) // Missing githubUrl
				.expect(400);

			expect(response.body).toHaveProperty("error");
			expect(response.body.error).toContain("githubUrl is required");
		});
	});

	describe("Rate Limiting", () => {
		it("should enforce rate limits on API endpoints", async () => {
			// Make multiple rapid requests
			const requests = Array.from({ length: 10 }, () =>
				request(app)
					.get("/api/projects")
					.set("Authorization", "Bearer valid_jwt_token")
			);

			const responses = await Promise.all(requests);

			// Some requests should be rate limited
			const rateLimitedResponses = responses.filter(
				(res) => res.status === 429
			);
			expect(rateLimitedResponses.length).toBeGreaterThan(0);
		});
	});

	describe("Security Headers", () => {
		it("should include security headers in responses", async () => {
			const response = await request(app)
				.get("/api/projects")
				.set("Authorization", "Bearer valid_jwt_token");

			expect(response.headers).toHaveProperty("x-content-type-options");
			expect(response.headers).toHaveProperty("x-frame-options");
			expect(response.headers).toHaveProperty("x-xss-protection");
		});
	});
});
