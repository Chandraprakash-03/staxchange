import { BaseService } from "./base";
import { Project, ConversionJob, TechStack, FileTree } from "@/types";
import { projectService } from "./project";
import * as fs from "fs/promises";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";

export interface ExportOptions {
	includeSourceFiles?: boolean;
	includeTests?: boolean;
	includeDocs?: boolean;
	format?: "zip" | "tar";
}

export interface ExportResult {
	id: string;
	projectId: string;
	downloadUrl: string;
	filename: string;
	size: number;
	createdAt: Date;
	expiresAt: Date;
}

export interface PackageManifest {
	name: string;
	version: string;
	description: string;
	techStack: TechStack;
	originalTechStack: TechStack;
	conversionDate: Date;
	setupInstructions: string[];
	migrationSteps: string[];
	dependencies: Record<string, string>;
	devDependencies?: Record<string, string>;
	scripts: Record<string, string>;
}

export class ExportService extends BaseService {
	private readonly exportDir = process.env.EXPORT_DIR || "./storage/exports";
	private readonly maxExportAge = 24 * 60 * 60 * 1000; // 24 hours

	constructor() {
		super();
		this.ensureExportDirectory();
	}

	/**
	 * Export a converted project as a downloadable package
	 */
	async exportProject(
		projectId: string,
		conversionJobId: string,
		options: ExportOptions = {}
	): Promise<ExportResult> {
		let exportPath: string | undefined;

		try {
			this.log(
				`Starting export for project ${projectId}, job ${conversionJobId}`
			);

			// Get project and conversion job data
			const project = await projectService.getProject(projectId);
			if (!project) {
				throw new Error(`Project ${projectId} not found`);
			}

			// Check if project conversion is completed
			if (project.status !== "completed") {
				throw new Error("Project conversion must be completed before export");
			}

			// Create export package
			const exportId = uuidv4();
			exportPath = path.join(this.exportDir, exportId);
			await fs.mkdir(exportPath, { recursive: true });

			// Generate package manifest
			const manifest = await this.generatePackageManifest(
				project,
				conversionJobId
			);

			// Package converted files
			await this.packageConvertedFiles(
				project,
				conversionJobId,
				exportPath,
				options
			);

			// Generate setup instructions
			await this.generateSetupInstructions(project, exportPath, manifest);

			// Generate migration scripts
			await this.generateMigrationScripts(project, exportPath, manifest);

			// Generate configuration files
			await this.generateConfigurationFiles(project, exportPath, manifest);

			// Create README
			await this.generateReadme(project, exportPath, manifest);

			// Create package manifest file
			await this.writePackageManifest(exportPath, manifest);

			// Create archive
			const archivePath = await this.createArchive(
				exportPath,
				exportId,
				options.format || "zip"
			);
			const stats = await fs.stat(archivePath);

			// Clean up temporary directory
			await fs.rm(exportPath, { recursive: true, force: true });

			const result: ExportResult = {
				id: exportId,
				projectId,
				downloadUrl: `/api/exports/${exportId}/download`,
				filename: `${project.name
					.toLowerCase()
					.replace(/[^a-z0-9-]/g, "-")}-converted.${options.format || "zip"}`,
				size: stats.size,
				createdAt: new Date(),
				expiresAt: new Date(Date.now() + this.maxExportAge),
			};

			this.log(`Export completed successfully: ${exportId}`);
			return result;
		} catch (error) {
			// Clean up on error
			if (exportPath) {
				try {
					await fs.rm(exportPath, { recursive: true, force: true });
				} catch {
					// Ignore cleanup errors
				}
			}

			this.error("Failed to export project:", error as Error);
			throw error;
		}
	}

	/**
	 * Generate package manifest with project metadata
	 */
	private async generatePackageManifest(
		project: Project,
		conversionJobId: string
	): Promise<PackageManifest> {
		const manifest: PackageManifest = {
			name: project.name.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
			version: "1.0.0",
			description: `Converted from ${project.originalTechStack.language} to ${
				project.targetTechStack?.language || "target stack"
			}`,
			techStack: project.targetTechStack!,
			originalTechStack: project.originalTechStack,
			conversionDate: new Date(),
			setupInstructions: [],
			migrationSteps: [],
			dependencies: {},
			scripts: {},
		};

		// Generate tech stack specific setup instructions
		manifest.setupInstructions = this.generateSetupInstructionsForTechStack(
			project.targetTechStack!
		);

		// Generate migration steps
		manifest.migrationSteps = this.generateMigrationStepsForTechStack(
			project.originalTechStack,
			project.targetTechStack!
		);

		// Generate dependencies based on target tech stack
		manifest.dependencies = this.generateDependenciesForTechStack(
			project.targetTechStack!
		);
		manifest.devDependencies = this.generateDevDependenciesForTechStack(
			project.targetTechStack!
		);

		// Generate scripts
		manifest.scripts = this.generateScriptsForTechStack(
			project.targetTechStack!
		);

		return manifest;
	}

