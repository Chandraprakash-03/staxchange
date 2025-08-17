import * as fs from "fs/promises";
import * as path from "path";
import { FileTree, TechStack } from "@/types";
import type ts from "typescript";

export interface PackagingOptions {
	includeSourceFiles?: boolean;
	includeTests?: boolean;
	includeDocs?: boolean;
	includeGitFiles?: boolean;
	excludePatterns?: string[];
}

export interface ArchiveOptions {
	format: "zip" | "tar";
	compression?: boolean;
	compressionLevel?: number;
}

export class PackagingUtils {
	/**
	 * Create a file tree structure for a given tech stack
	 */
	static generateFileStructure(
		techStack: TechStack,
		projectName: string
	): FileTree {
		const structure: FileTree = {
			name: projectName,
			type: "directory",
			path: ".",
			children: [],
			metadata: {
				size: 0,
				lastModified: new Date(),
			},
		};

		// Add common files
		structure.children = [
			this.createFile(
				"README.md",
				this.generateReadmeContent(projectName, techStack)
			),
			this.createFile(".gitignore", this.generateGitignoreContent(techStack)),
			this.createFile(
				".env.example",
				this.generateEnvExampleContent(techStack)
			),
		];

		// Add tech stack specific files
		if (
			techStack.language === "javascript" ||
			techStack.language === "typescript"
		) {
			structure.children.push(
				this.createFile(
					"package.json",
					this.generatePackageJsonContent(projectName, techStack)
				)
			);

			if (techStack.language === "typescript") {
				structure.children.push(
					this.createFile(
						"tsconfig.json",
						this.generateTsConfigContent(techStack)
					)
				);
			}
		}

		if (techStack.language === "python") {
			structure.children.push(
				this.createFile(
					"requirements.txt",
					this.generateRequirementsContent(techStack)
				),
				this.createFile(
					"setup.py",
					this.generateSetupPyContent(projectName, techStack)
				)
			);
		}

		// Add framework specific files
		if (techStack.framework === "next") {
			structure.children.push(
				this.createFile("next.config.js", this.generateNextConfigContent()),
				this.createDirectory("pages", [
					this.createFile("index.tsx", this.generateNextIndexContent()),
					this.createFile("_app.tsx", this.generateNextAppContent()),
				])
			);
		}

		if (techStack.framework === "react") {
			structure.children.push(
				this.createDirectory("src", [
					this.createFile("index.tsx", this.generateReactIndexContent()),
					this.createFile("App.tsx", this.generateReactAppContent()),
				])
			);
		}

		if (techStack.framework === "vue") {
			structure.children.push(
				this.createFile("vite.config.js", this.generateViteConfigContent()),
				this.createDirectory("src", [
					this.createFile("main.ts", this.generateVueMainContent()),
					this.createFile("App.vue", this.generateVueAppContent()),
				])
			);
		}

		// Add source directory if not already created
		if (!structure.children?.some((child) => child.name === "src")) {
			structure.children.push(
				this.createDirectory("src", [
					this.createFile(
						"index.ts",
						this.generateGenericIndexContent(techStack)
					),
				])
			);
		}

		return structure;
	}

	/**
	 * Write file tree to disk
	 */
	static async writeFileTreeToDisk(
		fileTree: FileTree,
		basePath: string
	): Promise<void> {
		const fullPath = path.join(basePath, fileTree.path);

		if (fileTree.type === "directory") {
			await fs.mkdir(fullPath, { recursive: true });

			if (fileTree.children) {
				for (const child of fileTree.children) {
					await this.writeFileTreeToDisk(child, basePath);
				}
			}
		} else {
			// Ensure parent directory exists
			await fs.mkdir(path.dirname(fullPath), { recursive: true });
			await fs.writeFile(fullPath, fileTree.content || "");
		}
	}

	/**
	 * Create a file node
	 */
	private static createFile(name: string, content: string): FileTree {
		return {
			name,
			type: "file",
			path: name,
			content,
			metadata: {
				size: Buffer.byteLength(content, "utf8"),
				lastModified: new Date(),
			},
		};
	}

	/**
	 * Create a directory node
	 */
	private static createDirectory(
		name: string,
		children: FileTree[] = []
	): FileTree {
		return {
			name,
			type: "directory",
			path: name,
			children: children.map((child) => ({
				...child,
				path: path.join(name, child.path),
			})),
			metadata: {
				size: 0,
				lastModified: new Date(),
			},
		};
	}

