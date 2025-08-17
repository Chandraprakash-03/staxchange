import { BaseService } from './base';
import { 
  ProjectAnalysis, 
  TechStack, 
  FileTree, 
  Dependency, 
  ArchitectureType,
  DatabaseSchema 
} from '@/types';
import { ASTParser, CodeAnalysisResult } from '@/utils/ast-parser';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface TechStackPattern {
  language?: string;
  framework?: string;
  database?: string;
  runtime?: string;
  buildTool?: string;
  packageManager?: string;
  deployment?: string;
  patterns: {
    files: string[];
    directories?: string[];
    content?: { file: string; pattern: RegExp }[];
  };
  confidence: number;
}

export class ProjectAnalysisService extends BaseService {
  private techStackPatterns: TechStackPattern[] = [
    // TypeScript patterns (higher priority than JavaScript)
    {
      language: 'typescript',
      packageManager: 'npm',
      patterns: {
        files: ['tsconfig.json', '*.ts', '*.tsx'],
        directories: ['node_modules'],
      },
      confidence: 0.95,
    },
    
    // JavaScript patterns
    {
      language: 'javascript',
      packageManager: 'npm',
      patterns: {
        files: ['package.json', '*.js'],
        directories: ['node_modules'],
      },
      confidence: 0.9,
    },
    
    // React patterns
    {
      language: 'javascript',
      framework: 'react',
      packageManager: 'npm',
      patterns: {
        files: ['package.json'],
        content: [
          { file: 'package.json', pattern: /"react":\s*"[^"]*"/ },
        ],
      },
      confidence: 0.9,
    },
    
    // Next.js patterns
    {
      language: 'javascript',
      framework: 'nextjs',
      packageManager: 'npm',
      patterns: {
        files: ['next.config.js', 'next.config.ts', 'package.json'],
        directories: ['.next'],
        content: [
          { file: 'package.json', pattern: /"next":\s*"[^"]*"/ },
        ],
      },
      confidence: 0.95,
    },
    
    // Python patterns
    {
      language: 'python',
      packageManager: 'pip',
      patterns: {
        files: ['requirements.txt', 'setup.py', 'pyproject.toml', '*.py'],
        directories: ['__pycache__', '.venv', 'venv'],
      },
      confidence: 0.9,
    },
    
    // Django patterns
    {
      language: 'python',
      framework: 'django',
      packageManager: 'pip',
      patterns: {
        files: ['manage.py', 'settings.py', 'requirements.txt'],
        content: [
          { file: 'requirements.txt', pattern: /django/i },
          { file: 'setup.py', pattern: /django/i },
        ],
      },
      confidence: 0.95,
    },
    
    // Java patterns
    {
      language: 'java',
      buildTool: 'maven',
      patterns: {
        files: ['pom.xml', '*.java'],
        directories: ['target', 'src/main/java'],
      },
      confidence: 0.9,
    },
    
    // Spring Boot patterns
    {
      language: 'java',
      framework: 'spring-boot',
      buildTool: 'maven',
      patterns: {
        files: ['pom.xml'],
        content: [
          { file: 'pom.xml', pattern: /<groupId>org\.springframework\.boot<\/groupId>/ },
        ],
      },
      confidence: 0.95,
    },
    
    // Go patterns
    {
      language: 'go',
      buildTool: 'go-modules',
      patterns: {
        files: ['go.mod', 'go.sum', '*.go'],
      },
      confidence: 0.9,
    },
    
    // Rust patterns
    {
      language: 'rust',
      buildTool: 'cargo',
      patterns: {
        files: ['Cargo.toml', 'Cargo.lock', '*.rs'],
        directories: ['target'],
      },
      confidence: 0.9,
    },
    
    // PHP patterns
    {
      language: 'php',
      packageManager: 'composer',
      patterns: {
        files: ['composer.json', 'composer.lock', '*.php'],
        directories: ['vendor'],
      },
      confidence: 0.9,
    },
    
    // Database patterns
    {
      database: 'postgresql',
      patterns: {
        files: ['*.sql'],
        content: [
          { file: 'package.json', pattern: /"pg":\s*"[^"]*"/ },
          { file: 'requirements.txt', pattern: /psycopg2/i },
          { file: 'pom.xml', pattern: /postgresql/ },
        ],
      },
      confidence: 0.8,
    },
    
    {
      database: 'mysql',
      patterns: {
        files: ['*.sql'],
        content: [
          { file: 'package.json', pattern: /"mysql2?":\s*"[^"]*"/ },
          { file: 'requirements.txt', pattern: /mysql/i },
          { file: 'pom.xml', pattern: /mysql/ },
        ],
      },
      confidence: 0.8,
    },
    
    // Docker patterns
    {
      deployment: 'docker',
      patterns: {
        files: ['Dockerfile', 'docker-compose.yml', 'docker-compose.yaml', '.dockerignore'],
      },
      confidence: 0.9,
    },
  ];

