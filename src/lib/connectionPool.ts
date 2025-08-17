import { Pool, PoolClient, PoolConfig } from "pg";
import { PrismaClient } from "@/generated/prisma";

/**
 * Database connection pool manager with monitoring and optimization
 */
export class DatabaseConnectionPool {
	private static instance: DatabaseConnectionPool;
	private pool: Pool;
	private prisma: PrismaClient;
	private connectionCount = 0;
	private queryCount = 0;
	private errorCount = 0;
	private startTime = Date.now();

	private constructor() {
		console.log("DATABASE_URL:", process.env.DATABASE_URL);
		// Configure connection pool with optimized settings
		const poolConfig: PoolConfig = {
			connectionString: process.env.DATABASE_URL,
			ssl:
				process.env.NODE_ENV === "production"
					? { rejectUnauthorized: false }
					: false,

			// Connection pool settings
			min: parseInt(process.env.DB_POOL_MIN || "2"), // Minimum connections
			max: parseInt(process.env.DB_POOL_MAX || "20"), // Maximum connections
			idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || "30000"), // 30 seconds
			connectionTimeoutMillis: parseInt(
				process.env.DB_CONNECTION_TIMEOUT || "10000"
			), // 10 seconds

			// Query settings
			query_timeout: parseInt(process.env.DB_QUERY_TIMEOUT || "60000"), // 60 seconds
			statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || "30000"), // 30 seconds

