import { beforeAll, afterAll, beforeEach, afterEach, expect } from "vitest";
import { Express } from "express";
import supertest from "supertest";
import { createApiRouter } from "@/app/api/router";
import { DatabaseService } from "@/services/database";
import { RedisService } from "@/services/redis";
import { AuthService } from "@/services/auth";
import { User } from "@/generated/prisma";
import TestAgent from "supertest/lib/agent";

// Test application instance
let app: Express;
// let request: supertest.SuperTest<supertest.Test>;
let request: TestAgent;

// Test user data
export interface TestUser {
	user: User;
	token: string;
}

let testUser: TestUser;

/**
 * Setup test environment
 */
export const setupTestEnvironment = () => {
	beforeAll(async () => {
		// Initialize test database
		await DatabaseService.initialize();
		await DatabaseService.migrate();

		// Initialize Redis
		await RedisService.initialize();

		// Create Express app with API routes
		const express = await import("express");
		app = express.default();

		// Parse JSON bodies
		app.use(express.json({ limit: "10mb" }));
		app.use(express.urlencoded({ extended: true }));

		// Mount API routes
		const apiRouter = createApiRouter();
		app.use("/api", apiRouter);

		// Create supertest instance
		request = supertest.agent(app);

		// Create test user
		testUser = await createTestUser();
	});

	afterAll(async () => {
		// Cleanup test data
		await cleanupTestData();

		// Close connections
		await DatabaseService.close();
		await RedisService.close();
	});

	beforeEach(async () => {
		// Clear Redis cache before each test
		await RedisService.flushAll();
	});

	afterEach(async () => {
		// Cleanup any test-specific data
		await cleanupTestSpecificData();
	});
};

/**
 * Get test request instance
 */
export const getTestRequest = () => {
	if (!request) {
		throw new Error(
			"Test environment not initialized. Call setupTestEnvironment() first."
		);
	}
	return request;
};

/**
 * Get test user
 */
export const getTestUser = (): TestUser => {
	if (!testUser) {
		throw new Error(
			"Test user not created. Call setupTestEnvironment() first."
		);
	}
	return testUser;
};

/**
 * Create authenticated request headers
 */
export const getAuthHeaders = (token?: string): Record<string, string> => {
	const authToken = token || testUser.token;
	return {
		Authorization: `Bearer ${authToken}`,
		"Content-Type": "application/json",
	};
};

/**
 * Create test user
 */
async function createTestUser(): Promise<TestUser> {
	const userData = {
		githubId: "test-github-id",
		username: "testuser",
		email: "test@example.com",
		name: "Test User",
		avatarUrl: "https://github.com/testuser.png",
		accessToken: "test-github-token",
	};

	const user = await AuthService.createOrUpdateUser(userData);
	const token = await AuthService.generateToken(user);

	return { user, token };
}

/**
 * Create additional test user
 */
export async function createAdditionalTestUser(
	overrides: Partial<{
		githubId: string;
		username: string;
		email: string;
		name: string;
	}>
): Promise<TestUser> {
	const userData = {
		githubId: overrides.githubId || "test-github-id-2",
		username: overrides.username || "testuser2",
		email: overrides.email || "test2@example.com",
		name: overrides.name || "Test User 2",
		avatarUrl: "https://github.com/testuser2.png",
		accessToken: "test-github-token-2",
	};

	const user = await AuthService.createOrUpdateUser(userData);
	const token = await AuthService.generateToken(user);

	return { user, token };
}

/**
 * Create test project
 */
export async function createTestProject(
	userId: string,
	overrides?: Partial<{
		name: string;
		githubUrl: string;
		originalTechStack: any;
		targetTechStack: any;
	}>
) {
	const { ProjectService } = await import("@/services/project");

	return await ProjectService.createProject({
		name: overrides?.name || "Test Project",
		githubUrl: overrides?.githubUrl || "https://github.com/testuser/test-repo",
		userId,
		originalTechStack: overrides?.originalTechStack || {
			language: "JavaScript",
			framework: "React",
			runtime: "Node.js",
		},
		targetTechStack: overrides?.targetTechStack,
	});
}