  /**
   * Analyze a project to detect tech stack and architecture
   */
  async analyzeProject(projectPath: string): Promise<ProjectAnalysis> {
    try {
      // Read project structure
      const fileTree = await this.buildFileTree(projectPath);
      
      // Detect tech stack using both pattern matching and AST analysis
      const techStack = await this.detectTechStack(fileTree, projectPath);
      
      // Perform deep code analysis using AST parsing
      await this.performDeepCodeAnalysis(fileTree, projectPath, techStack);
      
      // Analyze dependencies
      const dependencies = await this.analyzeDependencies(projectPath, techStack);
      
      // Detect architecture
      const architecture = this.detectArchitecture(fileTree, techStack);
      
      // Find entry points
      const entryPoints = this.findEntryPoints(fileTree, techStack);
      
      // Analyze database schema if applicable
      const databaseSchema = await this.analyzeDatabaseSchema(projectPath, techStack);

      return {
        techStack,
        architecture,
        dependencies,
        entryPoints,
        databaseSchema,
      };
    } catch (error) {
      this.logger.error('Error analyzing project:', error);
      throw new Error(`Failed to analyze project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Detect tech stack from file patterns and content
   */
  async detectTechStack(fileTree: FileTree, projectPath: string): Promise<TechStack> {
    const detectedTech: Partial<TechStack> = {
      additional: {},
    };
    
    const allFiles = this.getAllFiles(fileTree);
    const fileNames = allFiles.map(f => f.name.toLowerCase());
    const filePaths = allFiles.map(f => f.path.toLowerCase());
    
    // Score each pattern
    const patternScores: Array<{ pattern: TechStackPattern; score: number }> = [];
    
    for (const pattern of this.techStackPatterns) {
      let score = 0;
      
      // Check file patterns
      for (const filePattern of pattern.patterns.files) {
        if (filePattern.includes('*')) {
          const regex = new RegExp(filePattern.replace(/\*/g, '.*'));
          if (fileNames.some(name => regex.test(name))) {
            score += 0.3;
          }
        } else {
          if (fileNames.includes(filePattern.toLowerCase())) {
            score += 0.5;
          }
        }
      }
      
      // Check directory patterns
      if (pattern.patterns.directories) {
        for (const dirPattern of pattern.patterns.directories) {
          if (filePaths.some(path => path.includes(dirPattern.toLowerCase()))) {
            score += 0.2;
          }
        }
      }
      
      // Check content patterns
      if (pattern.patterns.content) {
        for (const contentPattern of pattern.patterns.content) {
          try {
            const filePath = path.join(projectPath, contentPattern.file);
            const content = await fs.readFile(filePath, 'utf-8');
            if (contentPattern.pattern.test(content)) {
              score += 0.4;
            }
          } catch (error) {
            // File doesn't exist or can't be read, skip
          }
        }
      }
      
      if (score > 0) {
        patternScores.push({ pattern, score: score * pattern.confidence });
      }
    }
    
    // Sort by score and apply detected technologies
    patternScores.sort((a, b) => b.score - a.score);
    
    for (const { pattern, score } of patternScores) {
      if (score >= 0.3) { // Minimum confidence threshold
        if (pattern.language && (!detectedTech.language || pattern.language === 'typescript')) {
          // Prefer TypeScript over JavaScript if both are detected
          detectedTech.language = pattern.language;
        }
        if (pattern.framework && !detectedTech.framework) {
          detectedTech.framework = pattern.framework;
        }
        if (pattern.database && !detectedTech.database) {
          detectedTech.database = pattern.database;
        }
        if (pattern.runtime && !detectedTech.runtime) {
          detectedTech.runtime = pattern.runtime;
        }
        if (pattern.buildTool && !detectedTech.buildTool) {
          detectedTech.buildTool = pattern.buildTool;
        }
        if (pattern.packageManager && !detectedTech.packageManager) {
          detectedTech.packageManager = pattern.packageManager;
        }
        if (pattern.deployment && !detectedTech.deployment) {
          detectedTech.deployment = pattern.deployment;
        }
      }
    }
    
    // Set defaults if nothing detected
    if (!detectedTech.language) {
      detectedTech.language = 'unknown';
    }
    
    return detectedTech as TechStack;
  }

  /**
   * Perform deep code analysis using AST parsing
   */
  private async performDeepCodeAnalysis(
    fileTree: FileTree, 
    projectPath: string, 
    techStack: TechStack
  ): Promise<void> {
    const codeFiles = this.getAllFiles(fileTree).filter(file => 
      this.isCodeFile(file.name)
    );

    const analysisResults: CodeAnalysisResult[] = [];

    for (const file of codeFiles.slice(0, 20)) { // Limit to first 20 files for performance
      try {
        const filePath = path.join(projectPath, file.path);
        const content = await fs.readFile(filePath, 'utf-8');
        
        let result: CodeAnalysisResult;
        
        if (this.isJavaScriptFile(file.name)) {
          result = ASTParser.analyzeJavaScript(content, file.name);
        } else if (this.isPythonFile(file.name)) {
          result = ASTParser.analyzePython(content, file.name);
        } else {
          continue; // Skip unsupported file types
        }
        
        analysisResults.push(result);
        
        // Update tech stack based on AST analysis
        this.updateTechStackFromAST(techStack, result, file.name);
        
      } catch (error) {
        this.logger.warn(`Error analyzing file ${file.path}:`, error);
      }
    }

    // Store analysis results in tech stack additional info
    if (analysisResults.length > 0) {
        techStack.additional.astAnalysis = JSON.stringify({
            totalFiles: analysisResults.length,
            totalComplexity: analysisResults.reduce((sum, r) => sum + r.complexity, 0),
            totalLinesOfCode: analysisResults.reduce((sum, r) => sum + r.linesOfCode, 0),
            commonDependencies: this.findCommonDependencies(analysisResults),
          });
          
    }
  }

  /**
   * Update tech stack information based on AST analysis
   */
  private updateTechStackFromAST(
    techStack: TechStack, 
    astResult: CodeAnalysisResult, 
    filename: string
  ): void {
    // Detect frameworks from imports
    for (const importInfo of astResult.imports) {
      const module = importInfo.module.toLowerCase();
      
      if (module === 'react' || module.startsWith('react/')) {
        if (!techStack.framework || techStack.framework === 'unknown') {
          techStack.framework = 'react';
        }
      } else if (module === 'next' || module.startsWith('next/')) {
        techStack.framework = 'nextjs';
      }
    }
  }

  /**
   * Find common dependencies across analyzed files
   */
  private findCommonDependencies(results: CodeAnalysisResult[]): string[] {
    const dependencyCount: Record<string, number> = {};
    
    for (const result of results) {
      for (const dep of result.dependencies) {
        dependencyCount[dep] = (dependencyCount[dep] || 0) + 1;
      }
    }
    
    // Return dependencies that appear in at least 25% of files
    const threshold = Math.max(1, Math.floor(results.length * 0.25));
    return Object.entries(dependencyCount)
      .filter(([_, count]) => count >= threshold)
      .map(([dep, _]) => dep)
      .slice(0, 10); // Limit to top 10
  }

  /**
   * Analyze project dependencies from various manifest files
   */
  async analyzeDependencies(projectPath: string, techStack: TechStack): Promise<Dependency[]> {
    const dependencies: Dependency[] = [];
    
    try {
      // JavaScript/TypeScript dependencies
      if (techStack.language === 'javascript' || techStack.language === 'typescript') {
        const packageJsonDeps = await this.parsePackageJson(projectPath);
        dependencies.push(...packageJsonDeps);
      }
      
      // Python dependencies
      if (techStack.language === 'python') {
        const pythonDeps = await this.parsePythonDependencies(projectPath);
        dependencies.push(...pythonDeps);
      }
      
      // Java dependencies
      if (techStack.language === 'java') {
        const javaDeps = await this.parseJavaDependencies(projectPath);
        dependencies.push(...javaDeps);
      }
      
      // Go dependencies
      if (techStack.language === 'go') {
        const goDeps = await this.parseGoDependencies(projectPath);
        dependencies.push(...goDeps);
      }
      
      // Rust dependencies
      if (techStack.language === 'rust') {
        const rustDeps = await this.parseRustDependencies(projectPath);
        dependencies.push(...rustDeps);
      }
      
    } catch (error) {
      this.logger.warn('Error analyzing dependencies:', error);
    }
    
    return dependencies;
  }

  /**
   * Parse package.json for JavaScript/TypeScript dependencies
   */
  private async parsePackageJson(projectPath: string): Promise<Dependency[]> {
    const dependencies: Dependency[] = [];
    
    try {
      const packageJsonPath = path.join(projectPath, 'package.json');
      const content = await fs.readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(content);
      
      // Runtime dependencies
      if (packageJson.dependencies) {
        for (const [name, version] of Object.entries(packageJson.dependencies)) {
          dependencies.push({
            name,
            version: version as string,
            type: 'runtime',
            source: 'package.json',
          });
        }
      }
      
      // Development dependencies
      if (packageJson.devDependencies) {
        for (const [name, version] of Object.entries(packageJson.devDependencies)) {
          dependencies.push({
            name,
            version: version as string,
            type: 'dev',
            source: 'package.json',
          });
        }
      }
      
      // Peer dependencies
      if (packageJson.peerDependencies) {
        for (const [name, version] of Object.entries(packageJson.peerDependencies)) {
          dependencies.push({
            name,
            version: version as string,
            type: 'peer',
            source: 'package.json',
          });
        }
      }
      
    } catch (error) {
      // File doesn't exist or invalid JSON
    }
    
    return dependencies;
  }

  /**
   * Parse Python dependencies from requirements.txt
   */
  private async parsePythonDependencies(projectPath: string): Promise<Dependency[]> {
    const dependencies: Dependency[] = [];
    
    // Parse requirements.txt
    try {
      const requirementsPath = path.join(projectPath, 'requirements.txt');
      const content = await fs.readFile(requirementsPath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));
      
      for (const line of lines) {
        const match = line.match(/^([a-zA-Z0-9_-]+)([>=<~!]+)?([\d.]+.*)?/);
        if (match) {
          dependencies.push({
            name: match[1],
            version: match[3] || 'latest',
            type: 'runtime',
            source: 'requirements.txt',
          });
        }
      }
    } catch (error) {
      // File doesn't exist
    }
    
    return dependencies;
  }

  /**
   * Parse Java dependencies from pom.xml
   */
  private async parseJavaDependencies(projectPath: string): Promise<Dependency[]> {
    const dependencies: Dependency[] = [];
    
    try {
      const pomPath = path.join(projectPath, 'pom.xml');
      const content = await fs.readFile(pomPath, 'utf-8');
      
      // Simple XML parsing for dependencies
      const dependencyMatches = content.matchAll(/<dependency>([\s\S]*?)<\/dependency>/g);
      
      for (const match of dependencyMatches) {
        const depContent = match[1];
        const groupIdMatch = depContent.match(/<groupId>(.*?)<\/groupId>/);
        const artifactIdMatch = depContent.match(/<artifactId>(.*?)<\/artifactId>/);
        const versionMatch = depContent.match(/<version>(.*?)<\/version>/);
        const scopeMatch = depContent.match(/<scope>(.*?)<\/scope>/);
        
        if (groupIdMatch && artifactIdMatch) {
          const name = `${groupIdMatch[1]}:${artifactIdMatch[1]}`;
          const version = versionMatch ? versionMatch[1] : 'latest';
          const scope = scopeMatch ? scopeMatch[1] : 'compile';
          
          dependencies.push({
            name,
            version,
            type: scope === 'test' ? 'dev' : 'runtime',
            source: 'pom.xml',
          });
        }
      }
    } catch (error) {
      // File doesn't exist or parsing error
    }
    
    return dependencies;
  }

  /**
   * Parse Go dependencies from go.mod
   */
  private async parseGoDependencies(projectPath: string): Promise<Dependency[]> {
    const dependencies: Dependency[] = [];
    
    try {
      const goModPath = path.join(projectPath, 'go.mod');
      const content = await fs.readFile(goModPath, 'utf-8');
      
      const lines = content.split('\n');
      let inRequireBlock = false;
      
      for (const line of lines) {
        const trimmed = line.trim();
        
        if (trimmed === 'require (') {
          inRequireBlock = true;
          continue;
        }
        
        if (trimmed === ')' && inRequireBlock) {
          inRequireBlock = false;
          continue;
        }
        
        if (inRequireBlock || trimmed.startsWith('require ')) {
          const match = trimmed.match(/^(?:require\s+)?([^\s]+)\s+([^\s]+)/);
          if (match) {
            dependencies.push({
              name: match[1],
              version: match[2],
              type: 'runtime',
              source: 'go.mod',
            });
          }
        }
      }
    } catch (error) {
      // File doesn't exist or parsing error
    }
    
    return dependencies;
  }

  /**
   * Parse Rust dependencies from Cargo.toml
   */
  private async parseRustDependencies(projectPath: string): Promise<Dependency[]> {
    const dependencies: Dependency[] = [];
    
    try {
      const cargoPath = path.join(projectPath, 'Cargo.toml');
      const content = await fs.readFile(cargoPath, 'utf-8');
      
      // Parse [dependencies] section
      const depsMatch = content.match(/\[dependencies\]([\s\S]*?)(?=\[|$)/);
      if (depsMatch) {
        const depsSection = depsMatch[1];
        const depLines = depsSection.split('\n').filter(line => line.includes('='));
        
        for (const line of depLines) {
          const match = line.match(/^([a-zA-Z0-9_-]+)\s*=\s*"([^"]+)"/);
          if (match) {
            dependencies.push({
              name: match[1],
              version: match[2],
              type: 'runtime',
              source: 'Cargo.toml',
            });
          }
        }
      }
      
      // Parse [dev-dependencies] section
      const devDepsMatch = content.match(/\[dev-dependencies\]([\s\S]*?)(?=\[|$)/);
      if (devDepsMatch) {
        const depsSection = devDepsMatch[1];
        const depLines = depsSection.split('\n').filter(line => line.includes('='));
        
        for (const line of depLines) {
          const match = line.match(/^([a-zA-Z0-9_-]+)\s*=\s*"([^"]+)"/);
          if (match) {
            dependencies.push({
              name: match[1],
              version: match[2],
              type: 'dev',
              source: 'Cargo.toml',
            });
          }
        }
      }
    } catch (error) {
      // File doesn't exist or parsing error
    }
    
    return dependencies;
  }

  /**
   * Detect project architecture based on file structure and tech stack
   */
  private detectArchitecture(fileTree: FileTree, techStack: TechStack): ArchitectureType {
    const allFiles = this.getAllFiles(fileTree);
    const filePaths = allFiles.map(f => f.path.toLowerCase());
    
    // Check for microservices patterns
    if (filePaths.some(path => path.includes('docker-compose') || path.includes('kubernetes'))) {
      const serviceDirectories = fileTree.children?.filter(child => 
        child.type === 'directory' && 
        child.children?.some(subChild => 
          subChild.name.toLowerCase().includes('service') ||
          subChild.name === 'Dockerfile'
        )
      );
      
      if (serviceDirectories && serviceDirectories.length > 1) {
        return 'microservices';
      }
    }
    
    // Check for SSR patterns
    if (techStack.framework === 'nextjs') {
      return 'ssr';
    }
    
    // Check for SPA patterns
    if (techStack.framework === 'react' || 
        techStack.framework === 'vue' || 
        techStack.framework === 'angular') {
      const hasBackend = filePaths.some(path => 
        path.includes('server') || 
        path.includes('backend') ||
        path.includes('api')
      );
      
      if (!hasBackend) {
        return 'spa';
      } else {
        return 'fullstack';
      }
    }
    
    // Check for API-only patterns
    if (filePaths.some(path => path.includes('api') || path.includes('routes'))) {
      const hasUI = filePaths.some(path => 
        path.includes('public') || 
        path.includes('views') || 
        path.includes('components') ||
        path.includes('pages')
      );
      
      if (!hasUI) {
        return 'api';
      }
    }
    
    return 'monolith';
  }

  /**
   * Find entry points for the application
   */
  private findEntryPoints(fileTree: FileTree, techStack: TechStack): string[] {
    const entryPoints: string[] = [];
    const allFiles = this.getAllFiles(fileTree);
    
    // Common entry point patterns by language/framework
    const entryPatterns: Record<string, string[]> = {
      javascript: ['index.js', 'app.js', 'main.js', 'server.js'],
      typescript: ['index.ts', 'app.ts', 'main.ts', 'server.ts'],
      python: ['main.py', 'app.py', 'manage.py', '__main__.py'],
      java: ['Main.java', 'Application.java'],
      go: ['main.go'],
      rust: ['main.rs'],
      php: ['index.php', 'app.php'],
    };
    
    // Framework-specific patterns
    const frameworkPatterns: Record<string, string[]> = {
      nextjs: ['pages/_app.js', 'pages/_app.tsx', 'app/layout.tsx'],
      react: ['src/index.js', 'src/index.tsx', 'src/App.js', 'src/App.tsx'],
      vue: ['src/main.js', 'src/main.ts', 'src/App.vue'],
      angular: ['src/main.ts', 'src/app/app.module.ts'],
      django: ['manage.py', 'wsgi.py'],
      flask: ['app.py', 'run.py'],
      express: ['server.js', 'app.js', 'index.js'],
    };
    
    // Check language patterns
    if (techStack.language && entryPatterns[techStack.language]) {
      for (const pattern of entryPatterns[techStack.language]) {
        const found = allFiles.find(file => 
          file.name.toLowerCase() === pattern.toLowerCase()
        );
        if (found) {
          entryPoints.push(found.path);
        }
      }
    }
    
    // Check framework patterns
    if (techStack.framework && frameworkPatterns[techStack.framework]) {
      for (const pattern of frameworkPatterns[techStack.framework]) {
        const found = allFiles.find(file => 
          file.path.toLowerCase() === pattern.toLowerCase()
        );
        if (found) {
          entryPoints.push(found.path);
        }
      }
    }
    
    // If no specific entry points found, look for common patterns
    if (entryPoints.length === 0) {
      const commonEntries = allFiles.filter(file => 
        file.name.toLowerCase().includes('main') ||
        file.name.toLowerCase().includes('index') ||
        file.name.toLowerCase().includes('app')
      );
      
      entryPoints.push(...commonEntries.slice(0, 3).map(f => f.path));
    }
    
    return entryPoints;
  }

  /**
   * Analyze database schema from SQL files and migrations
   */
  private async analyzeDatabaseSchema(projectPath: string, techStack: TechStack): Promise<DatabaseSchema | undefined> {
    if (!techStack.database) {
      return undefined;
    }
    
    return undefined; // Simplified for now
  }

  /**
   * Build file tree structure from project path
   */
  private async buildFileTree(projectPath: string, relativePath = ''): Promise<FileTree> {
    const fullPath = path.join(projectPath, relativePath);
    const stats = await fs.stat(fullPath);
    const name = path.basename(fullPath);
    
    if (stats.isDirectory()) {
      const children: FileTree[] = [];
      
      try {
        const entries = await fs.readdir(fullPath);
        
        for (const entry of entries) {
          // Skip common ignore patterns
          if (this.shouldIgnoreFile(entry)) {
            continue;
          }
          
          const childPath = path.join(relativePath, entry);
          const child = await this.buildFileTree(projectPath, childPath);
          children.push(child);
        }
      } catch (error) {
        // Permission denied or other error, skip
      }
      
      return {
        name,
        type: 'directory',
        path: relativePath || '.',
        children,
        metadata: {
          size: 0,
          lastModified: stats.mtime,
        },
      };
    } else {
      let content: string | undefined;
      
      // Read content for text files under 1MB
      if (stats.size < 1024 * 1024 && this.isTextFile(name)) {
        try {
          content = await fs.readFile(fullPath, 'utf-8');
        } catch (error) {
          // Can't read file, skip content
        }
      }
      
      return {
        name,
        type: 'file',
        path: relativePath,
        content,
        metadata: {
          size: stats.size,
          lastModified: stats.mtime,
        },
      };
    }
  }

  /**
   * Get all files from file tree recursively
   */
  private getAllFiles(fileTree: FileTree): FileTree[] {
    const files: FileTree[] = [];
    
    if (fileTree.type === 'file') {
      files.push(fileTree);
    } else if (fileTree.children) {
      for (const child of fileTree.children) {
        files.push(...this.getAllFiles(child));
      }
    }
    
    return files;
  }

  /**
   * Check if file should be ignored
   */
  private shouldIgnoreFile(fileName: string): boolean {
    const ignorePatterns = [
      '.git',
      '.svn',
      '.hg',
      'node_modules',
      '__pycache__',
      '.pytest_cache',
      'target',
      'build',
      'dist',
      '.DS_Store',
      'Thumbs.db',
      '*.log',
      '.env.local',
      '.env.*.local',
    ];
    
    return ignorePatterns.some(pattern => {
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(fileName);
      }
      return fileName === pattern;
    });
  }

  /**
   * Check if file is likely a text file
   */
  private isTextFile(fileName: string): boolean {
    const textExtensions = [
      '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.go', '.rs', '.php', '.rb',
      '.html', '.css', '.scss', '.sass', '.less', '.xml', '.json', '.yaml', '.yml',
      '.md', '.txt', '.sql', '.sh', '.bat', '.ps1', '.dockerfile', '.gitignore',
      '.env', '.config', '.conf', '.ini', '.toml', '.lock',
    ];
    
    const ext = path.extname(fileName).toLowerCase();
    return textExtensions.includes(ext) || !path.extname(fileName);
  }

  /**
   * Check if file is a JavaScript/TypeScript file
   */
  private isJavaScriptFile(filename: string): boolean {
    const jsExtensions = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'];
    return jsExtensions.some(ext => filename.toLowerCase().endsWith(ext));
  }

  /**
   * Check if file is a Python file
   */
  private isPythonFile(filename: string): boolean {
    return filename.toLowerCase().endsWith('.py');
  }

  /**
   * Check if file is a code file that can be analyzed
   */
  private isCodeFile(filename: string): boolean {
    return this.isJavaScriptFile(filename) || 
           this.isPythonFile(filename) ||
           filename.toLowerCase().endsWith('.java') ||
           filename.toLowerCase().endsWith('.go') ||
           filename.toLowerCase().endsWith('.rs') ||
           filename.toLowerCase().endsWith('.php');
  }
}