// Base service class with common functionality and error handling

import {
	AppError,
	ErrorClassifier,
	ErrorContext,
	ErrorCategory,
} from "../utils/errors";

export abstract class BaseService {
	protected logger: Console;
	private static errorRecoveryService: any; // Lazy loaded to avoid circular dependency

	constructor() {
		this.logger = console;
	}

	/**
	 * Get error recovery service (lazy loaded)
	 */
	private async getErrorRecoveryService() {
		if (!BaseService.errorRecoveryService) {
			const { ErrorRecoveryService } = await import("./errorRecovery");
			BaseService.errorRecoveryService = new ErrorRecoveryService();
		}
		return BaseService.errorRecoveryService;
	}

	protected log(message: string, ...args: unknown[]): void {
		this.logger.log(`[${this.constructor.name}] ${message}`, ...args);
	}

	protected error(message: string, error?: Error): void {
		this.logger.error(`[${this.constructor.name}] ${message}`, error);
	}

	protected warn(message: string, ...args: unknown[]): void {
		this.logger.warn(`[${this.constructor.name}] ${message}`, ...args);
	}

	/**
	 * Execute an operation with automatic error handling and recovery
	 */
	protected async executeWithErrorHandling<T>(
		operation: () => Promise<T>,
		context: ErrorContext,
		maxRecoveryAttempts: number = 3
	): Promise<T> {
		try {
			const errorRecovery = await this.getErrorRecoveryService();
			return await errorRecovery.executeWithRecovery(
				operation,
				context,
				maxRecoveryAttempts
			);
		} catch (error) {
			const appError =
				error instanceof AppError
					? error
					: ErrorClassifier.classifyError(error, context);

			this.logError(appError);
			throw appError;
		}
	}

	/**
	 * Handle and classify an error
	 */
	protected handleError(error: unknown, context: ErrorContext): AppError {
		const appError =
			error instanceof AppError
				? error
				: ErrorClassifier.classifyError(error, context);

		this.logError(appError);
		return appError;
	}

	/**
	 * Create error context for the current service
	 */
	protected createErrorContext(
		operation: string,
		additionalData?: Record<string, any>
	): ErrorContext {
		return {
			operation,
			timestamp: new Date(),
			additionalData: {
				service: this.constructor.name,
				...additionalData,
			},
		};
	}

	/**
	 * Log error details in a structured format
	 */
	private logError(error: AppError): void {
		const logData = {
			category: error.category,
			severity: error.severity,
			code: error.code,
			message: error.message,
			userMessage: error.userMessage,
			context: error.context,
			timestamp: error.timestamp,
			retryable: error.retryable,
		};

		switch (error.severity) {
			case "CRITICAL":
				this.logger.error(
					`[${this.constructor.name}] CRITICAL ERROR:`,
					logData
				);
				break;
			case "HIGH":
				this.logger.error(
					`[${this.constructor.name}] HIGH SEVERITY ERROR:`,
					logData
				);
				break;
			case "MEDIUM":
				this.logger.warn(
					`[${this.constructor.name}] MEDIUM SEVERITY ERROR:`,
					logData
				);
				break;
			case "LOW":
				this.logger.log(
					`[${this.constructor.name}] LOW SEVERITY ERROR:`,
					logData
				);
				break;
			default:
				this.logger.error(`[${this.constructor.name}] ERROR:`, logData);
		}
	}

	/**
	 * Validate input parameters and throw validation error if invalid
	 */
	protected validateRequired(
		params: Record<string, any>,
		requiredFields: string[]
	): void {
		const missing = requiredFields.filter(
			(field) =>
				params[field] === undefined ||
				params[field] === null ||
				params[field] === ""
		);

		if (missing.length > 0) {
			throw new AppError({
				category: ErrorCategory.VALIDATION,
				severity: "LOW" as any,
				code: "MISSING_REQUIRED_FIELDS",
				message: `Missing required fields: ${missing.join(", ")}`,
				userMessage: `Please provide the following required fields: ${missing.join(
					", "
				)}`,
				context: this.createErrorContext("validation", {
					missingFields: missing,
				}),
				recoveryActions: [
					{
						type: "manual",
						description: "Provide the missing required fields",
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

	/**
	 * Create a user-friendly error response
	 */
	protected createErrorResponse(error: AppError) {
		return {
			success: false,
			error: {
				code: error.code,
				message: error.userMessage,
				category: error.category,
				severity: error.severity,
				retryable: error.retryable,
				recoveryActions: error.recoveryActions.map((action) => ({
					type: action.type,
					description: action.description,
					automated: action.automated,
					estimatedTime: action.estimatedTime,
				})),
			},
			timestamp: error.timestamp,
		};
	}
}
