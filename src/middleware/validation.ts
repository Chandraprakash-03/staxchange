import { Request, Response, NextFunction } from "express";
import {
	body,
	param,
	query,
	validationResult,
	ValidationChain,
} from "express-validator";
import { AppError } from "@/utils/errors";

/**
 * Validation middleware that checks for validation errors and returns formatted response
 */
export const handleValidationErrors = (
	req: Request,
	res: Response,
	next: NextFunction
): void => {
	const errors = validationResult(req);

	if (!errors.isEmpty()) {
		const validationError = new AppError({
			category: "VALIDATION" as any,
			severity: "LOW" as any,
			code: "VALIDATION_ERROR",
			message: "Request validation failed",
			userMessage: "Please check your input and try again.",
			context: {
				operation: `${req.method} ${req.path}`,
				timestamp: new Date(),
				additionalData: {
					validationErrors: errors.array(),
					body: req.body,
					params: req.params,
					query: req.query,
				},
			},
			recoveryActions: [
				{
					type: "manual",
					description: "Fix validation errors and retry",
					automated: false,
				},
			],
			retryable: false,
			maxRetries: 0,
			retryDelay: 0,
			exponentialBackoff: false,
		});

		next(validationError);
		return;
	}

	next();
};

/**
 * GitHub repository URL validation
 */
export const validateGitHubUrl = (): ValidationChain[] => [
	body("url")
		.isURL({ protocols: ["https"] })
		.withMessage("Must be a valid HTTPS URL")
		.matches(/^https:\/\/github\.com\/[\w\-\.]+\/[\w\-\.]+\/?$/)
		.withMessage("Must be a valid GitHub repository URL"),
];

/**
 * Project ID validation
 */
export const validateProjectId = (): ValidationChain[] => [
	param("id").isUUID().withMessage("Project ID must be a valid UUID"),
];

/**
 * Tech stack selection validation
 */
export const validateTechStack = (): ValidationChain[] => [
	body("language")
		.isString()
		.isLength({ min: 1, max: 50 })
		.withMessage("Language is required and must be 1-50 characters"),
	body("framework")
		.optional()
		.isString()
		.isLength({ max: 50 })
		.withMessage("Framework must be less than 50 characters"),
	body("database")
		.optional()
		.isString()
		.isLength({ max: 50 })
		.withMessage("Database must be less than 50 characters"),
	body("runtime")
		.optional()
		.isString()
		.isLength({ max: 50 })
		.withMessage("Runtime must be less than 50 characters"),
	body("buildTool")
		.optional()
		.isString()
		.isLength({ max: 50 })
		.withMessage("Build tool must be less than 50 characters"),
	body("packageManager")
		.optional()
		.isString()
		.isLength({ max: 50 })
		.withMessage("Package manager must be less than 50 characters"),
	body("deployment")
		.optional()
		.isString()
		.isLength({ max: 50 })
		.withMessage("Deployment platform must be less than 50 characters"),
];

/**
 * Conversion job validation
 */
export const validateConversionJob = (): ValidationChain[] => [
	body("projectId").isUUID().withMessage("Project ID must be a valid UUID"),
	body("targetTechStack")
		.isObject()
		.withMessage("Target tech stack must be an object"),
	body("targetTechStack.language")
		.isString()
		.isLength({ min: 1, max: 50 })
		.withMessage("Target language is required"),
];

/**
 * Pagination validation
 */
export const validatePagination = (): ValidationChain[] => [
	query("page")
		.optional()
		.isInt({ min: 1 })
		.withMessage("Page must be a positive integer"),
	query("limit")
		.optional()
		.isInt({ min: 1, max: 100 })
		.withMessage("Limit must be between 1 and 100"),
];

/**
 * File path validation for preview operations
 */
export const validateFilePath = (): ValidationChain[] => [
	body("filePath")
		.isString()
		.matches(/^[a-zA-Z0-9\/\-_\.]+$/)
		.withMessage("File path contains invalid characters")
		.isLength({ min: 1, max: 500 })
		.withMessage("File path must be 1-500 characters"),
];

/**
 * Export request validation
 */