			// Keep alive settings
			keepAlive: true,
			keepAliveInitialDelayMillis: 10000,
		};

		this.pool = new Pool(poolConfig);
		this.prisma = new PrismaClient({
			datasources: {
				db: {
					url: process.env.DATABASE_URL,
				},
			},

			log:
				process.env.NODE_ENV === "development"
					? ["query", "info", "warn", "error"]
					: ["error"],
		});

		this.setupEventHandlers();
	}

	/**
	 * Get singleton instance
	 */
	static getInstance(): DatabaseConnectionPool {
		if (!DatabaseConnectionPool.instance) {
			DatabaseConnectionPool.instance = new DatabaseConnectionPool();
		}
		return DatabaseConnectionPool.instance;
	}

	/**
	 * Setup event handlers for monitoring
	 */
	private setupEventHandlers(): void {
		// Pool event handlers
		this.pool.on("connect", (client: PoolClient) => {
			this.connectionCount++;
			console.log(
				`Database: New client connected (total: ${this.connectionCount})`
			);
		});

		this.pool.on("remove", (client: PoolClient) => {
			this.connectionCount--;
			console.log(`Database: Client removed (total: ${this.connectionCount})`);
		});

		this.pool.on("error", (err: Error, client: PoolClient) => {
			this.errorCount++;
			console.error("Database pool error:", err);
		});

		// Prisma event handlers
		this.prisma.$on("query", (e) => {
			this.queryCount++;
			if (process.env.NODE_ENV === "development") {
				console.log(`Query: ${e.query} - Duration: ${e.duration}ms`);
			}
		});

		this.prisma.$on("error", (e) => {
			this.errorCount++;
			console.error("Prisma error:", e);
		});
	}

	/**
	 * Get raw PostgreSQL pool
	 */
	getPool(): Pool {
		return this.pool;
	}

	/**
	 * Get Prisma client
	 */
	getPrisma(): PrismaClient {
		return this.prisma;
	}

	/**
	 * Execute a raw query with connection from pool
	 */
	async query<T = any>(text: string, params?: any[]): Promise<T[]> {
		const client = await this.pool.connect();
		try {
			const result = await client.query(text, params);
			return result.rows;
		} finally {
			client.release();
		}
	}

	/**
	 * Execute a transaction with automatic rollback on error
	 */
	async transaction<T>(
		callback: (client: PoolClient) => Promise<T>
	): Promise<T> {
		const client = await this.pool.connect();
		try {
			await client.query("BEGIN");
			const result = await callback(client);
			await client.query("COMMIT");
			return result;
		} catch (error) {
			await client.query("ROLLBACK");
			throw error;
		} finally {
			client.release();
		}
	}

	/**
	 * Execute a Prisma transaction
	 */
	async prismaTransaction<T>(
		callback: (prisma: PrismaClient) => Promise<T>
	): Promise<T> {
		return await this.prisma.$transaction(async (prisma) => {
			return await callback(prisma);
		});
	}

	/**
	 * Health check for database connections
	 */
	async healthCheck(): Promise<{
		database: boolean;
		pool: {
			total: number;
			idle: number;
			waiting: number;
		};
		performance: {
			uptime: number;
			queryCount: number;
			errorCount: number;
			avgQueriesPerSecond: number;
		};
	}> {
		try {
			// Test database connectivity
			await this.pool.query("SELECT 1");
			await this.prisma.$queryRaw`SELECT 1`;

			const uptime = Date.now() - this.startTime;
			const avgQueriesPerSecond = this.queryCount / (uptime / 1000);

			return {
				database: true,
				pool: {
					total: this.pool.totalCount,
					idle: this.pool.idleCount,
					waiting: this.pool.waitingCount,
				},
				performance: {
					uptime,
					queryCount: this.queryCount,
					errorCount: this.errorCount,
					avgQueriesPerSecond: Math.round(avgQueriesPerSecond * 100) / 100,
				},
			};
		} catch (error) {
			console.error("Database health check failed:", error);
			return {
				database: false,
				pool: {
					total: this.pool.totalCount,
					idle: this.pool.idleCount,
					waiting: this.pool.waitingCount,
				},
				performance: {
					uptime: Date.now() - this.startTime,
					queryCount: this.queryCount,
					errorCount: this.errorCount,
					avgQueriesPerSecond: 0,
				},
			};
		}
	}

	/**
	 * Get detailed pool statistics
	 */
	getPoolStatistics(): {
		totalConnections: number;
		idleConnections: number;
		waitingClients: number;
		connectionCount: number;
		queryCount: number;
		errorCount: number;
		uptime: number;
	} {
		return {
			totalConnections: this.pool.totalCount,
			idleConnections: this.pool.idleCount,
			waitingClients: this.pool.waitingCount,
			connectionCount: this.connectionCount,
			queryCount: this.queryCount,
			errorCount: this.errorCount,
			uptime: Date.now() - this.startTime,
		};
	}

	/**
	 * Optimize pool connections based on current load
	 */
	async optimizeConnections(): Promise<void> {
		const stats = this.getPoolStatistics();

		// If we have many waiting clients, log a warning
		if (stats.waitingClients > 5) {
			console.warn(
				`Database: High number of waiting clients (${stats.waitingClients}). Consider increasing pool size.`
			);
		}

		// If we have too many idle connections, we could potentially reduce pool size
		if (stats.idleConnections > stats.totalConnections * 0.8) {
			console.info(
				`Database: High number of idle connections (${stats.idleConnections}/${stats.totalConnections}). Pool may be oversized.`
			);
		}

		// Log performance metrics
		const avgQueriesPerSecond = stats.queryCount / (stats.uptime / 1000);
		console.info(
			`Database performance: ${
				stats.queryCount
			} queries, ${avgQueriesPerSecond.toFixed(2)} queries/sec, ${
				stats.errorCount
			} errors`
		);
	}

	/**
	 * Close all connections gracefully
	 */
	async close(): Promise<void> {
		try {
			await this.prisma.$disconnect();
			await this.pool.end();
			console.log("Database: All connections closed gracefully");
		} catch (error) {
			console.error("Database: Error closing connections:", error);
			throw error;
		}
	}

	/**
	 * Reset statistics
	 */
	resetStatistics(): void {
		this.queryCount = 0;
		this.errorCount = 0;
		this.startTime = Date.now();
		console.log("Database: Statistics reset");
	}

	/**
	 * Execute database maintenance tasks
	 */
	async performMaintenance(): Promise<{
		vacuumAnalyze: boolean;
		reindexing: boolean;
		statisticsUpdate: boolean;
	}> {
		const results = {
			vacuumAnalyze: false,
			reindexing: false,
			statisticsUpdate: false,
		};

		try {
			// Vacuum and analyze tables for better performance
			await this.query("VACUUM ANALYZE");
			results.vacuumAnalyze = true;
			console.log("Database maintenance: VACUUM ANALYZE completed");

			// Update table statistics
			await this.query("ANALYZE");
			results.statisticsUpdate = true;
			console.log("Database maintenance: Statistics updated");

			// Note: REINDEX requires more careful consideration in production
			// Only enable if specifically needed and during maintenance windows
			if (process.env.DB_ENABLE_REINDEX === "true") {
				await this.query("REINDEX DATABASE CONCURRENTLY");
				results.reindexing = true;
				console.log("Database maintenance: Reindexing completed");
			}
		} catch (error) {
			console.error("Database maintenance error:", error);
		}

		return results;
	}
}

// Export singleton instance
export const databasePool = DatabaseConnectionPool.getInstance();

// Export for direct access to pool and prisma
export const getPool = () => databasePool.getPool();
export const getPrisma = () => databasePool.getPrisma();