	// Content generators
	private static generateReadmeContent(
		projectName: string,
		techStack: TechStack
	): string {
		return `# ${projectName}

This project was converted using the AI Tech Stack Conversion Platform.

## Tech Stack
- Language: ${techStack.language}
${techStack.framework ? `- Framework: ${techStack.framework}` : ""}
${techStack.database ? `- Database: ${techStack.database}` : ""}
${techStack.runtime ? `- Runtime: ${techStack.runtime}` : ""}

## Getting Started

1. Install dependencies
2. Configure environment variables
3. Run the development server

See SETUP.md for detailed instructions.
`;
	}

	private static generateGitignoreContent(techStack: TechStack): string {
		const common = [
			"# Dependencies",
			"node_modules/",
			"",
			"# Environment variables",
			".env",
			".env.local",
			".env.*.local",
			"",
			"# Build outputs",
			"dist/",
			"build/",
			".next/",
			"",
			"# Logs",
			"*.log",
			"logs/",
			"",
			"# OS generated files",
			".DS_Store",
			"Thumbs.db",
		];

		if (techStack.language === "python") {
			common.push(
				"",
				"# Python",
				"__pycache__/",
				"*.pyc",
				"*.pyo",
				"*.pyd",
				".Python",
				"venv/",
				".venv/",
				"pip-log.txt",
				"pip-delete-this-directory.txt"
			);
		}

		if (techStack.language === "typescript") {
			common.push("", "# TypeScript", "*.tsbuildinfo");
		}

		return common.join("\n");
	}

	private static generateEnvExampleContent(techStack: TechStack): string {
		const vars = [
			"# Application Configuration",
			"NODE_ENV=development",
			"PORT=3000",
		];

		if (techStack.database === "postgresql") {
			vars.push(
				"",
				"# Database Configuration",
				"DATABASE_URL=postgresql://username:password@localhost:5432/database_name"
			);
		}

		if (techStack.database === "mysql") {
			vars.push(
				"",
				"# Database Configuration",
				"DATABASE_URL=mysql://username:password@localhost:3306/database_name"
			);
		}

		return vars.join("\n");
	}

	private static generatePackageJsonContent(
		projectName: string,
		techStack: TechStack
	): string {
		const packageJson = {
			name: projectName.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
			version: "1.0.0",
			description: `Converted ${techStack.language} project`,
			main:
				techStack.language === "typescript" ? "dist/index.js" : "src/index.js",
			scripts: {
				start: "node dist/index.js",
				dev:
					techStack.framework === "next" ? "next dev" : "nodemon src/index.ts",
				build:
					techStack.language === "typescript"
						? "tsc"
						: 'echo "No build step required"',
				test: "jest",
			},
			dependencies: {},
			devDependencies: {},
		};

		// Add framework-specific scripts
		if (techStack.framework === "next") {
			packageJson.scripts = {
				...packageJson.scripts,
				dev: "next dev",
				build: "next build",
				start: "next start",
			};
		}

		return JSON.stringify(packageJson, null, 2);
	}

	private static generateTsConfigContent(techStack: TechStack): string {
		const config = {
			compilerOptions: {
				target: "ES2020",
				module: "commonjs",
				lib: ["ES2020"],
				outDir: "./dist",
				rootDir: "./src",
				strict: true,
				esModuleInterop: true,
				skipLibCheck: true,
				forceConsistentCasingInFileNames: true,
				resolveJsonModule: true,
				declaration: true,
				declarationMap: true,
				sourceMap: true,
			},
			include: ["src/**/*"],
			exclude: ["node_modules", "dist"],
		};

		if (techStack.framework === "next") {
			config.compilerOptions = {
				...config.compilerOptions,
				target: "es5",
				module: "esnext",
				lib: ["dom", "dom.iterable", "es6"],
				allowJs: true,
				skipLibCheck: true,
				strict: true,
				forceConsistentCasingInFileNames: true,
				noEmit: true,
				esModuleInterop: true,
				moduleResolution: "node",
				resolveJsonModule: true,
				isolatedModules: true,
				jsx: "preserve",
				incremental: true,
			} as any;
		}

		return JSON.stringify(config, null, 2);
	}

	private static generateRequirementsContent(techStack: TechStack): string {
		const requirements = [];

		if (techStack.framework === "django") {
			requirements.push("Django>=4.0.0");
		}

		if (techStack.framework === "flask") {
			requirements.push("Flask>=2.0.0");
		}

		if (techStack.database === "postgresql") {
			requirements.push("psycopg2-binary>=2.9.0");
		}

		return requirements.join("\n");
	}

