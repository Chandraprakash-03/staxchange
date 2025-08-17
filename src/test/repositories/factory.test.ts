import { describe, it, expect, beforeEach, vi } from "vitest";
import { RepositoryFactory } from "@/repositories";

// Mock the dependencies
vi.mock("@/lib/prisma", () => ({
	default: {
		$queryRaw: vi.fn(),
		$disconnect: vi.fn(),
	},
}));

vi.mock("@/lib/redis", () => ({
	redisConnection: {
		connect: vi.fn(),
		disconnect: vi.fn(),
		getClient: vi.fn(),
	},
}));

vi.mock("@/repositories/user", () => ({
	UserRepository: vi.fn().mockImplementation(() => ({
		healthCheck: vi.fn().mockResolvedValue({ database: true, cache: true }),
	})),
}));

vi.mock("@/repositories/project", () => ({
	ProjectRepository: vi.fn().mockImplementation(() => ({
		healthCheck: vi.fn().mockResolvedValue({ database: true, cache: true }),
	})),
}));

vi.mock("@/repositories/conversionJob", () => ({
	ConversionJobRepository: vi.fn().mockImplementation(() => ({
		healthCheck: vi.fn().mockResolvedValue({ database: true, cache: true }),
	})),
}));

describe("RepositoryFactory", () => {
	let factory: RepositoryFactory;

	beforeEach(() => {
		vi.clearAllMocks();
		// Get a fresh instance for each test
		factory = RepositoryFactory.getInstance();
	});

	describe("singleton pattern", () => {
		it("should return the same instance", () => {
			const factory1 = RepositoryFactory.getInstance();
			const factory2 = RepositoryFactory.getInstance();

			expect(factory1).toBe(factory2);
		});
	});

	describe("repository creation", () => {
		it("should create and return user repository", () => {
			const userRepo1 = factory.getUserRepository();
			const userRepo2 = factory.getUserRepository();

			// Should return the same instance (singleton pattern within factory)
			expect(userRepo1).toBe(userRepo2);
		});

		it("should create and return project repository", () => {
			const projectRepo1 = factory.getProjectRepository();
			const projectRepo2 = factory.getProjectRepository();

			expect(projectRepo1).toBe(projectRepo2);
		});

		it("should create and return conversion job repository", () => {
			const jobRepo1 = factory.getConversionJobRepository();
			const jobRepo2 = factory.getConversionJobRepository();

			expect(jobRepo1).toBe(jobRepo2);
		});
	});

	describe("Redis initialization", () => {
		it("should initialize Redis connection successfully", async () => {
			const mockRedisClient = { ping: vi.fn() };
			const { redisConnection } = await import("@/lib/redis");

			(redisConnection.connect as any).mockResolvedValue(mockRedisClient);

			await factory.initializeRedis();

			expect(redisConnection.connect).toHaveBeenCalled();
		});

		it("should handle Redis connection failure gracefully", async () => {
			const { redisConnection } = await import("@/lib/redis");

			(redisConnection.connect as any).mockRejectedValue(
				new Error("Redis connection failed")
			);

			// Should not throw
			await expect(factory.initializeRedis()).resolves.toBeUndefined();
		});
	});

	describe("health checks", () => {
		it("should perform comprehensive health check", async () => {
			const health = await factory.healthCheck();

			expect(health).toHaveProperty("database");
			expect(health).toHaveProperty("cache");
			expect(health).toHaveProperty("repositories");
			expect(health.repositories).toHaveProperty("user");
			expect(health.repositories).toHaveProperty("project");
			expect(health.repositories).toHaveProperty("conversionJob");
		});

		it("should aggregate health status correctly", async () => {
			const health = await factory.healthCheck();

			// All repositories should report healthy in our mocked scenario
			expect(health.database).toBe(true);
			expect(health.cache).toBe(true);
			expect(health.repositories.user.database).toBe(true);
			expect(health.repositories.user.cache).toBe(true);
			expect(health.repositories.project.database).toBe(true);
			expect(health.repositories.project.cache).toBe(true);
			expect(health.repositories.conversionJob.database).toBe(true);
			expect(health.repositories.conversionJob.cache).toBe(true);
		});
	});

	describe("cache management", () => {
		it("should get cache statistics when Redis is available", async () => {
			const mockRedisClient = {
				info: vi.fn().mockResolvedValue("used_memory_human:1.5M\r\n"),
				dbSize: vi.fn().mockResolvedValue(42),
			};

			// Mock the factory to have a Redis client
			(factory as any).redisClient = mockRedisClient;

			const stats = await factory.getCacheStatistics();

			expect(stats.connected).toBe(true);
			expect(stats.keyCount).toBe(42);
			expect(stats.memoryUsage).toBe("1.5M");
		});

		it("should handle missing Redis client", async () => {
			// Ensure no Redis client
			(factory as any).redisClient = null;

			const stats = await factory.getCacheStatistics();

			expect(stats.connected).toBe(false);
			expect(stats.keyCount).toBeUndefined();
			expect(stats.memoryUsage).toBeUndefined();
		});

		it("should clear all caches when Redis is available", async () => {
			const mockRedisClient = {
				flushDb: vi.fn().mockResolvedValue("OK"),
			};

			(factory as any).redisClient = mockRedisClient;

			await factory.clearAllCaches();

			expect(mockRedisClient.flushDb).toHaveBeenCalled();
		});

		it("should handle cache clear when Redis is not available", async () => {
			(factory as any).redisClient = null;

			// Should not throw
			await expect(factory.clearAllCaches()).resolves.toBeUndefined();
		});
	});

	describe("connection management", () => {
		it("should disconnect all connections", async () => {
			const mockPrisma = await import("@/lib/prisma");
			const { redisConnection } = await import("@/lib/redis");

			// Ensure the mocks are properly set up
			(mockPrisma.default.$disconnect as any).mockResolvedValue(undefined);
			(redisConnection.disconnect as any).mockResolvedValue(undefined);

			await factory.disconnect();

			expect(mockPrisma.default.$disconnect).toHaveBeenCalled();
			expect(redisConnection.disconnect).toHaveBeenCalled();
		});

		it("should handle disconnect errors gracefully", async () => {
			const mockPrisma = await import("@/lib/prisma");
			const { redisConnection } = await import("@/lib/redis");

			(mockPrisma.default.$disconnect as any).mockRejectedValue(
				new Error("Disconnect failed")
			);
			(redisConnection.disconnect as any).mockRejectedValue(
				new Error("Redis disconnect failed")
			);

			// Should not throw
			await expect(factory.disconnect()).resolves.toBeUndefined();
		});
	});

	describe("error handling", () => {
		it("should handle repository health check failures", async () => {
			// Mock one repository to fail
			const userRepo = factory.getUserRepository();
			(userRepo.healthCheck as any).mockResolvedValue({
				database: false,
				cache: false,
			});

			const health = await factory.healthCheck();

			expect(health.database).toBe(false); // Should be false if any repo fails
			expect(health.repositories.user.database).toBe(false);
		});

		it("should handle cache statistics errors", async () => {
			const mockRedisClient = {
				info: vi.fn().mockRejectedValue(new Error("Redis info failed")),
				dbSize: vi.fn().mockRejectedValue(new Error("Redis dbSize failed")),
			};

			(factory as any).redisClient = mockRedisClient;

			const stats = await factory.getCacheStatistics();

			expect(stats.connected).toBe(false);
		});

		it("should handle cache clear errors", async () => {
			const mockRedisClient = {
				flushDb: vi.fn().mockRejectedValue(new Error("Flush failed")),
			};

			(factory as any).redisClient = mockRedisClient;

			// Should not throw
			await expect(factory.clearAllCaches()).resolves.toBeUndefined();
		});
	});

	describe("convenience exports", () => {
		it("should provide convenience functions for repositories", async () => {
			const { userRepository, projectRepository, conversionJobRepository } =
				await import("@/repositories");

			const userRepo = userRepository();
			const projectRepo = projectRepository();
			const jobRepo = conversionJobRepository();

			expect(userRepo).toBeDefined();
			expect(projectRepo).toBeDefined();
			expect(jobRepo).toBeDefined();
		});
	});
});
