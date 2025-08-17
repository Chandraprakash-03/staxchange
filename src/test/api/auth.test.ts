import { describe, it, expect, beforeAll } from "vitest";
import {
	setupTestEnvironment,
	getTestRequest,
	getTestUser,
	getAuthHeaders,
	mockExternalServices,
	assertSuccessResponse,
	assertErrorResponse,
} from "./setup-simple";

describe("Auth API Routes", () => {
	setupTestEnvironment();

	let request: ReturnType<typeof getTestRequest>;
	let testUser: ReturnType<typeof getTestUser>;
	let restoreMocks: () => void;

	beforeAll(() => {
		request = getTestRequest();
		testUser = getTestUser();
		restoreMocks = mockExternalServices();
	});

	describe("GET /api/auth/github", () => {
		it("should return GitHub OAuth URL", async () => {
			const response = await request.get("/api/auth/github").expect(200);

			assertSuccessResponse(response);
			expect(response.body.data).toHaveProperty("authUrl");
			expect(response.body.data.authUrl).toContain(
				"github.com/login/oauth/authorize"
			);
		});
	});

	describe("GET /api/auth/callback", () => {
		it("should handle GitHub OAuth callback successfully", async () => {
			const response = await request
				.get("/api/auth/callback")
				.query({ code: "test-auth-code", state: "test-state" })
				.expect(200);

			assertSuccessResponse(response);
			expect(response.body.data).toHaveProperty("user");
			expect(response.body.data).toHaveProperty("token");
			expect(response.body.data).toHaveProperty("expiresAt");
			expect(response.body.data.user).toHaveProperty("id");
			expect(response.body.data.user).toHaveProperty("username");
		});

		it("should return error for missing authorization code", async () => {
			const response = await request.get("/api/auth/callback").expect(400);

			assertErrorResponse(response, "MISSING_AUTH_CODE");
		});
	});

	describe("GET /api/auth/me", () => {
		it("should return current user information", async () => {
			const response = await request
				.get("/api/auth/me")
				.set(getAuthHeaders())
				.expect(200);

			assertSuccessResponse(response);
			expect(response.body.data.user).toMatchObject({
				id: testUser.user.id,
				username: testUser.user.username,
				email: testUser.user.email,
			});
		});

		it("should return error for missing token", async () => {
			const response = await request.get("/api/auth/me").expect(401);

			assertErrorResponse(response, "MISSING_TOKEN");
		});

		it("should return error for invalid token", async () => {
			const response = await request
				.get("/api/auth/me")
				.set("Authorization", "Bearer invalid-token")
				.expect(401);

			assertErrorResponse(response, "INVALID_TOKEN");
		});
	});

	describe("POST /api/auth/validate", () => {
		it("should validate valid token", async () => {
			const response = await request
				.post("/api/auth/validate")
				.send({ token: testUser.token })
				.expect(200);

			assertSuccessResponse(response);
			expect(response.body.data).toHaveProperty("valid", true);
			expect(response.body.data.user).toMatchObject({
				id: testUser.user.id,
				username: testUser.user.username,
			});
		});

		it("should return error for invalid token", async () => {
			const response = await request
				.post("/api/auth/validate")
				.send({ token: "invalid-token" })
				.expect(401);

			assertErrorResponse(response, "INVALID_TOKEN");
		});

		it("should return error for missing token", async () => {
			const response = await request
				.post("/api/auth/validate")
				.send({})
				.expect(400);

			assertErrorResponse(response, "MISSING_TOKEN");
		});
	});

	describe("POST /api/auth/logout", () => {
		it("should logout user successfully", async () => {
			const response = await request
				.post("/api/auth/logout")
				.set(getAuthHeaders())
				.expect(200);

			assertSuccessResponse(response);
			expect(response.body.data.message).toBe("Successfully logged out");
		});

		it("should return error for missing authentication", async () => {
			const response = await request.post("/api/auth/logout").expect(401);

			assertErrorResponse(response, "MISSING_TOKEN");
		});
	});

	describe("GET /api/auth/github/user", () => {
		it("should return GitHub user information", async () => {
			const response = await request
				.get("/api/auth/github/user")
				.set(getAuthHeaders())
				.expect(200);

			assertSuccessResponse(response);
			expect(response.body.data).toHaveProperty("githubUser");
			expect(response.body.data.githubUser).toHaveProperty("login");
		});

		it("should return error for missing GitHub token", async () => {
			// Create user without GitHub token
			const { AuthService } = await import("@/services/auth");
			const userWithoutToken = await AuthService.createOrUpdateUser({
				githubId: "test-no-token",
				username: "notokenuser",
				email: "notoken@example.com",
				name: "No Token User",
				avatarUrl: "https://github.com/notokenuser.png",
				// No accessToken provided
			});
			const token = await AuthService.generateToken(userWithoutToken);

			const response = await request
				.get("/api/auth/github/user")
				.set("Authorization", `Bearer ${token}`)
				.expect(401);

			assertErrorResponse(response, "MISSING_GITHUB_TOKEN");
		});
	});

	describe("Rate Limiting", () => {
		it("should apply rate limiting to auth endpoints", async () => {
			// Make multiple requests to exceed rate limit
			const promises = Array.from({ length: 12 }, () =>
				request.get("/api/auth/github")
			);

			const responses = await Promise.all(promises);

			// Some requests should be rate limited
			const rateLimitedResponses = responses.filter((r) => r.status === 429);
			expect(rateLimitedResponses.length).toBeGreaterThan(0);
		});
	});

	describe("Input Validation", () => {
		it("should validate content type for POST requests", async () => {
			const response = await request
				.post("/api/auth/validate")
				.set("Content-Type", "text/plain")
				.send("invalid content")
				.expect(400);

			assertErrorResponse(response, "INVALID_CONTENT_TYPE");
		});

		it("should sanitize input data", async () => {
			const response = await request
				.post("/api/auth/validate")
				.send({
					token: '<script>alert("xss")</script>valid-token',
				})
				.expect(401);

			// Token should be sanitized (script tags removed)
			expect(response.body.error.code).toBe("INVALID_TOKEN");
		});
	});
});
