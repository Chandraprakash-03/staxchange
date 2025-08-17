/**
 * Monitoring Configuration
 * Centralized configuration for monitoring, logging, and alerting
 */

export interface MonitoringConfig {
	logging: {
		level: string;
		structured: boolean;
		includeMetadata: boolean;
		maxLogSize: number;
		retentionDays: number;
	};
	performance: {
		slowRequestThreshold: number;
		enablePerformanceTracking: boolean;
		sampleRate: number;
		maxPerformanceEntries: number;
	};
	health: {
		checkInterval: number;
		timeout: number;
		retryAttempts: number;
		services: string[];
	};
	metrics: {
		collectionInterval: number;
		retentionHours: number;
		enableHistoricalData: boolean;
		maxDataPoints: number;
	};
	alerts: {
		enabled: boolean;
		thresholds: {
			cpuUsage: number;
			memoryUsage: number;
			errorRate: number;
			responseTime: number;
			diskUsage: number;
		};
		channels: string[];
	};
	dashboard: {
		refreshInterval: number;
		autoRefresh: boolean;
		enableRealTime: boolean;
		maxChartDataPoints: number;
	};
}

const getMonitoringConfig = (): MonitoringConfig => {
	const env = process.env.NODE_ENV || "development";
	const isProduction = env === "production";

	return {
		logging: {
			level: process.env.LOG_LEVEL || (isProduction ? "info" : "debug"),
			structured: isProduction,
			includeMetadata: true,
			maxLogSize: parseInt(process.env.MAX_LOG_SIZE || "10485760"), // 10MB
			retentionDays: parseInt(process.env.LOG_RETENTION_DAYS || "30"),
		},
		performance: {
			slowRequestThreshold: parseInt(
				process.env.SLOW_REQUEST_THRESHOLD || "1000"
			), // 1 second
			enablePerformanceTracking:
				process.env.ENABLE_PERFORMANCE_TRACKING !== "false",
			sampleRate: parseFloat(process.env.PERFORMANCE_SAMPLE_RATE || "1.0"), // 100% sampling
			maxPerformanceEntries: parseInt(
				process.env.MAX_PERFORMANCE_ENTRIES || "1000"
			),
		},
		health: {
			checkInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || "30000"), // 30 seconds
			timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT || "5000"), // 5 seconds
			retryAttempts: parseInt(process.env.HEALTH_CHECK_RETRIES || "3"),
			services: ["database", "redis", "ai-service", "file-system"],
		},
		metrics: {
			collectionInterval: parseInt(
				process.env.METRICS_COLLECTION_INTERVAL || "60000"
			), // 1 minute
			retentionHours: parseInt(process.env.METRICS_RETENTION_HOURS || "24"),
			enableHistoricalData: process.env.ENABLE_HISTORICAL_METRICS !== "false",
			maxDataPoints: parseInt(process.env.MAX_METRICS_DATA_POINTS || "1440"), // 24 hours at 1-minute intervals
		},
		alerts: {
			enabled: process.env.ENABLE_ALERTS === "true",
			thresholds: {
				cpuUsage: parseFloat(process.env.ALERT_CPU_THRESHOLD || "80"), // 80%
				memoryUsage: parseFloat(process.env.ALERT_MEMORY_THRESHOLD || "85"), // 85%
				errorRate: parseFloat(process.env.ALERT_ERROR_RATE_THRESHOLD || "5"), // 5%
				responseTime: parseInt(
					process.env.ALERT_RESPONSE_TIME_THRESHOLD || "2000"
				), // 2 seconds
				diskUsage: parseFloat(process.env.ALERT_DISK_USAGE_THRESHOLD || "90"), // 90%
			},
			channels: (process.env.ALERT_CHANNELS || "console").split(","),
		},
		dashboard: {
			refreshInterval: parseInt(
				process.env.DASHBOARD_REFRESH_INTERVAL || "30000"
			), // 30 seconds
			autoRefresh: process.env.DASHBOARD_AUTO_REFRESH !== "false",
			enableRealTime: process.env.ENABLE_REALTIME_DASHBOARD !== "false",
			maxChartDataPoints: parseInt(process.env.MAX_CHART_DATA_POINTS || "100"),
		},
	};
};

export const monitoringConfig = getMonitoringConfig();

/**
 * Monitoring feature flags
 */
export const monitoringFeatures = {
	structuredLogging: monitoringConfig.logging.structured,
	performanceTracking: monitoringConfig.performance.enablePerformanceTracking,
	historicalMetrics: monitoringConfig.metrics.enableHistoricalData,
	realTimeDashboard: monitoringConfig.dashboard.enableRealTime,
	alerting: monitoringConfig.alerts.enabled,

	// Feature detection based on environment
	isProduction: process.env.NODE_ENV === "production",
	isDevelopment: process.env.NODE_ENV === "development",
	isTest: process.env.NODE_ENV === "test",

	// Service availability
	hasRedis: process.env.REDIS_URL !== undefined,
	hasDatabase: process.env.DATABASE_URL !== undefined,
	hasAIService: process.env.OPENROUTER_API_KEY !== undefined,
};

/**
 * Get monitoring configuration for specific component
 */
export const getComponentConfig = (component: keyof MonitoringConfig) => {
	return monitoringConfig[component];
};

/**
 * Check if monitoring feature is enabled
 */
export const isFeatureEnabled = (
	feature: keyof typeof monitoringFeatures
): boolean => {
	return monitoringFeatures[feature] === true;
};

/**
 * Monitoring constants
 */
export const MONITORING_CONSTANTS = {
	// HTTP status codes
	HTTP_STATUS: {
		HEALTHY: 200,
		DEGRADED: 200,
		UNHEALTHY: 503,
	},

	// Log levels
	LOG_LEVELS: {
		ERROR: "error",
		WARN: "warn",
		INFO: "info",
		DEBUG: "debug",
	},

	// Service statuses
	SERVICE_STATUS: {
		HEALTHY: "healthy",
		DEGRADED: "degraded",
		UNHEALTHY: "unhealthy",
	},

	// Metric types
	METRIC_TYPES: {
		COUNTER: "counter",
		GAUGE: "gauge",
		HISTOGRAM: "histogram",
		TIMER: "timer",
	},

	// Performance thresholds
	PERFORMANCE_THRESHOLDS: {
		FAST: 100, // < 100ms
		NORMAL: 500, // < 500ms
		SLOW: 1000, // < 1s
		VERY_SLOW: 5000, // < 5s
	},
} as const;
