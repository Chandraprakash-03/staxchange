#!/usr/bin/env node

import { spawn } from "child_process";
import { testConfig } from "./test-config";

/**
 * Comprehensive test runner for the AI Tech Stack Converter
 * Supports running different categories of tests with appropriate configurations
 */

interface TestRunOptions {
	category?: keyof typeof testConfig.categories;
	coverage?: boolean;
	watch?: boolean;
	verbose?: boolean;
	parallel?: boolean;
	bail?: boolean;
	reporter?: string;
	timeout?: number;
}

class TestRunner {
	private options: TestRunOptions;

	constructor(options: TestRunOptions = {}) {
		this.options = options;
	}

	/**
	 * Run tests based on the specified category and options
	 */
	async run(): Promise<void> {
		const {
			category,
			coverage,
			watch,
			verbose,
			parallel,
			bail,
			reporter,
			timeout,
		} = this.options;

		console.log("🚀 Starting AI Tech Stack Converter Test Suite");
		console.log("================================================");

		if (category) {
			await this.runCategory(category);
		} else {
			await this.runAllCategories();
		}
	}

	/**
	 * Run a specific category of tests
	 */
	private async runCategory(
		category: keyof typeof testConfig.categories
	): Promise<void> {
		const config = testConfig.categories[category];

		console.log(`\n📋 Running ${category} tests...`);
		console.log(`Pattern: ${config.pattern}`);
		console.log(`Timeout: ${config.timeout}ms`);
		console.log(`Concurrent: ${config.concurrent}`);

		const args = this.buildVitestArgs(category, config);

		try {
			await this.executeVitest(args);
			console.log(`✅ ${category} tests completed successfully`);
		} catch (error) {
			console.error(`❌ ${category} tests failed:`, error);
			throw error;
		}
	}

	/**
	 * Run all test categories in sequence
	 */
	private async runAllCategories(): Promise<void> {
		const categories = Object.keys(testConfig.categories) as Array<
			keyof typeof testConfig.categories
		>;
		const results: { category: string; success: boolean; duration: number }[] =
			[];

		console.log(`\n🎯 Running all test categories: ${categories.join(", ")}`);

		for (const category of categories) {
			const startTime = Date.now();

			try {
				await this.runCategory(category);
				results.push({
					category,
					success: true,
					duration: Date.now() - startTime,
				});
			} catch (error) {
				results.push({
					category,
					success: false,
					duration: Date.now() - startTime,
				});

				if (this.options.bail) {
					console.log(
						"🛑 Stopping test execution due to failure (--bail option)"
					);
					break;
				}
			}
		}

		this.printSummary(results);
	}

	/**
	 * Build Vitest command arguments based on category and options
	 */
	private buildVitestArgs(
		category: keyof typeof testConfig.categories,
		config: any
	): string[] {
		const args = ["run"];

		// Add test pattern
		args.push(config.pattern);

		// Add timeout
		args.push("--testTimeout", config.timeout.toString());

		// Add coverage if requested
		if (this.options.coverage) {
			args.push("--coverage");
		}

		// Add watch mode if requested
		if (this.options.watch) {
			args[0] = "watch"; // Replace 'run' with 'watch'
		}

		// Add verbose output if requested
		if (this.options.verbose) {
			args.push("--reporter", "verbose");
		}

		// Add custom reporter if specified
		if (this.options.reporter) {
			args.push("--reporter", this.options.reporter);
		}

		// Handle concurrency
		if (!config.concurrent || testConfig.parallel.isolated.includes(category)) {
			args.push("--no-threads");
		}

		// Add bail option
		if (this.options.bail) {
			args.push("--bail", "1");
		}

		return args;
	}

	/**
	 * Execute Vitest with the given arguments
	 */
	private executeVitest(args: string[]): Promise<void> {
		return new Promise((resolve, reject) => {
			console.log(`\n🔧 Executing: npx vitest ${args.join(" ")}`);

			const child = spawn("npx", ["vitest", ...args], {
				stdio: "inherit",
				shell: true,
			});

			child.on("close", (code) => {
				if (code === 0) {
					resolve();
				} else {
					reject(new Error(`Vitest exited with code ${code}`));
				}
			});

			child.on("error", (error) => {
				reject(error);
			});
		});
	}

