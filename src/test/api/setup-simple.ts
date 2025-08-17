import { beforeAll, afterAll, beforeEach, afterEach, expect } from "vitest";
import { Express } from "express";
import supertest from "supertest";

// Test application instance
let app: Express;
let request: supertest.SuperTest<supertest.Test>;

// Mock user data for testing
export interface TestUser {
	user: {
		id: string;
		githubId: string;
		username: string;
		email: string;
		name: string;
		avatarUrl: string;
		createdAt: Date;
		updatedAt: Date;
	};
	token: string;
}

let testUser: TestUser;

/**
 * Setup test environment
 */
export const setupTestEnvironment = () => {
	beforeAll(async () => {
		// Create Express app with basic middleware
		const express = await import("express");
		app = express.default();

		// Parse JSON bodies
		app.use(express.json({ limit: "10mb" }));
		app.use(express.urlencoded({ extended: true }));

		// Add basic middleware
		app.use((req, res, next) => {
			req.ip = "127.0.0.1";
			next();
		});

		// Create mock API routes for testing
		createMockApiRoutes(app);

		// Create supertest instance
		request = supertest(app);

		// Create test user
		testUser = createMockTestUser();
	});

	afterAll(async () => {
		// Cleanup if needed
	});

	beforeEach(async () => {
		// Reset any test state
	});

	afterEach(async () => {
		// Cleanup test-specific data
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
 * Create mock test user
 */
function createMockTestUser(): TestUser {
	return {
		user: {
			id: "test-user-id",
			githubId: "test-github-id",
			username: "testuser",
			email: "test@example.com",
			name: "Test User",
			avatarUrl: "https://github.com/testuser.png",
			createdAt: new Date(),
			updatedAt: new Date(),
		},
		token: "mock-jwt-token",
	};
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
	return {
		user: {
			id: "test-user-id-2",
			githubId: overrides.githubId || "test-github-id-2",
			username: overrides.username || "testuser2",
			email: overrides.email || "test2@example.com",
			name: overrides.name || "Test User 2",
			avatarUrl: "https://github.com/testuser2.png",
			createdAt: new Date(),
			updatedAt: new Date(),
		},
		token: "mock-jwt-token-2",
	};
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
	return {
		id: "test-project-id",
		name: overrides?.name || "Test Project",
		githubUrl: overrides?.githubUrl || "https://github.com/testuser/test-repo",
		userId,
		originalTechStack: overrides?.originalTechStack || {
			language: "JavaScript",
			framework: "React",
			runtime: "Node.js",
		},
		targetTechStack: overrides?.targetTechStack,
		status: "imported",
		createdAt: new Date(),
		updatedAt: new Date(),
	};
}

/**
 * Create test conversion job
 */
export async function createTestConversionJob(
	projectId: string,
	userId: string
) {
	return {
		id: "test-conversion-job-id",
		projectId,
		userId,
		status: "pending",
		progress: 0,
		targetTechStack: {
			language: "TypeScript",
			framework: "Vue",
			runtime: "Node.js",
		},
		createdAt: new Date(),
		updatedAt: new Date(),
	};
}

/**
 * Mock external services
 */
export function mockExternalServices() {
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
 * Create mock API routes for testing
 */
function createMockApiRoutes(app: Express) {
	// Health routes
	app.get("/api/health", (req, res) => {
		res.json({
			success: true,
			data: {
				status: "healthy",
				timestamp: new Date().toISOString(),
				version: "1.0.0",
				environment: "test",
			},
		});
	});

	app.get("/api/health/detailed", (req, res) => {
		res.json({
			success: true,
			data: {
				status: "healthy",
				timestamp: new Date().toISOString(),
				version: "1.0.0",
				environment: "test",
				services: {
					database: { status: "healthy", responseTime: 10 },
					redis: { status: "healthy", responseTime: 5 },
					filesystem: { status: "healthy", responseTime: 2 },
					external: { status: "healthy", responseTime: 100 },
				},
			},
		});
	});

	app.get("/api/health/ready", (req, res) => {
		res.json({
			success: true,
			data: {
				status: "ready",
				timestamp: new Date().toISOString(),
			},
		});
	});

	app.get("/api/health/live", (req, res) => {
		res.json({
			success: true,
			data: {
				status: "alive",
				timestamp: new Date().toISOString(),
				uptime: process.uptime(),
				memory: process.memoryUsage(),
			},
		});
	});

	// Auth routes
	app.get("/api/auth/github", (req, res) => {
		res.json({
			success: true,
			data: {
				authUrl:
					"https://github.com/login/oauth/authorize?client_id=test&redirect_uri=test",
			},
		});
	});

	app.get("/api/auth/callback", (req, res) => {
		const { code } = req.query;
		if (!code) {
			return res.status(400).json({
				success: false,
				error: {
					code: "MISSING_AUTH_CODE",
					message: "Authorization code is required",
					userMessage: "Authentication failed. Please try again.",
				},
			});
		}

		res.json({
			success: true,
			data: {
				user: testUser.user,
				token: testUser.token,
				expiresAt: new Date(Date.now() + 3600000).toISOString(),
			},
		});
	});

	app.get("/api/auth/me", (req, res) => {
		const authHeader = req.headers.authorization;
		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			return res.status(401).json({
				success: false,
				error: {
					code: "MISSING_TOKEN",
					message: "Access token required",
					userMessage: "Authentication required.",
				},
			});
		}

		const token = authHeader.split(" ")[1];
		if (token !== testUser.token) {
			return res.status(401).json({
				success: false,
				error: {
					code: "INVALID_TOKEN",
					message: "Invalid or expired token",
					userMessage: "Please log in again.",
				},
			});
		}

		res.json({
			success: true,
			data: {
				user: testUser.user,
			},
		});
	});

	app.post("/api/auth/validate", (req, res) => {
		const { token } = req.body;
		if (!token) {
			return res.status(400).json({
				success: false,
				error: {
					code: "MISSING_TOKEN",
					message: "Token is required",
					userMessage: "Please provide a valid token.",
				},
			});
		}

		if (token !== testUser.token) {
			return res.status(401).json({
				success: false,
				error: {
					code: "INVALID_TOKEN",
					message: "Token is invalid or expired",
					userMessage: "Please log in again.",
				},
			});
		}

		res.json({
			success: true,
			data: {
				valid: true,
				user: testUser.user,
			},
		});
	});

	app.post("/api/auth/logout", (req, res) => {
		const authHeader = req.headers.authorization;
		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			return res.status(401).json({
				success: false,
				error: {
					code: "MISSING_TOKEN",
					message: "Access token required",
					userMessage: "Authentication required.",
				},
			});
		}

		res.json({
			success: true,
			data: {
				message: "Successfully logged out",
			},
		});
	});

	app.get("/api/auth/github/user", (req, res) => {
		const authHeader = req.headers.authorization;
		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			return res.status(401).json({
				success: false,
				error: {
					code: "MISSING_TOKEN",
					message: "Access token required",
					userMessage: "Authentication required.",
				},
			});
		}

		res.json({
			success: true,
			data: {
				githubUser: {
					id: "test-github-id",
					login: "testuser",
					email: "test@example.com",
					name: "Test User",
					avatar_url: "https://github.com/testuser.png",
				},
			},
		});
	});

	// Projects routes (basic mocks)
	app.post("/api/projects/import", (req, res) => {
		const authHeader = req.headers.authorization;
		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			return res.status(401).json({
				success: false,
				error: {
					code: "MISSING_TOKEN",
					message: "Access token required",
					userMessage: "Authentication required.",
				},
			});
		}

		const { url } = req.body;
		if (!url || !url.includes("github.com")) {
			return res.status(400).json({
				success: false,
				error: {
					code: "VALIDATION_ERROR",
					message: "Invalid GitHub URL",
					userMessage: "Please provide a valid GitHub URL.",
				},
			});
		}

		res.status(201).json({
			success: true,
			data: {
				project: {
					id: "test-project-id",
					name: "test-repo",
					githubUrl: url,
					status: "imported",
					detectedTechnologies: { language: "JavaScript", framework: "React" },
					size: 1024,
					createdAt: new Date().toISOString(),
				},
			},
		});
	});

	// Add rate limiting simulation
	let requestCounts = new Map<string, { count: number; resetTime: number }>();

	app.use((req, res, next) => {
		const ip = req.ip;
		const now = Date.now();
		const windowMs = 15 * 60 * 1000; // 15 minutes
		const maxRequests = req.path.includes("/auth") ? 10 : 100;

		if (!requestCounts.has(ip)) {
			requestCounts.set(ip, { count: 1, resetTime: now + windowMs });
		} else {
			const data = requestCounts.get(ip)!;
			if (now > data.resetTime) {
				data.count = 1;
				data.resetTime = now + windowMs;
			} else {
				data.count++;
				if (data.count > maxRequests) {
					return res.status(429).json({
						success: false,
						error: {
							code: "RATE_LIMIT_EXCEEDED",
							message: "Too many requests",
							userMessage: "Too many requests. Please try again later.",
						},
					});
				}
			}
		}

		next();
	});
}

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
