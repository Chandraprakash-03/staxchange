/**
 * Comprehensive error handling and recovery system
 * Implements error classification, retry mechanisms, and user-friendly error messages
 */

export enum ErrorCategory {
	// GitHub Import Errors
	GITHUB_AUTH = "GITHUB_AUTH",
	GITHUB_API = "GITHUB_API",
	GITHUB_RATE_LIMIT = "GITHUB_RATE_LIMIT",
	REPOSITORY_ACCESS = "REPOSITORY_ACCESS",
	REPOSITORY_SIZE = "REPOSITORY_SIZE",

	// AI Service Errors
	AI_API_RATE_LIMIT = "AI_API_RATE_LIMIT",
	AI_MODEL_FAILURE = "AI_MODEL_FAILURE",
	AI_CONTEXT_LENGTH = "AI_CONTEXT_LENGTH",
	AI_INVALID_RESPONSE = "AI_INVALID_RESPONSE",
	AI_TIMEOUT = "AI_TIMEOUT",

	// Conversion Errors
	CONVERSION_SYNTAX = "CONVERSION_SYNTAX",
	CONVERSION_DEPENDENCY = "CONVERSION_DEPENDENCY",
	CONVERSION_INCOMPATIBLE = "CONVERSION_INCOMPATIBLE",
	CONVERSION_RUNTIME = "CONVERSION_RUNTIME",
	CONVERSION_VALIDATION = "CONVERSION_VALIDATION",

	// Preview Environment Errors
	PREVIEW_CONTAINER_STARTUP = "PREVIEW_CONTAINER_STARTUP",
	PREVIEW_RESOURCE_EXHAUSTION = "PREVIEW_RESOURCE_EXHAUSTION",
	PREVIEW_NETWORK = "PREVIEW_NETWORK",
	PREVIEW_BUILD_FAILURE = "PREVIEW_BUILD_FAILURE",

	// System Errors
	DATABASE_CONNECTION = "DATABASE_CONNECTION",
	REDIS_CONNECTION = "REDIS_CONNECTION",
	FILE_SYSTEM = "FILE_SYSTEM",
	NETWORK = "NETWORK",
	VALIDATION = "VALIDATION",
	AUTHENTICATION = "AUTHENTICATION",
	AUTHORIZATION = "AUTHORIZATION",

	// Unknown/Generic
	UNKNOWN = "UNKNOWN",
	INTERNAL = "INTERNAL",
}

export enum ErrorSeverity {
	LOW = "LOW",
	MEDIUM = "MEDIUM",
	HIGH = "HIGH",
	CRITICAL = "CRITICAL",
}

export interface ErrorContext {
	userId?: string;
	projectId?: string;
	jobId?: string;
	taskId?: string;
	fileName?: string;
	operation?: string;
	timestamp: Date;
	additionalData?: Record<string, any>;
}

export interface RecoveryAction {
	type: "retry" | "fallback" | "manual" | "skip" | "abort";
	description: string;
	automated: boolean;
	estimatedTime?: number;
	parameters?: Record<string, any>;
}

export interface ErrorDetails {
	category: ErrorCategory;
	severity: ErrorSeverity;
	code: string;
	message: string;
	userMessage: string;
	technicalDetails?: string;
	context: ErrorContext;
	recoveryActions: RecoveryAction[];
	retryable: boolean;
	maxRetries: number;
	retryDelay: number;
	exponentialBackoff: boolean;
}

export class AppError extends Error {
	public readonly category: ErrorCategory;
	public readonly severity: ErrorSeverity;
	public readonly code: string;
	public readonly userMessage: string;
	public readonly technicalDetails?: string;
	public readonly context: ErrorContext;
	public readonly recoveryActions: RecoveryAction[];
	public readonly retryable: boolean;
	public readonly maxRetries: number;
	public readonly retryDelay: number;
	public readonly exponentialBackoff: boolean;
	public readonly timestamp: Date;

	constructor(details: ErrorDetails) {
		super(details.message);
		this.name = "AppError";
		this.category = details.category;
		this.severity = details.severity;
		this.code = details.code;
		this.userMessage = details.userMessage;
		this.technicalDetails = details.technicalDetails;
		this.context = details.context;
		this.recoveryActions = details.recoveryActions;
		this.retryable = details.retryable;
		this.maxRetries = details.maxRetries;
		this.retryDelay = details.retryDelay;
		this.exponentialBackoff = details.exponentialBackoff;
		this.timestamp = new Date();
	}

