import { defineConfig } from "vitest/config";

/**
 * Test configuration for comprehensive testing suite
 */
export const testConfig = {
	// Test categories and their patterns
	categories: {
		unit: {
			pattern:
				"src/test/{services,utils,models,repositories,agents}/**/*.test.ts",
			timeout: 5000,
			concurrent: true,
		},
		integration: {
			pattern: "src/test/integration/**/*.test.ts",
			timeout: 30000,
			concurrent: false, // Database tests should run sequentially
		},
		api: {
			pattern: "src/test/api/**/*.test.ts",
			timeout: 15000,
			concurrent: true,
		},
		components: {
			pattern: "src/test/components/**/*.test.tsx",
			timeout: 10000,
			concurrent: true,
		},
		e2e: {
			pattern: "src/test/e2e/**/*.spec.ts",
			timeout: 60000,
			concurrent: false, // E2E tests should run sequentially
		},
		performance: {
			pattern: "src/test/performance/**/*.test.ts",
			timeout: 120000, // Performance tests may take longer
			concurrent: false,
		},
	},

	// Coverage configuration
	coverage: {
		provider: "v8",
		reporter: ["text", "json", "html"],
		exclude: [
			"node_modules/**",
			"src/test/**",
			"**/*.d.ts",
			"**/*.config.*",
			"**/coverage/**",
			"**/dist/**",
			"**/.next/**",
		],
		thresholds: {
			global: {
				branches: 80,
				functions: 80,
				lines: 80,
				statements: 80,
			},
			// Specific thresholds for critical components
			"src/services/**": {
				branches: 90,
				functions: 90,
				lines: 90,
				statements: 90,
			},
			"src/utils/**": {
				branches: 85,
				functions: 85,
				lines: 85,
				statements: 85,
			},
		},
	},

	// Test environment setup
	environment: {
		jsdom: {
			// For component tests
			url: "http://localhost:3000",
			pretendToBeVisual: true,
		},
		node: {
			// For API and integration tests
			globals: true,
		},
	},

	// Mock configurations
	mocks: {
		// External services that should always be mocked
		external: ["axios", "@prisma/client", "redis", "bull", "jsonwebtoken"],
		// Internal modules that may need mocking
		internal: [
			"@/lib/prisma",
			"@/lib/redis",
			"@/services/openrouter",
			"@/services/github",
		],
	},

	// Performance benchmarks
	performance: {
		// Maximum acceptable response times (in milliseconds)
		benchmarks: {
			unitTest: 100,
			integrationTest: 5000,
			apiEndpoint: 2000,
			databaseQuery: 1000,
			aiServiceCall: 10000,
			fileConversion: 30000,
		},
		// Memory usage limits (in MB)
		memory: {
			maxHeapUsage: 512,
			maxTestSuite: 256,
		},
	},

	// Test data factories
	factories: {
		user: {
			default: {
				githubId: "test-github-id",
				username: "testuser",
				email: "test@example.com",
				accessToken: "test-token",
			},
		},
		project: {
			default: {
				name: "test-project",
				githubUrl: "https://github.com/testuser/test-project",
				originalTechStack: {
					language: "JavaScript",
					framework: "React",
				},
				status: "imported",
			},
		},
		conversionJob: {
			default: {
				plan: {
					tasks: [],
					estimatedDuration: 3000,
					complexity: "medium",
					warnings: [],
				},
				status: "pending",
				progress: 0,
			},
		},
	},

	// Test utilities
	utilities: {
		// Helper functions for common test operations
		async waitForCondition(
			condition: () => boolean,
			timeout = 5000
		): Promise<void> {
			const start = Date.now();
			while (!condition() && Date.now() - start < timeout) {
				await new Promise((resolve) => setTimeout(resolve, 100));
			}
			if (!condition()) {
				throw new Error(`Condition not met within ${timeout}ms`);
			}
		},

		async measurePerformance<T>(
			operation: () => Promise<T>
		): Promise<{ result: T; duration: number; memory: number }> {
			const startMemory = process.memoryUsage().heapUsed;
			const startTime = Date.now();

			const result = await operation();

			const endTime = Date.now();
			const endMemory = process.memoryUsage().heapUsed;

			return {
				result,
				duration: endTime - startTime,
				memory: endMemory - startMemory,
			};
		},

		createMockResponse(data: any, status = 200) {
			return {
				status,
				data,
				headers: {},
				config: {},
				statusText: status === 200 ? "OK" : "Error",
			};
		},

		createMockError(message: string, code?: string) {
			const error = new Error(message);
			if (code) {
				(error as any).code = code;
			}
			return error;
		},
	},

	// Retry configuration for flaky tests
	retry: {
		// Number of retries for different test types
		unit: 0, // Unit tests should be deterministic
		integration: 2, // Integration tests may have network issues
		e2e: 3, // E2E tests are most prone to flakiness
		performance: 1, // Performance tests may vary
	},

	// Parallel execution configuration
	parallel: {
		// Maximum number of concurrent test files
		maxConcurrency: 4,
		// Test types that should run in isolation
		isolated: ["e2e", "performance", "integration"],
	},

	// Test reporting configuration
	reporting: {
		// Formats for different environments
		formats: {
			ci: ["json", "junit"],
			local: ["verbose", "html"],
		},
		// Custom reporters
		custom: {
			performance: {
				outputFile: "test-results/performance-report.json",
				includeMemoryUsage: true,
				includeTiming: true,
			},
			coverage: {
				outputDir: "coverage",
				includeUncoveredFiles: true,
			},
		},
	},
};

export default testConfig;
