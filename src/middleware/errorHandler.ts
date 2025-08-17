/**
 * Express middleware for handling errors and providing user-friendly responses
 */

import { Request, Response, NextFunction } from "express";
import { AppError, ErrorClassifier } from "../utils/errors";
import { ErrorMessageGenerator } from "../utils/errorMessages";

export interface ErrorResponse {
	success: false;
	error: {
		code: string;
		message: string;
		userMessage: string;
		category: string;
		severity: string;
		retryable: boolean;
		recoveryActions: Array<{
			type: string;
			description: string;
			automated: boolean;
			estimatedTime?: number;
		}>;
	};
	timestamp: string;
	requestId?: string;
}

/**
 * Global error handling middleware
 */
export function errorHandler(
	error: unknown,
	req: Request,
	res: Response,
	next: NextFunction
): void {
	// Skip if response already sent
	if (res.headersSent) {
		return next(error);
	}

	// Create error context from request
	const context = {
		operation: `${req.method} ${req.path}`,
		timestamp: new Date(),
		additionalData: {
			method: req.method,
			path: req.path,
			query: req.query,
			userAgent: req.get("User-Agent"),
			ip: req.ip,
			userId: (req as any).user?.id,
			requestId: (req as any).requestId,
		},
	};

	// Classify the error
	const appError =
		error instanceof AppError
			? error
			: ErrorClassifier.classifyError(error, context);

	// Log the error
	console.error(`[ErrorHandler] ${appError.category}:${appError.code}`, {
		message: appError.message,
		userMessage: appError.userMessage,
		context: appError.context,
		stack: appError.stack,
	});

	// Generate user-friendly message (for potential future use)
	ErrorMessageGenerator.generateUserMessage(appError);

	// Create response
	const errorResponse: ErrorResponse = {
		success: false,
		error: {
			code: appError.code,
			message: appError.message,
			userMessage: appError.userMessage,
			category: appError.category,
			severity: appError.severity,
			retryable: appError.retryable,
			recoveryActions: appError.recoveryActions.map((action) => ({
				type: action.type,
				description: action.description,
				automated: action.automated,
				estimatedTime: action.estimatedTime,
			})),
		},
		timestamp: appError.timestamp.toISOString(),
		requestId: context.additionalData.requestId,
	};

	// Determine HTTP status code
	const statusCode = getHttpStatusCode(appError);

	// Send response
	res.status(statusCode).json(errorResponse);
}

/**
 * Async error wrapper for route handlers
 */
export function asyncHandler<T extends Request, U extends Response>(
	fn: (req: T, res: U, next: NextFunction) => Promise<any>
) {
	return (req: T, res: U, next: NextFunction) => {
		Promise.resolve(fn(req, res, next)).catch(next);
	};
}

/**
 * Validation error handler
 */
export function validationErrorHandler(
	_req: Request,
	_res: Response,
	next: NextFunction
): void {
	// This would typically be used with a validation library like Joi or express-validator
	// For now, we'll just pass through to the main error handler
	next();
}

/**
 * Rate limiting error handler
 */
