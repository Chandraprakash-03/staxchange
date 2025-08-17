/**
 * Monitoring Service
 * Provides system monitoring, metrics collection, and health status tracking
 */

import { logger, LogMetadata } from "@/utils/logger";
import { redis } from "@/lib/redis";
import { prisma } from "@/lib/prisma";

export interface SystemMetrics {
	timestamp: string;
	cpu: {
		usage: number;
		loadAverage: number[];
	};
	memory: {
		used: number;
		total: number;
		percentage: number;
		heapUsed: number;
		heapTotal: number;
	};
	uptime: number;
	activeConnections: number;
	requestsPerMinute: number;
	errorRate: number;
	responseTime: {
		avg: number;
		p95: number;
		p99: number;
	};
}

export interface ServiceHealth {
	name: string;
	status: "healthy" | "degraded" | "unhealthy";
	lastCheck: string;
	responseTime: number;
	message?: string;
	details?: Record<string, any>;
}

export interface ConversionMetrics {
	totalConversions: number;
	activeConversions: number;
	completedConversions: number;
	failedConversions: number;
	averageConversionTime: number;
	conversionsByTechStack: Record<string, number>;
	errorsByType: Record<string, number>;
}

class MonitoringService {
	private metricsHistory: SystemMetrics[] = [];
	private serviceHealthCache: Map<string, ServiceHealth> = new Map();
	private readonly METRICS_RETENTION_HOURS = 24;
	private readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds

	constructor() {
		this.startHealthChecks();
		this.startMetricsCollection();
	}

	/**
	 * Get current system metrics
	 */
	async getSystemMetrics(): Promise<SystemMetrics> {
		const memUsage = process.memoryUsage();
		const cpuUsage = process.cpuUsage();

		// Get request metrics from global state
		const requestMetrics = this.getRequestMetrics();

		const metrics: SystemMetrics = {
			timestamp: new Date().toISOString(),
			cpu: {
				usage: this.calculateCpuUsage(cpuUsage),
				loadAverage:
					process.platform !== "win32" ? require("os").loadavg() : [0, 0, 0],
			},
			memory: {
				used: memUsage.rss,
				total: require("os").totalmem(),
				percentage: (memUsage.rss / require("os").totalmem()) * 100,
				heapUsed: memUsage.heapUsed,
				heapTotal: memUsage.heapTotal,
			},
			uptime: process.uptime(),
			activeConnections: this.getActiveConnections(),
			requestsPerMinute: requestMetrics.requestsPerMinute,
			errorRate: requestMetrics.errorRate,
			responseTime: requestMetrics.responseTime,
		};

		// Store metrics for historical data
		this.metricsHistory.push(metrics);
		this.cleanupOldMetrics();

		return metrics;
	}

	/**
	 * Get health status of all services
	 */
	async getServicesHealth(): Promise<ServiceHealth[]> {
		const services = ["database", "redis", "ai-service", "file-system"];
		const healthChecks = await Promise.allSettled(
			services.map((service) => this.checkServiceHealth(service))
		);

		return healthChecks.map((result, index) => {
			if (result.status === "fulfilled") {
				return result.value;
			} else {
				return {
					name: services[index],
					status: "unhealthy" as const,
					lastCheck: new Date().toISOString(),
					responseTime: 0,
					message: result.reason?.message || "Health check failed",
				};
			}
		});
	}

	/**
	 * Get conversion-specific metrics
	 */
	async getConversionMetrics(): Promise<ConversionMetrics> {
		try {
			const [
				totalConversions,
				activeConversions,
				completedConversions,
				failedConversions,
				avgConversionTime,
				conversionsByTechStack,
			] = await Promise.all([
				prisma.conversionJob.count(),
				prisma.conversionJob.count({ where: { status: "running" } }),
				prisma.conversionJob.count({ where: { status: "completed" } }),
				prisma.conversionJob.count({ where: { status: "failed" } }),
				this.getAverageConversionTime(),
				this.getConversionsByTechStack(),
			]);

			const errorsByType = this.getErrorsByType();

			return {
				totalConversions,
				activeConversions,
				completedConversions,
				failedConversions,
				averageConversionTime: avgConversionTime,
				conversionsByTechStack,
				errorsByType,
			};
		} catch (error) {
			logger.error("Failed to get conversion metrics", { error });
			return {
				totalConversions: 0,
				activeConversions: 0,
				completedConversions: 0,
				failedConversions: 0,
				averageConversionTime: 0,
				conversionsByTechStack: {},
				errorsByType: {},
			};
		}
	}