	/**
	 * Package converted files into export directory
	 */
	private async packageConvertedFiles(
		project: Project,
		conversionJobId: string,
		exportPath: string,
		options: ExportOptions
	): Promise<void> {
		// Create src directory
		const srcPath = path.join(exportPath, "src");
		await fs.mkdir(srcPath, { recursive: true });

		// Copy converted files (this would integrate with the conversion service)
		// For now, we'll create a placeholder structure
		const projectStructure = this.generateProjectStructure(
			project.targetTechStack!
		);

		for (const file of projectStructure) {
			const filePath = path.join(exportPath, file.path);
			await fs.mkdir(path.dirname(filePath), { recursive: true });
			await fs.writeFile(filePath, file.content);
		}

		if (options.includeTests) {
			await this.generateTestFiles(project, exportPath);
		}

		if (options.includeDocs) {
			await this.generateDocumentationFiles(project, exportPath);
		}
	}

	/**
	 * Generate setup instructions file
	 */
	private async generateSetupInstructions(
		project: Project,
		exportPath: string,
		manifest: PackageManifest
	): Promise<void> {
		const instructions = [
			"# Setup Instructions",
			"",
			`This project has been converted from ${project.originalTechStack.language} to ${project.targetTechStack?.language}.`,
			"",
			"## Prerequisites",
			...this.getPrerequisitesForTechStack(project.targetTechStack!),
			"",
			"## Installation",
			...manifest.setupInstructions,
			"",
			"## Migration Steps",
			...manifest.migrationSteps.map((step, index) => `${index + 1}. ${step}`),
			"",
			"## Next Steps",
			"- Review the converted code for any manual adjustments needed",
			"- Run tests to ensure functionality is preserved",
			"- Update configuration files as needed for your environment",
			"- Deploy using your preferred deployment method",
		].join("\n");

		await fs.writeFile(path.join(exportPath, "SETUP.md"), instructions);
	}

	/**
	 * Generate migration scripts
	 */
	private async generateMigrationScripts(
		project: Project,
		exportPath: string,
		manifest: PackageManifest
	): Promise<void> {
		const scriptsDir = path.join(exportPath, "scripts");
		await fs.mkdir(scriptsDir, { recursive: true });

		// Generate database migration script if needed
		if (
			this.requiresDatabaseMigration(
				project.originalTechStack,
				project.targetTechStack!
			)
		) {
			await this.generateDatabaseMigrationScript(project, scriptsDir);
		}

		// Generate dependency migration script
		await this.generateDependencyMigrationScript(project, scriptsDir, manifest);

		// Generate environment setup script
		await this.generateEnvironmentSetupScript(project, scriptsDir, manifest);
	}

	/**
	 * Generate configuration files
	 */
	private async generateConfigurationFiles(
		project: Project,
		exportPath: string,
		manifest: PackageManifest
	): Promise<void> {
		const targetStack = project.targetTechStack!;

		// Generate package.json for Node.js projects
		if (
			targetStack.runtime === "node" ||
			targetStack.language === "javascript" ||
			targetStack.language === "typescript"
		) {
			const packageJson = {
				name: manifest.name,
				version: manifest.version,
				description: manifest.description,
				main: this.getMainEntryPoint(targetStack),
				scripts: manifest.scripts,
				dependencies: manifest.dependencies,
				devDependencies: manifest.devDependencies,
				engines: this.getEngineRequirements(targetStack),
			};

			await fs.writeFile(
				path.join(exportPath, "package.json"),
				JSON.stringify(packageJson, null, 2)
			);
		}

		// Generate requirements.txt for Python projects
		if (targetStack.language === "python") {
			const requirements = Object.entries(manifest.dependencies)
				.map(([name, version]) => `${name}${version}`)
				.join("\n");

			await fs.writeFile(
				path.join(exportPath, "requirements.txt"),
				requirements
			);
		}

		// Generate framework-specific config files
		await this.generateFrameworkConfigFiles(targetStack, exportPath);

		// Generate environment configuration
		await this.generateEnvironmentConfig(project, exportPath);
	}

