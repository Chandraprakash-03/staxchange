#!/usr/bin/env node

/**
 * Background Worker Service
 *
 * This service processes conversion jobs from the Redis queue.
 * It runs independently from the main web application.
 */

import { ConversionQueue } from "./services/conversionQueue";
import { JobManager } from "./services/jobManager";
import { logger } from "./utils/logger";

class WorkerService {
	private conversionQueue: ConversionQueue;
	private jobManager: JobManager;

	constructor() {
		this.conversionQueue = new ConversionQueue();
		this.jobManager = new JobManager();
	}

	async start(): Promise<void> {
		try {
			logger.info("Starting worker service...");

			// Initialize services
			await this.conversionQueue.initialize();
			await this.jobManager.initialize();

			// Start processing jobs
			await this.conversionQueue.startProcessing();

			logger.info("Worker service started successfully");

			// Handle graceful shutdown
			process.on("SIGTERM", () => this.shutdown());
			process.on("SIGINT", () => this.shutdown());
		} catch (error) {
			logger.error("Failed to start worker service:", error);
			process.exit(1);
		}
	}

	private async shutdown(): Promise<void> {
		logger.info("Shutting down worker service...");

		try {
			await this.conversionQueue.shutdown();
			await this.jobManager.shutdown();
			logger.info("Worker service shut down gracefully");
			process.exit(0);
		} catch (error) {
			logger.error("Error during shutdown:", error);
			process.exit(1);
		}
	}
}

// Start the worker service
const worker = new WorkerService();
worker.start().catch((error) => {
	logger.error("Worker service failed to start:", error);
	process.exit(1);
});