export function rateLimitErrorHandler(
	req: Request,
	_res: Response,
	next: NextFunction
): void {
	const rateLimitError = new AppError({
		category: "AI_API_RATE_LIMIT" as any,
		severity: "MEDIUM" as any,
		code: "RATE_LIMIT_EXCEEDED",
		message: "Rate limit exceeded",
		userMessage: "Too many requests. Please wait a moment and try again.",
		context: {
			operation: `${req.method} ${req.path}`,
			timestamp: new Date(),
			additionalData: {
				ip: req.ip,
				userAgent: req.get("User-Agent"),
			},
		},
		recoveryActions: [
			{
				type: "retry",
				description: "Wait and retry the request",
				automated: false,
				estimatedTime: 60000,
			},
		],
		retryable: true,
		maxRetries: 3,
		retryDelay: 60000,
		exponentialBackoff: true,
	});

	next(rateLimitError);
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(
	req: Request,
	res: Response,
	next: NextFunction
): void {
	const notFoundError = new AppError({
		category: "VALIDATION" as any,
		severity: "LOW" as any,
		code: "ROUTE_NOT_FOUND",
		message: `Route ${req.method} ${req.path} not found`,
		userMessage: "The requested resource was not found.",
		context: {
			operation: `${req.method} ${req.path}`,
			timestamp: new Date(),
			additionalData: {
				method: req.method,
				path: req.path,
				query: req.query,
			},
		},
		recoveryActions: [
			{
				type: "manual",
				description: "Check the URL and try again",
				automated: false,
			},
		],
		retryable: false,
		maxRetries: 0,
		retryDelay: 0,
		exponentialBackoff: false,
	});

	next(notFoundError);
}

/**
 * Request timeout handler
 */
export function timeoutHandler(timeout: number = 30000) {
	return (req: Request, res: Response, next: NextFunction) => {
		const timer = setTimeout(() => {
			const timeoutError = new AppError({
				category: "NETWORK" as any,
				severity: "MEDIUM" as any,
				code: "REQUEST_TIMEOUT",
				message: `Request timeout after ${timeout}ms`,
				userMessage:
					"The request is taking longer than expected. Please try again.",
				context: {
					operation: `${req.method} ${req.path}`,
					timestamp: new Date(),
					additionalData: {
						timeout,
						method: req.method,
						path: req.path,
					},
				},
				recoveryActions: [
					{
						type: "retry",
						description: "Retry the request",
						automated: false,
					},
				],
				retryable: true,
				maxRetries: 2,
				retryDelay: 5000,
				exponentialBackoff: true,
			});

			next(timeoutError);
		}, timeout);

		// Clear timeout when response finishes
		res.on("finish", () => clearTimeout(timer));
		res.on("close", () => clearTimeout(timer));

		next();
	};
}

/**
 * Map AppError to appropriate HTTP status code
 */
function getHttpStatusCode(error: AppError): number {
	switch (error.category) {
		case "GITHUB_AUTH":
		case "AUTHENTICATION":
			return 401;

		case "AUTHORIZATION":
		case "REPOSITORY_ACCESS":
			return 403;

		case "REPOSITORY_ACCESS":
			if (error.code === "REPOSITORY_NOT_FOUND") {
				return 404;
			}
			return 403;

		case "VALIDATION":
			return 400;

		case "GITHUB_RATE_LIMIT":
		case "AI_API_RATE_LIMIT":
			return 429;

		case "AI_CONTEXT_LENGTH":
		case "REPOSITORY_SIZE":
			return 413; // Payload Too Large

		case "NETWORK":
			if (error.code === "REQUEST_TIMEOUT") {
				return 408;
			}
			return 502; // Bad Gateway

		case "DATABASE_CONNECTION":
		case "REDIS_CONNECTION":
		case "PREVIEW_CONTAINER_STARTUP":
		case "AI_MODEL_FAILURE":
			return 503; // Service Unavailable

		case "FILE_SYSTEM":
		case "INTERNAL":
		case "UNKNOWN":
		default:
			return 500; // Internal Server Error
	}
}

/**
 * Health check error handler
 */
export function healthCheckErrorHandler(
	error: unknown,
	req: Request,
	res: Response,
	next: NextFunction
): void {
	// For health check endpoints, provide minimal error information
	if (req.path.includes("/health") || req.path.includes("/status")) {
		const appError =
			error instanceof AppError
				? error
				: ErrorClassifier.classifyError(error, {
						operation: "health_check",
						timestamp: new Date(),
				  });

		res.status(503).json({
			status: "unhealthy",
			error: appError.code,
			message: "Service is currently unavailable",
			timestamp: new Date().toISOString(),
		});

		// Stop further middleware execution
		return;
	}

	next();
}

/**
 * Development error handler with detailed stack traces
 */
export function developmentErrorHandler(
	error: unknown,
	req: Request,
	res: Response,
	next: NextFunction
): void {
	if (process.env.NODE_ENV !== "development") {
		return errorHandler(error, req, res, next);
	}

	const appError =
		error instanceof AppError
			? error
			: ErrorClassifier.classifyError(error, {
					operation: `${req.method} ${req.path}`,
					timestamp: new Date(),
			  });

	const errorResponse = {
		success: false,
		error: {
			code: appError.code,
			message: appError.message,
			userMessage: appError.userMessage,
			category: appError.category,
			severity: appError.severity,
			retryable: appError.retryable,
			recoveryActions: appError.recoveryActions,
			stack: appError.stack,
			context: appError.context,
		},
		timestamp: appError.timestamp.toISOString(),
	};

	const statusCode = getHttpStatusCode(appError);
	res.status(statusCode).json(errorResponse);
}
