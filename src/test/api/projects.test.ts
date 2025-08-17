import { describe, it, expect, beforeAll } from "vitest";
import {
	setupTestEnvironment,
	getTestRequest,
	getTestUser,
	getAuthHeaders,
	createTestProject,
	mockExternalServices,
	assertSuccessResponse,
	assertErrorResponse,
} from "./setup-simple";

describe("Projects API Routes", () => {
	setupTestEnvironment();

	let request: ReturnType<typeof getTestRequest>;
	let testUser: ReturnType<typeof getTestUser>;
	let restoreMocks: () => void;

	beforeAll(() => {
		request = getTestRequest();
		testUser = getTestUser();
		restoreMocks = mockExternalServices();
	});

	describe("POST /api/projects/import", () => {
		it("should import GitHub repository successfully", async () => {
			const response = await request
				.post("/api/projects/import")
				.set(getAuthHeaders())
				.send({
					url: "https://github.com/testuser/test-repo",
				})
				.expect(201);

			assertSuccessResponse(response);
			expect(response.body.data.project).toHaveProperty("id");
			expect(response.body.data.project).toHaveProperty("name");
			expect(response.body.data.project).toHaveProperty("githubUrl");
			expect(response.body.data.project).toHaveProperty("status");
			expect(response.body.data.project).toHaveProperty("detectedTechnologies");
		});

		it("should validate GitHub URL format", async () => {
			const response = await request
				.post("/api/projects/import")
				.set(getAuthHeaders())
				.send({
					url: "invalid-url",
				})
				.expect(400);

			assertErrorResponse(response, "VALIDATION_ERROR");
		});

		it("should require authentication", async () => {
			const response = await request
				.post("/api/projects/import")
				.send({
					url: "https://github.com/testuser/test-repo",
				})
				.expect(401);

			assertErrorResponse(response, "MISSING_TOKEN");
		});

		it("should apply rate limiting", async () => {
			// Make multiple import requests to test rate limiting
			const promises = Array.from({ length: 25 }, (_, i) =>
				request
					.post("/api/projects/import")
					.set(getAuthHeaders())
					.send({
						url: `https://github.com/testuser/test-repo-${i}`,
					})
			);

			const responses = await Promise.all(promises);

			// Some requests should be rate limited
			const rateLimitedResponses = responses.filter((r) => r.status === 429);
			expect(rateLimitedResponses.length).toBeGreaterThan(0);
		});
	});

	describe("POST /api/projects/validate", () => {
		it("should validate GitHub repository", async () => {
			const response = await request
				.post("/api/projects/validate")
				.set(getAuthHeaders())
				.send({
					url: "https://github.com/testuser/test-repo",
				})
				.expect(200);

			assertSuccessResponse(response);
			expect(response.body.data).toHaveProperty("valid");
			expect(response.body.data).toHaveProperty("accessible");
			expect(response.body.data).toHaveProperty("size");
			expect(response.body.data).toHaveProperty("language");
		});

		it("should validate URL format", async () => {
			const response = await request
				.post("/api/projects/validate")
				.set(getAuthHeaders())
				.send({
					url: "not-a-github-url",
				})
				.expect(400);

			assertErrorResponse(response, "VALIDATION_ERROR");
		});
	});

	describe("GET /api/projects", () => {
		it("should return user projects with pagination", async () => {
			// Create test projects
			await createTestProject(testUser.user.id, { name: "Test Project 1" });
			await createTestProject(testUser.user.id, { name: "Test Project 2" });

			const response = await request
				.get("/api/projects")
				.set(getAuthHeaders())
				.query({ page: 1, limit: 10 })
				.expect(200);

			assertSuccessResponse(response);
			expect(response.body.data).toHaveProperty("projects");
			expect(response.body.data).toHaveProperty("pagination");
			expect(Array.isArray(response.body.data.projects)).toBe(true);
			expect(response.body.data.pagination).toHaveProperty("page");
			expect(response.body.data.pagination).toHaveProperty("limit");
			expect(response.body.data.pagination).toHaveProperty("total");
		});

		it("should validate pagination parameters", async () => {
			const response = await request
				.get("/api/projects")
				.set(getAuthHeaders())
				.query({ page: "invalid", limit: "invalid" })
				.expect(400);

			assertErrorResponse(response, "VALIDATION_ERROR");
		});

		it("should require authentication", async () => {
			const response = await request.get("/api/projects").expect(401);

			assertErrorResponse(response, "MISSING_TOKEN");
		});
	});

	describe("GET /api/projects/:id", () => {
		it("should return specific project", async () => {
			const project = await createTestProject(testUser.user.id);

			const response = await request
				.get(`/api/projects/${project.id}`)
				.set(getAuthHeaders())
				.expect(200);

			assertSuccessResponse(response);
			expect(response.body.data.project).toMatchObject({
				id: project.id,
				name: project.name,
				githubUrl: project.githubUrl,
			});
		});

		it("should validate project ID format", async () => {
			const response = await request
				.get("/api/projects/invalid-uuid")
				.set(getAuthHeaders())
				.expect(400);

			assertErrorResponse(response, "VALIDATION_ERROR");
		});

		it("should return 404 for non-existent project", async () => {
			const response = await request
				.get("/api/projects/550e8400-e29b-41d4-a716-446655440000")
				.set(getAuthHeaders())
				.expect(404);

			assertErrorResponse(response);
		});
	});

	describe("PUT /api/projects/:id/tech-stack", () => {
		it("should update project tech stack", async () => {
			const project = await createTestProject(testUser.user.id);

			const newTechStack = {
				language: "TypeScript",
				framework: "Vue",
				runtime: "Node.js",
			};

			const response = await request
				.put(`/api/projects/${project.id}/tech-stack`)
				.set(getAuthHeaders())
				.send(newTechStack)
				.expect(200);

			assertSuccessResponse(response);
			expect(response.body.data.project.targetTechStack).toMatchObject(
				newTechStack
			);
		});

		it("should validate tech stack format", async () => {
			const project = await createTestProject(testUser.user.id);

			const response = await request
				.put(`/api/projects/${project.id}/tech-stack`)
				.set(getAuthHeaders())
				.send({
					language: "", // Invalid: empty language
				})
				.expect(400);

			assertErrorResponse(response, "VALIDATION_ERROR");
		});
	});

	describe("POST /api/projects/:id/analyze", () => {
		it("should analyze project structure", async () => {
			const project = await createTestProject(testUser.user.id);

			const response = await request
				.post(`/api/projects/${project.id}/analyze`)
				.set(getAuthHeaders())
				.expect(200);

			assertSuccessResponse(response);
			expect(response.body.data.analysis).toHaveProperty("techStack");
			expect(response.body.data.analysis).toHaveProperty("architecture");
			expect(response.body.data.analysis).toHaveProperty("dependencies");
		});
	});

	describe("GET /api/projects/:id/files", () => {
		it("should return project files", async () => {
			const project = await createTestProject(testUser.user.id);

			const response = await request
				.get(`/api/projects/${project.id}/files`)
				.set(getAuthHeaders())
				.expect(200);

			assertSuccessResponse(response);
			expect(response.body.data).toHaveProperty("files");
			expect(Array.isArray(response.body.data.files)).toBe(true);
		});

		it("should filter files by path", async () => {
			const project = await createTestProject(testUser.user.id);

			const response = await request
				.get(`/api/projects/${project.id}/files`)
				.set(getAuthHeaders())
				.query({ path: "/src" })
				.expect(200);

			assertSuccessResponse(response);
		});
	});

	describe("GET /api/projects/:id/files/content", () => {
		it("should return file content", async () => {
			const project = await createTestProject(testUser.user.id);

			const response = await request
				.get(`/api/projects/${project.id}/files/content`)
				.set(getAuthHeaders())
				.query({ filePath: "/package.json" })
				.expect(200);

			assertSuccessResponse(response);
			expect(response.body.data).toHaveProperty("filePath");
			expect(response.body.data).toHaveProperty("content");
		});

		it("should require file path parameter", async () => {
			const project = await createTestProject(testUser.user.id);

			const response = await request
				.get(`/api/projects/${project.id}/files/content`)
				.set(getAuthHeaders())
				.expect(400);

			assertErrorResponse(response, "MISSING_FILE_PATH");
		});
	});

	describe("DELETE /api/projects/:id", () => {
		it("should delete project", async () => {
			const project = await createTestProject(testUser.user.id);

			const response = await request
				.delete(`/api/projects/${project.id}`)
				.set(getAuthHeaders())
				.expect(200);

			assertSuccessResponse(response);
			expect(response.body.data.message).toBe("Project deleted successfully");
		});
	});

	describe("POST /api/projects/:id/conversion-plan", () => {
		it("should generate conversion plan", async () => {
			const project = await createTestProject(testUser.user.id);

			const targetTechStack = {
				language: "TypeScript",
				framework: "Vue",
				runtime: "Node.js",
			};

			const response = await request
				.post(`/api/projects/${project.id}/conversion-plan`)
				.set(getAuthHeaders())
				.send(targetTechStack)
				.expect(200);

			assertSuccessResponse(response);
			expect(response.body.data.plan).toHaveProperty("id");
			expect(response.body.data.plan).toHaveProperty("tasks");
			expect(response.body.data.plan).toHaveProperty("estimatedDuration");
			expect(response.body.data.plan).toHaveProperty("complexity");
		});

		it("should validate target tech stack", async () => {
			const project = await createTestProject(testUser.user.id);

			const response = await request
				.post(`/api/projects/${project.id}/conversion-plan`)
				.set(getAuthHeaders())
				.send({
					language: "", // Invalid
				})
				.expect(400);

			assertErrorResponse(response, "VALIDATION_ERROR");
		});
	});

	describe("Security", () => {
		it("should prevent access to other users projects", async () => {
			// Create project with different user
			const { createAdditionalTestUser } = await import("./setup");
			const otherUser = await createAdditionalTestUser({
				username: "otheruser",
			});
			const otherProject = await createTestProject(otherUser.user.id);

			const response = await request
				.get(`/api/projects/${otherProject.id}`)
				.set(getAuthHeaders()) // Using original test user token
				.expect(403);

			assertErrorResponse(response, "ACCESS_DENIED");
		});
	});
});
