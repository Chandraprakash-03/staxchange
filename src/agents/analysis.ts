// Analysis Agent - Analyzes source code and provides insights

import { BaseAgent } from './base';
import { AgentContext, AgentResult } from './types';
import { ConversionTask, TechStack, FileTree } from '../types';

export class AnalysisAgent extends BaseAgent {
  constructor() {
    super('AnalysisAgent', 'analysis', ['analysis', 'code_analysis', 'dependency_analysis']);
  }

  async execute(task: ConversionTask, context: AgentContext): Promise<AgentResult> {
    try {
      switch (task.type) {
        case 'analysis':
          return await this.performCodeAnalysis(task, context);
        default:
          return this.createErrorResult(`Unsupported task type: ${task.type}`);
      }
    } catch (error) {
      return this.createErrorResult(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async performCodeAnalysis(task: ConversionTask, context: AgentContext): Promise<AgentResult> {
    const analysis = {
      sourceStructure: this.analyzeProjectStructure(context.sourceFiles),
      dependencies: this.analyzeDependencies(context.sourceFiles),
      codeComplexity: this.analyzeCodeComplexity(task.inputFiles, context),
      techStackCompatibility: this.analyzeTechStackCompatibility(
        context.sourceTechStack, 
        context.targetTechStack
      ),
      conversionChallenges: this.identifyConversionChallenges(
        context.sourceTechStack, 
        context.targetTechStack,
        context.sourceFiles
      )
    };

    return this.createSuccessResult(analysis, undefined, {
      analysisType: 'code_analysis',
      timestamp: new Date().toISOString(),
      confidence: this.calculateConfidence(analysis)
    });
  }

  private analyzeProjectStructure(fileTree: FileTree): any {
    const structure = {
      totalFiles: 0,
      directories: 0,
      fileTypes: new Map<string, number>(),
      entryPoints: [] as string[],
      configFiles: [] as string[]
    };

    this.traverseFileTree(fileTree, (file) => {
      if (file.type === 'file') {
        structure.totalFiles++;
        const ext = this.getFileExtension(file.name);
        structure.fileTypes.set(ext, (structure.fileTypes.get(ext) || 0) + 1);
        
        // Identify entry points
        if (this.isEntryPoint(file.name, file.path)) {
          structure.entryPoints.push(file.path);
        }
        
        // Identify config files
        if (this.isConfigFile(file.name)) {
          structure.configFiles.push(file.path);
        }
      } else {
        structure.directories++;
      }
    });

    return {
      ...structure,
      fileTypes: Object.fromEntries(structure.fileTypes)
    };
  }

  private analyzeDependencies(fileTree: FileTree): any {
    const dependencies = {
      runtime: [] as string[],
      dev: [] as string[],
      peer: [] as string[],
      packageManagers: [] as string[]
    };

    this.traverseFileTree(fileTree, (file) => {
      if (file.type === 'file' && file.content) {
        if (file.name === 'package.json') {
          const packageData = this.parsePackageJson(file.content);
          if (packageData) {
            dependencies.runtime.push(...Object.keys(packageData.dependencies || {}));
            dependencies.dev.push(...Object.keys(packageData.devDependencies || {}));
            dependencies.peer.push(...Object.keys(packageData.peerDependencies || {}));
          }
        } else if (file.name === 'requirements.txt') {
          dependencies.runtime.push(...this.parseRequirementsTxt(file.content));
        } else if (file.name === 'Gemfile') {
          dependencies.runtime.push(...this.parseGemfile(file.content));
        }
      }
    });

    return dependencies;
  }

  private analyzeCodeComplexity(inputFiles: string[], context: AgentContext): any {
    let totalLines = 0;
    let codeLines = 0;
    let commentLines = 0;
    const complexityMetrics = {
      cyclomaticComplexity: 0,
      nestingDepth: 0,
      functionCount: 0
    };

    for (const filePath of inputFiles) {
      const file = this.findFileInTree(context.sourceFiles, filePath);
      if (file && file.content) {
        const fileMetrics = this.analyzeFileComplexity(file.content, file.name);
        totalLines += fileMetrics.totalLines;
        codeLines += fileMetrics.codeLines;
        commentLines += fileMetrics.commentLines;
        complexityMetrics.cyclomaticComplexity += fileMetrics.cyclomaticComplexity;
        complexityMetrics.nestingDepth = Math.max(complexityMetrics.nestingDepth, fileMetrics.nestingDepth);
        complexityMetrics.functionCount += fileMetrics.functionCount;
      }
    }

    return {
      totalLines,
      codeLines,
      commentLines,
      ...complexityMetrics,
      maintainabilityIndex: this.calculateMaintainabilityIndex(complexityMetrics, codeLines)
    };
  }

  private analyzeTechStackCompatibility(source: TechStack, target: TechStack): any {
    const compatibility = {
      language: this.getLanguageCompatibility(source.language, target.language),
      framework: this.getFrameworkCompatibility(source.framework, target.framework),
      database: this.getDatabaseCompatibility(source.database, target.database),
      overallScore: 0,
      challenges: [] as string[],
      recommendations: [] as string[]
    };

    compatibility.overallScore = (
      compatibility.language.score + 
      compatibility.framework.score + 
      compatibility.database.score
    ) / 3;

    if (compatibility.overallScore < 0.7) {
      compatibility.challenges.push('Low compatibility between source and target stacks');
    }

    return compatibility;
  }

  private identifyConversionChallenges(source: TechStack, target: TechStack, fileTree: FileTree): string[] {
    const challenges: string[] = [];

    // Language-specific challenges
    if (source.language !== target.language) {
      challenges.push(`Language conversion from ${source.language} to ${target.language}`);
    }

    // Framework-specific challenges
    if (source.framework !== target.framework) {
      challenges.push(`Framework migration from ${source.framework} to ${target.framework}`);
    }

    // Database challenges
    if (source.database !== target.database) {
      challenges.push(`Database migration from ${source.database} to ${target.database}`);
    }

    return challenges;
  }

  // Helper methods
  private traverseFileTree(tree: FileTree, callback: (file: FileTree) => void): void {
    callback(tree);
    if (tree.children) {
      tree.children.forEach(child => this.traverseFileTree(child, callback));
    }
  }

  private getFileExtension(filename: string): string {
    return filename.split('.').pop() || '';
  }

  private isEntryPoint(filename: string, path: string): boolean {
    const entryPointPatterns = [
      'index.js', 'index.ts', 'main.js', 'main.ts', 'app.js', 'app.ts',
      'server.js', 'server.ts', '__init__.py', 'main.py'
    ];
    return entryPointPatterns.includes(filename) || path.includes('src/index');
  }

  private isConfigFile(filename: string): boolean {
    const configPatterns = [
      'package.json', 'tsconfig.json', 'webpack.config.js', 'vite.config.ts',
      'next.config.js', 'tailwind.config.js', '.env', 'docker-compose.yml'
    ];
    return configPatterns.some(pattern => filename.includes(pattern));
  }

  private parsePackageJson(content: string): any {
    try {
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  private parseRequirementsTxt(content: string): string[] {
    return content.split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'))
      .map(line => line.split('==')[0].split('>=')[0].split('<=')[0]);
  }

  private parseGemfile(content: string): string[] {
    const gems: string[] = [];
    const lines = content.split('\n');
    for (const line of lines) {
      const match = line.match(/gem\s+['"]([^'"]+)['"]/);
      if (match) {
        gems.push(match[1]);
      }
    }
    return gems;
  }

  private analyzeFileComplexity(content: string, filename: string): any {
    const lines = content.split('\n');
    const totalLines = lines.length;
    let codeLines = 0;
    let commentLines = 0;
    let cyclomaticComplexity = 1; // Base complexity
    let nestingDepth = 0;
    let currentDepth = 0;
    let functionCount = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (this.isCommentLine(trimmed, filename)) {
        commentLines++;
      } else {
        codeLines++;
        
        // Count complexity-increasing constructs
        if (this.isComplexityIncreasingConstruct(trimmed)) {
          cyclomaticComplexity++;
        }
        
        // Track nesting depth
        if (this.isBlockStart(trimmed)) {
          currentDepth++;
          nestingDepth = Math.max(nestingDepth, currentDepth);
        } else if (this.isBlockEnd(trimmed)) {
          currentDepth = Math.max(0, currentDepth - 1);
        }
        
        // Count functions
        if (this.isFunctionDeclaration(trimmed)) {
          functionCount++;
        }
      }
    }

    return {
      totalLines,
      codeLines,
      commentLines,
      cyclomaticComplexity,
      nestingDepth,
      functionCount
    };
  }

  private isCommentLine(line: string, filename: string): boolean {
    const ext = this.getFileExtension(filename);
    switch (ext) {
      case 'js':
      case 'ts':
      case 'jsx':
      case 'tsx':
        return line.startsWith('//') || line.startsWith('/*') || line.startsWith('*');
      case 'py':
        return line.startsWith('#');
      case 'rb':
        return line.startsWith('#');
      default:
        return false;
    }
  }

  private isComplexityIncreasingConstruct(line: string): boolean {
    const patterns = [
      /\bif\b/, /\belse\b/, /\bwhile\b/, /\bfor\b/, /\bswitch\b/, /\bcase\b/,
      /\btry\b/, /\bcatch\b/, /\b&&\b/, /\b\|\|\b/, /\?\s*:/
    ];
    return patterns.some(pattern => pattern.test(line));
  }

  private isBlockStart(line: string): boolean {
    return line.includes('{') || line.endsWith(':');
  }

  private isBlockEnd(line: string): boolean {
    return line.includes('}');
  }

  private isFunctionDeclaration(line: string): boolean {
    const patterns = [
      /\bfunction\b/, /\bdef\b/, /\basync\b.*=>/, /=>\s*{/, /\bclass\b/
    ];
    return patterns.some(pattern => pattern.test(line));
  }

  private getLanguageCompatibility(source?: string, target?: string): any {
    if (!source || !target) return { score: 0, notes: 'Missing language information' };
    
    const compatibilityMatrix: Record<string, Record<string, number>> = {
      'javascript': { 'typescript': 0.9, 'python': 0.3, 'java': 0.2 },
      'typescript': { 'javascript': 0.8, 'python': 0.3, 'java': 0.4 },
      'python': { 'javascript': 0.4, 'typescript': 0.4, 'java': 0.5 },
      'java': { 'javascript': 0.3, 'typescript': 0.4, 'python': 0.5 }
    };

    const score = compatibilityMatrix[source.toLowerCase()]?.[target.toLowerCase()] || 0.1;
    return {
      score,
      notes: score > 0.7 ? 'High compatibility' : score > 0.4 ? 'Medium compatibility' : 'Low compatibility'
    };
  }

  private getFrameworkCompatibility(source?: string, target?: string): any {
    if (!source || !target) return { score: 1, notes: 'No framework specified' };
    
    const score = source.toLowerCase() === target.toLowerCase() ? 1 : 0.5;
    return {
      score,
      notes: score === 1 ? 'Same framework' : 'Framework migration required'
    };
  }

  private getDatabaseCompatibility(source?: string, target?: string): any {
    if (!source || !target) return { score: 1, notes: 'No database specified' };
    
    const score = source.toLowerCase() === target.toLowerCase() ? 1 : 0.6;
    return {
      score,
      notes: score === 1 ? 'Same database' : 'Database migration required'
    };
  }

  private calculateMaintainabilityIndex(complexity: any, codeLines: number): number {
    // Simplified maintainability index calculation
    const volume = codeLines * Math.log2(complexity.functionCount || 1);
    const cyclomatic = complexity.cyclomaticComplexity;
    return Math.max(0, 171 - 5.2 * Math.log(volume) - 0.23 * cyclomatic - 16.2 * Math.log(codeLines || 1));
  }

  private calculateConfidence(analysis: any): number {
    // Calculate confidence based on analysis completeness
    let confidence = 0.5; // Base confidence
    
    if (analysis.sourceStructure.totalFiles > 0) confidence += 0.2;
    if (analysis.dependencies.runtime.length > 0) confidence += 0.1;
    if (analysis.techStackCompatibility.overallScore > 0.5) confidence += 0.2;
    
    return Math.min(1, confidence);
  }
}