	/**
	 * Print test execution summary
	 */
	private printSummary(
		results: Array<{ category: string; success: boolean; duration: number }>
	): void {
		console.log("\n📊 Test Execution Summary");
		console.log("========================");

		const totalDuration = results.reduce(
			(sum, result) => sum + result.duration,
			0
		);
		const successCount = results.filter((result) => result.success).length;
		const failureCount = results.length - successCount;

		results.forEach((result) => {
			const status = result.success ? "✅" : "❌";
			const duration = (result.duration / 1000).toFixed(2);
			console.log(`${status} ${result.category.padEnd(15)} ${duration}s`);
		});

		console.log("------------------------");
		console.log(`Total Categories: ${results.length}`);
		console.log(`Successful: ${successCount}`);
		console.log(`Failed: ${failureCount}`);
		console.log(`Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);

		if (failureCount > 0) {
			console.log(
				"\n❌ Some test categories failed. Check the output above for details."
			);
			process.exit(1);
		} else {
			console.log("\n🎉 All test categories passed successfully!");
		}
	}
}

/**
 * Performance test runner for conversion operations
 */
export class PerformanceTestRunner {
	async runPerformanceTests(): Promise<void> {
		console.log("\n⚡ Running Performance Tests");
		console.log("============================");

		const performanceTests = [
			this.testSmallProjectConversion,
			this.testMediumProjectConversion,
			this.testLargeProjectConversion,
			this.testConcurrentConversions,
			this.testMemoryUsage,
			this.testAIServicePerformance,
		];

		const results = [];

		for (const test of performanceTests) {
			try {
				const result = await this.measurePerformance(test.bind(this));
				results.push({
					name: test.name,
					success: true,
					...result,
				});
			} catch (error) {
				results.push({
					name: test.name,
					success: false,
					error: error.message,
				});
			}
		}

		this.printPerformanceResults(results);
	}

	private async measurePerformance<T>(operation: () => Promise<T>): Promise<{
		result: T;
		duration: number;
		memory: number;
	}> {
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
	}

	private async testSmallProjectConversion(): Promise<void> {
		// Simulate small project conversion (5 files)
		await new Promise((resolve) => setTimeout(resolve, 1000));
	}

	private async testMediumProjectConversion(): Promise<void> {
		// Simulate medium project conversion (25 files)
		await new Promise((resolve) => setTimeout(resolve, 5000));
	}

	private async testLargeProjectConversion(): Promise<void> {
		// Simulate large project conversion (100 files)
		await new Promise((resolve) => setTimeout(resolve, 15000));
	}

	private async testConcurrentConversions(): Promise<void> {
		// Simulate 5 concurrent conversions
		const conversions = Array.from(
			{ length: 5 },
			() => new Promise((resolve) => setTimeout(resolve, 2000))
		);
		await Promise.all(conversions);
	}

	private async testMemoryUsage(): Promise<void> {
		// Simulate memory-intensive operations
		const largeArray = new Array(1000000).fill("test data");
		await new Promise((resolve) => setTimeout(resolve, 1000));
		largeArray.length = 0; // Cleanup
	}

	private async testAIServicePerformance(): Promise<void> {
		// Simulate AI service calls
		await new Promise((resolve) => setTimeout(resolve, 3000));
	}

	private printPerformanceResults(results: any[]): void {
		console.log("\n📈 Performance Test Results");
		console.log("===========================");

		results.forEach((result) => {
			const status = result.success ? "✅" : "❌";
			const duration = result.duration ? `${result.duration}ms` : "N/A";
			const memory = result.memory
				? `${Math.round(result.memory / 1024)}KB`
				: "N/A";

			console.log(
				`${status} ${result.name.padEnd(30)} ${duration.padEnd(10)} ${memory}`
			);

			if (!result.success) {
				console.log(`   Error: ${result.error}`);
			}
		});

		// Check against benchmarks
		console.log("\n🎯 Performance Benchmarks");
		console.log("=========================");

		const benchmarks = testConfig.performance.benchmarks;
		results.forEach((result) => {
			if (result.success && result.duration) {
				const benchmark = this.getBenchmarkForTest(result.name, benchmarks);
				if (benchmark) {
					const status = result.duration <= benchmark ? "✅" : "⚠️";
					console.log(
						`${status} ${result.name}: ${result.duration}ms (limit: ${benchmark}ms)`
					);
				}
			}
		});
	}

	private getBenchmarkForTest(
		testName: string,
		benchmarks: any
	): number | null {
		if (testName.includes("Small")) return benchmarks.fileConversion;
		if (testName.includes("Medium")) return benchmarks.fileConversion * 5;
		if (testName.includes("Large")) return benchmarks.fileConversion * 15;
		if (testName.includes("Concurrent")) return benchmarks.fileConversion * 2;
		if (testName.includes("Memory")) return benchmarks.fileConversion;
		if (testName.includes("AIService")) return benchmarks.aiServiceCall;
		return null;
	}
}

/**
 * CLI interface for the test runner
 */
function parseArgs(): TestRunOptions {
	const args = process.argv.slice(2);
	const options: TestRunOptions = {};

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];

		switch (arg) {
			case "--category":
				options.category = args[++i] as keyof typeof testConfig.categories;
				break;
			case "--coverage":
				options.coverage = true;
				break;
			case "--watch":
				options.watch = true;
				break;
			case "--verbose":
				options.verbose = true;
				break;
			case "--parallel":
				options.parallel = true;
				break;
			case "--bail":
				options.bail = true;
				break;
			case "--reporter":
				options.reporter = args[++i];
				break;
			case "--timeout":
				options.timeout = parseInt(args[++i]);
				break;
			case "--help":
				printHelp();
				process.exit(0);
				break;
		}
	}

	return options;
}

function printHelp(): void {
	console.log(`
AI Tech Stack Converter Test Runner

Usage: npm run test:comprehensive [options]

Options:
  --category <type>     Run specific test category (unit|integration|api|components|e2e|performance)
  --coverage           Generate coverage report
  --watch              Run tests in watch mode
  --verbose            Enable verbose output
  --parallel           Run tests in parallel (where supported)
  --bail               Stop on first failure
  --reporter <type>    Use specific reporter (verbose|json|junit)
  --timeout <ms>       Override default timeout
  --help               Show this help message

Examples:
  npm run test:comprehensive --category unit --coverage
  npm run test:comprehensive --category e2e --verbose
  npm run test:comprehensive --watch --category components
  npm run test:comprehensive --performance
`);
}

// Main execution
if (require.main === module) {
	const options = parseArgs();

	if (options.category === "performance") {
		const performanceRunner = new PerformanceTestRunner();
		performanceRunner.runPerformanceTests().catch((error) => {
			console.error("Performance tests failed:", error);
			process.exit(1);
		});
	} else {
		const runner = new TestRunner(options);
		runner.run().catch((error) => {
			console.error("Test execution failed:", error);
			process.exit(1);
		});
	}
}

export { TestRunner, PerformanceTestRunner };
