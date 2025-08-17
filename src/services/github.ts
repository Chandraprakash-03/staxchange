import { BaseService } from "./base";
import {
	ImportResult,
	ValidationResult,
	FileTree,
	TechStack,
	FileMetadata,
} from "@/types";
import axios, { AxiosInstance } from "axios";
import * as fs from "fs/promises";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";

interface GitHubRepository {
	id: number;
	name: string;
	full_name: string;
	private: boolean;
	html_url: string;
	clone_url: string;
	size: number;
	default_branch: string;
	language: string;
	languages_url: string;
}

interface GitHubContent {
	name: string;
	path: string;
	type: "file" | "dir";
	size?: number;
	download_url?: string;
	content?: string;
	encoding?: string;
}

export class GitHubImportService extends BaseService {
	private apiClient: AxiosInstance;
	private readonly baseStoragePath: string;

	constructor() {
		super();
		this.apiClient = axios.create({
			baseURL: "https://api.github.com",
			headers: {
				Accept: "application/vnd.github.v3+json",
				"User-Agent": "AI-Tech-Stack-Converter/1.0",
			},
		});
		this.baseStoragePath = path.join(
			process.cwd() || ".",
			"storage",
			"projects"
		);
	}

	/**
	 * Import a GitHub repository and analyze its structure
	 */
	async importRepository(
		url: string,
		accessToken?: string
	): Promise<ImportResult> {
		const context = this.createErrorContext("importRepository", {
			url,
			hasAccessToken: !!accessToken,
		});

		return await this.executeWithErrorHandling(async () => {
			this.log("Starting repository import:", url);

			// Validate required parameters
			this.validateRequired({ url }, ["url"]);

			// Validate repository URL
			const validation = await this.validateRepository(url);
			if (!validation.isValid) {
				return {
					projectId: "",
					structure: {} as FileTree,
					detectedTechnologies: {} as TechStack,
					size: 0,
					status: "error",
					error: validation.errors[0]?.message || "Invalid repository URL",
				};
			}

			// Set authentication if provided
			if (accessToken) {
				this.apiClient.defaults.headers.common[
					"Authorization"
				] = `token ${accessToken}`;
			}

			// Extract owner and repo from URL
			const { owner, repo } = this.parseGitHubUrl(url);

			// Get repository information with error handling
			const repoInfo = await this.executeWithErrorHandling(
				() => this.getRepositoryInfo(owner, repo),
				this.createErrorContext("getRepositoryInfo", { owner, repo })
			);

			// Generate project ID
			const projectId = uuidv4();

			// Create project storage directory
			const projectPath = path.join(this.baseStoragePath, projectId);
			await fs.mkdir(projectPath, { recursive: true });

			// Clone repository contents with error handling
			const structure = await this.executeWithErrorHandling(
				() => this.cloneRepositoryContents(owner, repo, projectPath),
				this.createErrorContext("cloneRepositoryContents", {
					owner,
					repo,
					projectPath,
				})
			);

			// Detect technologies with error handling
			const detectedTechnologies = await this.executeWithErrorHandling(
				() => this.detectTechStack(structure, owner, repo),
				this.createErrorContext("detectTechStack", { owner, repo })
			);

			this.log("Repository import completed successfully:", projectId);

			return {
				projectId,
				structure,
				detectedTechnologies,
				size: repoInfo.size,
				status: "success",
			};
		}, context);
	}

