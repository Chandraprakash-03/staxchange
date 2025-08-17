/**
 * Unit tests for error recovery strategies
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
	AppError,
	ErrorCategory,
	ErrorSeverity,
	RetryManager,
} from "../../utils/errors";

describe("Error Recovery Strategies", () => {
	describe("Retry Manager Edge Cases", () => {
		it("should handle immediate success without retries", async () => {
			const operation = vi.fn().mockResolvedValue("immediate_success");

			const context = {
				operation: "test_operation",
				timestamp: new Date(),
			};

			const result = await RetryManager.executeWithRetry(
				operation,
				{
					maxRetries: 3,
					baseDelay: 1000,
					exponentialBackoff: true,
				},
				context
			);

			expect(result.success).toBe(true);
			expect(result.result).toBe("immediate_success");
			expect(result.attempts).toBe(1);
			expect(operation).toHaveBeenCalledTimes(1);
		});

		it("should calculate exponential backoff delays correctly", async () => {
			const delays: number[] = [];
			const originalSetTimeout = global.setTimeout;

			global.setTimeout = vi.fn().mockImplementation((callback, delay) => {
				delays.push(delay);
				return originalSetTimeout(callback, 0); // Execute immediately for test
			}) as any;

			let attempts = 0;
			const operation = vi.fn().mockImplementation(() => {
				attempts++;
				if (attempts <= 3) {
					throw new Error("Retry test");
				}
				return Promise.resolve("success");
			});

			const context = {
				operation: "exponential_backoff_test",
				timestamp: new Date(),
			};

			await RetryManager.executeWithRetry(
				operation,
				{
					maxRetries: 3,
					baseDelay: 1000,
					exponentialBackoff: true,
					jitter: false,
				},
				context
			);

			// Check that delays follow exponential pattern: 1000, 2000, 4000
			expect(delays).toHaveLength(3);
			expect(delays[0]).toBe(1000);
			expect(delays[1]).toBe(2000);
			expect(delays[2]).toBe(4000);

			global.setTimeout = originalSetTimeout;
		});

		it("should respect maximum delay limits", async () => {
			const delays: number[] = [];
			const originalSetTimeout = global.setTimeout;

			global.setTimeout = vi.fn().mockImplementation((callback, delay) => {
				delays.push(delay);
				return originalSetTimeout(callback, 0);
			}) as any;

			let attempts = 0;
			const operation = vi.fn().mockImplementation(() => {
				attempts++;
				if (attempts <= 5) {
					throw new Error("Max delay test");
				}
				return Promise.resolve("success");
			});

			const context = {
				operation: "max_delay_test",
				timestamp: new Date(),
			};

			await RetryManager.executeWithRetry(
				operation,
				{
					maxRetries: 5,
					baseDelay: 1000,
					exponentialBackoff: true,
					maxDelay: 3000,
					jitter: false,
				},
				context
			);

			// All delays should be capped at maxDelay
			expect(delays.every((delay) => delay <= 3000)).toBe(true);
			expect(delays.filter((delay) => delay === 3000).length).toBeGreaterThan(
				0
			);

			global.setTimeout = originalSetTimeout;
		});

		it("should apply jitter to prevent thundering herd", async () => {
			const delays: number[] = [];
			const originalSetTimeout = global.setTimeout;

			global.setTimeout = vi.fn().mockImplementation((callback, delay) => {
				delays.push(delay);
				return originalSetTimeout(callback, 0);
			}) as any;

			let attempts = 0;
			const operation = vi.fn().mockImplementation(() => {
				attempts++;
				if (attempts <= 3) {
					throw new Error("Jitter test");
				}
				return Promise.resolve("success");
			});

			const context = {
				operation: "jitter_test",
				timestamp: new Date(),
			};

			await RetryManager.executeWithRetry(
				operation,
				{
					maxRetries: 3,
					baseDelay: 1000,
					exponentialBackoff: false,
					jitter: true,
				},
				context
			);

			// With jitter, delays should vary between 50% and 100% of base delay
			expect(delays).toHaveLength(3);
			delays.forEach((delay) => {
				expect(delay).toBeGreaterThanOrEqual(500); // 50% of 1000
				expect(delay).toBeLessThanOrEqual(1000); // 100% of 1000
			});

			global.setTimeout = originalSetTimeout;
		});
	});

	describe("Error Context Handling", () => {
		it("should preserve error context through retry attempts", async () => {
			const contextData = {
				userId: "test-user-123",
				projectId: "test-project-456",
				operation: "context_preservation_test",
				timestamp: new Date(),
				additionalData: { customField: "test-value" },
			};

			let capturedError: AppError | undefined;
			const operation = vi.fn().mockImplementation(() => {
				const error = new AppError({
					category: ErrorCategory.NETWORK,
					severity: ErrorSeverity.MEDIUM,
					code: "NETWORK_ERROR",
					message: "Network error",
					userMessage: "Network issue occurred",
					context: contextData,
					recoveryActions: [],
					retryable: true,
					maxRetries: 2,
					retryDelay: 100,
					exponentialBackoff: false,
				});
				capturedError = error;
				throw error;
			});

			const result = await RetryManager.executeWithRetry(
				operation,
				{
					maxRetries: 2,
					baseDelay: 100,
					exponentialBackoff: false,
				},
				contextData
			);

			expect(result.success).toBe(false);
			expect(capturedError).toBeDefined();
			expect(capturedError!.context.userId).toBe("test-user-123");
			expect(capturedError!.context.projectId).toBe("test-project-456");
			expect(capturedError!.context.additionalData?.customField).toBe(
				"test-value"
			);
		});

		it("should handle missing context gracefully", async () => {
			const operation = vi
				.fn()
				.mockRejectedValue(new Error("No context error"));

			const minimalContext = {
				operation: "minimal_context_test",
				timestamp: new Date(),
			};

			const result = await RetryManager.executeWithRetry(
				operation,
				{
					maxRetries: 1,
					baseDelay: 10,
					exponentialBackoff: false,
				},
				minimalContext
			);

			expect(result.success).toBe(false);
			expect(result.error).toBeInstanceOf(AppError);
			expect(result.error!.context.operation).toBe("minimal_context_test");
		});
	});

	describe("Complex Error Scenarios", () => {
		it("should handle cascading failures correctly", async () => {
			const errorSequence = [
				new Error("First failure"),
				new Error("Second failure"),
				new Error("Third failure"),
			];

			let attemptCount = 0;
			const operation = vi.fn().mockImplementation(() => {
				if (attemptCount < errorSequence.length) {
					const error = errorSequence[attemptCount];
					attemptCount++;
					throw error;
				}
				return Promise.resolve("finally_success");
			});

			const context = {
				operation: "cascading_failures_test",
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

			expect(result.success).toBe(true);
			expect(result.result).toBe("finally_success");
			expect(result.attempts).toBe(4); // 3 failures + 1 success
		});

		it("should handle timeout scenarios", async () => {
			const operation = vi.fn().mockImplementation(() => {
				return new Promise((_, reject) => {
					setTimeout(() => reject(new Error("Operation timeout")), 50);
				});
			});

			const context = {
				operation: "timeout_test",
				timestamp: new Date(),
			};

			const startTime = Date.now();
			const result = await RetryManager.executeWithRetry(
				operation,
				{
					maxRetries: 2,
					baseDelay: 10,
					exponentialBackoff: false,
				},
				context
			);
			const endTime = Date.now();

			expect(result.success).toBe(false);
			expect(result.error?.message).toContain("timeout");
			expect(endTime - startTime).toBeGreaterThan(150); // At least 3 * 50ms for timeouts
		});

		it("should handle memory pressure scenarios", async () => {
			const largeData = new Array(1000000).fill("test-data");

			const operation = vi.fn().mockImplementation(() => {
				// Simulate memory-intensive operation
				const processedData = largeData.map((item) => item.toUpperCase());

				if (processedData.length > 0) {
					throw new Error("Simulated memory pressure error");
				}
				return Promise.resolve("success");
			});

			const context = {
				operation: "memory_pressure_test",
				timestamp: new Date(),
				additionalData: { dataSize: largeData.length },
			};

			const result = await RetryManager.executeWithRetry(
				operation,
				{
					maxRetries: 1,
					baseDelay: 10,
					exponentialBackoff: false,
				},
				context
			);

			expect(result.success).toBe(false);
			expect(result.error?.context.additionalData?.dataSize).toBe(1000000);
		});
	});

	describe("Recovery Action Validation", () => {
		it("should validate recovery actions are appropriate for error type", () => {
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

			expect(authError.recoveryActions).toHaveLength(1);
			expect(authError.recoveryActions[0].type).toBe("manual");
			expect(authError.recoveryActions[0].automated).toBe(false);
			expect(authError.retryable).toBe(false);
		});

		it("should provide automated recovery for retryable errors", () => {
			const rateLimitError = new AppError({
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

			expect(rateLimitError.recoveryActions).toHaveLength(1);
			expect(rateLimitError.recoveryActions[0].type).toBe("retry");
			expect(rateLimitError.recoveryActions[0].automated).toBe(true);
			expect(rateLimitError.retryable).toBe(true);
			expect(rateLimitError.maxRetries).toBeGreaterThan(0);
		});
	});

	describe("Performance and Resource Management", () => {
		it("should not consume excessive memory during retries", async () => {
			const initialMemory = process.memoryUsage().heapUsed;

			const operation = vi
				.fn()
				.mockRejectedValue(new Error("Memory test error"));

			const context = {
				operation: "memory_management_test",
				timestamp: new Date(),
			};

			await RetryManager.executeWithRetry(
				operation,
				{
					maxRetries: 10,
					baseDelay: 1,
					exponentialBackoff: false,
				},
				context
			);

			const finalMemory = process.memoryUsage().heapUsed;
			const memoryIncrease = finalMemory - initialMemory;

			// Memory increase should be reasonable (less than 10MB for this test)
			expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
		});

		it("should handle concurrent retry operations", async () => {
			const operations = Array.from({ length: 10 }, (_, index) => {
				let attempts = 0;
				return vi.fn().mockImplementation(() => {
					attempts++;
					if (attempts <= 2) {
						throw new Error(`Concurrent error ${index}`);
					}
					return Promise.resolve(`success_${index}`);
				});
			});

			const context = {
				operation: "concurrent_retries_test",
				timestamp: new Date(),
			};

			const promises = operations.map((operation) =>
				RetryManager.executeWithRetry(
					operation,
					{
						maxRetries: 3,
						baseDelay: 10,
						exponentialBackoff: false,
						jitter: true,
					},
					context
				)
			);

			const results = await Promise.all(promises);

			results.forEach((result, index) => {
				expect(result.success).toBe(true);
				expect(result.result).toBe(`success_${index}`);
				expect(result.attempts).toBe(3);
			});

			operations.forEach((operation) => {
				expect(operation).toHaveBeenCalledTimes(3);
			});
		});
	});
});