	/**
	 * Get historical metrics for dashboard charts
	 */
	getMetricsHistory(hours: number = 1): SystemMetrics[] {
		const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
		return this.metricsHistory.filter(
			(metric) => new Date(metric.timestamp) > cutoff
		);
	}

	/**
	 * Record a performance event
	 */
	recordPerformanceEvent(
		operation: string,
		duration: number,
		metadata?: LogMetadata
	): void {
		logger.performance(operation, duration, metadata);

		// Store in Redis for real-time monitoring
		this.storePerformanceEvent(operation, duration, metadata).catch((error) => {
			logger.warn("Failed to store performance event in Redis", {
				error,
				operation,
			});
		});
	}

	/**
	 * Record an error event
	 */
	recordError(error: Error, context?: LogMetadata): void {
		logger.error(error.message, { error, ...context });

		// Store error for monitoring dashboard
		this.storeErrorEvent(error, context).catch((err) => {
			logger.warn("Failed to store error event", { error: err });
		});
	}

	/**
	 * Check health of individual service
	 */
	private async checkServiceHealth(
		serviceName: string
	): Promise<ServiceHealth> {
		const startTime = Date.now();

		try {
			let status: "healthy" | "degraded" | "unhealthy" = "healthy";
			let message = "Service is healthy";
			let details: Record<string, any> = {};

			switch (serviceName) {
				case "database":
					await prisma.$queryRaw`SELECT 1`;
					const dbConnections = await this.getDatabaseConnections();
					if (dbConnections > 80) {
						status = "degraded";
						message = "High database connection count";
					}
					details = { connections: dbConnections };
					break;

				case "redis":
					try {
						const pingResult = await redis.ping();
						if (pingResult !== "PONG") {
							status = "unhealthy";
							message = "Redis ping failed";
						}
						const redisInfo = await redis.info("memory");
						details = { memory: redisInfo };
					} catch (error) {
						status = "unhealthy";
						message =
							error instanceof Error
								? error.message
								: "Redis connection failed";
					}
					break;

				case "ai-service":
					// Check AI service availability (mock check)
					const aiHealthy = await this.checkAIServiceHealth();
					if (!aiHealthy) {
						status = "degraded";
						message = "AI service experiencing delays";
					}
					break;

				case "file-system":
					// Check file system space
					const fsStats = await this.getFileSystemStats();
					if (fsStats.usagePercentage > 90) {
						status = "degraded";
						message = "Low disk space";
					}
					details = fsStats;
					break;
			}

			const responseTime = Date.now() - startTime;
			const health: ServiceHealth = {
				name: serviceName,
				status,
				lastCheck: new Date().toISOString(),
				responseTime,
				message,
				details,
			};

			this.serviceHealthCache.set(serviceName, health);
			return health;
		} catch (error) {
			const responseTime = Date.now() - startTime;
			const health: ServiceHealth = {
				name: serviceName,
				status: "unhealthy",
				lastCheck: new Date().toISOString(),
				responseTime,
				message: error instanceof Error ? error.message : "Unknown error",
			};

			this.serviceHealthCache.set(serviceName, health);
			return health;
		}
	}

	private startHealthChecks(): void {
		setInterval(async () => {
			try {
				await this.getServicesHealth();
			} catch (error) {
				logger.error("Health check cycle failed", { error });
			}
		}, this.HEALTH_CHECK_INTERVAL);
	}

	private startMetricsCollection(): void {
		setInterval(async () => {
			try {
				await this.getSystemMetrics();
			} catch (error) {
				logger.error("Metrics collection failed", { error });
			}
		}, 60000); // Every minute
	}

	private calculateCpuUsage(cpuUsage: NodeJS.CpuUsage): number {
		// Simple CPU usage calculation (this is a basic implementation)
		const totalUsage = cpuUsage.user + cpuUsage.system;
		return totalUsage / 1000000; // Convert to percentage
	}

	private getActiveConnections(): number {
		// This would typically come from your HTTP server
		return 0; // Placeholder
	}

	private getRequestMetrics(): {
		requestsPerMinute: number;
		errorRate: number;
		responseTime: { avg: number; p95: number; p99: number };
	} {
		// Get metrics from global state or monitoring system
		if (typeof globalThis !== "undefined" && globalThis.logMetrics) {
			const metrics = globalThis.logMetrics;
			const performanceData = metrics.performance.slice(-100); // Last 100 entries

			const responseTimes = performanceData.map((p) => p.duration);
			const avgResponseTime =
				responseTimes.length > 0
					? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
					: 0;

			return {
				requestsPerMinute: performanceData.length,
				errorRate: metrics.errors.length / Math.max(performanceData.length, 1),
				responseTime: {
					avg: avgResponseTime,
					p95: this.calculatePercentile(responseTimes, 95),
					p99: this.calculatePercentile(responseTimes, 99),
				},
			};
		}

		return {
			requestsPerMinute: 0,
			errorRate: 0,
			responseTime: { avg: 0, p95: 0, p99: 0 },
		};
	}

