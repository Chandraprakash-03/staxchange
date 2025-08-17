/**
 * Monitoring API Integration Tests
 * Tests for monitoring endpoints and health checks
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET as healthCheck } from "@/app/api/health/route";
import { GET as metricsEndpoint } from "@/app/api/monitoring/metrics/route";
import { GET as performanceEndpoint } from "@/app/api/monitoring/performance/route";

// Mock dependencies
vi.mock("@/lib/redis", () => ({
	redis: {
		ping: vi.fn().mockResolvedValue("PONG"),
		lpush: vi.fn().mockResolvedValue(1),
		expire: vi.fn().mockResolvedValue(1),
		keys: vi.fn().mockResolvedValue([]),
		lrange: vi.fn().mockResolvedValue([]),
		info: vi.fn().mockResolvedValue("used_memory:1000000"),
	},
}));

vi.mock("@/lib/prisma", () => ({
	prisma: {
		$queryRaw: vi.fn().mockResolvedValue([{ count: BigInt(5) }]),
		conversionJob: {
			count: vi.fn().mockResolvedValue(10),
			findMany: vi.fn().mockResolvedValue([
				{
					startedAt: new Date("2024-01-01T10:00:00Z"),
					completedAt: new Date("2024-01-01T10:05:00Z"),
				},
			]),
		},
		project: {
			findMany: vi
				.fn()
				.mockResolvedValue([
					{ targetTechStack: { framework: "React" } },
					{ targetTechStack: { framework: "Vue" } },
				]),
		},
	},
}));

describe("Health Check API", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("should return healthy status when all services are up", async () => {
		const request = new NextRequest("http://localhost:3000/api/health");
		const response = await healthCheck(request);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.status).toBe("healthy");
		expect(data).toHaveProperty("timestamp");
		expect(data).toHaveProperty("version");
		expect(data).toHaveProperty("uptime");
		expect(data).toHaveProperty("services");
		expect(data.services).toHaveProperty("database");
		expect(data.services).toHaveProperty("redis");
	});

	it("should include system metrics in health response", async () => {
		const request = new NextRequest("http://localhost:3000/api/health");
		const response = await healthCheck(request);
		const data = await response.json();

		expect(data).toHaveProperty("system");
		expect(data.system).toHaveProperty("cpu");
		expect(data.system).toHaveProperty("memory");
		expect(data.system).toHaveProperty("activeConnections");
		expect(data.system).toHaveProperty("requestsPerMinute");
		expect(data.system).toHaveProperty("errorRate");
	});

	it("should include conversion metrics in health response", async () => {
		const request = new NextRequest("http://localhost:3000/api/health");
		const response = await healthCheck(request);
		const data = await response.json();

		expect(data).toHaveProperty("conversions");
		expect(data.conversions).toHaveProperty("active");
		expect(data.conversions).toHaveProperty("total");
		expect(data.conversions).toHaveProperty("successRate");
		expect(data.conversions).toHaveProperty("averageTime");
	});

	it("should return unhealthy status when database is down", async () => {
		const { prisma } = await import("@/lib/prisma");
		vi.mocked(prisma.$queryRaw).mockRejectedValueOnce(
			new Error("Database connection failed")
		);

		const request = new NextRequest("http://localhost:3000/api/health");
		const response = await healthCheck(request);
		const data = await response.json();

		expect(response.status).toBe(503);
		expect(data.status).toBe("unhealthy");
		expect(data.services.database.status).toBe("unhealthy");
	});

	it("should return unhealthy status when redis is down", async () => {
		const { redis } = await import("@/lib/redis");
		vi.mocked(redis.ping).mockRejectedValueOnce(
			new Error("Redis connection failed")
		);

		const request = new NextRequest("http://localhost:3000/api/health");
		const response = await healthCheck(request);
		const data = await response.json();

		expect(response.status).toBe(503);
		expect(data.status).toBe("unhealthy");
		expect(data.services.redis.status).toBe("unhealthy");
	});

	it("should include request ID in response", async () => {
		const request = new NextRequest("http://localhost:3000/api/health", {
			headers: { "x-request-id": "test-request-123" },
		});
		const response = await healthCheck(request);
		const data = await response.json();

		expect(data.requestId).toBe("test-request-123");
	});

	it("should handle errors gracefully", async () => {
		// Mock a service to throw an unexpected error
		const { prisma } = await import("@/lib/prisma");
		vi.mocked(prisma.$queryRaw).mockImplementationOnce(() => {
			throw new Error("Unexpected error");
		});

		const request = new NextRequest("http://localhost:3000/api/health");
		const response = await healthCheck(request);
		const data = await response.json();

		expect(response.status).toBe(503);
		expect(data.status).toBe("unhealthy");
		expect(data).toHaveProperty("error");
	});
});

describe("Metrics API", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("should return current and historical metrics", async () => {
		const request = new NextRequest(
			"http://localhost:3000/api/monitoring/metrics"
		);
		const response = await metricsEndpoint(request);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data).toHaveProperty("current");
		expect(data).toHaveProperty("historical");
		expect(data).toHaveProperty("conversions");
		expect(data).toHaveProperty("summary");
	});

	it("should accept hours parameter for historical data", async () => {
		const request = new NextRequest(
			"http://localhost:3000/api/monitoring/metrics?hours=2"
		);
		const response = await metricsEndpoint(request);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.summary.timeRange).toBe("2h");
	});

	it("should include conversion metrics", async () => {
		const request = new NextRequest(
			"http://localhost:3000/api/monitoring/metrics"
		);
		const response = await metricsEndpoint(request);
		const data = await response.json();

		expect(data.conversions).toHaveProperty("totalConversions");
		expect(data.conversions).toHaveProperty("activeConversions");
		expect(data.conversions).toHaveProperty("completedConversions");
		expect(data.conversions).toHaveProperty("failedConversions");
		expect(typeof data.conversions.totalConversions).toBe("number");
	});

	it("should include summary statistics", async () => {
		const request = new NextRequest(
			"http://localhost:3000/api/monitoring/metrics"
		);
		const response = await metricsEndpoint(request);
		const data = await response.json();

		expect(data.summary).toHaveProperty("dataPoints");
		expect(data.summary).toHaveProperty("timeRange");
		expect(data.summary).toHaveProperty("avgCpuUsage");
		expect(data.summary).toHaveProperty("avgMemoryUsage");
		expect(data.summary).toHaveProperty("avgResponseTime");
	});

	it("should handle errors gracefully", async () => {
		// Mock monitoring service to throw error
		vi.doMock("@/services/monitoring", () => ({
			monitoringService: {
				getSystemMetrics: vi.fn().mockRejectedValue(new Error("Service error")),
				getMetricsHistory: vi
					.fn()
					.mockRejectedValue(new Error("Service error")),
				getConversionMetrics: vi
					.fn()
					.mockRejectedValue(new Error("Service error")),
			},
		}));

		const request = new NextRequest(
			"http://localhost:3000/api/monitoring/metrics"
		);
		const response = await metricsEndpoint(request);
		const data = await response.json();

		expect(response.status).toBe(500);
		expect(data).toHaveProperty("error");
	});
});

describe("Performance API", () => {
	beforeEach(async () => {
		vi.clearAllMocks();
		// Setup Redis mock data
		const { redis } = await import("@/lib/redis");
		vi.mocked(redis.keys).mockResolvedValue([
			"perf:test-operation:2024-01-01T10:00",
		]);
		vi.mocked(redis.lrange).mockResolvedValue([
			JSON.stringify({
				duration: 1500,
				timestamp: Date.now(),
				metadata: { success: true },
			}),
			JSON.stringify({
				duration: 800,
				timestamp: Date.now(),
				metadata: { success: true },
			}),
		]);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("should return performance data for all operations", async () => {
		const request = new NextRequest(
			"http://localhost:3000/api/monitoring/performance"
		);
		const response = await performanceEndpoint(request);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data).toHaveProperty("performance");
		expect(data).toHaveProperty("slowOperations");
		expect(data).toHaveProperty("errorRates");
		expect(data).toHaveProperty("summary");
		expect(Array.isArray(data.performance)).toBe(true);
	});

	it("should filter by operation when specified", async () => {
		const request = new NextRequest(
			"http://localhost:3000/api/monitoring/performance?operation=test-operation"
		);
		const response = await performanceEndpoint(request);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.operation).toBe("test-operation");
	});

	it("should accept minutes parameter for time range", async () => {
		const request = new NextRequest(
			"http://localhost:3000/api/monitoring/performance?minutes=30"
		);
		const response = await performanceEndpoint(request);
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.timeRange).toBe("30m");
	});

	it("should include performance summary statistics", async () => {
		const request = new NextRequest(
			"http://localhost:3000/api/monitoring/performance"
		);
		const response = await performanceEndpoint(request);
		const data = await response.json();

		expect(data.summary).toHaveProperty("totalOperations");
		expect(data.summary).toHaveProperty("averageDuration");
		expect(data.summary).toHaveProperty("p95Duration");
		expect(data.summary).toHaveProperty("p99Duration");
		expect(data.summary).toHaveProperty("errorRate");
		expect(typeof data.summary.totalOperations).toBe("number");
		expect(typeof data.summary.averageDuration).toBe("number");
	});

	it("should identify slow operations", async () => {
		const request = new NextRequest(
			"http://localhost:3000/api/monitoring/performance"
		);
		const response = await performanceEndpoint(request);
		const data = await response.json();

		expect(Array.isArray(data.slowOperations)).toBe(true);
		// Should be empty since our mock data doesn't have operations > 5000ms
		expect(data.slowOperations.length).toBe(0);
	});

	it("should calculate error rates", async () => {
		const request = new NextRequest(
			"http://localhost:3000/api/monitoring/performance"
		);
		const response = await performanceEndpoint(request);
		const data = await response.json();

		expect(data.errorRates).toHaveProperty("overall");
		expect(data.errorRates).toHaveProperty("byOperation");
		expect(data.errorRates).toHaveProperty("byHour");
		expect(typeof data.errorRates.overall).toBe("number");
	});

	it("should handle Redis errors gracefully", async () => {
		const { redis } = await import("@/lib/redis");
		vi.mocked(redis.keys).mockRejectedValueOnce(new Error("Redis error"));

		const request = new NextRequest(
			"http://localhost:3000/api/monitoring/performance"
		);
		const response = await performanceEndpoint(request);
		const data = await response.json();

		expect(response.status).toBe(500);
		expect(data).toHaveProperty("error");
	});
});
