import morgan from "morgan";
import { Request, Response } from "express";
import { logger, performanceMonitor } from "@/utils/logger";
import { monitoringService } from "@/services/monitoring";

/**
 * Custom morgan token for request ID
 */
morgan.token("requestId", (req: Request) => {
	return (req as any).requestId || "unknown";
});

/**
 * Custom morgan token for user ID
 */
morgan.token("userId", (req: Request) => {
	return (req as any).user?.id || "anonymous";
});

/**
 * Custom morgan token for response time in milliseconds
 */
morgan.token("responseTimeMs", (req: Request, res: Response) => {
	const responseTime = res.getHeader("X-Response-Time");
	return responseTime ? `${responseTime}ms` : "unknown";
});

/**
 * Development logging format
 */
export const developmentLogger = morgan(
	":method :url :status :res[content-length] - :response-time ms [:requestId] [:userId]",
	{
		skip: (req: Request) => {
			// Skip logging for health checks and static assets
			return (
				req.url.includes("/health") ||
				req.url.includes("/favicon.ico") ||
				req.url.includes("/_next/static")
			);
		},
	}
);

/**
 * Production logging format (JSON structured)
 */
export const productionLogger = morgan(
	(tokens, req: Request, res: Response) => {
		const log = {
			timestamp: new Date().toISOString(),
			method: tokens.method(req, res),
			url: tokens.url(req, res),
			status: parseInt(tokens.status(req, res) || "0", 10),
			contentLength: tokens.res(req, res, "content-length"),
			responseTime: parseFloat(tokens["response-time"](req, res) || "0"),
			requestId: tokens.requestId(req, res),
			userId: tokens.userId(req, res),
			userAgent: req.get("User-Agent"),
			ip: req.ip,
			referer: tokens.referrer(req, res),
		};

		return JSON.stringify(log);
	},
	{
		skip: (req: Request) => {
			// Skip logging for health checks and static assets
			return (
				req.url.includes("/health") ||
				req.url.includes("/favicon.ico") ||
				req.url.includes("/_next/static")
			);
		},
	}
);

/**
 * Error logging format
 */
export const errorLogger = morgan((tokens, req: Request, res: Response) => {
	const status = parseInt(tokens.status(req, res) || "0", 10);

	// Only log errors (4xx and 5xx status codes)
	if (status < 400) {
		return null;
	}

	const log = {
		timestamp: new Date().toISOString(),
		level: "error",
		method: tokens.method(req, res),
		url: tokens.url(req, res),
		status,
		contentLength: tokens.res(req, res, "content-length"),
		responseTime: parseFloat(tokens["response-time"](req, res) || "0"),
		requestId: tokens.requestId(req, res),
		userId: tokens.userId(req, res),
		userAgent: req.get("User-Agent"),
		ip: req.ip,
		referer: tokens.referrer(req, res),
		body: req.method !== "GET" ? req.body : undefined,
		query: Object.keys(req.query).length > 0 ? req.query : undefined,
	};

	return JSON.stringify(log);
});

/**
 * API access logging for analytics
 */
export const apiAccessLogger = morgan((tokens, req: Request, res: Response) => {
	// Only log API routes
	if (!req.url.startsWith("/api/")) {
		return null;
	}

	const log = {
		timestamp: new Date().toISOString(),
		type: "api_access",
		method: tokens.method(req, res),
		endpoint: tokens.url(req, res),
		status: parseInt(tokens.status(req, res) || "0", 10),
		responseTime: parseFloat(tokens["response-time"](req, res) || "0"),
		requestId: tokens.requestId(req, res),
		userId: tokens.userId(req, res),
		ip: req.ip,
		userAgent: req.get("User-Agent"),
		contentLength: tokens.res(req, res, "content-length"),
	};

	return JSON.stringify(log);
});

/**
 * Security event logging
 */
