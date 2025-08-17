import rateLimit from "express-rate-limit";
import { Request, Response } from "express";
import { AppError } from "@/utils/errors";

/**
 * Rate limiting configuration for different endpoint types
 */
export const rateLimitConfig = {
	// General API rate limiting
	general: rateLimit({
		windowMs: 15 * 60 * 1000, // 15 minutes
		max: 100, // Limit each IP to 100 requests per windowMs
		message: {
			error: "Too many requests",
			code: "RATE_LIMIT_EXCEEDED",
			message: "Too many requests from this IP, please try again later.",
			retryAfter: 15 * 60, // 15 minutes in seconds
		},
		standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
		legacyHeaders: false, // Disable the `X-RateLimit-*` headers
		handler: (req: Request, res: Response) => {
			const error = new AppError({
				category: "AI_API_RATE_LIMIT" as any,
				severity: "MEDIUM" as any,
				code: "GENERAL_RATE_LIMIT_EXCEEDED",
				message: "General rate limit exceeded",
				userMessage: "Too many requests. Please wait 15 minutes and try again.",
				context: {
					operation: `${req.method} ${req.path}`,
					timestamp: new Date(),
					additionalData: {
						ip: req.ip,
						userAgent: req.get("User-Agent"),
						windowMs: 15 * 60 * 1000,
						maxRequests: 100,
					},
				},
				recoveryActions: [
					{
						type: "retry",
						description: "Wait 15 minutes and retry the request",
						automated: false,
						estimatedTime: 15 * 60 * 1000,
					},
				],
				retryable: true,
				maxRetries: 1,
				retryDelay: 15 * 60 * 1000,
				exponentialBackoff: false,
			});

			res.status(429).json({
				success: false,
				error: {
					code: error.code,
					message: error.message,
					userMessage: error.userMessage,
					category: error.category,
					severity: error.severity,
					retryable: error.retryable,
					recoveryActions: error.recoveryActions,
				},
				timestamp: error.timestamp.toISOString(),
			});
		},
	}),

	// Authentication endpoints - more restrictive
	auth: rateLimit({
		windowMs: 15 * 60 * 1000, // 15 minutes
		max: 10, // Limit each IP to 10 auth requests per windowMs
		message: {
			error: "Too many authentication attempts",
			code: "AUTH_RATE_LIMIT_EXCEEDED",
			message: "Too many authentication attempts, please try again later.",
			retryAfter: 15 * 60,
		},
		standardHeaders: true,
		legacyHeaders: false,
		handler: (req: Request, res: Response) => {
			const error = new AppError({
				category: "GITHUB_AUTH" as any,
				severity: "HIGH" as any,
				code: "AUTH_RATE_LIMIT_EXCEEDED",
				message: "Authentication rate limit exceeded",
				userMessage:
					"Too many authentication attempts. Please wait 15 minutes and try again.",
				context: {
					operation: `${req.method} ${req.path}`,
					timestamp: new Date(),
					additionalData: {
						ip: req.ip,
						userAgent: req.get("User-Agent"),
						windowMs: 15 * 60 * 1000,
						maxRequests: 10,
					},
				},
				recoveryActions: [
					{
						type: "retry",
						description: "Wait 15 minutes and retry authentication",
						automated: false,
						estimatedTime: 15 * 60 * 1000,
					},
				],
				retryable: true,
				maxRetries: 1,
				retryDelay: 15 * 60 * 1000,
				exponentialBackoff: false,
			});

			res.status(429).json({
				success: false,
				error: {
					code: error.code,
					message: error.message,
					userMessage: error.userMessage,
					category: error.category,
					severity: error.severity,
					retryable: error.retryable,
					recoveryActions: error.recoveryActions,
				},
				timestamp: error.timestamp.toISOString(),
			});
		},
	}),

	// AI conversion endpoints - very restrictive due to cost
	aiConversion: rateLimit({
		windowMs: 60 * 60 * 1000, // 1 hour
		max: 5, // Limit each IP to 5 conversion requests per hour
		message: {
			error: "Too many conversion requests",
			code: "CONVERSION_RATE_LIMIT_EXCEEDED",
			message: "Too many conversion requests, please try again later.",
			retryAfter: 60 * 60,
		},
		standardHeaders: true,
		legacyHeaders: false,
		handler: (req: Request, res: Response) => {
			const error = new AppError({
				category: "AI_API_RATE_LIMIT" as any,
				severity: "HIGH" as any,
				code: "CONVERSION_RATE_LIMIT_EXCEEDED",
				message: "AI conversion rate limit exceeded",
				userMessage:
					"Too many conversion requests. Please wait 1 hour and try again.",
				context: {
					operation: `${req.method} ${req.path}`,
					timestamp: new Date(),
					additionalData: {
						ip: req.ip,
						userAgent: req.get("User-Agent"),
						windowMs: 60 * 60 * 1000,
						maxRequests: 5,
					},
				},
				recoveryActions: [
					{
						type: "retry",
						description: "Wait 1 hour and retry conversion",
						automated: false,
						estimatedTime: 60 * 60 * 1000,
					},
				],
				retryable: true,
				maxRetries: 1,
				retryDelay: 60 * 60 * 1000,
				exponentialBackoff: false,
			});

			res.status(429).json({
				success: false,
				error: {
					code: error.code,
					message: error.message,
					userMessage: error.userMessage,
					category: error.category,
					severity: error.severity,
					retryable: error.retryable,
					recoveryActions: error.recoveryActions,
				},
				timestamp: error.timestamp.toISOString(),
			});
		},
	}),

	// GitHub import endpoints - moderate restrictions
	githubImport: rateLimit({
		windowMs: 15 * 60 * 1000, // 15 minutes
		max: 20, // Limit each IP to 20 import requests per windowMs
		message: {
			error: "Too many import requests",
			code: "IMPORT_RATE_LIMIT_EXCEEDED",
			message: "Too many import requests, please try again later.",
			retryAfter: 15 * 60,
		},
		standardHeaders: true,
		legacyHeaders: false,
		handler: (req: Request, res: Response) => {
			const error = new AppError({
				category: "GITHUB_RATE_LIMIT" as any,
				severity: "MEDIUM" as any,
				code: "IMPORT_RATE_LIMIT_EXCEEDED",
				message: "GitHub import rate limit exceeded",
				userMessage:
					"Too many import requests. Please wait 15 minutes and try again.",
				context: {
					operation: `${req.method} ${req.path}`,
					timestamp: new Date(),
					additionalData: {
						ip: req.ip,
						userAgent: req.get("User-Agent"),
						windowMs: 15 * 60 * 1000,
						maxRequests: 20,
					},
				},
				recoveryActions: [
					{
						type: "retry",
						description: "Wait 15 minutes and retry import",
						automated: false,
						estimatedTime: 15 * 60 * 1000,
					},
				],
				retryable: true,
				maxRetries: 1,
				retryDelay: 15 * 60 * 1000,
				exponentialBackoff: false,
			});

			res.status(429).json({
				success: false,
				error: {
					code: error.code,
					message: error.message,
					userMessage: error.userMessage,
					category: error.category,
					severity: error.severity,
					retryable: error.retryable,
					recoveryActions: error.recoveryActions,
				},
				timestamp: error.timestamp.toISOString(),
			});
		},
	}),

	// Preview endpoints - moderate restrictions
	preview: rateLimit({
		windowMs: 5 * 60 * 1000, // 5 minutes
		max: 50, // Limit each IP to 50 preview requests per 5 minutes
		message: {
			error: "Too many preview requests",
			code: "PREVIEW_RATE_LIMIT_EXCEEDED",
			message: "Too many preview requests, please try again later.",
			retryAfter: 5 * 60,
		},
		standardHeaders: true,
		legacyHeaders: false,
		handler: (req: Request, res: Response) => {
			const error = new AppError({
				category: "AI_API_RATE_LIMIT" as any,
				severity: "LOW" as any,
				code: "PREVIEW_RATE_LIMIT_EXCEEDED",
				message: "Preview rate limit exceeded",
				userMessage:
					"Too many preview requests. Please wait 5 minutes and try again.",
				context: {
					operation: `${req.method} ${req.path}`,
					timestamp: new Date(),
					additionalData: {
						ip: req.ip,
						userAgent: req.get("User-Agent"),
						windowMs: 5 * 60 * 1000,
						maxRequests: 50,
					},
				},
				recoveryActions: [
					{
						type: "retry",
						description: "Wait 5 minutes and retry preview",
						automated: false,
						estimatedTime: 5 * 60 * 1000,
					},
				],
				retryable: true,
				maxRetries: 1,
				retryDelay: 5 * 60 * 1000,
				exponentialBackoff: false,
			});

			res.status(429).json({
				success: false,
				error: {
					code: error.code,
					message: error.message,
					userMessage: error.userMessage,
					category: error.category,
					severity: error.severity,
					retryable: error.retryable,
					recoveryActions: error.recoveryActions,
				},
				timestamp: error.timestamp.toISOString(),
			});
		},
	}),
};

