/**
 * Integration tests for error handling and recovery systems
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
	AppError,
	ErrorCategory,
	ErrorSeverity,
	ErrorClassifier,
	RetryManager,
} from "../../utils/errors";
import { ErrorRecoveryService } from "../../services/errorRecovery";
import { ErrorMessageGenerator } from "../../utils/errorMessages";

describe("Error Handling System", () => {
	let errorRecoveryService: ErrorRecoveryService;

	beforeEach(() => {
		errorRecoveryService = new ErrorRecoveryService();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("Error Classification", () => {
		it("should classify GitHub authentication errors correctly", () => {
			const error = new Error("Request failed with status code 401");
			(error as any).response = {
				status: 401,
				config: { baseURL: "https://api.github.com" },
			};

			const context = {
				operation: "github_import",
				timestamp: new Date(),
			};

			const appError = ErrorClassifier.classifyError(error, context);

			expect(appError.category).toBe(ErrorCategory.GITHUB_AUTH);
			expect(appError.severity).toBe(ErrorSeverity.HIGH);
			expect(appError.code).toBe("GITHUB_AUTH_FAILED");
			expect(appError.retryable).toBe(false);
		});

		it("should classify GitHub rate limit errors correctly", () => {
			const error = new Error("Request failed with status code 403");
			(error as any).response = {
				status: 403,
				config: { baseURL: "https://api.github.com" },
				headers: { "x-ratelimit-remaining": "0" },
			};

			const context = {
				operation: "github_api_call",
				timestamp: new Date(),
			};

			const appError = ErrorClassifier.classifyError(error, context);

			expect(appError.category).toBe(ErrorCategory.GITHUB_RATE_LIMIT);
			expect(appError.severity).toBe(ErrorSeverity.MEDIUM);
			expect(appError.retryable).toBe(true);
			expect(appError.maxRetries).toBeGreaterThan(0);
		});

		it("should classify AI service errors correctly", () => {
			const error = new Error("Rate limit exceeded for AI model");

			const context = {
				operation: "ai_conversion",
				timestamp: new Date(),
			};

			const appError = ErrorClassifier.classifyError(error, context);

			expect(appError.category).toBe(ErrorCategory.AI_API_RATE_LIMIT);
			expect(appError.retryable).toBe(true);
			expect(appError.exponentialBackoff).toBe(true);
		});

		it("should classify context length errors correctly", () => {
			const error = new Error("Context length exceeded maximum token limit");

			const context = {
				operation: "ai_conversion",
				timestamp: new Date(),
			};

			const appError = ErrorClassifier.classifyError(error, context);

			expect(appError.category).toBe(ErrorCategory.AI_CONTEXT_LENGTH);
			expect(appError.severity).toBe(ErrorSeverity.HIGH);
			expect(appError.retryable).toBe(true);
		});

		it("should classify database connection errors correctly", () => {
			const error = new Error("Connection to database failed");

			const context = {
				operation: "database_query",
				timestamp: new Date(),
			};

			const appError = ErrorClassifier.classifyError(error, context);

			expect(appError.category).toBe(ErrorCategory.DATABASE_CONNECTION);
			expect(appError.severity).toBe(ErrorSeverity.CRITICAL);
			expect(appError.retryable).toBe(true);
		});

		it("should classify network errors correctly", () => {
			const error = new Error("ECONNREFUSED: Connection refused");

			const context = {
				operation: "network_request",
				timestamp: new Date(),
			};

			const appError = ErrorClassifier.classifyError(error, context);

			expect(appError.category).toBe(ErrorCategory.NETWORK);
			expect(appError.retryable).toBe(true);
		});

		it("should handle unknown errors gracefully", () => {
			const error = { weird: "object" };

			const context = {
				operation: "unknown_operation",
				timestamp: new Date(),
			};

			const appError = ErrorClassifier.classifyError(error, context);

			expect(appError.category).toBe(ErrorCategory.UNKNOWN);
			expect(appError.severity).toBe(ErrorSeverity.HIGH);
			expect(appError.retryable).toBe(false);
		});
	});

	describe("Retry Manager", () => {
		it("should retry operations with exponential backoff", async () => {
			let attempts = 0;
			const operation = vi.fn().mockImplementation(() => {
				attempts++;
				if (attempts < 3) {
					throw new Error("Temporary failure");
				}
				return Promise.resolve("success");
			});

			const context = {
				operation: "test_operation",
				timestamp: new Date(),
			};

			const result = await RetryManager.executeWithRetry(
				operation,
				{
					maxRetries: 3,
					baseDelay: 100,
					exponentialBackoff: true,
					jitter: false,
				},
				context
			);

			expect(result.success).toBe(true);
			expect(result.result).toBe("success");
			expect(result.attempts).toBe(3);
			expect(operation).toHaveBeenCalledTimes(3);
		});

		it("should fail after max retries", async () => {
			const operation = vi
				.fn()
				.mockRejectedValue(new Error("Persistent failure"));

			const context = {
				operation: "test_operation",
				timestamp: new Date(),
			};

			const result = await RetryManager.executeWithRetry(
				operation,
				{
					maxRetries: 2,
					baseDelay: 10,
					exponentialBackoff: false,
				},
				context
			);

			expect(result.success).toBe(false);
			expect(result.error).toBeInstanceOf(AppError);
			expect(result.attempts).toBe(3); // maxRetries + 1
			expect(operation).toHaveBeenCalledTimes(3);
		});

		it("should not retry non-retryable errors", async () => {
			const nonRetryableError = new AppError({
				category: ErrorCategory.VALIDATION,
				severity: ErrorSeverity.LOW,
				code: "VALIDATION_ERROR",
				message: "Invalid input",
				userMessage: "Please check your input",
				context: { operation: "validation", timestamp: new Date() },
				recoveryActions: [],
				retryable: false,
				maxRetries: 0,
				retryDelay: 0,
				exponentialBackoff: false,
			});

			const operation = vi.fn().mockRejectedValue(nonRetryableError);

			const context = {
				operation: "test_operation",
				timestamp: new Date(),
			};

			const result = await RetryManager.executeWithRetry(
				operation,
				{
					maxRetries: 3,
					baseDelay: 10,
					exponentialBackoff: false,
				},
				context
			);

			expect(result.success).toBe(false);
			expect(result.attempts).toBe(1);
			expect(operation).toHaveBeenCalledTimes(1);
		});
	});

	describe("Error Recovery Service", () => {
		it("should recover from GitHub rate limit errors", async () => {
			const rateLimitError = new AppError({
				category: ErrorCategory.GITHUB_RATE_LIMIT,
				severity: ErrorSeverity.MEDIUM,
				code: "GITHUB_RATE_LIMIT_EXCEEDED",
				message: "Rate limit exceeded",
				userMessage: "GitHub rate limit reached",
				context: {
					operation: "github_api_call",
					timestamp: new Date(),
					additionalData: { rateLimitReset: Date.now() + 300000 }, // 5 minutes
				},
				recoveryActions: [],
				retryable: true,
				maxRetries: 3,
				retryDelay: 300000,
				exponentialBackoff: false,
			});

			const result = await errorRecoveryService.recoverFromError(
				rateLimitError
			);

			expect(result.success).toBe(true);
			expect(result.action).toBe("wait_rate_limit_reset");
			expect(result.shouldRetry).toBe(true);
			expect(result.retryDelay).toBeDefined();
		});

		it("should handle AI context length errors by splitting content", async () => {
			const contextError = new AppError({
				category: ErrorCategory.AI_CONTEXT_LENGTH,
				severity: ErrorSeverity.HIGH,
				code: "AI_CONTEXT_TOO_LONG",
				message: "Context too long",
				userMessage: "File too large to process",
				context: {
					operation: "ai_conversion",
					timestamp: new Date(),
					additionalData: {
						sourceCode: "function test() {\n".repeat(1000) + "}",
					},
				},
				recoveryActions: [],
				retryable: true,
				maxRetries: 2,
				retryDelay: 1000,
				exponentialBackoff: false,
			});

			const result = await errorRecoveryService.recoverFromError(contextError);

			expect(result.success).toBe(true);
			expect(result.action).toBe("split_content");
			expect(result.shouldRetry).toBe(true);
			expect(result.data?.chunks).toBeDefined();
			expect(Array.isArray(result.data.chunks)).toBe(true);
		});

		it("should handle database connection errors with retry", async () => {
			const dbError = new AppError({
				category: ErrorCategory.DATABASE_CONNECTION,
				severity: ErrorSeverity.CRITICAL,
				code: "DATABASE_CONNECTION_FAILED",
				message: "Database connection failed",
				userMessage: "Unable to connect to database",
				context: { operation: "database_query", timestamp: new Date() },
				recoveryActions: [],
				retryable: true,
				maxRetries: 5,
				retryDelay: 5000,
				exponentialBackoff: true,
			});

			const result = await errorRecoveryService.recoverFromError(dbError);

			expect(result.success).toBe(true);
			expect(result.action).toBe("reconnect_database");
			expect(result.shouldRetry).toBe(true);
		});

		it("should not recover from authentication errors", async () => {
			const authError = new AppError({
				category: ErrorCategory.GITHUB_AUTH,
				severity: ErrorSeverity.HIGH,
				code: "GITHUB_AUTH_FAILED",
				message: "Authentication failed",
				userMessage: "Please reconnect your GitHub account",
				context: { operation: "github_auth", timestamp: new Date() },
				recoveryActions: [],
				retryable: false,
				maxRetries: 0,
				retryDelay: 0,
				exponentialBackoff: false,
			});

			const result = await errorRecoveryService.recoverFromError(authError);

			expect(result.success).toBe(false);
			expect(result.action).toBe("manual_auth_required");
			expect(result.shouldRetry).toBe(false);
		});
	});

	describe("Error Message Generation", () => {
		it("should generate user-friendly messages for GitHub auth errors", () => {
			const authError = new AppError({
				category: ErrorCategory.GITHUB_AUTH,
				severity: ErrorSeverity.HIGH,
				code: "GITHUB_AUTH_FAILED",
				message: "Authentication failed",
				userMessage: "Please reconnect your GitHub account",
				context: { operation: "github_auth", timestamp: new Date() },
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

			const userMessage = ErrorMessageGenerator.generateUserMessage(authError);

			expect(userMessage.title).toBe("GitHub Authentication Required");
			expect(userMessage.description).toBe(
				"Please reconnect your GitHub account"
			);
			expect(userMessage.severity).toBe("error");
			expect(userMessage.icon).toBe("🐙");
			expect(userMessage.suggestions).toContain(
				"Make sure you have a valid GitHub account"
			);
			expect(userMessage.actions).toHaveLength(2); // Manual action + Get Help
		});

		it("should generate appropriate actions for retryable errors", () => {
			const retryableError = new AppError({
				category: ErrorCategory.AI_API_RATE_LIMIT,
				severity: ErrorSeverity.MEDIUM,
				code: "AI_RATE_LIMIT_EXCEEDED",
				message: "Rate limit exceeded",
				userMessage: "AI service is busy",
				context: { operation: "ai_conversion", timestamp: new Date() },
				recoveryActions: [
					{
						type: "retry",
						description: "Wait and retry",
						automated: true,
						estimatedTime: 30000,
					},
				],
				retryable: true,
				maxRetries: 5,
				retryDelay: 30000,
				exponentialBackoff: true,
			});

			const userMessage =
				ErrorMessageGenerator.generateUserMessage(retryableError);

			expect(
				userMessage.actions.some((action) => action.type === "retry")
			).toBe(true);
			expect(
				userMessage.actions.some((action) => action.disabled === true)
			).toBe(true); // Automated retry
			expect(userMessage.actions.some((action) => action.estimatedTime)).toBe(
				true
			);
		});

		it("should include helpful suggestions for different error categories", () => {
			const contextError = new AppError({
				category: ErrorCategory.AI_CONTEXT_LENGTH,
				severity: ErrorSeverity.HIGH,
				code: "AI_CONTEXT_TOO_LONG",
				message: "Context too long",
				userMessage: "File too large to process",
				context: { operation: "ai_conversion", timestamp: new Date() },
				recoveryActions: [],
				retryable: true,
				maxRetries: 2,
				retryDelay: 1000,
				exponentialBackoff: false,
			});

			const userMessage =
				ErrorMessageGenerator.generateUserMessage(contextError);

			expect(userMessage.suggestions).toContain(
				"The file is too large for the AI model to process at once"
			);
			expect(userMessage.suggestions).toContain(
				"Try splitting large files into smaller components"
			);
		});
	});

	describe("Integration Scenarios", () => {
		it("should handle complete error recovery workflow", async () => {
			let attempts = 0;
			const operation = vi.fn().mockImplementation(() => {
				attempts++;
				if (attempts === 1) {
					// First attempt: validation error (non-retryable)
					const error = new AppError({
						category: ErrorCategory.VALIDATION,
						severity: ErrorSeverity.LOW,
						code: "VALIDATION_ERROR",
						message: "Invalid input",
						userMessage: "Please check your input",
						context: { operation: "validation", timestamp: new Date() },
						recoveryActions: [],
						retryable: false,
						maxRetries: 0,
						retryDelay: 0,
						exponentialBackoff: false,
					});
					throw error;
				} else {
					// This shouldn't be reached since validation errors are non-retryable
					return Promise.resolve("success");
				}
			});

			const context = {
				operation: "integration_test",
				timestamp: new Date(),
			};

			await expect(
				errorRecoveryService.executeWithRecovery(operation, context, 3)
			).rejects.toThrow("Invalid input");

			expect(operation).toHaveBeenCalledTimes(1);
		}, 10000);

		it("should fail gracefully when recovery is not possible", async () => {
			const operation = vi.fn().mockImplementation(() => {
				const error = new AppError({
					category: ErrorCategory.VALIDATION,
					severity: ErrorSeverity.LOW,
					code: "VALIDATION_ERROR",
					message: "Invalid input",
					userMessage: "Please check your input",
					context: { operation: "validation", timestamp: new Date() },
					recoveryActions: [],
					retryable: false,
					maxRetries: 0,
					retryDelay: 0,
					exponentialBackoff: false,
				});
				throw error;
			});

			const context = {
				operation: "integration_test",
				timestamp: new Date(),
			};

			await expect(
				errorRecoveryService.executeWithRecovery(operation, context, 3)
			).rejects.toThrow("Invalid input");

			expect(operation).toHaveBeenCalledTimes(1);
		});

		it("should handle mixed error types in sequence", async () => {
			let attempts = 0;
			const operation = vi.fn().mockImplementation(() => {
				attempts++;
				// Always throw a non-retryable validation error
				const error = new AppError({
					category: ErrorCategory.VALIDATION,
					severity: ErrorSeverity.LOW,
					code: "VALIDATION_ERROR",
					message: "Invalid input",
					userMessage: "Please check your input",
					context: { operation: "validation", timestamp: new Date() },
					recoveryActions: [],
					retryable: false,
					maxRetries: 0,
					retryDelay: 0,
					exponentialBackoff: false,
				});
				throw error;
			});

			const context = {
				operation: "mixed_errors_test",
				timestamp: new Date(),
			};

			// This should fail immediately with validation error (non-retryable)
			await expect(
				errorRecoveryService.executeWithRecovery(operation, context, 3)
			).rejects.toThrow("Invalid input");

			expect(operation).toHaveBeenCalledTimes(1);
		}, 10000);
	});
});
