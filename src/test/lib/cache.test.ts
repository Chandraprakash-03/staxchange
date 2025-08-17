import { describe, it, expect, beforeEach, vi } from "vitest";
import { CacheManager } from "@/lib/cache";
import { RedisClientType } from "redis";

// Mock Redis client
const mockRedisClient = {
	connect: vi.fn(),
	disconnect: vi.fn(),
	get: vi.fn(),
	set: vi.fn(),
	setEx: vi.fn(),
	del: vi.fn(),
	keys: vi.fn(),
	exists: vi.fn(),
	expire: vi.fn(),
	ttl: vi.fn(),
	incrBy: vi.fn(),
	mGet: vi.fn(),
	mSet: vi.fn(),
	ping: vi.fn(),
	info: vi.fn(),
	dbSize: vi.fn(),
	flushDb: vi.fn(),
	on: vi.fn(),
} as unknown as RedisClientType;

// Mock the createClient function
vi.mock("redis", () => ({
	createClient: vi.fn(() => mockRedisClient),
}));

describe("CacheManager", () => {
	let cacheManager: CacheManager;

	beforeEach(() => {
		vi.clearAllMocks();
		cacheManager = CacheManager.getInstance();
		// Reset connection state
		(cacheManager as any).client = null;
		(cacheManager as any).isConnected = false;
		(cacheManager as any).hitCount = 0;
		(cacheManager as any).missCount = 0;
		(cacheManager as any).errorCount = 0;
	});

	describe("singleton pattern", () => {
		it("should return the same instance", () => {
			const manager1 = CacheManager.getInstance();
			const manager2 = CacheManager.getInstance();

			expect(manager1).toBe(manager2);
		});
	});

	describe("connection management", () => {
		it("should connect to Redis successfully", async () => {
			mockRedisClient.connect.mockResolvedValue(undefined);

			const client = await cacheManager.connect();

			expect(mockRedisClient.connect).toHaveBeenCalled();
			expect(client).toBe(mockRedisClient);
			expect(cacheManager.isReady()).toBe(true);
		});

		it("should handle connection failure", async () => {
			mockRedisClient.connect.mockRejectedValue(new Error("Connection failed"));

			const client = await cacheManager.connect();

			expect(client).toBeNull();
			expect(cacheManager.isReady()).toBe(false);
		});

		it("should return existing client if already connected", async () => {
			// Simulate already connected state
			(cacheManager as any).client = mockRedisClient;
			(cacheManager as any).isConnected = true;

			const client = await cacheManager.connect();

			expect(client).toBe(mockRedisClient);
			expect(mockRedisClient.connect).not.toHaveBeenCalled();
		});

		it("should disconnect gracefully", async () => {
			(cacheManager as any).client = mockRedisClient;
			(cacheManager as any).isConnected = true;

			await cacheManager.disconnect();

			expect(mockRedisClient.disconnect).toHaveBeenCalled();
			expect(cacheManager.isReady()).toBe(false);
		});
	});

	describe("cache operations", () => {
		beforeEach(() => {
			// Setup connected state
			(cacheManager as any).client = mockRedisClient;
			(cacheManager as any).isConnected = true;
		});

		describe("get", () => {
			it("should get and parse cached value", async () => {
				const testData = { key: "value", number: 42 };
				mockRedisClient.get.mockResolvedValue(JSON.stringify(testData));

				const result = await cacheManager.get("test:key");

				expect(mockRedisClient.get).toHaveBeenCalledWith("test:key");
				expect(result).toEqual(testData);
				expect(cacheManager.getStatistics().hitCount).toBe(1);
			});

			it("should return null for cache miss", async () => {
				mockRedisClient.get.mockResolvedValue(null);

				const result = await cacheManager.get("test:key");

				expect(result).toBeNull();
				expect(cacheManager.getStatistics().missCount).toBe(1);
			});

			it("should handle get errors gracefully", async () => {
				mockRedisClient.get.mockRejectedValue(new Error("Redis error"));

				const result = await cacheManager.get("test:key");

				expect(result).toBeNull();
				expect(cacheManager.getStatistics().errorCount).toBe(1);
			});

			it("should return null when not connected", async () => {
				(cacheManager as any).isConnected = false;

				const result = await cacheManager.get("test:key");

				expect(result).toBeNull();
				expect(mockRedisClient.get).not.toHaveBeenCalled();
			});
		});

		describe("set", () => {
			it("should set value without TTL", async () => {
				const testData = { key: "value" };
				mockRedisClient.set.mockResolvedValue("OK");

				const result = await cacheManager.set("test:key", testData);

				expect(mockRedisClient.set).toHaveBeenCalledWith(
					"test:key",
					JSON.stringify(testData)
				);
				expect(result).toBe(true);
			});

			it("should set value with TTL", async () => {
				const testData = { key: "value" };
				mockRedisClient.setEx.mockResolvedValue("OK");

				const result = await cacheManager.set("test:key", testData, 300);

				expect(mockRedisClient.setEx).toHaveBeenCalledWith(
					"test:key",
					300,
					JSON.stringify(testData)
				);
				expect(result).toBe(true);
			});

			it("should handle set errors gracefully", async () => {
				mockRedisClient.set.mockRejectedValue(new Error("Redis error"));

				const result = await cacheManager.set("test:key", { data: "test" });

				expect(result).toBe(false);
				expect(cacheManager.getStatistics().errorCount).toBe(1);
			});

			it("should return false when not connected", async () => {
				(cacheManager as any).isConnected = false;

				const result = await cacheManager.set("test:key", { data: "test" });

				expect(result).toBe(false);
				expect(mockRedisClient.set).not.toHaveBeenCalled();
			});
		});

		describe("delete", () => {
			it("should delete key successfully", async () => {
				mockRedisClient.del.mockResolvedValue(1);

				const result = await cacheManager.delete("test:key");

				expect(mockRedisClient.del).toHaveBeenCalledWith("test:key");
				expect(result).toBe(true);
			});

			it("should return false if key does not exist", async () => {
				mockRedisClient.del.mockResolvedValue(0);

				const result = await cacheManager.delete("test:key");

				expect(result).toBe(false);
			});

			it("should handle delete errors gracefully", async () => {
				mockRedisClient.del.mockRejectedValue(new Error("Redis error"));

				const result = await cacheManager.delete("test:key");

				expect(result).toBe(false);
				expect(cacheManager.getStatistics().errorCount).toBe(1);
			});
		});

		describe("deletePattern", () => {
			it("should delete keys by pattern", async () => {
				const keys = ["test:key:1", "test:key:2", "test:key:3"];
				mockRedisClient.keys.mockResolvedValue(keys);
				mockRedisClient.del.mockResolvedValue(3);

				const result = await cacheManager.deletePattern("test:key:*");

				expect(mockRedisClient.keys).toHaveBeenCalledWith("test:key:*");
				expect(mockRedisClient.del).toHaveBeenCalledWith(keys);
				expect(result).toBe(3);
			});

			it("should return 0 if no keys match pattern", async () => {
				mockRedisClient.keys.mockResolvedValue([]);

				const result = await cacheManager.deletePattern("test:key:*");

				expect(result).toBe(0);
				expect(mockRedisClient.del).not.toHaveBeenCalled();
			});
		});

		describe("exists", () => {
			it("should check if key exists", async () => {
				mockRedisClient.exists.mockResolvedValue(1);

				const result = await cacheManager.exists("test:key");

				expect(mockRedisClient.exists).toHaveBeenCalledWith("test:key");
				expect(result).toBe(true);
			});

			it("should return false if key does not exist", async () => {
				mockRedisClient.exists.mockResolvedValue(0);

				const result = await cacheManager.exists("test:key");

				expect(result).toBe(false);
			});
		});

		describe("expire", () => {
			it("should set TTL for existing key", async () => {
				mockRedisClient.expire.mockResolvedValue(true);

				const result = await cacheManager.expire("test:key", 300);

				expect(mockRedisClient.expire).toHaveBeenCalledWith("test:key", 300);
				expect(result).toBe(true);
			});
		});

		describe("getTTL", () => {
			it("should get TTL for key", async () => {
				mockRedisClient.ttl.mockResolvedValue(300);

				const result = await cacheManager.getTTL("test:key");

				expect(mockRedisClient.ttl).toHaveBeenCalledWith("test:key");
				expect(result).toBe(300);
			});
		});

		describe("increment", () => {
			it("should increment numeric value", async () => {
				mockRedisClient.incrBy.mockResolvedValue(5);

				const result = await cacheManager.increment("test:counter", 2);

				expect(mockRedisClient.incrBy).toHaveBeenCalledWith("test:counter", 2);
				expect(result).toBe(5);
			});

			it("should increment by 1 by default", async () => {
				mockRedisClient.incrBy.mockResolvedValue(1);

				await cacheManager.increment("test:counter");

				expect(mockRedisClient.incrBy).toHaveBeenCalledWith("test:counter", 1);
			});
		});

		describe("getMultiple", () => {
			it("should get multiple keys", async () => {
				const keys = ["key1", "key2", "key3"];
				const values = [
					JSON.stringify({ data: 1 }),
					null,
					JSON.stringify({ data: 3 }),
				];
				mockRedisClient.mGet.mockResolvedValue(values);

				const result = await cacheManager.getMultiple(keys);

				expect(mockRedisClient.mGet).toHaveBeenCalledWith(keys);
				expect(result).toEqual([{ data: 1 }, null, { data: 3 }]);
				expect(cacheManager.getStatistics().hitCount).toBe(2);
				expect(cacheManager.getStatistics().missCount).toBe(1);
			});

			it("should return nulls for empty key array", async () => {
				const result = await cacheManager.getMultiple([]);

				expect(result).toEqual([]);
				expect(mockRedisClient.mGet).not.toHaveBeenCalled();
			});
		});

		describe("setMultiple", () => {
			it("should set multiple keys without TTL", async () => {
				const keyValuePairs = {
					key1: { data: 1 },
					key2: { data: 2 },
				};
				mockRedisClient.mSet.mockResolvedValue("OK");

				const result = await cacheManager.setMultiple(keyValuePairs);

				expect(mockRedisClient.mSet).toHaveBeenCalledWith({
					key1: JSON.stringify({ data: 1 }),
					key2: JSON.stringify({ data: 2 }),
				});
				expect(result).toBe(true);
			});

			it("should set multiple keys with TTL", async () => {
				const keyValuePairs = {
					key1: { data: 1 },
					key2: { data: 2 },
				};
				mockRedisClient.mSet.mockResolvedValue("OK");
				mockRedisClient.expire.mockResolvedValue(true);

				const result = await cacheManager.setMultiple(keyValuePairs, 300);

				expect(mockRedisClient.mSet).toHaveBeenCalled();
				expect(mockRedisClient.expire).toHaveBeenCalledTimes(2);
				expect(result).toBe(true);
			});
		});
	});

	describe("cache warming", () => {
		beforeEach(() => {
			(cacheManager as any).client = mockRedisClient;
			(cacheManager as any).isConnected = true;
		});

		it("should warm cache with provided data", async () => {
			const warmingData = [
				{ key: "key1", value: { data: 1 }, ttl: 300 },
				{ key: "key2", value: { data: 2 } },
				{ key: "key3", value: { data: 3 }, ttl: 600 },
			];

			mockRedisClient.setEx.mockResolvedValue("OK");
			mockRedisClient.set.mockResolvedValue("OK");

			const result = await cacheManager.warmCache(warmingData);

			expect(result).toBe(3);
			expect(mockRedisClient.setEx).toHaveBeenCalledTimes(2); // key1 and key3 have TTL
			expect(mockRedisClient.set).toHaveBeenCalledTimes(1); // key2 has no TTL
		});

		it("should handle warming errors gracefully", async () => {
			const warmingData = [
				{ key: "key1", value: { data: 1 } },
				{ key: "key2", value: { data: 2 } },
			];

			mockRedisClient.set
				.mockResolvedValueOnce("OK")
				.mockRejectedValueOnce(new Error("Set failed"));

			const result = await cacheManager.warmCache(warmingData);

			expect(result).toBe(1); // Only one successful
		});
	});

	describe("statistics and monitoring", () => {
		it("should track and return statistics", () => {
			// Simulate some operations
			(cacheManager as any).hitCount = 10;
			(cacheManager as any).missCount = 5;
			(cacheManager as any).errorCount = 2;
			(cacheManager as any).isConnected = true;

			const stats = cacheManager.getStatistics();

			expect(stats.connected).toBe(true);
			expect(stats.hitCount).toBe(10);
			expect(stats.missCount).toBe(5);
			expect(stats.errorCount).toBe(2);
			expect(stats.hitRate).toBe(66.67); // 10/(10+5) * 100
			expect(stats.uptime).toBeGreaterThan(0);
		});

		it("should reset statistics", () => {
			(cacheManager as any).hitCount = 10;
			(cacheManager as any).missCount = 5;
			(cacheManager as any).errorCount = 2;

			cacheManager.resetStatistics();

			const stats = cacheManager.getStatistics();
			expect(stats.hitCount).toBe(0);
			expect(stats.missCount).toBe(0);
			expect(stats.errorCount).toBe(0);
		});
	});

	describe("health check", () => {
		beforeEach(() => {
			(cacheManager as any).client = mockRedisClient;
			(cacheManager as any).isConnected = true;
		});

		it("should perform successful health check", async () => {
			mockRedisClient.ping.mockImplementation(() => {
				// Simulate some latency
				return new Promise((resolve) => setTimeout(() => resolve("PONG"), 1));
			});
			mockRedisClient.info.mockResolvedValue("used_memory_human:2.5M\r\n");
			mockRedisClient.dbSize.mockResolvedValue(100);

			const health = await cacheManager.healthCheck();

			expect(health.connected).toBe(true);
			expect(health.latency).toBeGreaterThan(0);
			expect(health.memoryUsage).toBe("2.5M");
			expect(health.keyCount).toBe(100);
		});

		it("should handle health check failure", async () => {
			mockRedisClient.ping.mockRejectedValue(new Error("Ping failed"));

			const health = await cacheManager.healthCheck();

			expect(health.connected).toBe(false);
		});

		it("should return disconnected when not connected", async () => {
			(cacheManager as any).isConnected = false;

			const health = await cacheManager.healthCheck();

			expect(health.connected).toBe(false);
		});
	});

	describe("utility methods", () => {
		beforeEach(() => {
			(cacheManager as any).client = mockRedisClient;
			(cacheManager as any).isConnected = true;
		});

		it("should flush all cache data", async () => {
			mockRedisClient.flushDb.mockResolvedValue("OK");

			const result = await cacheManager.flush();

			expect(mockRedisClient.flushDb).toHaveBeenCalled();
			expect(result).toBe(true);
		});

		it("should return raw Redis client", () => {
			const client = cacheManager.getClient();
			expect(client).toBe(mockRedisClient);
		});

		it("should check if cache is ready", () => {
			expect(cacheManager.isReady()).toBe(true);

			(cacheManager as any).isConnected = false;
			expect(cacheManager.isReady()).toBe(false);
		});
	});
});
