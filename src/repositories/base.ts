import { PrismaClient } from "@/generated/prisma";
import { RedisClientType } from "redis";

/**
 * Base repository interface defining common CRUD operations
 */
export interface IBaseRepository<T, CreateInput, UpdateInput> {
	create(data: CreateInput): Promise<T>;
	findById(id: string): Promise<T | null>;
	update(id: string, data: UpdateInput): Promise<T | null>;
	delete(id: string): Promise<boolean>;
	findMany(options?: FindManyOptions): Promise<T[]>;
	count(where?: any): Promise<number>;
}

/**
 * Options for findMany operations
 */
export interface FindManyOptions {
	where?: any;
	orderBy?: any;
	take?: number;
	skip?: number;
	include?: any;
}

/**
 * Cache configuration options
 */
export interface CacheOptions {
	ttl?: number; // Time to live in seconds
	prefix?: string; // Cache key prefix
	enabled?: boolean; // Whether caching is enabled
}

/**
 * Abstract base repository class with caching support
 */
export abstract class BaseRepository<T, CreateInput, UpdateInput>
	implements IBaseRepository<T, CreateInput, UpdateInput>
{
	protected prisma: PrismaClient;
	protected redis: RedisClientType | null;
	protected cacheOptions: CacheOptions;
	protected entityName: string;

	constructor(
		prisma: PrismaClient,
		redis: RedisClientType | null,
		entityName: string,
		cacheOptions: CacheOptions = {}
	) {
		this.prisma = prisma;
		this.redis = redis;
		this.entityName = entityName;
		this.cacheOptions = {
			ttl: 300, // 5 minutes default
			prefix: `${entityName}:`,
			enabled: true,
			...cacheOptions,
		};
	}

	/**
	 * Generate cache key for an entity
	 */
	protected getCacheKey(id: string, suffix?: string): string {
		const key = `${this.cacheOptions.prefix}${id}`;
		return suffix ? `${key}:${suffix}` : key;
	}

	/**
	 * Get data from cache
	 */
	protected async getFromCache<CacheType = T>(
		key: string
	): Promise<CacheType | null> {
		if (!this.cacheOptions.enabled || !this.redis) {
			return null;
		}

		try {
			const cached = await this.redis.get(key);
			return cached ? JSON.parse(cached) : null;
		} catch (error) {
			console.warn(`Cache get error for key ${key}:`, error);
			return null;
		}
	}

	/**
	 * Set data in cache
	 */
	protected async setCache<CacheType = T>(
		key: string,
		data: CacheType
	): Promise<void> {
		if (!this.cacheOptions.enabled || !this.redis) {
			return;
		}

		try {
			await this.redis.setEx(key, this.cacheOptions.ttl!, JSON.stringify(data));
		} catch (error) {
			console.warn(`Cache set error for key ${key}:`, error);
		}
	}

	/**
	 * Delete data from cache
	 */
	protected async deleteFromCache(key: string): Promise<void> {
		if (!this.cacheOptions.enabled || !this.redis) {
			return;
		}

		try {
			await this.redis.del(key);
		} catch (error) {
			console.warn(`Cache delete error for key ${key}:`, error);
		}
	}

	/**
	 * Delete multiple cache keys by pattern
	 */
	protected async deleteCachePattern(pattern: string): Promise<void> {
		if (!this.cacheOptions.enabled || !this.redis) {
			return;
		}

		try {
			const keys = await this.redis.keys(pattern);
			if (keys.length > 0) {
				await this.redis.del(keys);
			}
		} catch (error) {
			console.warn(`Cache pattern delete error for pattern ${pattern}:`, error);
		}
	}

	/**
	 * Abstract methods to be implemented by concrete repositories
	 */
	abstract create(data: CreateInput): Promise<T>;
	abstract findById(id: string): Promise<T | null>;
	abstract update(id: string, data: UpdateInput): Promise<T | null>;
	abstract delete(id: string): Promise<boolean>;
	abstract findMany(options?: FindManyOptions): Promise<T[]>;
	abstract count(where?: any): Promise<number>;

	/**
	 * Health check for repository dependencies
	 */
	async healthCheck(): Promise<{ database: boolean; cache: boolean }> {
		const database = await this.checkDatabaseHealth();
		const cache = await this.checkCacheHealth();

		return { database, cache };
	}

	/**
	 * Check database connection health
	 */
	protected async checkDatabaseHealth(): Promise<boolean> {
		try {
			await this.prisma.$queryRaw`SELECT 1`;
			return true;
		} catch (error) {
			console.error("Database health check failed:", error);
			return false;
		}
	}

	/**
	 * Check cache connection health
	 */
	protected async checkCacheHealth(): Promise<boolean> {
		if (!this.redis) {
			return false;
		}

		try {
			await this.redis.ping();
			return true;
		} catch (error) {
			console.error("Cache health check failed:", error);
			return false;
		}
	}
}