	private calculatePercentile(values: number[], percentile: number): number {
		if (values.length === 0) return 0;

		const sorted = values.sort((a, b) => a - b);
		const index = Math.ceil((percentile / 100) * sorted.length) - 1;
		return sorted[index] || 0;
	}

	private async getDatabaseConnections(): Promise<number> {
		try {
			const result = await prisma.$queryRaw<Array<{ count: bigint }>>`
				SELECT count(*) as count FROM pg_stat_activity WHERE state = 'active'
			`;
			return Number(result[0]?.count || 0);
		} catch {
			return 0;
		}
	}

	private async checkAIServiceHealth(): Promise<boolean> {
		try {
			// This would make an actual health check to the AI service
			// For now, return true as a placeholder
			return true;
		} catch {
			return false;
		}
	}

	private async getFileSystemStats(): Promise<{
		usagePercentage: number;
		freeSpace: number;
		totalSpace: number;
	}> {
		try {
			const fs = require("fs");
			const stats = fs.statSync(".");
			// This is a simplified implementation
			return {
				usagePercentage: 50, // Placeholder
				freeSpace: 1000000000, // Placeholder
				totalSpace: 2000000000, // Placeholder
			};
		} catch {
			return { usagePercentage: 0, freeSpace: 0, totalSpace: 0 };
		}
	}

	private async getAverageConversionTime(): Promise<number> {
		try {
			const completedJobs = await prisma.conversionJob.findMany({
				where: {
					status: "completed",
					startedAt: { not: null },
					completedAt: { not: null },
				},
				select: {
					startedAt: true,
					completedAt: true,
				},
				take: 100, // Last 100 completed jobs
			});

			if (completedJobs.length === 0) return 0;

			const totalTime = completedJobs.reduce((sum, job) => {
				if (job.startedAt && job.completedAt) {
					return sum + (job.completedAt.getTime() - job.startedAt.getTime());
				}
				return sum;
			}, 0);

			return totalTime / completedJobs.length;
		} catch {
			return 0;
		}
	}

	private async getConversionsByTechStack(): Promise<Record<string, number>> {
		try {
			const projects = await prisma.project.findMany({
				select: {
					targetTechStack: true,
				},
			});

			const techStackCounts: Record<string, number> = {};
			projects.forEach((project) => {
				if (project.targetTechStack) {
					const techStack =
						typeof project.targetTechStack === "string"
							? project.targetTechStack
							: JSON.stringify(project.targetTechStack);
					techStackCounts[techStack] = (techStackCounts[techStack] || 0) + 1;
				}
			});

			return techStackCounts;
		} catch {
			return {};
		}
	}

	private getErrorsByType(): Record<string, number> {
		if (typeof globalThis !== "undefined" && globalThis.logMetrics) {
			const errors = globalThis.logMetrics.errors;
			const errorCounts: Record<string, number> = {};

			errors.forEach((error) => {
				const errorType = error.error.split(":")[0] || "Unknown";
				errorCounts[errorType] = (errorCounts[errorType] || 0) + 1;
			});

			return errorCounts;
		}
		return {};
	}

	private async storePerformanceEvent(
		operation: string,
		duration: number,
		metadata?: LogMetadata
	): Promise<void> {
		const key = `perf:${operation}:${new Date().toISOString().slice(0, 16)}`; // Per minute
		await redis.lpush(
			key,
			JSON.stringify({ duration, metadata, timestamp: Date.now() })
		);
		await redis.expire(key, 3600); // Expire after 1 hour
	}

	private async storeErrorEvent(
		error: Error,
		context?: LogMetadata
	): Promise<void> {
		const key = `errors:${new Date().toISOString().slice(0, 13)}`; // Per hour
		await redis.lpush(
			key,
			JSON.stringify({
				message: error.message,
				stack: error.stack,
				context,
				timestamp: Date.now(),
			})
		);
		await redis.expire(key, 86400); // Expire after 24 hours
	}

	private cleanupOldMetrics(): void {
		const cutoff = new Date(
			Date.now() - this.METRICS_RETENTION_HOURS * 60 * 60 * 1000
		);
		this.metricsHistory = this.metricsHistory.filter(
			(metric) => new Date(metric.timestamp) > cutoff
		);
	}
}

export const monitoringService = new MonitoringService();
