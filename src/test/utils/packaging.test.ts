import { describe, it, expect, beforeEach, vi, Mock } from "vitest";
import { PackagingUtils, ArchiveUtils } from "@/utils/packaging";
import { TechStack } from "@/types";
import * as fs from "fs/promises";

// Mock fs operations
vi.mock("fs/promises");

describe("PackagingUtils", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("generateFileStructure", () => {
		it("should generate basic file structure for any project", () => {
			const techStack: TechStack = {
				language: "javascript",
				additional: {},
			};

			const structure = PackagingUtils.generateFileStructure(
				techStack,
				"test-project"
			);

			expect(structure.name).toBe("test-project");
			expect(structure.type).toBe("directory");
			expect(structure.children).toBeDefined();

			const fileNames = structure.children!.map((child) => child.name);
			expect(fileNames).toContain("README.md");
			expect(fileNames).toContain(".gitignore");
			expect(fileNames).toContain(".env.example");
		});

		it("should generate package.json for JavaScript/TypeScript projects", () => {
			const techStack: TechStack = {
				language: "typescript",
				framework: "react",
				additional: {},
			};

			const structure = PackagingUtils.generateFileStructure(
				techStack,
				"test-project"
			);

			const fileNames = structure.children!.map((child) => child.name);
			expect(fileNames).toContain("package.json");
			expect(fileNames).toContain("tsconfig.json");
		});

		it("should generate requirements.txt for Python projects", () => {
			const techStack: TechStack = {
				language: "python",
				framework: "django",
				additional: {},
			};

			const structure = PackagingUtils.generateFileStructure(
				techStack,
				"test-project"
			);

			const fileNames = structure.children!.map((child) => child.name);
			expect(fileNames).toContain("requirements.txt");
			expect(fileNames).toContain("setup.py");
		});

		it("should generate Next.js specific files", () => {
			const techStack: TechStack = {
				language: "typescript",
				framework: "next",
				additional: {},
			};

			const structure = PackagingUtils.generateFileStructure(
				techStack,
				"test-project"
			);

			const fileNames = structure.children!.map((child) => child.name);
			expect(fileNames).toContain("next.config.js");
			expect(fileNames).toContain("pages");

			const pagesDir = structure.children!.find(
				(child) => child.name === "pages"
			);
			expect(pagesDir?.children).toBeDefined();
			expect(pagesDir?.children!.map((child) => child.name)).toContain(
				"index.tsx"
			);
		});

		it("should generate React specific files", () => {
			const techStack: TechStack = {
				language: "typescript",
				framework: "react",
				additional: {},
			};

			const structure = PackagingUtils.generateFileStructure(
				techStack,
				"test-project"
			);

			const srcDir = structure.children!.find((child) => child.name === "src");
			expect(srcDir).toBeDefined();
			expect(srcDir?.children!.map((child) => child.name)).toContain("App.tsx");
		});

		it("should generate Vue specific files", () => {
			const techStack: TechStack = {
				language: "typescript",
				framework: "vue",
				additional: {},
			};

			const structure = PackagingUtils.generateFileStructure(
				techStack,
				"test-project"
			);

			const fileNames = structure.children!.map((child) => child.name);
			expect(fileNames).toContain("vite.config.js");

			const srcDir = structure.children!.find((child) => child.name === "src");
			expect(srcDir?.children!.map((child) => child.name)).toContain("App.vue");
		});
	});

	describe("writeFileTreeToDisk", () => {
		beforeEach(() => {
			(fs.mkdir as Mock).mockResolvedValue(undefined);
			(fs.writeFile as Mock).mockResolvedValue(undefined);
		});

		it("should write directory structure to disk", async () => {
			const fileTree = {
				name: "test-project",
				type: "directory" as const,
				path: ".",
				children: [
					{
						name: "README.md",
						type: "file" as const,
						path: "README.md",
						content: "# Test Project",
						metadata: { size: 13, lastModified: new Date() },
					},
				],
				metadata: { size: 0, lastModified: new Date() },
			};

			await PackagingUtils.writeFileTreeToDisk(fileTree, "/tmp/export");

			expect(fs.mkdir).toHaveBeenCalledWith(expect.stringContaining("tmp"), {
				recursive: true,
			});
			expect(fs.writeFile).toHaveBeenCalledWith(
				expect.stringContaining("README.md"),
				"# Test Project"
			);
		});

		it("should handle nested directories", async () => {
			const fileTree = {
				name: "test-project",
				type: "directory" as const,
				path: ".",
				children: [
					{
						name: "src",
						type: "directory" as const,
						path: "src",
						children: [
							{
								name: "index.ts",
								type: "file" as const,
								path: "src/index.ts",
								content: 'console.log("hello");',
								metadata: { size: 20, lastModified: new Date() },
							},
						],
						metadata: { size: 0, lastModified: new Date() },
					},
				],
				metadata: { size: 0, lastModified: new Date() },
			};

			await PackagingUtils.writeFileTreeToDisk(fileTree, "/tmp/export");

			expect(fs.mkdir).toHaveBeenCalledWith(expect.stringContaining("src"), {
				recursive: true,
			});
			expect(fs.writeFile).toHaveBeenCalledWith(
				expect.stringContaining("index.ts"),
				'console.log("hello");'
			);
		});

		it("should handle file system errors", async () => {
			(fs.mkdir as Mock).mockRejectedValue(new Error("Permission denied"));

			const fileTree = {
				name: "test-project",
				type: "directory" as const,
				path: ".",
				children: [],
				metadata: { size: 0, lastModified: new Date() },
			};

			await expect(
				PackagingUtils.writeFileTreeToDisk(fileTree, "/tmp/export")
			).rejects.toThrow("Permission denied");
		});
	});

	describe("content generation", () => {
		it("should generate valid package.json content", () => {
			const techStack: TechStack = {
				language: "typescript",
				framework: "next",
				additional: {},
			};

			const structure = PackagingUtils.generateFileStructure(
				techStack,
				"test-project"
			);
			const packageJsonFile = structure.children!.find(
				(child) => child.name === "package.json"
			);

			expect(packageJsonFile).toBeDefined();
			expect(packageJsonFile!.content).toBeDefined();

			const packageJson = JSON.parse(packageJsonFile!.content!);
			expect(packageJson.name).toBe("test-project");
			expect(packageJson.scripts).toBeDefined();
			expect(packageJson.scripts.dev).toBe("next dev");
		});

		it("should generate valid tsconfig.json content", () => {
			const techStack: TechStack = {
				language: "typescript",
				framework: "react",
				additional: {},
			};

			const structure = PackagingUtils.generateFileStructure(
				techStack,
				"test-project"
			);
			const tsconfigFile = structure.children!.find(
				(child) => child.name === "tsconfig.json"
			);

			expect(tsconfigFile).toBeDefined();
			expect(tsconfigFile!.content).toBeDefined();

			const tsconfig = JSON.parse(tsconfigFile!.content!);
			expect(tsconfig.compilerOptions).toBeDefined();
			expect(tsconfig.compilerOptions.strict).toBe(true);
		});

		it("should generate appropriate .gitignore content", () => {
			const techStack: TechStack = {
				language: "python",
				additional: {},
			};

			const structure = PackagingUtils.generateFileStructure(
				techStack,
				"test-project"
			);
			const gitignoreFile = structure.children!.find(
				(child) => child.name === ".gitignore"
			);

			expect(gitignoreFile).toBeDefined();
			expect(gitignoreFile!.content).toContain("__pycache__/");
			expect(gitignoreFile!.content).toContain("*.pyc");
			expect(gitignoreFile!.content).toContain("node_modules/");
		});
	});
});