/**
 * Create a custom rate limiter with user-based limits for authenticated requests
 */
export const createUserRateLimit = (options: {
	windowMs: number;
	maxPerUser: number;
	maxPerIP: number;
	skipSuccessfulRequests?: boolean;
}) => {
	const userLimits = new Map<string, { count: number; resetTime: number }>();
	const ipLimits = new Map<string, { count: number; resetTime: number }>();

	return (req: Request, res: Response, next: Function) => {
		const now = Date.now();
		const userId = (req as any).user?.id;
		const ip = req.ip;

		// Clean up expired entries
		const cleanupExpired = (
			limits: Map<string, { count: number; resetTime: number }>
		) => {
			for (const [key, data] of limits.entries()) {
				if (now > data.resetTime) {
					limits.delete(key);
				}
			}
		};

		cleanupExpired(userLimits);
		cleanupExpired(ipLimits);

		// Check user-based limit (if authenticated)
		if (userId) {
			const userLimit = userLimits.get(userId);
			if (!userLimit) {
				userLimits.set(userId, { count: 1, resetTime: now + options.windowMs });
			} else if (now <= userLimit.resetTime) {
				if (userLimit.count >= options.maxPerUser) {
					return res.status(429).json({
						error: "User rate limit exceeded",
						code: "USER_RATE_LIMIT_EXCEEDED",
						message: "Too many requests for this user account.",
						retryAfter: Math.ceil((userLimit.resetTime - now) / 1000),
					});
				}
				userLimit.count++;
			} else {
				userLimits.set(userId, { count: 1, resetTime: now + options.windowMs });
			}
		}

		// Check IP-based limit
		const ipKey = ip ?? "unknown";
		const ipLimit = ipLimits.get(ipKey);
		if (!ipLimit) {
			ipLimits.set(ipKey, { count: 1, resetTime: now + options.windowMs });
		} else if (now <= ipLimit.resetTime) {
			if (ipLimit.count >= options.maxPerIP) {
				return res.status(429).json({
					error: "IP rate limit exceeded",
					code: "IP_RATE_LIMIT_EXCEEDED",
					message: "Too many requests from this IP address.",
					retryAfter: Math.ceil((ipLimit.resetTime - now) / 1000),
				});
			}
			ipLimit.count++;
		} else {
			ipLimits.set(ipKey, { count: 1, resetTime: now + options.windowMs });
		}

		next();
	};
};