	toJSON() {
		return {
			name: this.name,
			message: this.message,
			category: this.category,
			severity: this.severity,
			code: this.code,
			userMessage: this.userMessage,
			technicalDetails: this.technicalDetails,
			context: this.context,
			recoveryActions: this.recoveryActions,
			retryable: this.retryable,
			maxRetries: this.maxRetries,
			retryDelay: this.retryDelay,
			exponentialBackoff: this.exponentialBackoff,
			timestamp: this.timestamp,
			stack: this.stack,
		};
	}
}

export interface RetryOptions {
	maxRetries: number;
	baseDelay: number;
	exponentialBackoff: boolean;
	maxDelay?: number;
	jitter?: boolean;
}

export interface RetryResult<T> {
	success: boolean;
	result?: T;
	error?: AppError;
	attempts: number;
	totalTime: number;
}

export class RetryManager {
	/**
	 * Execute a function with automatic retry logic
	 */
	static async executeWithRetry<T>(
		operation: () => Promise<T>,
		options: RetryOptions,
		context: ErrorContext
	): Promise<RetryResult<T>> {
		const startTime = Date.now();
		let lastError: AppError | undefined;
		let actualAttempts = 0;

		for (let attempt = 1; attempt <= options.maxRetries + 1; attempt++) {
			actualAttempts = attempt;
			try {
				const result = await operation();
				return {
					success: true,
					result,
					attempts: attempt,
					totalTime: Date.now() - startTime,
				};
			} catch (error) {
				lastError =
					error instanceof AppError
						? error
						: ErrorClassifier.classifyError(error, context);

				// Don't retry if error is not retryable or we've reached max retries
				if (!lastError.retryable || attempt > options.maxRetries) {
					break;
				}

				// Calculate delay for next attempt
				const delay = this.calculateDelay(attempt - 1, options);
				await this.sleep(delay);
			}
		}

		return {
			success: false,
			error: lastError,
			attempts: actualAttempts,
			totalTime: Date.now() - startTime,
		};
	}

	private static calculateDelay(
		attemptNumber: number,
		options: RetryOptions
	): number {
		let delay = options.baseDelay;

		if (options.exponentialBackoff) {
			delay = options.baseDelay * Math.pow(2, attemptNumber);
		}

		// Apply maximum delay limit
		if (options.maxDelay) {
			delay = Math.min(delay, options.maxDelay);
		}

		// Add jitter to prevent thundering herd
		if (options.jitter) {
			delay = delay * (0.5 + Math.random() * 0.5);
		}

		return delay;
	}

	private static sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}

export class ErrorClassifier {
	/**
	 * Classify an error and return structured error details
	 */
	static classifyError(error: unknown, context: ErrorContext): AppError {
		// Handle already classified errors
		if (error instanceof AppError) {
			return error;
		}

		// Handle standard JavaScript errors
		if (error instanceof Error) {
			return this.classifyStandardError(error, context);
		}

		// Handle string errors
		if (typeof error === "string") {
			return new AppError({
				category: ErrorCategory.UNKNOWN,
				severity: ErrorSeverity.MEDIUM,
				code: "UNKNOWN_STRING_ERROR",
				message: error,
				userMessage: "An unexpected error occurred. Please try again.",
				context,
				recoveryActions: [
					{
						type: "retry",
						description: "Retry the operation",
						automated: false,
					},
				],
				retryable: true,
				maxRetries: 3,
				retryDelay: 1000,
				exponentialBackoff: true,
			});
		}

		// Handle unknown error types
		return new AppError({
			category: ErrorCategory.UNKNOWN,
			severity: ErrorSeverity.HIGH,
			code: "UNKNOWN_ERROR_TYPE",
			message: "Unknown error type encountered",
			userMessage:
				"An unexpected error occurred. Please contact support if this persists.",
			technicalDetails: JSON.stringify(error),
			context,
			recoveryActions: [
				{
					type: "manual",
					description: "Contact support for assistance",
					automated: false,
				},
			],
			retryable: false,
			maxRetries: 0,
			retryDelay: 0,
			exponentialBackoff: false,
		});
	}

