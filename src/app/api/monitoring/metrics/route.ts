/**
 * System Metrics API Endpoint
 * Provides detailed system metrics for monitoring dashboards
 */

import { NextRequest, NextResponse } from "next/server";
import { monitoringService } from "@/services/monitoring";
import { logger } from "@/utils/logger";

export async function GET(request: NextRequest) {
	const requestId =
		request.headers.get("x-request-id") || `metrics-${Date.now()}`;
	const { searchParams } = new URL(request.url);
	const hours = parseInt(searchParams.get("hours") || "1");

	try {
		logger.info("Metrics requested", { requestId, hours });

		const [currentMetrics, historicalMetrics, conversionMetrics] =
			await Promise.all([
				monitoringService.getSystemMetrics(),
				monitoringService.getMetricsHistory(hours),
				monitoringService.getConversionMetrics(),
			]);

		const response = {
			timestamp: new Date().toISOString(),
			requestId,
			current: currentMetrics,
			historical: historicalMetrics,
			conversions: conversionMetrics,
			summary: {
				dataPoints: historicalMetrics.length,
				timeRange: `${hours}h`,
				avgCpuUsage:
					historicalMetrics.length > 0
						? historicalMetrics.reduce((sum, m) => sum + m.cpu.usage, 0) /
						  historicalMetrics.length
						: 0,
				avgMemoryUsage:
					historicalMetrics.length > 0
						? historicalMetrics.reduce(
								(sum, m) => sum + m.memory.percentage,
								0
						  ) / historicalMetrics.length
						: 0,
				avgResponseTime:
					historicalMetrics.length > 0
						? historicalMetrics.reduce(
								(sum, m) => sum + m.responseTime.avg,
								0
						  ) / historicalMetrics.length
						: 0,
			},
		};

		logger.info("Metrics delivered", {
			requestId,
			dataPoints: historicalMetrics.length,
			timeRange: hours,
		});

		return NextResponse.json(response);
	} catch (error) {
		logger.error("Failed to get metrics", { requestId, error });

		return NextResponse.json(
			{
				error: "Failed to retrieve metrics",
				message: error instanceof Error ? error.message : "Unknown error",
				requestId,
				timestamp: new Date().toISOString(),
			},
			{ status: 500 }
		);
	}
}
