import { User, Prisma, PrismaClient } from "@/generated/prisma";
import { RedisClientType } from "redis";
import { BaseRepository, FindManyOptions } from "./base";

/**
 * User repository with caching support
 */
export class UserRepository extends BaseRepository<
	User,
	Prisma.UserCreateInput,
	Prisma.UserUpdateInput
> {
	constructor(prisma: PrismaClient, redis: RedisClientType | null) {
		super(prisma, redis, "user", {
			ttl: 600, // 10 minutes for user data
			enabled: true,
		});
	}

	/**
	 * Create a new user
	 */
	async create(data: Prisma.UserCreateInput): Promise<User> {
		const user = await this.prisma.user.create({
			data,
			include: {
				projects: true,
			},
		});

		// Cache the created user
		await this.setCache(this.getCacheKey(user.id), user);

		// Also cache by GitHub ID for faster lookups
		await this.setCache(this.getCacheKey(user.githubId, "github"), user);

		return user;
	}

	/**
	 * Find user by ID with caching
	 */
	async findById(id: string): Promise<User | null> {
		// Try cache first
		const cacheKey = this.getCacheKey(id);
		const cached = await this.getFromCache<User>(cacheKey);
		if (cached) {
			return cached;
		}

		// Fetch from database
		const user = await this.prisma.user.findUnique({
			where: { id },
			include: {
				projects: {
					orderBy: { createdAt: "desc" },
					take: 10, // Limit to recent projects for caching
				},
			},
		});

		if (user) {
			await this.setCache(cacheKey, user);
		}

		return user;
	}

	/**
	 * Find user by GitHub ID with caching
	 */
	async findByGithubId(githubId: string): Promise<User | null> {
		// Try cache first
		const cacheKey = this.getCacheKey(githubId, "github");
		const cached = await this.getFromCache<User>(cacheKey);
		if (cached) {
			return cached;
		}

		// Fetch from database
		const user = await this.prisma.user.findUnique({
			where: { githubId },
			include: {
				projects: {
					orderBy: { createdAt: "desc" },
					take: 10,
				},
			},
		});

		if (user) {
			await this.setCache(cacheKey, user);
			// Also cache by ID
			await this.setCache(this.getCacheKey(user.id), user);
		}

		return user;
	}

	/**
	 * Update user with cache invalidation
	 */
	async update(id: string, data: Prisma.UserUpdateInput): Promise<User | null> {
		try {
			const user = await this.prisma.user.update({
				where: { id },
				data,
				include: {
					projects: {
						orderBy: { createdAt: "desc" },
						take: 10,
					},
				},
			});

			// Update cache
			await this.setCache(this.getCacheKey(id), user);
			await this.setCache(this.getCacheKey(user.githubId, "github"), user);

			return user;
		} catch (error) {
			if (
				error instanceof Prisma.PrismaClientKnownRequestError &&
				error.code === "P2025"
			) {
				return null; // User not found
			}
			throw error;
		}
	}

	/**
	 * Delete user with cache cleanup
	 */
	async delete(id: string): Promise<boolean> {
		try {
			// Get user first to clean up GitHub ID cache
			const user = await this.prisma.user.findUnique({ where: { id } });

			await this.prisma.user.delete({ where: { id } });

			// Clean up cache
			await this.deleteFromCache(this.getCacheKey(id));
			if (user) {
				await this.deleteFromCache(this.getCacheKey(user.githubId, "github"));
			}

			return true;
		} catch (error) {
			if (
				error instanceof Prisma.PrismaClientKnownRequestError &&
				error.code === "P2025"
			) {
				return false; // User not found
			}
			throw error;
		}
	}

	/**
	 * Find multiple users (typically not cached due to variability)
	 */
	async findMany(options: FindManyOptions = {}): Promise<User[]> {
		return await this.prisma.user.findMany({
			where: options.where,
			orderBy: options.orderBy || { createdAt: "desc" },
			take: options.take,
			skip: options.skip,
			include: options.include || {
				projects: {
					orderBy: { createdAt: "desc" },
					take: 5,
				},
			},
		});
	}

	/**
	 * Count users
	 */
	async count(where?: Prisma.UserWhereInput): Promise<number> {
		return await this.prisma.user.count({ where });
	}

	/**
	 * Get user statistics with caching
	 */
	async getStatistics(): Promise<{ total: number; recentlyActive: number }> {
		const cacheKey = this.getCacheKey("stats", "global");
		const cached = await this.getFromCache<{
			total: number;
			recentlyActive: number;
		}>(cacheKey);
		if (cached) {
			return cached;
		}

		const thirtyDaysAgo = new Date();
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

		const [total, recentlyActive] = await Promise.all([
			this.prisma.user.count(),
			this.prisma.user.count({
				where: {
					updatedAt: {
						gte: thirtyDaysAgo,
					},
				},
			}),
		]);

		const stats = { total, recentlyActive };
		await this.setCache(cacheKey, stats);

		return stats;
	}

	/**
	 * Find users with recent activity
	 */
	async findRecentlyActive(days: number = 7): Promise<User[]> {
		const cutoffDate = new Date();
		cutoffDate.setDate(cutoffDate.getDate() - days);

		return await this.prisma.user.findMany({
			where: {
				updatedAt: {
					gte: cutoffDate,
				},
			},
			include: {
				projects: {
					where: {
						updatedAt: {
							gte: cutoffDate,
						},
					},
					orderBy: { updatedAt: "desc" },
				},
			},
			orderBy: { updatedAt: "desc" },
		});
	}

	/**
	 * Invalidate all user-related cache entries
	 */
	async invalidateUserCache(userId: string): Promise<void> {
		const user = await this.prisma.user.findUnique({ where: { id: userId } });

		await this.deleteFromCache(this.getCacheKey(userId));
		if (user) {
			await this.deleteFromCache(this.getCacheKey(user.githubId, "github"));
		}

		// Also invalidate stats cache
		await this.deleteFromCache(this.getCacheKey("stats", "global"));
	}
}
