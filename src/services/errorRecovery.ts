/**
 * Error Recovery Service
 * Implements automatic recovery strategies for different types of errors
 */

// Removed BaseService import to avoid circular dependency
import {
	AppError,
	ErrorCategory,
	ErrorContext,
	RecoveryAction,
	RetryManager,
	RetryOptions,
	RetryResult,
	ErrorClassifier,
} from "../utils/errors";

export interface RecoveryStrategy {
	canRecover(error: AppError): boolean;
	recover(error: AppError, context: ErrorContext): Promise<RecoveryResult>;
	getRetryOptions(error: AppError): RetryOptions;
}

export interface RecoveryResult {
	success: boolean;
	action: string;
	message: string;
	data?: any;
	shouldRetry: boolean;
	retryDelay?: number;
}

export class ErrorRecoveryService {
	private strategies: Map<ErrorCategory, RecoveryStrategy>;
	private logger: Console;

	constructor() {
		this.logger = console;
		this.strategies = new Map();
		this.initializeStrategies();
	}

	private log(message: string, ...args: unknown[]): void {
		this.logger.log(`[ErrorRecoveryService] ${message}`, ...args);
	}

	private error(message: string, error?: Error): void {
		this.logger.error(`[ErrorRecoveryService] ${message}`, error);
	}

	/**
	 * Attempt to recover from an error using appropriate strategy
	 */
	async recoverFromError(error: AppError): Promise<RecoveryResult> {
		try {
			this.log(`Attempting recovery for error: ${error.code}`);

			const strategy = this.strategies.get(error.category);
			if (!strategy || !strategy.canRecover(error)) {
				return {
					success: false,
					action: "no_recovery",
					message: "No recovery strategy available for this error",
					shouldRetry: false,
				};
			}

			const result = await strategy.recover(error, error.context);

			this.log(
				`Recovery ${result.success ? "succeeded" : "failed"}: ${result.message}`
			);
			return result;
		} catch (recoveryError) {
			this.error("Recovery attempt failed:", recoveryError as Error);
			return {
				success: false,
				action: "recovery_failed",
				message: "Error recovery process failed",
				shouldRetry: false,
			};
		}
	}

	/**
	 * Execute an operation with automatic error recovery
	 */
	async executeWithRecovery<T>(
		operation: () => Promise<T>,
		context: ErrorContext,
		maxRecoveryAttempts: number = 3
	): Promise<T> {
		let lastError: AppError | undefined;

		for (let attempt = 1; attempt <= maxRecoveryAttempts + 1; attempt++) {
			try {
				return await operation();
			} catch (error) {
				lastError =
					error instanceof AppError
						? error
						: ErrorClassifier.classifyError(error, context);

				// Don't attempt recovery on the last attempt
				if (attempt > maxRecoveryAttempts) {
					break;
				}

				// Attempt recovery
				const recoveryResult = await this.recoverFromError(lastError);

				if (!recoveryResult.success || !recoveryResult.shouldRetry) {
					break;
				}

				// Wait before retrying if specified
				if (recoveryResult.retryDelay) {
					await this.sleep(recoveryResult.retryDelay);
				}
			}
		}

		throw lastError;
	}

	/**
	 * Get retry options for a specific error
	 */
	getRetryOptions(error: AppError): RetryOptions {
		const strategy = this.strategies.get(error.category);
		if (strategy) {
			return strategy.getRetryOptions(error);
		}

		return {
			maxRetries: error.maxRetries,
			baseDelay: error.retryDelay,
			exponentialBackoff: error.exponentialBackoff,
			maxDelay: 30000,
			jitter: true,
		};
	}

	private initializeStrategies(): void {
		this.strategies.set(
			ErrorCategory.GITHUB_RATE_LIMIT,
			new GitHubRateLimitStrategy()
		);
		this.strategies.set(ErrorCategory.GITHUB_AUTH, new GitHubAuthStrategy());
		this.strategies.set(
			ErrorCategory.AI_API_RATE_LIMIT,
			new AIRateLimitStrategy()
		);
		this.strategies.set(
			ErrorCategory.AI_CONTEXT_LENGTH,
			new AIContextLengthStrategy()
		);
		this.strategies.set(
			ErrorCategory.DATABASE_CONNECTION,
			new DatabaseConnectionStrategy()
		);
		this.strategies.set(ErrorCategory.NETWORK, new NetworkErrorStrategy());
		this.strategies.set(
			ErrorCategory.CONVERSION_SYNTAX,
			new ConversionSyntaxStrategy()
		);
		this.strategies.set(
			ErrorCategory.PREVIEW_CONTAINER_STARTUP,
			new PreviewContainerStrategy()
		);
	}

	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}