	/**
	 * Validate a GitHub repository URL
	 */
	async validateRepository(url: string): Promise<ValidationResult> {
		try {
			const errors: Array<{ field: string; message: string; code: string }> =
				[];
			const warnings: string[] = [];

			// Check URL format
			if (!this.isValidGitHubUrl(url)) {
				errors.push({
					field: "url",
					message: "Invalid GitHub repository URL format",
					code: "INVALID_URL_FORMAT",
				});
				return { isValid: false, errors, warnings };
			}

			const { owner, repo } = this.parseGitHubUrl(url);

			// Check if repository exists and is accessible
			try {
				const response = await this.apiClient.get(`/repos/${owner}/${repo}`);
				const repoData = response.data as GitHubRepository;

				// Check repository size (warn if too large)
				if (repoData.size > 100000) {
					// 100MB
					warnings.push("Repository is large and may take longer to import");
				}

				// Check if repository is private (may need authentication)
				if (repoData.private) {
					warnings.push(
						"Repository is private - authentication may be required"
					);
				}
			} catch (error: any) {
				if (error.isAxiosError || (error.response && error.response.status)) {
					if (error.response?.status === 404) {
						errors.push({
							field: "url",
							message: "Repository not found or not accessible",
							code: "REPO_NOT_FOUND",
						});
					} else if (error.response?.status === 403) {
						errors.push({
							field: "authentication",
							message: "Repository requires authentication",
							code: "AUTH_REQUIRED",
						});
					} else {
						errors.push({
							field: "api",
							message: "Failed to access GitHub API",
							code: "API_ERROR",
						});
					}
				} else {
					errors.push({
						field: "unknown",
						message: "Unknown error occurred during validation",
						code: "UNKNOWN_ERROR",
					});
				}
			}

			return {
				isValid: errors.length === 0,
				errors,
				warnings,
			};
		} catch (error) {
			this.error("Repository validation failed:", error as Error);
			return {
				isValid: false,
				errors: [
					{
						field: "validation",
						message: "Validation process failed",
						code: "VALIDATION_ERROR",
					},
				],
				warnings: [],
			};
		}
	}

	/**
	 * Get repository information from GitHub API
	 */
	private async getRepositoryInfo(
		owner: string,
		repo: string
	): Promise<GitHubRepository> {
		const response = await this.apiClient.get(`/repos/${owner}/${repo}`);
		return response.data;
	}

	/**
	 * Clone repository contents to local storage
	 */
	private async cloneRepositoryContents(
		owner: string,
		repo: string,
		projectPath: string
	): Promise<FileTree> {
		this.log("Cloning repository contents...");

		const rootContent = await this.getRepositoryContents(owner, repo, "");
		const rootTree: FileTree = {
			name: repo,
			type: "directory",
			path: "",
			children: [],
			metadata: {
				size: 0,
				lastModified: new Date(),
				permissions: "read",
			},
		};

		// Ensure project path exists
		await fs.mkdir(projectPath, { recursive: true });

		await this.processDirectoryContents(
			owner,
			repo,
			rootContent,
			rootTree,
			projectPath
		);
		return rootTree;
	}

	/**
	 * Get repository contents from GitHub API
	 */
	private async getRepositoryContents(
		owner: string,
		repo: string,
		path: string
	): Promise<GitHubContent[]> {
		try {
			const response = await this.apiClient.get(
				`/repos/${owner}/${repo}/contents/${path}`
			);
			return Array.isArray(response.data) ? response.data : [response.data];
		} catch (error) {
			this.warn(`Failed to get contents for path: ${path}`, error);
			return [];
		}
	}