export const securityLogger = (event: {
	type: "auth_failure" | "rate_limit" | "invalid_token" | "suspicious_activity";
	message: string;
	req: Request;
	additionalData?: any;
}) => {
	logger.warn(`Security Event: ${event.message}`, {
		type: event.type,
		method: event.req.method,
		url: event.req.url,
		ip: event.req.ip,
		userAgent: event.req.get("User-Agent"),
		requestId: (event.req as any).requestId,
		userId: (event.req as any).user?.id,
		additionalData: event.additionalData,
	});
};

/**
 * Performance logging for slow requests
 */
export const performanceLogger = (threshold: number = 1000) => {
	return morgan((tokens, req: Request, res: Response) => {
		const responseTime = parseFloat(tokens["response-time"](req, res) || "0");

		// Only log slow requests
		if (responseTime < threshold) {
			return null;
		}

		const log = {
			timestamp: new Date().toISOString(),
			level: "performance",
			type: "slow_request",
			method: tokens.method(req, res),
			url: tokens.url(req, res),
			status: parseInt(tokens.status(req, res) || "0", 10),
			responseTime,
			threshold,
			requestId: tokens.requestId(req, res),
			userId: tokens.userId(req, res),
			ip: req.ip,
			userAgent: req.get("User-Agent"),
		};

		return JSON.stringify(log);
	});
};

/**
 * Get appropriate logger based on environment
 */
export const getLogger = () => {
	const env = process.env.NODE_ENV || "development";

	switch (env) {
		case "production":
			return [productionLogger, errorLogger, apiAccessLogger];
		case "test":
			return []; // No logging in tests
		default:
			return [developmentLogger, errorLogger];
	}
};

/**
 * Enhanced performance monitoring middleware
 */
export const enhancedPerformanceMiddleware = (
	req: Request,
	res: Response,
	next: Function
) => {
	const startTime = Date.now();
	const requestId = (req as any).requestId || `req-${Date.now()}`;
	const operation = `${req.method} ${req.path}`;

	// Start performance monitoring
	performanceMonitor.start(requestId);

	// Override res.end to capture completion time
	const originalEnd = res.end;
	res.end = function (...args: any[]) {
		const duration = Date.now() - startTime;

		// Record performance metrics
		monitoringService.recordPerformanceEvent(operation, duration, {
			requestId,
			method: req.method,
			path: req.path,
			statusCode: res.statusCode,
			userId: (req as any).user?.id,
			ip: req.ip,
			userAgent: req.get("User-Agent"),
		});

		// End performance monitoring
		performanceMonitor.end(requestId, {
			method: req.method,
			path: req.path,
			statusCode: res.statusCode,
		});

		// Log slow requests
		if (duration > 1000) {
			logger.warn(`Slow request detected`, {
				requestId,
				operation,
				duration,
				method: req.method,
				path: req.path,
				statusCode: res.statusCode,
			});
		}

		// Call original end method
		originalEnd.apply(this, args);
	};

	next();
};

/**
 * Request tracking middleware
 */
export const requestTrackingMiddleware = (
	req: Request,
	res: Response,
	next: Function
) => {
	const requestId =
		(req.headers["x-request-id"] as string) ||
		`req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	(req as any).requestId = requestId;

	// Add request ID to response headers
	res.setHeader("X-Request-ID", requestId);

	// Log request start
	logger.info("Request started", {
		requestId,
		method: req.method,
		path: req.path,
		ip: req.ip,
		userAgent: req.get("User-Agent"),
		userId: (req as any).user?.id,
	});

	next();
};

/**
 * Error tracking middleware
 */
export const errorTrackingMiddleware = (
	error: Error,
	req: Request,
	res: Response,
	next: Function
) => {
	const requestId = (req as any).requestId;

	// Record error event
	monitoringService.recordError(error, {
		requestId,
		method: req.method,
		path: req.path,
		ip: req.ip,
		userAgent: req.get("User-Agent"),
		userId: (req as any).user?.id,
		body: req.method !== "GET" ? req.body : undefined,
		query: Object.keys(req.query).length > 0 ? req.query : undefined,
	});

	next(error);
};
