import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import { Request, Response, NextFunction } from "express";
import { AppError } from "@/utils/errors";

/**
 * Security middleware configuration
 */
export const securityMiddleware = {
	// Helmet configuration for security headers
	helmet: helmet({
		contentSecurityPolicy: {
			directives: {
				defaultSrc: ["'self'"],
				styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
				fontSrc: ["'self'", "https://fonts.gstatic.com"],
				imgSrc: ["'self'", "data:", "https:"],
				scriptSrc: ["'self'", "'unsafe-eval'"], // unsafe-eval needed for WebContainers
				connectSrc: [
					"'self'",
					"https://api.github.com",
					"https://openrouter.ai",
				],
				frameSrc: ["'self'", "https://stackblitz.com"], // For WebContainers
				workerSrc: ["'self'", "blob:"], // For WebContainers
			},
		},
		crossOriginEmbedderPolicy: false, // Disabled for WebContainers compatibility
	}),

	// CORS configuration
	cors: cors({
		origin: (origin, callback) => {
			// Allow requests with no origin (mobile apps, etc.)
			if (!origin) return callback(null, true);

			const allowedOrigins = [
				"http://localhost:3000",
				"http://localhost:3001",
				"https://localhost:3000",
				"https://localhost:3001",
				process.env.FRONTEND_URL,
				process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
			].filter(Boolean);

			if (allowedOrigins.includes(origin)) {
				callback(null, true);
			} else {
				callback(new Error("Not allowed by CORS"));
			}
		},
		credentials: true,
		methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
		allowedHeaders: [
			"Origin",
			"X-Requested-With",
			"Content-Type",
			"Accept",
			"Authorization",
			"X-Request-ID",
		],
		exposedHeaders: ["X-Request-ID", "RateLimit-Limit", "RateLimit-Remaining"],
	}),

	// Compression middleware
	compression: compression({
		filter: (req, res) => {
			if (req.headers["x-no-compression"]) {
				return false;
			}
			return compression.filter(req, res);
		},
		level: 6,
		threshold: 1024,
	}),
};

/**
 * Request ID middleware for tracking requests
 */