	/**
	 * Process directory contents recursively
	 */
	private async processDirectoryContents(
		owner: string,
		repo: string,
		contents: GitHubContent[],
		parentTree: FileTree,
		basePath: string
	): Promise<void> {
		if (!basePath) {
			throw new Error(
				"Base path is required for processing directory contents"
			);
		}

		for (const item of contents) {
			if (!item.name) {
				this.warn("Item missing name property:", item);
				continue;
			}
			const itemPath = path.join(basePath, item.name);

			if (item.type === "file") {
				// Download file content
				const fileContent = await this.downloadFile(item.download_url || "");

				// Save file to disk
				try {
					await fs.writeFile(itemPath, fileContent);
				} catch (error) {
					this.warn("Failed to write file:", itemPath, error);
				}

				// Add to file tree
				const fileTree: FileTree = {
					name: item.name,
					type: "file",
					path: item.path,
					content: fileContent,
					metadata: {
						size: item.size || 0,
						lastModified: new Date(),
						encoding: item.encoding,
						mimeType: this.getMimeType(item.name),
					},
				};

				if (!parentTree.children) parentTree.children = [];
				parentTree.children.push(fileTree);
			} else if (item.type === "dir") {
				// Create directory
				try {
					await fs.mkdir(itemPath, { recursive: true });
				} catch (error) {
					this.warn("Failed to create directory:", itemPath, error);
				}

				// Create directory tree node
				const dirTree: FileTree = {
					name: item.name,
					type: "directory",
					path: item.path,
					children: [],
					metadata: {
						size: 0,
						lastModified: new Date(),
						permissions: "read",
					},
				};

				if (!parentTree.children) parentTree.children = [];
				parentTree.children.push(dirTree);

				// Process subdirectory contents
				const subContents = await this.getRepositoryContents(
					owner,
					repo,
					item.path
				);
				await this.processDirectoryContents(
					owner,
					repo,
					subContents,
					dirTree,
					itemPath
				);
			}
		}
	}

	/**
	 * Download file content from GitHub
	 */
	private async downloadFile(downloadUrl: string): Promise<string> {
		if (!downloadUrl) return "";

		try {
			const response = await axios.get(downloadUrl, { responseType: "text" });
			return response.data;
		} catch (error) {
			this.warn("Failed to download file:", downloadUrl, error);
			return "";
		}
	}

	/**
	 * Detect technology stack from repository structure and files
	 */
	private async detectTechStack(
		structure: FileTree,
		owner: string,
		repo: string
	): Promise<TechStack> {
		this.log("Detecting technology stack...");

		const techStack: TechStack = {
			language: "",
			additional: {},
		};

		// Get language information from GitHub API
		try {
			const response = await this.apiClient.get(
				`/repos/${owner}/${repo}/languages`
			);
			const languages = response.data as Record<string, number>;

			// Find primary language (most bytes)
			const primaryLanguage = Object.entries(languages).sort(
				([, a], [, b]) => b - a
			)[0]?.[0];

			if (primaryLanguage) {
				techStack.language = primaryLanguage.toLowerCase();
			}
		} catch (error) {
			this.warn("Failed to get language information:", error);
		}

		// Analyze file structure for frameworks and tools
		this.analyzeFileStructure(structure, techStack);

		return techStack;
	}

	/**
	 * Analyze file structure to detect frameworks and tools
	 */
	private analyzeFileStructure(tree: FileTree, techStack: TechStack): void {
		if (!tree.children) return;

		for (const child of tree.children) {
			if (child.type === "file") {
				this.analyzeFile(child, techStack);
			} else if (child.type === "directory") {
				this.analyzeDirectory(child, techStack);
				this.analyzeFileStructure(child, techStack);
			}
		}
	}

	/**
	 * Analyze individual files for technology indicators
	 */
	private analyzeFile(file: FileTree, techStack: TechStack): void {
		const fileName = file.name.toLowerCase();
		const content = file.content || "";

		// Package managers and build tools
		if (fileName === "package.json") {
			techStack.packageManager = "npm";
			this.analyzePackageJson(content, techStack);
		} else if (fileName === "yarn.lock") {
			techStack.packageManager = "yarn";
		} else if (fileName === "pnpm-lock.yaml") {
			techStack.packageManager = "pnpm";
		} else if (fileName === "requirements.txt") {
			techStack.packageManager = "pip";
			techStack.language = "python";
		} else if (fileName === "composer.json") {
			techStack.packageManager = "composer";
			techStack.language = "php";
		} else if (fileName === "cargo.toml") {
			techStack.packageManager = "cargo";
			techStack.language = "rust";
		}

		// Build tools
		if (fileName === "webpack.config.js" || fileName.includes("webpack")) {
			techStack.buildTool = "webpack";
		} else if (fileName === "vite.config.js" || fileName === "vite.config.ts") {
			techStack.buildTool = "vite";
		} else if (fileName === "rollup.config.js") {
			techStack.buildTool = "rollup";
		}

		// Deployment and containerization
		if (fileName === "dockerfile" || fileName === "docker-compose.yml") {
			techStack.deployment = "docker";
		} else if (fileName === "vercel.json") {
			techStack.deployment = "vercel";
		} else if (fileName === "netlify.toml") {
			techStack.deployment = "netlify";
		}
	}

