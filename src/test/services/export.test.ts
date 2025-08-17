import { describe, it, expect, beforeEach, afterEach, vi, Mock } from "vitest";
import { ExportService } from "@/services/export";
import { projectService } from "@/services/project";
import { Project, TechStack, ConversionJob } from "@/types";
import * as fs from "fs/promises";
import * as path from "path";

// Mock dependencies
vi.mock("@/services/project");
vi.mock("fs/promises");
vi.mock("uuid", () => ({
	v4: () => "test-export-id-123",
}));

describe("ExportService", () => {
	let exportService: ExportService;
	let mockProject: Project;
	let mockConversionJob: ConversionJob;

	beforeEach(() => {
		exportService = new ExportService();

		mockProject = {
			id: "project-123",
			name: "Test Project",
			githubUrl: "https://github.com/user/test-project",
			userId: "user-123",
			originalTechStack: {
				language: "javascript",
				framework: "react",
				database: "mysql",
				runtime: "node",
				buildTool: "webpack",
				packageManager: "npm",
				additional: {},
			},
			targetTechStack: {
				language: "typescript",
				framework: "next",
				database: "postgresql",
				runtime: "node",
				buildTool: "next",
				packageManager: "npm",
				additional: {},
			},
			status: "completed",
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		mockConversionJob = {
			id: "job-123",
			projectId: "project-123",
			plan: {
				id: "plan-123",
				projectId: "project-123",
				tasks: [],
				estimatedDuration: 3600,
				complexity: "medium",
				warnings: [],
				feasible: true,
				createdAt: new Date(),
				updatedAt: new Date(),
			},
			status: "completed",
			progress: 100,
			createdAt: new Date(),
		};

		// Mock fs operations
		(fs.mkdir as Mock).mockResolvedValue(undefined);
		(fs.writeFile as Mock).mockResolvedValue(undefined);
		(fs.rm as Mock).mockResolvedValue(undefined);
		(fs.stat as Mock).mockResolvedValue({ size: 1024 });
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe("exportProject", () => {
		it("should successfully export a completed project", async () => {
			// Arrange
			(projectService.getProject as Mock).mockResolvedValue(mockProject);

			// Act
			const result = await exportService.exportProject(
				"project-123",
				"job-123"
			);

			// Assert
			expect(result).toEqual({
				id: "test-export-id-123",
				projectId: "project-123",
				downloadUrl: "/api/exports/test-export-id-123/download",
				filename: "test-project-converted.zip",
				size: 1024,
				createdAt: expect.any(Date),
				expiresAt: expect.any(Date),
			});

			expect(projectService.getProject).toHaveBeenCalledWith("project-123");
			expect(fs.mkdir).toHaveBeenCalled();
			expect(fs.writeFile).toHaveBeenCalled();
		});

		it("should throw error if project not found", async () => {
			// Arrange
			(projectService.getProject as Mock).mockResolvedValue(null);

			// Act & Assert
			await expect(
				exportService.exportProject("nonexistent-project", "job-123")
			).rejects.toThrow("Project nonexistent-project not found");
		});

		it("should throw error if project is not completed", async () => {
			// Arrange
			const incompleteProject = { ...mockProject, status: "converting" };
			(projectService.getProject as Mock).mockResolvedValue(incompleteProject);

			// Act & Assert
			await expect(
				exportService.exportProject("project-123", "job-123")
			).rejects.toThrow("Project conversion must be completed before export");
		});

		it("should handle export options correctly", async () => {
			// Arrange
			(projectService.getProject as Mock).mockResolvedValue(mockProject);
			const options = {
				includeSourceFiles: true,
				includeTests: false,
				includeDocs: true,
				format: "tar" as const,
			};

			// Act
			const result = await exportService.exportProject(
				"project-123",
				"job-123",
				options
			);

			// Assert
			expect(result.filename).toBe("test-project-converted.tar");
		});
	});

	describe("generatePackageManifest", () => {
		it("should generate correct manifest for TypeScript/Next.js project", async () => {
			// This would test the private method through the public interface
			// We can test this indirectly through exportProject
			(projectService.getProject as Mock).mockResolvedValue(mockProject);

			await exportService.exportProject("project-123", "job-123");

			// Verify that writeFile was called with manifest content
			const writeFileCalls = (fs.writeFile as Mock).mock.calls;
			const manifestCall = writeFileCalls.find((call) =>
				call[0].includes("conversion-manifest.json")
			);

			expect(manifestCall).toBeDefined();
		});
	});

	describe("generateSetupInstructions", () => {
		it("should include tech stack specific instructions", async () => {
			(projectService.getProject as Mock).mockResolvedValue(mockProject);

			await exportService.exportProject("project-123", "job-123");

			// Verify setup instructions were written
			const writeFileCalls = (fs.writeFile as Mock).mock.calls;
			const setupCall = writeFileCalls.find((call) =>
				call[0].includes("SETUP.md")
			);

			expect(setupCall).toBeDefined();
			expect(setupCall![1]).toContain("Setup Instructions");
			expect(setupCall![1]).toContain("Prerequisites");
		});
	});

	describe("generateConfigurationFiles", () => {
		it("should generate package.json for Node.js projects", async () => {
			(projectService.getProject as Mock).mockResolvedValue(mockProject);

			await exportService.exportProject("project-123", "job-123");

			// Verify package.json was written
			const writeFileCalls = (fs.writeFile as Mock).mock.calls;
			const packageJsonCall = writeFileCalls.find((call) =>
				call[0].includes("package.json")
			);

			expect(packageJsonCall).toBeDefined();

			const packageJson = JSON.parse(packageJsonCall![1]);
			expect(packageJson.name).toBe("test-project");
			expect(packageJson.dependencies).toBeDefined();
			expect(packageJson.scripts).toBeDefined();
		});

		it("should generate requirements.txt for Python projects", async () => {
			const pythonProject = {
				...mockProject,
				targetTechStack: {
					language: "python",
					framework: "django",
					database: "postgresql",
					additional: {},
				},
			};
			(projectService.getProject as Mock).mockResolvedValue(pythonProject);

			await exportService.exportProject("project-123", "job-123");

			// Verify requirements.txt was written
			const writeFileCalls = (fs.writeFile as Mock).mock.calls;
			const requirementsCall = writeFileCalls.find((call) =>
				call[0].includes("requirements.txt")
			);

			expect(requirementsCall).toBeDefined();
		});
	});

	describe("generateReadme", () => {
		it("should generate comprehensive README with project details", async () => {
			(projectService.getProject as Mock).mockResolvedValue(mockProject);

			await exportService.exportProject("project-123", "job-123");

			// Verify README was written
			const writeFileCalls = (fs.writeFile as Mock).mock.calls;
			const readmeCall = writeFileCalls.find((call) =>
				call[0].includes("README.md")
			);

			expect(readmeCall).toBeDefined();
			expect(readmeCall![1]).toContain("Test Project");
			expect(readmeCall![1]).toContain("Conversion Details");
			expect(readmeCall![1]).toContain("Quick Start");
			expect(readmeCall![1]).toContain("Manual Review Required");
		});
	});

	describe("error handling", () => {
		it("should handle file system errors gracefully", async () => {
			(projectService.getProject as Mock).mockResolvedValue(mockProject);
			(fs.mkdir as Mock).mockRejectedValue(new Error("Permission denied"));

			await expect(
				exportService.exportProject("project-123", "job-123")
			).rejects.toThrow("Permission denied");
		});

		it("should clean up on export failure", async () => {
			(projectService.getProject as Mock).mockResolvedValue(mockProject);
			(fs.writeFile as Mock).mockRejectedValue(new Error("Disk full"));

			await expect(
				exportService.exportProject("project-123", "job-123")
			).rejects.toThrow("Disk full");

			// Verify cleanup was attempted
			expect(fs.rm).toHaveBeenCalled();
		});
	});

	describe("tech stack specific generation", () => {
		it("should generate correct dependencies for React projects", async () => {
			const reactProject = {
				...mockProject,
				targetTechStack: {
					language: "typescript",
					framework: "react",
					additional: {},
				},
			};
			(projectService.getProject as Mock).mockResolvedValue(reactProject);

			await exportService.exportProject("project-123", "job-123");

			// Verify React dependencies were included
			const writeFileCalls = (fs.writeFile as Mock).mock.calls;
			const packageJsonCall = writeFileCalls.find((call) =>
				call[0].includes("package.json")
			);

			const packageJson = JSON.parse(packageJsonCall![1]);
			expect(packageJson.dependencies.react).toBeDefined();
			expect(packageJson.dependencies["react-dom"]).toBeDefined();
		});

		it("should generate correct dependencies for Vue projects", async () => {
			const vueProject = {
				...mockProject,
				targetTechStack: {
					language: "typescript",
					framework: "vue",
					additional: {},
				},
			};
			(projectService.getProject as Mock).mockResolvedValue(vueProject);

			await exportService.exportProject("project-123", "job-123");

			const writeFileCalls = (fs.writeFile as Mock).mock.calls;
			const packageJsonCall = writeFileCalls.find((call) =>
				call[0].includes("package.json")
			);

			const packageJson = JSON.parse(packageJsonCall![1]);
			expect(packageJson.dependencies.vue).toBeDefined();
		});

		it("should generate database-specific dependencies", async () => {
			(projectService.getProject as Mock).mockResolvedValue(mockProject);

			await exportService.exportProject("project-123", "job-123");

			const writeFileCalls = (fs.writeFile as Mock).mock.calls;
			const packageJsonCall = writeFileCalls.find((call) =>
				call[0].includes("package.json")
			);

			const packageJson = JSON.parse(packageJsonCall![1]);
			expect(packageJson.dependencies.pg).toBeDefined(); // PostgreSQL dependency
		});
	});
});