	private static classifyStandardError(
		error: Error,
		context: ErrorContext
	): AppError {
		const message = error.message.toLowerCase();

		// GitHub API Errors
		if (this.isGitHubError(error, message)) {
			return this.classifyGitHubError(error, context);
		}

		// AI Service Errors
		if (this.isAIServiceError(error, message)) {
			return this.classifyAIServiceError(error, context);
		}

		// Database Errors
		if (this.isDatabaseError(error, message)) {
			return this.classifyDatabaseError(error, context);
		}

		// Network Errors
		if (this.isNetworkError(error, message)) {
			return this.classifyNetworkError(error, context);
		}

		// File System Errors
		if (this.isFileSystemError(error, message)) {
			return this.classifyFileSystemError(error, context);
		}

		// Validation Errors
		if (this.isValidationError(error, message)) {
			return this.classifyValidationError(error, context);
		}

		// Default classification
		return new AppError({
			category: ErrorCategory.INTERNAL,
			severity: ErrorSeverity.MEDIUM,
			code: "UNCLASSIFIED_ERROR",
			message: error.message,
			userMessage: "An internal error occurred. Please try again.",
			technicalDetails: error.stack,
			context,
			recoveryActions: [
				{
					type: "retry",
					description: "Retry the operation",
					automated: false,
				},
			],
			retryable: true,
			maxRetries: 3,
			retryDelay: 1000,
			exponentialBackoff: true,
		});
	}

	private static isGitHubError(error: Error, message: string): boolean {
		return (
			message.includes("github") ||
			message.includes("repository") ||
			message.includes("oauth") ||
			(error as any).response?.config?.baseURL?.includes("github.com")
		);
	}

	private static classifyGitHubError(
		error: Error,
		context: ErrorContext
	): AppError {
		const axiosError = error as any;
		const status = axiosError.response?.status;
		const message = error.message.toLowerCase();

		if (status === 401 || message.includes("unauthorized")) {
			return new AppError({
				category: ErrorCategory.GITHUB_AUTH,
				severity: ErrorSeverity.HIGH,
				code: "GITHUB_AUTH_FAILED",
				message: "GitHub authentication failed",
				userMessage: "Please reconnect your GitHub account to continue.",
				context,
				recoveryActions: [
					{
						type: "manual",
						description: "Reconnect GitHub account",
						automated: false,
					},
				],
				retryable: false,
				maxRetries: 0,
				retryDelay: 0,
				exponentialBackoff: false,
			});
		}

		if (status === 403) {
			if (axiosError.response?.headers?.["x-ratelimit-remaining"] === "0") {
				return new AppError({
					category: ErrorCategory.GITHUB_RATE_LIMIT,
					severity: ErrorSeverity.MEDIUM,
					code: "GITHUB_RATE_LIMIT_EXCEEDED",
					message: "GitHub API rate limit exceeded",
					userMessage:
						"GitHub API rate limit reached. Please wait a moment and try again.",
					context,
					recoveryActions: [
						{
							type: "retry",
							description: "Wait for rate limit reset",
							automated: true,
							estimatedTime: 3600000, // 1 hour
						},
					],
					retryable: true,
					maxRetries: 3,
					retryDelay: 60000, // 1 minute
					exponentialBackoff: true,
				});
			}

			return new AppError({
				category: ErrorCategory.REPOSITORY_ACCESS,
				severity: ErrorSeverity.HIGH,
				code: "REPOSITORY_ACCESS_DENIED",
				message: "Repository access denied",
				userMessage:
					"Unable to access this repository. It may be private or you may not have permission.",
				context,
				recoveryActions: [
					{
						type: "manual",
						description:
							"Check repository permissions or make repository public",
						automated: false,
					},
				],
				retryable: false,
				maxRetries: 0,
				retryDelay: 0,
				exponentialBackoff: false,
			});
		}

		if (status === 404) {
			return new AppError({
				category: ErrorCategory.REPOSITORY_ACCESS,
				severity: ErrorSeverity.HIGH,
				code: "REPOSITORY_NOT_FOUND",
				message: "Repository not found",
				userMessage:
					"The specified repository could not be found. Please check the URL and try again.",
				context,
				recoveryActions: [
					{
						type: "manual",
						description: "Verify repository URL",
						automated: false,
					},
				],
				retryable: false,
				maxRetries: 0,
				retryDelay: 0,
				exponentialBackoff: false,
			});
		}

		return new AppError({
			category: ErrorCategory.GITHUB_API,
			severity: ErrorSeverity.MEDIUM,
			code: "GITHUB_API_ERROR",
			message: `GitHub API error: ${error.message}`,
			userMessage: "There was an issue connecting to GitHub. Please try again.",
			technicalDetails: axiosError.response?.data
				? JSON.stringify(axiosError.response.data)
				: undefined,
			context,
			recoveryActions: [
				{
					type: "retry",
					description: "Retry GitHub API call",
					automated: true,
				},
			],
			retryable: true,
			maxRetries: 3,
			retryDelay: 2000,
			exponentialBackoff: true,
		});
	}