	/**
	 * Analyze directories for framework indicators
	 */
	private analyzeDirectory(dir: FileTree, techStack: TechStack): void {
		const dirName = dir.name.toLowerCase();

		// Framework-specific directories
		if (dirName === "node_modules") {
			techStack.runtime = "node";
		} else if (dirName === "__pycache__" || dirName === "venv") {
			techStack.language = "python";
		}
	}

	/**
	 * Analyze package.json content for framework detection
	 */
	private analyzePackageJson(content: string, techStack: TechStack): void {
		try {
			const packageJson = JSON.parse(content);
			const dependencies = {
				...packageJson.dependencies,
				...packageJson.devDependencies,
			};

			// Detect frameworks
			if (dependencies.react) {
				techStack.framework = "react";
			} else if (dependencies.vue) {
				techStack.framework = "vue";
			} else if (dependencies.angular || dependencies["@angular/core"]) {
				techStack.framework = "angular";
			} else if (dependencies.svelte) {
				techStack.framework = "svelte";
			} else if (dependencies.next) {
				techStack.framework = "nextjs";
			} else if (dependencies.nuxt) {
				techStack.framework = "nuxtjs";
			} else if (dependencies.express) {
				techStack.framework = "express";
			} else if (dependencies.fastify) {
				techStack.framework = "fastify";
			}

			// Detect databases
			if (dependencies.mongoose || dependencies.mongodb) {
				techStack.database = "mongodb";
			} else if (dependencies.pg || dependencies.postgres) {
				techStack.database = "postgresql";
			} else if (dependencies.mysql || dependencies.mysql2) {
				techStack.database = "mysql";
			} else if (dependencies.sqlite3 || dependencies.sqlite) {
				techStack.database = "sqlite";
			}

			// Detect runtime
			techStack.runtime = "node";
			techStack.language = "javascript";

			if (dependencies.typescript || packageJson.devDependencies?.typescript) {
				techStack.language = "typescript";
			}
		} catch (error) {
			this.warn("Failed to parse package.json:", error);
		}
	}

	/**
	 * Utility methods
	 */
	private isValidGitHubUrl(url: string): boolean {
		const githubUrlPattern =
			/^https:\/\/github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+(?:\.git)?\/?$/;
		return githubUrlPattern.test(url);
	}

	private parseGitHubUrl(url: string): { owner: string; repo: string } {
		const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
		if (!match) {
			throw new Error("Invalid GitHub URL format");
		}

		return {
			owner: match[1],
			repo: match[2].replace(/\.git$/, ""),
		};
	}

	private getMimeType(filename: string): string {
		const ext = path.extname(filename).toLowerCase();
		const mimeTypes: Record<string, string> = {
			".js": "application/javascript",
			".ts": "application/typescript",
			".json": "application/json",
			".html": "text/html",
			".css": "text/css",
			".md": "text/markdown",
			".txt": "text/plain",
			".py": "text/x-python",
			".java": "text/x-java",
			".cpp": "text/x-c++src",
			".c": "text/x-csrc",
			".php": "text/x-php",
			".rb": "text/x-ruby",
			".go": "text/x-go",
			".rs": "text/x-rust",
		};

		return mimeTypes[ext] || "text/plain";
	}
}
