import { Router, Request, Response } from "express";
import { asyncHandler } from "@/middleware";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

const router = Router();

/**
 * Basic health check endpoint
 */
router.get(
	"/",
	asyncHandler(async (_req: Request, res: Response) => {
		res.json({
			status: "healthy",
			timestamp: new Date().toISOString(),
			version: process.env.npm_package_version || "1.0.0",
			environment: process.env.NODE_ENV || "development",
		});
	})
);

/**
 * Detailed health check with service status
 */
router.get(
	"/detailed",
	asyncHandler(async (_req: Request, res: Response) => {
		const checks = await Promise.allSettled([
			checkDatabase(),
			checkRedis(),
			checkFileSystem(),
			checkExternalServices(),
		]);

		const results = {
			status: "healthy",
			timestamp: new Date().toISOString(),
			version: process.env.npm_package_version || "1.0.0",
			environment: process.env.NODE_ENV || "development",
			services: {
				database: getCheckResult(checks[0]),
				redis: getCheckResult(checks[1]),
				filesystem: getCheckResult(checks[2]),
				external: getCheckResult(checks[3]),
			},
		};

		// Determine overall status
		const hasFailures = Object.values(results.services).some(
			(service) => service.status === "unhealthy"
		);

		if (hasFailures) {
			results.status = "degraded";
			res.status(503);
		}

		res.json(results);
	})
);

/**
 * Readiness probe for Kubernetes/Docker
 */
router.get(
	"/ready",
	asyncHandler(async (_req: Request, res: Response) => {
		try {
			// Check critical services
			await Promise.all([checkDatabase(), checkRedis()]);

			res.json({
				status: "ready",
				timestamp: new Date().toISOString(),
			});
		} catch (error) {
			res.status(503).json({
				status: "not_ready",
				timestamp: new Date().toISOString(),
				error: error instanceof Error ? error.message : "Unknown error",
			});
		}
	})
);

/**
 * Liveness probe for Kubernetes/Docker
 */
router.get(
	"/live",
	asyncHandler(async (_req: Request, res: Response) => {
		res.json({
			status: "alive",
			timestamp: new Date().toISOString(),
			uptime: process.uptime(),
			memory: process.memoryUsage(),
		});
	})
);

// Helper functions for health checks

async function checkDatabase(): Promise<{
	status: string;
	responseTime: number;
	error?: string;
}> {
	const start = Date.now();
	try {
		await prisma.$queryRaw`SELECT 1`;
		return {
			status: "healthy",
			responseTime: Date.now() - start,
		};
	} catch (error) {
		return {
			status: "unhealthy",
			responseTime: Date.now() - start,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

async function checkRedis(): Promise<{
	status: string;
	responseTime: number;
	error?: string;
}> {
	const start = Date.now();
	try {
		await redis.ping();
		return {
			status: "healthy",
			responseTime: Date.now() - start,
		};
	} catch (error) {
		return {
			status: "unhealthy",
			responseTime: Date.now() - start,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

async function checkFileSystem(): Promise<{
	status: string;
	responseTime: number;
	error?: string;
}> {
	const start = Date.now();
	try {
		const fs = await import("fs/promises");
		const path = await import("path");

		const testFile = path.join(process.cwd(), "storage", ".health-check");
		await fs.writeFile(testFile, "health-check");
		await fs.unlink(testFile);

		return {
			status: "healthy",
			responseTime: Date.now() - start,
		};
	} catch (error) {
		return {
			status: "unhealthy",
			responseTime: Date.now() - start,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

async function checkExternalServices(): Promise<{
	status: string;
	responseTime: number;
	error?: string;
}> {
	const start = Date.now();
	try {
		// Check GitHub API
		const response = await fetch("https://api.github.com/rate_limit", {
			method: "GET",
			headers: {
				"User-Agent": "AI-Tech-Stack-Converter-Health-Check",
			},
		});

		if (!response.ok) {
			throw new Error(`GitHub API returned ${response.status}`);
		}

		return {
			status: "healthy",
			responseTime: Date.now() - start,
		};
	} catch (error) {
		return {
			status: "unhealthy",
			responseTime: Date.now() - start,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

function getCheckResult(result: PromiseSettledResult<any>) {
	if (result.status === "fulfilled") {
		return result.value;
	} else {
		return {
			status: "unhealthy",
			responseTime: 0,
			error:
				result.reason instanceof Error
					? result.reason.message
					: "Unknown error",
		};
	}
}

export default router;