describe("ArchiveUtils", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		(fs.writeFile as Mock).mockResolvedValue(undefined);
		(fs.stat as Mock).mockResolvedValue({ size: 1024 });
	});

	describe("createZipArchive", () => {
		it("should create a zip archive placeholder", async () => {
			await ArchiveUtils.createZipArchive("/tmp/source", "/tmp/output.zip");

			expect(fs.writeFile).toHaveBeenCalledWith(
				"/tmp/output.zip",
				"ZIP archive placeholder for /tmp/source"
			);
		});

		it("should handle file system errors", async () => {
			(fs.writeFile as Mock).mockRejectedValue(new Error("Disk full"));

			await expect(
				ArchiveUtils.createZipArchive("/tmp/source", "/tmp/output.zip")
			).rejects.toThrow("Disk full");
		});
	});

	describe("createTarArchive", () => {
		it("should create a tar archive placeholder", async () => {
			await ArchiveUtils.createTarArchive(
				"/tmp/source",
				"/tmp/output.tar",
				false
			);

			expect(fs.writeFile).toHaveBeenCalledWith(
				"/tmp/output.tar",
				"TAR archive placeholder for /tmp/source"
			);
		});

		it("should handle compressed tar archives", async () => {
			await ArchiveUtils.createTarArchive(
				"/tmp/source",
				"/tmp/output.tar.gz",
				true
			);

			expect(fs.writeFile).toHaveBeenCalledWith(
				"/tmp/output.tar.gz",
				"TAR archive placeholder for /tmp/source"
			);
		});
	});

	describe("getArchiveSize", () => {
		it("should return archive file size", async () => {
			const size = await ArchiveUtils.getArchiveSize("/tmp/archive.zip");

			expect(size).toBe(1024);
			expect(fs.stat).toHaveBeenCalledWith("/tmp/archive.zip");
		});

		it("should handle missing files", async () => {
			(fs.stat as Mock).mockRejectedValue(new Error("File not found"));

			await expect(
				ArchiveUtils.getArchiveSize("/tmp/nonexistent.zip")
			).rejects.toThrow("File not found");
		});
	});

	describe("validateArchive", () => {
		it("should validate existing archive", async () => {
			const isValid = await ArchiveUtils.validateArchive(
				"/tmp/archive.zip",
				"zip"
			);

			expect(isValid).toBe(true);
			expect(fs.stat).toHaveBeenCalledWith("/tmp/archive.zip");
		});

		it("should return false for missing archive", async () => {
			(fs.stat as Mock).mockRejectedValue(new Error("File not found"));

			const isValid = await ArchiveUtils.validateArchive(
				"/tmp/nonexistent.zip",
				"zip"
			);

			expect(isValid).toBe(false);
		});

		it("should return false for empty archive", async () => {
			(fs.stat as Mock).mockResolvedValue({ size: 0 });

			const isValid = await ArchiveUtils.validateArchive(
				"/tmp/empty.zip",
				"zip"
			);

			expect(isValid).toBe(false);
		});
	});
});
