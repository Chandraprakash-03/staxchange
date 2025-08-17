import { describe, it, expect, beforeEach, vi } from "vitest";
import { UserRepository } from "@/repositories/user";
import { PrismaClient } from "@/generated/prisma";
import { RedisClientType } from "redis";

// Mock the Prisma module at the top level
vi.mock("@/generated/prisma", () => {
	// Mock Prisma error class
	class MockPrismaClientKnownRequestError extends Error {
		code: string;
		constructor(message: string, code: string) {
			super(message);
			this.code = code;
		}
	}

	return {
		PrismaClient: vi.fn(),
		Prisma: {
			PrismaClientKnownRequestError: MockPrismaClientKnownRequestError,
		},
	};
});

// Mock Prisma client
const mockPrisma = {
	user: {
		create: vi.fn(),
		findUnique: vi.fn(),
		update: vi.fn(),
		delete: vi.fn(),
		findMany: vi.fn(),
		count: vi.fn(),
		groupBy: vi.fn(),
	},
	$queryRaw: vi.fn(),
} as unknown as PrismaClient;

// Mock Redis client
const mockRedis = {
	get: vi.fn(),
	setEx: vi.fn(),
	set: vi.fn(),
	del: vi.fn(),
	keys: vi.fn(),
	ping: vi.fn(),
} as unknown as RedisClientType;

describe("UserRepository", () => {
	let userRepository: UserRepository;

	beforeEach(async () => {
		vi.clearAllMocks();
		userRepository = new UserRepository(mockPrisma, mockRedis);
	});

	describe("create", () => {
		it("should create a user and cache the result", async () => {
			const userData = {
				githubId: "test-github-id",
				username: "testuser",
				email: "test@example.com",
			};

			const createdUser = {
				id: "user-id-1",
				...userData,
				avatarUrl: null,
				accessToken: null,
				createdAt: new Date(),
				updatedAt: new Date(),
				projects: [],
			};

			mockPrisma.user.create.mockResolvedValue(createdUser);
			mockRedis.setEx.mockResolvedValue("OK");

			const result = await userRepository.create(userData);

			expect(mockPrisma.user.create).toHaveBeenCalledWith({
				data: userData,
				include: { projects: true },
			});
			expect(result).toEqual(createdUser);
			expect(mockRedis.setEx).toHaveBeenCalledTimes(2); // Cache by ID and GitHub ID
		});
	});

	describe("findById", () => {
		it("should return cached user if available", async () => {
			const userId = "user-id-1";
			const cachedUser = {
				id: userId,
				githubId: "test-github-id",
				username: "testuser",
				email: "test@example.com",
				projects: [],
			};

			mockRedis.get.mockResolvedValue(JSON.stringify(cachedUser));

			const result = await userRepository.findById(userId);

			expect(mockRedis.get).toHaveBeenCalledWith(`user:${userId}`);
			expect(result).toEqual(cachedUser);
			expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
		});

		it("should fetch from database and cache if not in cache", async () => {
			const userId = "user-id-1";
			const dbUser = {
				id: userId,
				githubId: "test-github-id",
				username: "testuser",
				email: "test@example.com",
				avatarUrl: null,
				accessToken: null,
				createdAt: new Date(),
				updatedAt: new Date(),
				projects: [],
			};

			mockRedis.get.mockResolvedValue(null); // Cache miss
			mockPrisma.user.findUnique.mockResolvedValue(dbUser);
			mockRedis.setEx.mockResolvedValue("OK");

			const result = await userRepository.findById(userId);

			expect(mockRedis.get).toHaveBeenCalledWith(`user:${userId}`);
			expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
				where: { id: userId },
				include: {
					projects: {
						orderBy: { createdAt: "desc" },
						take: 10,
					},
				},
			});
			expect(mockRedis.setEx).toHaveBeenCalled();
			expect(result).toEqual(dbUser);
		});

		it("should return null if user not found", async () => {
			const userId = "non-existent-id";

			mockRedis.get.mockResolvedValue(null);
			mockPrisma.user.findUnique.mockResolvedValue(null);

			const result = await userRepository.findById(userId);

			expect(result).toBeNull();
			expect(mockRedis.setEx).not.toHaveBeenCalled();
		});
	});

	describe("update", () => {
		it("should update user and refresh cache", async () => {
			const userId = "user-id-1";
			const updateData = { username: "updateduser" };
			const updatedUser = {
				id: userId,
				githubId: "test-github-id",
				username: "updateduser",
				email: "test@example.com",
				avatarUrl: null,
				accessToken: null,
				createdAt: new Date(),
				updatedAt: new Date(),
				projects: [],
			};

			mockPrisma.user.update.mockResolvedValue(updatedUser);
			mockRedis.setEx.mockResolvedValue("OK");

			const result = await userRepository.update(userId, updateData);

			expect(mockPrisma.user.update).toHaveBeenCalledWith({
				where: { id: userId },
				data: updateData,
				include: {
					projects: {
						orderBy: { createdAt: "desc" },
						take: 10,
					},
				},
			});
			expect(mockRedis.setEx).toHaveBeenCalledTimes(2); // Update both caches
			expect(result).toEqual(updatedUser);
		});

		it("should return null if user not found", async () => {
			const userId = "non-existent-id";
			const updateData = { username: "updateduser" };

			// Import the mocked Prisma to get the error class
			const { Prisma } = await import("@/generated/prisma");
			const error = new Prisma.PrismaClientKnownRequestError(
				"User not found",
				"P2025"
			);
			mockPrisma.user.update.mockRejectedValue(error);

			const result = await userRepository.update(userId, updateData);

			expect(result).toBeNull();
		});
	});

	describe("delete", () => {
		it("should delete user and clear cache", async () => {
			const userId = "user-id-1";
			const user = {
				id: userId,
				githubId: "test-github-id",
				username: "testuser",
				email: "test@example.com",
			};

			mockPrisma.user.findUnique.mockResolvedValue(user);
			mockPrisma.user.delete.mockResolvedValue(user);
			mockRedis.del.mockResolvedValue(1);

			const result = await userRepository.delete(userId);

			expect(mockPrisma.user.delete).toHaveBeenCalledWith({
				where: { id: userId },
			});
			expect(mockRedis.del).toHaveBeenCalledTimes(2); // Delete both cache keys
			expect(result).toBe(true);
		});

		it("should return false if user not found", async () => {
			const userId = "non-existent-id";

			// Import the mocked Prisma to get the error class
			const { Prisma } = await import("@/generated/prisma");
			const error = new Prisma.PrismaClientKnownRequestError(
				"User not found",
				"P2025"
			);
			mockPrisma.user.delete.mockRejectedValue(error);

			const result = await userRepository.delete(userId);

			expect(result).toBe(false);
		});
	});

	describe("count", () => {
		it("should count users", async () => {
			mockPrisma.user.count.mockResolvedValue(42);

			const result = await userRepository.count();

			expect(mockPrisma.user.count).toHaveBeenCalledWith({ where: undefined });
			expect(result).toBe(42);
		});
	});

	describe("healthCheck", () => {
		it("should return health status for database and cache", async () => {
			mockPrisma.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);
			mockRedis.ping.mockResolvedValue("PONG");

			const result = await userRepository.healthCheck();

			expect(result.database).toBe(true);
			expect(result.cache).toBe(true);
		});
	});
});
