/**
 * Monitoring Dashboard Component
 * Displays system health, metrics, and performance data
 */

"use client";

import React, { useState, useEffect } from "react";
import { logger } from "@/utils/logger";

interface SystemMetrics {
	timestamp: string;
	cpu: { usage: number; loadAverage: number[] };
	memory: { used: number; total: number; percentage: number };
	uptime: number;
	activeConnections: number;
	requestsPerMinute: number;
	errorRate: number;
	responseTime: { avg: number; p95: number; p99: number };
}

interface ServiceHealth {
	name: string;
	status: "healthy" | "degraded" | "unhealthy";
	responseTime: string;
	message?: string;
	lastCheck: string;
}

interface ConversionMetrics {
	totalConversions: number;
	activeConversions: number;
	completedConversions: number;
	failedConversions: number;
	averageConversionTime: number;
}

interface DashboardData {
	health: {
		status: string;
		services: Record<string, ServiceHealth>;
		system: {
			cpu: { usage: number };
			memory: { usage: string; used: string };
			activeConnections: number;
			requestsPerMinute: number;
			errorRate: string;
		};
		conversions: {
			active: number;
			total: number;
			successRate: string;
			averageTime: string;
		};
	};
	metrics?: {
		current: SystemMetrics;
		historical: SystemMetrics[];
		conversions: ConversionMetrics;
	};
}