	/**
	 * Generate comprehensive README
	 */
	private async generateReadme(
		project: Project,
		exportPath: string,
		manifest: PackageManifest
	): Promise<void> {
		const readme = [
			`# ${project.name}`,
			"",
			manifest.description,
			"",
			"## Conversion Details",
			`- **Original Stack:** ${this.formatTechStack(
				project.originalTechStack
			)}`,
			`- **Target Stack:** ${this.formatTechStack(project.targetTechStack!)}`,
			`- **Conversion Date:** ${
				manifest.conversionDate.toISOString().split("T")[0]
			}`,
			"",
			"## Quick Start",
			"",
			"1. Follow the setup instructions in `SETUP.md`",
			"2. Install dependencies",
			"3. Run the application",
			"",
			"## Project Structure",
			"",
			this.generateProjectStructureDocumentation(project.targetTechStack!),
			"",
			"## Available Scripts",
			"",
			...Object.entries(manifest.scripts).map(
				([name, command]) => `- \`${name}\`: ${command}`
			),
			"",
			"## Migration Notes",
			"",
			"⚠️ **Important:** This is an AI-generated conversion. Please review all code carefully before deploying to production.",
			"",
			"### Manual Review Required",
			"- Database connections and configurations",
			"- Environment variables and secrets",
			"- Third-party service integrations",
			"- Custom business logic",
			"- Security configurations",
			"",
			"### Testing",
			"Run the test suite to ensure functionality is preserved:",
			"```bash",
			this.getTestCommand(project.targetTechStack!),
			"```",
			"",
			"## Support",
			"If you encounter issues with the converted code, please review the conversion logs and consider manual adjustments.",
			"",
			"---",
			"*This project was converted using the AI Tech Stack Conversion Platform*",
		].join("\n");

		await fs.writeFile(path.join(exportPath, "README.md"), readme);
	}

	/**
	 * Write package manifest to file
	 */
	private async writePackageManifest(
		exportPath: string,
		manifest: PackageManifest
	): Promise<void> {
		await fs.writeFile(
			path.join(exportPath, "conversion-manifest.json"),
			JSON.stringify(manifest, null, 2)
		);
	}

	/**
	 * Create archive from export directory
	 */
	private async createArchive(
		exportPath: string,
		exportId: string,
		format: "zip" | "tar"
	): Promise<string> {
		// This is a simplified implementation - in production, you'd use proper archiving libraries
		const archivePath = path.join(this.exportDir, `${exportId}.${format}`);

		// For now, we'll just create a placeholder file
		// In a real implementation, you'd use libraries like 'archiver' for zip or 'tar' for tar files
		await fs.writeFile(
			archivePath,
			"Archive placeholder - implement with proper archiving library"
		);

		return archivePath;
	}

	/**
	 * Ensure export directory exists
	 */
	private async ensureExportDirectory(): Promise<void> {
		try {
			await fs.mkdir(this.exportDir, { recursive: true });
		} catch (error) {
			this.error("Failed to create export directory:", error as Error);
		}
	}

	// Helper methods for tech stack specific generation
	private generateSetupInstructionsForTechStack(
		techStack: TechStack
	): string[] {
		const instructions: string[] = [];

		if (techStack.packageManager) {
			instructions.push(
				`Install dependencies: \`${techStack.packageManager} install\``
			);
		}

		if (techStack.buildTool) {
			instructions.push(`Build the project: \`${techStack.buildTool} build\``);
		}

		instructions.push("Configure environment variables (see .env.example)");

		if (techStack.database) {
			instructions.push(`Set up ${techStack.database} database`);
			instructions.push("Run database migrations");
		}

		return instructions;
	}

	private generateMigrationStepsForTechStack(
		original: TechStack,
		target: TechStack
	): string[] {
		const steps: string[] = [];

		if (original.database !== target.database) {
			steps.push(
				`Migrate database from ${original.database} to ${target.database}`
			);
		}

		if (original.packageManager !== target.packageManager) {
			steps.push(
				`Update package manager from ${original.packageManager} to ${target.packageManager}`
			);
		}

		steps.push("Update CI/CD pipelines for new tech stack");
		steps.push("Update deployment configurations");

		return steps;
	}