	private static generateSetupPyContent(
		projectName: string,
		techStack: TechStack
	): string {
		return `from setuptools import setup, find_packages

setup(
    name="${projectName.toLowerCase().replace(/[^a-z0-9-]/g, "-")}",
    version="1.0.0",
    description="Converted ${techStack.language} project",
    packages=find_packages(),
    python_requires=">=3.8",
    install_requires=[
        # Add your dependencies here
    ],
)`;
	}

	// Framework-specific content generators
	private static generateNextConfigContent(): string {
		return `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
}

module.exports = nextConfig`;
	}

	private static generateNextIndexContent(): string {
		return `import type { NextPage } from 'next'
import Head from 'next/head'

const Home: NextPage = () => {
  return (
    <div>
      <Head>
        <title>Converted App</title>
        <meta name="description" content="Generated by AI Tech Stack Converter" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <h1>Welcome to your converted app!</h1>
        <p>This application was converted using AI Tech Stack Conversion Platform.</p>
      </main>
    </div>
  )
}

export default Home`;
	}

	private static generateNextAppContent(): string {
		return `import type { AppProps } from 'next/app'

function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />
}

export default MyApp`;
	}

	private static generateReactIndexContent(): string {
		return `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`;
	}

	private static generateReactAppContent(): string {
		return `import React from 'react';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Welcome to your converted app!</h1>
        <p>This application was converted using AI Tech Stack Conversion Platform.</p>
      </header>
    </div>
  );
}

export default App;`;
	}

	private static generateViteConfigContent(): string {
		return `import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
})`;
	}

	private static generateVueMainContent(): string {
		return `import { createApp } from 'vue'
import App from './App.vue'

createApp(App).mount('#app')`;
	}

	private static generateVueAppContent(): string {
		return `<template>
  <div id="app">
    <h1>Welcome to your converted app!</h1>
    <p>This application was converted using AI Tech Stack Conversion Platform.</p>
  </div>
</template>

<script>
export default {
  name: 'App'
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>`;
	}

	private static generateGenericIndexContent(techStack: TechStack): string {
		if (techStack.language === "typescript") {
			return `// Main application entry point
console.log('Welcome to your converted ${techStack.language} application!');

export default function main() {
  // Your application logic here
}

if (require.main === module) {
  main();
}`;
		}

		return `// Main application entry point
console.log('Welcome to your converted ${techStack.language} application!');

function main() {
  // Your application logic here
}

if (require.main === module) {
  main();
}

module.exports = { main };`;
	}
}

/**
 * Archive utilities for creating downloadable packages
 */
export class ArchiveUtils {
	/**
	 * Create a ZIP archive from a directory
	 * Note: This is a placeholder implementation. In production, use a proper archiving library like 'archiver'
	 */
	static async createZipArchive(
		sourceDir: string,
		outputPath: string
	): Promise<void> {
		// Placeholder implementation
		// In production, you would use a library like 'archiver':
		/*
    const archiver = require('archiver');
    const fs = require('fs');
    
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    archive.pipe(output);
    archive.directory(sourceDir, false);
    await archive.finalize();
    */

		// For now, just create a placeholder file
		await fs.writeFile(outputPath, `ZIP archive placeholder for ${sourceDir}`);
	}

	/**
	 * Create a TAR archive from a directory
	 */
	static async createTarArchive(
		sourceDir: string,
		outputPath: string,
		compressed: boolean = true
	): Promise<void> {
		// Placeholder implementation
		// In production, you would use a library like 'tar':
		/*
    const tar = require('tar');
    
    await tar.create({
      gzip: compressed,
      file: outputPath,
      cwd: path.dirname(sourceDir),
    }, [path.basename(sourceDir)]);
    */

		// For now, just create a placeholder file
		const extension = compressed ? ".tar.gz" : ".tar";
		await fs.writeFile(outputPath, `TAR archive placeholder for ${sourceDir}`);
	}

	/**
	 * Get archive size
	 */
	static async getArchiveSize(archivePath: string): Promise<number> {
		const stats = await fs.stat(archivePath);
		return stats.size;
	}

	/**
	 * Validate archive integrity
	 */
	static async validateArchive(
		archivePath: string,
		format: "zip" | "tar"
	): Promise<boolean> {
		try {
			const stats = await fs.stat(archivePath);
			return stats.size > 0;
		} catch {
			return false;
		}
	}
}
