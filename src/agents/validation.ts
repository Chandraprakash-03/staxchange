// Validation Agent - Validates converted code for syntax, structure, and functionality

import { BaseAgent } from './base';
import { AgentContext, AgentResult } from './types';
import { ConversionTask } from '../types';

export class ValidationAgent extends BaseAgent {
  constructor() {
    super('ValidationAgent', 'validation', ['validation', 'syntax_check', 'structure_validation']);
  }

  async execute(task: ConversionTask, context: AgentContext): Promise<AgentResult> {
    try {
      switch (task.type) {
        case 'validation':
          return await this.performValidation(task, context);
        default:
          return this.createErrorResult(`Unsupported task type: ${task.type}`);
      }
    } catch (error) {
      return this.createErrorResult(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async performValidation(task: ConversionTask, context: AgentContext): Promise<AgentResult> {
    const validationResults = {
      syntaxValidation: await this.validateSyntax(task.inputFiles, context),
      structureValidation: await this.validateStructure(task.inputFiles, context),
      dependencyValidation: await this.validateDependencies(task.inputFiles, context),
      functionalityValidation: await this.validateFunctionality(task.inputFiles, context),
      overallScore: 0,
      issues: [] as Array<{ type: string; severity: 'error' | 'warning' | 'info'; message: string; file?: string }>,
      recommendations: [] as string[]
    };

    // Calculate overall validation score
    validationResults.overallScore = this.calculateOverallScore(validationResults);

    // Generate recommendations based on validation results
    validationResults.recommendations = this.generateRecommendations(validationResults);

    const isValid = validationResults.overallScore >= 0.8 && 
                   !validationResults.issues.some(issue => issue.severity === 'error');

    return this.createSuccessResult(
      {
        isValid,
        score: validationResults.overallScore,
        ...validationResults
      },
      undefined,
      {
        validationType: task.context?.validationType || 'comprehensive',
        targetTechStack: context.targetTechStack.language
      }
    );
  }

  private async validateSyntax(filePaths: string[], context: AgentContext): Promise<any> {
    const results = {
      totalFiles: filePaths.length,
      validFiles: 0,
      invalidFiles: 0,
      errors: [] as Array<{ file: string; line?: number; message: string }>,
      score: 0
    };

    for (const filePath of filePaths) {
      const file = this.findFileInTree(context.sourceFiles, filePath);
      if (!file || !file.content) continue;

      const syntaxCheck = await this.checkFileSyntax(file.content, filePath, context.targetTechStack.language);
      
      if (syntaxCheck.isValid) {
        results.validFiles++;
      } else {
        results.invalidFiles++;
        results.errors.push(...syntaxCheck.errors.map(error => ({
          file: filePath,
          line: error.line,
          message: error.message
        })));
      }
    }

    results.score = results.totalFiles > 0 ? results.validFiles / results.totalFiles : 1;
    return results;
  }

  private async validateStructure(filePaths: string[], context: AgentContext): Promise<any> {
    const results = {
      projectStructure: this.validateProjectStructure(filePaths, context.targetTechStack),
      moduleStructure: this.validateModuleStructure(filePaths, context),
      importExports: this.validateImportExports(filePaths, context),
      score: 0
    };

    // Calculate structure score based on various factors
    const structureScores = [
      results.projectStructure.score,
      results.moduleStructure.score,
      results.importExports.score
    ];

    results.score = structureScores.reduce((sum, score) => sum + score, 0) / structureScores.length;
    return results;
  }

  private async validateDependencies(filePaths: string[], context: AgentContext): Promise<any> {
    const results = {
      missingDependencies: [] as string[],
      unusedDependencies: [] as string[],
      versionConflicts: [] as Array<{ dependency: string; conflicts: string[] }>,
      compatibilityIssues: [] as Array<{ dependency: string; issue: string }>,
      score: 0
    };

    // Find package files
    const packageFiles = filePaths.filter(path => this.isPackageFile(path));
    
    for (const packageFile of packageFiles) {
      const file = this.findFileInTree(context.sourceFiles, packageFile);
      if (!file || !file.content) continue;

      const dependencyAnalysis = this.analyzeDependencies(file.content, packageFile);
      
      // Check for missing dependencies by analyzing import statements
      const usedDependencies = this.extractUsedDependencies(filePaths, context);
      const declaredDependencies = dependencyAnalysis.dependencies;
      
      const missing = usedDependencies.filter(dep => !declaredDependencies.includes(dep));
      const unused = declaredDependencies.filter(dep => !usedDependencies.includes(dep));
      
      results.missingDependencies.push(...missing);
      results.unusedDependencies.push(...unused);
    }

    // Calculate dependency score
    const totalIssues = results.missingDependencies.length + 
                       results.unusedDependencies.length + 
                       results.versionConflicts.length + 
                       results.compatibilityIssues.length;
    
    results.score = totalIssues === 0 ? 1 : Math.max(0, 1 - (totalIssues * 0.1));
    return results;
  }

  private async validateFunctionality(filePaths: string[], context: AgentContext): Promise<any> {
    const results = {
      functionSignatures: this.validateFunctionSignatures(filePaths, context),
      dataFlow: this.validateDataFlow(filePaths, context),
      errorHandling: this.validateErrorHandling(filePaths, context),
      testCoverage: this.assessTestCoverage(filePaths, context),
      score: 0
    };

    // Calculate functionality score
    const functionalityScores = [
      results.functionSignatures.score,
      results.dataFlow.score,
      results.errorHandling.score,
      results.testCoverage.score
    ];

    results.score = functionalityScores.reduce((sum, score) => sum + score, 0) / functionalityScores.length;
    return results;
  }

  private async checkFileSyntax(content: string, filePath: string, language: string): Promise<any> {
    const result = {
      isValid: true,
      errors: [] as Array<{ line?: number; message: string }>
    };

    try {
      switch (language.toLowerCase()) {
        case 'javascript':
        case 'typescript':
          return this.validateJavaScriptSyntax(content, filePath);
        case 'python':
          return this.validatePythonSyntax(content, filePath);
        default:
          // Basic validation for unsupported languages
          return this.validateGenericSyntax(content, filePath);
      }
    } catch (error) {
      result.isValid = false;
      result.errors.push({
        message: `Syntax validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }

    return result;
  }

  private validateJavaScriptSyntax(content: string, filePath: string): any {
    const result = { isValid: true, errors: [] as Array<{ line?: number; message: string }> };

    try {
      // Basic syntax checks for JavaScript/TypeScript
      const lines = content.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const lineNumber = i + 1;

        // Check for common syntax errors
        if (this.hasUnmatchedBrackets(line)) {
          result.errors.push({
            line: lineNumber,
            message: 'Unmatched brackets detected'
          });
        }

        if (this.hasInvalidSemicolon(line)) {
          result.errors.push({
            line: lineNumber,
            message: 'Invalid semicolon usage'
          });
        }

        if (this.hasInvalidImport(line)) {
          result.errors.push({
            line: lineNumber,
            message: 'Invalid import statement'
          });
        }
      }

      // Check overall structure
      if (!this.hasValidBracketBalance(content)) {
        result.errors.push({
          message: 'Unbalanced brackets in file'
        });
      }

      result.isValid = result.errors.length === 0;
    } catch (error) {
      result.isValid = false;
      result.errors.push({
        message: `JavaScript syntax validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }

    return result;
  }

  private validatePythonSyntax(content: string, filePath: string): any {
    const result = { isValid: true, errors: [] as Array<{ line?: number; message: string }> };

    try {
      const lines = content.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNumber = i + 1;

        // Check indentation consistency
        if (this.hasInconsistentIndentation(line, i, lines)) {
          result.errors.push({
            line: lineNumber,
            message: 'Inconsistent indentation'
          });
        }

        // Check for invalid syntax patterns
        if (this.hasInvalidPythonSyntax(line.trim())) {
          result.errors.push({
            line: lineNumber,
            message: 'Invalid Python syntax'
          });
        }
      }

      result.isValid = result.errors.length === 0;
    } catch (error) {
      result.isValid = false;
      result.errors.push({
        message: `Python syntax validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }

    return result;
  }

  private validateGenericSyntax(content: string, filePath: string): any {
    return {
      isValid: true,
      errors: [],
      note: 'Generic validation - limited syntax checking available'
    };
  }

  private validateProjectStructure(filePaths: string[], targetTechStack: any): any {
    const expectedStructure = this.getExpectedProjectStructure(targetTechStack);
    const actualStructure = this.analyzeActualStructure(filePaths);
    
    const score = this.compareStructures(expectedStructure, actualStructure);
    
    return {
      expected: expectedStructure,
      actual: actualStructure,
      score,
      recommendations: this.getStructureRecommendations(expectedStructure, actualStructure)
    };
  }

  private validateModuleStructure(filePaths: string[], context: AgentContext): any {
    const modules = this.groupFilesByModule(filePaths);
    let totalScore = 0;
    const moduleResults = [];

    for (const module of modules) {
      const moduleScore = this.validateSingleModule(module, context);
      moduleResults.push(moduleScore);
      totalScore += moduleScore.score;
    }

    return {
      modules: moduleResults,
      score: modules.length > 0 ? totalScore / modules.length : 1
    };
  }

  private validateImportExports(filePaths: string[], context: AgentContext): any {
    const importExportAnalysis = {
      circularDependencies: [] as string[],
      unresolvedImports: [] as string[],
      unusedExports: [] as string[],
      score: 0
    };

    // Analyze import/export relationships
    const dependencyGraph = this.buildDependencyGraph(filePaths, context);
    importExportAnalysis.circularDependencies = this.detectCircularDependencies(dependencyGraph);
    importExportAnalysis.unresolvedImports = this.findUnresolvedImports(filePaths, context);

    const totalIssues = importExportAnalysis.circularDependencies.length + 
                       importExportAnalysis.unresolvedImports.length + 
                       importExportAnalysis.unusedExports.length;

    importExportAnalysis.score = totalIssues === 0 ? 1 : Math.max(0, 1 - (totalIssues * 0.1));
    return importExportAnalysis;
  }

  // Helper methods
  private calculateOverallScore(results: any): number {
    const weights = {
      syntax: 0.3,
      structure: 0.25,
      dependencies: 0.25,
      functionality: 0.2
    };

    return (
      results.syntaxValidation.score * weights.syntax +
      results.structureValidation.score * weights.structure +
      results.dependencyValidation.score * weights.dependencies +
      results.functionalityValidation.score * weights.functionality
    );
  }

  private generateRecommendations(results: any): string[] {
    const recommendations: string[] = [];

    if (results.syntaxValidation.score < 0.9) {
      recommendations.push('Fix syntax errors before proceeding with deployment');
    }

    if (results.dependencyValidation.missingDependencies.length > 0) {
      recommendations.push(`Add missing dependencies: ${results.dependencyValidation.missingDependencies.join(', ')}`);
    }

    if (results.dependencyValidation.unusedDependencies.length > 0) {
      recommendations.push('Remove unused dependencies to reduce bundle size');
    }

    if (results.structureValidation.score < 0.8) {
      recommendations.push('Consider reorganizing project structure to follow best practices');
    }

    return recommendations;
  }

  // Syntax validation helpers
  private hasUnmatchedBrackets(line: string): boolean {
    const brackets = { '(': ')', '[': ']', '{': '}' };
    const stack: string[] = [];
    
    for (const char of line) {
      if (char in brackets) {
        stack.push(brackets[char as keyof typeof brackets]);
      } else if (Object.values(brackets).includes(char)) {
        if (stack.pop() !== char) return true;
      }
    }
    
    return stack.length > 0;
  }

  private hasValidBracketBalance(content: string): boolean {
    const brackets = { '(': ')', '[': ']', '{': '}' };
    const stack: string[] = [];
    
    for (const char of content) {
      if (char in brackets) {
        stack.push(brackets[char as keyof typeof brackets]);
      } else if (Object.values(brackets).includes(char)) {
        if (stack.pop() !== char) return false;
      }
    }
    
    return stack.length === 0;
  }

  private hasInvalidSemicolon(line: string): boolean {
    // Check for semicolons in inappropriate places
    return /;\s*;/.test(line) || /^;/.test(line.trim());
  }

  private hasInvalidImport(line: string): boolean {
    if (!line.includes('import') && !line.includes('require')) return false;
    
    // Basic import validation patterns
    const validImportPatterns = [
      /^import\s+.+\s+from\s+['"].+['"]/, // ES6 imports
      /^import\s+['"].+['"]/, // Side-effect imports
      /^const\s+.+\s*=\s*require\(['"].+['"]\)/, // CommonJS require
    ];
    
    return !validImportPatterns.some(pattern => pattern.test(line.trim()));
  }

  private hasInconsistentIndentation(line: string, index: number, lines: string[]): boolean {
    if (line.trim() === '') return false;
    
    const currentIndent = line.match(/^\s*/)?.[0].length || 0;
    
    // Check if indentation is consistent with previous non-empty lines
    for (let i = index - 1; i >= 0; i--) {
      const prevLine = lines[i];
      if (prevLine.trim() === '') continue;
      
      const prevIndent = prevLine.match(/^\s*/)?.[0].length || 0;
      const indentDiff = Math.abs(currentIndent - prevIndent);
      
      // Allow 0, 2, 4, or 8 space differences (common indentation levels)
      if (indentDiff > 0 && ![2, 4, 8].includes(indentDiff)) {
        return true;
      }
      break;
    }
    
    return false;
  }

  private hasInvalidPythonSyntax(line: string): boolean {
    // Basic Python syntax checks
    const invalidPatterns = [
      /;\s*$/, // Semicolons at end of line (not typical Python)
      /\{\s*$/, // Opening braces (not Python syntax)
      /\}\s*$/, // Closing braces (not Python syntax)
    ];
    
    return invalidPatterns.some(pattern => pattern.test(line));
  }

  // Structure validation helpers
  private getExpectedProjectStructure(targetTechStack: any): any {
    const structures: Record<string, any> = {
      'javascript': {
        directories: ['src', 'public', 'node_modules'],
        files: ['package.json', 'README.md'],
        optional: ['webpack.config.js', 'babel.config.js']
      },
      'typescript': {
        directories: ['src', 'dist', 'node_modules'],
        files: ['package.json', 'tsconfig.json', 'README.md'],
        optional: ['webpack.config.js', 'jest.config.js']
      },
      'python': {
        directories: ['src', 'tests'],
        files: ['requirements.txt', 'README.md'],
        optional: ['setup.py', 'pyproject.toml']
      }
    };

    return structures[targetTechStack.language?.toLowerCase()] || structures['javascript'];
  }

  private analyzeActualStructure(filePaths: string[]): any {
    const directories = new Set<string>();
    const files = new Set<string>();

    filePaths.forEach(path => {
      const parts = path.split('/');
      if (parts.length > 1) {
        directories.add(parts[0]);
      }
      files.add(parts[parts.length - 1]);
    });

    return {
      directories: Array.from(directories),
      files: Array.from(files)
    };
  }

  private compareStructures(expected: any, actual: any): number {
    let score = 0;
    let totalChecks = 0;

    // Check required directories
    expected.directories.forEach((dir: string) => {
      totalChecks++;
      if (actual.directories.includes(dir)) score++;
    });

    // Check required files
    expected.files.forEach((file: string) => {
      totalChecks++;
      if (actual.files.includes(file)) score++;
    });

    return totalChecks > 0 ? score / totalChecks : 1;
  }

  private getStructureRecommendations(expected: any, actual: any): string[] {
    const recommendations: string[] = [];
    
    expected.directories.forEach((dir: string) => {
      if (!actual.directories.includes(dir)) {
        recommendations.push(`Create ${dir} directory`);
      }
    });

    expected.files.forEach((file: string) => {
      if (!actual.files.includes(file)) {
        recommendations.push(`Add ${file} file`);
      }
    });

    return recommendations;
  }

  // Additional helper methods would be implemented here...
  private isPackageFile(path: string): boolean {
    const packageFiles = ['package.json', 'requirements.txt', 'Gemfile', 'pom.xml'];
    return packageFiles.some(file => path.endsWith(file));
  }

  private analyzeDependencies(content: string, filePath: string): any {
    // Implementation would parse the specific package file format
    return { dependencies: [] };
  }

  private extractUsedDependencies(filePaths: string[], context: AgentContext): string[] {
    // Implementation would analyze import statements across all files
    return [];
  }

  private validateFunctionSignatures(filePaths: string[], context: AgentContext): any {
    return { score: 1 }; // Placeholder
  }

  private validateDataFlow(filePaths: string[], context: AgentContext): any {
    return { score: 1 }; // Placeholder
  }

  private validateErrorHandling(filePaths: string[], context: AgentContext): any {
    return { score: 1 }; // Placeholder
  }

  private assessTestCoverage(filePaths: string[], context: AgentContext): any {
    return { score: 1 }; // Placeholder
  }

  private groupFilesByModule(filePaths: string[]): any[] {
    return []; // Placeholder
  }

  private validateSingleModule(module: any, context: AgentContext): any {
    return { score: 1 }; // Placeholder
  }

  private buildDependencyGraph(filePaths: string[], context: AgentContext): any {
    return {}; // Placeholder
  }

  private detectCircularDependencies(graph: any): string[] {
    return []; // Placeholder
  }

  private findUnresolvedImports(filePaths: string[], context: AgentContext): string[] {
    return []; // Placeholder
  }
}