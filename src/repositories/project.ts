import { Project, Prisma, PrismaClient } from "@/generated/prisma";
import { RedisClientType } from "redis";
import { BaseRepository, FindManyOptions } from "./base";

/**
 * Project repository with caching support
 */
export class ProjectRepository extends BaseRepository<
	Project,
	Prisma.ProjectCreateInput,
	Prisma.ProjectUpdateInput
> {
	constructor(prisma: PrismaClient, redis: RedisClientType | null) {
		super(prisma, redis, "project", {
			ttl: 300, // 5 minutes for project data
			enabled: true,
		});
	}

	/**
	 * Create a new project
	 */
	async create(data: Prisma.ProjectCreateInput): Promise<Project> {
		const project = await this.prisma.project.create({
			data,
			include: {
				user: true,
				conversionJobs: {
					orderBy: { createdAt: "desc" },
				},
			},
		});

		// Cache the created project
		await this.setCache(this.getCacheKey(project.id), project);

		// Invalidate user's project list cache
		await this.deleteCachePattern(this.getCacheKey(`user:${project.userId}:*`));

		return project;
	}

	/**
	 * Find project by ID with caching
	 */
	async findById(id: string): Promise<Project | null> {
		// Try cache first
		const cacheKey = this.getCacheKey(id);
		const cached = await this.getFromCache<Project>(cacheKey);
		if (cached) {
			return cached;
		}

		// Fetch from database
		const project = await this.prisma.project.findUnique({
			where: { id },
			include: {
				user: true,
				conversionJobs: {
					orderBy: { createdAt: "desc" },
				},
			},
		});

		if (project) {
			await this.setCache(cacheKey, project);
		}

		return project;
	}

	/**
	 * Find projects by user ID with caching
	 */
	async findByUserId(userId: string): Promise<Project[]> {
		// Try cache first
		const cacheKey = this.getCacheKey(`user:${userId}`, "list");
		const cached = await this.getFromCache<Project[]>(cacheKey);
		if (cached) {
			return cached;
		}

		// Fetch from database
		const projects = await this.prisma.project.findMany({
			where: { userId },
			include: {
				user: true,
				conversionJobs: {
					orderBy: { createdAt: "desc" },
					take: 1, // Only get the latest conversion job
				},
			},
			orderBy: { createdAt: "desc" },
		});

		// Cache the result
		await this.setCache(cacheKey, projects);

		return projects;
	}

	/**
	 * Find projects by status with caching
	 */
	async findByStatus(status: string): Promise<Project[]> {
		// Try cache first
		const cacheKey = this.getCacheKey(`status:${status}`, "list");
		const cached = await this.getFromCache<Project[]>(cacheKey);
		if (cached) {
			return cached;
		}

		// Fetch from database
		const projects = await this.prisma.project.findMany({
			where: { status },
			include: {
				user: true,
				conversionJobs: {
					orderBy: { createdAt: "desc" },
					take: 1,
				},
			},
			orderBy: { createdAt: "desc" },
		});

		// Cache with shorter TTL for status-based queries
		await this.setCache(cacheKey, projects);

		return projects;
	}

	/**
	 * Update project with cache invalidation
	 */
	async update(
		id: string,
		data: Prisma.ProjectUpdateInput
	): Promise<Project | null> {
		try {
			const project = await this.prisma.project.update({
				where: { id },
				data,
				include: {
					user: true,
					conversionJobs: {
						orderBy: { createdAt: "desc" },
					},
				},
			});

			// Update cache
			await this.setCache(this.getCacheKey(id), project);

			// Invalidate related caches
			await this.deleteCachePattern(
				this.getCacheKey(`user:${project.userId}:*`)
			);
			await this.deleteCachePattern(this.getCacheKey(`status:*`));

			return project;
		} catch (error) {
			if (
				error instanceof Prisma.PrismaClientKnownRequestError &&
				error.code === "P2025"
			) {
				return null; // Project not found
			}
			throw error;
		}
	}

	/**
	 * Delete project with cache cleanup
	 */
	async delete(id: string): Promise<boolean> {
		try {
			// Get project first to clean up related caches
			const project = await this.prisma.project.findUnique({ where: { id } });

			await this.prisma.project.delete({ where: { id } });

			// Clean up cache
			await this.deleteFromCache(this.getCacheKey(id));
			if (project) {
				await this.deleteCachePattern(
					this.getCacheKey(`user:${project.userId}:*`)
				);
				await this.deleteCachePattern(this.getCacheKey(`status:*`));
			}

			return true;
		} catch (error) {
			if (
				error instanceof Prisma.PrismaClientKnownRequestError &&
				error.code === "P2025"
			) {
				return false; // Project not found
			}
			throw error;
		}
	}

	/**
	 * Find multiple projects (typically not cached due to variability)
	 */
	async findMany(options: FindManyOptions = {}): Promise<Project[]> {
		return await this.prisma.project.findMany({
			where: options.where,
			orderBy: options.orderBy || { createdAt: "desc" },
			take: options.take,
			skip: options.skip,
			include: options.include || {
				user: true,
				conversionJobs: {
					orderBy: { createdAt: "desc" },
					take: 1,
				},
			},
		});
	}

	/**
	 * Count projects
	 */
	async count(where?: Prisma.ProjectWhereInput): Promise<number> {
		return await this.prisma.project.count({ where });
	}

	/**
	 * Get project statistics with caching
	 */
	async getStatistics(
		userId?: string
	): Promise<{ total: number; byStatus: Record<string, number> }> {
		const cacheKey = userId
			? this.getCacheKey(`user:${userId}`, "stats")
			: this.getCacheKey("stats", "global");

		const cached = await this.getFromCache<{
			total: number;
			byStatus: Record<string, number>;
		}>(cacheKey);
		if (cached) {
			return cached;
		}

		const whereClause = userId ? { userId } : {};

		const [total, byStatus] = await Promise.all([
			this.prisma.project.count({ where: whereClause }),
			this.prisma.project.groupBy({
				by: ["status"],
				where: whereClause,
				_count: {
					status: true,
				},
			}),
		]);

		const stats = {
			total,
			byStatus: byStatus.reduce((acc, item) => {
				acc[item.status] = item._count.status;
				return acc;
			}, {} as Record<string, number>),
		};

		await this.setCache(cacheKey, stats);
		return stats;
	}

	/**
	 * Find projects with recent activity
	 */
	async findRecentlyUpdated(
		userId?: string,
		days: number = 7
	): Promise<Project[]> {
		const cutoffDate = new Date();
		cutoffDate.setDate(cutoffDate.getDate() - days);

		const whereClause: Prisma.ProjectWhereInput = {
			updatedAt: {
				gte: cutoffDate,
			},
		};

		if (userId) {
			whereClause.userId = userId;
		}

		return await this.prisma.project.findMany({
			where: whereClause,
			include: {
				user: true,
				conversionJobs: {
					orderBy: { createdAt: "desc" },
					take: 1,
				},
			},
			orderBy: { updatedAt: "desc" },
		});
	}

	/**
	 * Search projects by name or GitHub URL
	 */
	async search(query: string, userId?: string): Promise<Project[]> {
		const whereClause: Prisma.ProjectWhereInput = {
			OR: [
				{
					name: {
						contains: query,
						mode: "insensitive",
					},
				},
				{
					githubUrl: {
						contains: query,
						mode: "insensitive",
					},
				},
			],
		};

		if (userId) {
			whereClause.userId = userId;
		}

		return await this.prisma.project.findMany({
			where: whereClause,
			include: {
				user: true,
				conversionJobs: {
					orderBy: { createdAt: "desc" },
					take: 1,
				},
			},
			orderBy: { createdAt: "desc" },
			take: 20, // Limit search results
		});
	}

	/**
	 * Invalidate all project-related cache entries for a user
	 */
	async invalidateUserProjectCache(userId: string): Promise<void> {
		await this.deleteCachePattern(this.getCacheKey(`user:${userId}:*`));
		await this.deleteCachePattern(this.getCacheKey(`status:*`));
		await this.deleteFromCache(this.getCacheKey("stats", "global"));
	}

	/**
	 * Invalidate project cache by ID
	 */
	async invalidateProjectCache(projectId: string): Promise<void> {
		const project = await this.prisma.project.findUnique({
			where: { id: projectId },
		});

		await this.deleteFromCache(this.getCacheKey(projectId));
		if (project) {
			await this.invalidateUserProjectCache(project.userId);
		}
	}
}