/**
 * AI API specific rate limiting with cost-based throttling
 */
export const aiApiRateLimit = rateLimit({
	windowMs: 60 * 60 * 1000, // 1 hour
	max: 3, // Very restrictive for AI API calls
	message: {
		error: "AI API rate limit exceeded",
		code: "AI_API_RATE_LIMIT_EXCEEDED",
		message:
			"Too many AI API requests. Please wait before making more requests.",
		retryAfter: 60 * 60,
	},
	standardHeaders: true,
	legacyHeaders: false,
	keyGenerator: (req: Request) => {
		// Use user ID if authenticated, otherwise IP
		const user = (req as any).user;
		return user?.id || req.ip || "unknown";
	},
	handler: (req: Request, res: Response) => {
		const error = new AppError({
			category: "AI_API_RATE_LIMIT" as any,
			severity: "HIGH" as any,
			code: "AI_API_RATE_LIMIT_EXCEEDED",
			message: "AI API rate limit exceeded",
			userMessage:
				"You've reached the limit for AI API requests. Please wait 1 hour before trying again.",
			context: {
				operation: `${req.method} ${req.path}`,
				timestamp: new Date(),
				additionalData: {
					userId: (req as any).user?.id,
					ip: req.ip,
					userAgent: req.get("User-Agent"),
					windowMs: 60 * 60 * 1000,
					maxRequests: 3,
				},
			},
			recoveryActions: [
				{
					type: "retry",
					description: "Wait 1 hour and retry the AI API request",
					automated: false,
					estimatedTime: 60 * 60 * 1000,
				},
			],
			retryable: true,
			maxRetries: 1,
			retryDelay: 60 * 60 * 1000,
			exponentialBackoff: false,
		});

		res.status(429).json({
			success: false,
			error: {
				code: error.code,
				message: error.message,
				userMessage: error.userMessage,
				category: error.category,
				severity: error.severity,
				retryable: error.retryable,
				recoveryActions: error.recoveryActions,
			},
			timestamp: error.timestamp.toISOString(),
		});
	},
});

