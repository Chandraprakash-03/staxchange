import { RedisClientType, createClient } from "redis";

/**
 * Cache manager with advanced features like cache warming, invalidation patterns, and statistics
 */
export class CacheManager {
	private static instance: CacheManager;
	private client: RedisClientType | null = null;
	private isConnected = false;
	private hitCount = 0;
	private missCount = 0;
	private errorCount = 0;
	private startTime = Date.now();

	private constructor() {}

	/**
	 * Get singleton instance
	 */
	static getInstance(): CacheManager {
		if (!CacheManager.instance) {
			CacheManager.instance = new CacheManager();
		}
		return CacheManager.instance;
	}

	/**
	 * Initialize Redis connection with retry logic
	 */
	async connect(): Promise<RedisClientType | null> {
		if (this.client && this.isConnected) {
			return this.client;
		}

		const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
		const maxRetries = parseInt(process.env.REDIS_MAX_RETRIES || "3");

		this.client = createClient({
			url: redisUrl,
			socket: {
				reconnectStrategy: (retries) => {
					if (retries > maxRetries) {
						console.error(
							`Cache: Max retries (${maxRetries}) exceeded, giving up`
						);
						return false;
					}
					const delay = Math.min(retries * 50, 500);
					console.log(`Cache: Reconnecting in ${delay}ms (attempt ${retries})`);
					return delay;
				},
				connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT || "10000"),
				commandTimeout: parseInt(process.env.REDIS_COMMAND_TIMEOUT || "5000"),
			},
			// Connection pool settings
			isolationPoolOptions: {
				min: 2,
				max: 10,
			},
		});

		this.setupEventHandlers();

