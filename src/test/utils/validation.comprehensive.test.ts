import { describe, it, expect } from "vitest";
import {
	validateGitHubUrl,
	validateTechStack,
	validateConversionPlan,
	validateProjectStructure,
	sanitizeInput,
	validateFileContent,
} from "@/utils/validation";
import { TechStack, ConversionPlan, FileTree } from "@/types";

describe("Validation Utilities - Comprehensive Tests", () => {
	describe("validateGitHubUrl", () => {
		it("should validate correct GitHub URLs", () => {
			const validUrls = [
				"https://github.com/user/repo",
				"https://github.com/user/repo.git",
				"https://github.com/user/repo/",
				"https://github.com/user-name/repo-name",
				"https://github.com/user123/repo_name",
				"https://github.com/organization/project-with-dashes",
			];

			validUrls.forEach((url) => {
				const result = validateGitHubUrl(url);
				expect(result.isValid).toBe(true);
				expect(result.errors).toHaveLength(0);
			});
		});

		it("should reject invalid GitHub URLs", () => {
			const invalidUrls = [
				"https://gitlab.com/user/repo",
				"https://github.com/user",
				"https://github.com/",
				"not-a-url",
				"ftp://github.com/user/repo",
				"https://github.com/user/repo/issues",
				"https://github.com/user/repo/tree/main",
			];

			invalidUrls.forEach((url) => {
				const result = validateGitHubUrl(url);
				expect(result.isValid).toBe(false);
				expect(result.errors.length).toBeGreaterThan(0);
			});
		});

		it("should handle edge cases", () => {
			expect(validateGitHubUrl("").isValid).toBe(false);
			expect(validateGitHubUrl(null as any).isValid).toBe(false);
			expect(validateGitHubUrl(undefined as any).isValid).toBe(false);
		});

		it("should provide specific error messages", () => {
			const result = validateGitHubUrl("https://gitlab.com/user/repo");
			expect(result.errors[0]).toContain("must be a GitHub URL");

			const result2 = validateGitHubUrl("https://github.com/user");
			expect(result2.errors[0]).toContain("repository name");
		});
	});

	describe("validateTechStack", () => {
		it("should validate complete tech stack", () => {
			const validTechStack: TechStack = {
				language: "TypeScript",
				framework: "React",
				database: "PostgreSQL",
				runtime: "Node.js",
				buildTool: "Webpack",
				packageManager: "npm",
				deployment: "Docker",
				additional: {},
			};

			const result = validateTechStack(validTechStack);
			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it("should validate minimal tech stack", () => {
			const minimalTechStack: TechStack = {
				language: "JavaScript",
				additional: {},
			};

			const result = validateTechStack(minimalTechStack);
			expect(result.isValid).toBe(true);
		});

		it("should reject invalid languages", () => {
			const invalidTechStack: TechStack = {
				language: "InvalidLanguage",
				additional: {},
			};

			const result = validateTechStack(invalidTechStack);
			expect(result.isValid).toBe(false);
			expect(result.errors[0]).toContain("Unsupported language");
		});

		it("should validate framework compatibility", () => {
			const incompatibleTechStack: TechStack = {
				language: "Python",
				framework: "React", // React is not compatible with Python
				additional: {},
			};

			const result = validateTechStack(incompatibleTechStack);
			expect(result.isValid).toBe(false);
			expect(result.errors[0]).toContain("not compatible");
		});

		it("should validate database compatibility", () => {
			const validCombinations = [
				{ language: "JavaScript", database: "MongoDB" },
				{ language: "Python", database: "PostgreSQL" },
				{ language: "Java", database: "MySQL" },
			];

			validCombinations.forEach((combo) => {
				const techStack: TechStack = {
					language: combo.language,
					database: combo.database,
					additional: {},
				};

				const result = validateTechStack(techStack);
				expect(result.isValid).toBe(true);
			});
		});

		it("should handle additional properties validation", () => {
			const techStackWithAdditional: TechStack = {
				language: "TypeScript",
				framework: "Next.js",
				additional: {
					styling: "Tailwind CSS",
					testing: "Jest",
					linting: "ESLint",
				},
			};

			const result = validateTechStack(techStackWithAdditional);
			expect(result.isValid).toBe(true);
		});
	});

	describe("validateConversionPlan", () => {
		const validConversionPlan: ConversionPlan = {
			id: "plan-123",
			projectId: "project-123",
			tasks: [
				{
					id: "task-1",
					type: "analysis",
					description: "Analyze source code",
					inputFiles: ["src/App.js"],
					outputFiles: ["src/App.vue"],
					dependencies: [],
					agentType: "analysis",
					priority: 1,
					status: "pending",
					estimatedDuration: 300,
				},
			],
			estimatedDuration: 300,
			complexity: "low",
			warnings: [],
		};

		it("should validate correct conversion plan", () => {
			const result = validateConversionPlan(validConversionPlan);
			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it("should reject plan without tasks", () => {
			const planWithoutTasks = {
				...validConversionPlan,
				tasks: [],
			};

			const result = validateConversionPlan(planWithoutTasks);
			expect(result.isValid).toBe(false);
			expect(result.errors[0]).toContain("at least one task");
		});

		it("should validate task dependencies", () => {
			const planWithInvalidDependencies: ConversionPlan = {
				...validConversionPlan,
				tasks: [
					{
						...validConversionPlan.tasks[0],
						dependencies: ["non-existent-task"],
					},
				],
			};

			const result = validateConversionPlan(planWithInvalidDependencies);
			expect(result.isValid).toBe(false);
			expect(result.errors[0]).toContain("dependency not found");
		});

		it("should detect circular dependencies", () => {
			const planWithCircularDeps: ConversionPlan = {
				...validConversionPlan,
				tasks: [
					{
						id: "task-1",
						type: "analysis",
						description: "Task 1",
						inputFiles: ["file1.js"],
						outputFiles: ["file1.vue"],
						dependencies: ["task-2"],
						agentType: "analysis",
						priority: 1,
						status: "pending",
						estimatedDuration: 300,
					},
					{
						id: "task-2",
						type: "conversion",
						description: "Task 2",
						inputFiles: ["file2.js"],
						outputFiles: ["file2.vue"],
						dependencies: ["task-1"],
						agentType: "code-generation",
						priority: 2,
						status: "pending",
						estimatedDuration: 300,
					},
				],
			};

			const result = validateConversionPlan(planWithCircularDeps);
			expect(result.isValid).toBe(false);
			expect(result.errors[0]).toContain("circular dependency");
		});

		it("should validate task priorities", () => {
			const planWithInvalidPriorities: ConversionPlan = {
				...validConversionPlan,
				tasks: [
					{
						...validConversionPlan.tasks[0],
						priority: -1,
					},
				],
			};

			const result = validateConversionPlan(planWithInvalidPriorities);
			expect(result.isValid).toBe(false);
			expect(result.errors[0]).toContain("priority must be positive");
		});

		it("should validate estimated durations", () => {
			const planWithInvalidDuration: ConversionPlan = {
				...validConversionPlan,
				estimatedDuration: -100,
			};

			const result = validateConversionPlan(planWithInvalidDuration);
			expect(result.isValid).toBe(false);
			expect(result.errors[0]).toContain("duration must be positive");
		});
	});

	describe("validateProjectStructure", () => {
		const validProjectStructure: FileTree = {
			name: "project-root",
			type: "directory",
			path: "/",
			children: [
				{
					name: "src",
					type: "directory",
					path: "/src",
					children: [
						{
							name: "App.js",
							type: "file",
							path: "/src/App.js",
							content: 'console.log("Hello World");',
							metadata: {
								size: 100,
								lastModified: new Date(),
							},
						},
					],
					metadata: {
						size: 0,
						lastModified: new Date(),
					},
				},
			],
			metadata: {
				size: 0,
				lastModified: new Date(),
			},
		};

		it("should validate correct project structure", () => {
			const result = validateProjectStructure(validProjectStructure);
			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it("should reject structure without root directory", () => {
			const invalidStructure = {
				...validProjectStructure,
				type: "file" as const,
			};

			const result = validateProjectStructure(invalidStructure);
			expect(result.isValid).toBe(false);
			expect(result.errors[0]).toContain("root must be a directory");
		});

		it("should validate file paths", () => {
			const structureWithInvalidPaths: FileTree = {
				...validProjectStructure,
				children: [
					{
						name: "invalid-file",
						type: "file",
						path: "/invalid/path/that/does/not/match",
						metadata: {
							size: 0,
							lastModified: new Date(),
						},
					},
				],
			};

			const result = validateProjectStructure(structureWithInvalidPaths);
			expect(result.isValid).toBe(false);
			expect(result.errors[0]).toContain("path does not match");
		});

		it("should validate file sizes", () => {
			const structureWithLargeFile: FileTree = {
				...validProjectStructure,
				children: [
					{
						name: "large-file.js",
						type: "file",
						path: "/large-file.js",
						content: "x".repeat(10 * 1024 * 1024), // 10MB file
						metadata: {
							size: 10 * 1024 * 1024,
							lastModified: new Date(),
						},
					},
				],
			};

			const result = validateProjectStructure(structureWithLargeFile);
			expect(result.warnings).toContain("Large file detected");
		});

		it("should detect suspicious file types", () => {
			const structureWithSuspiciousFiles: FileTree = {
				...validProjectStructure,
				children: [
					{
						name: "malicious.exe",
						type: "file",
						path: "/malicious.exe",
						metadata: {
							size: 1000,
							lastModified: new Date(),
						},
					},
				],
			};

			const result = validateProjectStructure(structureWithSuspiciousFiles);
			expect(result.warnings).toContain("Suspicious file type detected");
		});
	});

	describe("sanitizeInput", () => {
		it("should sanitize HTML input", () => {
			const maliciousInput = '<script>alert("xss")</script>Hello World';
			const sanitized = sanitizeInput(maliciousInput);
			expect(sanitized).not.toContain("<script>");
			expect(sanitized).toContain("Hello World");
		});

		it("should sanitize SQL injection attempts", () => {
			const sqlInjection = "'; DROP TABLE users; --";
			const sanitized = sanitizeInput(sqlInjection);
			expect(sanitized).not.toContain("DROP TABLE");
		});

		it("should preserve safe content", () => {
			const safeInput =
				"This is a normal string with numbers 123 and symbols !@#";
			const sanitized = sanitizeInput(safeInput);
			expect(sanitized).toBe(safeInput);
		});

		it("should handle special characters in file paths", () => {
			const filePath = "../../../etc/passwd";
			const sanitized = sanitizeInput(filePath, { type: "filepath" });
			expect(sanitized).not.toContain("../");
		});

		it("should sanitize GitHub URLs", () => {
			const maliciousUrl =
				"https://github.com/user/repo?redirect=http://evil.com";
			const sanitized = sanitizeInput(maliciousUrl, { type: "url" });
			expect(sanitized).toBe("https://github.com/user/repo");
		});
	});

	describe("validateFileContent", () => {
		it("should validate JavaScript file content", () => {
			const validJS = `
        function hello() {
          console.log("Hello World");
        }
        export default hello;
      `;

			const result = validateFileContent(validJS, "javascript");
			expect(result.isValid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it("should detect syntax errors in JavaScript", () => {
			const invalidJS = `
        function hello() {
          console.log("Hello World"
        // Missing closing brace and parenthesis
      `;

			const result = validateFileContent(invalidJS, "javascript");
			expect(result.isValid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
		});

		it("should validate JSON content", () => {
			const validJSON = JSON.stringify({
				name: "test-project",
				version: "1.0.0",
				dependencies: {
					react: "^18.0.0",
				},
			});

			const result = validateFileContent(validJSON, "json");
			expect(result.isValid).toBe(true);
		});

		it("should detect malformed JSON", () => {
			const invalidJSON = '{ "name": "test", "version": }';

			const result = validateFileContent(invalidJSON, "json");
			expect(result.isValid).toBe(false);
			expect(result.errors[0]).toContain("Invalid JSON");
		});

		it("should validate TypeScript content", () => {
			const validTS = `
        interface User {
          id: string;
          name: string;
        }

        function getUser(id: string): User {
          return { id, name: 'Test User' };
        }
      `;

			const result = validateFileContent(validTS, "typescript");
			expect(result.isValid).toBe(true);
		});

		it("should detect TypeScript type errors", () => {
			const invalidTS = `
        interface User {
          id: string;
          name: string;
        }

        function getUser(id: number): User {
          return { id: id.toString(), age: 25 }; // age is not in User interface
        }
      `;

			const result = validateFileContent(invalidTS, "typescript");
			expect(result.warnings.length).toBeGreaterThan(0);
		});

		it("should validate CSS content", () => {
			const validCSS = `
        .container {
          display: flex;
          justify-content: center;
          align-items: center;
        }

        @media (max-width: 768px) {
          .container {
            flex-direction: column;
          }
        }
      `;

			const result = validateFileContent(validCSS, "css");
			expect(result.isValid).toBe(true);
		});

		it("should detect CSS syntax errors", () => {
			const invalidCSS = `
        .container {
          display: flex
          justify-content: center; // Missing semicolon above
        }
      `;

			const result = validateFileContent(invalidCSS, "css");
			expect(result.isValid).toBe(false);
		});

		it("should handle binary file content", () => {
			const binaryContent = Buffer.from([0x89, 0x50, 0x4e, 0x47]).toString();

			const result = validateFileContent(binaryContent, "binary");
			expect(result.isValid).toBe(true);
			expect(result.warnings).toContain("Binary file detected");
		});

		it("should detect potentially malicious content", () => {
			const maliciousContent = `
        const fs = require('fs');
        fs.unlinkSync('/etc/passwd');
        eval(process.env.MALICIOUS_CODE);
      `;

			const result = validateFileContent(maliciousContent, "javascript");
			expect(result.warnings).toContain("Potentially dangerous code detected");
		});
	});

	describe("Edge Cases and Error Handling", () => {
		it("should handle null and undefined inputs gracefully", () => {
			expect(validateGitHubUrl(null as any).isValid).toBe(false);
			expect(validateTechStack(null as any).isValid).toBe(false);
			expect(validateConversionPlan(null as any).isValid).toBe(false);
			expect(validateProjectStructure(null as any).isValid).toBe(false);
			expect(sanitizeInput(null as any)).toBe("");
			expect(validateFileContent(null as any, "javascript").isValid).toBe(
				false
			);
		});

		it("should handle extremely large inputs", () => {
			const largeString = "x".repeat(1000000); // 1MB string
			const sanitized = sanitizeInput(largeString);
			expect(sanitized.length).toBeLessThanOrEqual(100000); // Should be truncated
		});

		it("should handle unicode and special characters", () => {
			const unicodeInput = "🚀 Hello 世界 🌍";
			const sanitized = sanitizeInput(unicodeInput);
			expect(sanitized).toContain("🚀");
			expect(sanitized).toContain("世界");
		});

		it("should validate deeply nested project structures", () => {
			let deepStructure: FileTree = {
				name: "root",
				type: "directory",
				path: "/",
				children: [],
				metadata: { size: 0, lastModified: new Date() },
			};

			// Create a deeply nested structure (100 levels)
			let current = deepStructure;
			for (let i = 0; i < 100; i++) {
				const child: FileTree = {
					name: `level-${i}`,
					type: "directory",
					path: `/${"level-".repeat(i + 1)}${i}`,
					children: [],
					metadata: { size: 0, lastModified: new Date() },
				};
				current.children = [child];
				current = child;
			}

			const result = validateProjectStructure(deepStructure);
			expect(result.warnings).toContain("Deeply nested structure detected");
		});
	});
});
