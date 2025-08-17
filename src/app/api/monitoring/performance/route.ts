/**
 * Performance Monitoring API Endpoint
 * Provides performance data and conversion operation metrics
 */

import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { logger } from "@/utils/logger";

export async function GET(request: NextRequest) {
	const requestId = request.headers.get("x-request-id") || `perf-${Date.now()}`;
	const { searchParams } = new URL(request.url);
	const operation = searchParams.get("operation");
	const minutes = parseInt(searchParams.get("minutes") || "60");

	try {
		logger.info("Performance data requested", {
			requestId,
			operation,
			minutes,
		});

		const performanceData = await getPerformanceData(operation, minutes);
		const slowQueries = await getSlowOperations(minutes);
		const errorRates = await getErrorRates(minutes);

		const response = {
			timestamp: new Date().toISOString(),
			requestId,
			timeRange: `${minutes}m`,
			operation: operation || "all",
			performance: performanceData,
			slowOperations: slowQueries,
			errorRates,
			summary: {
				totalOperations: performanceData.length,
				averageDuration:
					performanceData.length > 0
						? performanceData.reduce((sum, p) => sum + p.duration, 0) /
						  performanceData.length
						: 0,
				p95Duration: calculatePercentile(
					performanceData.map((p) => p.duration),
					95
				),
				p99Duration: calculatePercentile(
					performanceData.map((p) => p.duration),
					99
				),
				errorRate: errorRates.overall || 0,
			},
		};

		logger.info("Performance data delivered", {
			requestId,
			operations: performanceData.length,
			timeRange: minutes,
		});

		return NextResponse.json(response);
	} catch (error) {
		logger.error("Failed to get performance data", { requestId, error });

		return NextResponse.json(
			{
				error: "Failed to retrieve performance data",
				message: error instanceof Error ? error.message : "Unknown error",
				requestId,
				timestamp: new Date().toISOString(),
			},
			{ status: 500 }
		);
	}
}

async function getPerformanceData(
	operation: string | null,
	minutes: number
): Promise<
	Array<{
		operation: string;
		duration: number;
		timestamp: string;
		metadata?: any;
	}>
> {
	try {
		const now = new Date();
		const performanceEntries: Array<{
			operation: string;
			duration: number;
			timestamp: string;
			metadata?: any;
		}> = [];

		// Get performance data from Redis for the specified time range
		for (let i = 0; i < minutes; i++) {
			const timeKey = new Date(now.getTime() - i * 60000)
				.toISOString()
				.slice(0, 16);
			const keys = await redis.keys(`perf:*:${timeKey}`);

			for (const key of keys) {
				const operationName = key.split(":")[1];
				if (operation && operationName !== operation) continue;

				const entries = await redis.lrange(key, 0, -1);
				for (const entry of entries) {
					try {
						const parsed = JSON.parse(entry);
						performanceEntries.push({
							operation: operationName,
							duration: parsed.duration,
							timestamp: new Date(parsed.timestamp).toISOString(),
							metadata: parsed.metadata,
						});
					} catch (parseError) {
						// Skip invalid entries
					}
				}
			}
		}

		return performanceEntries.sort(
			(a, b) =>
				new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
		);
	} catch (error) {
		logger.error("Failed to get performance data from Redis", { error });
		return [];
	}
}

async function getSlowOperations(minutes: number): Promise<
	Array<{
		operation: string;
		duration: number;
		timestamp: string;
	}>
> {
	const performanceData = await getPerformanceData(null, minutes);

	// Consider operations slower than 5 seconds as slow
	return performanceData
		.filter((p) => p.duration > 5000)
		.sort((a, b) => b.duration - a.duration)
		.slice(0, 10); // Top 10 slowest
}

async function getErrorRates(minutes: number): Promise<{
	overall: number;
	byOperation: Record<string, number>;
	byHour: Record<string, number>;
}> {
	try {
		const now = new Date();
		const errorCounts: Record<string, number> = {};
		const operationCounts: Record<string, number> = {};
		const hourlyCounts: Record<string, number> = {};

		// Get error data from Redis
		for (let i = 0; i < Math.ceil(minutes / 60); i++) {
			const hourKey = new Date(now.getTime() - i * 3600000)
				.toISOString()
				.slice(0, 13);
			const errorKey = `errors:${hourKey}`;

			const errors = await redis.lrange(errorKey, 0, -1);
			hourlyCounts[hourKey] = errors.length;

			for (const error of errors) {
				try {
					const parsed = JSON.parse(error);
					const operation = parsed.context?.operation || "unknown";
					errorCounts[operation] = (errorCounts[operation] || 0) + 1;
				} catch (parseError) {
					// Skip invalid entries
				}
			}
		}

		// Get total operation counts for rate calculation
		const performanceData = await getPerformanceData(null, minutes);
		performanceData.forEach((p) => {
			operationCounts[p.operation] = (operationCounts[p.operation] || 0) + 1;
		});

		const totalErrors = Object.values(errorCounts).reduce(
			(sum, count) => sum + count,
			0
		);
		const totalOperations = Object.values(operationCounts).reduce(
			(sum, count) => sum + count,
			0
		);

		const byOperation: Record<string, number> = {};
		Object.keys(errorCounts).forEach((operation) => {
			const errors = errorCounts[operation] || 0;
			const total = operationCounts[operation] || 0;
			byOperation[operation] = total > 0 ? errors / total : 0;
		});

		return {
			overall: totalOperations > 0 ? totalErrors / totalOperations : 0,
			byOperation,
			byHour: hourlyCounts,
		};
	} catch (error) {
		logger.error("Failed to calculate error rates", { error });
		return { overall: 0, byOperation: {}, byHour: {} };
	}
}

function calculatePercentile(values: number[], percentile: number): number {
	if (values.length === 0) return 0;

	const sorted = values.sort((a, b) => a - b);
	const index = Math.ceil((percentile / 100) * sorted.length) - 1;
	return sorted[index] || 0;
}
