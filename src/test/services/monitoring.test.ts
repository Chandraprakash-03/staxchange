/**
 * Monitoring Service Tests
 * Tests for the monitoring service functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { monitoringService } from "@/services/monitoring";
import { logger, performanceMonitor } from "@/utils/logger";

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
			count: vi
				.fn()
				.mockResolvedValueOnce(10) // totalConversions
				.mockResolvedValueOnce(2) // activeConversions
				.mockResolvedValueOnce(7) // completedConversions
				.mockResolvedValueOnce(1), // failedConversions
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

describe("MonitoringService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Reset global metrics
		if (typeof globalThis !== "undefined") {
			globalThis.logMetrics = {
				counts: { info: 0, warn: 0, error: 0, debug: 0 },
				performance: [],
				errors: [],
			};
		}
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("getSystemMetrics", () => {
		it("should return current system metrics", async () => {
			const metrics = await monitoringService.getSystemMetrics();

			expect(metrics).toHaveProperty("timestamp");
			expect(metrics).toHaveProperty("cpu");
			expect(metrics).toHaveProperty("memory");
			expect(metrics).toHaveProperty("uptime");
			expect(metrics.cpu).toHaveProperty("usage");
			expect(metrics.memory).toHaveProperty("percentage");
			expect(typeof metrics.uptime).toBe("number");
		});

		it("should include performance metrics", async () => {
			const metrics = await monitoringService.getSystemMetrics();

			expect(metrics).toHaveProperty("requestsPerMinute");
			expect(metrics).toHaveProperty("errorRate");
			expect(metrics).toHaveProperty("responseTime");
			expect(metrics.responseTime).toHaveProperty("avg");
			expect(metrics.responseTime).toHaveProperty("p95");
			expect(metrics.responseTime).toHaveProperty("p99");
		});
	});

	describe("getServicesHealth", () => {
		it("should check health of all services", async () => {
			const servicesHealth = await monitoringService.getServicesHealth();

			expect(Array.isArray(servicesHealth)).toBe(true);
			expect(servicesHealth.length).toBeGreaterThan(0);

			servicesHealth.forEach((service) => {
				expect(service).toHaveProperty("name");
				expect(service).toHaveProperty("status");
				expect(service).toHaveProperty("lastCheck");
				expect(service).toHaveProperty("responseTime");
				expect(["healthy", "degraded", "unhealthy"]).toContain(service.status);
			});
		});

		it("should include database health check", async () => {
			const servicesHealth = await monitoringService.getServicesHealth();
			const dbHealth = servicesHealth.find((s) => s.name === "database");

			expect(dbHealth).toBeDefined();
			expect(dbHealth?.status).toBe("healthy");
		});

		it("should include redis health check", async () => {
			// Ensure Redis mock returns PONG
			const { redis } = await import("@/lib/redis");
			vi.mocked(redis.ping).mockResolvedValueOnce("PONG");
			vi.mocked(redis.info).mockResolvedValueOnce("used_memory:1000000");

			const servicesHealth = await monitoringService.getServicesHealth();
			const redisHealth = servicesHealth.find((s) => s.name === "redis");

			expect(redisHealth).toBeDefined();
			expect(redisHealth?.status).toBe("healthy");
		});
	});

	describe("getConversionMetrics", () => {
		it("should return conversion statistics", async () => {
			// Reset the mock to return specific values for each call
			const { prisma } = await import("@/lib/prisma");
			vi.mocked(prisma.conversionJob.count)
				.mockResolvedValueOnce(10) // totalConversions
				.mockResolvedValueOnce(2) // activeConversions
				.mockResolvedValueOnce(7) // completedConversions
				.mockResolvedValueOnce(1); // failedConversions

			const conversionMetrics = await monitoringService.getConversionMetrics();

			expect(conversionMetrics).toHaveProperty("totalConversions");
			expect(conversionMetrics).toHaveProperty("activeConversions");
			expect(conversionMetrics).toHaveProperty("completedConversions");
			expect(conversionMetrics).toHaveProperty("failedConversions");
			expect(conversionMetrics).toHaveProperty("averageConversionTime");
			expect(conversionMetrics).toHaveProperty("conversionsByTechStack");
			expect(conversionMetrics).toHaveProperty("errorsByType");

			expect(typeof conversionMetrics.totalConversions).toBe("number");
			expect(typeof conversionMetrics.averageConversionTime).toBe("number");
			expect(typeof conversionMetrics.conversionsByTechStack).toBe("object");
		});
	});

	describe("recordPerformanceEvent", () => {
		it("should record performance events", () => {
			const operation = "test-operation";
			const duration = 1500;
			const metadata = { userId: "test-user" };

			expect(() => {
				monitoringService.recordPerformanceEvent(operation, duration, metadata);
			}).not.toThrow();
		});
	});

	describe("recordError", () => {
		it("should record error events", () => {
			const error = new Error("Test error");
			const context = { requestId: "test-request" };

			expect(() => {
				monitoringService.recordError(error, context);
			}).not.toThrow();
		});
	});

	describe("getMetricsHistory", () => {
		it("should return historical metrics for specified time range", async () => {
			// First generate some metrics
			await monitoringService.getSystemMetrics();
			await monitoringService.getSystemMetrics();

			const history = monitoringService.getMetricsHistory(1);

			expect(Array.isArray(history)).toBe(true);
			history.forEach((metric) => {
				expect(metric).toHaveProperty("timestamp");
				expect(metric).toHaveProperty("cpu");
				expect(metric).toHaveProperty("memory");
			});
		});

		it("should filter metrics by time range", async () => {
			const history = monitoringService.getMetricsHistory(0.1); // 6 minutes
			const now = new Date();
			const cutoff = new Date(now.getTime() - 0.1 * 60 * 60 * 1000);

			history.forEach((metric) => {
				expect(new Date(metric.timestamp).getTime()).toBeGreaterThan(
					cutoff.getTime()
				);
			});
		});
	});
});

describe("Logger", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("structured logging", () => {
		it("should log with metadata", () => {
			const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

			logger.info("Test message", { userId: "test-user", operation: "test" });

			expect(consoleSpy).toHaveBeenCalled();
			consoleSpy.mockRestore();
		});

		it("should log errors with error objects", () => {
			const consoleSpy = vi
				.spyOn(console, "error")
				.mockImplementation(() => {});
			const error = new Error("Test error");

			logger.error("Error occurred", { error, context: "test" });

			expect(consoleSpy).toHaveBeenCalled();
			consoleSpy.mockRestore();
		});

		it("should log performance events", () => {
			const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

			logger.performance("test-operation", 1500, { success: true });

			expect(consoleSpy).toHaveBeenCalled();
			consoleSpy.mockRestore();
		});

		it("should log audit events", () => {
			const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

			logger.audit("user-login", { userId: "test-user" });

			expect(consoleSpy).toHaveBeenCalled();
			consoleSpy.mockRestore();
		});
	});
});

describe("PerformanceMonitor", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("start/end monitoring", () => {
		it("should track operation duration", () => {
			const operation = "test-operation";

			performanceMonitor.start(operation);

			// Simulate some work
			const duration = performanceMonitor.end(operation);

			expect(typeof duration).toBe("number");
			expect(duration).toBeGreaterThanOrEqual(0);
		});

		it("should handle missing start time gracefully", () => {
			const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

			const duration = performanceMonitor.end("non-existent-operation");

			expect(duration).toBe(0);
			expect(consoleSpy).toHaveBeenCalled();
			consoleSpy.mockRestore();
		});
	});

	describe("measure function", () => {
		it("should measure synchronous function execution", () => {
			const testFn = () => {
				return "test result";
			};

			const result = performanceMonitor.measure("sync-test", testFn);

			expect(result).toBe("test result");
		});

		it("should measure asynchronous function execution", async () => {
			const testFn = async () => {
				await new Promise((resolve) => setTimeout(resolve, 10));
				return "async result";
			};

			const result = await performanceMonitor.measure("async-test", testFn);

			expect(result).toBe("async result");
		});

		it("should handle synchronous function errors", () => {
			const testFn = () => {
				throw new Error("Test error");
			};

			expect(() => {
				performanceMonitor.measure("error-test", testFn);
			}).toThrow("Test error");
		});

		it("should handle asynchronous function errors", async () => {
			const testFn = async () => {
				throw new Error("Async test error");
			};

			await expect(
				performanceMonitor.measure("async-error-test", testFn)
			).rejects.toThrow("Async test error");
		});
	});
});
