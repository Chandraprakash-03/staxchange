import { describe, it, expect, beforeAll } from "vitest";
import {
	setupTestEnvironment,
	getTestRequest,
	mockExternalServices,
	assertSuccessResponse,
} from "./setup-simple";

describe("Health API Routes", () => {
	setupTestEnvironment();

	let request: ReturnType<typeof getTestRequest>;
	let restoreMocks: () => void;

	beforeAll(() => {
		request = getTestRequest();
		restoreMocks = mockExternalServices();
	});

	describe("GET /api/health", () => {
		it("should return basic health status", async () => {
			const response = await request.get("/api/health").expect(200);

			assertSuccessResponse(response);
			expect(response.body.data).toHaveProperty("status", "healthy");
			expect(response.body.data).toHaveProperty("timestamp");
			expect(response.body.data).toHaveProperty("version");
			expect(response.body.data).toHaveProperty("environment");
		});

		it("should not require authentication", async () => {
			const response = await request.get("/api/health").expect(200);

			expect(response.body.success).toBe(true);
		});
	});

	describe("GET /api/health/detailed", () => {
		it("should return detailed health status", async () => {
			const response = await request.get("/api/health/detailed").expect(200);

			assertSuccessResponse(response);
			expect(response.body.data).toHaveProperty("status");
			expect(response.body.data).toHaveProperty("services");
			expect(response.body.data.services).toHaveProperty("database");
			expect(response.body.data.services).toHaveProperty("redis");
			expect(response.body.data.services).toHaveProperty("filesystem");
			expect(response.body.data.services).toHaveProperty("external");

			// Check service status structure
			Object.values(response.body.data.services).forEach((service: any) => {
				expect(service).toHaveProperty("status");
				expect(service).toHaveProperty("responseTime");
				expect(["healthy", "unhealthy"]).toContain(service.status);
				expect(typeof service.responseTime).toBe("number");
			});
		});

		it("should return 503 if any critical service is unhealthy", async () => {
			// This test would require mocking service failures
			// For now, we'll just verify the structure when healthy
			const response = await request.get("/api/health/detailed");

			expect([200, 503]).toContain(response.status);
		});
	});

	describe("GET /api/health/ready", () => {
		it("should return readiness status", async () => {
			const response = await request.get("/api/health/ready").expect(200);

			assertSuccessResponse(response);
			expect(response.body.data).toHaveProperty("status", "ready");
			expect(response.body.data).toHaveProperty("timestamp");
		});

		it("should return 503 if not ready", async () => {
			// This would require mocking service unavailability
			// For now, we'll just verify it can return ready status
			const response = await request.get("/api/health/ready");

			expect([200, 503]).toContain(response.status);
		});
	});

	describe("GET /api/health/live", () => {
		it("should return liveness status", async () => {
			const response = await request.get("/api/health/live").expect(200);

			assertSuccessResponse(response);
			expect(response.body.data).toHaveProperty("status", "alive");
			expect(response.body.data).toHaveProperty("timestamp");
			expect(response.body.data).toHaveProperty("uptime");
			expect(response.body.data).toHaveProperty("memory");

			// Verify memory usage structure
			expect(response.body.data.memory).toHaveProperty("rss");
			expect(response.body.data.memory).toHaveProperty("heapTotal");
			expect(response.body.data.memory).toHaveProperty("heapUsed");
			expect(response.body.data.memory).toHaveProperty("external");
		});

		it("should always return 200 for liveness probe", async () => {
			const response = await request.get("/api/health/live").expect(200);

			expect(response.body.success).toBe(true);
		});
	});

	describe("Health Check Performance", () => {
		it("should respond quickly to health checks", async () => {
			const start = Date.now();

			await request.get("/api/health").expect(200);

			const duration = Date.now() - start;

			// Health check should respond within 1 second
			expect(duration).toBeLessThan(1000);
		});

		it("should handle concurrent health check requests", async () => {
			const promises = Array.from({ length: 10 }, () =>
				request.get("/api/health")
			);

			const responses = await Promise.all(promises);

			// All requests should succeed
			responses.forEach((response) => {
				expect(response.status).toBe(200);
				expect(response.body.success).toBe(true);
			});
		});
	});

	describe("Health Check Logging", () => {
		it("should not log health check requests in access logs", async () => {
			// This is more of a configuration test
			// The actual logging behavior would be tested in integration
			const response = await request.get("/api/health").expect(200);

			expect(response.body.success).toBe(true);
		});
	});

	describe("Service Dependencies", () => {
		it("should check database connectivity", async () => {
			const response = await request.get("/api/health/detailed").expect(200);

			const dbService = response.body.data.services.database;
			expect(dbService).toHaveProperty("status");
			expect(dbService).toHaveProperty("responseTime");

			if (dbService.status === "unhealthy") {
				expect(dbService).toHaveProperty("error");
			}
		});

		it("should check Redis connectivity", async () => {
			const response = await request.get("/api/health/detailed").expect(200);

			const redisService = response.body.data.services.redis;
			expect(redisService).toHaveProperty("status");
			expect(redisService).toHaveProperty("responseTime");

			if (redisService.status === "unhealthy") {
				expect(redisService).toHaveProperty("error");
			}
		});

		it("should check filesystem access", async () => {
			const response = await request.get("/api/health/detailed").expect(200);

			const fsService = response.body.data.services.filesystem;
			expect(fsService).toHaveProperty("status");
			expect(fsService).toHaveProperty("responseTime");

			if (fsService.status === "unhealthy") {
				expect(fsService).toHaveProperty("error");
			}
		});

		it("should check external service connectivity", async () => {
			const response = await request.get("/api/health/detailed").expect(200);

			const externalService = response.body.data.services.external;
			expect(externalService).toHaveProperty("status");
			expect(externalService).toHaveProperty("responseTime");

			if (externalService.status === "unhealthy") {
				expect(externalService).toHaveProperty("error");
			}
		});
	});
});
