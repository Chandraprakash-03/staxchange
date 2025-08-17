import { ConversionJob, Prisma, PrismaClient } from "@/generated/prisma";
import { RedisClientType } from "redis";
import { BaseRepository, FindManyOptions } from "./base";

/**
 * ConversionJob repository with caching support
 */
export class ConversionJobRepository extends BaseRepository<
	ConversionJob,
	Prisma.ConversionJobCreateInput,
	Prisma.ConversionJobUpdateInput
> {
	constructor(prisma: PrismaClient, redis: RedisClientType | null) {
		super(prisma, redis, "conversion_job", {
			ttl: 180, // 3 minutes for conversion job data (shorter due to frequent updates)
			enabled: true,
		});
	}

	/**
	 * Create a new conversion job
	 */
	async create(data: Prisma.ConversionJobCreateInput): Promise<ConversionJob> {
		const job = await this.prisma.conversionJob.create({
			data,
			include: {
				project: {
					include: {
						user: true,
					},
				},
			},
		});

		// Cache the created job
		await this.setCache(this.getCacheKey(job.id), job);

		// Invalidate project-related caches
		await this.deleteCachePattern(
			this.getCacheKey(`project:${job.projectId}:*`)
		);
		await this.deleteCachePattern(this.getCacheKey(`status:*`));

		return job;
	}

	/**
	 * Find conversion job by ID with caching
	 */
	async findById(id: string): Promise<ConversionJob | null> {
		// Try cache first
		const cacheKey = this.getCacheKey(id);
		const cached = await this.getFromCache<ConversionJob>(cacheKey);
		if (cached) {
			return cached;
		}

		// Fetch from database
		const job = await this.prisma.conversionJob.findUnique({
			where: { id },
			include: {
				project: {
					include: {
						user: true,
					},
				},
			},
		});

		if (job) {
			await this.setCache(cacheKey, job);
		}

		return job;
	}

	/**
	 * Find conversion jobs by project ID with caching
	 */
	async findByProjectId(projectId: string): Promise<ConversionJob[]> {
		// Try cache first
		const cacheKey = this.getCacheKey(`project:${projectId}`, "list");
		const cached = await this.getFromCache<ConversionJob[]>(cacheKey);
		if (cached) {
			return cached;
		}

		// Fetch from database
		const jobs = await this.prisma.conversionJob.findMany({
			where: { projectId },
			include: {
				project: {
					include: {
						user: true,
					},
				},
			},
			orderBy: { createdAt: "desc" },
		});

		// Cache with shorter TTL for job lists
		await this.setCache(cacheKey, jobs);

		return jobs;
	}

	/**
	 * Find conversion jobs by status with caching
	 */
	async findByStatus(status: string): Promise<ConversionJob[]> {
		// Try cache first
		const cacheKey = this.getCacheKey(`status:${status}`, "list");
		const cached = await this.getFromCache<ConversionJob[]>(cacheKey);
		if (cached) {
			return cached;
		}

		// Fetch from database
		const jobs = await this.prisma.conversionJob.findMany({
			where: { status },
			include: {
				project: {
					include: {
						user: true,
					},
				},
			},
			orderBy: { createdAt: "desc" },
		});

		// Cache with very short TTL for status-based queries (they change frequently)
		await this.setCache(cacheKey, jobs);

		return jobs;
	}

	/**
	 * Find active conversion jobs (running or pending)
	 */
	async findActive(): Promise<ConversionJob[]> {
		// Don't cache active jobs as they change frequently
		return await this.prisma.conversionJob.findMany({
			where: {
				status: {
					in: ["pending", "running"],
				},
			},
			include: {
				project: {
					include: {
						user: true,
					},
				},
			},
			orderBy: { createdAt: "asc" },
		});
	}

	/**
	 * Update conversion job with cache invalidation
	 */
	async update(
		id: string,
		data: Prisma.ConversionJobUpdateInput
	): Promise<ConversionJob | null> {
		try {
			const job = await this.prisma.conversionJob.update({
				where: { id },
				data,
				include: {
					project: {
						include: {
							user: true,
						},
					},
				},
			});

			// Update cache
			await this.setCache(this.getCacheKey(id), job);

			// Invalidate related caches
			await this.deleteCachePattern(
				this.getCacheKey(`project:${job.projectId}:*`)
			);
			await this.deleteCachePattern(this.getCacheKey(`status:*`));

			return job;
		} catch (error) {
			if (
				error instanceof Prisma.PrismaClientKnownRequestError &&
				error.code === "P2025"
			) {
				return null; // Job not found
			}
			throw error;
		}
	}

	/**
	 * Update job progress with optimized caching
	 */
	async updateProgress(
		id: string,
		progress: number,
		currentTask?: string
	): Promise<ConversionJob | null> {
		const updateData: Prisma.ConversionJobUpdateInput = {
			progress: Math.max(0, Math.min(100, progress)),
		};

		if (currentTask) {
			updateData.currentTask = currentTask;
		}

		// For progress updates, we update the database but don't invalidate all caches
		// to avoid excessive cache churn during active conversions
		const job = await this.update(id, updateData);

		if (job) {
			// Only update the individual job cache, not lists
			await this.setCache(this.getCacheKey(id), job);
		}

		return job;
	}

	/**
	 * Mark job as started
	 */
	async markAsStarted(id: string): Promise<ConversionJob | null> {
		return this.update(id, {
			status: "running",
			startedAt: new Date(),
			progress: 0,
		});
	}

	/**
	 * Mark job as completed
	 */
	async markAsCompleted(
		id: string,
		results?: any
	): Promise<ConversionJob | null> {
		const updateData: Prisma.ConversionJobUpdateInput = {
			status: "completed",
			completedAt: new Date(),
			progress: 100,
			currentTask: null,
		};

		if (results) {
			updateData.results = results;
		}

		return this.update(id, updateData);
	}

	/**
	 * Mark job as failed
	 */
	async markAsFailed(
		id: string,
		errorMessage: string
	): Promise<ConversionJob | null> {
		return this.update(id, {
			status: "failed",
			completedAt: new Date(),
			errorMessage,
		});
	}

	/**
	 * Delete conversion job with cache cleanup
	 */
	async delete(id: string): Promise<boolean> {
		try {
			// Get job first to clean up related caches
			const job = await this.prisma.conversionJob.findUnique({ where: { id } });

			await this.prisma.conversionJob.delete({ where: { id } });

			// Clean up cache
			await this.deleteFromCache(this.getCacheKey(id));
			if (job) {
				await this.deleteCachePattern(
					this.getCacheKey(`project:${job.projectId}:*`)
				);
				await this.deleteCachePattern(this.getCacheKey(`status:*`));
			}

			return true;
		} catch (error) {
			if (
				error instanceof Prisma.PrismaClientKnownRequestError &&
				error.code === "P2025"
			) {
				return false; // Job not found
			}
			throw error;
		}
	}

	/**
	 * Find multiple conversion jobs (typically not cached due to variability)
	 */
	async findMany(options: FindManyOptions = {}): Promise<ConversionJob[]> {
		return await this.prisma.conversionJob.findMany({
			where: options.where,
			orderBy: options.orderBy || { createdAt: "desc" },
			take: options.take,
			skip: options.skip,
			include: options.include || {
				project: {
					include: {
						user: true,
					},
				},
			},
		});
	}

	/**
	 * Count conversion jobs
	 */
	async count(where?: Prisma.ConversionJobWhereInput): Promise<number> {
		return await this.prisma.conversionJob.count({ where });
	}

	/**
	 * Get conversion job statistics with caching
	 */
	async getStatistics(
		projectId?: string
	): Promise<{ total: number; byStatus: Record<string, number> }> {
		const cacheKey = projectId
			? this.getCacheKey(`project:${projectId}`, "stats")
			: this.getCacheKey("stats", "global");

		const cached = await this.getFromCache<{
			total: number;
			byStatus: Record<string, number>;
		}>(cacheKey);
		if (cached) {
			return cached;
		}

		const whereClause = projectId ? { projectId } : {};

		const [total, byStatus] = await Promise.all([
			this.prisma.conversionJob.count({ where: whereClause }),
			this.prisma.conversionJob.groupBy({
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

		// Cache stats with shorter TTL
		await this.setCache(cacheKey, stats);
		return stats;
	}

	/**
	 * Find jobs with recent activity
	 */
	async findRecentlyUpdated(
		projectId?: string,
		hours: number = 24
	): Promise<ConversionJob[]> {
		const cutoffDate = new Date();
		cutoffDate.setHours(cutoffDate.getHours() - hours);

		const whereClause: Prisma.ConversionJobWhereInput = {
			OR: [
				{
					createdAt: {
						gte: cutoffDate,
					},
				},
				{
					startedAt: {
						gte: cutoffDate,
					},
				},
				{
					completedAt: {
						gte: cutoffDate,
					},
				},
			],
		};

		if (projectId) {
			whereClause.projectId = projectId;
		}

		return await this.prisma.conversionJob.findMany({
			where: whereClause,
			include: {
				project: {
					include: {
						user: true,
					},
				},
			},
			orderBy: { createdAt: "desc" },
		});
	}

	/**
	 * Clean up old completed/failed jobs
	 */
	async cleanupOldJobs(daysOld: number = 30): Promise<number> {
		const cutoffDate = new Date();
		cutoffDate.setDate(cutoffDate.getDate() - daysOld);

		const result = await this.prisma.conversionJob.deleteMany({
			where: {
				createdAt: {
					lt: cutoffDate,
				},
				status: {
					in: ["completed", "failed"],
				},
			},
		});

		// Invalidate all caches after cleanup
		await this.deleteCachePattern(this.getCacheKey("*"));

		return result.count;
	}

	/**
	 * Invalidate all job-related cache entries for a project
	 */
	async invalidateProjectJobCache(projectId: string): Promise<void> {
		await this.deleteCachePattern(this.getCacheKey(`project:${projectId}:*`));
		await this.deleteCachePattern(this.getCacheKey(`status:*`));
		await this.deleteFromCache(this.getCacheKey("stats", "global"));
	}

	/**
	 * Invalidate job cache by ID
	 */
	async invalidateJobCache(jobId: string): Promise<void> {
		const job = await this.prisma.conversionJob.findUnique({
			where: { id: jobId },
		});

		await this.deleteFromCache(this.getCacheKey(jobId));
		if (job) {
			await this.invalidateProjectJobCache(job.projectId);
		}
	}
}