		try {
			await this.client.connect();
			this.isConnected = true;
			console.log("Cache: Redis connection established");
			return this.client;
		} catch (error) {
			console.error("Cache: Failed to connect to Redis:", error);
			this.client = null;
			this.isConnected = false;
			return null;
		}
	}

	/**
	 * Setup event handlers for monitoring
	 */
	private setupEventHandlers(): void {
		if (!this.client) return;

		this.client.on("error", (err) => {
			this.errorCount++;
			console.error("Cache: Redis client error:", err);
			this.isConnected = false;
		});

		this.client.on("connect", () => {
			console.log("Cache: Redis client connected");
			this.isConnected = true;
		});

		this.client.on("disconnect", () => {
			console.log("Cache: Redis client disconnected");
			this.isConnected = false;
		});

		this.client.on("reconnecting", () => {
			console.log("Cache: Redis client reconnecting");
		});

		this.client.on("ready", () => {
			console.log("Cache: Redis client ready");
			this.isConnected = true;
		});
	}

	/**
	 * Get data from cache with statistics tracking
	 */
	async get<T = any>(key: string): Promise<T | null> {
		if (!this.isConnected || !this.client) {
			this.missCount++;
			return null;
		}

		try {
			const value = await this.client.get(key);
			if (value) {
				this.hitCount++;
				return JSON.parse(value);
			} else {
				this.missCount++;
				return null;
			}
		} catch (error) {
			this.errorCount++;
			console.warn(`Cache: Error getting key ${key}:`, error);
			return null;
		}
	}

	/**
	 * Set data in cache with TTL
	 */
	async set<T = any>(
		key: string,
		value: T,
		ttlSeconds?: number
	): Promise<boolean> {
		if (!this.isConnected || !this.client) {
			return false;
		}

		try {
			const serialized = JSON.stringify(value);
			if (ttlSeconds) {
				await this.client.setEx(key, ttlSeconds, serialized);
			} else {
				await this.client.set(key, serialized);
			}
			return true;
		} catch (error) {
			this.errorCount++;
			console.warn(`Cache: Error setting key ${key}:`, error);
			return false;
		}
	}

	/**
	 * Delete a key from cache
	 */
	async delete(key: string): Promise<boolean> {
		if (!this.isConnected || !this.client) {
			return false;
		}

		try {
			const result = await this.client.del(key);
			return result > 0;
		} catch (error) {
			this.errorCount++;
			console.warn(`Cache: Error deleting key ${key}:`, error);
			return false;
		}
	}

	/**
	 * Delete multiple keys by pattern
	 */
	async deletePattern(pattern: string): Promise<number> {
		if (!this.isConnected || !this.client) {
			return 0;
		}

		try {
			const keys = await this.client.keys(pattern);
			if (keys.length === 0) {
				return 0;
			}

			const result = await this.client.del(keys);
			return result;
		} catch (error) {
			this.errorCount++;
			console.warn(`Cache: Error deleting pattern ${pattern}:`, error);
			return 0;
		}
	}

	/**
	 * Check if key exists
	 */
	async exists(key: string): Promise<boolean> {
		if (!this.isConnected || !this.client) {
			return false;
		}

		try {
			const result = await this.client.exists(key);
			return result > 0;
		} catch (error) {
			this.errorCount++;
			console.warn(`Cache: Error checking existence of key ${key}:`, error);
			return false;
		}
	}

	/**
	 * Set TTL for existing key
	 */
	async expire(key: string, ttlSeconds: number): Promise<boolean> {
		if (!this.isConnected || !this.client) {
			return false;
		}

		try {
			const result = await this.client.expire(key, ttlSeconds);
			return result;
		} catch (error) {
			this.errorCount++;
			console.warn(`Cache: Error setting TTL for key ${key}:`, error);
			return false;
		}
	}

	/**
	 * Get TTL for a key
	 */
	async getTTL(key: string): Promise<number> {
		if (!this.isConnected || !this.client) {
			return -1;
		}

		try {
			return await this.client.ttl(key);
		} catch (error) {
			this.errorCount++;
			console.warn(`Cache: Error getting TTL for key ${key}:`, error);
			return -1;
		}
	}

	/**
	 * Increment a numeric value
	 */
	async increment(key: string, by: number = 1): Promise<number | null> {
		if (!this.isConnected || !this.client) {
			return null;
		}

		try {
			return await this.client.incrBy(key, by);
		} catch (error) {
			this.errorCount++;
			console.warn(`Cache: Error incrementing key ${key}:`, error);
			return null;
		}
	}

	/**
	 * Get multiple keys at once
	 */
	async getMultiple<T = any>(keys: string[]): Promise<(T | null)[]> {
		if (!this.isConnected || !this.client || keys.length === 0) {
			return keys.map(() => null);
		}

		try {
			const values = await this.client.mGet(keys);
			return values.map((value, index) => {
				if (value) {
					this.hitCount++;
					try {
						return JSON.parse(value);
					} catch {
						return null;
					}
				} else {
					this.missCount++;
					return null;
				}
			});
		} catch (error) {
			this.errorCount++;
			console.warn(`Cache: Error getting multiple keys:`, error);
			return keys.map(() => null);
		}
	}

	/**
	 * Set multiple keys at once
	 */
	async setMultiple<T = any>(
		keyValuePairs: Record<string, T>,
		ttlSeconds?: number
	): Promise<boolean> {
		if (!this.isConnected || !this.client) {
			return false;
		}

		try {
			const serializedPairs: Record<string, string> = {};
			for (const [key, value] of Object.entries(keyValuePairs)) {
				serializedPairs[key] = JSON.stringify(value);
			}

			await this.client.mSet(serializedPairs);

			// Set TTL for all keys if specified
			if (ttlSeconds) {
				const promises = Object.keys(serializedPairs).map((key) =>
					this.client!.expire(key, ttlSeconds)
				);
				await Promise.all(promises);
			}

			return true;
		} catch (error) {
			this.errorCount++;
			console.warn(`Cache: Error setting multiple keys:`, error);
			return false;
		}
	}

	/**
	 * Cache warming - preload frequently accessed data
	 */
	async warmCache(
		warmingData: Array<{ key: string; value: any; ttl?: number }>
	): Promise<number> {
		if (!this.isConnected || !this.client) {
			return 0;
		}

		let successCount = 0;
		const batchSize = 100; // Process in batches to avoid overwhelming Redis

		for (let i = 0; i < warmingData.length; i += batchSize) {
			const batch = warmingData.slice(i, i + batchSize);

			try {
				const promises = batch.map(async ({ key, value, ttl }) => {
					const success = await this.set(key, value, ttl);
					if (success) successCount++;
				});

				await Promise.all(promises);
			} catch (error) {
				console.warn(
					`Cache: Error in warming batch ${i / batchSize + 1}:`,
					error
				);
			}
		}

		console.log(
			`Cache: Warmed ${successCount}/${warmingData.length} cache entries`
		);
		return successCount;
	}

	/**
	 * Get cache statistics
	 */
	getStatistics(): {
		connected: boolean;
		hitCount: number;
		missCount: number;
		errorCount: number;
		hitRate: number;
		uptime: number;
	} {
		const totalRequests = this.hitCount + this.missCount;
		const hitRate =
			totalRequests > 0 ? (this.hitCount / totalRequests) * 100 : 0;

		return {
			connected: this.isConnected,
			hitCount: this.hitCount,
			missCount: this.missCount,
			errorCount: this.errorCount,
			hitRate: Math.round(hitRate * 100) / 100,
			uptime: Date.now() - this.startTime,
		};
	}

	/**
	 * Reset statistics
	 */
	resetStatistics(): void {
		this.hitCount = 0;
		this.missCount = 0;
		this.errorCount = 0;
		this.startTime = Date.now();
	}

	/**
	 * Health check
	 */
	async healthCheck(): Promise<{
		connected: boolean;
		latency?: number;
		memoryUsage?: string;
		keyCount?: number;
	}> {
		if (!this.isConnected || !this.client) {
			return { connected: false };
		}

		try {
			const start = Date.now();
			await this.client.ping();
			const latency = Date.now() - start;

			const [info, keyCount] = await Promise.all([
				this.client.info("memory"),
				this.client.dbSize(),
			]);

			// Parse memory usage from info string
			const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);
			const memoryUsage = memoryMatch ? memoryMatch[1] : "unknown";

			return {
				connected: true,
				latency,
				memoryUsage,
				keyCount,
			};
		} catch (error) {
			console.error("Cache: Health check failed:", error);
			return { connected: false };
		}
	}

	/**
	 * Flush all cache data
	 */
	async flush(): Promise<boolean> {
		if (!this.isConnected || !this.client) {
			return false;
		}

		try {
			await this.client.flushDb();
			console.log("Cache: All data flushed");
			return true;
		} catch (error) {
			this.errorCount++;
			console.error("Cache: Error flushing cache:", error);
			return false;
		}
	}

	/**
	 * Disconnect from Redis
	 */
	async disconnect(): Promise<void> {
		if (this.client && this.isConnected) {
			try {
				await this.client.disconnect();
				this.client = null;
				this.isConnected = false;
				console.log("Cache: Disconnected from Redis");
			} catch (error) {
				console.error("Cache: Error disconnecting from Redis:", error);
			}
		}
	}

	/**
	 * Get the raw Redis client (use with caution)
	 */
	getClient(): RedisClientType | null {
		return this.client;
	}

	/**
	 * Check if cache is connected
	 */
	isReady(): boolean {
		return this.isConnected && this.client !== null;
	}
}

// Export singleton instance
export const cacheManager = CacheManager.getInstance();

// Convenience functions
export const getCache = <T = any>(key: string) => cacheManager.get<T>(key);
export const setCache = <T = any>(key: string, value: T, ttl?: number) =>
	cacheManager.set(key, value, ttl);
export const deleteCache = (key: string) => cacheManager.delete(key);
export const deleteCachePattern = (pattern: string) =>
	cacheManager.deletePattern(pattern);
