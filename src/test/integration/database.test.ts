import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaClient } from "@/generated/prisma";
import { repositoryFactory } from "@/repositories";
import { databasePool } from "@/lib/connectionPool";
import { cacheManager } from "@/lib/cache";

/**
 * Database integration tests with test containers
 * These tests run against a real database instance
 */
describe("Database Integration Tests", () => {
	let prisma: PrismaClient;
	let testUserId: string;
	let testProjectId: string;

	beforeAll(async () => {
		// Initialize database connection
		prisma = databasePool.getPrisma();

		// Initialize Redis connection for caching tests
		await cacheManager.connect();
		await repositoryFactory.initializeRedis();

		// Ensure database is ready
		const health = await databasePool.healthCheck();
		if (!health.database) {
			throw new Error("Database is not healthy for testing");
		}
	});

	afterAll(async () => {
		// Clean up test data
		if (testUserId) {
			await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
		}

		// Close connections
		await databasePool.close();
		await cacheManager.disconnect();
	});

	beforeEach(async () => {
		// Clear cache before each test
		await cacheManager.flush();
	});

	describe("Connection Pool Management", () => {
		it("should establish database connection successfully", async () => {
			const health = await databasePool.healthCheck();
			expect(health.database).toBe(true);
			expect(health.pool.total).toBeGreaterThan(0);
		});

		it("should handle concurrent connections", async () => {
			const promises = Array.from({ length: 10 }, (_, i) =>
				databasePool.query("SELECT $1 as test_value", [i])
			);

			const results = await Promise.all(promises);
			expect(results).toHaveLength(10);
			results.forEach((result, index) => {
				expect(result[0].test_value).toBe(index);
			});
		});

		it("should execute transactions correctly", async () => {
			const result = await databasePool.transaction(async (client) => {
				await client.query(
					"CREATE TEMP TABLE test_transaction (id INT, value TEXT)"
				);
				await client.query("INSERT INTO test_transaction VALUES (1, $1)", [
					"test",
				]);
				const rows = await client.query(
					"SELECT * FROM test_transaction WHERE id = 1"
				);
				return rows.rows[0];
			});

			expect(result.id).toBe(1);
			expect(result.value).toBe("test");
		});

		it("should rollback transactions on error", async () => {
			await expect(
				databasePool.transaction(async (client) => {
					await client.query(
						"CREATE TEMP TABLE test_rollback (id INT PRIMARY KEY)"
					);
					await client.query("INSERT INTO test_rollback VALUES (1)");
					// This should cause a constraint violation
					await client.query("INSERT INTO test_rollback VALUES (1)");
				})
			).rejects.toThrow();
		});

		it("should provide accurate pool statistics", async () => {
			const stats = databasePool.getPoolStatistics();
			expect(stats.totalConnections).toBeGreaterThan(0);
			expect(stats.queryCount).toBeGreaterThanOrEqual(0);
			expect(stats.uptime).toBeGreaterThan(0);
		});
	});

	describe("User Repository Integration", () => {
		const userRepo = repositoryFactory.getUserRepository();

		it("should create and retrieve user with caching", async () => {
			const userData = {
				githubId: "test-github-id",
				username: "testuser",
				email: "test@example.com",
				avatarUrl: "https://example.com/avatar.jpg",
			};

			// Create user
			const createdUser = await userRepo.create(userData);
			testUserId = createdUser.id;

			expect(createdUser.githubId).toBe(userData.githubId);
			expect(createdUser.username).toBe(userData.username);
			expect(createdUser.email).toBe(userData.email);

			// Retrieve by ID (should hit cache on second call)
			const retrievedUser1 = await userRepo.findById(createdUser.id);
			const retrievedUser2 = await userRepo.findById(createdUser.id);

			expect(retrievedUser1).toEqual(retrievedUser2);
			expect(retrievedUser1?.githubId).toBe(userData.githubId);

			// Retrieve by GitHub ID
			const userByGithubId = await userRepo.findByGithubId(userData.githubId);
			expect(userByGithubId?.id).toBe(createdUser.id);
		});

		it("should update user and invalidate cache", async () => {
			const updateData = {
				username: "updateduser",
				email: "updated@example.com",
			};

			const updatedUser = await userRepo.update(testUserId, updateData);
			expect(updatedUser?.username).toBe(updateData.username);
			expect(updatedUser?.email).toBe(updateData.email);

			// Verify cache was updated
			const cachedUser = await userRepo.findById(testUserId);
			expect(cachedUser?.username).toBe(updateData.username);
		});

		it("should get user statistics with caching", async () => {
			const stats1 = await userRepo.getStatistics();
			const stats2 = await userRepo.getStatistics();

			expect(stats1.total).toBeGreaterThan(0);
			expect(stats1).toEqual(stats2); // Should be cached
		});

		it("should handle repository health checks", async () => {
			const health = await userRepo.healthCheck();
			expect(health.database).toBe(true);
			expect(health.cache).toBe(true);
		});
	});

	describe("Project Repository Integration", () => {
		const projectRepo = repositoryFactory.getProjectRepository();

		it("should create and manage projects with caching", async () => {
			const projectData = {
				name: "Test Project",
				githubUrl: "https://github.com/test/project",
				userId: testUserId,
				originalTechStack: {
					language: "javascript",
					framework: "react",
					buildTool: "webpack",
				},
				status: "imported",
			};

			// Create project
			const createdProject = await projectRepo.create(projectData);
			testProjectId = createdProject.id;

			expect(createdProject.name).toBe(projectData.name);
			expect(createdProject.githubUrl).toBe(projectData.githubUrl);
			expect(createdProject.userId).toBe(testUserId);

			// Test caching
			const retrievedProject1 = await projectRepo.findById(createdProject.id);
			const retrievedProject2 = await projectRepo.findById(createdProject.id);

			expect(retrievedProject1).toEqual(retrievedProject2);
		});

		it("should find projects by user ID with caching", async () => {
			const userProjects1 = await projectRepo.findByUserId(testUserId);
			const userProjects2 = await projectRepo.findByUserId(testUserId);

			expect(userProjects1.length).toBeGreaterThan(0);
			expect(userProjects1).toEqual(userProjects2); // Should be cached
			expect(userProjects1[0].userId).toBe(testUserId);
		});

		it("should find projects by status", async () => {
			const importedProjects = await projectRepo.findByStatus("imported");
			expect(importedProjects.length).toBeGreaterThan(0);
			expect(importedProjects.every((p) => p.status === "imported")).toBe(true);
		});

		it("should search projects", async () => {
			const searchResults = await projectRepo.search("Test", testUserId);
			expect(searchResults.length).toBeGreaterThan(0);
			expect(searchResults[0].name).toContain("Test");
		});

		it("should get project statistics", async () => {
			const globalStats = await projectRepo.getStatistics();
			const userStats = await projectRepo.getStatistics(testUserId);

			expect(globalStats.total).toBeGreaterThanOrEqual(userStats.total);
			expect(userStats.total).toBeGreaterThan(0);
		});
	});

	describe("ConversionJob Repository Integration", () => {
		const jobRepo = repositoryFactory.getConversionJobRepository();

		it("should create and manage conversion jobs", async () => {
			const jobData = {
				projectId: testProjectId,
				plan: {
					id: "test-plan",
					projectId: testProjectId,
					tasks: [
						{
							id: "task-1",
							type: "analysis",
							description: "Test task",
							inputFiles: ["src/"],
							outputFiles: ["output/"],
							dependencies: [],
							agentType: "analysis",
							priority: 1,
						},
					],
					estimatedDuration: 300,
					complexity: "medium" as const,
					warnings: [],
				},
				status: "pending",
			};

			// Create job
			const createdJob = await jobRepo.create(jobData);
			expect(createdJob.projectId).toBe(testProjectId);
			expect(createdJob.status).toBe("pending");

			// Update progress
			const updatedJob = await jobRepo.updateProgress(
				createdJob.id,
				50,
				"Processing..."
			);
			expect(updatedJob?.progress).toBe(50);
			expect(updatedJob?.currentTask).toBe("Processing...");

			// Mark as completed
			const completedJob = await jobRepo.markAsCompleted(createdJob.id, {
				success: true,
			});
			expect(completedJob?.status).toBe("completed");
			expect(completedJob?.progress).toBe(100);
		});

		it("should find jobs by project ID", async () => {
			const projectJobs = await jobRepo.findByProjectId(testProjectId);
			expect(projectJobs.length).toBeGreaterThan(0);
			expect(projectJobs.every((job) => job.projectId === testProjectId)).toBe(
				true
			);
		});

		it("should find active jobs", async () => {
			// Create a pending job
			await jobRepo.create({
				projectId: testProjectId,
				plan: {
					id: "active-plan",
					projectId: testProjectId,
					tasks: [],
					estimatedDuration: 100,
					complexity: "low" as const,
					warnings: [],
				},
				status: "pending",
			});

			const activeJobs = await jobRepo.findActive();
			expect(activeJobs.some((job) => job.status === "pending")).toBe(true);
		});

		it("should get job statistics", async () => {
			const globalStats = await jobRepo.getStatistics();
			const projectStats = await jobRepo.getStatistics(testProjectId);

			expect(globalStats.total).toBeGreaterThanOrEqual(projectStats.total);
			expect(projectStats.total).toBeGreaterThan(0);
		});
	});

	describe("Cache Integration", () => {
		it("should handle cache operations correctly", async () => {
			const testKey = "test:cache:key";
			const testValue = { data: "test", timestamp: Date.now() };

			// Set cache
			const setResult = await cacheManager.set(testKey, testValue, 60);
			expect(setResult).toBe(true);

			// Get cache
			const cachedValue = await cacheManager.get(testKey);
			expect(cachedValue).toEqual(testValue);

			// Check existence
			const exists = await cacheManager.exists(testKey);
			expect(exists).toBe(true);

			// Delete cache
			const deleteResult = await cacheManager.delete(testKey);
			expect(deleteResult).toBe(true);

			// Verify deletion
			const deletedValue = await cacheManager.get(testKey);
			expect(deletedValue).toBeNull();
		});

		it("should handle cache patterns correctly", async () => {
			const keys = ["test:pattern:1", "test:pattern:2", "test:pattern:3"];
			const values = ["value1", "value2", "value3"];

			// Set multiple keys
			for (let i = 0; i < keys.length; i++) {
				await cacheManager.set(keys[i], values[i]);
			}

			// Delete by pattern
			const deletedCount = await cacheManager.deletePattern("test:pattern:*");
			expect(deletedCount).toBe(3);

			// Verify all keys are deleted
			for (const key of keys) {
				const value = await cacheManager.get(key);
				expect(value).toBeNull();
			}
		});

		it("should provide cache statistics", async () => {
			// Perform some cache operations
			await cacheManager.set("stats:test:1", "value1");
			await cacheManager.get("stats:test:1"); // hit
			await cacheManager.get("stats:test:nonexistent"); // miss

			const stats = cacheManager.getStatistics();
			expect(stats.connected).toBe(true);
			expect(stats.hitCount).toBeGreaterThan(0);
			expect(stats.missCount).toBeGreaterThan(0);
			expect(stats.hitRate).toBeGreaterThan(0);
		});

		it("should handle cache health checks", async () => {
			const health = await cacheManager.healthCheck();
			expect(health.connected).toBe(true);
			expect(health.latency).toBeGreaterThan(0);
			expect(health.keyCount).toBeGreaterThanOrEqual(0);
		});
	});

	describe("Repository Factory Integration", () => {
		it("should provide healthy repository instances", async () => {
			const health = await repositoryFactory.healthCheck();

			expect(health.database).toBe(true);
			expect(health.cache).toBe(true);
			expect(health.repositories.user.database).toBe(true);
			expect(health.repositories.project.database).toBe(true);
			expect(health.repositories.conversionJob.database).toBe(true);
		});

		it("should provide cache statistics", async () => {
			const stats = await repositoryFactory.getCacheStatistics();
			expect(stats.connected).toBe(true);
			expect(typeof stats.keyCount).toBe("number");
		});

		it("should clear all caches", async () => {
			// Set some test data
			await cacheManager.set("factory:test:1", "value1");
			await cacheManager.set("factory:test:2", "value2");

			// Clear all caches
			await repositoryFactory.clearAllCaches();

			// Verify caches are cleared
			const value1 = await cacheManager.get("factory:test:1");
			const value2 = await cacheManager.get("factory:test:2");
			expect(value1).toBeNull();
			expect(value2).toBeNull();
		});
	});

	describe("Performance and Optimization", () => {
		it("should handle bulk operations efficiently", async () => {
			const userRepo = repositoryFactory.getUserRepository();
			const startTime = Date.now();

			// Create multiple users
			const users = await Promise.all(
				Array.from({ length: 10 }, (_, i) =>
					userRepo.create({
						githubId: `bulk-test-${i}`,
						username: `bulkuser${i}`,
						email: `bulk${i}@example.com`,
					})
				)
			);

			const endTime = Date.now();
			const duration = endTime - startTime;

			expect(users).toHaveLength(10);
			expect(duration).toBeLessThan(5000); // Should complete within 5 seconds

			// Clean up
			await Promise.all(users.map((user) => userRepo.delete(user.id)));
		});

		it("should demonstrate cache performance benefits", async () => {
			const projectRepo = repositoryFactory.getProjectRepository();

			// First call (database)
			const start1 = Date.now();
			const project1 = await projectRepo.findById(testProjectId);
			const duration1 = Date.now() - start1;

			// Second call (cache)
			const start2 = Date.now();
			const project2 = await projectRepo.findById(testProjectId);
			const duration2 = Date.now() - start2;

			expect(project1).toEqual(project2);
			expect(duration2).toBeLessThan(duration1); // Cache should be faster
		});

		it("should handle database maintenance operations", async () => {
			const maintenance = await databasePool.performMaintenance();

			expect(maintenance.vacuumAnalyze).toBe(true);
			expect(maintenance.statisticsUpdate).toBe(true);
			// reindexing might be disabled in test environment
		});
	});
});