export default function MonitoringDashboard() {
	const [data, setData] = useState<DashboardData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [refreshInterval, setRefreshInterval] = useState(30); // seconds
	const [autoRefresh, setAutoRefresh] = useState(true);

	const fetchData = async () => {
		try {
			const [healthResponse, metricsResponse] = await Promise.all([
				fetch("/api/health"),
				fetch("/api/monitoring/metrics?hours=1"),
			]);

			if (!healthResponse.ok) {
				throw new Error(`Health check failed: ${healthResponse.status}`);
			}

			const healthData = await healthResponse.json();
			let metricsData = null;

			if (metricsResponse.ok) {
				metricsData = await metricsResponse.json();
			}

			setData({
				health: healthData,
				metrics: metricsData,
			});
			setError(null);
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "Failed to fetch monitoring data";
			setError(errorMessage);
			logger.error("Dashboard data fetch failed", { error: err });
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchData();
	}, []);

	useEffect(() => {
		if (!autoRefresh) return;

		const interval = setInterval(fetchData, refreshInterval * 1000);
		return () => clearInterval(interval);
	}, [autoRefresh, refreshInterval]);

	const getStatusColor = (status: string) => {
		switch (status) {
			case "healthy":
				return "text-green-600 bg-green-100";
			case "degraded":
				return "text-yellow-600 bg-yellow-100";
			case "unhealthy":
				return "text-red-600 bg-red-100";
			default:
				return "text-gray-600 bg-gray-100";
		}
	};

	const formatUptime = (seconds: number) => {
		const days = Math.floor(seconds / 86400);
		const hours = Math.floor((seconds % 86400) / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		return `${days}d ${hours}h ${minutes}m`;
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="min-h-screen bg-gray-50 p-8">
				<div className="max-w-4xl mx-auto">
					<div className="bg-red-50 border border-red-200 rounded-lg p-6">
						<h2 className="text-lg font-semibold text-red-800 mb-2">
							Error Loading Dashboard
						</h2>
						<p className="text-red-600">{error}</p>
						<button
							onClick={fetchData}
							className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
						>
							Retry
						</button>
					</div>
				</div>
			</div>
		);
	}

	if (!data) return null;

	return (
		<div className="min-h-screen bg-gray-50 p-8">
			<div className="max-w-7xl mx-auto">
				{/* Header */}
				<div className="mb-8">
					<div className="flex justify-between items-center">
						<div>
							<h1 className="text-3xl font-bold text-gray-900">
								System Monitoring
							</h1>
							<p className="text-gray-600 mt-1">
								Real-time system health and performance metrics
							</p>
						</div>
						<div className="flex items-center space-x-4">
							<div className="flex items-center space-x-2">
								<label className="text-sm text-gray-600">Auto-refresh:</label>
								<input
									type="checkbox"
									checked={autoRefresh}
									onChange={(e) => setAutoRefresh(e.target.checked)}
									className="rounded"
								/>
							</div>
							<select
								value={refreshInterval}
								onChange={(e) => setRefreshInterval(Number(e.target.value))}
								className="px-3 py-1 border border-gray-300 rounded text-sm"
								disabled={!autoRefresh}
							>
								<option value={10}>10s</option>
								<option value={30}>30s</option>
								<option value={60}>1m</option>
								<option value={300}>5m</option>
							</select>
							<button
								onClick={fetchData}
								className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
							>
								Refresh Now
							</button>
						</div>
					</div>
				</div>

				{/* Overall Status */}
				<div className="mb-8">
					<div
						className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(
							data.health.status
						)}`}
					>
						<div
							className={`w-2 h-2 rounded-full mr-2 ${
								data.health.status === "healthy"
									? "bg-green-500"
									: data.health.status === "degraded"
									? "bg-yellow-500"
									: "bg-red-500"
							}`}
						></div>
						System Status: {data.health.status.toUpperCase()}
					</div>
					<p className="text-sm text-gray-600 mt-2">
						Last updated: {new Date(data.health.timestamp).toLocaleString()}
					</p>
				</div>

				{/* Services Health */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
					{Object.entries(data.health.services).map(([name, service]) => (
						<div key={name} className="bg-white rounded-lg shadow p-6">
							<div className="flex items-center justify-between mb-2">
								<h3 className="text-lg font-semibold capitalize">{name}</h3>
								<div
									className={`w-3 h-3 rounded-full ${
										service.status === "healthy"
											? "bg-green-500"
											: service.status === "degraded"
											? "bg-yellow-500"
											: "bg-red-500"
									}`}
								></div>
							</div>
							<p
								className={`text-sm font-medium ${
									getStatusColor(service.status).split(" ")[0]
								}`}
							>
								{service.status.toUpperCase()}
							</p>
							<p className="text-xs text-gray-600 mt-1">
								Response: {service.responseTime}
							</p>
							{service.message && (
								<p className="text-xs text-gray-500 mt-2">{service.message}</p>
							)}
						</div>
					))}
				</div>

				{/* System Metrics */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
					<div className="bg-white rounded-lg shadow p-6">
						<h3 className="text-lg font-semibold mb-2">CPU Usage</h3>
						<div className="text-3xl font-bold text-blue-600">
							{data.health.system.cpu.usage.toFixed(1)}%
						</div>
					</div>
					<div className="bg-white rounded-lg shadow p-6">
						<h3 className="text-lg font-semibold mb-2">Memory Usage</h3>
						<div className="text-3xl font-bold text-green-600">
							{data.health.system.memory.usage}
						</div>
						<div className="text-sm text-gray-600">
							{data.health.system.memory.used}
						</div>
					</div>
					<div className="bg-white rounded-lg shadow p-6">
						<h3 className="text-lg font-semibold mb-2">Requests/Min</h3>
						<div className="text-3xl font-bold text-purple-600">
							{data.health.system.requestsPerMinute}
						</div>
					</div>
					<div className="bg-white rounded-lg shadow p-6">
						<h3 className="text-lg font-semibold mb-2">Error Rate</h3>
						<div className="text-3xl font-bold text-red-600">
							{data.health.system.errorRate}
						</div>
					</div>
				</div>

				{/* Conversion Metrics */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
					<div className="bg-white rounded-lg shadow p-6">
						<h3 className="text-lg font-semibold mb-2">Active Conversions</h3>
						<div className="text-3xl font-bold text-orange-600">
							{data.health.conversions.active}
						</div>
					</div>
					<div className="bg-white rounded-lg shadow p-6">
						<h3 className="text-lg font-semibold mb-2">Total Conversions</h3>
						<div className="text-3xl font-bold text-indigo-600">
							{data.health.conversions.total}
						</div>
					</div>
					<div className="bg-white rounded-lg shadow p-6">
						<h3 className="text-lg font-semibold mb-2">Success Rate</h3>
						<div className="text-3xl font-bold text-green-600">
							{data.health.conversions.successRate}
						</div>
					</div>
					<div className="bg-white rounded-lg shadow p-6">
						<h3 className="text-lg font-semibold mb-2">Avg Time</h3>
						<div className="text-3xl font-bold text-blue-600">
							{data.health.conversions.averageTime}
						</div>
					</div>
				</div>

				{/* Historical Data Chart Placeholder */}
				{data.metrics && data.metrics.historical.length > 0 && (
					<div className="bg-white rounded-lg shadow p-6 mb-8">
						<h3 className="text-lg font-semibold mb-4">
							Performance Trends (Last Hour)
						</h3>
						<div className="h-64 flex items-center justify-center text-gray-500">
							<div className="text-center">
								<p>Chart visualization would go here</p>
								<p className="text-sm">
									Data points: {data.metrics.historical.length}
								</p>
								<p className="text-sm">
									Avg CPU:{" "}
									{(
										data.metrics.historical.reduce(
											(sum, m) => sum + m.cpu.usage,
											0
										) / data.metrics.historical.length
									).toFixed(1)}
									%
								</p>
								<p className="text-sm">
									Avg Memory:{" "}
									{(
										data.metrics.historical.reduce(
											(sum, m) => sum + m.memory.percentage,
											0
										) / data.metrics.historical.length
									).toFixed(1)}
									%
								</p>
							</div>
						</div>
					</div>
				)}

				{/* System Information */}
				<div className="bg-white rounded-lg shadow p-6">
					<h3 className="text-lg font-semibold mb-4">System Information</h3>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
						<div>
							<span className="font-medium">Environment:</span>{" "}
							{data.health.environment}
						</div>
						<div>
							<span className="font-medium">Version:</span>{" "}
							{data.health.version}
						</div>
						<div>
							<span className="font-medium">Uptime:</span>{" "}
							{formatUptime(data.health.uptime)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
