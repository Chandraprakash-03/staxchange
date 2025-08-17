/**
 * Structured logging utility for the application
 * Provides comprehensive logging with metadata, performance tracking, and monitoring
 */

export interface LogMetadata {
	userId?: string;
	projectId?: string;
	conversionJobId?: string;
	requestId?: string;
	duration?: number;
	error?: Error;
	[key: string]: any;
}

export interface Logger {
	info(message: string, metadata?: LogMetadata): void;
	error(message: string, metadata?: LogMetadata): void;
	warn(message: string, metadata?: LogMetadata): void;
	debug(message: string, metadata?: LogMetadata): void;
	performance(
		operation: string,
		duration: number,
		metadata?: LogMetadata
	): void;
	audit(action: string, metadata?: LogMetadata): void;
}

export interface LogEntry {
	timestamp: string;
	level: string;
	message: string;
	metadata?: LogMetadata;
	service: string;
	environment: string;
	version: string;
}

class StructuredLogger implements Logger {
	private service: string;
	private environment: string;
	private version: string;

	constructor() {
		this.service = process.env.SERVICE_NAME || "ai-tech-stack-converter";
		this.environment = process.env.NODE_ENV || "development";
		this.version = process.env.npm_package_version || "1.0.0";
	}

	private createLogEntry(
		level: string,
		message: string,
		metadata?: LogMetadata
	): LogEntry {
		return {
			timestamp: new Date().toISOString(),
			level: level.toUpperCase(),
			message,
			metadata: metadata || {},
			service: this.service,
			environment: this.environment,
			version: this.version,
		};
	}

	private formatLogEntry(entry: LogEntry): string {
		if (this.environment === "production") {
			// JSON format for production (easier for log aggregation)
			return JSON.stringify(entry);
		} else {
			// Human-readable format for development
			const metadataStr =
				entry.metadata && Object.keys(entry.metadata).length > 0
					? ` | ${JSON.stringify(entry.metadata)}`
					: "";
			return `[${entry.timestamp}] ${entry.level}: ${entry.message}${metadataStr}`;
		}
	}

	private writeLog(
		level: string,
		message: string,
		metadata?: LogMetadata
	): void {
		const entry = this.createLogEntry(level, message, metadata);
		const formattedLog = this.formatLogEntry(entry);

		switch (level.toLowerCase()) {
			case "error":
				console.error(formattedLog);
				break;
			case "warn":
				console.warn(formattedLog);
				break;
			case "debug":
				if (this.environment === "development") {
					console.debug(formattedLog);
				}
				break;
			default:
				console.log(formattedLog);
		}

		// Store metrics for monitoring
		this.updateMetrics(level, metadata);
	}

	private updateMetrics(level: string, metadata?: LogMetadata): void {
		// Update internal metrics counters
		if (typeof globalThis !== "undefined") {
			if (!globalThis.logMetrics) {
				globalThis.logMetrics = {
					counts: { info: 0, warn: 0, error: 0, debug: 0 },
					performance: [],
					errors: [],
				};
			}

			globalThis.logMetrics.counts[level.toLowerCase()] =
				(globalThis.logMetrics.counts[level.toLowerCase()] || 0) + 1;

			if (level === "error" && metadata?.error) {
				globalThis.logMetrics.errors.push({
					timestamp: new Date().toISOString(),
					error: metadata.error.message,
					stack: metadata.error.stack,
					metadata,
				});
			}
		}
	}

	info(message: string, metadata?: LogMetadata): void {
		this.writeLog("info", message, metadata);
	}

	error(message: string, metadata?: LogMetadata): void {
		this.writeLog("error", message, metadata);
	}

	warn(message: string, metadata?: LogMetadata): void {
		this.writeLog("warn", message, metadata);
	}

	debug(message: string, metadata?: LogMetadata): void {
		this.writeLog("debug", message, metadata);
	}

	performance(
		operation: string,
		duration: number,
		metadata?: LogMetadata
	): void {
		const perfMetadata = { ...metadata, duration, operation };
		this.writeLog(
			"info",
			`Performance: ${operation} completed in ${duration}ms`,
			perfMetadata
		);

		// Store performance data for monitoring
		if (typeof globalThis !== "undefined" && globalThis.logMetrics) {
			globalThis.logMetrics.performance.push({
				timestamp: new Date().toISOString(),
				operation,
				duration,
				metadata,
			});

			// Keep only last 1000 performance entries
			if (globalThis.logMetrics.performance.length > 1000) {
				globalThis.logMetrics.performance =
					globalThis.logMetrics.performance.slice(-1000);
			}
		}
	}

	audit(action: string, metadata?: LogMetadata): void {
		const auditMetadata = { ...metadata, action, type: "audit" };
		this.writeLog("info", `Audit: ${action}`, auditMetadata);
	}
}

// Performance monitoring utilities
export class PerformanceMonitor {
	private startTimes: Map<string, number> = new Map();

	start(operation: string): void {
		this.startTimes.set(operation, Date.now());
	}

	end(operation: string, metadata?: LogMetadata): number {
		const startTime = this.startTimes.get(operation);
		if (!startTime) {
			logger.warn(
				`Performance monitor: No start time found for operation ${operation}`
			);
			return 0;
		}

		const duration = Date.now() - startTime;
		this.startTimes.delete(operation);

		logger.performance(operation, duration, metadata);
		return duration;
	}

	measure<T>(
		operation: string,
		fn: () => Promise<T>,
		metadata?: LogMetadata
	): Promise<T>;
	measure<T>(operation: string, fn: () => T, metadata?: LogMetadata): T;
	measure<T>(
		operation: string,
		fn: () => T | Promise<T>,
		metadata?: LogMetadata
	): T | Promise<T> {
		const startTime = Date.now();

		try {
			const result = fn();

			if (result instanceof Promise) {
				return result
					.then((value) => {
						const duration = Date.now() - startTime;
						logger.performance(operation, duration, {
							...metadata,
							success: true,
						});
						return value;
					})
					.catch((error) => {
						const duration = Date.now() - startTime;
						logger.performance(operation, duration, {
							...metadata,
							success: false,
							error,
						});
						throw error;
					});
			} else {
				const duration = Date.now() - startTime;
				logger.performance(operation, duration, { ...metadata, success: true });
				return result;
			}
		} catch (error) {
			const duration = Date.now() - startTime;
			logger.performance(operation, duration, {
				...metadata,
				success: false,
				error,
			});
			throw error;
		}
	}
}

export const logger: Logger = new StructuredLogger();
export const performanceMonitor = new PerformanceMonitor();