/**
 * GitHub Rate Limit Recovery Strategy
 */
class GitHubRateLimitStrategy implements RecoveryStrategy {
	canRecover(error: AppError): boolean {
		return error.category === ErrorCategory.GITHUB_RATE_LIMIT;
	}

	async recover(
		error: AppError,
		context: ErrorContext
	): Promise<RecoveryResult> {
		// Check if we can wait for rate limit reset
		const resetTime = this.getRateLimitResetTime(error);
		const waitTime = resetTime ? resetTime - Date.now() : 3600000; // Default 1 hour

		if (waitTime > 0 && waitTime < 7200000) {
			// Don't wait more than 2 hours
			return {
				success: true,
				action: "wait_rate_limit_reset",
				message: `Waiting ${Math.ceil(
					waitTime / 60000
				)} minutes for GitHub rate limit reset`,
				shouldRetry: true,
				retryDelay: Math.min(waitTime, 300000), // Max 5 minutes initial wait
			};
		}

		return {
			success: false,
			action: "rate_limit_exceeded",
			message:
				"GitHub rate limit exceeded and reset time is too far in the future",
			shouldRetry: false,
		};
	}

	getRetryOptions(error: AppError): RetryOptions {
		return {
			maxRetries: 3,
			baseDelay: 300000, // 5 minutes
			exponentialBackoff: false,
			maxDelay: 3600000, // 1 hour
			jitter: true,
		};
	}

	private getRateLimitResetTime(error: AppError): number | null {
		// Extract rate limit reset time from error context if available
		return error.context.additionalData?.rateLimitReset || null;
	}
}

/**
 * GitHub Authentication Recovery Strategy
 */
class GitHubAuthStrategy implements RecoveryStrategy {
	canRecover(error: AppError): boolean {
		return error.category === ErrorCategory.GITHUB_AUTH;
	}

	async recover(
		error: AppError,
		context: ErrorContext
	): Promise<RecoveryResult> {
		// For auth errors, we typically need manual intervention
		return {
			success: false,
			action: "manual_auth_required",
			message: "GitHub authentication required. Please reconnect your account.",
			shouldRetry: false,
		};
	}

	getRetryOptions(error: AppError): RetryOptions {
		return {
			maxRetries: 0,
			baseDelay: 0,
			exponentialBackoff: false,
		};
	}
}

/**
 * AI API Rate Limit Recovery Strategy
 */
class AIRateLimitStrategy implements RecoveryStrategy {
	canRecover(error: AppError): boolean {
		return error.category === ErrorCategory.AI_API_RATE_LIMIT;
	}

	async recover(
		error: AppError,
		context: ErrorContext
	): Promise<RecoveryResult> {
		// Implement exponential backoff for AI rate limits
		return {
			success: true,
			action: "exponential_backoff",
			message: "AI API rate limit hit, implementing exponential backoff",
			shouldRetry: true,
			retryDelay: 30000, // Start with 30 seconds
		};
	}

	getRetryOptions(error: AppError): RetryOptions {
		return {
			maxRetries: 5,
			baseDelay: 30000, // 30 seconds
			exponentialBackoff: true,
			maxDelay: 300000, // 5 minutes
			jitter: true,
		};
	}
}

/**
 * AI Context Length Recovery Strategy
 */
class AIContextLengthStrategy implements RecoveryStrategy {
	canRecover(error: AppError): boolean {
		return error.category === ErrorCategory.AI_CONTEXT_LENGTH;
	}

	async recover(
		error: AppError,
		context: ErrorContext
	): Promise<RecoveryResult> {
		// Try to split the content into smaller chunks
		if (context.additionalData?.sourceCode) {
			const chunks = this.splitCodeIntoChunks(
				context.additionalData.sourceCode
			);

			return {
				success: true,
				action: "split_content",
				message: `Split content into ${chunks.length} smaller chunks for processing`,
				data: { chunks },
				shouldRetry: true,
			};
		}

		return {
			success: false,
			action: "cannot_split",
			message: "Unable to split content for processing",
			shouldRetry: false,
		};
	}