/**
 * Conversion-specific rate limiting with project size consideration
 */
export const conversionRateLimit = (
	req: Request,
	res: Response,
	next: Function
) => {
	const userId = (req as any).user?.id;
	const ip = req.ip;
	const key = userId || ip || "unknown";

	// Store conversion attempts in memory (in production, use Redis)
	const conversionAttempts = new Map<
		string,
		{ count: number; resetTime: number; totalSize: number }
	>();

	const now = Date.now();
	const windowMs = 24 * 60 * 60 * 1000; // 24 hours
	const maxConversions = 2; // Max 2 conversions per day
	const maxTotalSize = 100 * 1024 * 1024; // 100MB total per day

	// Clean up expired entries
	for (const [entryKey, data] of conversionAttempts.entries()) {
		if (now > data.resetTime) {
			conversionAttempts.delete(entryKey);
		}
	}

	const userAttempts = conversionAttempts.get(key);
	const projectSize = req.body?.projectSize || 0;

	if (!userAttempts) {
		conversionAttempts.set(key, {
			count: 1,
			resetTime: now + windowMs,
			totalSize: projectSize,
		});
	} else if (now <= userAttempts.resetTime) {
		// Check conversion count limit
		if (userAttempts.count >= maxConversions) {
			return res.status(429).json({
				success: false,
				error: {
					code: "CONVERSION_LIMIT_EXCEEDED",
					message: "Daily conversion limit exceeded",
					userMessage:
						"You've reached your daily limit of 2 conversions. Please try again tomorrow.",
					retryAfter: Math.ceil((userAttempts.resetTime - now) / 1000),
				},
			});
		}

		// Check total size limit
		if (userAttempts.totalSize + projectSize > maxTotalSize) {
			return res.status(429).json({
				success: false,
				error: {
					code: "CONVERSION_SIZE_LIMIT_EXCEEDED",
					message: "Daily conversion size limit exceeded",
					userMessage:
						"You've reached your daily limit for project size. Please try again tomorrow.",
					retryAfter: Math.ceil((userAttempts.resetTime - now) / 1000),
				},
			});
		}

		userAttempts.count++;
		userAttempts.totalSize += projectSize;
	} else {
		conversionAttempts.set(key, {
			count: 1,
			resetTime: now + windowMs,
			totalSize: projectSize,
		});
	}

	next();
};

/**
 * GitHub import rate limiting with repository size consideration
 */
export const githubImportRateLimit = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 10, // Reduced from 20 to 10
	message: {
		error: "GitHub import rate limit exceeded",
		code: "GITHUB_IMPORT_RATE_LIMIT_EXCEEDED",
		message:
			"Too many GitHub import requests. Please wait before importing more repositories.",
		retryAfter: 15 * 60,
	},
	standardHeaders: true,
	legacyHeaders: false,
	keyGenerator: (req: Request) => {
		const user = (req as any).user;
		return user?.id || req.ip || "unknown";
	},
	handler: (req: Request, res: Response) => {
		const error = new AppError({
			category: "GITHUB_RATE_LIMIT" as any,
			severity: "MEDIUM" as any,
			code: "GITHUB_IMPORT_RATE_LIMIT_EXCEEDED",
			message: "GitHub import rate limit exceeded",
			userMessage:
				"Too many import requests. Please wait 15 minutes and try again.",
			context: {
				operation: `${req.method} ${req.path}`,
				timestamp: new Date(),
				additionalData: {
					userId: (req as any).user?.id,
					ip: req.ip,
					userAgent: req.get("User-Agent"),
					windowMs: 15 * 60 * 1000,
					maxRequests: 10,
				},
			},
			recoveryActions: [
				{
					type: "retry",
					description: "Wait 15 minutes and retry import",
					automated: false,
					estimatedTime: 15 * 60 * 1000,
				},
			],
			retryable: true,
			maxRetries: 1,
			retryDelay: 15 * 60 * 1000,
			exponentialBackoff: false,
		});

		res.status(429).json({
			success: false,
			error: {
				code: error.code,
				message: error.message,
				userMessage: error.userMessage,
				category: error.category,
				severity: error.severity,
				retryable: error.retryable,
				recoveryActions: error.recoveryActions,
			},
			timestamp: error.timestamp.toISOString(),
		});
	},
});