	private generateDependenciesForTechStack(
		techStack: TechStack
	): Record<string, string> {
		const deps: Record<string, string> = {};

		// Add framework-specific dependencies
		if (techStack.framework === "react") {
			deps["react"] = "^18.0.0";
			deps["react-dom"] = "^18.0.0";
		} else if (techStack.framework === "vue") {
			deps["vue"] = "^3.0.0";
		} else if (techStack.framework === "angular") {
			deps["@angular/core"] = "^16.0.0";
		}

		// Add database dependencies
		if (techStack.database === "postgresql") {
			deps["pg"] = "^8.0.0";
		} else if (techStack.database === "mysql") {
			deps["mysql2"] = "^3.0.0";
		}

		return deps;
	}

	private generateDevDependenciesForTechStack(
		techStack: TechStack
	): Record<string, string> {
		const devDeps: Record<string, string> = {};

		if (techStack.language === "typescript") {
			devDeps["typescript"] = "^5.0.0";
			devDeps["@types/node"] = "^20.0.0";
		}

		return devDeps;
	}

	private generateScriptsForTechStack(
		techStack: TechStack
	): Record<string, string> {
		const scripts: Record<string, string> = {};

		if (techStack.framework === "next") {
			scripts["dev"] = "next dev";
			scripts["build"] = "next build";
			scripts["start"] = "next start";
		} else if (techStack.buildTool === "vite") {
			scripts["dev"] = "vite";
			scripts["build"] = "vite build";
			scripts["preview"] = "vite preview";
		}

		scripts["test"] = this.getTestCommand(techStack);

		return scripts;
	}

	// Additional helper methods would be implemented here...
	private generateProjectStructure(
		techStack: TechStack
	): Array<{ path: string; content: string }> {
		// Placeholder implementation
		return [
			{ path: "src/index.ts", content: "// Main application entry point\n" },
			{ path: ".env.example", content: "# Environment variables\n" },
		];
	}

	private async generateTestFiles(
		project: Project,
		exportPath: string
	): Promise<void> {
		// Placeholder implementation
	}

	private async generateDocumentationFiles(
		project: Project,
		exportPath: string
	): Promise<void> {
		// Placeholder implementation
	}

	private getPrerequisitesForTechStack(techStack: TechStack): string[] {
		const prerequisites: string[] = [];

		if (techStack.runtime === "node") {
			prerequisites.push("- Node.js 18+ installed");
		}

		if (techStack.language === "python") {
			prerequisites.push("- Python 3.8+ installed");
		}

		return prerequisites;
	}

	private requiresDatabaseMigration(
		original: TechStack,
		target: TechStack
	): boolean {
		return original.database !== target.database && !!target.database;
	}

	private async generateDatabaseMigrationScript(
		project: Project,
		scriptsDir: string
	): Promise<void> {
		// Placeholder implementation
	}

	private async generateDependencyMigrationScript(
		project: Project,
		scriptsDir: string,
		manifest: PackageManifest
	): Promise<void> {
		// Placeholder implementation
	}

	private async generateEnvironmentSetupScript(
		project: Project,
		scriptsDir: string,
		manifest: PackageManifest
	): Promise<void> {
		// Placeholder implementation
	}

	private getMainEntryPoint(techStack: TechStack): string {
		if (techStack.framework === "next") return "next.config.js";
		return "src/index.js";
	}

	private getEngineRequirements(techStack: TechStack): Record<string, string> {
		if (techStack.runtime === "node") {
			return { node: ">=18.0.0" };
		}
		return {};
	}

	private async generateFrameworkConfigFiles(
		techStack: TechStack,
		exportPath: string
	): Promise<void> {
		// Placeholder implementation
	}

	private async generateEnvironmentConfig(
		project: Project,
		exportPath: string
	): Promise<void> {
		// Placeholder implementation
	}

	private formatTechStack(techStack: TechStack): string {
		const parts = [techStack.language];
		if (techStack.framework) parts.push(techStack.framework);
		if (techStack.database) parts.push(techStack.database);
		return parts.join(" + ");
	}

	private generateProjectStructureDocumentation(techStack: TechStack): string {
		return [
			"```",
			"project/",
			"├── src/           # Source code",
			"├── scripts/       # Migration and setup scripts",
			"├── README.md      # This file",
			"├── SETUP.md       # Detailed setup instructions",
			"└── package.json   # Dependencies and scripts",
			"```",
		].join("\n");
	}

	private getTestCommand(techStack: TechStack): string {
		if (
			techStack.language === "javascript" ||
			techStack.language === "typescript"
		) {
			return "npm test";
		}
		if (techStack.language === "python") {
			return "pytest";
		}
		return "npm test";
	}
}

// Export singleton instance
export const exportService = new ExportService();