	getRetryOptions(error: AppError): RetryOptions {
		return {
			maxRetries: 2,
			baseDelay: 1000,
			exponentialBackoff: false,
		};
	}

	private splitCodeIntoChunks(
		code: string,
		maxChunkSize: number = 4000
	): string[] {
		const lines = code.split("\n");
		const chunks: string[] = [];
		let currentChunk = "";

		for (const line of lines) {
			if (
				currentChunk.length + line.length > maxChunkSize &&
				currentChunk.length > 0
			) {
				chunks.push(currentChunk);
				currentChunk = line;
			} else {
				currentChunk += (currentChunk ? "\n" : "") + line;
			}
		}

		if (currentChunk) {
			chunks.push(currentChunk);
		}

		return chunks;
	}
}

/**
 * Database Connection Recovery Strategy
 */
class DatabaseConnectionStrategy implements RecoveryStrategy {
	canRecover(error: AppError): boolean {
		return error.category === ErrorCategory.DATABASE_CONNECTION;
	}

	async recover(
		error: AppError,
		context: ErrorContext
	): Promise<RecoveryResult> {
		// Try to reconnect to the database
		try {
			// This would typically involve reinitializing the database connection
			// For now, we'll just indicate that a retry should be attempted
			return {
				success: true,
				action: "reconnect_database",
				message: "Attempting to reconnect to database",
				shouldRetry: true,
				retryDelay: 5000,
			};
		} catch (reconnectError) {
			return {
				success: false,
				action: "reconnect_failed",
				message: "Failed to reconnect to database",
				shouldRetry: false,
			};
		}
	}

	getRetryOptions(error: AppError): RetryOptions {
		return {
			maxRetries: 5,
			baseDelay: 5000,
			exponentialBackoff: true,
			maxDelay: 30000,
			jitter: true,
		};
	}
}

/**
 * Network Error Recovery Strategy
 */
class NetworkErrorStrategy implements RecoveryStrategy {
	canRecover(error: AppError): boolean {
		return error.category === ErrorCategory.NETWORK;
	}

	async recover(
		error: AppError,
		context: ErrorContext
	): Promise<RecoveryResult> {
		return {
			success: true,
			action: "retry_network_request",
			message: "Network error detected, will retry with exponential backoff",
			shouldRetry: true,
			retryDelay: 2000,
		};
	}

	getRetryOptions(error: AppError): RetryOptions {
		return {
			maxRetries: 3,
			baseDelay: 2000,
			exponentialBackoff: true,
			maxDelay: 10000,
			jitter: true,
		};
	}
}

/**
 * Conversion Syntax Error Recovery Strategy
 */
class ConversionSyntaxStrategy implements RecoveryStrategy {
	canRecover(error: AppError): boolean {
		return error.category === ErrorCategory.CONVERSION_SYNTAX;
	}

	async recover(
		error: AppError,
		context: ErrorContext
	): Promise<RecoveryResult> {
		// For syntax errors, we can try regenerating with different prompts
		return {
			success: true,
			action: "regenerate_with_syntax_focus",
			message:
				"Syntax error detected, will regenerate code with focus on syntax correctness",
			shouldRetry: true,
			retryDelay: 1000,
		};
	}

	getRetryOptions(error: AppError): RetryOptions {
		return {
			maxRetries: 2,
			baseDelay: 1000,
			exponentialBackoff: false,
		};
	}
}

/**
 * Preview Container Recovery Strategy
 */
class PreviewContainerStrategy implements RecoveryStrategy {
	canRecover(error: AppError): boolean {
		return error.category === ErrorCategory.PREVIEW_CONTAINER_STARTUP;
	}

	async recover(
		error: AppError,
		context: ErrorContext
	): Promise<RecoveryResult> {
		// Try to restart the container or fall back to static preview
		return {
			success: true,
			action: "restart_container",
			message: "Container startup failed, attempting restart",
			shouldRetry: true,
			retryDelay: 5000,
		};
	}

	getRetryOptions(error: AppError): RetryOptions {
		return {
			maxRetries: 2,
			baseDelay: 5000,
			exponentialBackoff: false,
			maxDelay: 10000,
		};
	}
}
