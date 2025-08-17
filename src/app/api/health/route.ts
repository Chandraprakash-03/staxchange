/**
 * Enhanced Health Check Endpoint
 *
 * Provides comprehensive system health status for monitoring and load balancers
 */

import { NextRequest, NextResponse } from "next/server";
import { monitoringService } from "@/services/monitoring";
import { logger } from "@/utils/logger";

export async function GET(request: NextRequest) {
	const startTime = Date.now();
	const requestId =
		request.headers.get("x-request-id") || `health-${Date.now()}`;

	try {
		logger.info("Health check requested", { requestId });

		// Get comprehensive health status
		const [servicesHealth, systemMetrics, conversionMetrics] =
			await Promise.all([
				monitoringService.getServicesHealth(),
				monitoringService.getSystemMetrics(),
				monitoringService.getConversionMetrics(),
			]);

		const responseTime = Date.now() - startTime;

		// Determine overall system status
		const overallStatus = determineOverallStatus(servicesHealth);

		const health = {
			status: overallStatus,
			timestamp: new Date().toISOString(),
			version: process.env.npm_package_version || "1.0.0",
			environment: process.env.NODE_ENV || "development",
			uptime: process.uptime(),
			responseTime: `${responseTime}ms`,
			requestId,
			services: servicesHealth.reduce((acc, service) => {
				acc[service.name] = {
					status: service.status,
					responseTime: `${service.responseTime}ms`,
					message: service.message,
					lastCheck: service.lastCheck,
					details: service.details,
				};
				return acc;
			}, {} as Record<string, any>),
			system: {
				cpu: systemMetrics.cpu,
				memory: {
					usage: `${Math.round(systemMetrics.memory.percentage)}%`,
					used: `${Math.round(systemMetrics.memory.used / 1024 / 1024)}MB`,
					heap: `${Math.round(systemMetrics.memory.heapUsed / 1024 / 1024)}MB`,
				},
				activeConnections: systemMetrics.activeConnections,
				requestsPerMinute: systemMetrics.requestsPerMinute,
				errorRate: `${Math.round(systemMetrics.errorRate * 100)}%`,
			},
			conversions: {
				active: conversionMetrics.activeConversions,
				total: conversionMetrics.totalConversions,
				successRate:
					conversionMetrics.totalConversions > 0
						? `${Math.round(
								(conversionMetrics.completedConversions /
									conversionMetrics.totalConversions) *
									100
						  )}%`
						: "0%",
				averageTime: `${Math.round(
					conversionMetrics.averageConversionTime / 1000
				)}s`,
			},
		};

		// Return appropriate status code
		const statusCode =
			overallStatus === "healthy"
				? 200
				: overallStatus === "degraded"
				? 200
				: 503;

		logger.info("Health check completed", {
			requestId,
			status: overallStatus,
			responseTime,
			servicesChecked: servicesHealth.length,
		});

		return NextResponse.json(health, { status: statusCode });
	} catch (error) {
		const responseTime = Date.now() - startTime;

		logger.error("Health check failed", {
			requestId,
			error,
			responseTime,
		});

		return NextResponse.json(
			{
				status: "unhealthy",
				timestamp: new Date().toISOString(),
				responseTime: `${responseTime}ms`,
				requestId,
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 503 }
		);
	}
}

function determineOverallStatus(
	servicesHealth: Array<{ status: string }>
): string {
	const statuses = servicesHealth.map((service) => service.status);

	if (statuses.every((status) => status === "healthy")) {
		return "healthy";
	} else if (statuses.some((status) => status === "unhealthy")) {
		return "unhealthy";
	} else {
		return "degraded";
	}
}