	private static isAIServiceError(error: Error, message: string): boolean {
		return (
			message.includes("openrouter") ||
			message.includes("ai model") ||
			message.includes("rate limit") ||
			message.includes("context length") ||
			message.includes("token limit")
		);
	}

	private static classifyAIServiceError(
		error: Error,
		context: ErrorContext
	): AppError {
		const message = error.message.toLowerCase();

		if (message.includes("rate limit")) {
			return new AppError({
				category: ErrorCategory.AI_API_RATE_LIMIT,
				severity: ErrorSeverity.MEDIUM,
				code: "AI_RATE_LIMIT_EXCEEDED",
				message: "AI API rate limit exceeded",
				userMessage:
					"AI service is temporarily busy. Your request will be retried automatically.",
				context,
				recoveryActions: [
					{
						type: "retry",
						description: "Wait and retry AI request",
						automated: true,
						estimatedTime: 60000,
					},
				],
				retryable: true,
				maxRetries: 5,
				retryDelay: 30000,
				exponentialBackoff: true,
			});
		}

		if (message.includes("context length") || message.includes("token limit")) {
			return new AppError({
				category: ErrorCategory.AI_CONTEXT_LENGTH,
				severity: ErrorSeverity.HIGH,
				code: "AI_CONTEXT_TOO_LONG",
				message: "Code too large for AI processing",
				userMessage:
					"The file is too large to process. Try breaking it into smaller files.",
				context,
				recoveryActions: [
					{
						type: "fallback",
						description: "Split file into smaller chunks",
						automated: true,
					},
				],
				retryable: true,
				maxRetries: 2,
				retryDelay: 1000,
				exponentialBackoff: false,
			});
		}

		if (message.includes("timeout")) {
			return new AppError({
				category: ErrorCategory.AI_TIMEOUT,
				severity: ErrorSeverity.MEDIUM,
				code: "AI_REQUEST_TIMEOUT",
				message: "AI request timed out",
				userMessage:
					"The AI service is taking longer than expected. Retrying...",
				context,
				recoveryActions: [
					{
						type: "retry",
						description: "Retry with longer timeout",
						automated: true,
					},
				],
				retryable: true,
				maxRetries: 3,
				retryDelay: 5000,
				exponentialBackoff: true,
			});
		}

		return new AppError({
			category: ErrorCategory.AI_MODEL_FAILURE,
			severity: ErrorSeverity.HIGH,
			code: "AI_MODEL_ERROR",
			message: `AI model error: ${error.message}`,
			userMessage: "The AI service encountered an error. Please try again.",
			technicalDetails: error.stack,
			context,
			recoveryActions: [
				{
					type: "retry",
					description: "Retry AI request",
					automated: true,
				},
			],
			retryable: true,
			maxRetries: 3,
			retryDelay: 2000,
			exponentialBackoff: true,
		});
	}

	private static isDatabaseError(error: Error, message: string): boolean {
		return (
			message.includes("database") ||
			message.includes("postgresql") ||
			message.includes("prisma") ||
			message.includes("sql") ||
			(message.includes("connection") &&
				!message.includes("econnrefused") &&
				!message.includes("enotfound"))
		);
	}

