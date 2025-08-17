import { PrismaClient } from "@/generated/prisma";
import { RedisClientType } from "redis";
import { UserRepository } from "./user";
import { ProjectRepository } from "./project";
import { ConversionJobRepository } from "./conversionJob";
import { redisConnection } from "@/lib/redis";
import prisma from "@/lib/prisma";

/**
 * Repository factory for creating and managing repository instances
 */
export class RepositoryFactory {
	private static instance: RepositoryFactory;
	private prismaClient: PrismaClient;
	private redisClient: RedisClientType | null = null;

	// Repository instances
	private userRepository?: UserRepository;
	private projectRepository?: ProjectRepository;
	private conversionJobRepository?: ConversionJobRepository;

	private constructor() {
		this.prismaClient = prisma;
	}

	/**
	 * Get singleton instance
	 */
	static getInstance(): RepositoryFactory {
		if (!RepositoryFactory.instance) {
			RepositoryFactory.instance = new RepositoryFactory();
		}
		return RepositoryFactory.instance;
	}

	/**
	 * Initialize Redis connection
	 */
	async initializeRedis(): Promise<void> {
		try {
			this.redisClient = await redisConnection.connect();
			console.log("Repository factory: Redis connection initialized");
		} catch (error) {
			console.warn(
				"Repository factory: Failed to initialize Redis, repositories will work without caching:",
				error
			);
			this.redisClient = null;
		}
	}

	/**
	 * Get User repository
	 */
	getUserRepository(): UserRepository {
		if (!this.userRepository) {
			this.userRepository = new UserRepository(
				this.prismaClient,
				this.redisClient
			);
		}
		return this.userRepository;
	}

	/**
	 * Get Project repository
	 */
	getProjectRepository(): ProjectRepository {
		if (!this.projectRepository) {
			this.projectRepository = new ProjectRepository(
				this.prismaClient,
				this.redisClient
			);
		}
		return this.projectRepository;
	}

	/**
	 * Get ConversionJob repository
	 */
	getConversionJobRepository(): ConversionJobRepository {
		if (!this.conversionJobRepository) {
			this.conversionJobRepository = new ConversionJobRepository(
				this.prismaClient,
				this.redisClient
			);
		}
		return this.conversionJobRepository;
	}

	/**
	 * Health check for all repositories
	 */
	async healthCheck(): Promise<{
		database: boolean;
		cache: boolean;
		repositories: {
			user: { database: boolean; cache: boolean };
			project: { database: boolean; cache: boolean };
			conversionJob: { database: boolean; cache: boolean };
		};
	}> {
		const userRepo = this.getUserRepository();
		const projectRepo = this.getProjectRepository();
		const jobRepo = this.getConversionJobRepository();

		const [userHealth, projectHealth, jobHealth] = await Promise.all([
			userRepo.healthCheck(),
			projectRepo.healthCheck(),
			jobRepo.healthCheck(),
		]);

		const overallDatabase =
			userHealth.database && projectHealth.database && jobHealth.database;
		const overallCache =
			userHealth.cache && projectHealth.cache && jobHealth.cache;

		return {
			database: overallDatabase,
			cache: overallCache,
			repositories: {
				user: userHealth,
				project: projectHealth,
				conversionJob: jobHealth,
			},
		};
	}

	/**
	 * Disconnect all connections
	 */
	async disconnect(): Promise<void> {
		try {
			await this.prismaClient.$disconnect();
			if (this.redisClient) {
				await redisConnection.disconnect();
			}
			console.log("Repository factory: All connections closed");
		} catch (error) {
			console.error("Repository factory: Error during disconnect:", error);
		}
	}

	/**
	 * Clear all caches
	 */
	async clearAllCaches(): Promise<void> {
		if (!this.redisClient) {
			return;
		}

		try {
			await this.redisClient.flushDb();
			console.log("Repository factory: All caches cleared");
		} catch (error) {
			console.error("Repository factory: Error clearing caches:", error);
		}
	}

	/**
	 * Get cache statistics
	 */
	async getCacheStatistics(): Promise<{
		connected: boolean;
		keyCount?: number;
		memoryUsage?: string;
		hitRate?: number;
	}> {
		if (!this.redisClient) {
			return { connected: false };
		}

		try {
			const info = await this.redisClient.info("memory");
			const keyCount = await this.redisClient.dbSize();

			// Parse memory usage from info string
			const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);
			const memoryUsage = memoryMatch ? memoryMatch[1] : "unknown";

			return {
				connected: true,
				keyCount,
				memoryUsage,
				// Note: Redis doesn't provide hit rate directly, would need to implement custom tracking
			};
		} catch (error) {
			console.error(
				"Repository factory: Error getting cache statistics:",
				error
			);
			return { connected: false };
		}
	}
}

// Export singleton instance
export const repositoryFactory = RepositoryFactory.getInstance();

// Export individual repository classes for direct use if needed
export { UserRepository } from "./user";
export { ProjectRepository } from "./project";
export { ConversionJobRepository } from "./conversionJob";
export { BaseRepository } from "./base";
export type { IBaseRepository, FindManyOptions, CacheOptions } from "./base";

// Convenience exports for common repository operations
export const userRepository = () => repositoryFactory.getUserRepository();
export const projectRepository = () => repositoryFactory.getProjectRepository();
export const conversionJobRepository = () =>
	repositoryFactory.getConversionJobRepository();