export const validateExportRequest = (): ValidationChain[] => [
	body("projectId").isUUID().withMessage("Project ID must be a valid UUID"),
	body("format")
		.optional()
		.isIn(["zip", "tar.gz"])
		.withMessage("Format must be zip or tar.gz"),
	body("includeSetupInstructions")
		.optional()
		.isBoolean()
		.withMessage("Include setup instructions must be a boolean"),
];

/**
 * Sanitization middleware for request data
 */
export const sanitizeInput = (
	req: Request,
	_res: Response,
	next: NextFunction
): void => {
	// Sanitize string inputs to prevent XSS
	const sanitizeObject = (obj: any): any => {
		if (typeof obj === "string") {
			return obj
				.trim()
				.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
		}

		if (Array.isArray(obj)) {
			return obj.map(sanitizeObject);
		}

		if (obj && typeof obj === "object") {
			const sanitized: any = {};
			for (const [key, value] of Object.entries(obj)) {
				sanitized[key] = sanitizeObject(value);
			}
			return sanitized;
		}

		return obj;
	};

	if (req.body) {
		req.body = sanitizeObject(req.body);
	}

	if (req.query) {
		req.query = sanitizeObject(req.query);
	}

	next();
};

/**
 * Content type validation middleware
 */
export const validateContentType = (
	allowedTypes: string[] = ["application/json"]
) => {
	return (req: Request, _res: Response, next: NextFunction): void => {
		if (req.method === "GET" || req.method === "DELETE") {
			return next();
		}

		const contentType = req.get("Content-Type");

		if (
			!contentType ||
			!allowedTypes.some((type) => contentType.includes(type))
		) {
			const error = new AppError({
				category: "VALIDATION" as any,
				severity: "LOW" as any,
				code: "INVALID_CONTENT_TYPE",
				message: `Invalid content type: ${contentType}`,
				userMessage: "Please send data in the correct format.",
				context: {
					operation: `${req.method} ${req.path}`,
					timestamp: new Date(),
					additionalData: {
						contentType,
						allowedTypes,
					},
				},
				recoveryActions: [
					{
						type: "manual",
						description: `Set Content-Type header to one of: ${allowedTypes.join(
							", "
						)}`,
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
 * Enhanced GitHub URL validation with additional security checks
 */
export const validateGitHubUrlEnhanced = (): ValidationChain[] => [
	body("url")
		.isURL({ protocols: ["https"] })
		.withMessage("Must be a valid HTTPS URL")
		.matches(/^https:\/\/github\.com\/[\w\-\.]+\/[\w\-\.]+\/?$/)
		.withMessage("Must be a valid GitHub repository URL")
		.isLength({ max: 500 })
		.withMessage("URL must be less than 500 characters")
		.custom((value) => {
			// Additional security checks
			const url = new URL(value);

			// Check for suspicious patterns
			if (url.pathname.includes("..") || url.pathname.includes("%")) {
				throw new Error("URL contains suspicious patterns");
			}

			// Validate repository name format
			const pathParts = url.pathname.split("/").filter(Boolean);
			if (pathParts.length !== 2) {
				throw new Error("Invalid repository path format");
			}

			const [owner, repo] = pathParts;
			if (!/^[\w\-\.]+$/.test(owner) || !/^[\w\-\.]+$/.test(repo)) {
				throw new Error("Invalid owner or repository name format");
			}

			return true;
		}),
];

/**
 * Enhanced tech stack validation with security checks
 */
export const validateTechStackEnhanced = (): ValidationChain[] => [
	body("language")
		.isString()
		.isLength({ min: 1, max: 50 })
		.matches(/^[a-zA-Z0-9\+\#\-\.]+$/)
		.withMessage("Language contains invalid characters")
		.custom((value) => {
			// Whitelist of allowed languages
			const allowedLanguages = [
				"javascript",
				"typescript",
				"python",
				"java",
				"csharp",
				"cpp",
				"c",
				"go",
				"rust",
				"php",
				"ruby",
				"swift",
				"kotlin",
				"dart",
				"scala",
				"clojure",
				"haskell",
				"erlang",
				"elixir",
				"fsharp",
				"vb.net",
			];

			if (!allowedLanguages.includes(value.toLowerCase())) {
				throw new Error("Unsupported programming language");
			}

			return true;
		}),
	body("framework")
		.optional()
		.isString()
		.isLength({ max: 50 })
		.matches(/^[a-zA-Z0-9\-\.]+$/)
		.withMessage("Framework contains invalid characters"),
	body("database")
		.optional()
		.isString()
		.isLength({ max: 50 })
		.matches(/^[a-zA-Z0-9\-\.]+$/)
		.withMessage("Database contains invalid characters"),
	body("runtime")
		.optional()
		.isString()
		.isLength({ max: 50 })
		.matches(/^[a-zA-Z0-9\-\.]+$/)
		.withMessage("Runtime contains invalid characters"),
];

/**
 * File path validation with enhanced security
 */
export const validateFilePathEnhanced = (): ValidationChain[] => [
	body("filePath")
		.isString()
		.isLength({ min: 1, max: 500 })
		.withMessage("File path must be 1-500 characters")
		.custom((value) => {
			// Security checks for file path
			if (value.includes("..") || value.includes("~")) {
				throw new Error("File path contains path traversal sequences");
			}

			if (value.startsWith("/") || value.includes("\\")) {
				throw new Error("File path must be relative and use forward slashes");
			}

			// Check for suspicious file extensions
			const suspiciousExtensions = [
				".exe",
				".bat",
				".cmd",
				".sh",
				".ps1",
				".vbs",
			];
			const extension = value.toLowerCase().split(".").pop();
			if (extension && suspiciousExtensions.includes(`.${extension}`)) {
				throw new Error("File type not allowed");
			}

			// Validate characters
			if (!/^[a-zA-Z0-9\/\-_\.]+$/.test(value)) {
				throw new Error("File path contains invalid characters");
			}

			return true;
		}),
];

/**
 * Request size validation middleware
 */
export const validateRequestSize = (
	maxSizeBytes: number = 10 * 1024 * 1024
) => {
	return (req: Request, _res: Response, next: NextFunction): void => {
		const contentLength = req.get("content-length");

		if (contentLength) {
			const size = parseInt(contentLength, 10);
			if (size > maxSizeBytes) {
				const error = new AppError({
					category: "VALIDATION" as any,
					severity: "MEDIUM" as any,
					code: "REQUEST_TOO_LARGE",
					message: `Request size ${size} bytes exceeds limit of ${maxSizeBytes} bytes`,
					userMessage:
						"Request is too large. Please reduce the size and try again.",
					context: {
						operation: `${req.method} ${req.path}`,
						timestamp: new Date(),
						additionalData: {
							requestSize: size,
							maxSize: maxSizeBytes,
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
 * JSON depth validation to prevent DoS attacks
 */
export const validateJsonDepth = (maxDepth: number = 10) => {
	return (req: Request, _res: Response, next: NextFunction): void => {
		if (!req.body || typeof req.body !== "object") {
			return next();
		}

		const getDepth = (obj: any, currentDepth = 0): number => {
			if (currentDepth > maxDepth) {
				return currentDepth;
			}

			if (obj && typeof obj === "object") {
				let maxChildDepth = currentDepth;
				for (const value of Object.values(obj)) {
					const childDepth = getDepth(value, currentDepth + 1);
					maxChildDepth = Math.max(maxChildDepth, childDepth);
				}
				return maxChildDepth;
			}

			return currentDepth;
		};

		const depth = getDepth(req.body);
		if (depth > maxDepth) {
			const error = new AppError({
				category: "VALIDATION" as any,
				severity: "MEDIUM" as any,
				code: "JSON_TOO_DEEP",
				message: `JSON depth ${depth} exceeds maximum allowed depth of ${maxDepth}`,
				userMessage:
					"Request data structure is too complex. Please simplify and try again.",
				context: {
					operation: `${req.method} ${req.path}`,
					timestamp: new Date(),
					additionalData: {
						actualDepth: depth,
						maxDepth,
					},
				},
				recoveryActions: [
					{
						type: "manual",
						description: "Reduce JSON nesting depth and retry",
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