export const requestId = (
	req: Request,
	res: Response,
	next: NextFunction
): void => {
	const requestId =
		(req.headers["x-request-id"] as string) ||
		`req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

	(req as any).requestId = requestId;
	res.setHeader("X-Request-ID", requestId);

	next();
};

/**
 * Request size limiting middleware
 */
export const requestSizeLimit = (maxSize: string = "10mb") => {
	return (req: Request, res: Response, next: NextFunction): void => {
		const contentLength = req.headers["content-length"];

		if (contentLength) {
			const sizeInBytes = parseInt(contentLength, 10);
			const maxSizeInBytes = parseSize(maxSize);

			if (sizeInBytes > maxSizeInBytes) {
				const error = new AppError({
					category: "VALIDATION" as any,
					severity: "MEDIUM" as any,
					code: "REQUEST_TOO_LARGE",
					message: `Request size ${sizeInBytes} bytes exceeds limit of ${maxSizeInBytes} bytes`,
					userMessage:
						"The request is too large. Please reduce the size and try again.",
					context: {
						operation: `${req.method} ${req.path}`,
						timestamp: new Date(),
						additionalData: {
							contentLength: sizeInBytes,
							maxSize: maxSizeInBytes,
						},
					},
					recoveryActions: [
						{
							type: "manual",
							description: "Reduce request size and retry",
							automated: false,
						},
					],
					retryable: false,
					maxRetries: 0,
					retryDelay: 0,
					exponentialBackoff: false,
				});

				next(error);
				return;
			}
		}

		next();
	};
};

/**
 * IP whitelist/blacklist middleware
 */
export const ipFilter = (options: {
	whitelist?: string[];
	blacklist?: string[];
}) => {
	return (req: Request, res: Response, next: NextFunction): void => {
		const clientIP = req.ip;

		// Check blacklist first
		if (options.blacklist && options.blacklist.includes(clientIP)) {
			const error = new AppError({
				category: "AUTHORIZATION" as any,
				severity: "HIGH" as any,
				code: "IP_BLOCKED",
				message: `IP address ${clientIP} is blocked`,
				userMessage: "Access denied from this IP address.",
				context: {
					operation: `${req.method} ${req.path}`,
					timestamp: new Date(),
					additionalData: {
						ip: clientIP,
						blacklist: options.blacklist,
					},
				},
				recoveryActions: [
					{
						type: "manual",
						description: "Contact support if you believe this is an error",
						automated: false,
					},
				],
				retryable: false,
				maxRetries: 0,
				retryDelay: 0,
				exponentialBackoff: false,
			});

			next(error);
			return;
		}

		// Check whitelist if provided
		if (options.whitelist && !options.whitelist.includes(clientIP)) {
			const error = new AppError({
				category: "AUTHORIZATION" as any,
				severity: "HIGH" as any,
				code: "IP_NOT_WHITELISTED",
				message: `IP address ${clientIP} is not whitelisted`,
				userMessage: "Access denied from this IP address.",
				context: {
					operation: `${req.method} ${req.path}`,
					timestamp: new Date(),
					additionalData: {
						ip: clientIP,
						whitelist: options.whitelist,
					},
				},
				recoveryActions: [
					{
						type: "manual",
						description: "Contact support to whitelist your IP address",
						automated: false,
					},
				],
				retryable: false,
				maxRetries: 0,
				retryDelay: 0,
				exponentialBackoff: false,
			});

			next(error);
			return;
		}

		next();
	};
};

/**
 * API key validation middleware (for internal services)
 */
export const validateApiKey = (
	req: Request,
	res: Response,
	next: NextFunction
): void => {
	const apiKey = req.headers["x-api-key"] as string;
	const validApiKey = process.env.INTERNAL_API_KEY;

	if (!validApiKey) {
		// If no API key is configured, skip validation
		return next();
	}

	if (!apiKey || apiKey !== validApiKey) {
		const error = new AppError({
			category: "AUTHENTICATION" as any,
			severity: "HIGH" as any,
			code: "INVALID_API_KEY",
			message: "Invalid or missing API key",
			userMessage: "Authentication failed.",
			context: {
				operation: `${req.method} ${req.path}`,
				timestamp: new Date(),
				additionalData: {
					hasApiKey: !!apiKey,
				},
			},
			recoveryActions: [
				{
					type: "manual",
					description: "Provide a valid API key in X-API-Key header",
					automated: false,
				},
			],
			retryable: false,
			maxRetries: 0,
			retryDelay: 0,
			exponentialBackoff: false,
		});

		next(error);
		return;
	}

	next();
};

/**
 * User agent validation middleware
 */
export const validateUserAgent = (
	req: Request,
	res: Response,
	next: NextFunction
): void => {
	const userAgent = req.get("User-Agent");

	if (!userAgent) {
		const error = new AppError({
			category: "VALIDATION" as any,
			severity: "LOW" as any,
			code: "MISSING_USER_AGENT",
			message: "User-Agent header is required",
			userMessage: "Please use a valid client to access this service.",
			context: {
				operation: `${req.method} ${req.path}`,
				timestamp: new Date(),
				additionalData: {
					headers: req.headers,
				},
			},
			recoveryActions: [
				{
					type: "manual",
					description: "Include User-Agent header in the request",
					automated: false,
				},
			],
			retryable: false,
			maxRetries: 0,
			retryDelay: 0,
			exponentialBackoff: false,
		});

		next(error);
		return;
	}

	next();
};

/**
 * SQL injection protection middleware
 */
export const sqlInjectionProtection = (
	req: Request,
	res: Response,
	next: NextFunction
): void => {
	const sqlPatterns = [
		/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
		/('|(\\')|(;)|(\\;)|(\|)|(\*)|(%)|(<)|(>)|(\{)|(\})|(\[)|(\])|(\\)|(\/\*)|(\*\/)|(\-\-)|(\#)/gi,
		/((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/gi,
		/((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/gi,
	];

	const checkForSqlInjection = (obj: any, path = ""): boolean => {
		if (typeof obj === "string") {
			return sqlPatterns.some((pattern) => pattern.test(obj));
		}

		if (Array.isArray(obj)) {
			return obj.some((item, index) =>
				checkForSqlInjection(item, `${path}[${index}]`)
			);
		}

		if (obj && typeof obj === "object") {
			return Object.entries(obj).some(([key, value]) =>
				checkForSqlInjection(value, path ? `${path}.${key}` : key)
			);
		}

		return false;
	};

	// Check request body, query, and params
	const sources = [
		{ data: req.body, name: "body" },
		{ data: req.query, name: "query" },
		{ data: req.params, name: "params" },
	];

	for (const source of sources) {
		if (checkForSqlInjection(source.data)) {
			const error = new AppError({
				category: "SECURITY" as any,
				severity: "HIGH" as any,
				code: "SQL_INJECTION_ATTEMPT",
				message: `Potential SQL injection detected in ${source.name}`,
				userMessage: "Invalid input detected. Please check your request.",
				context: {
					operation: `${req.method} ${req.path}`,
					timestamp: new Date(),
					additionalData: {
						source: source.name,
						ip: req.ip,
						userAgent: req.get("User-Agent"),
					},
				},
				recoveryActions: [
					{
						type: "manual",
						description: "Remove potentially malicious content from request",
						automated: false,
					},
				],
				retryable: false,
				maxRetries: 0,
				retryDelay: 0,
				exponentialBackoff: false,
			});

			next(error);
			return;
		}
	}

	next();
};

/**
 * NoSQL injection protection middleware
 */
export const noSqlInjectionProtection = (
	req: Request,
	res: Response,
	next: NextFunction
): void => {
	const checkForNoSqlInjection = (obj: any): boolean => {
		if (obj && typeof obj === "object") {
			// Check for MongoDB operators
			const mongoOperators = [
				"$where",
				"$ne",
				"$in",
				"$nin",
				"$gt",
				"$gte",
				"$lt",
				"$lte",
				"$regex",
				"$exists",
				"$type",
				"$mod",
				"$all",
				"$size",
				"$elemMatch",
				"$not",
				"$or",
				"$and",
				"$nor",
			];

			for (const key of Object.keys(obj)) {
				if (mongoOperators.includes(key)) {
					return true;
				}

				if (typeof obj[key] === "object" && checkForNoSqlInjection(obj[key])) {
					return true;
				}
			}
		}

		return false;
	};

	// Check request body, query, and params
	const sources = [
		{ data: req.body, name: "body" },
		{ data: req.query, name: "query" },
		{ data: req.params, name: "params" },
	];

	for (const source of sources) {
		if (checkForNoSqlInjection(source.data)) {
			const error = new AppError({
				category: "SECURITY" as any,
				severity: "HIGH" as any,
				code: "NOSQL_INJECTION_ATTEMPT",
				message: `Potential NoSQL injection detected in ${source.name}`,
				userMessage: "Invalid input detected. Please check your request.",
				context: {
					operation: `${req.method} ${req.path}`,
					timestamp: new Date(),
					additionalData: {
						source: source.name,
						ip: req.ip,
						userAgent: req.get("User-Agent"),
					},
				},
				recoveryActions: [
					{
						type: "manual",
						description: "Remove potentially malicious content from request",
						automated: false,
					},
				],
				retryable: false,
				maxRetries: 0,
				retryDelay: 0,
				exponentialBackoff: false,
			});

			next(error);
			return;
		}
	}

	next();
};

/**
 * Path traversal protection middleware
 */
export const pathTraversalProtection = (
	req: Request,
	res: Response,
	next: NextFunction
): void => {
	const pathTraversalPatterns = [
		/\.\./g,
		/\.\\/g,
		/\.\//g,
		/%2e%2e/gi,
		/%2e%2f/gi,
		/%2f%2e%2e/gi,
		/\.%2e/gi,
		/%2e\./gi,
	];

	const checkForPathTraversal = (obj: any): boolean => {
		if (typeof obj === "string") {
			return pathTraversalPatterns.some((pattern) => pattern.test(obj));
		}

		if (Array.isArray(obj)) {
			return obj.some((item) => checkForPathTraversal(item));
		}

		if (obj && typeof obj === "object") {
			return Object.values(obj).some((value) => checkForPathTraversal(value));
		}

		return false;
	};

	// Check request body, query, params, and URL
	const sources = [
		{ data: req.body, name: "body" },
		{ data: req.query, name: "query" },
		{ data: req.params, name: "params" },
		{ data: req.url, name: "url" },
	];

	for (const source of sources) {
		if (checkForPathTraversal(source.data)) {
			const error = new AppError({
				category: "SECURITY" as any,
				severity: "HIGH" as any,
				code: "PATH_TRAVERSAL_ATTEMPT",
				message: `Potential path traversal detected in ${source.name}`,
				userMessage: "Invalid path detected. Please check your request.",
				context: {
					operation: `${req.method} ${req.path}`,
					timestamp: new Date(),
					additionalData: {
						source: source.name,
						ip: req.ip,
						userAgent: req.get("User-Agent"),
					},
				},
				recoveryActions: [
					{
						type: "manual",
						description: "Remove path traversal sequences from request",
						automated: false,
					},
				],
				retryable: false,
				maxRetries: 0,
				retryDelay: 0,
				exponentialBackoff: false,
			});

			next(error);
			return;
		}
	}

	next();
};

/**
 * XSS protection middleware (enhanced)
 */
export const xssProtection = (
	req: Request,
	res: Response,
	next: NextFunction
): void => {
	const xssPatterns = [
		/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
		/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
		/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
		/<embed\b[^<]*>/gi,
		/<link\b[^<]*>/gi,
		/<meta\b[^<]*>/gi,
		/javascript:/gi,
		/vbscript:/gi,
		/data:text\/html/gi,
		/on\w+\s*=/gi,
		/expression\s*\(/gi,
		/url\s*\(/gi,
		/@import/gi,
	];

	const sanitizeXss = (obj: any): any => {
		if (typeof obj === "string") {
			let sanitized = obj;
			xssPatterns.forEach((pattern) => {
				sanitized = sanitized.replace(pattern, "");
			});
			return sanitized.trim();
		}

		if (Array.isArray(obj)) {
			return obj.map(sanitizeXss);
		}

		if (obj && typeof obj === "object") {
			const sanitized: any = {};
			for (const [key, value] of Object.entries(obj)) {
				sanitized[key] = sanitizeXss(value);
			}
			return sanitized;
		}

		return obj;
	};

	// Sanitize request data
	if (req.body) {
		req.body = sanitizeXss(req.body);
	}

	if (req.query) {
		req.query = sanitizeXss(req.query);
	}

	next();
};

/**
 * Helper function to parse size strings like "10mb", "1gb", etc.
 */
function parseSize(size: string): number {
	const units: { [key: string]: number } = {
		b: 1,
		kb: 1024,
		mb: 1024 * 1024,
		gb: 1024 * 1024 * 1024,
	};

	const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)(b|kb|mb|gb)$/);

	if (!match) {
		throw new Error(`Invalid size format: ${size}`);
	}

	const [, value, unit] = match;
	return parseFloat(value) * units[unit];
}