/**
 * Create test conversion job
 */
export async function createTestConversionJob(
	projectId: string,
	userId: string
) {
	const { ConversionJobService } = await import("@/services/conversionJob");

	return await ConversionJobService.createJob({
		projectId,
		userId,
		targetTechStack: {
			language: "TypeScript",
			framework: "Vue",
			runtime: "Node.js",
		},
		options: {},
	});
}

/**
 * Mock external services
 */
export function mockExternalServices() {
	// Mock GitHub API
	const originalFetch = global.fetch;

	global.fetch = async (url: string | URL | Request, init?: RequestInit) => {
		const urlString = url.toString();

		// Mock GitHub API responses
		if (urlString.includes("api.github.com")) {
			if (urlString.includes("/rate_limit")) {
				return new Response(
					JSON.stringify({
						rate: { limit: 5000, remaining: 4999, reset: Date.now() + 3600000 },
					}),
					{ status: 200 }
				);
			}

			if (urlString.includes("/user")) {
				return new Response(
					JSON.stringify({
						id: "test-github-id",
						login: "testuser",
						email: "test@example.com",
						name: "Test User",
						avatar_url: "https://github.com/testuser.png",
					}),
					{ status: 200 }
				);
			}

			if (urlString.includes("/repos/")) {
				return new Response(
					JSON.stringify({
						id: 123,
						name: "test-repo",
						full_name: "testuser/test-repo",
						private: false,
						size: 1024,
						language: "JavaScript",
					}),
					{ status: 200 }
				);
			}
		}

		// Mock OpenRouter API responses
		if (urlString.includes("openrouter.ai")) {
			return new Response(
				JSON.stringify({
					choices: [
						{
							message: {
								content: "Mock AI response for code conversion",
							},
						},
					],
				}),
				{ status: 200 }
			);
		}

		// Fall back to original fetch for other requests
		return originalFetch(url, init);
	};

	return () => {
		global.fetch = originalFetch;
	};
}

/**
 * Cleanup test data
 */
async function cleanupTestData() {
	try {
		// Delete test users and related data
		await DatabaseService.query(
			"DELETE FROM conversion_jobs WHERE user_id = $1",
			[testUser.user.id]
		);
		await DatabaseService.query("DELETE FROM projects WHERE user_id = $1", [
			testUser.user.id,
		]);
		await DatabaseService.query("DELETE FROM users WHERE id = $1", [
			testUser.user.id,
		]);
	} catch (error) {
		console.warn("Error cleaning up test data:", error);
	}
}

/**
 * Cleanup test-specific data (called after each test)
 */
async function cleanupTestSpecificData() {
	try {
		// Clean up any temporary data created during tests
		await DatabaseService.query(
			"DELETE FROM conversion_jobs WHERE project_id IN (SELECT id FROM projects WHERE user_id = $1)",
			[testUser.user.id]
		);
		await DatabaseService.query(
			"DELETE FROM projects WHERE user_id = $1 AND name LIKE $2",
			[testUser.user.id, "Test Project%"]
		);
	} catch (error) {
		console.warn("Error cleaning up test-specific data:", error);
	}
}

/**
 * Wait for async operations to complete
 */
export const waitFor = (ms: number) =>
	new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Assert response structure
 */
export function assertSuccessResponse(response: any, expectedData?: any) {
	expect(response.body).toHaveProperty("success", true);
	expect(response.body).toHaveProperty("data");

	if (expectedData) {
		expect(response.body.data).toMatchObject(expectedData);
	}
}

/**
 * Assert error response structure
 */
export function assertErrorResponse(response: any, expectedCode?: string) {
	expect(response.body).toHaveProperty("success", false);
	expect(response.body).toHaveProperty("error");
	expect(response.body.error).toHaveProperty("code");
	expect(response.body.error).toHaveProperty("message");
	expect(response.body.error).toHaveProperty("userMessage");

	if (expectedCode) {
		expect(response.body.error.code).toBe(expectedCode);
	}
}
