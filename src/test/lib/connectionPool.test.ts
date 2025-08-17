import { describe, it, expect, beforeEach, vi } from "vitest";
import { DatabaseConnectionPool } from "@/lib/connectionPool";

// Mock the Pool constructor and client
vi.mock("pg", () => {
	const mockPoolClient = {
		query: vi.fn(),
		release: vi.fn(),
	};

	const mockPool = {
		connect: vi.fn().mockResolvedValue(mockPoolClient),
		query: vi.fn(),
		end: vi.fn(),
		totalCount: 5,
		idleCount: 2,
		waitingCount: 0,
		on: vi.fn(),
	};

	return {
		Pool: vi.fn(() => mockPool),
	};
});

// Mock Prisma client
vi.mock("@/generated/prisma", () => {
	const mockPrisma = {
		$queryRaw: vi.fn(),
		$disconnect: vi.fn(),
		$transaction: vi.fn(),
		$on: vi.fn(),
	};

	return {
		PrismaClient: vi.fn(() => mockPrisma),
	};
});

describe("DatabaseConnectionPool", () => {
	let dbPool: DatabaseConnectionPool;
	let mockPool: any;
	let mockPrisma: any;
	let mockPoolClient: any;

	beforeEach(async () => {
		vi.clearAllMocks();

		// Get the mocked instances
		const { Pool } = await import("pg");
		const { PrismaClient } = await import("@/generated/prisma");

		// Reset singleton instance
		(DatabaseConnectionPool as any).instance = undefined;
		dbPool = DatabaseConnectionPool.getInstance();

		// Get mock instances
		mockPool = (Pool as any).mock.results[0].value;
		mockPrisma = (PrismaClient as any).mock.results[0].value;
		mockPoolClient = {
			query: vi.fn(),
			release: vi.fn(),
		};

		mockPool.connect.mockResolvedValue(mockPoolClient);
	});

	describe("singleton pattern", () => {
		it("should return the same instance", () => {
			const pool1 = DatabaseConnectionPool.getInstance();
			const pool2 = DatabaseConnectionPool.getInstance();

			expect(pool1).toBe(pool2);
		});
	});

	describe("pool access", () => {
		it("should return PostgreSQL pool", () => {
			const pool = dbPool.getPool();
			expect(pool).toBeDefined();
		});

		it("should return Prisma client", () => {
			const prisma = dbPool.getPrisma();
			expect(prisma).toBeDefined();
		});
	});

	describe("raw queries", () => {
		it("should execute raw query successfully", async () => {
			const mockResult = { rows: [{ id: 1, name: "test" }] };

			mockPoolClient.query.mockResolvedValue(mockResult);

			const result = await dbPool.query("SELECT * FROM test WHERE id = $1", [
				1,
			]);

			expect(mockPool.connect).toHaveBeenCalled();
			expect(mockPoolClient.query).toHaveBeenCalledWith(
				"SELECT * FROM test WHERE id = $1",
				[1]
			);
			expect(mockPoolClient.release).toHaveBeenCalled();
			expect(result).toEqual(mockResult.rows);
		});

		it("should release client even if query fails", async () => {
			mockPoolClient.query.mockRejectedValue(new Error("Query failed"));

			await expect(dbPool.query("SELECT * FROM test")).rejects.toThrow(
				"Query failed"
			);
			expect(mockPoolClient.release).toHaveBeenCalled();
		});
	});

	describe("transactions", () => {
		it("should execute transaction successfully", async () => {
			const mockResult = { success: true };

			mockPoolClient.query.mockResolvedValue({ rows: [] });

			const callback = vi.fn().mockResolvedValue(mockResult);
			const result = await dbPool.transaction(callback);

			expect(mockPoolClient.query).toHaveBeenCalledWith("BEGIN");
			expect(callback).toHaveBeenCalledWith(mockPoolClient);
			expect(mockPoolClient.query).toHaveBeenCalledWith("COMMIT");
			expect(mockPoolClient.release).toHaveBeenCalled();
			expect(result).toBe(mockResult);
		});

		it("should rollback transaction on error", async () => {
			mockPoolClient.query.mockResolvedValue({ rows: [] });

			const callback = vi
				.fn()
				.mockRejectedValue(new Error("Transaction failed"));

			await expect(dbPool.transaction(callback)).rejects.toThrow(
				"Transaction failed"
			);

			expect(mockPoolClient.query).toHaveBeenCalledWith("BEGIN");
			expect(mockPoolClient.query).toHaveBeenCalledWith("ROLLBACK");
			expect(mockPoolClient.release).toHaveBeenCalled();
		});

		it("should execute Prisma transaction", async () => {
			const mockResult = { data: "test" };
			const callback = vi.fn().mockResolvedValue(mockResult);

			mockPrisma.$transaction.mockImplementation((cb: (arg0: any) => any) =>
				cb(mockPrisma)
			);

			const result = await dbPool.prismaTransaction(callback);

			expect(mockPrisma.$transaction).toHaveBeenCalled();
			expect(result).toBe(mockResult);
		});
	});

	describe("health checks", () => {
		it("should return healthy status when connections work", async () => {
			mockPool.query.mockResolvedValue({ rows: [{ "?column?": 1 }] });
			mockPrisma.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);

			const health = await dbPool.healthCheck();

			expect(health.database).toBe(true);
			expect(health.pool.total).toBe(5);
			expect(health.pool.idle).toBe(2);
			expect(health.pool.waiting).toBe(0);
			expect(health.performance.queryCount).toBeGreaterThanOrEqual(0);
			expect(health.performance.uptime).toBeGreaterThanOrEqual(0);
		});

		it("should return unhealthy status when connections fail", async () => {
			mockPool.query.mockRejectedValue(new Error("Connection failed"));
			mockPrisma.$queryRaw.mockRejectedValue(
				new Error("Prisma connection failed")
			);

			const health = await dbPool.healthCheck();

			expect(health.database).toBe(false);
			expect(health.pool.total).toBe(5);
			expect(health.performance.errorCount).toBeGreaterThanOrEqual(0);
		});
	});

	describe("statistics", () => {
		it("should return pool statistics", () => {
			const stats = dbPool.getPoolStatistics();

			expect(stats).toEqual({
				totalConnections: 5,
				idleConnections: 2,
				waitingClients: 0,
				connectionCount: expect.any(Number),
				queryCount: expect.any(Number),
				errorCount: expect.any(Number),
				uptime: expect.any(Number),
			});
		});

		it("should reset statistics", () => {
			dbPool.resetStatistics();

			const stats = dbPool.getPoolStatistics();
			expect(stats.queryCount).toBe(0);
			expect(stats.errorCount).toBe(0);
		});
	});

	describe("connection management", () => {
		it("should close all connections gracefully", async () => {
			mockPrisma.$disconnect.mockResolvedValue(undefined);
			mockPool.end.mockResolvedValue(undefined);

			await dbPool.close();

			expect(mockPrisma.$disconnect).toHaveBeenCalled();
			expect(mockPool.end).toHaveBeenCalled();
		});

		it("should handle close errors", async () => {
			mockPrisma.$disconnect.mockRejectedValue(new Error("Disconnect failed"));
			mockPool.end.mockRejectedValue(new Error("Pool end failed"));

			await expect(dbPool.close()).rejects.toThrow();
		});
	});
});