	private static classifyDatabaseError(
		error: Error,
		context: ErrorContext
	): AppError {
		const message = error.message.toLowerCase();

		if (message.includes("connection")) {
			return new AppError({
				category: ErrorCategory.DATABASE_CONNECTION,
				severity: ErrorSeverity.CRITICAL,
				code: "DATABASE_CONNECTION_FAILED",
				message: "Database connection failed",
				userMessage:
					"Unable to connect to the database. Please try again in a moment.",
				technicalDetails: error.stack,
				context,
				recoveryActions: [
					{
						type: "retry",
						description: "Retry database connection",
						automated: true,
					},
				],
				retryable: true,
				maxRetries: 5,
				retryDelay: 5000,
				exponentialBackoff: true,
			});
		}

		return new AppError({
			category: ErrorCategory.DATABASE_CONNECTION,
			severity: ErrorSeverity.HIGH,
			code: "DATABASE_ERROR",
			message: `Database error: ${error.message}`,
			userMessage: "A database error occurred. Please try again.",
			technicalDetails: error.stack,
			context,
			recoveryActions: [
				{
					type: "retry",
					description: "Retry database operation",
					automated: true,
				},
			],
			retryable: true,
			maxRetries: 3,
			retryDelay: 1000,
			exponentialBackoff: true,
		});
	}

	private static isNetworkError(error: Error, message: string): boolean {
		return (
			message.includes("network") ||
			message.includes("timeout") ||
			message.includes("econnrefused") ||
			message.includes("enotfound") ||
			message.includes("fetch")
		);
	}

	private static classifyNetworkError(
		error: Error,
		context: ErrorContext
	): AppError {
		return new AppError({
			category: ErrorCategory.NETWORK,
			severity: ErrorSeverity.MEDIUM,
			code: "NETWORK_ERROR",
			message: `Network error: ${error.message}`,
			userMessage:
				"Network connection issue. Please check your internet connection and try again.",
			technicalDetails: error.stack,
			context,
			recoveryActions: [
				{
					type: "retry",
					description: "Retry network request",
					automated: true,
				},
			],
			retryable: true,
			maxRetries: 3,
			retryDelay: 2000,
			exponentialBackoff: true,
		});
	}

	private static isFileSystemError(error: Error, message: string): boolean {
		return (
			message.includes("enoent") ||
			message.includes("eacces") ||
			message.includes("file") ||
			message.includes("directory")
		);
	}

	private static classifyFileSystemError(
		error: Error,
		context: ErrorContext
	): AppError {
		const message = error.message.toLowerCase();

		if (message.includes("enoent")) {
			return new AppError({
				category: ErrorCategory.FILE_SYSTEM,
				severity: ErrorSeverity.HIGH,
				code: "FILE_NOT_FOUND",
				message: "File or directory not found",
				userMessage:
					"A required file could not be found. The project may be corrupted.",
				technicalDetails: error.stack,
				context,
				recoveryActions: [
					{
						type: "manual",
						description: "Re-import the project",
						automated: false,
					},
				],
				retryable: false,
				maxRetries: 0,
				retryDelay: 0,
				exponentialBackoff: false,
			});
		}

		return new AppError({
			category: ErrorCategory.FILE_SYSTEM,
			severity: ErrorSeverity.MEDIUM,
			code: "FILE_SYSTEM_ERROR",
			message: `File system error: ${error.message}`,
			userMessage: "A file system error occurred. Please try again.",
			technicalDetails: error.stack,
			context,
			recoveryActions: [
				{
					type: "retry",
					description: "Retry file operation",
					automated: true,
				},
			],
			retryable: true,
			maxRetries: 3,
			retryDelay: 1000,
			exponentialBackoff: false,
		});
	}

	private static isValidationError(error: Error, message: string): boolean {
		return (
			message.includes("validation") ||
			message.includes("invalid") ||
			message.includes("required") ||
			message.includes("format")
		);
	}

	private static classifyValidationError(
		error: Error,
		context: ErrorContext
	): AppError {
		return new AppError({
			category: ErrorCategory.VALIDATION,
			severity: ErrorSeverity.LOW,
			code: "VALIDATION_ERROR",
			message: `Validation error: ${error.message}`,
			userMessage: "Please check your input and try again.",
			context,
			recoveryActions: [
				{
					type: "manual",
					description: "Correct the input and retry",
					automated: false,
				},
			],
			retryable: false,
			maxRetries: 0,
			retryDelay: 0,
			exponentialBackoff: false,
		});
	}
}
